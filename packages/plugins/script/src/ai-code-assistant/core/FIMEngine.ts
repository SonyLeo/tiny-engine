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
    // eslint-disable-next-line no-console
    console.log('[FIMEngine] 注册 inline completion provider...')

    // 注册到配置的语言和 typescript
    const languages = [this.language]
    if (this.language !== 'typescript') {
      languages.push('typescript')
    }

    const provider = {
      provideInlineCompletions: async (model, position, context, token) => {
        try {
          // 检查是否被锁定（本地锁 或 Dispatcher 状态锁）
          if (this.fimLocked || this.dispatcher?.isFIMLocked()) {
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

          // 调用 API（传递 signal 以支持取消）
          const completion = await this.modelAdapter.callFIM(prefix, suffix, abortController.signal)

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
    this.clearGhostText()
  }

  /**
   * 解锁 FIM
   */
  unlock(): void {
    this.fimLocked = false
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
