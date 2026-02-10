/**
 * Edit Dispatcher - 统一决策入口
 * 负责 FIM/NES 的协调调度，基于状态机 + 意图分类
 *
 * 状态机：
 *   IDLE → NES_PENDING → NES_DIAGNOSING → NES_SUGGESTING → IDLE
 *                ↓                ↓
 *              IDLE             IDLE（空结果时回退）
 *
 * 核心规则：
 *   - IDLE / NES_PENDING 时 FIM 可工作
 *   - NES_DIAGNOSING / NES_SUGGESTING 时 FIM 被锁定
 *   - 意图为 NEW_CODE 时不启动 NES debounce
 *   - 意图为 REFACTORING 时缩短 NES debounce 并提前锁 FIM
 */

import type { EditRecord, DispatcherState, EditIntent } from '../types'
import { DISPATCHER_CONFIG } from '../config'
import type { FIMEngine } from './FIMEngine'
import type { NESEngine } from './NESEngine'
import type { EditHistoryManager } from './EditHistoryManager'

export class EditDispatcher {
  private state: DispatcherState = 'IDLE'
  private nesDebounceTimer: number | null = null
  private nesEditProtectionUntil = 0
  private nextEditIsNES = false

  private fimEngine: FIMEngine | null = null
  private nesEngine: NESEngine | null = null
  private editHistory: EditHistoryManager | null = null

  /**
   * 注入引擎引用（避免循环依赖，在 index.ts 中初始化后调用）
   */
  init(fim: FIMEngine | null, nes: NESEngine | null, history: EditHistoryManager): void {
    this.fimEngine = fim
    this.nesEngine = nes
    this.editHistory = history

    // 设置 NES 编辑应用回调
    if (this.nesEngine) {
      this.nesEngine.setOnEditApplied(() => {
        this.nextEditIsNES = true
        this.nesEditProtectionUntil = Date.now() + DISPATCHER_CONFIG.NES_EDIT_PROTECTION_MS
      })
    }
  }

  // ==================== 公共 API ====================

  /**
   * 处理编辑事件（唯一入口）
   * 由 index.ts 的 onDidChangeContent 调用
   */
  handleEdit(changes: { change: any; model: any }[]): void {
    if (!this.editHistory) return

    // 1. 记录编辑历史
    const source = this.nextEditIsNES ? 'nes' : 'user'
    changes.forEach(({ change, model }) => {
      this.editHistory!.recordEdit(change, model, source)
    })

    // 2. NES 编辑不触发新的检测
    if (this.nextEditIsNES) {
      this.nextEditIsNES = false
      return
    }

    // 3. NES 未启用，直接返回
    if (!this.nesEngine) return

    // 4. 保护期内不触发
    if (Date.now() < this.nesEditProtectionUntil) return

    // 5. NES 正在展示建议，不触发新检测
    if (this.state === 'NES_SUGGESTING') return

    // 6. 意图分类 → 决定路由
    const recentEdits = this.editHistory.getRecentEdits(10)
    const intent = this.classifyIntent(recentEdits)

    // eslint-disable-next-line no-console
    console.log('[Dispatcher] 意图分类:', intent, '当前状态:', this.state)

    switch (intent) {
      case 'NEW_CODE':
        // 用户在写新代码 → FIM 优先，取消 NES debounce
        this.cancelNESDebounce()
        if (this.state === 'NES_PENDING') {
          this.transition('IDLE', 'NEW_CODE intent, cancel NES')
        }
        break

      case 'REFACTORING':
        // 用户在重构 → NES 优先，缩短 debounce
        this.scheduleNES(recentEdits, DISPATCHER_CONFIG.NES_DEBOUNCE_REFACTORING_MS)
        break

      case 'UNCERTAIN':
        // 不确定 → FIM 先行，NES 延迟触发
        this.scheduleNES(recentEdits, DISPATCHER_CONFIG.NES_DEBOUNCE_UNCERTAIN_MS)
        break
    }
  }

  /**
   * 处理 NES 关闭事件（Esc / 建议全部处理完）
   */
  handleNESClosed(): void {
    if (this.nesEngine) {
      this.nesEngine.closeCompletely()
    }
    this.transition('IDLE', 'NES closed')
    this.unlockFIM()
  }

  /**
   * 检查 FIM 是否应该被锁定
   * FIMEngine 在 provideInlineCompletions 中调用
   */
  isFIMLocked(): boolean {
    return this.state === 'NES_DIAGNOSING' || this.state === 'NES_SUGGESTING'
  }

  /**
   * 获取当前状态
   */
  getState(): DispatcherState {
    return this.state
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.cancelNESDebounce()
  }

  // ==================== 意图分类 ====================

  /**
   * 基于编辑历史分类用户意图
   */
  private classifyIntent(edits: EditRecord[]): EditIntent {
    if (edits.length === 0) return 'UNCERTAIN'

    const now = Date.now()
    // 只看时间窗口内的编辑
    const recentEdits = edits.filter(
      (e) => now - e.timestamp < DISPATCHER_CONFIG.INTENT_WINDOW_MS && e.source !== 'nes'
    )

    if (recentEdits.length === 0) return 'UNCERTAIN'

    // 信号 1: 连续插入 + 行尾 → NEW_CODE
    const consecutiveInserts = this.countConsecutiveInserts(recentEdits)
    if (consecutiveInserts >= DISPATCHER_CONFIG.NEW_CODE_CHAR_THRESHOLD) {
      const lastEdit = recentEdits[recentEdits.length - 1]
      if (this.isAtLineEnd(lastEdit)) {
        return 'NEW_CODE'
      }
    }

    // 信号 2: replace 操作 + 标识符区域 → REFACTORING
    const hasReplace = recentEdits.some((e) => e.type === 'replace' && e.rangeLength >= 2)
    if (hasReplace) {
      return 'REFACTORING'
    }

    // 信号 3: 删除后插入（典型的重命名模式）→ REFACTORING
    const hasDeleteThenInsert = this.hasDeleteInsertPattern(recentEdits)
    if (hasDeleteThenInsert) {
      return 'REFACTORING'
    }

    // 信号 4: 在函数签名区域编辑 → REFACTORING
    const lastEdit = recentEdits[recentEdits.length - 1]
    if (lastEdit.context?.lineContent && this.isFunctionSignatureLine(lastEdit.context.lineContent)) {
      const isInserting = recentEdits.every((e) => e.type === 'insert')
      // 如果只是在行尾插入新字符，仍然是 NEW_CODE
      if (isInserting && this.isAtLineEnd(lastEdit)) {
        return 'NEW_CODE'
      }
      return 'REFACTORING'
    }

    return 'UNCERTAIN'
  }

  /**
   * 统计末尾连续插入的字符数
   */
  private countConsecutiveInserts(edits: EditRecord[]): number {
    let count = 0
    for (let i = edits.length - 1; i >= 0; i--) {
      if (edits[i].type === 'insert') {
        count += edits[i].newText.length
      } else {
        break
      }
    }
    return count
  }

  /**
   * 检查编辑是否在行尾
   */
  private isAtLineEnd(edit: EditRecord): boolean {
    if (!edit.context?.lineContent) return false
    const lineLen = edit.context.lineContent.length
    // 编辑位置在行内容末尾附近（允许 2 字符误差，考虑括号等）
    return edit.column >= lineLen - 1
  }

  /**
   * 检查是否有"删除后插入"模式（重命名特征）
   */
  private hasDeleteInsertPattern(edits: EditRecord[]): boolean {
    for (let i = 1; i < edits.length; i++) {
      if (edits[i - 1].type === 'delete' && edits[i - 1].rangeLength >= 2 && edits[i].type === 'insert') {
        return true
      }
    }
    return false
  }

  /**
   * 检查是否是函数签名行
   */
  private isFunctionSignatureLine(line: string): boolean {
    return /function\s+\w+/.test(line) || /const\s+\w+\s*=\s*\(/.test(line) || /\w+\s*\([^)]*\)\s*\{?/.test(line)
  }

  // ==================== NES 调度 ====================

  /**
   * 调度 NES（带 debounce）
   */
  private scheduleNES(edits: EditRecord[], debounceMs: number): void {
    this.cancelNESDebounce()

    // 进入 PENDING 状态
    if (this.state === 'IDLE') {
      this.transition('NES_PENDING', `NES scheduled (${debounceMs}ms)`)
    }

    this.nesDebounceTimer = window.setTimeout(async () => {
      await this.triggerNES(edits)
    }, debounceMs)
  }

  /**
   * 实际触发 NES
   */
  private async triggerNES(edits: EditRecord[]): Promise<void> {
    if (!this.nesEngine) return

    // 如果 NES 已经在工作，不重复触发
    if (this.nesEngine.isActive()) return

    // 进入 DIAGNOSING 状态 → 锁定 FIM
    this.transition('NES_DIAGNOSING', 'NES API request started')
    this.lockFIM()

    // 唤醒 NES
    await this.nesEngine.wakeUp(edits)

    // 根据 NES 结果更新状态
    if (this.nesEngine.isActive()) {
      this.transition('NES_SUGGESTING', 'NES has suggestions')
      // FIM 保持锁定
    } else {
      // NES 没有返回有效建议 → 回到 IDLE
      this.transition('IDLE', 'NES returned empty')
      this.unlockFIM()
    }
  }

  /**
   * 取消 NES debounce
   */
  private cancelNESDebounce(): void {
    if (this.nesDebounceTimer) {
      clearTimeout(this.nesDebounceTimer)
      this.nesDebounceTimer = null
    }
  }

  // ==================== FIM 控制 ====================

  private lockFIM(): void {
    if (this.fimEngine) {
      this.fimEngine.lock()
    }
  }

  private unlockFIM(): void {
    if (this.fimEngine) {
      this.fimEngine.unlock()
    }
  }

  // ==================== 状态机 ====================

  private transition(to: DispatcherState, reason: string): void {
    const from = this.state
    this.state = to
    // eslint-disable-next-line no-console
    console.log(`[Dispatcher] ${from} → ${to} (${reason})`)
  }
}
