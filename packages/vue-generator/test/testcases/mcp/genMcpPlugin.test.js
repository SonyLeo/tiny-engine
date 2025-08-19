import { expect, test, describe, vi } from 'vitest'
import genMcpPlugin from '@/plugins/genMcpPlugin'

describe('genMcpPlugin', () => {
  const mockSchema = {
    pageSchema: [
      {
        componentName: 'HomePage',
        fileName: 'HomePage',
        meta: {
          id: 1,
          isHome: true,
          router: '/home'
        }
      },
      {
        componentName: 'AboutPage',
        fileName: 'AboutPage',
        meta: {
          id: 2,
          isHome: false,
          router: '/about'
        }
      }
    ],
    globalState: [
      {
        id: 'user',
        state: {
          currentUser: null,
          isLoggedIn: false
        },
        actions: {
          login: { type: 'JSFunction', value: 'function login() {}' }
        }
      },
      {
        id: 'products',
        state: {
          items: [],
          cartCount: 0
        }
      }
    ],
    dataSource: {
      list: [{ id: 1, name: 'userApi', data: {} }]
    }
  }

  test('should create plugin with default options', () => {
    const plugin = genMcpPlugin()

    expect(plugin.name).toBe('tinyEngine-generateCode-plugin-mcp')
    expect(plugin.description).toBe('generate MCP (Model Context Protocol) integration files')
    expect(typeof plugin.run).toBe('function')
  })

  test('should generate MCP files when enabled', () => {
    const plugin = genMcpPlugin({ enabled: true })

    // Mock the plugin context methods
    const mockContext = {
      getFile: () => ({ fileContent: '<template><div>test</div></template>' }),
      replaceFile: () => {}
    }

    const files = plugin.run.call(mockContext, mockSchema)

    expect(Array.isArray(files)).toBe(true)
    expect(files.length).toBeGreaterThan(0)

    // Check if base.ts is generated
    const baseFile = files.find((f) => f.fileName === 'base.ts')
    expect(baseFile).toBeDefined()
    expect(baseFile.path).toBe('./src')
    expect(baseFile.fileContent).toContain('AGENT_ROOT')

    // Check if server.ts is generated
    const serverFile = files.find((f) => f.fileName === 'server.ts')
    expect(serverFile).toBeDefined()
    expect(serverFile.path).toBe('./src/mcp')
    expect(serverFile.fileContent).toContain('createMcpServer')
  })

  test('should not generate files when disabled', () => {
    const plugin = genMcpPlugin({ enabled: false })

    const mockContext = {
      getFile: () => null,
      replaceFile: () => {}
    }

    const files = plugin.run.call(mockContext, mockSchema)

    expect(files).toEqual([])
  })

  test('should generate navigation tools', () => {
    const plugin = genMcpPlugin({
      enabled: true,
      tools: { navigation: true, theme: false, user: false, application: false }
    })

    const mockContext = {
      getFile: () => null,
      replaceFile: () => {}
    }

    const files = plugin.run.call(mockContext, mockSchema)

    const navFile = files.find((f) => f.fileName === 'navigationTools.ts')
    expect(navFile).toBeDefined()
    expect(navFile.fileContent).toContain('registerNavigationTools')
    expect(navFile.fileContent).toContain('navigate-to-page')
    expect(navFile.fileContent).toContain('"home", "about"')
  })

  test('should generate theme tools and useTheme composable', () => {
    const plugin = genMcpPlugin({
      enabled: true,
      tools: { navigation: false, theme: true, user: false, application: false }
    })

    const mockContext = {
      getFile: () => null,
      replaceFile: () => {}
    }

    const files = plugin.run.call(mockContext, mockSchema)

    const themeFile = files.find((f) => f.fileName === 'themeTools.ts')
    expect(themeFile).toBeDefined()
    expect(themeFile.fileContent).toContain('registerThemeTools')
    expect(themeFile.fileContent).toContain('change-theme-mode')

    const useThemeFile = files.find((f) => f.fileName === 'useTheme.ts')
    expect(useThemeFile).toBeDefined()
    expect(useThemeFile.path).toBe('./src/composables')
    expect(useThemeFile.fileContent).toContain('export function useTheme')
  })

  test('should generate user tools when user state exists', () => {
    const plugin = genMcpPlugin({
      enabled: true,
      tools: { navigation: false, theme: false, user: true, application: false }
    })

    const mockContext = {
      getFile: () => null,
      replaceFile: () => {}
    }

    const files = plugin.run.call(mockContext, mockSchema)

    const userFile = files.find((f) => f.fileName === 'userTools.ts')
    expect(userFile).toBeDefined()
    expect(userFile.fileContent).toContain('registerUserTools')
    expect(userFile.fileContent).toContain('user-login')
    expect(userFile.fileContent).toContain('useUserStore')
  })

  test('should not generate user tools when no user state exists', () => {
    const schemaWithoutUser = {
      ...mockSchema,
      globalState: [
        {
          id: 'products',
          state: { items: [] }
        }
      ]
    }

    const plugin = genMcpPlugin({
      enabled: true,
      tools: { navigation: false, theme: false, user: true, application: false }
    })

    const mockContext = {
      getFile: () => null,
      replaceFile: () => {}
    }

    const files = plugin.run.call(mockContext, schemaWithoutUser)

    const userFile = files.find((f) => f.fileName === 'userTools.ts')
    expect(userFile).toBeUndefined()
  })

  test('should generate application tools based on global state', () => {
    const plugin = genMcpPlugin({
      enabled: true,
      tools: { navigation: false, theme: false, user: false, application: true }
    })

    const mockContext = {
      getFile: () => null,
      replaceFile: () => {}
    }

    const files = plugin.run.call(mockContext, mockSchema)

    const appFile = files.find((f) => f.fileName === 'applicationTools.ts')
    expect(appFile).toBeDefined()
    expect(appFile.fileContent).toContain('registerApplicationTools')
    expect(appFile.fileContent).toContain('get-user-state')
    expect(appFile.fileContent).toContain('get-products-state')
    expect(appFile.fileContent).toContain('update-user-currentUser')
  })

  test('should modify App.vue with MCP integration', () => {
    const originalAppVue = `<script setup lang="ts">
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <div>{{ count }}</div>
</template>`

    const plugin = genMcpPlugin({ enabled: true })

    const mockContext = {
      getFile: () => ({ fileContent: originalAppVue }),
      replaceFile: (file) => {
        expect(file.fileName).toBe('App.vue')
        expect(file.fileContent).toContain('TinyRemoter')
        expect(file.fileContent).toContain('createMcpServer')
        expect(file.fileContent).toContain('WebMcpClient')
      }
    }

    plugin.run.call(mockContext, mockSchema)
  })

  test('should not modify App.vue if MCP already integrated', () => {
    const appVueWithMcp = `<script setup lang="ts">
import { TinyRemoter } from "@opentiny/next-remoter"
</script>

<template>
  <div>
    <TinyRemoter />
  </div>
</template>`

    const plugin = genMcpPlugin({ enabled: true })

    const mockContext = {
      getFile: () => ({ fileContent: appVueWithMcp }),
      replaceFile: (file) => {
        // Should not be called since MCP is already integrated
        expect(file.fileContent).toBe(appVueWithMcp)
      }
    }

    plugin.run.call(mockContext, mockSchema)
  })

  test('should modify main.ts to include MCP styles', () => {
    const originalMainTs = `import { createApp } from 'vue'
import './style.css'
import router from './router'
import App from './App.vue'

createApp(App).use(router).mount('#app')`

    const plugin = genMcpPlugin({ enabled: true })

    let modifiedMainTs = null
    const mockContext = {
      getFile: (path, fileName) => {
        if (fileName === 'main.ts') {
          return { fileName: 'main.ts', fileContent: originalMainTs }
        }
        return null
      },
      replaceFile: (file) => {
        if (file.fileName === 'main.ts') {
          modifiedMainTs = file.fileContent
        }
      }
    }

    plugin.run.call(mockContext, mockSchema)

    expect(modifiedMainTs).toContain("import '@opentiny/tiny-robot/dist/style.css'")
    expect(modifiedMainTs).toContain("import { createApp } from 'vue'")
  })

  test('should not modify main.ts if MCP styles already included', () => {
    const mainTsWithMcp = `import { createApp } from 'vue'
import '@opentiny/tiny-robot/dist/style.css'
import './style.css'
import router from './router'
import App from './App.vue'

createApp(App).use(router).mount('#app')`

    const plugin = genMcpPlugin({ enabled: true })

    let modifiedMainTs = null
    const mockContext = {
      getFile: (path, fileName) => {
        if (fileName === 'main.ts') {
          return { fileName: 'main.ts', fileContent: mainTsWithMcp }
        }
        return null
      },
      replaceFile: (file) => {
        if (file.fileName === 'main.ts') {
          modifiedMainTs = file.fileContent
        }
      }
    }

    plugin.run.call(mockContext, mockSchema)

    expect(modifiedMainTs).toBe(mainTsWithMcp)
  })

  test('should use custom configuration options', () => {
    const customConfig = {
      enabled: true,
      agentRoot: 'https://custom-agent.example.com/',
      sessionId: 'custom-session-123',
      capabilities: {
        tools: { listChanged: false }
      }
    }

    const plugin = genMcpPlugin(customConfig)

    const mockContext = {
      getFile: () => null,
      replaceFile: () => {}
    }

    const files = plugin.run.call(mockContext, mockSchema)

    const baseFile = files.find((f) => f.fileName === 'base.ts')
    expect(baseFile.fileContent).toContain('https://custom-agent.example.com/')
    expect(baseFile.fileContent).toContain('custom-session-123')
  })

  test('should handle empty schema gracefully', () => {
    const emptySchema = {
      pageSchema: [],
      globalState: [],
      dataSource: { list: [] }
    }

    const plugin = genMcpPlugin({ enabled: true })

    const mockContext = {
      getFile: () => null,
      replaceFile: () => {}
    }

    const files = plugin.run.call(mockContext, emptySchema)

    expect(Array.isArray(files)).toBe(true)
    expect(files.length).toBeGreaterThan(0)

    // Should still generate base files
    const baseFile = files.find((f) => f.fileName === 'base.ts')
    expect(baseFile).toBeDefined()
  })

  test('should generate correct MCP server imports based on enabled tools', () => {
    const plugin = genMcpPlugin({
      enabled: true,
      tools: { navigation: true, theme: true, user: false, application: false }
    })

    const mockContext = {
      getFile: () => null,
      replaceFile: () => {}
    }

    const files = plugin.run.call(mockContext, mockSchema)

    const serverFile = files.find((f) => f.fileName === 'server.ts')
    expect(serverFile.fileContent).toContain('registerNavigationTools')
    expect(serverFile.fileContent).toContain('registerThemeTools')
    expect(serverFile.fileContent).not.toContain('registerUserTools')
    expect(serverFile.fileContent).not.toContain('registerApplicationTools')
  })

  test('should generate TypeScript configuration files', () => {
    const plugin = genMcpPlugin({ enabled: true })

    const mockContext = {
      getFile: () => null,
      replaceFile: () => {}
    }

    const files = plugin.run.call(mockContext, mockSchema)

    // Check tsconfig.json
    const tsConfigFile = files.find((f) => f.fileName === 'tsconfig.json')
    expect(tsConfigFile).toBeDefined()
    expect(tsConfigFile.path).toBe('.')

    const tsConfig = JSON.parse(tsConfigFile.fileContent)
    expect(tsConfig.compilerOptions).toBeDefined()
    expect(tsConfig.compilerOptions.target).toBe('ES2020')
    expect(tsConfig.compilerOptions.jsx).toBe('preserve')
    expect(tsConfig.include).toContain('src/**/*.ts')
    expect(tsConfig.include).toContain('src/**/*.vue')

    // Check tsconfig.node.json
    const tsConfigNodeFile = files.find((f) => f.fileName === 'tsconfig.node.json')
    expect(tsConfigNodeFile).toBeDefined()
    expect(tsConfigNodeFile.path).toBe('.')

    const tsConfigNode = JSON.parse(tsConfigNodeFile.fileContent)
    expect(tsConfigNode.compilerOptions).toBeDefined()
    expect(tsConfigNode.compilerOptions.composite).toBe(true)
    expect(tsConfigNode.include).toContain('vite.config.ts')
  })

  test('should validate plugin configuration', () => {
    // Valid configuration should not throw
    expect(() =>
      genMcpPlugin({
        enabled: true,
        agentRoot: 'https://example.com',
        sessionId: 'test-session',
        tools: {
          navigation: true,
          theme: false
        }
      })
    ).not.toThrow()

    // Invalid enabled type should throw
    expect(() =>
      genMcpPlugin({
        enabled: 'true' // should be boolean
      })
    ).toThrow('enabled 必须是布尔值')

    // Invalid agentRoot type should throw
    expect(() =>
      genMcpPlugin({
        enabled: true,
        agentRoot: 123 // should be string
      })
    ).toThrow('agentRoot 必须是字符串')

    // Invalid URL format should throw
    expect(() =>
      genMcpPlugin({
        enabled: true,
        agentRoot: 'not-a-url'
      })
    ).toThrow('agentRoot 必须是有效的 URL')

    // Invalid tools configuration should throw
    expect(() =>
      genMcpPlugin({
        enabled: true,
        tools: {
          navigation: 'yes' // should be boolean
        }
      })
    ).toThrow('工具 navigation 的值必须是布尔值')

    // Invalid customTools should throw
    expect(() =>
      genMcpPlugin({
        enabled: true,
        customTools: 'not-array' // should be array
      })
    ).toThrow('customTools 必须是数组')

    // Invalid custom tool structure should throw
    expect(() =>
      genMcpPlugin({
        enabled: true,
        customTools: [
          { name: 'test' } // missing implementation
        ]
      })
    ).toThrow('自定义工具 0 必须有有效的 implementation 属性')
  })

  test('should show warnings for unknown tool types', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    genMcpPlugin({
      enabled: true,
      tools: {
        navigation: true,
        unknownTool: true // should generate warning
      }
    })

    expect(consoleSpy).toHaveBeenCalledWith('MCP 插件配置警告:', '未知的工具类型: unknownTool')

    consoleSpy.mockRestore()
  })

  test('should handle errors gracefully and continue generation', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Create a plugin that will cause an error during generation
    const plugin = genMcpPlugin({ enabled: true })

    let loggedErrors = []
    const mockContext = {
      getFile: () => null,
      replaceFile: () => {},
      addLog: (log) => {
        loggedErrors.push(log)
      }
    }

    // Mock schema that might cause issues
    const problematicSchema = {
      pageSchema: null, // This might cause issues
      globalState: undefined
    }

    // Should not throw, but return empty array on error
    const files = plugin.run.call(mockContext, problematicSchema)

    expect(Array.isArray(files)).toBe(true)

    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  test('should log errors when generation fails', () => {
    const plugin = genMcpPlugin({ enabled: true })

    let loggedErrors = []
    const mockContext = {
      getFile: () => {
        throw new Error('File access failed')
      },
      replaceFile: () => {},
      addLog: (log) => {
        loggedErrors.push(log)
      }
    }

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const files = plugin.run.call(mockContext, mockSchema)

    expect(files).toEqual([])
    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(loggedErrors.some((log) => log.type === 'error')).toBe(true)

    consoleErrorSpy.mockRestore()
  })

  test('should generate MCP tools with error handling', () => {
    const plugin = genMcpPlugin({
      enabled: true,
      tools: { navigation: true, theme: true, user: true, application: true }
    })

    const mockContext = {
      getFile: () => null,
      replaceFile: () => {}
    }

    const files = plugin.run.call(mockContext, mockSchema)

    // Check navigation tools have error handling
    const navFile = files.find((f) => f.fileName === 'navigationTools.ts')
    expect(navFile.fileContent).toContain('try {')
    expect(navFile.fileContent).toContain('} catch (error) {')
    expect(navFile.fileContent).toContain('导航失败：')

    // Check theme tools have error handling
    const themeFile = files.find((f) => f.fileName === 'themeTools.ts')
    expect(themeFile.fileContent).toContain('try {')
    expect(themeFile.fileContent).toContain('} catch (error) {')
    expect(themeFile.fileContent).toContain('主题切换失败：')

    // Check user tools have error handling
    const userFile = files.find((f) => f.fileName === 'userTools.ts')
    expect(userFile.fileContent).toContain('try {')
    expect(userFile.fileContent).toContain('} catch (error) {')
    expect(userFile.fileContent).toContain('登出失败：')

    // Check application tools have error handling
    const appFile = files.find((f) => f.fileName === 'applicationTools.ts')
    expect(appFile.fileContent).toContain('try {')
    expect(appFile.fileContent).toContain('} catch (error) {')
    expect(appFile.fileContent).toContain('状态失败：')
  })

  test('should generate App.vue with MCP server error handling', () => {
    const originalAppVue = `<script setup lang="ts">
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <div>{{ count }}</div>
</template>`

    const plugin = genMcpPlugin({ enabled: true })

    let modifiedAppVue = null
    const mockContext = {
      getFile: () => ({ fileContent: originalAppVue }),
      replaceFile: (file) => {
        if (file.fileName === 'App.vue') {
          modifiedAppVue = file.fileContent
        }
      }
    }

    plugin.run.call(mockContext, mockSchema)

    expect(modifiedAppVue).toContain('try {')
    expect(modifiedAppVue).toContain('} catch (error) {')
    expect(modifiedAppVue).toContain('MCP 服务器初始化失败')
    expect(modifiedAppVue).toContain('console.error')
  })
})
