/**
 * NES Renderer - 渲染层（重构版）
 * 负责协调各子管理器，根据 changeType 自动渲染对应的 UI
 *
 * 支持的场景：
 * - REPLACE_LINE: 整行替换
 * - REPLACE_WORD: 单词替换
 * - INSERT: 插入新行
 * - DELETE: 删除行
 * - INLINE_INSERT: 行内插入
 */

import * as monaco from 'monaco-editor'
import type { Prediction, ChangeType } from '../types'
import { DecorationManager } from './DecorationManager'
import { ViewZoneManager } from './ViewZoneManager'
import { getMetaApi, META_SERVICE } from '@opentiny/tiny-engine-meta-register'

export class NESRenderer {
  private currentPrediction: Prediction | null = null
  private hintBarElement: HTMLElement | null = null

  // 管理器
  private decorationManager: DecorationManager
  private viewZoneManager: ViewZoneManager

  // 面板容器
  private panelContainer: HTMLElement | null = null

  constructor(private editor: monaco.editor.IStandaloneCodeEditor) {
    this.decorationManager = new DecorationManager(editor)
    this.viewZoneManager = new ViewZoneManager(editor)

    // 查找面板容器
    this.findPanelContainer()
  }

  /**
   * 查找面板容器元素
   */
  private findPanelContainer(): void {
    let element = this.editor.getDomNode()?.parentElement

    while (element) {
      if (element.classList.contains('plugin-page-js-container') || element.classList.contains('plugin-panel')) {
        this.panelContainer = element

        if (getComputedStyle(element).position === 'static') {
          element.style.position = 'relative'
        }

        break
      }
      element = element.parentElement
    }

    // 如果没找到面板容器，回退到 body
    if (!this.panelContainer) {
      // eslint-disable-next-line no-console
      console.warn('[NESRenderer] 未找到面板容器，HintBar 将显示在页面右下角')
      this.panelContainer = document.body
    }
  }

  /**
   * 检测当前主题（亮色/暗色）
   */
  private detectTheme(): 'light' | 'dark' {
    try {
      const themeService = getMetaApi(META_SERVICE.ThemeSwitch)
      const currentTheme = themeService?.getThemeState?.()?.theme

      return currentTheme === 'light' ? 'light' : 'dark'
    } catch {
      return 'dark'
    }
  }

  /**
   * 渲染建议（状态1：建议出现）
   * 根据 changeType 自动渲染对应的装饰器
   */
  public renderSuggestion(prediction: Prediction): void {
    this.currentPrediction = prediction

    const changeType = (prediction.changeType || 'REPLACE_LINE') as ChangeType

    this.decorationManager.renderState1(
      changeType,
      prediction.targetLine,
      prediction.explanation,
      prediction.wordReplaceInfo
    )
  }

  /**
   * 显示预览（状态2：显示预览）
   * 根据 changeType 自动渲染对应的预览
   */
  public showPreview(prediction?: Prediction): void {
    const pred = prediction || this.currentPrediction
    if (!pred) return

    const changeType = (pred.changeType || 'REPLACE_LINE') as ChangeType

    const result = this.decorationManager.renderState2(
      changeType,
      pred.targetLine,
      pred.suggestionText,
      pred.wordReplaceInfo,
      pred.inlineInsertInfo
    )

    if (result.useViewZone && result.viewZoneConfig) {
      this.viewZoneManager.show(result.viewZoneConfig)
    }
  }

  /**
   * 显示 HintBar
   */
  public showHintBar(_lineNumber: number, explanation: string, previewShown: boolean = false, progress?: string): void {
    // 移除旧的 HintBar
    if (this.hintBarElement) {
      this.hintBarElement.remove()
    }

    // 检测主题
    const theme = this.detectTheme()

    // 创建 HintBar 元素
    this.hintBarElement = document.createElement('div')
    this.hintBarElement.className = 'nes-hint-bar'
    this.hintBarElement.setAttribute('data-theme', theme)

    // 根据容器类型决定定位方式（只设置 position）
    const isInPanel = this.panelContainer !== document.body
    this.hintBarElement.style.position = isInPanel ? 'absolute' : 'fixed'

    // 根据预览状态显示不同的提示
    const tabClass = previewShown ? 'nes-shortcut-tab-accept' : 'nes-shortcut-tab-preview'
    const tabText = previewShown ? 'Accept' : 'Preview'

    // 进度显示
    const progressHtml = progress ? `<span class="nes-hint-bar-progress">${progress}</span>` : ''

    // 内容 - 使用 CSS 类
    this.hintBarElement.innerHTML = `
      <div class="nes-hint-bar-container">
        <div class="nes-hint-bar-icon">💡</div>
        <div class="nes-hint-bar-content">
          <div class="nes-hint-bar-header">
            <span class="nes-hint-bar-title">Suggestion</span>
            ${progressHtml}
          </div>
          <div class="nes-hint-bar-explanation">${explanation}</div>
          <div class="nes-hint-bar-shortcuts">
            <span><span class="${tabClass}">Tab</span> ${tabText}</span>
            <span><span class="nes-shortcut-alt-n">Alt+N</span> Skip</span>
            <span><span class="nes-shortcut-esc">Esc</span> Close</span>
          </div>
        </div>
      </div>
    `

    // 添加到面板容器或 body
    if (this.panelContainer) {
      this.panelContainer.appendChild(this.hintBarElement)
    } else {
      document.body.appendChild(this.hintBarElement)
    }
  }

  /**
   * 隐藏 HintBar
   */
  public hideHintBar(): void {
    if (this.hintBarElement) {
      this.hintBarElement.remove()
      this.hintBarElement = null
    }
  }

  /**
   * 应用建议（根据 changeType 执行不同的应用逻辑）
   */
  public applySuggestion(prediction?: Prediction): void {
    const pred = prediction || this.currentPrediction
    if (!pred) return

    const changeType = (pred.changeType || 'REPLACE_LINE') as ChangeType

    switch (changeType) {
      case 'REPLACE_LINE':
        this.applyReplaceLine(pred)
        break
      case 'REPLACE_WORD':
        this.applyReplaceWord(pred)
        break
      case 'INSERT':
        this.applyInsert(pred)
        break
      case 'DELETE':
        this.applyDelete(pred)
        break
      case 'INLINE_INSERT':
        this.applyInlineInsert(pred)
        break
    }

    // 清理 UI
    this.clear()
  }

  /**
   * 清除所有装饰
   */
  public clear(): void {
    this.decorationManager.clear()
    this.viewZoneManager.clear()
    this.hideHintBar()
    this.currentPrediction = null
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    this.clear()
    this.decorationManager.dispose()
    this.viewZoneManager.dispose()
  }

  // ==================== 应用逻辑（私有方法） ====================

  /**
   * 应用整行替换
   */
  private applyReplaceLine(prediction: Prediction): void {
    const model = this.editor.getModel()
    if (!model) return

    const { targetLine, suggestionText } = prediction
    const originalText = prediction.originalLineContent || model.getLineContent(targetLine)

    const edit: monaco.editor.IIdentifiedSingleEditOperation = {
      range: new monaco.Range(targetLine, 1, targetLine, model.getLineMaxColumn(targetLine)),
      text: suggestionText,
      forceMoveMarkers: true
    }

    this.editor.executeEdits('nes-replace-line', [edit])

    // 计算光标位置
    const newCursorColumn = this.calculateCursorPositionAfterEdit(originalText, suggestionText)
    this.editor.setPosition({
      lineNumber: targetLine,
      column: newCursorColumn
    })
    this.editor.revealLineInCenter(targetLine)
  }

  /**
   * 应用单词替换
   */
  private applyReplaceWord(prediction: Prediction): void {
    const model = this.editor.getModel()
    if (!model || !prediction.wordReplaceInfo) return

    const { targetLine, wordReplaceInfo } = prediction

    const edit: monaco.editor.IIdentifiedSingleEditOperation = {
      range: new monaco.Range(targetLine, wordReplaceInfo.startColumn, targetLine, wordReplaceInfo.endColumn),
      text: wordReplaceInfo.replacement,
      forceMoveMarkers: true
    }

    this.editor.executeEdits('nes-replace-word', [edit])

    // 光标放在替换后的单词末尾
    this.editor.setPosition({
      lineNumber: targetLine,
      column: wordReplaceInfo.startColumn + wordReplaceInfo.replacement.length
    })
    this.editor.revealLineInCenter(targetLine)
  }

  /**
   * 应用插入新行
   */
  private applyInsert(prediction: Prediction): void {
    const model = this.editor.getModel()
    if (!model) return

    const { targetLine, suggestionText } = prediction

    const edit: monaco.editor.IIdentifiedSingleEditOperation = {
      range: new monaco.Range(
        targetLine,
        model.getLineMaxColumn(targetLine),
        targetLine,
        model.getLineMaxColumn(targetLine)
      ),
      text: `\n${suggestionText}`,
      forceMoveMarkers: true
    }

    this.editor.executeEdits('nes-insert', [edit])

    // 光标移动到新插入的行末尾
    this.editor.setPosition({
      lineNumber: targetLine + 1,
      column: suggestionText.length + 1
    })
    this.editor.revealLineInCenter(targetLine + 1)
  }

  /**
   * 应用删除行
   */
  private applyDelete(prediction: Prediction): void {
    const model = this.editor.getModel()
    if (!model) return

    const { targetLine } = prediction

    // 删除整行（包括换行符）
    const nextLine = targetLine + 1
    const endColumn = nextLine <= model.getLineCount() ? 1 : model.getLineMaxColumn(targetLine)
    const endLine = nextLine <= model.getLineCount() ? nextLine : targetLine

    const edit: monaco.editor.IIdentifiedSingleEditOperation = {
      range: new monaco.Range(targetLine, 1, endLine, endColumn),
      text: '',
      forceMoveMarkers: true
    }

    this.editor.executeEdits('nes-delete', [edit])

    // 光标移动到删除行的位置
    const newLine = Math.min(targetLine, model.getLineCount())
    this.editor.setPosition({
      lineNumber: newLine,
      column: 1
    })
    this.editor.revealLineInCenter(newLine)
  }

  /**
   * 应用行内插入
   */
  private applyInlineInsert(prediction: Prediction): void {
    const model = this.editor.getModel()
    if (!model || !prediction.inlineInsertInfo) return

    const { targetLine, inlineInsertInfo } = prediction

    const edit: monaco.editor.IIdentifiedSingleEditOperation = {
      range: new monaco.Range(targetLine, inlineInsertInfo.insertColumn, targetLine, inlineInsertInfo.insertColumn),
      text: inlineInsertInfo.content,
      forceMoveMarkers: true
    }

    this.editor.executeEdits('nes-inline-insert', [edit])

    // 光标放在插入内容之后
    this.editor.setPosition({
      lineNumber: targetLine,
      column: inlineInsertInfo.insertColumn + inlineInsertInfo.content.length
    })
    this.editor.revealLineInCenter(targetLine)
  }

  /**
   * 计算编辑后的光标位置
   */
  private calculateCursorPositionAfterEdit(original: string, modified: string): number {
    const len = Math.min(original.length, modified.length)

    // 从前往后找到第一个不同的字符
    let firstDiffIndex = 0
    for (let i = 0; i < len; i++) {
      if (original[i] !== modified[i]) {
        firstDiffIndex = i
        break
      }
    }

    // 从后往前找到第一个不同的字符
    let lastDiffIndex = modified.length
    let origReverse = 0,
      modReverse = 0
    while (origReverse < original.length && modReverse < modified.length) {
      const origIdx = original.length - 1 - origReverse
      const modIdx = modified.length - 1 - modReverse

      if (origIdx <= firstDiffIndex || modIdx <= firstDiffIndex) break

      if (original[origIdx] === modified[modIdx]) {
        lastDiffIndex = modIdx
        origReverse++
        modReverse++
      } else {
        break
      }
    }

    // 光标放在变化内容之后
    return lastDiffIndex + 1
  }
}
