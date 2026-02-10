/**
 * Tab Key Handler - Tab 键 4 级优先级处理器
 *
 * 优先级：Suggest Widget > FIM Inline Completion > NES 建议 > 默认缩进
 */

import type * as monaco from 'monaco-editor'

export interface TabKeyHandlerCallbacks {
  onAcceptNES?: () => void
}

export class TabKeyHandler {
  constructor(private editor: monaco.editor.IStandaloneCodeEditor, private callbacks?: TabKeyHandlerCallbacks) {}

  /**
   * 处理 Tab 键按下
   * 返回 true 表示已处理，false 表示使用默认行为（缩进）
   */
  handleTab(): boolean {
    // 优先级 1: Monaco Suggest Widget（代码补全下拉框）
    if (this.hasSuggestWidget()) {
      this.editor.trigger('keyboard', 'acceptSelectedSuggestion', {})
      return true
    }

    // 优先级 2: FIM Inline Completion（尝试 commit，检测光标是否移动）
    const pos = this.editor.getPosition()
    if (pos) {
      const oldLine = pos.lineNumber
      const oldCol = pos.column

      this.editor.trigger('keyboard', 'editor.action.inlineSuggest.commit', {})

      const newPos = this.editor.getPosition()
      if (newPos && (newPos.lineNumber !== oldLine || newPos.column !== oldCol)) {
        return true
      }
    }

    // 优先级 3: NES 建议
    if (this.callbacks?.onAcceptNES) {
      this.callbacks.onAcceptNES()
      return true
    }

    // 优先级 4: 默认缩进
    return false
  }

  /**
   * 检测 Monaco Suggest Widget 是否可见
   * 使用内部 API，try-catch 兜底
   */
  private hasSuggestWidget(): boolean {
    try {
      const suggestController = (this.editor as any).getContribution('editor.contrib.suggestController')
      return suggestController?.widget?.value?.suggestWidgetVisible?.get() === true
    } catch {
      return false
    }
  }
}
