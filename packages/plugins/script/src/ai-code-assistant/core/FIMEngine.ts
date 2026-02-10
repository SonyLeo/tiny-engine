/**
 * FIM Engine - 实时代码补全引擎
 */

import * as monaco from 'monaco-editor'
import { ModelAdapter } from '../api/ModelAdapter'
import type { EditDispatcher } from './EditDispatcher'

export class FIMEngine {
  private disposable: monaco.IDisposable | null = null
  private modelAdapter: ModelAdapter
  private fimLocked = false
  private dispatcher: EditDispatcher | null = null
  private language: string

  // Ghost Text 状态追踪
  private ghostTextVisible = false
  private ghostTextTimestamp = 0

  constructor(private editor: monaco.editor.IStandaloneCodeEditor, language: string = 'javascript') {
    this.modelAdapter = new ModelAdapter()
    this.language = language
  }

  /**
   * 注入 Dispatcher 引用，FIM 可通过 Dispatcher 查询锁定状态
   */
  setDispatcher(dispatcher: EditDispatcher): void {
    this.dispatcher = dispatcher
  }

  register(): void {
    // 注册到配置的语言和 typescript
    const languages = [this.language]
    if (this.language !== 'typescript') {
      languages.push('typescript')
    }

    const provider = {
      provideInlineCompletions: async (
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        _context: monaco.languages.InlineCompletionContext,
        token: monaco.CancellationToken
      ) => {
        try {
          // 检查是否被锁定（本地锁 或 Dispatcher 状态锁）
          if (this.fimLocked || this.dispatcher?.isFIMLocked()) {
            this.ghostTextVisible = false
            return { items: [] }
          }

          const fullText = model.getValue()
          const offset = model.getOffsetAt(position)

          const prefix = fullText.substring(0, offset)
          const suffix = fullText.substring(offset)

          // 创建 AbortController
          const abortController = new AbortController()
          token.onCancellationRequested(() => {
            abortController.abort()
          })

          // 调用 API（传递 signal 以支持取消）
          const completion = await this.modelAdapter.callFIM(prefix, suffix, abortController.signal)

          if (!completion || completion.trim() === '') {
            this.ghostTextVisible = false
            return { items: [] }
          }

          // 检查后缀重复
          if (this.checkSuffixDuplication(completion, suffix)) {
            this.ghostTextVisible = false
            return { items: [] }
          }

          // 标记 Ghost Text 可见
          this.ghostTextVisible = true
          this.ghostTextTimestamp = Date.now()

          return {
            items: [
              {
                insertText: completion,
                range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
              }
            ]
          }
        } catch (error: any) {
          if (error.name === 'AbortError') {
            return { items: [] }
          }
          return { items: [] }
        }
      },

      freeInlineCompletions: () => {
        // 补全被释放时标记 Ghost Text 消失
        this.ghostTextVisible = false
      },

      handleItemDidShow: () => {
        // 补全项显示时更新时间戳
        this.ghostTextVisible = true
        this.ghostTextTimestamp = Date.now()
      }
    }

    // 为每种语言注册 provider
    const disposables = languages.map((lang) => monaco.languages.registerInlineCompletionsProvider(lang, provider))
    this.disposable = {
      dispose: () => disposables.forEach((d) => d.dispose())
    }
  }

  /**
   * 锁定 FIM（当 NES 活跃时）
   */
  lock(): void {
    this.fimLocked = true
    this.ghostTextVisible = false
    this.clearGhostText()
  }

  /**
   * 解锁 FIM
   */
  unlock(): void {
    this.fimLocked = false
  }

  /**
   * 检查是否有 Ghost Text 正在显示
   */
  hasGhostText(): boolean {
    return this.ghostTextVisible
  }

  /**
   * 标记 Ghost Text 已消失（外部调用，如检测到用户接受了 FIM 补全）
   */
  markGhostTextGone(): void {
    this.ghostTextVisible = false
  }

  /**
   * 获取 Ghost Text 存活时间（ms）
   */
  getGhostTextAge(): number {
    if (!this.ghostTextVisible || this.ghostTextTimestamp === 0) return Infinity
    return Date.now() - this.ghostTextTimestamp
  }

  /**
   * 清除 Ghost Text（使用 Monaco 内置 API）
   */
  private clearGhostText(): void {
    try {
      // 使用 Monaco 内置命令隐藏 inline suggestions
      this.editor.trigger('fim-lock', 'editor.action.inlineSuggest.hide', {})
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[FIMEngine] Failed to clear Ghost Text:', error)
    }
  }

  /**
   * 检查后缀重复
   */
  private checkSuffixDuplication(completion: string, suffix: string): boolean {
    if (!suffix || !completion) {
      return false
    }

    const normalizedCompletion = completion.replace(/\s+/g, '')
    const normalizedSuffix = suffix.replace(/\s+/g, '')

    return normalizedSuffix.startsWith(normalizedCompletion)
  }

  dispose(): void {
    this.disposable?.dispose()
  }
}
