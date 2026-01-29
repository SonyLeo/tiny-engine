/**
 * NES Prompt 构建器
 * 用于构建完整的 NES User Prompt
 */

import { CHANGE_TYPE_EXAMPLES } from './examples'
import { formatEditHistory, formatUserFeedback, enhanceRecentChange, formatCodeWindow } from './formatters'

/**
 * 构建 NES User Prompt（用于 Chat API）
 * 配合 NES_SYSTEM_PROMPT 使用
 *
 * @param codeWindow - 代码窗口
 * @param windowInfo - 窗口信息 {startLine, totalLines}
 * @param diffSummary - 差异摘要
 * @param editHistory - 编辑历史
 * @param userFeedback - 用户反馈（可选）
 * @returns 完整的 User Prompt
 */
export function buildNESUserPrompt(
  codeWindow: string,
  windowInfo: any,
  diffSummary: string,
  editHistory: any[],
  userFeedback?: any[]
): string {
  const formattedHistory = formatEditHistory(editHistory)
  const formattedFeedback = formatUserFeedback(userFeedback || [])
  const enhancedChange = enhanceRecentChange(diffSummary, editHistory)
  const formattedCode = formatCodeWindow(codeWindow, windowInfo)

  return `<edit_history>
${formattedHistory}
</edit_history>

<user_feedback>
${formattedFeedback}
</user_feedback>

<recent_change>
${enhancedChange}
</recent_change>

<file_info>
Total Lines: ${windowInfo.totalLines}
Window Start: ${windowInfo.startLine}
</file_info>

<code_window>
${formattedCode}
</code_window>

<change_type_examples>
${CHANGE_TYPE_EXAMPLES}
</change_type_examples>

Analyze the <edit_history> and <user_feedback> to understand user intent, then predict the next logical edit in <code_window>.
CRITICAL: You MUST include the correct "changeType" field in each prediction. Review <change_type_examples> to understand how to classify changes.`
}

/**
 * 解析 NES 响应
 * @param response - 模型返回的 JSON 字符串
 * @returns 解析后的预测结果
 */
export function parseNESResponse(response: string): any[] {
  if (!response || response.trim().length === 0) {
    return []
  }

  try {
    const parsed = JSON.parse(response)

    if (!parsed.predictions || !Array.isArray(parsed.predictions)) {
      return []
    }

    return parsed.predictions.map((pred: any) => ({
      targetLine: pred.targetLine,
      originalLineContent: pred.originalLineContent,
      suggestionText: pred.suggestionText,
      explanation: pred.explanation,
      confidence: pred.confidence || 0.5,
      priority: pred.priority || 2,
      changeType: pred.changeType || 'REPLACE_LINE'
    }))
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[NESBuilder] Failed to parse NES response:', error)
    return []
  }
}
