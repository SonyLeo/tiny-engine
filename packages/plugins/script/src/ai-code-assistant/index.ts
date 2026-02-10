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
  // eslint-disable-next-line no-console
  console.log('[AICodeAssistant] 开始初始化，配置:', config)

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
    // eslint-disable-next-line no-console
    console.log('[AICodeAssistant] ✅ FIM Engine 已注册')
  } else {
    // eslint-disable-next-line no-console
    console.log('[AICodeAssistant] ⚠️ FIM Engine 未启用')
  }

  // 初始化 NES 引擎
  let nesEngine: NESEngine | null = null
  if (finalConfig.nes?.enabled) {
    nesEngine = new NESEngine(editor, finalConfig.nes)
    // eslint-disable-next-line no-console
    console.log('[AICodeAssistant] ✅ NES Engine 已初始化')
  } else {
    // eslint-disable-next-line no-console
    console.log('[AICodeAssistant] ⚠️ NES Engine 未启用')
  }

  // 注入引擎引用到 Dispatcher
  dispatcher.init(fimEngine, nesEngine, editHistory)

  // 监听编辑事件 → 全部委托给 Dispatcher
  model.onDidChangeContent((event) => {
    const changes = event.changes.map((change) => ({ change, model }))
    dispatcher.handleEdit(changes)
  })

  // 注册快捷键（NES 相关）
  if (nesEngine) {
    // Tab - 接受当前建议
    editor.onKeyDown((e) => {
      if (e.keyCode === monaco.KeyCode.Tab && nesEngine!.isActive()) {
        e.preventDefault()
        e.stopPropagation()
        nesEngine!.acceptSuggestion()

        // 如果 NES 建议全部处理完，通知 Dispatcher
        if (!nesEngine!.isActive()) {
          dispatcher.handleNESClosed()
        }
      }
    })

    // Alt+N - 跳过建议
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyN, () => {
      if (nesEngine!.isActive()) {
        nesEngine!.skipSuggestion()

        if (!nesEngine!.isActive()) {
          dispatcher.handleNESClosed()
        }
      }
    })

    // Esc - 完全关闭 NES
    editor.addCommand(monaco.KeyCode.Escape, () => {
      if (nesEngine!.isActive()) {
        dispatcher.handleNESClosed()
      }
    })
  }

  return {
    dispose: () => {
      if (fimEngine) fimEngine.dispose()
      if (nesEngine) nesEngine.dispose()
      dispatcher.dispose()
    }
  }
}
