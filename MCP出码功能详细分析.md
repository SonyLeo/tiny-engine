# 自定义 MCP 出码功能详细分析

## 目录
1. [MCP 出码流程概览](#1-mcp-出码流程概览)
2. [核心文件结构](#2-核心文件结构)
3. [详细出码流程](#3-详细出码流程)
4. [默认出码流程 vs MCP 出码流程对比](#4-默认出码流程-vs-mcp-出码流程对比)
5. [核心设计与技术难点](#5-核心设计与技术难点)

---

## 1. MCP 出码流程概览

### 1.1 什么是 MCP
MCP (Model Context Protocol) 是一个模型上下文协议，用于在低代码平台生成的应用中集成 AI 能力。通过 MCP，生成的应用可以：
- 与 AI Agent 进行实时通信
- 暴露应用内部状态和操作给 AI
- 让 AI 能够理解和控制应用行为

### 1.2 整体流程图（v2.0 模板驱动架构）
```
用户配置 MCP
    ↓
Schema 解析 (parseSchemaPlugin)
    ↓
插件系统初始化 (generateApp)
    ├─→ 加载 MCP 插件配置
    └─→ 传递 context.pluginConfig.mcp
    ↓
MCP 插件执行 (genMcpPlugin) ⭐ 模板驱动
    ├─→ 配置验证 (validateMcpConfig)
    ├─→ 生成基础配置文件 (base.ts)
    │   └─→ 使用 mcpBaseTemplate
    ├─→ 生成 MCP 服务器管理器 (server.ts)
    │   └─→ 使用 mcpServerTemplate（动态导入工具）
    ├─→ 配置驱动的工具生成 ⭐ 核心改进
    │   ├─→ 遍历 toolGenerators 注册表
    │   ├─→ navigation: mcpNavigationToolsTemplate
    │   ├─→ application: generateApplicationTools
    │   └─→ 错误隔离（单个工具失败不影响其他）
    ├─→ 处理 tiny_mcp_config（递归转换）
    │   └─→ transformTinyMcpConfig
    └─→ 修改应用入口文件（使用模板片段）
        ├─→ App.vue: 5 个模板片段组合
        │   ├─→ mcp-imports.ts
        │   ├─→ mcp-setup.ts
        │   ├─→ mcp-onMounted.ts
        │   ├─→ mcp-template.ts
        │   └─→ mcp-style.ts
        └─→ main.ts: 添加样式导入
    ↓
页面/区块生成 (genPagePlugin/genBlockPlugin)
    ├─→ 接收 context.pluginConfig.mcp.enabled
    ├─→ 传递 mcpEnabled 到 SFC 生成器
    └─→ 钩子链处理 tiny_mcp_config
        └─→ handleTinyMcpConfigAttrHook ⭐
            ├─→ 格式转换（简单 → JSExpression）
            ├─→ 添加 usePageMcpServer 导入
            └─→ 添加生命周期钩子（onMounted/onUnmounted）
    ↓
依赖管理 (genDependenciesPlugin)
    ├─→ 接收 context.pluginConfig.mcp
    └─→ 条件性添加 MCP 依赖（仅当 enabled === true）
        ├─→ @opentiny/next-remoter: 0.0.2
        ├─→ @opentiny/next-sdk: ^0.1.0
        ├─→ @opentiny/tiny-robot: ^0.3.0-alpha.16
        └─→ @opentiny/tiny-vue-mcp: ~0.0.3
    ↓
代码格式化 (formatCodePlugin)
    ↓
生成最终代码
    ├─→ 日志输出（info/warning/error）
    └─→ 优雅降级（错误不中断整体流程）
```

### 1.3 核心概念
- **MCP Server**: 应用侧的服务器，暴露工具和资源给 AI
- **MCP Client**: AI 侧的客户端，调用应用提供的工具
- **Transport**: 通信层，使用 MessageChannel 实现双向通信
- **Tools**: 可被 AI 调用的函数，如导航、状态管理等
- **Page Server**: 页面级别的 MCP 服务器，支持细粒度控制


---

## 2. 核心文件结构

### 2.1 插件系统架构
```
packages/vue-generator/src/
├── generator/
│   ├── codeGenerator.js          # 核心代码生成器，管理插件生命周期
│   ├── generateApp.js            # 应用级代码生成入口，配置所有插件
│   └── vue/sfc/
│       └── genSetupSFC.js        # Vue SFC 文件生成，处理 MCP 钩子
├── plugins/
│   ├── genMcpPlugin.js           # ⭐ MCP 插件核心（采用模板驱动架构）
│   ├── genPagePlugin.js          # 页面生成插件，传递 MCP 配置
│   ├── genBlockPlugin.js         # 区块生成插件，传递 MCP 配置
│   ├── genDependenciesPlugin.js  # 依赖管理，添加 MCP 依赖
│   ├── MCP_TOOL_EXTENSION_GUIDE.md  # ⭐ 工具扩展指南文档
│   └── index.js                  # 插件导出
├── templates/vue-template/templateFiles/src/mcp/  # ⭐ MCP 模板文件
│   ├── base.ts                   # 基础配置模板
│   ├── server.ts                 # 服务器管理器模板
│   ├── App.vue.mcp-imports.ts    # App.vue imports 模板
│   ├── App.vue.mcp-setup.ts      # App.vue setup 模板
│   ├── App.vue.mcp-onMounted.ts  # App.vue onMounted 模板
│   ├── App.vue.mcp-template.ts   # App.vue template 模板
│   ├── App.vue.mcp-style.ts      # App.vue style 模板
│   └── tools/
│       └── navigationTools.ts    # 导航工具模板
└── utils/
    └── mergeOptions.js           # 配置合并工具
```

### 2.2 生成的文件结构
```
生成的应用/
├── src/
│   ├── base.ts                   # MCP 基础配置（agentRoot, sessionId）
│   ├── mcp/
│   │   ├── server.ts             # MCP 服务器管理器
│   │   └── tools/
│   │       ├── navigationTools.ts    # 导航工具（页面跳转、前进后退）
│   │       └── applicationTools.ts   # 应用工具（状态管理）
│   ├── App.vue                   # 修改后的应用入口（集成 MCP 客户端）
│   ├── main.ts                   # 修改后的主文件（引入 MCP 样式）
│   └── views/                    # 页面文件（可能包含 tiny_mcp_config）
└── package.json                  # 添加 MCP 相关依赖
```

### 2.3 关键依赖包
```json
{
  "@opentiny/next-remoter": "0.0.2",           // MCP UI 组件（聊天界面）
  "@opentiny/next-sdk": "^0.1.0",              // MCP SDK（客户端/服务器）
  "@opentiny/tiny-robot": "^0.3.0-alpha.16",   // AI 机器人组件
  "@opentiny/tiny-vue-mcp": "~0.0.3",          // TinyVue MCP 集成
  "@opentiny/vue-common": "与 @opentiny/vue 版本一致"  // Vue 通用工具
}
```

**依赖添加逻辑**（genDependenciesPlugin.js）：
- 只有在 `mcpConfig.enabled === true` 时才添加 MCP 相关依赖
- 通过 context 传递 MCP 配置到依赖插件
- 自动处理 TinyVue 相关依赖的版本一致性


---

## 3. 详细出码流程

### 3.1 配置阶段

#### 3.1.1 默认配置（genMcpPlugin.js）
```javascript
const defaultOption = {
  enabled: false,  // 默认禁用，需显式启用
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
    navigation: true,    // 导航工具
    application: true    // 应用工具
  },
  customTools: []
}
```

#### 3.1.2 配置验证
插件会验证配置的有效性：
- `enabled` 必须是布尔值
- `agentRoot` 必须是有效的 URL
- `tools` 中的工具类型必须是已知类型
- `customTools` 必须是数组且每个工具有 name 和 implementation

### 3.2 插件执行阶段

#### 3.2.1 插件生命周期（generateApp.js）
```javascript
// 三个阶段的钩子
const codeGenInstance = new CodeGenerator({
  plugins: {
    transformStart: [parseSchemaPlugin, ...],  // 预处理
    transform: [
      genTemplatePlugin,
      genMcpPlugin,      // ⭐ MCP 插件
      genPagePlugin,
      genBlockPlugin,
      genDataSourcePlugin,
      genDependenciesPlugin,
      genGlobalState,
      genI18nPlugin,
      genRouterPlugin,
      genUtilsPlugin,
      ...
    ],
    transformEnd: [formatCodePlugin, ...]  // 后处理
  },
  context: {
    pluginConfig: config?.pluginConfig || {}  // 包含 mcp 配置
  }
})
```

#### 3.2.2 MCP 插件执行流程（采用模板驱动）
```javascript
run(schema) {
  // 1. 检查是否启用
  if (!realOptions.enabled) return []
  
  try {
    const files = []
    const { tools } = realOptions
    
    // 2. 确定启用的工具类别
    const enabledTools = Object.keys(tools).filter(tool => tools[tool])
    
    // 3. 生成基础配置文件（使用模板）
    files.push({
      fileType: 'ts',
      fileName: 'base.ts',
      path: './src',
      fileContent: mcpBaseTemplate(null, {
        agentRoot: realOptions.agentRoot,
        sessionId: realOptions.sessionId
      })
    })
    
    // 4. 生成 MCP 服务器管理器（使用模板）
    files.push({
      fileType: 'ts',
      fileName: 'server.ts',
      path: './src/mcp',
      fileContent: mcpServerTemplate(null, { enabledTools })
    })
    
    // 5. 配置驱动的工具生成（⭐ 核心改进）
    Object.entries(tools).forEach(([toolName, enabled]) => {
      if (enabled && toolGenerators[toolName]) {
        const generator = toolGenerators[toolName]
        const toolFileName = `${toolName}Tools.ts`
        
        files.push({
          fileType: 'ts',
          fileName: toolFileName,
          path: './src/mcp/tools',
          fileContent: generator(
            toolName === 'navigation' ? schema.pageSchema || [] : schema
          )
        })
      }
    })
    
    // 6. 处理 tiny_mcp_config（递归转换）
    if (schema.pageSchema && Array.isArray(schema.pageSchema)) {
      schema.pageSchema.forEach(page => {
        if (pageHasTinyMcpConfig(page)) {
          transformTinyMcpConfig(page)
        }
      })
    }
    
    // 7. 修改应用入口文件（使用模板片段）
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
    
    // 8. 修改 main.ts 添加样式导入
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
    // 优雅降级：记录错误但不中断整个生成过程
    console.error('MCP 插件生成失败:', error)
    if (this.addLog) {
      this.addLog({
        type: 'error',
        message: `MCP 插件生成失败: ${error.message}`,
        plugin: 'genMcpPlugin',
        stack: error.stack
      })
    }
    return []
  }
}
```

**核心改进点**：
1. **模板驱动架构**：所有代码生成都使用独立的模板函数
2. **配置驱动的工具注册**：通过 `toolGenerators` 对象统一管理工具生成器
3. **错误处理增强**：每个工具生成失败不影响其他工具
4. **日志系统**：完整的日志记录和警告提示


### 3.3 代码生成细节

#### 3.3.1 导航工具生成（使用模板）

**生成函数**（genMcpPlugin.js）：
```javascript
function generateNavigationTools(pageSchema) {
  const routes = extractRoutes(pageSchema)
  return mcpNavigationToolsTemplate(null, { routes })
}

function extractRoutes(pageSchema) {
  const routes = pageSchema
    .filter(page => page.meta && (page.meta.route || page.meta.router))
    .map(page => {
      const routeField = page.meta.route || page.meta.router
      const routePath = routeField.startsWith('/') ? routeField.slice(1) : routeField
      return routePath || 'home'
    })
  
  // 如果没有路由，添加默认的 home 路由
  if (routes.length === 0) {
    routes.push('home')
  }
  
  return routes
}
```

**模板文件**（navigationTools.ts）：
```javascript
export default (schema, options) => {
  const { routes } = options
  const routeEnum = routes.map(route => `"${route}"`).join(', ')
  
  return `import { z } from "@opentiny/next-sdk"
import type { WebMcpServer } from "@opentiny/next-sdk"
import type { Router } from 'vue-router'

export function registerNavigationTools(server: WebMcpServer, router: Router) {
  // 1. navigate-to-page: 导航到指定页面
  server.registerTool("navigate-to-page", {
    title: "页面导航",
    description: "导航到指定页面",
    inputSchema: {
      path: z.enum([${routeEnum}]).describe("目标页面路径")
    }
  }, async ({ path }) => {
    try {
      await router.push(\`/\${path}\`)
      return { content: [{ type: "text", text: \`已导航到 \${path} 页面\` }] }
    } catch (error) {
      return { content: [{ type: "text", text: \`导航失败：\${error}\` }] }
    }
  })
  
  // 2. go-back: 返回上一页
  // 3. go-forward: 前进到下一页
  // 4. get-current-route: 获取当前路由
}`
}
```

**生成的工具**：
- `navigate-to-page`: 导航到指定页面（路由枚举从 schema 提取）
- `go-back`: 返回上一页
- `go-forward`: 前进到下一页
- `get-current-route`: 获取当前路由信息

#### 3.3.2 应用工具生成（generateApplicationTools）
```typescript
// 从全局状态生成工具
globalStates.forEach(state => {
  // 1. 导入对应的 store
  import { use${StoreName}Store } from '../../stores/${state.id}'
  
  // 2. 注册获取状态工具
  server.registerTool(`get-${state.id}-state`, ...)
  
  // 3. 为每个状态属性生成更新工具
  stateKeys.forEach(key => {
    server.registerTool(`update-${state.id}-${key}`, ...)
  })
})
```

#### 3.3.3 MCP 服务器管理器（使用模板）

**生成函数**（genMcpPlugin.js）：
```javascript
function generateMcpServer(enabledTools) {
  return mcpServerTemplate(null, { enabledTools })
}
```

**模板文件**（server.ts）：
```typescript
export default (schema, options) => {
  const { enabledTools } = options
  
  // 动态构建工具导入和注册
  let toolImports = ''
  let registrations = ''
  
  if (enabledTools.includes('navigation')) {
    toolImports += `\nimport { registerNavigationTools } from './tools/navigationTools'`
    registrations += `\n      registerNavigationTools(server, this.router!);`
  }
  
  if (enabledTools.includes('application')) {
    toolImports += `\nimport { registerApplicationTools } from './tools/applicationTools'`
    registrations += `\n      registerApplicationTools(server);`
  }
  
  return `import type { Router } from 'vue-router'
import { WebMcpServer } from "@opentiny/next-sdk"
import { registerMcpConfig } from '@opentiny/vue-common'
import { createMcpTools, getTinyVueMcpConfig } from '@opentiny/tiny-vue-mcp'${toolImports}

export class McpServerManager {
  private servers = new Map<string, WebMcpServer>()
  private mainServer: WebMcpServer | null = null
  private router: Router | null = null
  private capabilities: any = null
  
  // 注册服务器工具（根据模式）
  registerServerToolsByMode(mode: 'page' | 'main', server: WebMcpServer) {
    const commonRegistrations = () => {${registrations}
    };
    
    if (mode === 'main') {
      // 主服务器注册 TinyVue MCP 配置
      registerMcpConfig(getTinyVueMcpConfig(), createMcpTools);
    }
    
    commonRegistrations();
  }
  
  // 初始化管理器
  init(router: Router, config: any) {
    this.router = router
    this.capabilities = config.capabilities
    
    // 创建主服务器
    this.mainServer = new WebMcpServer(
      { name: "business-app", version: "1.0.0" },
      { capabilities: this.capabilities }
    )
    
    // 注册主服务器工具
    this.registerServerToolsByMode('main', this.mainServer)
  }
  
  // 获取或创建页面服务器（懒加载）
  getPageServer(pageId: string, config?: PageServerConfig): WebMcpServer {
    if (this.servers.has(pageId)) {
      return this.servers.get(pageId)!
    }
    
    const serverConfig = config || {
      name: pageId,
      business: { id: pageId, description: \`\${pageId} 页面\` }
    }
    
    const server = new WebMcpServer(
      { name: serverConfig.name, version: "1.0.0" },
      { capabilities: this.capabilities }
    )
    
    this.registerServerToolsByMode('page', server)
    this.servers.set(pageId, server)
    console.log(\`页面服务器 \${pageId} 创建完成\`)
    
    return server
  }
  
  // 连接所有服务器
  async connectAll(transport: any) {
    const results = []
    
    // 连接主服务器
    if (this.mainServer) {
      try {
        await this.mainServer.connect(transport)
        this.mainServer.transport = transport
        results.push({ name: 'main', success: true })
      } catch (error) {
        console.error('主服务器连接失败:', error)
        results.push({ name: 'main', success: false })
      }
    }
    
    // 连接所有页面服务器
    for (const [pageId, server] of this.servers.entries()) {
      try {
        await server.connect(transport)
        server.transport = transport
        results.push({ name: pageId, success: true })
      } catch (error) {
        console.error(\`页面服务器 \${pageId} 连接失败:\`, error)
        results.push({ name: pageId, success: false })
      }
    }
    
    console.log(\`服务器连接完成: \${results.filter(r => r.success).length}/\${results.length} 成功\`)
    return results
  }
  
  // 清理页面服务器
  removePageServer(pageId: string) {
    const server = this.servers.get(pageId)
    if (server) {
      server.transport = null
      this.servers.delete(pageId)
      console.log(\`页面服务器 \${pageId} 已清理\`)
    }
  }
  
  // 清理所有资源
  dispose() {
    this.servers.forEach(server => { server.transport = null })
    this.servers.clear()
    if (this.mainServer) {
      this.mainServer.transport = null
    }
    this.mainServer = null
    this.router = null
    this.capabilities = null
    console.log('所有服务器资源已清理')
  }
}

// 全局实例
export const mcpServerManager = new McpServerManager()

// 页面级服务器 composable
export function usePageMcpServer(pageId: string, config?: PageServerConfig) {
  const server = mcpServerManager.getPageServer(pageId, config)
  
  const connect = async (): Promise<boolean> => {
    if (server?.transport) {
      console.log(\`页面服务器 \${pageId} 已经连接\`)
      return true
    }
    
    const transport = mcpServerManager.getMainServer()?.transport
    if (!transport) {
      console.warn(\`无法连接页面服务器 \${pageId}: 主服务器未连接\`)
      return false
    }
    
    try {
      await server!.connect(transport)
      server!.transport = transport
      console.log(\`页面服务器 \${pageId} 已连接\`)
      return true
    } catch (error) {
      console.error(\`页面服务器 \${pageId} 连接失败:\`, error)
      return false
    }
  }
  
  const disconnect = () => {
    if (server?.transport) {
      server.transport = null
      console.log(\`页面服务器 \${pageId} 已断开连接\`)
    }
    mcpServerManager.removePageServer(pageId)
  }
  
  return { server, connect, disconnect }
}`
}
```

**关键特性**：
1. **分层架构**：主服务器 + 页面服务器
2. **懒加载**：页面服务器按需创建
3. **统一管理**：通过 `usePageMcpServer` composable 使用
4. **资源清理**：完整的生命周期管理
5. **TinyVue 集成**：主服务器自动注册 TinyVue MCP 工具


#### 3.3.4 App.vue 修改（使用模板片段）

**修改函数**（genMcpPlugin.js）：
```javascript
function modifyAppVue(originalContent, config) {
  // 幂等性检查：如果已包含 MCP 集成，直接返回
  if (originalContent.includes('TinyRemoter') || 
      originalContent.includes('mcpServerManager')) {
    return originalContent
  }
  
  // 获取模板片段
  const mcpImports = mcpImportsTemplate()
  const mcpSetup = mcpSetupTemplate(null, { capabilities: config.capabilities })
  const mcpTemplate = mcpTemplateTemplate()
  const mcpStyle = mcpStyleTemplate()
  const mcpOnMountedCode = mcpOnMountedTemplate()
  
  // 检测是否已有 script setup
  const scriptSetupMatch = originalContent.match(/<script setup[^>]*>([\s\S]*?)<\/script>/)
  
  if (!scriptSetupMatch) {
    // 创建新的 script setup
    return createNewScriptSetup(originalContent, mcpImports, mcpSetup, 
                                mcpTemplate, mcpStyle, mcpOnMountedCode)
  }
  
  // 修改现有的 script setup
  return modifyExistingScriptSetup(originalContent, scriptSetupMatch, 
                                   mcpImports, mcpSetup, mcpTemplate, 
                                   mcpStyle, mcpOnMountedCode)
}
```

**模板片段**：

1. **Imports 模板**（App.vue.mcp-imports.ts）：
```typescript
export default () => {
  return `import { TinyRemoter } from "@opentiny/next-remoter";
import { WebMcpClient, createMessageChannelPairTransport } from "@opentiny/next-sdk";
import type { Transport } from "@opentiny/next-sdk";
import { AGENT_ROOT, SESSION_ID } from "./base";
import { mcpServerManager } from "./mcp/server";`
}
```

2. **Setup 模板**（App.vue.mcp-setup.ts）：
```typescript
export default (schema, options) => {
  const { capabilities } = options
  
  return `
const [serverTransport, clientTransport] = createMessageChannelPairTransport();

const capabilities = ${JSON.stringify(capabilities, null, 2)};

const mcpServer = {
  transport: serverTransport,
  capabilities
};

provide("mcpServer", mcpServer);

serverTransport.onerror = (error) => {
  console.error(\`ServerTransport error:\`, error);
};

const createProxyTransport = async () => {
  const client = new WebMcpClient(
    { name: "mcp-web-client", version: "1.0.0" },
    { capabilities: { roots: { listChanged: true }, sampling: {}, elicitation: {} } }
  );
  window.client = client;
  await client.connect(clientTransport);
  await client.connect({
    url: AGENT_ROOT + "mcp",
    sessionId: SESSION_ID,
    agent: true,
    onError: (error) => { console.error("Connect proxy error:", error); }
  });
  window.addEventListener("pagehide", client.onPagehide);
};

const initMcpServer = async () => {
  try {
    mcpServerManager.init(router, mcpServer);
    await mcpServerManager.connectAll(mcpServer.transport);
    console.log('MCP 服务器管理器初始化成功');
  } catch (error) {
    console.error('MCP 服务器管理器初始化失败:', error);
  }
};`
}
```

3. **OnMounted 模板**（App.vue.mcp-onMounted.ts）：
```typescript
export default () => {
  return `  createProxyTransport();
  initMcpServer();`
}
```

4. **Template 模板**（App.vue.mcp-template.ts）：
```typescript
export default () => {
  return `  <TinyRemoter :sessionId="SESSION_ID" class="remoter" />`
}
```

5. **Style 模板**（App.vue.mcp-style.ts）：
```typescript
export default () => {
  return `.remoter {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 9999;
}`
}
```

**生成的 App.vue 结构**：
```vue
<script setup lang="ts">
// MCP imports
import { TinyRemoter } from "@opentiny/next-remoter"
import { WebMcpClient, createMessageChannelPairTransport } from "@opentiny/next-sdk"
// ... 其他导入

// 原有代码
const router = useRouter()

// MCP setup 代码
const [serverTransport, clientTransport] = createMessageChannelPairTransport()
const mcpServer = { transport: serverTransport, capabilities }
provide("mcpServer", mcpServer)

const createProxyTransport = async () => { /* ... */ }
const initMcpServer = async () => { /* ... */ }

onMounted(() => {
  // 原有的 onMounted 代码
  // MCP 初始化
  createProxyTransport()
  initMcpServer()
})
</script>

<template>
  <router-view />
  <TinyRemoter :sessionId="SESSION_ID" class="remoter" />
</template>

<style scoped>
.remoter {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 9999;
}
</style>
```

**智能合并策略**：
- 检测现有的 imports 并避免重复
- 智能合并 onMounted 钩子
- 保留用户的自定义代码
- 幂等性保证：多次生成结果一致

#### 3.3.5 tiny_mcp_config 转换（transformTinyMcpConfig）
```javascript
// 简单格式（用户在 schema 中配置）
{
  tiny_mcp_config: {
    id: "product-detail",
    description: "产品细节描述"
  }
}

// 转换为完整格式（代码生成时）
{
  tiny_mcp_config: {
    type: 'JSExpression',
    value: `{
      server,
      business: {
        id: 'product-detail',
        description: '产品细节描述'
      }
    }`
  }
}
```

### 3.4 属性处理钩子（handleTinyMcpConfigAttrHook）

在 SFC 生成过程中，通过钩子系统处理 `tiny_mcp_config` 属性：

```javascript
// genSetupSFC.js 中的钩子链
const defaultAttributeHook = [
  handleSlotParams,
  handleConditionAttrHook,
  handleLoopAttrHook,
  ...(mcpEnabled ? [handleTinyMcpConfigAttrHook] : []),  // 条件性添加
  handleExpressionAttrHook,
  // ...
]
```

**钩子实现**（genMcpPlugin.js）：
```javascript
export const handleTinyMcpConfigAttrHook = (schemaData, globalHooks, config) => {
  // 早期返回：如果 MCP 未启用，直接返回
  if (config?.mcpEnabled === false) {
    return
  }
  
  const { schema: { props = {} } = {} } = schemaData || {}
  
  // 检查是否有 tiny_mcp_config 属性
  if (props.tiny_mcp_config) {
    const mcpConfig = props.tiny_mcp_config
    
    // 检查是否是简单格式（只有 id 和 description）
    if (
      mcpConfig &&
      typeof mcpConfig === 'object' &&
      !mcpConfig.type &&  // 不是 JSExpression
      mcpConfig.id &&
      mcpConfig.description &&
      !mcpConfig.server &&
      !mcpConfig.business
    ) {
      // 转换为完整格式的 JSExpression
      props.tiny_mcp_config = {
        type: 'JSExpression',
        value: `{ server, business: { id: '${mcpConfig.id}', description: '${mcpConfig.description}' } }`
      }
      
      // 添加必要的导入
      if (globalHooks && globalHooks.addImport) {
        globalHooks.addImport('../mcp/server', {
          destructuring: true,
          componentName: 'usePageMcpServer',
          exportName: 'usePageMcpServer'
        })
      }
      
      // 添加页面级别的 MCP 服务器初始化代码
      if (globalHooks && globalHooks.addStatement) {
        const pageId = config?.pageId || config?.fileName || 'current-page'
        
        // 添加 Vue 生命周期钩子导入
        globalHooks.addImport('vue', {
          destructuring: true,
          componentName: 'onMounted',
          exportName: 'onMounted'
        })
        
        globalHooks.addImport('vue', {
          destructuring: true,
          componentName: 'onUnmounted',
          exportName: 'onUnmounted'
        })
        
        // 添加 MCP 服务器初始化代码
        globalHooks.addStatement({
          position: INSERT_POSITION.AFTER_METHODS,
          value: `
// 使用统一管理的页面服务器
const { server, connect, disconnect } = usePageMcpServer('${pageId}', {
  business: {
    id: '${pageId}',
    description: '${pageId}页面'
  }
})

// 连接服务器
onMounted(async () => {
  await connect()
})

// 组件卸载时清理资源
onUnmounted(() => {
  disconnect()
})`,
          key: 'mcpServerInit'
        })
      }
    }
  }
}
```

**钩子功能**：
1. **早期返回**：MCP 未启用时不处理
2. **格式检测**：识别简单格式的 `tiny_mcp_config`
3. **格式转换**：转换为 JSExpression 格式
4. **导入管理**：自动添加 `usePageMcpServer` 导入
5. **生命周期管理**：自动添加 onMounted 和 onUnmounted 钩子
6. **资源清理**：组件卸载时自动断开连接

**转换示例**：
```javascript
// 用户在 schema 中配置（简单格式）
{
  tiny_mcp_config: {
    id: "product-detail",
    description: "产品详情页面"
  }
}

// 转换后（完整格式）
{
  tiny_mcp_config: {
    type: 'JSExpression',
    value: `{
      server,
      business: {
        id: 'product-detail',
        description: '产品详情页面'
      }
    }`
  }
}

// 生成的页面代码
import { usePageMcpServer } from '../mcp/server'
import { onMounted, onUnmounted } from 'vue'

const { server, connect, disconnect } = usePageMcpServer('product-detail', {
  business: {
    id: 'product-detail',
    description: '产品详情页面'
  }
})

onMounted(async () => {
  await connect()
})

onUnmounted(() => {
  disconnect()
})
```


---

## 4. 默认出码流程 vs MCP 出码流程对比

### 4.1 架构对比

| 维度 | 默认出码流程 | MCP 出码流程 |
|------|-------------|-------------|
| **插件数量** | 11 个核心插件 | 12 个插件（新增 genMcpPlugin） |
| **生成文件数** | ~10-15 个 | ~15-20 个（新增 MCP 相关文件） |
| **依赖包数量** | 基础依赖 | 新增 4 个 MCP 相关包 |
| **应用入口修改** | 无 | 修改 App.vue 和 main.ts |
| **通信机制** | 无 | MessageChannel 双向通信 |
| **AI 集成** | 无 | 完整的 AI Agent 集成 |

### 4.2 代码生成流程对比

#### 默认流程
```
Schema 输入
  ↓
parseSchemaPlugin (解析)
  ↓
genTemplatePlugin (模板)
  ↓
genPagePlugin (页面)
  ↓
genBlockPlugin (区块)
  ↓
genRouterPlugin (路由)
  ↓
genDataSourcePlugin (数据源)
  ↓
genGlobalState (全局状态)
  ↓
genI18nPlugin (国际化)
  ↓
genUtilsPlugin (工具函数)
  ↓
genDependenciesPlugin (依赖)
  ↓
formatCodePlugin (格式化)
  ↓
输出代码
```

#### MCP 流程（新增部分）
```
Schema 输入
  ↓
parseSchemaPlugin (解析)
  ↓
genTemplatePlugin (模板)
  ↓
genMcpPlugin ⭐ (MCP 集成)
  ├─ 生成 base.ts
  ├─ 生成 server.ts
  ├─ 生成 navigationTools.ts
  ├─ 生成 applicationTools.ts
  ├─ 修改 App.vue
  ├─ 修改 main.ts
  └─ 转换 tiny_mcp_config
  ↓
genPagePlugin (页面，传递 mcpEnabled)
  └─ handleTinyMcpConfigAttrHook ⭐
  ↓
genBlockPlugin (区块，传递 mcpEnabled)
  └─ handleTinyMcpConfigAttrHook ⭐
  ↓
... (其他插件)
  ↓
genDependenciesPlugin (依赖)
  └─ 添加 MCP 依赖 ⭐
  ↓
formatCodePlugin (格式化)
  ↓
输出代码（包含 MCP 能力）
```

### 4.3 代码生成方式对比

| 方面 | 默认流程 | MCP 流程（v1.0） | MCP 流程（v2.0 当前） |
|------|---------|-----------------|---------------------|
| **代码生成方式** | 直接生成 | 字符串拼接 | 模板驱动 ⭐ |
| **工具注册** | N/A | 硬编码 if-else | 配置驱动注册表 ⭐ |
| **错误处理** | 基础 | 基础 | 完整（验证+隔离+降级）⭐ |
| **扩展性** | 固定 | 需修改核心代码 | 零侵入式扩展 ⭐ |
| **可维护性** | 高 | 中 | 高 ⭐ |
| **文档** | 完善 | 基础 | 完善（含扩展指南）⭐ |
| **日志系统** | 基础 | 基础 | 三级日志（info/warning/error）⭐ |
| **性能优化** | 标准 | 标准 | 懒加载+条件性依赖 ⭐ |

### 4.4 关键差异点

#### 4.4.1 配置传递机制
```javascript
// 默认流程：插件独立工作
genPagePlugin(config.pluginConfig?.page || {})

// MCP 流程：配置在插件间传递
genPagePlugin(config.pluginConfig?.page || {})
  ↓ context.pluginConfig.mcp
genSFCWithDefaultPlugin(page, schema.componentsMap, {
  ...sfcConfig,
  mcpEnabled: context?.pluginConfig?.mcp?.enabled || false
})
```

#### 4.4.2 钩子系统扩展
```javascript
// 默认流程：固定钩子链
const defaultAttributeHook = [
  handleConditionAttrHook,
  handleLoopAttrHook,
  handleExpressionAttrHook,
  // ...
]

// MCP 流程：动态钩子链
const defaultAttributeHook = [
  handleConditionAttrHook,
  handleLoopAttrHook,
  ...(mcpEnabled ? [handleTinyMcpConfigAttrHook] : []),  // 条件性添加
  handleExpressionAttrHook,
  // ...
]
```


#### 4.4.3 文件修改策略
```javascript
// 默认流程：只生成新文件
return files  // 返回新文件列表

// MCP 流程：修改现有文件
const existingAppVue = this.getFile('./src', 'App.vue')
if (existingAppVue) {
  const modifiedAppVue = modifyAppVue(existingAppVue.fileContent, realOptions)
  this.replaceFile({...})  // 替换现有文件
}
```

### 4.5 运行时对比

| 特性 | 默认应用 | MCP 应用 |
|------|---------|---------|
| **启动时间** | 快 | 稍慢（需初始化 MCP） |
| **内存占用** | 低 | 中等（维护 MCP 连接） |
| **网络通信** | 无额外通信 | WebSocket 连接到 Agent |
| **用户界面** | 标准界面 | 新增 AI 聊天界面 |
| **调试复杂度** | 低 | 中等（需调试 MCP 通信） |
| **扩展性** | 标准 | 高（可通过 AI 扩展功能） |

---

## 5. 核心设计与技术难点

### 5.1 架构设计亮点

#### 5.1.1 插件化架构
```javascript
// generateApp.js
const defaultPlugins = {
  template: genTemplatePlugin(config.pluginConfig?.template || {}),
  block: genBlockPlugin(config.pluginConfig?.block || {}),
  page: genPagePlugin(config.pluginConfig?.page || {}),
  // ... 其他插件
  mcp: genMcpPlugin(config.pluginConfig?.mcp || {})  // ⭐ MCP 插件
}

const codeGenInstance = new CodeGenerator({
  plugins: {
    transformStart: [parseSchemaPlugin, ...],
    transform: [...Object.values(mergeWithDefaultPlugin), ...],
    transformEnd: [formatCodePlugin, ...]
  },
  context: {
    pluginConfig: config?.pluginConfig || {}  // 配置传递
  }
})
```

#### 5.1.2 配置驱动的工具注册系统（⭐ 核心创新）

**工具生成器注册表**（genMcpPlugin.js）：
```javascript
/**
 * 工具生成器注册表（配置驱动）
 * 新增工具只需在此添加对应的生成函数
 */
const toolGenerators = {
  navigation: generateNavigationTools,
  application: generateApplicationTools
  // 添加新工具只需在此注册，无需修改其他代码
}
```

**工具生成流程**：
```javascript
// 配置驱动的工具生成
Object.entries(tools).forEach(([toolName, enabled]) => {
  if (enabled && toolGenerators[toolName]) {
    try {
      const generator = toolGenerators[toolName]
      const toolFileName = `${toolName}Tools.ts`
      
      files.push({
        fileType: 'ts',
        fileName: toolFileName,
        path: './src/mcp/tools',
        fileContent: generator(
          toolName === 'navigation' ? schema.pageSchema || [] : schema
        )
      })
    } catch (error) {
      // 单个工具失败不影响其他工具
      this.addLog({
        type: 'warning',
        message: `${toolName} 工具生成失败: ${error.message}`
      })
    }
  } else if (enabled && !toolGenerators[toolName]) {
    // 工具已启用但未找到生成器
    this.addLog({
      type: 'warning',
      message: `未找到 ${toolName} 工具的生成器，请检查 toolGenerators 配置`
    })
  }
})
```

**扩展新工具的步骤**（参考 MCP_TOOL_EXTENSION_GUIDE.md）：
1. 编写工具生成函数：
```javascript
function generateNotificationTools(schema) {
  return `import { z } from "@opentiny/next-sdk"
import type { WebMcpServer } from "@opentiny/next-sdk"

export function registerNotificationTools(server: WebMcpServer) {
  server.registerTool("send-notification", {
    title: "发送通知",
    description: "向用户发送系统通知",
    inputSchema: {
      title: z.string().describe("通知标题"),
      message: z.string().describe("通知内容"),
      type: z.enum(['info', 'success', 'warning', 'error']).describe("通知类型")
    }
  }, async ({ title, message, type }) => {
    try {
      window.$notification[type]({ title, message })
      return { content: [{ type: "text", text: "通知已发送" }] }
    } catch (error) {
      return { content: [{ type: "text", text: \`发送失败：\${error}\` }] }
    }
  })
}`
}
```

2. 在 `toolGenerators` 中注册：
```javascript
const toolGenerators = {
  navigation: generateNavigationTools,
  application: generateApplicationTools,
  notification: generateNotificationTools  // ⭐ 新增这一行即可
}
```

3. 用户配置启用：
```javascript
const mcpConfig = {
  enabled: true,
  tools: {
    navigation: true,
    application: true,
    notification: true  // 启用新工具
  }
}
```

#### 5.1.3 模板驱动架构（⭐ 核心改进）

**模板文件组织**：
```
templates/vue-template/templateFiles/src/mcp/
├── base.ts                      # 基础配置模板
├── server.ts                    # 服务器管理器模板
├── App.vue.mcp-imports.ts       # App.vue imports 片段
├── App.vue.mcp-setup.ts         # App.vue setup 片段
├── App.vue.mcp-onMounted.ts     # App.vue onMounted 片段
├── App.vue.mcp-template.ts      # App.vue template 片段
├── App.vue.mcp-style.ts         # App.vue style 片段
└── tools/
    └── navigationTools.ts       # 导航工具模板
```

**模板函数签名**：
```javascript
export default (schema, options) => {
  // schema: 应用程序 schema（可选）
  // options: 模板参数（如 routes, enabledTools 等）
  return `生成的代码字符串`
}
```

**使用示例**：
```javascript
// 导入模板
import mcpBaseTemplate from '../templates/vue-template/templateFiles/src/mcp/base.ts'
import mcpServerTemplate from '../templates/vue-template/templateFiles/src/mcp/server.ts'

// 使用模板生成代码
const baseConfig = mcpBaseTemplate(null, {
  agentRoot: 'https://agent.opentiny.design/api/v1/webmcp-trial/',
  sessionId: '78b66563-95c0-4839-8007-e8af634dd658'
})

const serverCode = mcpServerTemplate(null, {
  enabledTools: ['navigation', 'application']
})
```
#### 5.1.4 分层服务器架构
```
应用级服务器 (Main Server)
    ├─ 全局工具（导航、应用状态）
    └─ 共享 Transport
        ↓
页面级服务器 (Page Servers)
    ├─ 页面特定工具
    ├─ 懒加载创建
    └─ 独立生命周期
```

#### 5.1.5 双向通信机制
```javascript
// MessageChannel 实现双向通信
const [serverTransport, clientTransport] = createMessageChannelPairTransport()

// Server 端
mcpServer.transport = serverTransport
await server.connect(serverTransport)

// Client 端
await client.connect(clientTransport)
await client.connect({ url: AGENT_ROOT + "mcp" })
```

### 5.2 技术难点与解决方案

#### 5.2.1 难点 1：Schema 到代码的转换

**挑战**：
- Schema 中的 `tiny_mcp_config` 是静态配置
- 生成的代码需要动态的 `server` 变量引用
- 需要在编译时注入运行时依赖

**解决方案**：
```javascript
// 1. 检测简单格式
if (mcpConfig.id && mcpConfig.description && !mcpConfig.server) {
  // 2. 转换为 JSExpression
  schema.props.tiny_mcp_config = {
    type: 'JSExpression',
    value: `{
      server,  // 运行时变量
      business: { id: '${mcpConfig.id}', description: '${mcpConfig.description}' }
    }`
  }
  
  // 3. 添加必要的导入
  globalHooks.addImport('../mcp/server', {
    destructuring: true,
    componentName: 'usePageMcpServer',
    exportName: 'usePageMcpServer'
  })
}
```

**关键技术**：
- JSExpression 类型：允许在 Schema 中嵌入 JavaScript 表达式
- 钩子系统：在代码生成过程中动态添加导入和语句
- 上下文传递：通过 globalHooks 在不同阶段共享状态

#### 5.2.2 难点 2：现有文件的修改

**挑战**：
- 需要修改已生成的 App.vue 和 main.ts
- 不能破坏用户的自定义代码
- 需要幂等性（多次生成结果一致）

**解决方案**：
```javascript
function modifyAppVue(originalContent, config) {
  // 1. 检查是否已包含 MCP 集成（幂等性）
  if (originalContent.includes('TinyRemoter') || 
      originalContent.includes('mcpServerManager')) {
    return originalContent
  }
  
  // 2. 解析现有的 script setup
  const scriptSetupMatch = originalContent.match(/<script setup[^>]*>([\s\S]*?)<\/script>/)
  
  // 3. 智能插入代码
  if (scriptSetupMatch) {
    // 在现有 script 中添加
    let newScript = existingScript
    newScript = `${mcpImports}\n${newScript}`
    newScript += mcpCode
    // 修改或添加 onMounted
    if (existingScript.includes('onMounted(')) {
      newScript = newScript.replace(/onMounted\(\(\) => \{([\s\S]*?)\}\)/, ...)
    } else {
      newScript += `\nonMounted(() => { ... })`
    }
  } else {
    // 创建新的 script setup
  }
  
  // 4. 在模板中添加组件
  modifiedContent = modifiedContent.replace('</template>', 
    `<TinyRemoter :sessionId="SESSION_ID" />\n</template>`)
  
  return modifiedContent
}
```

**关键技术**：
- 正则表达式解析：提取和修改代码片段
- 幂等性检查：避免重复添加
- 智能合并：保留用户代码，只添加必要部分

#### 5.2.3 难点 3：工具的动态生成

**挑战**：
- 不同应用有不同的页面和状态
- 需要根据 Schema 动态生成工具代码
- 工具参数需要类型安全（Zod schema）

**解决方案**：
```javascript
function generateNavigationTools(pageSchema) {
  // 1. 从 Schema 提取路由信息
  const routes = pageSchema
    .filter(page => page.meta && (page.meta.route || page.meta.router))
    .map(page => extractRoute(page))
  
  // 2. 生成枚举类型（类型安全）
  const routeEnum = routes.map(route => `"${route}"`).join(', ')
  
  // 3. 生成工具注册代码（字符串拼接）
  return `
    server.registerTool("navigate-to-page", {
      inputSchema: {
        path: z.enum([${routeEnum}]).describe("目标页面路径")
      }
    }, async ({ path }) => {
      await router.push(\`/\${path}\`)
      return { content: [{ type: "text", text: \`已导航到 \${path} 页面\` }] }
    })
  `
}
```

**关键技术**：
- 模板字符串：动态生成 TypeScript 代码
- Zod schema：运行时类型验证
- 元编程：代码生成代码


#### 5.2.4 难点 4：服务器生命周期管理

**挑战**：
- 主服务器和页面服务器的协调
- 页面切换时的服务器创建和销毁
- Transport 的共享和清理

**解决方案**：
```javascript
export class McpServerManager {
  // 1. 集中管理所有服务器
  private servers = new Map<string, WebMcpServer>()
  private mainServer: WebMcpServer | null = null
  
  // 2. 懒加载页面服务器
  getPageServer(pageId: string, config?: PageServerConfig) {
    if (this.servers.has(pageId)) {
      return this.servers.get(pageId)!  // 复用
    }
    const server = new WebMcpServer(...)
    this.servers.set(pageId, server)  // 缓存
    return server
  }
  
  // 3. 统一连接管理
  async connectAll(transport: any) {
    // 主服务器先连接
    await this.mainServer.connect(transport)
    // 页面服务器共享 transport
    for (const [pageId, server] of this.servers.entries()) {
      await server.connect(transport)
    }
  }
  
  // 4. 资源清理
  dispose() {
    this.servers.forEach(server => { server.transport = null })
    this.servers.clear()
    this.mainServer = null
  }
}
```

**关键技术**：
- 单例模式：全局唯一的管理器实例
- 缓存策略：避免重复创建服务器
- 生命周期钩子：在适当时机清理资源

#### 5.2.5 难点 5：配置的层级传递

**挑战**：
- MCP 配置需要从应用级传递到页面级
- 不同插件需要访问相同的配置
- 配置变更需要影响所有相关插件

**解决方案**：
```javascript
// 1. 应用级配置（generateApp.js）
const codeGenInstance = new CodeGenerator({
  plugins: { ... },
  context: {
    pluginConfig: config?.pluginConfig || {}  // 包含 mcp 配置
  }
})

// 2. 插件级访问（genPagePlugin.js）
run(schema, context) {
  const mcpEnabled = context?.pluginConfig?.mcp?.enabled || false
  // 传递给下一层
  genSFCWithDefaultPlugin(page, schema.componentsMap, {
    ...sfcConfig,
    mcpEnabled
  })
}

// 3. 钩子级使用（genSetupSFC.js）
const mcpEnabled = config.mcpEnabled !== false
const defaultAttributeHook = [
  ...(mcpEnabled ? [handleTinyMcpConfigAttrHook] : [])
]
```

**关键技术**：
- Context 模式：配置通过上下文传递
- 配置合并：mergeOptions 深度合并配置
- 默认值策略：合理的默认值保证向后兼容

### 5.3 性能优化设计

#### 5.3.1 懒加载策略
```javascript
// 页面服务器按需创建
getPageServer(pageId: string) {
  if (this.servers.has(pageId)) {
    return this.servers.get(pageId)!  // 已存在，直接返回
  }
  // 不存在才创建
  const server = new WebMcpServer(...)
  this.servers.set(pageId, server)
  return server
}
```

#### 5.3.2 代码分割
```javascript
// MCP 相关代码独立文件
./src/mcp/
  ├── server.ts              // 服务器管理器
  └── tools/
      ├── navigationTools.ts  // 导航工具
      └── applicationTools.ts // 应用工具

// 按需导入
import { mcpServerManager } from './mcp/server'
```

#### 5.3.3 条件性生成
```javascript
// 只有启用 MCP 时才生成相关文件
if (!realOptions.enabled) {
  return []  // 不生成任何文件
}
```


### 5.4 错误处理与容错设计

#### 5.4.1 配置验证
```javascript
function validateMcpConfig(config) {
  const errors = []
  const warnings = []
  
  // 必需字段验证
  if (config.enabled && typeof config.enabled !== 'boolean') {
    errors.push('enabled 必须是布尔值')
  }
  
  // URL 格式验证
  if (config.agentRoot) {
    try {
      new URL(config.agentRoot)
    } catch (e) {
      errors.push('agentRoot 必须是有效的 URL')
    }
  }
  
  return { isValid: errors.length === 0, errors, warnings }
}
```

#### 5.4.2 优雅降级
```javascript
run(schema) {
  try {
    // 生成 MCP 文件
    const files = []
    
    if (tools.navigation) {
      try {
        files.push(generateNavigationTools(schema.pageSchema))
      } catch (error) {
        // 单个工具失败不影响整体
        this.addLog({ type: 'warning', message: `导航工具生成失败: ${error.message}` })
      }
    }
    
    return files
  } catch (error) {
    // 记录错误但不中断整个生成过程
    console.error('MCP 插件生成失败:', error)
    this.addLog({ type: 'error', message: `MCP 插件生成失败: ${error.message}` })
    return []  // 返回空数组，让其他插件继续工作
  }
}
```

#### 5.4.3 运行时错误处理
```javascript
// Transport 错误处理
serverTransport.onerror = (error) => {
  console.error(`ServerTransport error:`, error)
}

// 工具执行错误处理
server.registerTool("navigate-to-page", ..., async ({ path }) => {
  try {
    await router.push(`/${path}`)
    return { content: [{ type: "text", text: `已导航到 ${path} 页面` }] }
  } catch (error) {
    return { content: [{ type: "text", text: `导航失败：${error}` }] }
  }
})
```

---

## 附录

### A. 关键代码片段索引

#### A.1 核心插件文件
- **MCP 插件核心**：`packages/vue-generator/src/plugins/genMcpPlugin.js`
  - 配置验证、工具生成器注册表、文件生成逻辑
  - `handleTinyMcpConfigAttrHook` 导出
- **应用生成入口**：`packages/vue-generator/src/generator/generateApp.js`
  - 插件配置和生命周期管理
- **代码生成器**：`packages/vue-generator/src/generator/codeGenerator.js`
  - 插件执行引擎
- **SFC 生成**：`packages/vue-generator/src/generator/vue/sfc/genSetupSFC.js`
  - 钩子链配置，集成 `handleTinyMcpConfigAttrHook`
- **依赖管理**：`packages/vue-generator/src/plugins/genDependenciesPlugin.js`
  - MCP 依赖条件性添加

#### A.2 模板文件
- **基础配置模板**：`packages/vue-generator/src/templates/vue-template/templateFiles/src/mcp/base.ts`
- **服务器管理器模板**：`packages/vue-generator/src/templates/vue-template/templateFiles/src/mcp/server.ts`
- **导航工具模板**：`packages/vue-generator/src/templates/vue-template/templateFiles/src/mcp/tools/navigationTools.ts`
- **App.vue 模板片段**：
  - `App.vue.mcp-imports.ts`
  - `App.vue.mcp-setup.ts`
  - `App.vue.mcp-onMounted.ts`
  - `App.vue.mcp-template.ts`
  - `App.vue.mcp-style.ts`

#### A.3 文档
- **工具扩展指南**：`packages/vue-generator/src/plugins/MCP_TOOL_EXTENSION_GUIDE.md`
  - 如何添加新的 MCP 工具
  - 完整示例和最佳实践

### B. 配置示例

#### B.1 完整 MCP 配置
```javascript
const mcpConfig = {
  enabled: true,  // 启用 MCP
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
    navigation: true,    // 启用导航工具
    application: true    // 启用应用工具
  },
  customTools: []  // 自定义工具（未来扩展）
}
```

#### B.2 在 generateApp 中使用
```javascript
import { generateApp } from '@opentiny/tiny-engine-dsl-vue'

const codeGenInstance = generateApp({
  pluginConfig: {
    mcp: {
      enabled: true,
      tools: {
        navigation: true,
        application: true
      }
    },
    // 其他插件配置...
  }
})

const result = await codeGenInstance.generate(schema)
```

#### B.3 页面级 MCP 配置（Schema）
```javascript
{
  componentName: "TinyButton",
  props: {
    tiny_mcp_config: {
      id: "product-detail",
      description: "产品详情页面，展示产品信息和操作"
    }
  }
}
```

### C. 生成文件清单

#### C.1 MCP 启用时生成的文件
```
生成的应用/
├── src/
│   ├── base.ts                          # MCP 基础配置
│   ├── mcp/
│   │   ├── server.ts                    # MCP 服务器管理器
│   │   └── tools/
│   │       ├── navigationTools.ts       # 导航工具
│   │       └── applicationTools.ts      # 应用工具
│   ├── App.vue                          # 修改后（集成 MCP 客户端）
│   ├── main.ts                          # 修改后（添加样式导入）
│   └── views/
│       └── ProductDetail.vue            # 可能包含页面级 MCP 配置
└── package.json                         # 添加 MCP 依赖
```

### D. 常见问题

#### D.1 MCP 未生效
**检查清单**：
1. 确认 `mcpConfig.enabled === true`
2. 检查 `package.json` 是否包含 MCP 依赖
3. 查看生成日志是否有错误信息
4. 确认 `App.vue` 是否包含 `TinyRemoter` 组件

#### D.2 工具未注册
**可能原因**：
1. 工具未在 `toolGenerators` 中注册
2. 工具配置为 `false`
3. 工具生成函数抛出异常

**解决方案**：
- 检查 `toolGenerators` 对象
- 查看生成日志中的警告信息
- 确认工具配置正确

#### D.3 页面级 MCP 配置未生效
**检查清单**：
1. 确认 `mcpEnabled` 传递到 SFC 生成器
2. 检查 `tiny_mcp_config` 格式是否正确
3. 确认 `handleTinyMcpConfigAttrHook` 在钩子链中
4. 查看生成的页面代码是否包含 `usePageMcpServer`

## 快速参考

### 添加新工具（2 步）

**步骤 1**: 编写生成函数
```javascript
function generateMyTool(schema) {
  return `import { z } from "@opentiny/next-sdk"
import type { WebMcpServer } from "@opentiny/next-sdk"

export function registerMyTool(server: WebMcpServer) {
  server.registerTool("my-tool", {
    title: "我的工具",
    description: "工具描述",
    inputSchema: { param: z.string().describe("参数描述") }
  }, async ({ param }) => {
    // 工具逻辑
    return { content: [{ type: "text", text: "成功" }] }
  })
}`
}
```

**步骤 2**: 注册到 toolGenerators
```javascript
const toolGenerators = {
  navigation: generateNavigationTools,
  application: generateApplicationTools,
  myTool: generateMyTool  // ⭐ 添加这一行
}
```

### 启用 MCP

```javascript
const config = {
  pluginConfig: {
    mcp: {
      enabled: true,
      tools: {
        navigation: true,
        application: true,
        myTool: true  // 启用新工具
      }
    }
  }
}
```

### 页面级 MCP 配置

```javascript
// Schema 中配置
{
  componentName: "TinyButton",
  props: {
    tiny_mcp_config: {
      id: "my-page",
      description: "页面描述"
    }
  }
}

// 自动生成
const { server, connect, disconnect } = usePageMcpServer('my-page', {
  business: { id: 'my-page', description: '页面描述' }
})

onMounted(async () => { await connect() })
onUnmounted(() => { disconnect() })
```