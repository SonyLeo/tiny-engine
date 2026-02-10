/**
 * Prompts 统一导出入口
 */

// FIM 代码补全
export {
  FIM_SYSTEM_PROMPT,
  FIMPromptBuilder,
  createCodeInstruction,
  createUserPrompt,
  BLOCK_COMMENT_INSTRUCTION,
  LINE_COMMENT_INSTRUCTION
} from './fim'

// NES 编辑预测
export { NES_SYSTEM_PROMPT } from './nes-system'
export { buildNESUserPrompt, parseNESResponse } from './nes-builder'
export { CHANGE_TYPE_EXAMPLES } from './nes-examples'
