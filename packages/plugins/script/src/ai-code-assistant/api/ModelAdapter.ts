/**
 * Model Adapter - 统一的 AI 模型适配器
 * 固定使用 Qwen 模型
 */

import { getMetaApi, META_SERVICE } from '@opentiny/tiny-engine-meta-register'
import { FIMPromptBuilder, FIM_SYSTEM_PROMPT } from '../prompts/fim'
import { buildNESUserPrompt, parseNESResponse } from '../prompts/nes-builder'
import { NES_SYSTEM_PROMPT } from '../prompts/nes-system'
import { buildLowcodeMetadata, cleanCompletion } from '../utils/code'
import { callQwenChat } from './QwenClient'
import { QWEN_CONFIG, FIXED_MODEL_CONFIG, HTTP_CONFIG } from '../config'

/**
 * 统一的模型适配器（固定使用 Qwen）
 */
export class ModelAdapter {
  private fimBuilder: FIMPromptBuilder
  /** 当前正在进行的 FIM 请求的 AbortController（用于去重） */
  private pendingFIMAbort: AbortController | null = null

  constructor() {
    this.fimBuilder = new FIMPromptBuilder(QWEN_CONFIG)
  }

  /**
   * 获取 API 配置（使用固定的 Qwen API 配置）
   * 返回 null 表示配置不可用（缺少 API Key）
   */
  private getAPIConfig(): { apiKey: string; baseUrl: string } | null {
    // 从 meta 中获取 API Key
    const { apiKey: metaApiKey } = getMetaApi(META_SERVICE.Robot).getSelectedQuickModelInfo() || {}

    // 使用固定的 Qwen API URL
    const baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    const apiKey = metaApiKey || ''

    if (!apiKey) {
      return null
    }

    return { apiKey, baseUrl }
  }

  /**
   * FIM 补全（使用 Qwen Chat API + FIM 格式）
   */
  async callFIM(prefix: string, suffix: string, signal?: AbortSignal): Promise<string> {
    try {
      // 去重：取消上一个未完成的 FIM 请求
      if (this.pendingFIMAbort) {
        this.pendingFIMAbort.abort()
      }
      this.pendingFIMAbort = new AbortController()
      const dedupeSignal = this.pendingFIMAbort.signal

      const config = this.getAPIConfig()
      if (!config) return ''

      const { apiKey, baseUrl } = config
      const lowcodeMetadata = buildLowcodeMetadata()

      const fimMetadata = {
        language: 'javascript',
        isComment: prefix.trim().endsWith('//') || prefix.includes('/*'),
        lowcodeContext: lowcodeMetadata
          ? {
              dataSource: lowcodeMetadata.dataSource || [],
              utils: lowcodeMetadata.utils || [],
              globalState: lowcodeMetadata.globalState || [],
              state: lowcodeMetadata.state || {},
              methods: lowcodeMetadata.methods || {},
              currentSchema: lowcodeMetadata.currentSchema || null
            }
          : null
      }

      // 构建 FIM Prompt
      const { fimPrompt, cursorContext } = this.fimBuilder.buildOptimizedFIMPrompt(
        `${prefix}[CURSOR]${suffix}`,
        fimMetadata
      )

      const instruction = this.fimBuilder.selectInstruction(cursorContext, fimMetadata.language || 'javascript')

      // 合并外部 signal、去重 signal 和超时 signal
      const timeoutSignal = AbortSignal.timeout(HTTP_CONFIG.FIM_TIMEOUT_MS)
      const signals = [dedupeSignal, timeoutSignal]
      if (signal) signals.push(signal)
      const combinedSignal = AbortSignal.any(signals)

      // 使用 Chat API（支持 System Prompt）
      const completionText = await callQwenChat(
        [
          { role: 'system', content: FIM_SYSTEM_PROMPT },
          { role: 'user', content: `${instruction}\n\n${fimPrompt}` }
        ],
        {
          model: FIXED_MODEL_CONFIG.FIM.MODEL,
          maxTokens: FIXED_MODEL_CONFIG.FIM.MAX_TOKENS,
          temperature: FIXED_MODEL_CONFIG.FIM.TEMPERATURE,
          top_p: FIXED_MODEL_CONFIG.FIM.TOP_P,
          presence_penalty: FIXED_MODEL_CONFIG.FIM.PRESENCE_PENALTY
        },
        apiKey,
        baseUrl,
        combinedSignal
      )

      if (completionText) {
        this.pendingFIMAbort = null
        return cleanCompletion(completionText, 'qwen', cursorContext)
      }

      this.pendingFIMAbort = null
      return ''
    } catch (error: any) {
      this.pendingFIMAbort = null
      // 取消和超时不需要报错
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        return ''
      }
      // eslint-disable-next-line no-console
      console.error('[ModelAdapter] FIM error:', error)
      return ''
    }
  }

  /**
   * NES 预测（使用 Qwen Chat API）
   */
  async callNES(payload: any, signal?: AbortSignal): Promise<any> {
    try {
      const config = this.getAPIConfig()
      if (!config) {
        return { predictions: [], totalCount: 0, hasMore: false, requestId: payload.requestId || Date.now() }
      }

      const { apiKey, baseUrl } = config

      // 构建 NES User Prompt
      const userPrompt = buildNESUserPrompt(
        payload.codeWindow,
        payload.windowInfo,
        payload.diffSummary,
        payload.editHistory,
        payload.userFeedback || []
      )

      // 合并外部 signal 和超时 signal
      const timeoutSignal = AbortSignal.timeout(HTTP_CONFIG.NES_TIMEOUT_MS)
      const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal

      // 调用 Qwen Chat API
      const result = await callQwenChat(
        [
          { role: 'system', content: NES_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        {
          model: FIXED_MODEL_CONFIG.NES.MODEL,
          maxTokens: FIXED_MODEL_CONFIG.NES.MAX_TOKENS,
          temperature: FIXED_MODEL_CONFIG.NES.TEMPERATURE,
          top_p: FIXED_MODEL_CONFIG.NES.TOP_P,
          presence_penalty: FIXED_MODEL_CONFIG.NES.PRESENCE_PENALTY
        },
        apiKey,
        baseUrl,
        combinedSignal
      )

      // 解析响应
      const predictions = parseNESResponse(result)

      return {
        predictions,
        totalCount: predictions.length,
        hasMore: false,
        requestId: payload.requestId || Date.now()
      }
    } catch (error: any) {
      // 取消和超时不需要报错
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        return { predictions: [], totalCount: 0, hasMore: false, requestId: payload.requestId || Date.now() }
      }
      // eslint-disable-next-line no-console
      console.error('[ModelAdapter] NES error:', error)
      return { predictions: [], totalCount: 0, hasMore: false, requestId: payload.requestId || Date.now() }
    }
  }
}
