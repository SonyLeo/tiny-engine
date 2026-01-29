/**
 * 提示词相关常量
 */

/**
 * FIM 标记配置（与 server 对齐）
 */
export const FIM_CONFIG = {
  MARKERS: {
    // 标准 FIM 格式（与 server 一致）
    PREFIX: '<|fim_prefix|>',
    SUFFIX: '<|fim_suffix|>',
    MIDDLE: '<|fim_middle|>',
    // 通用标记
    CURSOR: '[CURSOR]'
  }
}

/**
 * FIM 停止符配置（限制 16 个以内）
 * 用于 Qwen FIM Completions API
 */
export const FIM_STOP_SEQUENCES = [
  // 语句边界
  ' {', // 函数体开始（空格+大括号）
  '\n{', // 函数体开始（换行+大括号）
  ';', // 语句结束
  '\n\n', // 双换行（段落边界）

  // 代码块边界
  '\n}', // 函数/对象结束

  // 新定义（防止生成新的代码块）
  '\nfunction ', // 新函数
  '\nclass ', // 新类
  '\nconst ', // 新常量
  '\nlet ', // 新变量
  '\nexport ', // 导出
  '\nimport ', // 导入

  // 注释
  '\n//', // 单行注释

  // Markdown（防止生成文档）
  '```' // 代码块
] // 总计: 14 个停止符

/**
 * Chat API 停止符配置（限制 16 个以内）
 * 用于 Qwen Chat API（NES 预测不需要停止符）
 */
export const CHAT_STOP_SEQUENCES: string[] = [] // Chat API 用于 JSON 响应，不需要停止符

/**
 * 代码上下文分析配置
 */
export const CONTEXT_CONFIG = {
  MAX_LINES_TO_SCAN: 20 // 向上扫描的最大行数
}

/**
 * 代码模式匹配（JS/TS）
 */
export const CODE_PATTERNS = {
  // 匹配函数定义：function name() / const name = () => / name() {
  FUNCTION: /function\s+(\w+)|const\s+(\w+)\s*=.*=>|(\w+)\s*\([^)]*\)\s*{/,
  // 匹配类定义
  CLASS: /class\s+(\w+)/,
  // 匹配接口定义（TS）
  INTERFACE: /interface\s+(\w+)/,
  // 匹配类型定义（TS）
  TYPE: /type\s+(\w+)/
}
