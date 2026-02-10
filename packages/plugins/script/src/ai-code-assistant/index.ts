/**
 * AI Code Assistant - 主入口
 * 支持 FIM（实时补全）和 NES（编辑预测）
 * 所有协调逻辑由 EditDispatcher 统一管理
 */

import * as monaco from 'monaco-editor'
import type { AICodeAssistantConfig, AICodeAssistant } from './types'
import { DEFAULT_CONFIG } from './config'
import { FIMEngine } from './core/FIMEngine'
import { NESEngine } from './core/NESEngine'
import { EditDispatcher } from './core/EditDispatcher'
import { EditHistoryManager } from './core/EditHistoryManager'
import { TabKeyHandler } from './utils/TabKeyHandler'

// 加载样式
import './ui/styles.css'

/**
 * 初始化 AI 代码助手
 */
export function initAICodeAssistant(
  _monacoInstance: typeof monaco,
  editor: monaco.editor.IStandaloneCodeEditor,
  config: AICodeAssistantConfig
): AICodeAssistant {
  const finalConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    fim: { ...DEFAULT_CONFIG.fim, ...config.fim },
    nes: { ...DEFAULT_CONFIG.nes, ...config.nes }
  }

  const model = editor.getModel()
  if (!model) {
    throw new Error('Editor model is required')
  }

  // 初始化核心组件
  const editHistory = new EditHistoryManager(model.getValue())
  const dispatcher = new EditDispatcher()

  // 初始化 FIM 引擎
  let fimEngine: FIMEngine | null = null
  if (finalConfig.fim?.enabled) {
    fimEngine = new FIMEngine(editor, finalConfig.language)
    fimEngine.setDispatcher(dispatcher)
    fimEngine.register()
  }

  // 初始化 NES 引擎
  let nesEngine: NESEngine | null = null
  if (finalConfig.nes?.enabled) {
    nesEngine = new NESEngine(editor, finalConfig.nes)
  }

  // 注入引擎引用到 Dispatcher
  dispatcher.init(fimEngine, nesEngine, editHistory)

  // 监听编辑事件 → 全部委托给 Dispatcher
  model.onDidChangeContent((event) => {
    const changes = event.changes.map((change) => ({ change, model }))
    dispatcher.handleEdit(changes)
  })

  // ==================== 快捷键处理 ====================
  // 优先级：Suggest Widget > FIM Inline Completion > NES 建议 > 默认行为

  // Tab - 4 级优先级处理
  const tabHandler = new TabKeyHandler(editor, {
    onAcceptNES: nesEngine
      ? () => {
          if (nesEngine!.isActive()) {
            nesEngine!.acceptSuggestion()
            if (!nesEngine!.isActive()) {
              dispatcher.handleNESClosed()
            }
          }
        }
      : undefined
  })

  editor.onKeyDown((e) => {
    if (e.keyCode === monaco.KeyCode.Tab) {
      if (tabHandler.handleTab()) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
  })

  // Esc - 智能处理（onKeyDown 不覆盖 Monaco 默认行为）
  editor.onKeyDown((e) => {
    if (e.keyCode !== monaco.KeyCode.Escape) return

    // FIM Ghost Text 存在时不拦截，让 Monaco 自己处理
    if (fimEngine && fimEngine.hasGhostText()) return

    // NES 激活时关闭 NES
    if (nesEngine && nesEngine.isActive()) {
      e.preventDefault()
      e.stopPropagation()
      dispatcher.handleNESClosed()
    }
  })

  // Alt+N - 跳过 NES 建议（onKeyDown 不覆盖全局快捷键）
  editor.onKeyDown((e) => {
    if (e.keyCode === monaco.KeyCode.KeyN && e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
      if (nesEngine && nesEngine.isActive()) {
        e.preventDefault()
        e.stopPropagation()
        nesEngine.skipSuggestion()
        if (!nesEngine.isActive()) {
          dispatcher.handleNESClosed()
        }
      }
    }
  })

  return {
    dispose: () => {
      if (fimEngine) fimEngine.dispose()
      if (nesEngine) nesEngine.dispose()
      dispatcher.dispose()
    }
  }
}
