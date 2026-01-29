/**
 * AI Code Assistant - 统一配置文件
 * 合并所有常量配置
 */

// ==================== 运行时配置 ====================

export const DEFAULT_CONFIG = {
  fim: {
    enabled: true,
    debounceMs: 300,
    maxTokens: 64,
    temperature: 0.2
  },
  nes: {
    enabled: true,
    debounceMs: 3000,
    windowSize: 30
  },
  language: 'javascript',
  enableSemanticAnalysis: true
}

export const TIME_CONFIG = {
  LOCK_DURATION_MS: 500,
  LAYOUT_DELAY_MS: 50
}

export const WINDOW_CONFIG = {
  WINDOW_SIZE: 30,
  MAX_PREDICTIONS: 5,
  MAX_EDIT_HISTORY: 10
}

// ==================== 模型配置 ====================

/**
 * 固定使用 Qwen 模型配置（与 server 对齐）
 */
export const FIXED_MODEL_CONFIG = {
  FIM: {
    MODEL: 'qwen2.5-coder-32b-instruct',
    API_URL: 'https://dashscope.aliyuncs.com/compatible-mode/v1/completions',
    MAX_TOKENS: 48,
    TEMPERATURE: 0,
    TOP_P: 0.95,
    PRESENCE_PENALTY: 0 // FIM 使用 0
  },
  NES: {
    MODEL: 'qwen3-coder-plus',
    API_URL: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    MAX_TOKENS: 1024,
    TEMPERATURE: 0.1,
    TOP_P: 0.95,
    PRESENCE_PENALTY: 0.2 // Chat 使用 0.2
  }
}

export const QWEN_CONFIG = {
  COMPLETION_PATH: '/completions',
  CHAT_PATH: '/chat/completions',
  DEFAULT_TEMPERATURE: 0,
  TOP_P: 0.95,
  PRESENCE_PENALTY: 0,
  FIM: {
    MAX_PREFIX_LINES: 100,
    MAX_SUFFIX_LINES: 50
  }
}

export const DEEPSEEK_CONFIG = {
  COMPLETION_PATH: '/beta',
  PATH_REPLACE: '/v1',
  DEFAULT_TEMPERATURE: 0,
  TOP_P: 1.0,
  FIM: {
    MAX_PREFIX_LINES: 100,
    MAX_SUFFIX_LINES: 50,
    MAX_TOKENS: 4096
  }
}

export const MODEL_CONFIG = {
  QWEN: {
    TYPE: 'qwen',
    KEYWORDS: ['qwen']
  },
  DEEPSEEK: {
    TYPE: 'deepseek',
    KEYWORDS: ['deepseek']
  },
  UNKNOWN: {
    TYPE: 'unknown',
    KEYWORDS: []
  }
}

export const HTTP_CONFIG = {
  METHOD: 'POST',
  CONTENT_TYPE: 'application/json',
  STREAM: false
}

export const ERROR_MESSAGES = {
  CONFIG_MISSING: 'AI 配置未设置（缺少 model/apiKey/baseUrl）',
  NO_COMPLETION: '未收到有效的补全结果',
  REQUEST_FAILED: '请求失败',
  QWEN_API_ERROR: 'Qwen API 错误'
}

// ==================== 提示词配置 ====================

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
  ' {',
  '\n{',
  ';',
  '\n\n',
  '\n}',
  '\nfunction ',
  '\nclass ',
  '\nconst ',
  '\nlet ',
  '\nexport ',
  '\nimport ',
  '\n//',
  '```'
] // 总计: 14 个停止符

/**
 * Chat API 停止符配置
 * 用于 Qwen Chat API（NES 预测不需要停止符）
 */
export const CHAT_STOP_SEQUENCES: string[] = []

/**
 * 代码上下文分析配置
 */
export const CONTEXT_CONFIG = {
  MAX_LINES_TO_SCAN: 20
}

/**
 * 代码模式匹配（JS/TS）
 */
export const CODE_PATTERNS = {
  FUNCTION: /function\s+(\w+)|const\s+(\w+)\s*=.*=>|(\w+)\s*\([^)]*\)\s*{/,
  CLASS: /class\s+(\w+)/,
  INTERFACE: /interface\s+(\w+)/,
  TYPE: /type\s+(\w+)/
}
