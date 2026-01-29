/**
 * Model Utils
 */

import { MODEL_CONFIG } from '../config'
import { FIM_STOP_SEQUENCES } from '../config'

export const MODEL_COMMON_CONFIG = {
  TOKEN_LIMITS: {
    EXPRESSION: 64,
    STATEMENT: 256,
    FUNCTION: 200,
    CLASS: 256,
    DEFAULT: 128
  },
  CLEANUP_PATTERNS: {
    MARKDOWN_CODE_BLOCK: /^```[\w]*\n?|```$/g,
    TRAILING_SEMICOLON: /;\s*$/,
    LEADING_EMPTY_LINES: /^\n+/,
    TRAILING_EMPTY_LINES: /\n+$/
  },
  TRUNCATION: {
    MAX_LINES: {
      EXPRESSION: 1,
      OBJECT: 5,
      DEFAULT: 10
    },
    CUTOFF_KEYWORDS: ['function ', 'class ', 'export ', 'import '],
    BLOCK_ENDINGS: ['}', '};']
  }
}

export function detectModelType(modelName: string): string {
  if (!modelName) return MODEL_CONFIG.UNKNOWN.TYPE

  const lowerName = modelName.toLowerCase()

  if (MODEL_CONFIG.QWEN.KEYWORDS.some((keyword) => lowerName.includes(keyword))) {
    return MODEL_CONFIG.QWEN.TYPE
  }

  if (MODEL_CONFIG.DEEPSEEK.KEYWORDS.some((keyword) => lowerName.includes(keyword))) {
    return MODEL_CONFIG.DEEPSEEK.TYPE
  }

  return MODEL_CONFIG.UNKNOWN.TYPE
}

export function calculateTokens(cursorContext: any): number {
  const limits = MODEL_COMMON_CONFIG.TOKEN_LIMITS

  if (!cursorContext) {
    return limits.DEFAULT
  }

  if (cursorContext.needsStatement) {
    return limits.STATEMENT
  } else if (cursorContext.needsExpression) {
    return limits.EXPRESSION
  } else if (cursorContext.inFunction) {
    return limits.FUNCTION
  } else if (cursorContext.inClass) {
    return limits.CLASS
  }

  return limits.DEFAULT
}

/**
 * 获取停止符（与 server 对齐：直接使用固定的 FIM_STOP_SEQUENCES）
 */
export function getStopSequences(_cursorContext: any, _modelType: string): string[] {
  // 与 server 对齐：直接返回固定的 FIM 停止符
  return FIM_STOP_SEQUENCES
}
