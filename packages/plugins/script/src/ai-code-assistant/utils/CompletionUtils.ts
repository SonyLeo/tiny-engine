/**
 * Completion Utils
 */

import { useResource, useCanvas } from '@opentiny/tiny-engine-meta-register'
import { MODEL_COMMON_CONFIG } from './ModelUtils'

export function buildLowcodeMetadata(): any {
  try {
    const { dataSource = [], utils = [], globalState = [] } = useResource().appSchemaState || {}
    const { state: pageState = {}, methods = {} } = useCanvas().getPageSchema() || {}
    const currentSchema = useCanvas().getCurrentSchema()

    return {
      dataSource,
      utils,
      globalState,
      state: pageState,
      methods,
      currentSchema
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[CompletionUtils] Failed to build lowcode metadata:', error)
    return null
  }
}

export function cleanCompletion(text: string, modelType: string, cursorContext: any = null): string {
  if (!text) return text

  let cleaned = text

  // 1. 移除 markdown 代码块
  cleaned = cleaned.replace(MODEL_COMMON_CONFIG.CLEANUP_PATTERNS.MARKDOWN_CODE_BLOCK, '')

  // 2. 移除 [CURSOR] 标记
  cleaned = cleaned.replace(/\[CURSOR\]/g, '')
  cleaned = cleaned.replace(/\/\/ \[CURSOR\]/g, '')

  // 3. 移除前后空行
  cleaned = cleaned.replace(MODEL_COMMON_CONFIG.CLEANUP_PATTERNS.LEADING_EMPTY_LINES, '')
  cleaned = cleaned.replace(MODEL_COMMON_CONFIG.CLEANUP_PATTERNS.TRAILING_EMPTY_LINES, '')

  // 4. 表达式特殊处理
  if (cursorContext?.needsExpression) {
    cleaned = cleaned.replace(MODEL_COMMON_CONFIG.CLEANUP_PATTERNS.TRAILING_SEMICOLON, '')
  }

  // 5. 智能截断
  const lines = cleaned.split('\n')

  const truncation = MODEL_COMMON_CONFIG.TRUNCATION
  const maxLines = cursorContext?.needsExpression
    ? truncation.MAX_LINES.EXPRESSION
    : cursorContext?.inObject
    ? truncation.MAX_LINES.OBJECT
    : truncation.MAX_LINES.DEFAULT

  if (lines.length > maxLines) {
    let cutoffIndex = maxLines
    for (let i = 0; i < maxLines && i < lines.length; i++) {
      const line = lines[i].trim()

      if (truncation.CUTOFF_KEYWORDS.some((keyword) => line.startsWith(keyword))) {
        cutoffIndex = i
        break
      }

      if (truncation.BLOCK_ENDINGS.includes(line)) {
        cutoffIndex = i + 1
        break
      }
    }

    cleaned = lines.slice(0, cutoffIndex).join('\n')
  }

  return cleaned
}
