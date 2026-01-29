/**
 * FIM Prompt 构建器
 * 整合上下文分析和指令选择逻辑
 */

import { FIM_CONFIG } from '../constants'
import {
  createCodeInstruction,
  createUserPrompt,
  BLOCK_COMMENT_INSTRUCTION,
  LINE_COMMENT_INSTRUCTION
} from './instructions'

export class FIMPromptBuilder {
  constructor(private config: any) {}

  /**
   * 构建 FIM 组件（prefix、suffix、cursor context）
   */
  buildFIMComponents(fileContent: string, _metadata: any = {}) {
    const cursorIndex = fileContent.indexOf(FIM_CONFIG.MARKERS.CURSOR)

    if (cursorIndex === -1) {
      return {
        prefix: fileContent,
        suffix: '',
        cursorContext: { type: 'unknown', hasPrefix: true, hasSuffix: false }
      }
    }

    const rawPrefix = fileContent.substring(0, cursorIndex)
    const rawSuffix = fileContent.substring(cursorIndex + FIM_CONFIG.MARKERS.CURSOR.length)

    const cursorContext = this.analyzeCursorContext(rawPrefix, rawSuffix)
    const optimizedPrefix = this.optimizePrefix(rawPrefix)
    const optimizedSuffix = this.optimizeSuffix(rawSuffix)

    return {
      prefix: optimizedPrefix,
      suffix: optimizedSuffix,
      cursorContext
    }
  }

  /**
   * 构建优化的 FIM Prompt（标准 FIM 格式）
   */
  buildOptimizedFIMPrompt(fileContent: string, metadata: any = {}) {
    const { prefix, suffix, cursorContext } = this.buildFIMComponents(fileContent, metadata)

    // 标准 FIM 格式（与 server 对齐）
    let fimPrompt
    if (suffix.trim().length > 0) {
      fimPrompt = `${FIM_CONFIG.MARKERS.PREFIX}${prefix}${FIM_CONFIG.MARKERS.SUFFIX}${suffix}${FIM_CONFIG.MARKERS.MIDDLE}`
    } else {
      fimPrompt = `${FIM_CONFIG.MARKERS.PREFIX}${prefix}${FIM_CONFIG.MARKERS.SUFFIX}`
    }

    return { fimPrompt, cursorContext }
  }

  /**
   * 判断光标位置是否在注释中
   */
  private isInComment(prefix: string): { inBlockComment: boolean; inLineComment: boolean } {
    const lastBlockStart = prefix.lastIndexOf('/*')
    const lastBlockEnd = prefix.lastIndexOf('*/')
    const inBlockComment = lastBlockStart > lastBlockEnd

    const lastLineBreak = prefix.lastIndexOf('\n')
    const currentLine = prefix.substring(lastLineBreak + 1)
    const inLineComment = currentLine.trim().startsWith('//')

    return { inBlockComment, inLineComment }
  }

  /**
   * 分析光标上下文
   */
  private analyzeCursorContext(prefix: string, suffix: string) {
    const context: any = {
      type: 'unknown',
      hasPrefix: prefix.trim().length > 0,
      hasSuffix: suffix.trim().length > 0,
      inFunction: false,
      inClass: false,
      inObject: false,
      inArray: false,
      inBlockComment: false,
      inLineComment: false,
      needsExpression: false,
      needsStatement: false
    }

    const { inBlockComment, inLineComment } = this.isInComment(prefix)
    context.inBlockComment = inBlockComment
    context.inLineComment = inLineComment

    if (inBlockComment) {
      context.type = 'block-comment'
      return context
    }

    if (inLineComment) {
      context.type = 'line-comment'
      return context
    }

    const prefixTrimmed = prefix.trimEnd()

    if (/[=+\-*/%<>!&|,([]$/.test(prefixTrimmed)) {
      context.needsExpression = true
      context.type = 'expression'
    } else if (/[{;]\s*$/.test(prefixTrimmed) || prefixTrimmed.length === 0) {
      context.needsStatement = true
      context.type = 'statement'
    } else if (/{\s*$/.test(prefixTrimmed) || /,\s*$/.test(prefixTrimmed)) {
      context.inObject = true
      context.type = 'object-property'
    }

    const functionMatch = prefix.match(/function\s+\w+|const\s+\w+\s*=.*=>|async\s+function/g)
    const classMatch = prefix.match(/class\s+\w+/g)

    context.inFunction = functionMatch && functionMatch.length > 0
    context.inClass = classMatch && classMatch.length > 0

    return context
  }

  /**
   * 优化 prefix（限制行数）
   */
  private optimizePrefix(prefix: string) {
    const MAX_PREFIX_LINES = this.config.FIM.MAX_PREFIX_LINES
    const lines = prefix.split('\n')

    if (lines.length <= MAX_PREFIX_LINES) {
      return prefix
    }

    return lines.slice(-MAX_PREFIX_LINES).join('\n')
  }

  /**
   * 优化 suffix（限制行数和范围）
   */
  private optimizeSuffix(suffix: string) {
    const MAX_SUFFIX_LINES = this.config.FIM.MAX_SUFFIX_LINES
    const lines = suffix.split('\n')

    let cutoffIndex = lines.length
    for (let i = 0; i < Math.min(lines.length, MAX_SUFFIX_LINES); i++) {
      const line = lines[i].trim()

      if (
        line.startsWith('function ') ||
        line.startsWith('class ') ||
        (line.startsWith('const ') && line.includes('=>')) ||
        line.startsWith('export ') ||
        line.startsWith('import ')
      ) {
        cutoffIndex = i
        break
      }

      if (line === '}' || line === '};') {
        cutoffIndex = i + 1
        break
      }
    }

    const finalLines = Math.min(cutoffIndex, MAX_SUFFIX_LINES)

    if (lines.length <= finalLines) {
      return suffix
    }

    return lines.slice(0, finalLines).join('\n')
  }

  /**
   * 选择合适的指令（代码 vs 注释）
   */
  selectInstruction(cursorContext: any, language: string = 'javascript'): string {
    if (cursorContext.inBlockComment) {
      return BLOCK_COMMENT_INSTRUCTION
    }

    if (cursorContext.inLineComment) {
      return LINE_COMMENT_INSTRUCTION
    }

    return createCodeInstruction(language)
  }

  /**
   * 构建完整的 User Prompt
   */
  buildUserPrompt(fileContent: string, metadata: any = {}): string {
    const { fimPrompt, cursorContext } = this.buildOptimizedFIMPrompt(fileContent, metadata)
    const instruction = this.selectInstruction(cursorContext, metadata.language || 'javascript')
    return createUserPrompt(instruction, fimPrompt)
  }
}
