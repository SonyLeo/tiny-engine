/**
 * FIM (Fill-In-the-Middle) 代码补全提示词
 * 合并 systemPrompt + instructions + builder
 */

import { FIM_CONFIG } from '../config'

// ==================== System Prompts ====================

export const FIM_SYSTEM_PROMPT = `You are an AI code completion assistant specialized in JavaScript and TypeScript.

CRITICAL RULES:
1. Return ONLY the code/text that should be inserted at the cursor position
2. DO NOT repeat any code that already exists before the cursor
3. DO NOT include markdown code blocks or language tags
4. DO NOT add explanations or comments unless explicitly requested
5. Match the exact indentation and style of the existing code
6. Keep completions focused and minimal - only what's needed
7. Pay attention to the file metadata (filename, language, current function/class/interface) for better context
8. For TypeScript, ensure type safety and proper type annotations
9. ONLY complete code within the CURRENT function/scope where [CURSOR] is located
10. DO NOT generate code for other functions, classes, or unrelated scopes
11. If you see multiple functions in the context, focus ONLY on the one containing [CURSOR]
12. Respect variable scope - do not reference variables from other functions`

// ==================== Instructions ====================

export function createCodeInstruction(language: string): string {
  return `Complete the code after the cursor position.

Rules:
1. Follow ${language} best practices and modern ES6+ syntax
2. Match the existing code style exactly (indentation, quotes, semicolons)
3. Generate only the necessary code to complete the current statement or block
4. Ensure proper indentation and formatting
5. DO NOT include explanatory comments unless they were already in the pattern
6. If completing a function, include the full implementation
7. For TypeScript, include proper type annotations
8. Return ONLY the completion code, no additional text
9. CRITICAL: Only complete code within the current function/scope
10. DO NOT generate variables or code from other functions in the file`
}

export const BLOCK_COMMENT_INSTRUCTION = `You are writing a JSDoc documentation comment. Complete the comment with clear, concise explanation.

Focus on:
- Describing what the code does
- Explaining parameters with @param tags
- Documenting return values with @returns tag
- Adding usage examples with @example if appropriate
- Including type information for TypeScript

DO NOT generate code. Only complete the comment text.`

export const LINE_COMMENT_INSTRUCTION = `You are writing an inline comment. Complete the comment with a brief, clear explanation.

Focus on:
- Explaining WHY this code exists, not WHAT it does
- Keep it concise and on a single line
- Use clear, professional language

DO NOT generate code. Only complete the comment text.`

export function createUserPrompt(instruction: string, fileContent: string): string {
  return `${instruction}

File content (cursor position marked with [CURSOR]):
${fileContent}

Complete the code/text at the [CURSOR] position. Return ONLY the completion text.`
}

// ==================== 低代码上下文 Prompt ====================

export const LOWCODE_CONTEXT_INSTRUCTION = `You are working in a low-code platform environment with specific APIs and data structures.

AVAILABLE RUNTIME APIS (all accessed via 'this.'):
1. Data Sources (this.dataSource.xxx)
   - Predefined data models for the application
   - Access pattern: this.dataSource.<sourceName>

2. Utility Functions (this.utils.xxx)
   - Common utility methods and npm dependencies
   - Access pattern: this.utils.<utilityName>
   - May include imported libraries (check utils metadata for imports)

3. Global State (this.stores.xxx)
   - Pinia-based global state management
   - Access pattern: this.stores.<storeName>.<property>
   - Actions: this.stores.<storeName>.<actionName>()

4. Local State (this.state.xxx)
   - Component-level reactive state
   - Access pattern: this.state.<propertyName>

5. Local Methods (this.xxx)
   - Component-level methods
   - Access pattern: this.<methodName>()

6. Component References (this.$('refName'))
   - Access Vue component refs
   - Access pattern: this.$('<refName>')

IMPORTANT RULES:
- ONLY use APIs that are explicitly defined in the provided metadata
- DO NOT reference undefined utilities, data sources, or state properties
- Follow the JSExpression/JSFunction protocol for dynamic values
- Use 'function' keyword for function definitions, NOT arrow functions
- Respect the component schema structure (props, events, refs)

PROTOCOL CONVENTIONS:
- Static values: { width: '300px' }
- Dynamic expressions: { width: { type: 'JSExpression', value: 'this.state.xxx' } }
- Function handlers: { onClick: { type: 'JSFunction', value: 'function onClick() {}' } }`

/**
 * 构建低代码增强指令（将元数据注入 instruction）
 */
export function createLowcodeInstruction(language: string, lowcodeContext: any = {}): string {
  let instruction = createCodeInstruction(language)

  if (!lowcodeContext || Object.keys(lowcodeContext).length === 0) {
    return instruction
  }

  instruction += `\n\n${LOWCODE_CONTEXT_INSTRUCTION}`

  const { dataSource, utils, globalState, state, methods, currentSchema } = lowcodeContext

  if (dataSource?.length > 0) {
    instruction += `\n\nAVAILABLE DATA SOURCES:\n${JSON.stringify(dataSource, null, 2)}`
  }
  if (utils?.length > 0) {
    instruction += `\n\nAVAILABLE UTILITIES:\n${JSON.stringify(utils, null, 2)}`
  }
  if (globalState?.length > 0) {
    instruction += `\n\nGLOBAL STATE (Pinia Stores):\n${JSON.stringify(globalState, null, 2)}`
  }
  if (state && Object.keys(state).length > 0) {
    instruction += `\n\nLOCAL STATE:\n${JSON.stringify(state, null, 2)}`
  }
  if (methods && Object.keys(methods).length > 0) {
    instruction += `\n\nLOCAL METHODS:\n${JSON.stringify(methods, null, 2)}`
  }
  if (currentSchema) {
    instruction += `\n\nCURRENT COMPONENT: ${currentSchema.componentName || 'Unknown'}`
    if (currentSchema.props) {
      instruction += `\n- Props: Use component props as defined in schema`
      instruction += `\n- Events: Props starting with 'on' are event handlers`
    }
    if (currentSchema.ref) {
      instruction += `\nRef: this.$('${currentSchema.ref}')`
    }
  }

  return instruction
}

// ==================== 代码上下文提取 ====================

const CODE_CONTEXT_PATTERNS = {
  FUNCTION: /function\s+(\w+)|const\s+(\w+)\s*=.*=>|(\w+)\s*\([^)]*\)\s*{/,
  CLASS: /class\s+(\w+)/,
  INTERFACE: /interface\s+(\w+)/,
  TYPE: /type\s+(\w+)/
}

/**
 * 从光标前文本中提取当前代码上下文（函数名、类名等）
 */
export function extractCodeContext(textBeforeCursor: string): {
  functionName: string
  className: string
  interfaceName: string
  typeName: string
} {
  const lines = textBeforeCursor.split('\n')
  let functionName = ''
  let className = ''
  let interfaceName = ''
  let typeName = ''

  const startLine = Math.max(0, lines.length - 20)

  for (let i = lines.length - 1; i >= startLine; i--) {
    const line = lines[i]

    if (!functionName) {
      const m = line.match(CODE_CONTEXT_PATTERNS.FUNCTION)
      if (m) functionName = m[1] || m[2] || m[3]
    }
    if (!className) {
      const m = line.match(CODE_CONTEXT_PATTERNS.CLASS)
      if (m) className = m[1]
    }
    if (!interfaceName) {
      const m = line.match(CODE_CONTEXT_PATTERNS.INTERFACE)
      if (m) interfaceName = m[1]
    }
    if (!typeName) {
      const m = line.match(CODE_CONTEXT_PATTERNS.TYPE)
      if (m) typeName = m[1]
    }

    if (functionName && className && interfaceName && typeName) break
  }

  return { functionName, className, interfaceName, typeName }
}

/**
 * 构建代码元信息注释（注入到 FIM prefix 前面）
 */
export function buildCodeMetaComment(language: string, codeContext: ReturnType<typeof extractCodeContext>): string {
  let meta = `// Language: ${language}\n`

  if (codeContext.className) {
    meta += `// Current Class: ${codeContext.className}\n`
    meta += `// IMPORTANT: Only complete code within this class\n`
  }
  if (codeContext.interfaceName) {
    meta += `// Current Interface: ${codeContext.interfaceName}\n`
  }
  if (codeContext.typeName) {
    meta += `// Current Type: ${codeContext.typeName}\n`
  }
  if (codeContext.functionName) {
    meta += `// Current Function: ${codeContext.functionName}\n`
    meta += `// IMPORTANT: Only complete code within this function scope\n`
  }

  meta += `// NOTE: Do not reference variables or code from other functions\n\n`
  return meta
}

// ==================== FIM Prompt Builder ====================

export class FIMPromptBuilder {
  constructor(private config: any) {}

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

    return { prefix: optimizedPrefix, suffix: optimizedSuffix, cursorContext }
  }

  buildOptimizedFIMPrompt(fileContent: string, metadata: any = {}) {
    const { prefix, suffix, cursorContext } = this.buildFIMComponents(fileContent, metadata)

    let fimPrompt
    if (suffix.trim().length > 0) {
      fimPrompt = `${FIM_CONFIG.MARKERS.PREFIX}${prefix}${FIM_CONFIG.MARKERS.SUFFIX}${suffix}${FIM_CONFIG.MARKERS.MIDDLE}`
    } else {
      fimPrompt = `${FIM_CONFIG.MARKERS.PREFIX}${prefix}${FIM_CONFIG.MARKERS.SUFFIX}`
    }

    return { fimPrompt, cursorContext }
  }

  private isInComment(prefix: string): { inBlockComment: boolean; inLineComment: boolean } {
    const lastBlockStart = prefix.lastIndexOf('/*')
    const lastBlockEnd = prefix.lastIndexOf('*/')
    const inBlockComment = lastBlockStart > lastBlockEnd

    const lastLineBreak = prefix.lastIndexOf('\n')
    const currentLine = prefix.substring(lastLineBreak + 1)
    const inLineComment = currentLine.trim().startsWith('//')

    return { inBlockComment, inLineComment }
  }

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

  private optimizePrefix(prefix: string) {
    const MAX_PREFIX_LINES = this.config.FIM.MAX_PREFIX_LINES
    const lines = prefix.split('\n')

    if (lines.length <= MAX_PREFIX_LINES) {
      return prefix
    }

    return lines.slice(-MAX_PREFIX_LINES).join('\n')
  }

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

  selectInstruction(cursorContext: any, language: string = 'javascript'): string {
    if (cursorContext.inBlockComment) {
      return BLOCK_COMMENT_INSTRUCTION
    }

    if (cursorContext.inLineComment) {
      return LINE_COMMENT_INSTRUCTION
    }

    return createCodeInstruction(language)
  }

  buildUserPrompt(fileContent: string, metadata: any = {}): string {
    const { fimPrompt, cursorContext } = this.buildOptimizedFIMPrompt(fileContent, metadata)
    const instruction = this.selectInstruction(cursorContext, metadata.language || 'javascript')
    return createUserPrompt(instruction, fimPrompt)
  }
}
