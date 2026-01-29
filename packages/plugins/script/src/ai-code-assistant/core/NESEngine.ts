/**
 * NES Engine - Next Edit Suggestion 引擎
 * 负责调用后端 API 进行症状检测和编辑预测
 */

import * as monaco from 'monaco-editor'
import type { EditRecord, Prediction, NESConfig } from '../types'
import { SymptomDetector } from '../utils/symptom'
import { SuggestionQueue } from '../ui/SuggestionQueue'
import { NESRenderer } from '../ui/NESRenderer'
import { DiffCalculator } from '../utils/diff'
import { ModelAdapter } from '../api/ModelAdapter'

export class NESEngine {
  private state: 'SLEEPING' | 'DIAGNOSING' | 'SUGGESTING' = 'SLEEPING'
  private previewShown: boolean = false // 当前建议是否已展开预览
  private symptomDetector: SymptomDetector
  private suggestionQueue: SuggestionQueue
  private renderer: NESRenderer
  private modelAdapter: ModelAdapter
  private abortController: AbortController | null = null
  private onEditApplied?: (lineNumber: number) => void

  constructor(private editor: monaco.editor.IStandaloneCodeEditor, private config: NESConfig) {
    this.symptomDetector = new SymptomDetector()
    this.suggestionQueue = new SuggestionQueue()
    this.renderer = new NESRenderer(editor)
    this.modelAdapter = new ModelAdapter()

    const model = editor.getModel()
    if (model) {
      this.symptomDetector.setModel(model)
    }
  }

  /**
   * 设置编辑应用回调
   */
  setOnEditApplied(callback: (lineNumber: number) => void): void {
    this.onEditApplied = callback
  }

  /**
   * 唤醒 NES（检测症状并获取预测）
   */
  async wakeUp(editHistory: EditRecord[]): Promise<void> {
    if (this.state !== 'SLEEPING') {
      return
    }

    // 准备 payload
    const payload = this.symptomDetector.preparePayload(editHistory)
    if (!payload) {
      return
    }

    this.state = 'DIAGNOSING'

    try {
      // 取消之前的请求
      if (this.abortController) {
        this.abortController.abort()
      }
      this.abortController = new AbortController()

      // 调用 ModelAdapter 的 NES 方法
      const data = await this.modelAdapter.callNES(payload)

      // 处理预测结果
      if (data.predictions && data.predictions.length > 0) {
        this.handlePredictions(data.predictions)
      } else {
        this.sleep()
      }
    } catch (error: any) {
      this.sleep()
    }
  }

  /**
   * 处理预测结果
   */
  private handlePredictions(predictions: Prediction[]): void {
    // 获取编辑器模型
    const model = this.editor.getModel()
    if (!model) {
      return
    }

    // 处理每个预测，自动计算坐标
    const processedPredictions = predictions.map((pred) => {
      // 如果没有 originalLineContent，从模型中获取
      const originalLine = pred.originalLineContent || model.getLineContent(pred.targetLine)

      // 使用 DiffCalculator 自动计算差异
      const diff = DiffCalculator.detectChangeType(originalLine, pred.suggestionText)

      // 返回增强后的预测
      return {
        ...pred,
        originalLineContent: originalLine,
        changeType: diff.changeType,
        wordReplaceInfo: diff.wordReplaceInfo,
        inlineInsertInfo: diff.inlineInsertInfo
      }
    })

    // 按优先级排序
    const sorted = processedPredictions.sort((a, b) => {
      const priorityA = a.priority || 0
      const priorityB = b.priority || 0
      return priorityB - priorityA
    })

    // 一次性加入队列（传入整个数组）
    this.suggestionQueue.enqueue(sorted)

    this.state = 'SUGGESTING'
    this.showFirstSuggestion()
  }

  /**
   * 显示第一个建议（只显示 Glyph，不展开预览）
   */
  private showFirstSuggestion(): void {
    const prediction = this.suggestionQueue.peek()
    if (prediction) {
      // 计算进度
      const current = this.suggestionQueue.getCurrentIndex() + 1
      const total = this.suggestionQueue.size()
      const progress = total > 1 ? `${current}/${total}` : undefined

      // 只显示 Glyph 和 HintBar，不展开预览
      this.renderer.renderSuggestion(prediction)
      this.renderer.showHintBar(prediction.targetLine, prediction.explanation, false, progress)

      // 设置预览状态为未展开
      this.previewShown = false
    }
  }

  /**
   * 切换到预览模式（Tab 键触发）
   */
  public togglePreview(): void {
    const prediction = this.suggestionQueue.peek()
    if (!prediction) {
      return
    }

    if (!this.previewShown) {
      // 跳转到建议位置
      this.editor.setPosition({
        lineNumber: prediction.targetLine,
        column: 1
      })
      this.editor.revealLineInCenter(prediction.targetLine)

      // 展开预览
      this.renderer.showPreview(prediction)

      // 计算进度
      const current = this.suggestionQueue.getCurrentIndex() + 1
      const total = this.suggestionQueue.size()
      const progress = total > 1 ? `${current}/${total}` : undefined

      // 更新 HintBar 提示（显示 "Tab Accept"）
      this.renderer.showHintBar(prediction.targetLine, prediction.explanation, true, progress)

      // 更新状态
      this.previewShown = true
    }
  }

  /**
   * 接受当前建议
   */
  acceptSuggestion(): void {
    const prediction = this.suggestionQueue.dequeue()
    if (!prediction) {
      return
    }

    // 使用新的 API：applySuggestion（自动根据 changeType 处理）
    this.renderer.applySuggestion(prediction)

    // 重置预览状态
    this.previewShown = false

    // 显示下一个建议
    if (this.suggestionQueue.peek()) {
      this.showFirstSuggestion()
    } else {
      this.sleep()
    }

    // 通知主入口标记为 NES 编辑
    if (this.onEditApplied) {
      this.onEditApplied(prediction.targetLine)
    }
  }

  /**
   * 跳过当前建议
   */
  skipSuggestion(): void {
    const prediction = this.suggestionQueue.dequeue()
    if (!prediction) {
      return
    }

    // 清除渲染
    this.renderer.clear()

    // 重置预览状态
    this.previewShown = false

    // 显示下一个建议
    if (this.suggestionQueue.peek()) {
      this.showFirstSuggestion()
    } else {
      this.sleep()
    }
  }

  /**
   * 关闭当前建议（不跳过，保持在队列中）
   */
  closeSuggestion(): void {
    // 只清除渲染，不移除队列
    this.renderer.clear()

    // 如果还有建议，重新显示（只显示 Glyph 和 HintBar）
    const prediction = this.suggestionQueue.peek()
    if (prediction) {
      // 计算进度
      const current = this.suggestionQueue.getCurrentIndex() + 1
      const total = this.suggestionQueue.size()
      const progress = total > 1 ? `${current}/${total}` : undefined

      this.renderer.renderSuggestion(prediction)
      this.renderer.showHintBar(prediction.targetLine, prediction.explanation, false, progress)
    }
  }

  /**
   * 完全关闭 NES（清除队列并进入睡眠）
   */
  closeCompletely(): void {
    // 清除渲染
    this.renderer.clear()

    // 清除队列并进入睡眠
    this.sleep()
  }

  /**
   * 进入睡眠状态
   */
  sleep(): void {
    this.state = 'SLEEPING'
    this.suggestionQueue.clear()
  }

  /**
   * 检查是否激活
   */
  isActive(): boolean {
    return this.state !== 'SLEEPING'
  }

  /**
   * 检查预览是否已展开
   */
  isPreviewShown(): boolean {
    return this.previewShown
  }

  /**
   * 获取当前状态
   */
  getState(): string {
    return this.state
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
    this.renderer.dispose()
    this.sleep()
  }
}
