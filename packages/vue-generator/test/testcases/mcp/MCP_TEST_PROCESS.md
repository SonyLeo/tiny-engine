# MCP 应用生成测试流程文档

## 概述

本文档描述了 MCP (Model Context Protocol) 应用生成功能的完整测试流程，包括测试用例设计、预期结果验证和问题排查指南。

## 测试架构

### 测试文件结构
```
test/testcases/mcp/
├── mockData.js                    # 测试数据模拟
├── mcpIntegration.test.js         # 基础集成测试
├── mcpFullIntegration.test.js     # 完整集成测试
├── mcpToolsGeneration.test.js     # 工具生成测试
├── genMcpPlugin.test.js          # 插件单元测试
├── expected/                      # 预期结果文件
│   └── mcp-full-app/
│       ├── src/
│       │   ├── base.ts
│       │   ├── mcp/
│       │   │   ├── server.ts
│       │   │   └── tools/
│       │   │       ├── navigationTools.ts
│       │   │       ├── themeTools.ts
│       │   │       ├── userTools.ts
│       │   │       └── applicationTools.ts
│       │   └── composables/
│       │       └── useTheme.ts
│       ├── package.json
│       └── tsconfig.json
└── result/                        # 测试生成结果
    └── mcp-full-app/
```

## 测试数据设计

### 1. 应用模式 (Schema) 类型

#### mcpAppSchemaBasic
- **用途**: 基础 MCP 应用测试
- **特点**: 包含用户状态、基本页面路由
- **页面**: Home, Products
- **状态**: user (登录状态)

#### mcpAppSchemaFull  
- **用途**: 完整功能测试
- **特点**: 多状态管理、复杂页面结构
- **页面**: Home, Products, Cart, Profile
- **状态**: user, products, cart
- **数据源**: userApi, productsApi

#### mcpAppSchemaNoUser
- **用途**: 无用户状态场景测试
- **特点**: 验证条件性工具生成
- **状态**: theme (仅主题状态)

#### mcpAppSchemaMinimal
- **用途**: 最小化配置测试
- **特点**: 最简单的应用结构
- **页面**: 仅 Home 页面
- **状态**: 无全局状态

### 2. MCP 配置类型

#### mcpConfigFull
```javascript
{
  enabled: true,
  agentRoot: 'https://agent.opentiny.design/api/v1/mcp-proxy-trial/',
  sessionId: '78b66563-95c0-4839-8007-e8af634dd658',
  capabilities: { /* 完整能力配置 */ },
  tools: {
    navigation: true,
    theme: true,
    user: true,
    application: true
  }
}
```

#### mcpConfigMinimal
- 仅启用导航工具
- 用于测试选择性工具生成

#### mcpConfigDisabled
- 禁用 MCP 功能
- 验证不生成 MCP 相关文件

#### mcpConfigCustom
- 自定义代理地址和会话ID
- 包含自定义工具定义

## 测试用例分类

### 1. 单元测试 (genMcpPlugin.test.js)

**测试范围**: MCP 插件的各个功能模块

**关键测试点**:
- 插件配置验证
- 工具生成函数
- 文件修改逻辑
- 错误处理机制

**示例测试**:
```javascript
test('should generate navigation tools', () => {
  const plugin = genMcpPlugin({ enabled: true })
  const tools = plugin.generateNavigationTools(mockPageSchema)
  expect(tools).toContain('registerNavigationTools')
})
```

### 2. 集成测试 (mcpIntegration.test.js)

**测试范围**: MCP 插件与整个生成器的集成

**关键测试点**:
- 完整应用生成流程
- 文件依赖关系
- 配置传递机制
- 插件执行顺序

### 3. 完整功能测试 (mcpFullIntegration.test.js)

**测试范围**: 端到端的 MCP 应用生成

**关键测试点**:
- 多种配置组合
- 复杂应用场景
- 文件结构验证
- 代码质量检查

### 4. 工具生成测试 (mcpToolsGeneration.test.js)

**测试范围**: 各类 MCP 工具的生成逻辑

**关键测试点**:
- 导航工具生成
- 主题工具生成
- 用户工具条件生成
- 应用程序工具动态生成

## 验证标准

### 1. 文件存在性验证

**必需文件**:
- `src/base.ts` - MCP 基础配置
- `src/mcp/server.ts` - MCP 服务器
- `src/mcp/tools/*.ts` - 各类工具文件
- `src/composables/useTheme.ts` - 主题管理
- `package.json` - 依赖配置
- `tsconfig.json` - TypeScript 配置

**验证方法**:
```javascript
const keyFiles = ['base.ts', 'mcp/server.ts', /* ... */]
keyFiles.forEach(filePath => {
  const file = genResult.find(f => `${f.path}/${f.fileName}`.includes(filePath))
  expect(file).toBeDefined(`文件 ${filePath} 应该存在`)
})
```

### 2. 内容正确性验证

**package.json 依赖**:
```javascript
expect(packageContent.dependencies).toHaveProperty('@opentiny/next-remoter')
expect(packageContent.dependencies).toHaveProperty('@opentiny/next-sdk')
expect(packageContent.dependencies).toHaveProperty('@opentiny/tiny-robot')
```

**App.vue MCP 集成**:
```javascript
expect(appVueContent).toContain('TinyRemoter')
expect(appVueContent).toContain('createMcpServer')
expect(appVueContent).toContain('WebMcpClient')
```

**工具注册验证**:
```javascript
expect(serverContent).toContain('registerNavigationTools')
expect(serverContent).toContain('registerThemeTools')
// 条件性验证
if (hasUserState) {
  expect(serverContent).toContain('registerUserTools')
}
```

### 3. TypeScript 代码质量验证

**语法检查**:
```javascript
tsFiles.forEach(file => {
  expect(file.fileContent).not.toContain('undefined')
  expect(file.fileContent).toMatch(/import.*from/)
  expect(file.fileContent).toContain('async')
})
```

**类型定义检查**:
```javascript
expect(toolsContent).toContain('WebMcpServer')
expect(toolsContent).toContain('Router')
expect(toolsContent).toContain('z.enum')
```

## 测试执行流程

### 1. 环境准备

```bash
# 安装依赖
cd packages/vue-generator
npm install

# 确保测试环境
npm run test:setup
```

### 2. 运行测试

```bash
# 运行所有 MCP 测试
npm test testcases/mcp

# 运行特定测试文件
npm test testcases/mcp/mcpFullIntegration.test.js

# 运行测试并生成覆盖率报告
npm run test:coverage testcases/mcp
```

### 3. 结果验证

**成功标准**:
- 所有测试用例通过 ✅
- 生成的文件结构正确 ✅
- 代码语法无错误 ✅
- 依赖配置正确 ✅

**失败处理**:
1. 查看测试输出日志
2. 检查生成的 result 目录
3. 对比 expected 和 result 文件差异
4. 根据错误信息定位问题

## 常见问题排查

### 1. 文件生成失败

**症状**: 测试报告文件不存在或内容为空

**排查步骤**:
1. 检查 MCP 插件是否正确注册
2. 验证配置参数是否有效
3. 查看插件执行日志
4. 确认模拟数据格式正确

**解决方案**:
```javascript
// 检查插件注册
const plugins = instance.getContext().plugins
expect(plugins.transform).toContain(mcpPlugin)

// 验证配置
expect(config.pluginConfig.mcp.enabled).toBe(true)
```

### 2. 依赖注入失败

**症状**: package.json 中缺少 MCP 依赖

**排查步骤**:
1. 确认 genDependenciesPlugin 执行顺序
2. 检查 MCP 配置传递到依赖插件
3. 验证依赖插件的 parseSchema 逻辑

**解决方案**:
```javascript
// 确保配置正确传递
const context = {
  pluginConfig: { mcp: mcpConfig }
}
```

### 3. TypeScript 编译错误

**症状**: 生成的 .ts 文件有语法错误

**排查步骤**:
1. 检查模板字符串转义
2. 验证导入语句格式
3. 确认类型定义正确

**解决方案**:
- 使用 ESLint 检查生成的代码
- 添加 TypeScript 编译验证步骤

### 4. 工具注册不完整

**症状**: MCP 服务器缺少某些工具

**排查步骤**:
1. 检查工具启用配置
2. 验证条件判断逻辑（如用户状态检测）
3. 确认工具生成函数正常执行

**解决方案**:
```javascript
// 调试工具生成
console.log('Enabled tools:', Object.keys(config.tools).filter(t => config.tools[t]))
console.log('Has user state:', hasUserState)
```

## 性能测试

### 1. 生成速度测试

```javascript
test('should generate MCP app within reasonable time', async () => {
  const startTime = Date.now()
  await instance.generate(mcpAppSchemaFull)
  const duration = Date.now() - startTime
  
  expect(duration).toBeLessThan(5000) // 5秒内完成
})
```

### 2. 内存使用测试

```javascript
test('should not cause memory leaks', async () => {
  const initialMemory = process.memoryUsage().heapUsed
  
  for (let i = 0; i < 10; i++) {
    await instance.generate(mcpAppSchemaBasic)
  }
  
  const finalMemory = process.memoryUsage().heapUsed
  const memoryIncrease = finalMemory - initialMemory
  
  expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // 50MB
})
```

## 持续集成

### 1. CI/CD 配置

```yaml
# .github/workflows/mcp-tests.yml
name: MCP Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test testcases/mcp
      - uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: test/testcases/mcp/result/
```

### 2. 测试报告

- 生成 HTML 测试报告
- 上传测试覆盖率到 Codecov
- 保存测试结果文件供调试

## 总结

MCP 应用生成测试采用多层次验证策略：

1. **单元测试** - 验证各个功能模块
2. **集成测试** - 验证模块间协作
3. **端到端测试** - 验证完整生成流程
4. **回归测试** - 确保新功能不破坏现有功能

通过完善的测试覆盖和严格的验证标准，确保 MCP 功能的稳定性和可靠性。