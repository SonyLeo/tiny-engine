/**
 * Model Adapter - 统一的 AI 模型适配器
 * 固定使用 Qwen 模型
 */

import { getMetaApi, META_SERVICE } from '@opentiny/tiny-engine-meta-register'
import {
  FIMPromptBuilder,
  FIM_SYSTEM_PROMPT,
  createLowcodeInstruction,
  extractCodeContext,
  buildCodeMetaComment
} from '../prompts/fim'
import { buildNESUserPrompt, parseNESResponse } from '../prompts/nes-builder'
import { NES_SYSTEM_PROMPT } from '../prompts/nes-system'
import { buildLowcodeMetadata, cleanCompletion } from '../utils/code'
import { formatLowcodeContext } from '../utils/lowcodeFormatter'
import { callQwenChat } from './QwenClient'
import {
  QWEN_CONFIG,
  FIXED_MODEL_CONFIG,
  HTTP_CONFIG,
  TOKEN_LIMITS,
  STOP_SEQUENCES,
  CONTEXT_STOP_SEQUENCES
} from '../config'

// ==================== 辅助函数 ====================

/**
 * 根据光标上下文动态计算 max_tokens
 */
function calculateDynamicTokens(cursorContext: any): number {
  if (!cursorContext) return TOKEN_LIMITS.DEFAULT

  if (cursorContext.needsExpression) return TOKEN_LIMITS.EXPRESSION
  if (cursorContext.needsStatement) return TOKEN_LIMITS.STATEMENT
  if (cursorContext.inFunction) return TOKEN_LIMITS.FUNCTION
  if (cursorContext.inClass) return TOKEN_LIMITS.CLASS

  return TOKEN_LIMITS.DEFAULT
}

/**
 * 根据光标上下文构建 stop sequences（最多 16 个）
 */
function buildStopSequences(cursorContext: any): string[] {
  const stops: string[] = [...STOP_SEQUENCES.CORE]

  if (cursorContext) {
    if (cursorContext.inBlockComment || cursorContext.inLineComment) {
      stops.push(...CONTEXT_STOP_SEQUENCES.COMMENT)
    } else if (cursorContext.needsExpression) {
      stops.push(...CONTEXT_STOP_SEQUENCES.EXPRESSION)
      stops.push(...STOP_SEQUENCES.NEW_SCOPE)
    } else if (cursorContext.inObject) {
      stops.push(...CONTEXT_STOP_SEQUENCES.OBJECT)
      stops.push(...STOP_SEQUENCES.NEW_SCOPE)
    } else if (cursorContext.inFunction) {
      stops.push(...CONTEXT_STOP_SEQUENCES.FUNCTION)
      stops.push(...STOP_SEQUENCES.BLOCK_END)
    } else {
      stops.push(...STOP_SEQUENCES.NEW_SCOPE)
      stops.push(...STOP_SEQUENCES.BLOCK_END)
    }
  } else {
    stops.push(...STOP_SEQUENCES.NEW_SCOPE)
    stops.push(...STOP_SEQUENCES.BLOCK_END)
  }

  const unique = [...new Set(stops)]
  return unique.length > 16 ? unique.slice(0, 16) : unique
}

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
      const language = 'javascript'

      // 格式化低代码元数据（提取签名/键名/类型，减少 token 消耗）
      const formattedContext = formatLowcodeContext(lowcodeMetadata)

      const fimMetadata = {
        language,
        isComment: prefix.trim().endsWith('//') || prefix.includes('/*'),
        lowcodeContext: formattedContext
      }

      // 提取代码上下文元信息（函数名、类名等）
      const codeContext = extractCodeContext(prefix)
      const metaComment = buildCodeMetaComment(language, codeContext)

      // 构建 FIM Prompt（在 prefix 前注入元信息注释）
      const { fimPrompt, cursorContext } = this.fimBuilder.buildOptimizedFIMPrompt(
        `${metaComment}${prefix}[CURSOR]${suffix}`,
        fimMetadata
      )

      // 选择 instruction（低代码增强 or 普通 or 注释）
      let instruction: string
      if (cursorContext.inBlockComment || cursorContext.inLineComment) {
        instruction = this.fimBuilder.selectInstruction(cursorContext, language)
      } else if (fimMetadata.lowcodeContext) {
        instruction = createLowcodeInstruction(language, fimMetadata.lowcodeContext)
      } else {
        instruction = this.fimBuilder.selectInstruction(cursorContext, language)
      }

      // 动态 Token 计算
      const maxTokens = calculateDynamicTokens(cursorContext)

      // 动态 Stop Sequences
      const stop = buildStopSequences(cursorContext)

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
          maxTokens,
          temperature: FIXED_MODEL_CONFIG.FIM.TEMPERATURE,
          top_p: FIXED_MODEL_CONFIG.FIM.TOP_P,
          presence_penalty: FIXED_MODEL_CONFIG.FIM.PRESENCE_PENALTY,
          stop
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
