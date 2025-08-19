import { expect, test, describe, vi } from 'vitest'
import path from 'path'
import fs from 'fs'
import dirCompare from 'dir-compare'
import { generateApp } from '@/generator/generateApp'
import {
  mcpAppSchemaFull,
  mcpAppSchemaBasic,
  mcpAppSchemaNoUser,
  mcpAppSchemaMinimal,
  mcpConfigFull,
  mcpConfigMinimal,
  mcpConfigDisabled,
  mcpConfigCustom
} from './mockData'
import { logDiffResult } from '../../utils/logDiffResult'

// 模拟 favicon.ico 文件
vi.mock('../../../src/templates/vue-template/templateFiles/public/favicon.ico', () => {
  const faviconRelativePath = '../../../src/templates/vue-template/templateFiles/public/favicon.ico'
  const fileBuffer = fs.readFileSync(path.join(__dirname, faviconRelativePath))
  const str = fileBuffer.toString('base64')

  return {
    default: `data:image/x-icon;base64,${str}`
  }
})

describe('MCP 完整集成测试', () => {
  test('应该生成完整的 MCP 应用程序', async () => {
    const instance = generateApp({
      pluginConfig: {
        mcp: mcpConfigFull
      }
    })

    const result = await instance.generate(mcpAppSchemaFull)
    const { genResult } = result

    expect(Array.isArray(genResult)).toBe(true)
    expect(genResult.length).toBeGreaterThan(0)

    // 写入文件到结果目录
    const resultDir = path.resolve(__dirname, './result/mcp-full-app')
    for (const { fileName, path: filePath, fileContent } of genResult) {
      const fullPath = path.resolve(resultDir, filePath)
      fs.mkdirSync(fullPath, { recursive: true })

      if (typeof fileContent === 'string') {
        fs.writeFileSync(path.resolve(fullPath, fileName), fileContent)
      } else if (fileContent instanceof Blob) {
        const arrayBuffer = await fileContent.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        fs.writeFileSync(path.resolve(fullPath, fileName), buffer)
      }
    }

    // 验证关键文件存在
    const keyFiles = [
      'base.ts',
      'mcp/server.ts',
      'mcp/tools/navigationTools.ts',
      'mcp/tools/themeTools.ts',
      'mcp/tools/userTools.ts',
      'mcp/tools/applicationTools.ts',
      'composables/useTheme.ts',
      'App.vue',
      'package.json'
    ]

    keyFiles.forEach((filePath) => {
      const file = genResult.find((f) => `${f.path}/${f.fileName}`.includes(filePath))
      expect(file).toBeDefined(`文件 ${filePath} 应该存在`)
    })

    // 验证 package.json 包含 MCP 依赖
    const packageFile = genResult.find((f) => f.fileName === 'package.json')
    expect(packageFile).toBeDefined()
    const packageContent = JSON.parse(packageFile.fileContent)

    expect(packageContent.dependencies).toHaveProperty('@opentiny/next-remoter')
    expect(packageContent.dependencies).toHaveProperty('@opentiny/next-sdk')
    expect(packageContent.dependencies).toHaveProperty('@opentiny/tiny-robot')

    // 验证 App.vue 包含 MCP 集成
    const appVueFile = genResult.find((f) => f.fileName === 'App.vue')
    expect(appVueFile).toBeDefined()
    expect(appVueFile.fileContent).toContain('TinyRemoter')
    expect(appVueFile.fileContent).toContain('createMcpServer')
    expect(appVueFile.fileContent).toContain('WebMcpClient')

    // 验证 MCP 服务器文件
    const serverFile = genResult.find((f) => f.fileName === 'server.ts' && f.path === './src/mcp')
    expect(serverFile).toBeDefined()
    expect(serverFile.fileContent).toContain('registerNavigationTools')
    expect(serverFile.fileContent).toContain('registerThemeTools')
    expect(serverFile.fileContent).toContain('registerUserTools')
    expect(serverFile.fileContent).toContain('registerApplicationTools')

    // 验证导航工具
    const navFile = genResult.find((f) => f.fileName === 'navigationTools.ts')
    expect(navFile).toBeDefined()
    expect(navFile.fileContent).toContain('"home"')
    expect(navFile.fileContent).toContain('"products"')
    expect(navFile.fileContent).toContain('"cart"')
    expect(navFile.fileContent).toContain('"profile"')

    // 验证应用程序工具
    const appToolsFile = genResult.find((f) => f.fileName === 'applicationTools.ts')
    expect(appToolsFile).toBeDefined()
    expect(appToolsFile.fileContent).toContain('get-user-state')
    expect(appToolsFile.fileContent).toContain('get-products-state')
    expect(appToolsFile.fileContent).toContain('get-cart-state')
  })

  test('应该生成基本的 MCP 应用程序', async () => {
    const instance = generateApp({
      pluginConfig: {
        mcp: {
          enabled: true,
          tools: {
            navigation: true,
            theme: true,
            user: true,
            application: false
          }
        }
      }
    })

    const result = await instance.generate(mcpAppSchemaBasic)
    const { genResult } = result

    // 验证基本文件存在
    const baseFile = genResult.find((f) => f.fileName === 'base.ts')
    expect(baseFile).toBeDefined()

    const serverFile = genResult.find((f) => f.fileName === 'server.ts')
    expect(serverFile).toBeDefined()

    const navFile = genResult.find((f) => f.fileName === 'navigationTools.ts')
    expect(navFile).toBeDefined()

    const themeFile = genResult.find((f) => f.fileName === 'themeTools.ts')
    expect(themeFile).toBeDefined()

    const userFile = genResult.find((f) => f.fileName === 'userTools.ts')
    expect(userFile).toBeDefined()

    // 应用程序工具不应该存在
    const appToolsFile = genResult.find((f) => f.fileName === 'applicationTools.ts')
    expect(appToolsFile).toBeUndefined()
  })

  test('应该处理无用户状态的应用程序', async () => {
    const instance = generateApp({
      pluginConfig: {
        mcp: mcpConfigFull
      }
    })

    const result = await instance.generate(mcpAppSchemaNoUser)
    const { genResult } = result

    // 用户工具不应该生成
    const userFile = genResult.find((f) => f.fileName === 'userTools.ts')
    expect(userFile).toBeUndefined()

    // MCP 服务器不应该注册用户工具
    const serverFile = genResult.find((f) => f.fileName === 'server.ts')
    expect(serverFile).toBeDefined()
    expect(serverFile.fileContent).not.toContain('registerUserTools')

    // 其他工具应该正常生成
    const navFile = genResult.find((f) => f.fileName === 'navigationTools.ts')
    expect(navFile).toBeDefined()

    const themeFile = genResult.find((f) => f.fileName === 'themeTools.ts')
    expect(themeFile).toBeDefined()
  })

  test('应该生成最小化 MCP 集成', async () => {
    const instance = generateApp({
      pluginConfig: {
        mcp: mcpConfigMinimal
      }
    })

    const result = await instance.generate(mcpAppSchemaMinimal)
    const { genResult } = result

    // 只应该有导航工具
    const navFile = genResult.find((f) => f.fileName === 'navigationTools.ts')
    expect(navFile).toBeDefined()

    // 其他工具不应该存在
    const themeFile = genResult.find((f) => f.fileName === 'themeTools.ts')
    expect(themeFile).toBeUndefined()

    const userFile = genResult.find((f) => f.fileName === 'userTools.ts')
    expect(userFile).toBeUndefined()

    const appToolsFile = genResult.find((f) => f.fileName === 'applicationTools.ts')
    expect(appToolsFile).toBeUndefined()

    // MCP 服务器只应该注册导航工具
    const serverFile = genResult.find((f) => f.fileName === 'server.ts')
    expect(serverFile).toBeDefined()
    expect(serverFile.fileContent).toContain('registerNavigationTools')
    expect(serverFile.fileContent).not.toContain('registerThemeTools')
    expect(serverFile.fileContent).not.toContain('registerUserTools')
    expect(serverFile.fileContent).not.toContain('registerApplicationTools')
  })

  test('应该在禁用时不生成 MCP 文件', async () => {
    const instance = generateApp({
      pluginConfig: {
        mcp: mcpConfigDisabled
      }
    })

    const result = await instance.generate(mcpAppSchemaBasic)
    const { genResult } = result

    // MCP 相关文件不应该存在
    const mcpFiles = genResult.filter(
      (file) => file.path.includes('mcp') || file.fileName === 'base.ts' || file.fileName === 'useTheme.ts'
    )

    expect(mcpFiles.length).toBe(0)

    // App.vue 不应该包含 MCP 集成
    const appVueFile = genResult.find((f) => f.fileName === 'App.vue')
    if (appVueFile) {
      expect(appVueFile.fileContent).not.toContain('TinyRemoter')
      expect(appVueFile.fileContent).not.toContain('createMcpServer')
    }

    // package.json 不应该包含 MCP 依赖
    const packageFile = genResult.find((f) => f.fileName === 'package.json')
    if (packageFile) {
      const packageContent = JSON.parse(packageFile.fileContent)
      expect(packageContent.dependencies).not.toHaveProperty('@opentiny/next-remoter')
      expect(packageContent.dependencies).not.toHaveProperty('@opentiny/next-sdk')
      expect(packageContent.dependencies).not.toHaveProperty('@opentiny/tiny-robot')
    }
  })

  test('应该使用自定义配置', async () => {
    const instance = generateApp({
      pluginConfig: {
        mcp: mcpConfigCustom
      }
    })

    const result = await instance.generate(mcpAppSchemaBasic)
    const { genResult } = result

    // 验证自定义配置
    const baseFile = genResult.find((f) => f.fileName === 'base.ts')
    expect(baseFile).toBeDefined()
    expect(baseFile.fileContent).toContain('https://custom-agent.example.com/')
    expect(baseFile.fileContent).toContain('custom-session-123')

    // 验证 App.vue 使用自定义配置
    const appVueFile = genResult.find((f) => f.fileName === 'App.vue')
    expect(appVueFile).toBeDefined()
    expect(appVueFile.fileContent).toContain('SESSION_ID')
  })

  test('应该生成正确的文件结构', async () => {
    const instance = generateApp({
      pluginConfig: {
        mcp: mcpConfigFull
      }
    })

    const result = await instance.generate(mcpAppSchemaFull)
    const { genResult } = result

    // 验证文件路径结构
    const expectedPaths = {
      'base.ts': './src',
      'server.ts': './src/mcp',
      'navigationTools.ts': './src/mcp/tools',
      'themeTools.ts': './src/mcp/tools',
      'userTools.ts': './src/mcp/tools',
      'applicationTools.ts': './src/mcp/tools',
      'useTheme.ts': './src/composables'
    }

    Object.entries(expectedPaths).forEach(([fileName, expectedPath]) => {
      const file = genResult.find((f) => f.fileName === fileName)
      expect(file).toBeDefined(`文件 ${fileName} 应该存在`)
      expect(file.path).toBe(expectedPath)
    })
  })

  test('应该生成有效的 TypeScript 代码', async () => {
    const instance = generateApp({
      pluginConfig: {
        mcp: mcpConfigFull
      }
    })

    const result = await instance.generate(mcpAppSchemaFull)
    const { genResult } = result

    // 验证 TypeScript 文件语法
    const tsFiles = genResult.filter((f) => f.fileName.endsWith('.ts'))

    tsFiles.forEach((file) => {
      // 基本语法检查
      expect(file.fileContent).not.toContain('undefined')

      // 检查是否有基本的 TypeScript 类型（排除 base.ts）
      if (file.fileName.includes('Tools.ts')) {
        expect(file.fileContent).toMatch(/import.*from/)
        expect(file.fileContent).toContain('WebMcpServer')
        expect(file.fileContent).toContain('async')
      } else if (file.fileName === 'server.ts') {
        expect(file.fileContent).toMatch(/import.*from/)
        expect(file.fileContent).toContain('WebMcpServer')
      } else if (file.fileName === 'useTheme.ts') {
        expect(file.fileContent).toMatch(/import.*from/)
        expect(file.fileContent).toContain('ref')
      }
      // base.ts 文件只包含导出常量，不需要 import 语句
    })

    // 验证 tsconfig.json
    const tsconfigFile = genResult.find((f) => f.fileName === 'tsconfig.json')
    expect(tsconfigFile).toBeDefined()

    const tsconfigContent = JSON.parse(tsconfigFile.fileContent)
    expect(tsconfigContent.compilerOptions).toBeDefined()
    expect(tsconfigContent.compilerOptions.target).toBe('ES2020')
    expect(tsconfigContent.compilerOptions.module).toBe('ESNext')
  })

  test('应该处理错误情况', async () => {
    // 测试无效配置
    const invalidConfig = {
      enabled: true,
      agentRoot: 'invalid-url',
      tools: {
        navigation: 'invalid-boolean'
      }
    }

    expect(() => {
      generateApp({
        pluginConfig: {
          mcp: invalidConfig
        }
      })
    }).toThrow()
  })

  test('应该与现有的 generator 测试保持一致', async () => {
    const instance = generateApp({
      pluginConfig: {
        mcp: mcpConfigFull
      }
    })

    const result = await instance.generate(mcpAppSchemaFull)
    const { genResult } = result

    // 写入文件进行比较
    const resultDir = path.resolve(__dirname, './result/mcp-comparison')
    for (const { fileName, path: filePath, fileContent } of genResult) {
      const fullPath = path.resolve(resultDir, filePath)
      fs.mkdirSync(fullPath, { recursive: true })

      if (typeof fileContent === 'string') {
        fs.writeFileSync(path.resolve(fullPath, fileName), fileContent)
      } else if (fileContent instanceof Blob) {
        const arrayBuffer = await fileContent.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        fs.writeFileSync(path.resolve(fullPath, fileName), buffer)
      }
    }

    // 验证基本文件结构与标准 generator 测试一致
    const standardFiles = ['package.json', 'App.vue', 'main.js', 'index.html']
    standardFiles.forEach((fileName) => {
      const file = genResult.find((f) => f.fileName === fileName)
      expect(file).toBeDefined(`标准文件 ${fileName} 应该存在`)
    })
  })
})
