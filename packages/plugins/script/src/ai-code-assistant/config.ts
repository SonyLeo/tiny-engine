/**
 * AI Code Assistant - 配置文件
 */

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
