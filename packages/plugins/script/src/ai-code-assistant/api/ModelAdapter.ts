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
import { QWEN_CONFIG, FIXED_MODEL_CONFIG, MODEL_CONFIG } from '../config'

/**
 * 统一的模型适配器（固定使用 Qwen）
 */
export class ModelAdapter {
  private fimBuilder: FIMPromptBuilder

  constructor() {
    this.fimBuilder = new FIMPromptBuilder(QWEN_CONFIG)
  }

  /**
   * 获取 API 配置（使用固定的 Qwen API 配置）
   */
  private getAPIConfig() {
    // 从 meta 中获取 API Key
    const { apiKey: metaApiKey } = getMetaApi(META_SERVICE.Robot).getSelectedQuickModelInfo() || {}

    // 使用固定的 Qwen API URL
    const baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    const apiKey = metaApiKey || ''

    if (!apiKey) {
      throw new Error('AI 配置未设置：请在 Robot 插件中配置 API Key')
    }

    // eslint-disable-next-line no-console
    console.log('[ModelAdapter] 使用固定 Qwen API:', baseUrl)

    return { apiKey, baseUrl }
  }

  /**
   * FIM 补全（使用 Qwen Chat API + FIM 格式）
   */
  async callFIM(prefix: string, suffix: string): Promise<string> {
    try {
      const { apiKey, baseUrl } = this.getAPIConfig()
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
        baseUrl
      )

      if (completionText) {
        return cleanCompletion(completionText, MODEL_CONFIG.QWEN.TYPE, cursorContext)
      }

      return ''
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[ModelAdapter] FIM error:', error)
      throw error
    }
  }

  /**
   * NES 预测（使用 Qwen Chat API）
   */
  async callNES(payload: any): Promise<any> {
    try {
      const { apiKey, baseUrl } = this.getAPIConfig()

      // eslint-disable-next-line no-console
      console.log('[ModelAdapter] NES 预测请求:', {
        codeWindowLength: payload.codeWindow?.length || 0,
        editHistoryCount: payload.editHistory?.length || 0,
        windowInfo: payload.windowInfo
      })

      // 构建 NES User Prompt
      const userPrompt = buildNESUserPrompt(
        payload.codeWindow,
        payload.windowInfo,
        payload.diffSummary,
        payload.editHistory,
        payload.userFeedback || []
      )

      // eslint-disable-next-line no-console
      console.log('[ModelAdapter] NES System Prompt 长度:', NES_SYSTEM_PROMPT.length)
      // eslint-disable-next-line no-console
      console.log('[ModelAdapter] NES User Prompt 长度:', userPrompt.length)

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
        baseUrl
      )

      // eslint-disable-next-line no-console
      console.log('[ModelAdapter] NES 响应长度:', result?.length || 0)

      // 解析响应
      const predictions = parseNESResponse(result)

      // eslint-disable-next-line no-console
      console.log('[ModelAdapter] NES 预测数量:', predictions.length)

      return {
        predictions,
        totalCount: predictions.length,
        hasMore: false,
        requestId: payload.requestId || Date.now()
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[ModelAdapter] NES error:', error)
      throw error
    }
  }
}
