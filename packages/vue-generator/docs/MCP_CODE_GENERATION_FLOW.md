# MCP 出码全流程文档

## 概述

MCP (Model Context Protocol) 出码是 TinyEngine 的一个扩展功能，用于生成支持 MCP 协议的 Vue 应用程序。本文档详细描述了 MCP 出码的完整流程、相关文件和函数调用。

## 1. MCP 出码流程概览

```
用户配置 → 插件初始化 → 代码生成 → 文件输出
    ↓           ↓           ↓         ↓
  配置验证   → 工具选择   → 文件生成  → 应用集成
```

## 2. 核心文件结构

```
packages/vue-generator/
├── src/
│   ├── plugins/
│   │   └── genMcpPlugin.js          # MCP 插件主文件
│   ├── generator/
│   │   ├── generateApp.js           # 应用生成器
│   │   └── codeGenerator.js         # 代码生成器核心
│   └── utils/
│       └── mergeOptions.js          # 配置合并工具
└── test/
    └── testcases/
        └── mcp/                     # MCP 测试用例
```

## 3. MCP 出码详细流程

### 3.1 插件初始化阶段

#### 函数调用链：
```javascript
generateApp(options) 
  → new CodeGenerator(plugins)
  → genMcpPlugin(config)
  → validateMcpConfig(config)
  → mergeOptions(defaultOption, options)
```

#### 相关文件：
- `src/generator/generateApp.js` - 应用生成入口
- `src/plugins/genMcpPlugin.js` - MCP 插件实现
- `src/utils/mergeOptions.js` - 配置合并

#### 配置结构：
```javascript
const mcpConfig = {
  enabled: true,                    // 是否启用 MCP
  agentRoot: 'https://...',        // MCP 代理服务器地址
  sessionId: 'uuid',               // 会话 ID
  capabilities: {                  // MCP 能力配置
    prompts: { listChanged: true },
    resources: { subscribe: true, listChanged: true },
    tools: { listChanged: true },
    completions: {},
    logging: {}
  },
  tools: {                         // 工具配置
    navigation: true,              // 导航工具
    application: true              // 应用程序工具
  },
  customTools: []                  // 自定义工具
}
```

### 3.2 代码生成阶段

#### 函数调用链：
```javascript
codeGenerator.generate(schema)
  → plugin.run(schema)
  → generateBaseConfig(config)
  → generateMcpServer(enabledTools)
  → generateNavigationTools(pageSchema)
  → generateApplicationTools(schema)
  → modifyAppVue(content, config)
  → modifyMainTs(content)
```

#### 生成的文件：

1. **基础配置文件** (`src/base.ts`)
   ```typescript
   export const AGENT_ROOT = 'https://agent.opentiny.design/api/v1/mcp-proxy-trial/'
   export const SESSION_ID = '78b66563-95c0-4839-8007-e8af634dd658'
   ```

2. **MCP 服务器文件** (`src/mcp/server.ts`)
   ```typescript
   import { WebMcpServer } from "@opentiny/next-sdk"
   import type { Router } from 'vue-router'
   import { registerNavigationTools } from './tools/navigationTools'
   import { registerApplicationTools } from './tools/applicationTools'

   export function createMcpServer(router: Router, mcpServerConfig: any) {
     const server = new WebMcpServer(
       { name: "business-app", version: "1.0.0" },
       { capabilities: mcpServerConfig.capabilities }
     )

     registerNavigationTools(server, router)
     registerApplicationTools(server)

     return server
   }
   ```

3. **导航工具文件** (`src/mcp/tools/navigationTools.ts`)
   - 生成页面导航工具
   - 支持 navigate-to-page、go-back、go-forward、get-current-route

4. **应用程序工具文件** (`src/mcp/tools/applicationTools.ts`)
   - 基于全局状态生成状态管理工具
   - 支持状态查询和更新操作

### 3.3 应用集成阶段

#### App.vue 修改：
```javascript
modifyAppVue(originalContent, config)
  → 添加 MCP 相关导入
  → 注入 MCP 客户端和服务器初始化代码
  → 在模板中添加 TinyRemoter 组件
  → 添加相关样式
```

#### main.ts 修改：
```javascript
modifyMainTs(originalContent)
  → 添加 MCP 样式导入：import '@opentiny/tiny-robot/dist/style.css'
```

## 4. 默认出码流程对比

### 4.1 默认出码流程

```
用户配置 → 插件初始化 → 代码生成 → 文件输出
    ↓           ↓           ↓         ↓
  基础配置   → 标准插件   → Vue文件   → 标准应用
```

#### 默认插件列表：
```javascript
const defaultPlugins = {
  template: genTemplatePlugin(),      // 模板生成
  block: genBlockPlugin(),           // 区块生成
  page: genPagePlugin(),             // 页面生成
  dataSource: genDataSourcePlugin(), // 数据源生成
  dependencies: genDependenciesPlugin(), // 依赖生成
  globalState: genGlobalState(),     // 全局状态生成
  i18n: genI18nPlugin(),            // 国际化生成
  router: genRouterPlugin(),         // 路由生成
  utils: genUtilsPlugin(),          // 工具函数生成
  formatCode: formatCodePlugin(),    // 代码格式化
  parseSchema: parseSchemaPlugin()   // 模式解析
}
```

### 4.2 MCP 出码与默认出码的区别

| 方面 | 默认出码 | MCP 出码 |
|------|----------|----------|
| 插件数量 | 11个标准插件 | 11个标准插件 + 1个MCP插件 |
| 生成文件 | 标准Vue应用文件 | 标准文件 + MCP集成文件 |
| App.vue | 标准组件结构 | 添加TinyRemoter组件和MCP初始化 |
| main.ts | 标准入口文件 | 添加MCP样式导入 |
| 依赖包 | Vue生态依赖 | Vue依赖 + MCP相关依赖 |

## 5. 如何切换到默认出码逻辑

### 5.1 配置方式切换

#### 方法1：禁用 MCP 插件
```javascript
const options = {
  pluginConfig: {
    mcp: {
      enabled: false  // 禁用 MCP 功能
    }
  }
}

const codeGenerator = generateApp(options)
const result = codeGenerator.generate(schema)
```

#### 方法2：不提供 MCP 配置
```javascript
const options = {
  pluginConfig: {
    // 不包含 mcp 配置，将使用默认配置（enabled: true）
    template: {},
    page: {},
    // ... 其他插件配置
  }
}
```

#### 方法3：完全移除 MCP 插件
```javascript
const options = {
  customPlugins: {
    mcp: null  // 移除 MCP 插件
  }
}
```

### 5.2 代码层面切换

#### 修改 generateApp.js：
```javascript
// 在 generateApp.js 中条件性添加 MCP 插件
const defaultPlugins = {
  template: genTemplatePlugin(config.pluginConfig?.template || {}),
  // ... 其他插件
  
  // 条件性添加 MCP 插件
  ...(config.pluginConfig?.mcp?.enabled !== false && {
    mcp: genMcpPlugin(config.pluginConfig?.mcp || {})
  })
}
```

### 5.3 环境变量控制

```javascript
// 通过环境变量控制
const mcpEnabled = process.env.TINY_ENGINE_MCP_ENABLED !== 'false'

const options = {
  pluginConfig: {
    mcp: {
      enabled: mcpEnabled
    }
  }
}
```

## 6. 插件执行顺序

### 6.1 执行阶段

```javascript
// transformStart 阶段
parseSchemaPlugin.run(schema)

// transform 阶段（并行执行）
templatePlugin.run(schema)
blockPlugin.run(schema)
pagePlugin.run(schema)
dataSourcePlugin.run(schema)
dependenciesPlugin.run(schema)
globalStatePlugin.run(schema)
i18nPlugin.run(schema)
routerPlugin.run(schema)
utilsPlugin.run(schema)
mcpPlugin.run(schema)  // MCP 插件在此阶段执行

// transformEnd 阶段
formatCodePlugin.run(genResult)
```

### 6.2 MCP 插件执行时机

MCP 插件在 `transform` 阶段执行，与其他业务插件并行运行。这确保了：
1. MCP 功能不影响核心业务逻辑生成
2. 可以访问到其他插件生成的文件进行修改
3. 生成的 MCP 文件会被后续的格式化插件处理

## 7. 错误处理和降级策略

### 7.1 MCP 插件错误处理

```javascript
try {
  // MCP 文件生成逻辑
  const files = generateMcpFiles(schema)
  return files
} catch (error) {
  // 记录错误但不中断整个生成过程
  console.error('MCP 插件生成失败:', error)
  
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
```

### 7.2 降级策略

1. **配置验证失败**：抛出错误，阻止插件初始化
2. **文件生成失败**：记录错误，返回空数组，继续其他插件执行
3. **工具生成失败**：跳过该工具，继续生成其他工具
4. **文件修改失败**：跳过修改，保持原文件不变

## 8. 性能优化

### 8.1 按需生成

- 只有在 `enabled: true` 时才执行 MCP 相关逻辑
- 根据 `tools` 配置只生成需要的工具文件
- 避免重复检查和生成已存在的 MCP 集成

### 8.2 缓存策略

- 配置验证结果缓存
- 模板生成结果缓存
- 文件内容检查缓存

## 9. 调试和测试

### 9.1 调试方法

```javascript
// 启用详细日志
const options = {
  pluginConfig: {
    mcp: {
      enabled: true,
      debug: true  // 启用调试模式
    }
  }
}
```

### 9.2 测试覆盖

- 单元测试：插件功能测试
- 集成测试：完整流程测试
- 边界测试：错误情况和边界条件测试

## 10. 总结

MCP 出码流程是在标准 Vue 应用生成基础上的增强功能，通过插件化的方式实现了：

1. **无侵入性**：不影响现有的代码生成逻辑
2. **可配置性**：支持灵活的功能开关和配置
3. **可扩展性**：支持自定义工具和配置
4. **容错性**：具备完善的错误处理和降级机制

通过合理的配置，可以在 MCP 增强功能和标准功能之间灵活切换，满足不同场景的需求。