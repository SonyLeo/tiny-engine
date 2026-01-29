/**
 * FIM Engine - 实时代码补全引擎
 */

import * as monaco from 'monaco-editor'
import { ModelAdapter } from '../api/ModelAdapter'

export class FIMEngine {
  private disposable: monaco.IDisposable | null = null
  private modelAdapter: ModelAdapter
  private fimLocked = false

  constructor(private editor: monaco.editor.IStandaloneCodeEditor) {
    this.modelAdapter = new ModelAdapter()
  }

  register(): void {
    // eslint-disable-next-line no-console
    console.log('[FIMEngine] 注册 inline completion provider...')

    this.disposable = monaco.languages.registerInlineCompletionsProvider('javascript', {
      provideInlineCompletions: async (model, position, context, token) => {
        try {
          // 检查是否被锁定
          if (this.fimLocked) {
            return { items: [] }
          }

          const fullText = model.getValue()
          const offset = model.getOffsetAt(position)

          const prefix = fullText.substring(0, offset)
          const suffix = fullText.substring(offset)

          // eslint-disable-next-line no-console
          console.log('[FIMEngine] 触发补全请求:', {
            position: { line: position.lineNumber, column: position.column },
            prefixLength: prefix.length,
            suffixLength: suffix.length
          })

          // 创建 AbortController
          const abortController = new AbortController()
          token.onCancellationRequested(() => {
            abortController.abort()
          })

          // 调用 API
          const completion = await this.modelAdapter.callFIM(prefix, suffix)

          if (!completion || completion.trim() === '') {
            return { items: [] }
          }

          // 检查后缀重复
          if (this.checkSuffixDuplication(completion, suffix)) {
            return { items: [] }
          }

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
        // Monaco Editor 要求的方法，用于释放补全资源
        // 当前实现不需要特殊的资源清理
      },

      handleItemDidShow: () => {
        // Monaco Editor 可选方法，当补全项显示时调用
        // 当前实现不需要特殊处理
      }
    })
  }

  /**
   * 锁定 FIM（当 NES 活跃时）
   */
  lock(): void {
    this.fimLocked = true
    this.clearGhostText()
  }

  /**
   * 解锁 FIM
   */
  unlock(): void {
    this.fimLocked = false
  }

  /**
   * 清除 Ghost Text（强制）
   */
  private clearGhostText(): void {
    try {
      // 方法 1: 触发 Escape 键事件（最可靠）
      this.editor.trigger('keyboard', 'cancelSelection', {})

      // 方法 2: 插入空字符再删除，强制刷新
      const position = this.editor.getPosition()
      if (position) {
        const model = this.editor.getModel()
        if (model) {
          // 插入空格
          model.pushEditOperations(
            [],
            [
              {
                range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                text: ' '
              }
            ],
            () => null
          )

          // 立即删除空格
          setTimeout(() => {
            const newPos = this.editor.getPosition()
            if (newPos && model) {
              model.pushEditOperations(
                [],
                [
                  {
                    range: new monaco.Range(newPos.lineNumber, newPos.column - 1, newPos.lineNumber, newPos.column),
                    text: ''
                  }
                ],
                () => null
              )
            }
          }, 0)
        }
      }
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
