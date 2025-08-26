# MCP 插件文档

## 概述

MCP (Model Context Protocol) 插件为 vue-generator 添加了 MCP 集成功能，使生成的应用程序能够通过 AI 代理进行控制和操作。该插件会自动生成 MCP 服务器、工具实现和相关配置文件。

## 安装和使用

### 基本使用

```javascript
import { generateApp } from '@opentiny/tiny-engine-dsl-vue'

const instance = generateApp({
  pluginConfig: {
    mcp: {
      enabled: true
    }
  }
})

const result = await instance.generate(appSchema)
```

### 完整配置示例

```javascript
const instance = generateApp({
  pluginConfig: {
    mcp: {
      enabled: true,
      agentRoot: 'https://your-agent-server.com/api/v1/mcp-proxy/',
      sessionId: 'your-session-id',
      capabilities: {
        prompts: { listChanged: true },
        resources: { subscribe: true, listChanged: true },
        tools: { listChanged: true },
        completions: {},
        logging: {}
      },
      tools: {
        navigation: true,
        theme: true,
        user: true,
        application: true
      },
      customTools: [
        {
          name: 'custom-tool',
          implementation: 'function customTool() { /* 自定义实现 */ }'
        }
      ]
    }
  }
})
```

## 配置选项

### 基本配置

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `enabled` | boolean | `true` | 是否启用 MCP 集成 |
| `agentRoot` | string | `'https://agent.opentiny.design/api/v1/webmcp-trial/'` | MCP 代理服务器根 URL |
| `sessionId` | string | `'78b66563-95c0-4839-8007-e8af634dd658'` | MCP 会话 ID |

### 工具配置

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `tools.navigation` | boolean | `true` | 启用导航工具（页面路由、前进/后退等） |
| `tools.theme` | boolean | `true` | 启用主题工具（主题切换、模式设置等） |
| `tools.user` | boolean | `true` | 启用用户工具（登录、登出、用户信息等） |
| `tools.application` | boolean | `true` | 启用应用程序特定工具（状态管理等） |

### 高级配置

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `capabilities` | object | 见默认配置 | MCP 服务器能力配置 |
| `customTools` | array | `[]` | 自定义工具配置数组 |

## 生成的文件结构

启用 MCP 插件后，会生成以下文件结构：

```
src/
├── mcp/
│   ├── server.ts                    # MCP 服务器配置和初始化
│   └── tools/
│       ├── navigationTools.ts      # 导航工具实现
│       ├── themeTools.ts           # 主题工具实现
│       ├── userTools.ts            # 用户工具实现（条件性）
│       └── applicationTools.ts     # 应用程序特定工具实现
├── composables/
│   └── useTheme.ts                 # 主题管理组合式函数
├── base.ts                         # MCP 配置常量
├── App.vue                         # 修改后包含 MCP 集成
├── main.ts                         # 修改后包含 MCP 样式
├── tsconfig.json                   # TypeScript 配置
└── tsconfig.node.json              # TypeScript Node 配置
```

## 工具类别详解

### 导航工具 (Navigation Tools)

自动基于应用程序的页面模式生成导航相关的工具：

- `navigate-to-page`: 导航到指定页面
- `go-back`: 返回上一页
- `go-forward`: 前进到下一页
- `get-current-route`: 获取当前路由信息

### 主题工具 (Theme Tools)

提供主题管理功能：

- `change-theme-mode`: 切换主题模式（浅色/深色/自动）
- `toggle-theme`: 在浅色和深色主题之间切换
- `get-current-theme`: 获取当前主题信息

### 用户工具 (User Tools)

当检测到用户状态时自动生成：

- `user-login`: 用户登录
- `user-logout`: 用户登出
- `get-user-info`: 获取用户信息
- `update-user-profile`: 更新用户资料

### 应用程序工具 (Application Tools)

基于全局状态自动生成状态管理工具：

- `get-{state}-state`: 获取指定状态的信息
- `update-{state}-{property}`: 更新状态中的特定属性

## 自定义工具

### 添加自定义工具

```javascript
const customTools = [
  {
    name: 'send-notification',
    implementation: `
      server.registerTool(
        "send-notification",
        {
          title: "发送通知",
          description: "向用户发送通知消息",
          inputSchema: {
            message: z.string().describe("通知消息"),
            type: z.enum(["info", "success", "warning", "error"]).describe("通知类型")
          }
        },
        async ({ message, type }) => {
          try {
            // 自定义通知逻辑
            showNotification(message, type)
            return {
              content: [{ type: "text", text: "通知发送成功" }]
            }
          } catch (error) {
            return {
              content: [{ type: "text", text: \`通知发送失败：\${error}\` }]
            }
          }
        }
      )
    `
  }
]

const instance = generateApp({
  pluginConfig: {
    mcp: {
      enabled: true,
      customTools
    }
  }
})
```

### 自定义工具最佳实践

1. **错误处理**: 始终在工具实现中包含 try-catch 块
2. **类型安全**: 使用 TypeScript 类型定义确保类型安全
3. **用户反馈**: 提供清晰的成功和错误消息
4. **输入验证**: 使用 zod schema 验证输入参数

## 错误处理

MCP 插件包含多层错误处理：

### 插件级错误处理

- 配置验证错误会在插件初始化时抛出
- 生成过程中的错误会被捕获并记录，不会中断整个生成过程
- 支持优雅降级，即使 MCP 生成失败，其他插件仍能正常工作

### 工具级错误处理

生成的所有 MCP 工具都包含错误处理：

```typescript
async ({ param }: { param: string }) => {
  try {
    // 工具逻辑
    return {
      content: [{ type: "text", text: "操作成功" }]
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `操作失败：${error}` }]
    }
  }
}
```

### MCP 服务器错误处理

生成的 MCP 服务器初始化代码包含连接错误处理：

```typescript
const initMcpServer = async () => {
  try {
    const server = createMcpServer(router, mcpServer);
    await server.connect(mcpServer.transport as Transport);
    console.log('MCP 服务器初始化成功');
  } catch (error) {
    console.error('MCP 服务器初始化失败:', error);
  }
};
```

## 故障排除

### 常见问题

#### 1. MCP 服务器连接失败

**问题**: 控制台显示 "MCP 服务器初始化失败"

**解决方案**:
- 检查 `agentRoot` URL 是否正确
- 确认网络连接正常
- 验证 `sessionId` 是否有效

#### 2. 工具注册失败

**问题**: 某些 MCP 工具无法使用

**解决方案**:
- 检查相关的 store 或 composable 是否正确导入
- 确认全局状态配置是否正确
- 查看浏览器控制台的错误信息

#### 3. TypeScript 编译错误

**问题**: 生成的代码存在 TypeScript 类型错误

**解决方案**:
- 确保安装了必要的 MCP 依赖包
- 检查 tsconfig.json 配置是否正确
- 验证导入路径是否正确

#### 4. 样式文件缺失

**问题**: TinyRemoter 组件样式不正确

**解决方案**:
- 确认 main.ts 中是否正确导入了 `@opentiny/tiny-robot/dist/style.css`
- 检查依赖包是否正确安装

### 调试技巧

1. **启用详细日志**: 在 MCP 配置中启用 logging 能力
2. **检查网络请求**: 使用浏览器开发者工具监控 MCP 通信
3. **验证工具注册**: 检查 MCP 服务器是否正确注册了所有工具
4. **测试单个工具**: 逐个测试 MCP 工具以定位问题

## 版本兼容性

| vue-generator 版本 | MCP 插件版本 | 支持的功能 |
|-------------------|-------------|-----------|
| 2.7.0+ | 1.0.0+ | 完整 MCP 集成支持 |

## 依赖要求

MCP 插件会自动添加以下依赖到生成的项目：

```json
{
  "dependencies": {
    "@opentiny/next-remoter": "0.0.1-alpha.9",
    "@opentiny/next-sdk": "^0.1.0",
    "@opentiny/tiny-robot": "0.3.0-alpha.16"
  }
}
```

## 更新日志

### v1.0.0
- 初始版本发布
- 支持导航、主题、用户和应用程序工具
- 完整的错误处理和类型安全
- TypeScript 配置自动生成
- 自定义工具支持