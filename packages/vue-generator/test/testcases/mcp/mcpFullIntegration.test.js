import { expect, test, describe } from 'vitest'
import genMcpPlugin from '@/plugins/genMcpPlugin'
import { mcpAppSchemaBasic, mcpAppSchemaFull, mcpAppSchemaNoUser, mcpAppSchemaMinimal } from './mockData.js'

describe('MCP 完整集成测试', () => {
  const mockContext = {
    getFile: () => null,
    replaceFile: () => {}
  }

  test('应该生成完整的 MCP 应用程序', () => {
    const plugin = genMcpPlugin({
      enabled: true,
      tools: {
        navigation: true,
        application: true
      }
    })

    const genResult = plugin.run.call(mockContext, mcpAppSchemaFull)

    expect(Array.isArray(genResult)).toBe(true)
    expect(genResult.length).toBeGreaterThan(0)

    // 验证关键文件存在
    const keyFiles = ['base.ts', 'server.ts', 'navigationTools.ts', 'applicationTools.ts']

    keyFiles.forEach((filePath) => {
      const file = genResult.find((f) => f.fileName === filePath)
      expect(file).toBeDefined(`文件 ${filePath} 应该存在`)
    })

    // 验证 MCP 服务器配置
    const serverFile = genResult.find((f) => f.fileName === 'server.ts')
    expect(serverFile.fileContent).toContain('createMcpServer')
    expect(serverFile.fileContent).toContain('registerNavigationTools')
    expect(serverFile.fileContent).toContain('registerApplicationTools')

    // 验证导航工具
    const navFile = genResult.find((f) => f.fileName === 'navigationTools.ts')
    expect(navFile.fileContent).toContain('navigate-to-page')
    expect(navFile.fileContent).toContain('"home", "products", "cart", "profile"')

    // 验证应用程序工具
    const appFile = genResult.find((f) => f.fileName === 'applicationTools.ts')
    expect(appFile.fileContent).toContain('get-user-state')
    expect(appFile.fileContent).toContain('get-products-state')
    expect(appFile.fileContent).toContain('get-cart-state')
  })

  test('应该生成基本的 MCP 应用程序', () => {
    const plugin = genMcpPlugin({
      enabled: true,
      tools: {
        navigation: true,
        application: true
      }
    })

    const genResult = plugin.run.call(mockContext, mcpAppSchemaBasic)

    expect(Array.isArray(genResult)).toBe(true)

    // 验证基础文件
    const baseFile = genResult.find((f) => f.fileName === 'base.ts')
    expect(baseFile).toBeDefined()

    const navFile = genResult.find((f) => f.fileName === 'navigationTools.ts')
    expect(navFile).toBeDefined()

    const appFile = genResult.find((f) => f.fileName === 'applicationTools.ts')
    expect(appFile).toBeDefined()

    // 验证用户状态工具
    expect(appFile.fileContent).toContain('get-user-state')
    expect(appFile.fileContent).toContain('update-user-currentUser')
  })

  test('应该处理无用户状态的应用程序', () => {
    const plugin = genMcpPlugin({
      enabled: true,
      tools: {
        navigation: true,
        application: true
      }
    })

    const genResult = plugin.run.call(mockContext, mcpAppSchemaNoUser)

    // 应该仍然生成应用程序工具，但针对主题状态
    const appFile = genResult.find((f) => f.fileName === 'applicationTools.ts')
    expect(appFile).toBeDefined()
    expect(appFile.fileContent).toContain('get-theme-state')
  })

  test('应该生成最小化 MCP 集成', () => {
    const plugin = genMcpPlugin({
      enabled: true,
      tools: {
        navigation: true,
        application: false
      }
    })

    const genResult = plugin.run.call(mockContext, mcpAppSchemaMinimal)

    // 应该只有导航工具
    const navFile = genResult.find((f) => f.fileName === 'navigationTools.ts')
    expect(navFile).toBeDefined()

    // 不应该有应用程序工具
    const appFile = genResult.find((f) => f.fileName === 'applicationTools.ts')
    expect(appFile).toBeUndefined()

    // 应该有基础文件
    const baseFile = genResult.find((f) => f.fileName === 'base.ts')
    expect(baseFile).toBeDefined()
  })

  test('应该在禁用时不生成 MCP 文件', () => {
    const plugin = genMcpPlugin({
      enabled: false
    })

    const genResult = plugin.run.call(mockContext, mcpAppSchemaBasic)

    // 不应该有任何 MCP 相关文件
    expect(genResult).toEqual([])
  })

  test('应该使用自定义配置', () => {
    const plugin = genMcpPlugin({
      enabled: true,
      agentRoot: 'https://custom-agent.example.com/',
      sessionId: 'custom-session-123',
      tools: {
        navigation: true,
        application: false
      }
    })

    const genResult = plugin.run.call(mockContext, mcpAppSchemaBasic)

    const baseFile = genResult.find((f) => f.fileName === 'base.ts')
    expect(baseFile).toBeDefined()
    expect(baseFile.fileContent).toContain('https://custom-agent.example.com/')
    expect(baseFile.fileContent).toContain('custom-session-123')
  })

  test('应该生成正确的文件结构', () => {
    const plugin = genMcpPlugin({
      enabled: true,
      tools: {
        navigation: true,
        application: true
      }
    })

    const genResult = plugin.run.call(mockContext, mcpAppSchemaBasic)

    // 验证文件路径
    const expectedPaths = {
      'base.ts': './src',
      'server.ts': './src/mcp',
      'navigationTools.ts': './src/mcp/tools',
      'applicationTools.ts': './src/mcp/tools'
    }

    Object.entries(expectedPaths).forEach(([fileName, expectedPath]) => {
      const file = genResult.find((f) => f.fileName === fileName)
      expect(file).toBeDefined(`文件 ${fileName} 应该存在`)
      expect(file.path).toBe(expectedPath)
    })
  })

  test('应该生成有效的 TypeScript 代码', () => {
    const plugin = genMcpPlugin({
      enabled: true,
      tools: {
        navigation: true,
        application: true
      }
    })

    const genResult = plugin.run.call(mockContext, mcpAppSchemaBasic)

    // 验证 TypeScript 导入和导出
    const navFile = genResult.find((f) => f.fileName === 'navigationTools.ts')
    expect(navFile).toBeDefined()
    expect(navFile.fileContent).toContain('import { z } from "@opentiny/next-sdk"')
    expect(navFile.fileContent).toContain('export function registerNavigationTools')

    const appFile = genResult.find((f) => f.fileName === 'applicationTools.ts')
    expect(appFile).toBeDefined()
    expect(appFile.fileContent).toContain('import { z } from "@opentiny/next-sdk"')
    expect(appFile.fileContent).toContain('export function registerApplicationTools')

    const serverFile = genResult.find((f) => f.fileName === 'server.ts')
    expect(serverFile).toBeDefined()
    expect(serverFile.fileContent).toContain('import { WebMcpServer }')
    expect(serverFile.fileContent).toContain('export function createMcpServer')
  })

  test('应该处理错误情况', () => {
    const invalidSchema = {
      pageSchema: null,
      globalState: undefined
    }

    const plugin = genMcpPlugin({
      enabled: true,
      tools: {
        navigation: true,
        application: true
      }
    })

    // 应该不抛出错误，而是优雅降级
    expect(() => {
      plugin.run.call(mockContext, invalidSchema)
    }).not.toThrow()
  })

  test('应该与现有的插件测试保持一致', () => {
    const plugin = genMcpPlugin({
      enabled: true,
      tools: {
        navigation: true,
        application: true
      }
    })

    const genResult = plugin.run.call(mockContext, mcpAppSchemaBasic)

    // 验证基本的 MCP 文件生成
    expect(Array.isArray(genResult)).toBe(true)
    expect(genResult.length).toBeGreaterThan(0)

    // 验证必要的文件存在
    const baseFile = genResult.find((f) => f.fileName === 'base.ts')
    expect(baseFile).toBeDefined()

    const serverFile = genResult.find((f) => f.fileName === 'server.ts')
    expect(serverFile).toBeDefined()

    const navFile = genResult.find((f) => f.fileName === 'navigationTools.ts')
    expect(navFile).toBeDefined()

    const appFile = genResult.find((f) => f.fileName === 'applicationTools.ts')
    expect(appFile).toBeDefined()
  })
})
