/**
 * Prompts 统一导出入口
 */

// FIM 代码补全
export { FIM_SYSTEM_PROMPT, FIM_FAST_PROMPT } from './fim/systemPrompt'
export {
  createCodeInstruction,
  createUserPrompt,
  BLOCK_COMMENT_INSTRUCTION,
  LINE_COMMENT_INSTRUCTION
} from './fim/instructions'
export { FIMPromptBuilder } from './fim/builder'

// NES 编辑预测
export { NES_SYSTEM_PROMPT } from './nes/systemPrompt'
export { buildNESUserPrompt, parseNESResponse } from './nes/builder'
export { formatEditHistory, formatUserFeedback, enhanceRecentChange, formatCodeWindow } from './nes/formatters'
export { PATTERN_SPECIFIC_INSTRUCTIONS, getPatternInstruction } from './nes/patterns'
export { CHANGE_TYPE_EXAMPLES, NES_FULL_EXAMPLE } from './nes/examples'

// 常量
export { FIM_CONFIG, FIM_STOP_SEQUENCES, CHAT_STOP_SEQUENCES, CONTEXT_CONFIG, CODE_PATTERNS } from './constants'
