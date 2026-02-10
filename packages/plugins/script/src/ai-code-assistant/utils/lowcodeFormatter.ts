/**
 * 低代码元数据格式化器
 * 将原始元数据精简为签名/键名/类型，减少 token 消耗
 */

/**
 * 从函数代码中提取函数签名
 */
function extractFunctionSignature(functionCode: string): string {
  if (!functionCode) return 'function()'

  const funcMatch = functionCode.match(/function\s+(\w+)?\s*\(([^)]*)\)/)
  if (funcMatch) {
    const name = funcMatch[1] || 'anonymous'
    const params = funcMatch[2].trim()
    return `function ${name}(${params})`
  }

  const arrowMatch = functionCode.match(/(?:\(([^)]*)\)|(\w+))\s*=>/)
  if (arrowMatch) {
    const params = arrowMatch[1] || arrowMatch[2] || ''
    return `(${params}) => {}`
  }

  return 'function()'
}

/**
 * 格式化数据源（只保留 name/type/description）
 */
function formatDataSources(dataSource: any[]): any[] {
  return dataSource.map((ds) => ({
    name: ds.name,
    type: ds.type || 'unknown',
    description: ds.description || `Data source: ${ds.name}`,
    ...(ds.options && { options: ds.options })
  }))
}

/**
 * 格式化工具类（提取签名，区分 npm/function）
 */
function formatUtils(utils: any[]): any[] {
  return utils.map((util) => {
    const formatted: any = {
      name: util.name,
      type: util.type || 'function'
    }

    if (util.type === 'npm' && util.content) {
      formatted.package = util.content.package
      formatted.exportName = util.content.exportName
      formatted.destructuring = util.content.destructuring
      formatted.description = `Import from ${util.content.package}`
    }

    if (util.type === 'function' && util.content) {
      if (util.content.type === 'JSFunction') {
        formatted.signature = extractFunctionSignature(util.content.value)
        formatted.description = `Utility function: ${util.name}`
      }
    }

    return formatted
  })
}

/**
 * 格式化全局状态（只保留 state/getters/actions 键名）
 */
function formatGlobalState(globalState: any[]): any[] {
  return globalState.map((store) => ({
    id: store.id,
    state: Object.keys(store.state || {}),
    getters: Object.keys(store.getters || {}),
    actions: Object.keys(store.actions || {}),
    description: `Pinia store: ${store.id}`
  }))
}

/**
 * 格式化本地状态（只保留键名和类型，不保留实际值）
 */
function formatState(state: Record<string, any>): Record<string, any> {
  const formatted: Record<string, any> = {}
  for (const [key, value] of Object.entries(state)) {
    formatted[key] = {
      type: typeof value,
      isArray: Array.isArray(value),
      isObject: value !== null && typeof value === 'object' && !Array.isArray(value)
    }
  }
  return formatted
}

/**
 * 格式化本地方法（提取函数签名）
 */
function formatMethods(methods: Record<string, any>): Record<string, any> {
  const formatted: Record<string, any> = {}
  for (const [key, value] of Object.entries(methods)) {
    if (value && value.type === 'JSFunction') {
      formatted[key] = {
        signature: extractFunctionSignature(value.value),
        description: `Method: ${key}`
      }
    } else {
      formatted[key] = {
        type: typeof value,
        description: `Method: ${key}`
      }
    }
  }
  return formatted
}

/**
 * 格式化组件 schema（识别 props/events）
 */
function formatCurrentSchema(schema: any): any | null {
  if (!schema) return null

  const formatted: any = {
    componentName: schema.componentName,
    ...(schema.ref && { ref: schema.ref })
  }

  if (schema.props) {
    formatted.props = {}
    for (const [key, value] of Object.entries(schema.props) as [string, any][]) {
      if (key.startsWith('on')) {
        formatted.props[key] = { type: 'event', isFunction: value?.type === 'JSFunction' }
      } else {
        formatted.props[key] = {
          type: value?.type || 'static',
          isDynamic: value?.type === 'JSExpression' || value?.type === 'JSFunction'
        }
      }
    }
  }

  return formatted
}

/**
 * 格式化完整的低代码元数据（主入口）
 */
export function formatLowcodeContext(metadata: any): any {
  if (!metadata) return null

  const { dataSource = [], utils = [], globalState = [], state = {}, methods = {}, currentSchema = null } = metadata

  return {
    dataSource: formatDataSources(dataSource),
    utils: formatUtils(utils),
    globalState: formatGlobalState(globalState),
    state: formatState(state),
    methods: formatMethods(methods),
    currentSchema: formatCurrentSchema(currentSchema)
  }
}
