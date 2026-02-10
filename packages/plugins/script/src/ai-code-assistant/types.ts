/**
 * AI Code Assistant - 类型定义
 */

export interface FIMConfig {
  enabled?: boolean
  maxTokens?: number
  temperature?: number
}

export interface NESConfig {
  enabled?: boolean
  symptoms?: SymptomType[]
  windowSize?: number
}

export interface AICodeAssistantConfig {
  fim?: FIMConfig
  nes?: NESConfig
  language?: string
}

export interface AICodeAssistant {
  dispose: () => void
  onSymptomDetected?: (callback: (symptom: Symptom) => void) => void
  onPrediction?: (callback: (predictions: Prediction[]) => void) => void
}

export type SymptomType =
  | 'RENAME_FUNCTION'
  | 'RENAME_VARIABLE'
  | 'ADD_PARAMETER'
  | 'REMOVE_PARAMETER'
  | 'CHANGE_TYPE'
  | 'LOGIC_ERROR'
  | 'WORD_FIX'

export interface Symptom {
  type: SymptomType
  confidence: number
  description: string
  affectedLine?: number
  context?: Record<string, any>
}

export type ChangeType = 'REPLACE_LINE' | 'REPLACE_WORD' | 'INSERT' | 'DELETE' | 'INLINE_INSERT'

export interface WordReplaceInfo {
  word: string
  replacement: string
  startColumn: number
  endColumn: number
}

export interface InlineInsertInfo {
  content: string
  insertColumn: number
}

export interface Prediction {
  targetLine: number
  suggestionText: string
  originalLineContent?: string
  explanation: string
  confidence?: number
  priority?: number
  changeType?: ChangeType
  requestId?: number
  wordReplaceInfo?: WordReplaceInfo
  inlineInsertInfo?: InlineInsertInfo
}

export interface EditRecord {
  timestamp: number
  lineNumber: number
  column: number
  type: 'insert' | 'delete' | 'replace'
  oldText: string
  newText: string
  rangeLength: number
  source?: 'user' | 'nes'
  context?: {
    lineContent: string
    tokenType?: 'identifier' | 'string' | 'comment' | 'keyword' | 'other'
    semanticType?: 'functionName' | 'variableName' | 'parameter' | 'functionCall' | 'other'
  }
}

export interface NESPayload {
  codeWindow: string
  windowInfo: {
    startLine: number
    totalLines: number
  }
  diffSummary: string
  editHistory: EditRecord[]
  requestId: number
}

export interface NESResponse {
  symptom?: Symptom
  predictions: Prediction[]
  totalCount: number
  hasMore: boolean
  requestId: number
}

// ==================== Dispatcher 状态机类型 ====================

/**
 * Dispatcher 状态
 * IDLE: 空闲，FIM 可自由触发
 * NES_PENDING: NES debounce 中，FIM 仍可工作
 * NES_DIAGNOSING: NES 正在请求 API，FIM 被锁定
 * NES_SUGGESTING: NES 正在展示建议，FIM 被锁定
 */
export type DispatcherState = 'IDLE' | 'NES_PENDING' | 'NES_DIAGNOSING' | 'NES_SUGGESTING'

/**
 * 编辑意图分类
 * NEW_CODE: 用户在写新代码（行尾连续插入）→ FIM 优先
 * REFACTORING: 用户在重构（重命名、改参数等）→ NES 优先
 * UNCERTAIN: 无法确定 → FIM 先行，NES 延迟触发
 */
export type EditIntent = 'NEW_CODE' | 'REFACTORING' | 'UNCERTAIN'
