import { mergeOptions } from '../utils/mergeOptions'

const defaultOption = {
  enabled: true,
  agentRoot: 'https://agent.opentiny.design/api/v1/webmcp-trial/',
  sessionId: '78b66563-95c0-4839-8007-e8af634dd658',
  capabilities: {
    prompts: { listChanged: true },
    resources: { subscribe: true, listChanged: true },
    tools: { listChanged: true },
    completions: {},
    logging: {}
  },
  tools: {
    navigation: true,
    application: true
  },
  customTools: []
}

/**
 * 生成导航工具代码
 * @param {Array} pageSchema 页面模式数组
 * @returns {string} 导航工具代码
 */
function generateNavigationTools(pageSchema) {
  // 从页面模式中提取路由路径，支持 route 和 router 字段
  const routes = pageSchema
    .filter((page) => page.meta && (page.meta.route || page.meta.router))
    .map((page) => {
      const routeField = page.meta.route || page.meta.router
      const routePath = routeField.startsWith('/') ? routeField.slice(1) : routeField
      return routePath || 'home'
    })

  // 如果没有路由，添加默认的 home 路由
  if (routes.length === 0) {
    routes.push('home')
  }

  const routeEnum = routes.map((route) => `"${route}"`).join(', ')

  return `import { z } from "@opentiny/next-sdk"
import type { WebMcpServer } from "@opentiny/next-sdk"
import type { Router } from 'vue-router'

export function registerNavigationTools(server: WebMcpServer, router: Router) {
  server.registerTool(
    "navigate-to-page",
    {
      title: "页面导航",
      description: "导航到指定页面",
      inputSchema: {
        path: z.enum([${routeEnum}])
          .describe("目标页面路径"),
      },
    },
    async ({ path }: { path: string }) => {
      try {
        await router.push(\`/\${path}\`)
        return {
          content: [{ type: "text", text: \`已导航到 \${path} 页面\` }],
        }
      } catch (error) {
        return {
          content: [{ type: "text", text: \`导航失败：\${error}\` }],
        }
      }
    }
  )

  server.registerTool(
    "go-back",
    {
      title: "返回上一页",
      description: "返回到上一个页面",
      inputSchema: {},
    },
    async () => {
      try {
        router.back()
        return {
          content: [{ type: "text", text: "已返回上一页" }],
        }
      } catch (error) {
        return {
          content: [{ type: "text", text: \`返回上一页失败：\${error}\` }],
        }
      }
    }
  )

  server.registerTool(
    "go-forward",
    {
      title: "前进到下一页",
      description: "前进到下一个页面",
      inputSchema: {},
    },
    async () => {
      try {
        router.forward()
        return {
          content: [{ type: "text", text: "已前进到下一页" }],
        }
      } catch (error) {
        return {
          content: [{ type: "text", text: \`前进到下一页失败：\${error}\` }],
        }
      }
    }
  )

  server.registerTool(
    "get-current-route",
    {
      title: "获取当前路由",
      description: "获取当前页面的路由信息",
      inputSchema: {},
    },
    async () => {
      try {
        const currentRoute = router.currentRoute.value
        return {
          content: [{ 
            type: "text", 
            text: \`当前路由：\${currentRoute.path}，页面名称：\${String(currentRoute.name)}\` 
          }],
        }
      } catch (error) {
        return {
          content: [{ type: "text", text: \`获取当前路由失败：\${error}\` }],
        }
      }
    }
  )
}`
}

/**
 * 生成应用程序特定工具代码
 * @param {Object} schema 应用程序模式
 * @returns {string} 应用程序工具代码
 */
function generateApplicationTools(schema) {
  // 基于全局状态和数据源生成自定义工具
  const globalStates = schema.globalState || []

  let toolsCode = `import { z } from "@opentiny/next-sdk"
import type { WebMcpServer } from "@opentiny/next-sdk"`

  // 为每个全局状态生成工具
  globalStates.forEach((state) => {
    if (state.id && state.state) {
      toolsCode += `
import { use${state.id.charAt(0).toUpperCase() + state.id.slice(1)}Store } from '../../stores/${state.id}'`
    }
  })

  toolsCode += `

export function registerApplicationTools(server: WebMcpServer) {`

  // 为每个全局状态生成管理工具
  globalStates.forEach((state) => {
    if (state.id && state.state) {
      const storeName = state.id.charAt(0).toUpperCase() + state.id.slice(1)
      const stateKeys = Object.keys(state.state)

      toolsCode += `
  const ${state.id}Store = use${storeName}Store()

  server.registerTool(
    "get-${state.id}-state",
    {
      title: "获取${storeName}状态",
      description: "获取当前${storeName}的状态信息",
      inputSchema: {},
    },
    async () => {
      try {
        return {
          content: [{
            type: "text",
            text: \`${storeName}状态：\${JSON.stringify(${state.id}Store.$state, null, 2)}\`
          }],
        }
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: \`获取${storeName}状态失败：\${error}\`
          }],
        }
      }
    }
  )`

      // 为状态中的每个属性生成更新工具
      stateKeys.forEach((key) => {
        toolsCode += `

  server.registerTool(
    "update-${state.id}-${key}",
    {
      title: "更新${storeName}的${key}",
      description: "更新${storeName}状态中的${key}属性",
      inputSchema: {
        value: z.any().describe("新的${key}值"),
      },
    },
    async ({ value }: { value: any }) => {
      try {
        ${state.id}Store.${key} = value
        return {
          content: [{
            type: "text",
            text: \`${storeName}的${key}已更新为：\${JSON.stringify(value)}\`
          }],
        }
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: \`更新${storeName}的${key}失败：\${error}\`
          }],
        }
      }
    }
  )`
      })
    }
  })

  toolsCode += `
}`

  return toolsCode
}

/**
 * 生成 MCP 服务器文件
 * @param {Array} enabledTools 启用的工具类别
 * @returns {string} MCP 服务器代码
 */
function generateMcpServer(enabledTools) {
  let imports = `import { WebMcpServer } from "@opentiny/next-sdk"
import type { Router } from 'vue-router'`

  let registrations = ''

  if (enabledTools.includes('navigation')) {
    imports += `
import { registerNavigationTools } from './tools/navigationTools'`
    registrations += `
  registerNavigationTools(server, router)`
  }

  if (enabledTools.includes('application')) {
    imports += `
import { registerApplicationTools } from './tools/applicationTools'`
    registrations += `
  registerApplicationTools(server)`
  }

  return `${imports}

export function createMcpServer(router: Router, mcpServerConfig: any) {
  const server = new WebMcpServer(
    { name: "business-app", version: "1.0.0" },
    { capabilities: mcpServerConfig.capabilities }
  )

  // 注册各类工具${registrations}

  return server
}`
}

/**
 * 生成基础配置文件
 * @param {Object} config MCP 配置
 * @returns {string} 基础配置代码
 */
function generateBaseConfig(config) {
  return `export const AGENT_ROOT = '${config.agentRoot}'
export const SESSION_ID = '${config.sessionId}'`
}

/**
 * 修改 main.ts/main.js 文件以包含 MCP 样式
 * @param {string} originalContent 原始 main.ts/main.js 内容
 * @returns {string} 修改后的内容
 */
function modifyMainTs(originalContent) {
  // 如果已经包含 tiny-robot 样式，则不重复添加
  if (originalContent.includes('@opentiny/tiny-robot/dist/style.css')) {
    return originalContent
  }

  // 查找第一个 import 语句的位置
  const lines = originalContent.split('\n')
  let insertIndex = 0

  // 找到第一个非注释的 import 语句后插入
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith('import ') && !line.includes('//')) {
      insertIndex = i + 1
      break
    }
  }

  // 插入 MCP 样式导入
  lines.splice(insertIndex, 0, "import '@opentiny/tiny-robot/dist/style.css'")

  return lines.join('\n')
}

/**
 * 修改 App.vue 文件以包含 MCP 集成
 * @param {string} originalContent 原始 App.vue 内容
 * @param {Object} config MCP 配置
 * @returns {string} 修改后的 App.vue 内容
 */
function modifyAppVue(originalContent, config) {
  // 如果已经包含 MCP 集成，则不重复添加
  if (originalContent.includes('TinyRemoter') || originalContent.includes('createMcpServer')) {
    return originalContent
  }

  // 提取 script setup 部分
  const scriptSetupMatch = originalContent.match(/<script setup[^>]*>([\s\S]*?)<\/script>/)
  if (!scriptSetupMatch) {
    // 如果没有 script setup，创建一个新的
    const mcpScript = `<script setup lang="ts">
import { TinyRemoter } from "@opentiny/next-remoter";
import {
  WebMcpClient,
  createMessageChannelPairTransport,
} from "@opentiny/next-sdk";
import type { Transport } from "@opentiny/next-sdk";
import { AGENT_ROOT, SESSION_ID } from "./base";
import { provide, onMounted } from "vue";
import { useRouter } from "vue-router";
import { createMcpServer } from "./mcp/server";

const router = useRouter();

const [serverTransport, clientTransport] = createMessageChannelPairTransport();

// 定义 MCP Server 的能力
const capabilities = ${JSON.stringify(config.capabilities, null, 2)};

const mcpServer: {
  transport: Transport | null;
  capabilities: Record<string, any>;
} = {
  transport: serverTransport,
  capabilities,
};

provide("mcpServer", mcpServer);

serverTransport.onerror = (error) => {
  console.error(\`ServerTransport error:\`, error);
};

const createProxyTransport = async () => {
  const client = new WebMcpClient(
    { name: "mcp-web-client", version: "1.0.0" },
    {
      capabilities: {
        roots: { listChanged: true },
        sampling: {},
        elicitation: {},
      },
    }
  );
  // @ts-expect-error client
  window.client = client;
  await client.connect(clientTransport);

  await client.connect({
    url: AGENT_ROOT + "mcp",
    sessionId: SESSION_ID,
    agent: true,
    onError: (error: Error) => {
      console.error("Connect proxy error:", error);
    },
  });

  window.addEventListener("pagehide", client.onPagehide);
};

// 初始化MCP服务器
const initMcpServer = async () => {
  try {
    const server = createMcpServer(router, mcpServer);
    await server.connect(mcpServer.transport as Transport);
    console.log('MCP 服务器初始化成功');
  } catch (error) {
    console.error('MCP 服务器初始化失败:', error);
  }
};

onMounted(() => {
  createProxyTransport();
  initMcpServer();
});
</script>`

    let modifiedContent = originalContent.replace(/<template>/, `${mcpScript}\n\n<template>`)

    // 在模板中添加 TinyRemoter 组件
    if (!modifiedContent.includes('TinyRemoter')) {
      // 查找 </template> 标签前添加 TinyRemoter
      modifiedContent = modifiedContent.replace(
        '</template>',
        `    <TinyRemoter :sessionId="SESSION_ID" class="remoter" />\n  </template>`
      )

      // 添加 TinyRemoter 的样式
      const remoterStyles = `
.remoter {
  position: fixed;
  right: 2rem;
  bottom: 2rem;
  width: 50px;
  height: 50px;
  z-index: 1000;
}

@media (max-width: 768px) {
  .remoter {
    right: 1rem;
    bottom: 1rem;
    width: 40px;
    height: 40px;
  }
}

:deep(.next-sdk-trigger-btn) {
  font-size: 30px;
}`

      // 添加样式到现有的 style 标签中，或创建新的 style 标签
      if (modifiedContent.includes('<style')) {
        modifiedContent = modifiedContent.replace(/<\/style>/, `${remoterStyles}\n</style>`)
      } else {
        modifiedContent += `\n\n<style scoped>${remoterStyles}\n</style>`
      }
    }

    return modifiedContent
  }

  // 如果存在 script setup，则修改它
  const existingScript = scriptSetupMatch[1]

  // 添加必要的导入
  const mcpImports = `import { TinyRemoter } from "@opentiny/next-remoter";
import {
  WebMcpClient,
  createMessageChannelPairTransport,
} from "@opentiny/next-sdk";
import type { Transport } from "@opentiny/next-sdk";
import { AGENT_ROOT, SESSION_ID } from "./base";
import { createMcpServer } from "./mcp/server";`

  // 添加 MCP 相关代码
  const mcpCode = `
const [serverTransport, clientTransport] = createMessageChannelPairTransport();

// 定义 MCP Server 的能力
const capabilities = ${JSON.stringify(config.capabilities, null, 2)};

const mcpServer: {
  transport: Transport | null;
  capabilities: Record<string, any>;
} = {
  transport: serverTransport,
  capabilities,
};

provide("mcpServer", mcpServer);

serverTransport.onerror = (error) => {
  console.error(\`ServerTransport error:\`, error);
};

const createProxyTransport = async () => {
  const client = new WebMcpClient(
    { name: "mcp-web-client", version: "1.0.0" },
    {
      capabilities: {
        roots: { listChanged: true },
        sampling: {},
        elicitation: {},
      },
    }
  );
  // @ts-expect-error client
  window.client = client;
  await client.connect(clientTransport);

  await client.connect({
    url: AGENT_ROOT + "mcp",
    sessionId: SESSION_ID,
    agent: true,
    onError: (error: Error) => {
      console.error("Connect proxy error:", error);
    },
  });

  window.addEventListener("pagehide", client.onPagehide);
};

// 初始化MCP服务器
const initMcpServer = async () => {
  try {
    const server = createMcpServer(router, mcpServer);
    await server.connect(mcpServer.transport as Transport);
    console.log('MCP 服务器初始化成功');
  } catch (error) {
    console.error('MCP 服务器初始化失败:', error);
  }
};`

  // 修改 onMounted 或添加新的 onMounted
  let newScript = existingScript

  // 添加导入
  if (!existingScript.includes('provide')) {
    newScript = `import { provide, onMounted } from "vue";\n${newScript}`
  } else if (!existingScript.includes('onMounted')) {
    newScript = newScript.replace('import { provide', 'import { provide, onMounted')
  }

  if (!existingScript.includes('useRouter')) {
    newScript = `import { useRouter } from "vue-router";\n${newScript}`
  }

  newScript = `${mcpImports}\n${newScript}`

  // 添加 router 变量如果不存在
  if (!existingScript.includes('const router')) {
    newScript += `\nconst router = useRouter();`
  }

  // 添加 MCP 代码
  newScript += mcpCode

  // 修改或添加 onMounted
  if (existingScript.includes('onMounted(')) {
    // 如果已经有 onMounted，在其中添加 MCP 初始化
    newScript = newScript.replace(/onMounted\(\(\) => \{([\s\S]*?)\}\)/, (match, content) => {
      return `onMounted(() => {${content}
  createProxyTransport();
  initMcpServer();
})`
    })
  } else {
    // 如果没有 onMounted，添加新的
    newScript += `

onMounted(() => {
  createProxyTransport();
  initMcpServer();
});`
  }

  // 替换原始脚本
  let modifiedContent = originalContent.replace(
    scriptSetupMatch[0],
    `<script setup lang="ts">\n${newScript}\n</script>`
  )

  // 在模板中添加 TinyRemoter 组件（检查模板部分是否已包含）
  if (!modifiedContent.includes('<TinyRemoter')) {
    // 查找 </template> 标签前添加 TinyRemoter
    modifiedContent = modifiedContent.replace(
      '</template>',
      `    <TinyRemoter :sessionId="SESSION_ID" class="remoter" />\n  </template>`
    )

    // 添加 TinyRemoter 的样式
    const remoterStyles = `
.remoter {
  position: fixed;
  right: 2rem;
  bottom: 2rem;
  width: 50px;
  height: 50px;
  z-index: 1000;
}

@media (max-width: 768px) {
  .remoter {
    right: 1rem;
    bottom: 1rem;
    width: 40px;
    height: 40px;
  }
}

:deep(.next-sdk-trigger-btn) {
  font-size: 30px;
}`

    // 添加样式到现有的 style 标签中，或创建新的 style 标签
    if (modifiedContent.includes('<style')) {
      modifiedContent = modifiedContent.replace(/<\/style>/, `${remoterStyles}\n</style>`)
    } else {
      modifiedContent += `\n\n<style scoped>${remoterStyles}\n</style>`
    }
  }

  return modifiedContent
}

/**
 * 验证 MCP 插件配置
 * @param {Object} config MCP 配置
 * @returns {Object} 验证结果
 */
function validateMcpConfig(config) {
  const errors = []
  const warnings = []

  // 验证必需的配置项
  if (config.enabled && typeof config.enabled !== 'boolean') {
    errors.push('enabled 必须是布尔值')
  }

  if (config.agentRoot && typeof config.agentRoot !== 'string') {
    errors.push('agentRoot 必须是字符串')
  }

  if (config.sessionId && typeof config.sessionId !== 'string') {
    errors.push('sessionId 必须是字符串')
  }

  // 验证 URL 格式
  if (config.agentRoot && config.agentRoot !== '') {
    try {
      new URL(config.agentRoot)
    } catch (e) {
      errors.push('agentRoot 必须是有效的 URL')
    }
  }

  // 验证工具配置
  if (config.tools && typeof config.tools !== 'object') {
    errors.push('tools 必须是对象')
  } else if (config.tools) {
    const validTools = ['navigation', 'application']
    Object.keys(config.tools).forEach((tool) => {
      if (!validTools.includes(tool)) {
        warnings.push(`未知的工具类型: ${tool}`)
      }
      if (typeof config.tools[tool] !== 'boolean') {
        errors.push(`工具 ${tool} 的值必须是布尔值`)
      }
    })
  }

  // 验证自定义工具
  if (config.customTools && !Array.isArray(config.customTools)) {
    errors.push('customTools 必须是数组')
  } else if (config.customTools) {
    config.customTools.forEach((tool, index) => {
      if (!tool.name || typeof tool.name !== 'string') {
        errors.push(`自定义工具 ${index} 必须有有效的 name 属性`)
      }
      if (!tool.implementation || typeof tool.implementation !== 'string') {
        errors.push(`自定义工具 ${index} 必须有有效的 implementation 属性`)
      }
    })
  }

  // 验证能力配置
  if (config.capabilities && typeof config.capabilities !== 'object') {
    errors.push('capabilities 必须是对象')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

function genMcpPlugin(options = {}) {
  // 验证配置
  const validation = validateMcpConfig(options)
  if (!validation.isValid) {
    throw new Error(`MCP 插件配置无效: ${validation.errors.join(', ')}`)
  }

  // 输出警告
  if (validation.warnings.length > 0) {
    validation.warnings.forEach((warning) => {
      // eslint-disable-next-line no-console
      console.warn('MCP 插件配置警告:', warning)
    })
  }

  const realOptions = mergeOptions(defaultOption, options)

  return {
    name: 'tinyEngine-generateCode-plugin-mcp',
    description: 'generate MCP (Model Context Protocol) integration files',
    /**
     * 生成 MCP 集成文件
     * @param {import('@opentiny/tiny-engine-dsl-vue').IAppSchema} schema
     * @returns
     */
    run(schema) {
      if (!realOptions.enabled) {
        return []
      }

      try {
        const files = []
        const { tools } = realOptions

        // 确定启用的工具类别
        const enabledTools = Object.keys(tools).filter((tool) => tools[tool])

        // 生成基础配置文件
        files.push({
          fileType: 'ts',
          fileName: 'base.ts',
          path: './src',
          fileContent: generateBaseConfig(realOptions)
        })

        // 生成 MCP 服务器文件
        files.push({
          fileType: 'ts',
          fileName: 'server.ts',
          path: './src/mcp',
          fileContent: generateMcpServer(enabledTools)
        })

        // 生成工具文件
        if (tools.navigation) {
          try {
            files.push({
              fileType: 'ts',
              fileName: 'navigationTools.ts',
              path: './src/mcp/tools',
              fileContent: generateNavigationTools(schema.pageSchema || [])
            })
          } catch (error) {
            if (this.addLog) {
              this.addLog({
                type: 'warning',
                message: `导航工具生成失败: ${error.message}`,
                plugin: 'genMcpPlugin'
              })
            }
          }
        }

        if (tools.application) {
          try {
            files.push({
              fileType: 'ts',
              fileName: 'applicationTools.ts',
              path: './src/mcp/tools',
              fileContent: generateApplicationTools(schema)
            })
          } catch (error) {
            if (this.addLog) {
              this.addLog({
                type: 'warning',
                message: `应用程序工具生成失败: ${error.message}`,
                plugin: 'genMcpPlugin'
              })
            }
          }
        }

        // 修改 App.vue 文件
        const existingAppVue = this.getFile('./src', 'App.vue')
        if (existingAppVue) {
          const modifiedAppVue = modifyAppVue(existingAppVue.fileContent, realOptions)
          this.replaceFile({
            fileType: 'vue',
            fileName: 'App.vue',
            path: './src',
            fileContent: modifiedAppVue
          })
        }

        // 修改 main.ts 文件以包含 MCP 样式
        const existingMainTs = this.getFile('./src', 'main.ts') || this.getFile('./src', 'main.js')
        if (existingMainTs && existingMainTs.fileName) {
          const modifiedMainTs = modifyMainTs(existingMainTs.fileContent)
          this.replaceFile({
            fileType: existingMainTs.fileName.endsWith('.ts') ? 'ts' : 'js',
            fileName: existingMainTs.fileName,
            path: './src',
            fileContent: modifiedMainTs
          })
        }

        return files
      } catch (error) {
        // 记录错误但不中断整个生成过程
        // eslint-disable-next-line no-console
        console.error('MCP 插件生成失败:', error)

        // 添加错误日志到上下文
        if (this.addLog) {
          this.addLog({
            type: 'error',
            message: `MCP 插件生成失败: ${error.message}`,
            plugin: 'genMcpPlugin',
            stack: error.stack
          })
        }

        // 优雅降级：返回空数组，让其他插件继续工作
        return []
      }
    }
  }
}

export default genMcpPlugin
