/**
 * AI Code Assistant - 统一配置文件
 * 合并所有常量配置
 */

// ==================== 运行时配置 ====================

export const DEFAULT_CONFIG = {
  fim: {
    enabled: true,
    maxTokens: 64,
    temperature: 0.2
  },
  nes: {
    enabled: true,
    windowSize: 30
  },
  language: 'javascript'
}

// ==================== Dispatcher 配置 ====================

export const DISPATCHER_CONFIG = {
  /** NES debounce 时间（意图为 REFACTORING 时） */
  NES_DEBOUNCE_REFACTORING_MS: 1000,
  /** NES debounce 时间（意图为 UNCERTAIN 时） */
  NES_DEBOUNCE_UNCERTAIN_MS: 2000,
  /** NES 应用编辑后的保护期（期间不触发新 NES） */
  NES_EDIT_PROTECTION_MS: 1500,
  /** 连续插入字符数阈值，超过此值判定为 NEW_CODE */
  NEW_CODE_CHAR_THRESHOLD: 4,
  /** 意图分类的时间窗口（只看此窗口内的编辑） */
  INTENT_WINDOW_MS: 3000
}

// ==================== 模型配置 ====================

/**
 * 固定使用 Qwen 模型配置（与 server 对齐）
 */
export const FIXED_MODEL_CONFIG = {
  FIM: {
    MODEL: 'qwen2.5-coder-32b-instruct',
    MAX_TOKENS: 48,
    TEMPERATURE: 0,
    TOP_P: 0.95,
    PRESENCE_PENALTY: 0 // FIM 使用 0
  },
  NES: {
    MODEL: 'qwen3-coder-plus',
    MAX_TOKENS: 1024,
    TEMPERATURE: 0.1,
    TOP_P: 0.95,
    PRESENCE_PENALTY: 0.2 // Chat 使用 0.2
  }
}

export const QWEN_CONFIG = {
  CHAT_PATH: '/chat/completions',
  DEFAULT_TEMPERATURE: 0,
  TOP_P: 0.95,
  PRESENCE_PENALTY: 0,
  FIM: {
    MAX_PREFIX_LINES: 100,
    MAX_SUFFIX_LINES: 50
  }
}

export const HTTP_CONFIG = {
  METHOD: 'POST',
  CONTENT_TYPE: 'application/json',
  STREAM: false,
  /** FIM 请求超时（ms） */
  FIM_TIMEOUT_MS: 5000,
  /** NES 请求超时（ms） */
  NES_TIMEOUT_MS: 15000
}

export const ERROR_MESSAGES = {
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
