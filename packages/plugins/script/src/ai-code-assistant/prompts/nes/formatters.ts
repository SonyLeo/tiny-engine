/**
 * NES Prompt 格式化工具
 * 用于格式化编辑历史、代码窗口、用户反馈等
 */

/**
 * 格式化编辑历史
 * @param editHistory - 编辑历史数组
 * @returns 格式化后的编辑历史文本
 */
export function formatEditHistory(editHistory: any[]): string {
  if (!editHistory || editHistory.length === 0) {
    return 'No edit history available'
  }

  return editHistory
    .slice(-5) // 只保留最近 5 条
    .map((edit, index) => {
      const timestamp = edit.timestamp ? new Date(edit.timestamp).toLocaleTimeString() : 'N/A'
      const lineInfo = edit.lineNumber ? `Line ${edit.lineNumber}` : 'Unknown'
      const type = edit.type || 'unknown'
      const text = edit.newText ? `"${edit.newText.substring(0, 50)}"` : ''

      return `[${index + 1}] ${timestamp} | ${lineInfo}
   Action: ${type}
   ${text ? `Content: ${text}` : ''}`
    })
    .join('\n')
}

/**
 * 格式化用户反馈
 * @param userFeedback - 用户反馈数组
 * @returns 格式化后的用户反馈文本
 */
export function formatUserFeedback(userFeedback: any[]): string {
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

/**
 * 增强最近修改描述
 * @param diffSummary - 差异摘要
 * @param editHistory - 编辑历史
 * @returns 增强后的修改描述
 */
export function enhanceRecentChange(diffSummary: string, editHistory: any[]): string {
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

/**
 * 格式化代码窗口（带行号）
 * @param codeWindow - 代码窗口内容
 * @param windowInfo - 窗口信息 {startLine, totalLines}
 * @returns 格式化后的代码窗口
 */
export function formatCodeWindow(codeWindow: string, windowInfo: any): string {
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
