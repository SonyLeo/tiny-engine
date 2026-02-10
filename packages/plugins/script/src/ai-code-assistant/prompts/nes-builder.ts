/**
 * NES Prompt 构建器和格式化工具
 * 合并 builder + formatters
 */

import { CHANGE_TYPE_EXAMPLES } from './nes-examples'

// ==================== Formatters ====================

function formatEditHistory(editHistory: any[]): string {
  if (!editHistory || editHistory.length === 0) {
    return 'No edit history available'
  }

  return editHistory
    .slice(-5)
    .map((edit, index) => {
      const timestamp = edit.timestamp ? new Date(edit.timestamp).toLocaleTimeString() : 'N/A'
      const lineInfo = edit.lineNumber ? `Line ${edit.lineNumber}` : 'Unknown'
      const type = edit.type || 'unknown'
      const text = edit.newText ? `"${edit.newText.substring(0, 50)}"` : ''

      return `[${index + 1}] ${timestamp} | ${lineInfo}\n   Action: ${type}\n   ${text ? `Content: ${text}` : ''}`
    })
    .join('\n')
}

function formatUserFeedback(userFeedback: any[]): string {
  if (!userFeedback || userFeedback.length === 0) {
    return 'No user feedback available'
  }

  return userFeedback
    .map((feedback) => {
      const action = feedback.action || 'unknown'
      const reason = feedback.reason || ''
      return `- ${action}${reason ? `: ${reason}` : ''}`
    })
    .join('\n')
}

function enhanceRecentChange(diffSummary: string, editHistory: any[]): string {
  let enhanced = diffSummary || 'Recent code change detected'

  if (editHistory && editHistory.length > 0) {
    const lastEdit = editHistory[editHistory.length - 1]
    if (lastEdit.type) {
      enhanced += `\nEdit Type: ${lastEdit.type}`
    }
    if (lastEdit.lineNumber) {
      enhanced += `\nLocation: Line ${lastEdit.lineNumber}`
    }
  }

  return enhanced
}

function formatCodeWindow(codeWindow: string, windowInfo: any): string {
  if (!codeWindow) {
    return 'No code available'
  }

  const lines = codeWindow.split('\n')
  const startLine = windowInfo?.startLine || 1

  return lines
    .map((line, index) => {
      const lineNumber = startLine + index
      return `${lineNumber}: ${line}`
    })
    .join('\n')
}

// ==================== Builder ====================

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

export function parseNESResponse(response: string): any[] {
  if (!response || response.trim().length === 0) {
    return []
  }

  try {
    const parsed = JSON.parse(response)

    if (!parsed.predictions || !Array.isArray(parsed.predictions)) {
      return []
    }

    return parsed.predictions
      .filter((pred: any) => {
        // 校验必填字段
        if (typeof pred.targetLine !== 'number' || pred.targetLine < 1) return false
        if (typeof pred.suggestionText !== 'string') return false
        if (typeof pred.explanation !== 'string') return false
        return true
      })
      .map((pred: any) => ({
        targetLine: pred.targetLine,
        originalLineContent: pred.originalLineContent || '',
        suggestionText: pred.suggestionText,
        explanation: pred.explanation,
        confidence: typeof pred.confidence === 'number' ? pred.confidence : 0.5,
        priority: typeof pred.priority === 'number' ? pred.priority : 2,
        changeType: pred.changeType || 'REPLACE_LINE'
      }))
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[NESBuilder] Failed to parse NES response:', error)
    return []
  }
}
