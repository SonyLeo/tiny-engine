/**
 * API Adapter Constants
 */

// 固定使用 Qwen 模型配置（与 server 对齐）
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
    MAX_TOKENS: 2048,
    TEMPERATURE: 0.1,
    TOP_P: 0.95,
    PRESENCE_PENALTY: 0.2 // Chat 使用 0.2
  }
}

export const QWEN_CONFIG = {
  COMPLETION_PATH: '/completions',
  CHAT_PATH: '/chat/completions',
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
