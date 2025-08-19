import { expect, test, describe } from 'vitest'
import { generateApp } from '@/generator/generateApp'

describe('MCP Integration Test', () => {
  const mockMcpSchema = {
    meta: {
      name: 'mcp-test-app',
      description: 'Test app with MCP integration'
    },
    pageSchema: [
      {
        componentName: 'HomePage',
        fileName: 'HomePage',
        css: '',
        lifeCycles: {},
        methods: {},
        props: {},
        state: [],
        meta: {
          id: 1,
          isHome: true,
          isPage: true,
          parentId: '0',
          rootElement: 'div',
          route: '/home',
          router: 'home',
          name: 'HomePage'
        },
        children: []
      },
      {
        componentName: 'ProductsPage',
        fileName: 'ProductsPage',
        css: '',
        lifeCycles: {},
        methods: {},
        props: {},
        state: [],
        meta: {
          id: 2,
          isHome: false,
          isPage: true,
          parentId: '0',
          rootElement: 'div',
          route: '/products',
          router: 'products',
          name: 'ProductsPage'
        },
        children: []
      }
    ],
    blockSchema: [],
    globalState: [
      {
        id: 'user',
        state: {
          currentUser: null,
          isLoggedIn: false,
          token: ''
        },
        actions: {
          login: { type: 'JSFunction', value: 'async function login(email, password) { return true; }' },
          logout: { type: 'JSFunction', value: 'function logout() { this.currentUser = null; }' }
        },
        getters: {}
      },
      {
        id: 'products',
        state: {
          items: [],
          cartItems: [],
          cartCount: 0
        },
        actions: {
          addToCart: { type: 'JSFunction', value: 'function addToCart(item) { this.cartItems.push(item); }' }
        },
        getters: {}
      }
    ],
    dataSource: {
      list: [
        { id: 1, name: 'userApi', data: { baseURL: '/api/user' } },
        { id: 2, name: 'productApi', data: { baseURL: '/api/products' } }
      ]
    },
    componentsMap: [
      {
        componentName: 'TinyButton',
        destructuring: true,
        exportName: 'Button',
        package: '@opentiny/vue',
        version: '^3.25.0'
      }
    ],
    i18n: {
      zh_CN: {
        'app.title': '测试应用'
      },
      en_US: {
        'app.title': 'Test App'
      }
    },
    utils: []
  }

  test('should generate complete MCP-enabled application', async () => {
    const mcpConfig = {
      enabled: true,
      agentRoot: 'https://test-agent.example.com/',
      sessionId: 'test-session-123',
      tools: {
        navigation: true,
        theme: true,
        user: true,
        application: true
      }
    }

    const instance = generateApp({
      pluginConfig: {
        mcp: mcpConfig
      }
    })

    const result = await instance.generate(mockMcpSchema)
    const { genResult } = result

    expect(Array.isArray(genResult)).toBe(true)
    expect(genResult.length).toBeGreaterThan(0)

    // Check for MCP-specific files
    const mcpFiles = genResult.filter(
      (file) => file.path.includes('mcp') || file.fileName === 'base.ts' || file.fileName === 'useTheme.ts'
    )

    expect(mcpFiles.length).toBeGreaterThan(0)

    // Verify base.ts exists
    const baseFile = genResult.find((f) => f.fileName === 'base.ts' && f.path === './src')
    expect(baseFile).toBeDefined()
    expect(baseFile.fileContent).toContain('test-agent.example.com')
    expect(baseFile.fileContent).toContain('test-session-123')

    // Verify MCP server file exists
    const serverFile = genResult.find((f) => f.fileName === 'server.ts' && f.path === './src/mcp')
    expect(serverFile).toBeDefined()
    expect(serverFile.fileContent).toContain('createMcpServer')
    expect(serverFile.fileContent).toContain('WebMcpServer')

    // Verify navigation tools
    const navFile = genResult.find((f) => f.fileName === 'navigationTools.ts')
    expect(navFile).toBeDefined()
    expect(navFile.fileContent).toContain('registerNavigationTools')
    expect(navFile.fileContent).toContain('"home", "products"')

    // Verify theme tools
    const themeFile = genResult.find((f) => f.fileName === 'themeTools.ts')
    expect(themeFile).toBeDefined()
    expect(themeFile.fileContent).toContain('registerThemeTools')

    // Verify user tools (should exist because user state is present)
    const userFile = genResult.find((f) => f.fileName === 'userTools.ts')
    expect(userFile).toBeDefined()
    expect(userFile.fileContent).toContain('registerUserTools')
    expect(userFile.fileContent).toContain('useUserStore')

    // Verify application tools
    const appFile = genResult.find((f) => f.fileName === 'applicationTools.ts')
    expect(appFile).toBeDefined()
    expect(appFile.fileContent).toContain('registerApplicationTools')
    expect(appFile.fileContent).toContain('get-user-state')
    expect(appFile.fileContent).toContain('get-products-state')

    // Verify useTheme composable
    const useThemeFile = genResult.find((f) => f.fileName === 'useTheme.ts')
    expect(useThemeFile).toBeDefined()
    expect(useThemeFile.path).toBe('./src/composables')

    // Verify App.vue is modified
    const appVueFile = genResult.find((f) => f.fileName === 'App.vue')
    expect(appVueFile).toBeDefined()
    expect(appVueFile.fileContent).toContain('TinyRemoter')
    expect(appVueFile.fileContent).toContain('createMcpServer')

    // Verify package.json includes MCP dependencies
    const packageFile = genResult.find((f) => f.fileName === 'package.json')
    expect(packageFile).toBeDefined()
    const packageContent = JSON.parse(packageFile.fileContent)

    expect(packageContent.dependencies).toHaveProperty('@opentiny/next-remoter')
    expect(packageContent.dependencies).toHaveProperty('@opentiny/next-sdk')
    expect(packageContent.dependencies).toHaveProperty('@opentiny/tiny-robot')
  })

  test('should generate minimal MCP integration when only navigation enabled', async () => {
    const minimalConfig = {
      enabled: true,
      tools: {
        navigation: true,
        theme: false,
        user: false,
        application: false
      }
    }

    const instance = generateApp({
      pluginConfig: {
        mcp: minimalConfig
      }
    })

    const result = await instance.generate(mockMcpSchema)
    const { genResult } = result

    // Should have base files and navigation tools only
    const navFile = genResult.find((f) => f.fileName === 'navigationTools.ts')
    expect(navFile).toBeDefined()

    const themeFile = genResult.find((f) => f.fileName === 'themeTools.ts')
    expect(themeFile).toBeUndefined()

    const userFile = genResult.find((f) => f.fileName === 'userTools.ts')
    expect(userFile).toBeUndefined()

    const appFile = genResult.find((f) => f.fileName === 'applicationTools.ts')
    expect(appFile).toBeUndefined()

    const useThemeFile = genResult.find((f) => f.fileName === 'useTheme.ts')
    expect(useThemeFile).toBeUndefined()
  })

  test('should not generate MCP files when disabled', async () => {
    const disabledConfig = {
      enabled: false
    }

    const instance = generateApp({
      pluginConfig: {
        mcp: disabledConfig
      }
    })

    const result = await instance.generate(mockMcpSchema)
    const { genResult } = result

    // Should not have any MCP-specific files
    const mcpFiles = genResult.filter(
      (file) =>
        file.path.includes('mcp') ||
        file.fileName === 'base.ts' ||
        (file.fileName === 'useTheme.ts' && file.path.includes('composables'))
    )

    expect(mcpFiles.length).toBe(0)

    // App.vue should not contain MCP integration
    const appVueFile = genResult.find((f) => f.fileName === 'App.vue')
    if (appVueFile) {
      expect(appVueFile.fileContent).not.toContain('TinyRemoter')
      expect(appVueFile.fileContent).not.toContain('createMcpServer')
    }
  })

  test('should handle schema without user state correctly', async () => {
    const schemaWithoutUser = {
      ...mockMcpSchema,
      globalState: [
        {
          id: 'products',
          state: { items: [] },
          actions: {},
          getters: {}
        }
      ]
    }

    const instance = generateApp({
      pluginConfig: {
        mcp: {
          enabled: true,
          tools: {
            navigation: true,
            theme: true,
            user: true,
            application: true
          }
        }
      }
    })

    const result = await instance.generate(schemaWithoutUser)
    const { genResult } = result

    // User tools should not be generated
    const userFile = genResult.find((f) => f.fileName === 'userTools.ts')
    expect(userFile).toBeUndefined()

    // But other tools should still be generated
    const navFile = genResult.find((f) => f.fileName === 'navigationTools.ts')
    expect(navFile).toBeDefined()

    const themeFile = genResult.find((f) => f.fileName === 'themeTools.ts')
    expect(themeFile).toBeDefined()

    const appFile = genResult.find((f) => f.fileName === 'applicationTools.ts')
    expect(appFile).toBeDefined()

    // MCP server should not import user tools
    const serverFile = genResult.find((f) => f.fileName === 'server.ts')
    expect(serverFile.fileContent).not.toContain('registerUserTools')
  })

  test('should generate correct file structure', async () => {
    const instance = generateApp({
      pluginConfig: {
        mcp: { enabled: true }
      }
    })

    const result = await instance.generate(mockMcpSchema)
    const { genResult } = result

    // Check file paths are correct
    const expectedFiles = [
      { fileName: 'base.ts', path: './src' },
      { fileName: 'server.ts', path: './src/mcp' },
      { fileName: 'navigationTools.ts', path: './src/mcp/tools' },
      { fileName: 'themeTools.ts', path: './src/mcp/tools' },
      { fileName: 'userTools.ts', path: './src/mcp/tools' },
      { fileName: 'applicationTools.ts', path: './src/mcp/tools' },
      { fileName: 'useTheme.ts', path: './src/composables' }
    ]

    expectedFiles.forEach((expected) => {
      const file = genResult.find((f) => f.fileName === expected.fileName && f.path === expected.path)
      expect(file).toBeDefined()
    })
  })
})
