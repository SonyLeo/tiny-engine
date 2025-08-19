# MCP 集成示例

这个目录包含了使用 MCP 插件的各种示例，展示了如何生成支持 AI 代理控制的 Vue 应用程序。

## 示例列表

### 1. 基本示例 (`basic-example.js`)

展示最简单的 MCP 集成：
- 启用导航和主题工具
- 生成基本的 MCP 服务器配置
- 适合初学者和简单应用程序

**运行示例：**
```bash
node examples/mcp-integration/basic-example.js
```

**生成的功能：**
- 🧭 页面导航工具
- 🎨 主题切换工具
- 📱 TinyRemoter 集成

### 2. 高级示例 (`advanced-example.js`)

展示完整的 MCP 集成：
- 启用所有工具类别
- 包含用户管理和状态管理
- 添加自定义业务工具
- 适合复杂的业务应用程序

**运行示例：**
```bash
node examples/mcp-integration/advanced-example.js
```

**生成的功能：**
- 🧭 完整导航工具
- 🎨 主题管理工具
- 👤 用户管理工具
- 📊 状态管理工具
- 🔍 产品搜索工具
- 🛒 购物车计算工具
- 📤 数据导出工具

### 3. 自定义工具示例 (`custom-tools-example.js`)

展示如何创建和集成自定义 MCP 工具：
- 数据验证工具
- 通知系统工具
- 文件处理工具
- 业务指标计算工具

**运行示例：**
```bash
node examples/mcp-integration/custom-tools-example.js
```

**生成的功能：**
- ✅ 数据验证工具
- 📢 通知系统工具
- 📄 文件处理工具
- 📈 业务指标计算工具

## 快速开始

### 1. 选择合适的示例

- **新手用户**: 从 `basic-example.js` 开始
- **完整功能**: 使用 `advanced-example.js`
- **自定义需求**: 参考 `custom-tools-example.js`

### 2. 运行示例

```bash
cd packages/vue-generator
node examples/mcp-integration/[示例文件名]
```

### 3. 查看生成结果

生成的文件会输出到控制台，你可以看到：
- 📁 生成的文件列表
- 🔧 MCP 相关文件
- 📦 添加的依赖项
- ⚙️ 配置信息

### 4. 自定义配置

基于示例修改配置：

```javascript
const myMcpConfig = {
  enabled: true,
  agentRoot: 'https://my-agent-server.com/',
  sessionId: 'my-session-id',
  tools: {
    navigation: true,
    theme: false,     // 禁用主题工具
    user: true,
    application: true
  }
}
```

## 配置模板

### 最小配置

```javascript
{
  pluginConfig: {
    mcp: {
      enabled: true
    }
  }
}
```

### 生产环境配置

```javascript
{
  pluginConfig: {
    mcp: {
      enabled: true,
      agentRoot: process.env.MCP_AGENT_ROOT,
      sessionId: process.env.MCP_SESSION_ID,
      tools: {
        navigation: true,
        theme: true,
        user: true,
        application: true
      },
      capabilities: {
        prompts: { listChanged: true },
        resources: { subscribe: true, listChanged: true },
        tools: { listChanged: true },
        logging: { level: 'error' }
      }
    }
  }
}
```

### 开发环境配置

```javascript
{
  pluginConfig: {
    mcp: {
      enabled: true,
      agentRoot: 'http://localhost:3000/mcp/',
      sessionId: 'dev-session',
      tools: {
        navigation: true,
        theme: true,
        user: true,
        application: true
      },
      capabilities: {
        logging: { level: 'debug' }
      }
    }
  }
}
```

## 最佳实践

### 1. 工具设计

- **单一职责**: 每个工具只做一件事
- **错误处理**: 始终包含 try-catch 块
- **用户反馈**: 提供清晰的成功和错误消息
- **类型安全**: 使用 zod schema 验证输入

### 2. 配置管理

- **环境变量**: 使用环境变量管理敏感配置
- **条件启用**: 根据应用程序功能选择性启用工具
- **版本控制**: 在配置中指定依赖版本

### 3. 性能优化

- **按需加载**: 只启用需要的工具类别
- **缓存策略**: 在工具中实现适当的缓存
- **错误恢复**: 实现优雅的错误恢复机制

### 4. 安全考虑

- **输入验证**: 严格验证所有工具输入
- **权限检查**: 在敏感操作前检查用户权限
- **日志记录**: 记录重要操作和错误

## 故障排除

### 常见问题和解决方案

参见 [MCP 插件文档](../docs/mcp-plugin.md#故障排除) 中的详细故障排除指南。

### 获取帮助

- 📖 查看 [MCP 插件文档](../docs/mcp-plugin.md)
- 🧪 运行测试用例了解预期行为
- 💬 在项目 Issues 中提问

## 贡献

欢迎贡献更多的示例和改进：

1. Fork 项目
2. 创建新的示例文件
3. 添加相应的文档
4. 提交 Pull Request

### 示例贡献指南

- 每个示例都应该有清晰的注释
- 包含完整的配置和 schema
- 提供运行说明和预期结果
- 遵循现有的代码风格