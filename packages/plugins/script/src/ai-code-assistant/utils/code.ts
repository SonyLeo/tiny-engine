/**
 * 代码工具函数
 * 合并 CodeParser + CompletionUtils
 */

import { useResource, useCanvas } from '@opentiny/tiny-engine-meta-register'

// ==================== Code Parser ====================

export class CodeParser {
  static isFunctionDefinition(line: string): boolean {
    return (
      /^\s*(?:async\s+)?function\s+\w+\s*\(/.test(line) ||
      /^\s*(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/.test(line) ||
      /^\s*(?:async\s+)?\w+\s*\([^)]*\)\s*[:{]/.test(line)
    )
  }

  static extractFunctionName(line: string): string | null {
    const match =
      line.match(/function\s+(\w+)/) || line.match(/(?:const|let|var)\s+(\w+)\s*=/) || line.match(/(\w+)\s*\(/)
    return match ? match[1] : null
  }

  static extractType(text: string): string | null {
    const match = text.match(/:\s*([\w<>[\],\s|&]+)/)
    return match ? match[1].trim() : null
  }

  static hasKeywordTypo(line: string): { wrong: string; correct: string } | null {
    const typos: Record<string, string> = {
      functoin: 'function',
      retrun: 'return',
      consle: 'console',
      lenght: 'length',
      conts: 'const',
      vra: 'var',
      'let ': 'let'
    }

    for (const [wrong, correct] of Object.entries(typos)) {
      if (line.includes(wrong)) {
        return { wrong, correct }
      }
    }

    return null
  }

  static extractIdentifiers(code: string): string[] {
    const identifierRegex = /\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g
    const matches = code.match(identifierRegex) || []
    const keywords = new Set([
      'function',
      'const',
      'let',
      'var',
      'if',
      'else',
      'for',
      'while',
      'return',
      'class',
      'interface',
      'type',
      'import',
      'export',
      'from',
      'as',
      'new',
      'this',
      'super',
      'extends',
      'implements',
      'async',
      'await'
    ])
    return [...new Set(matches.filter((id) => !keywords.has(id)))]
  }
}

// ==================== Completion Utils ====================

export function buildLowcodeMetadata(): any {
  try {
    const { dataSource = [], utils = [], globalState = [] } = useResource().appSchemaState || {}
    const { state: pageState = {}, methods = {} } = useCanvas().getPageSchema() || {}
    const currentSchema = useCanvas().getCurrentSchema()

    return {
      dataSource,
      utils,
      globalState,
      state: pageState,
      methods,
      currentSchema
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[CompletionUtils] Failed to build lowcode metadata:', error)
    return null
  }
}

export function cleanCompletion(text: string, _modelType: string, cursorContext: any = null): string {
  if (!text) return text

  let cleaned = text

  // 移除 markdown 代码块
  cleaned = cleaned.replace(/^```[\w]*\n?|```$/g, '')

  // 移除 [CURSOR] 标记
  cleaned = cleaned.replace(/\[CURSOR\]/g, '')
  cleaned = cleaned.replace(/\/\/ \[CURSOR\]/g, '')

  // 移除前后空行
  cleaned = cleaned.replace(/^\n+/, '')
  cleaned = cleaned.replace(/\n+$/, '')

  // 表达式特殊处理
  if (cursorContext?.needsExpression) {
    cleaned = cleaned.replace(/;\s*$/, '')
  }

  return cleaned
}
