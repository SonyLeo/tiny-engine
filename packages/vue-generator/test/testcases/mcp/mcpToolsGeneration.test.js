import { expect, test, describe } from 'vitest'
import genMcpPlugin from '@/plugins/genMcpPlugin'

describe('MCP Tools Generation', () => {
  const mockContext = {
    getFile: () => null,
    replaceFile: () => {}
  }

  describe('Navigation Tools Generation', () => {
    test('should generate valid navigation tools code', () => {
      const pageSchema = [
        { meta: { router: '/home' } },
        { meta: { router: '/about' } },
        { meta: { router: '/contact' } }
      ]

      const plugin = genMcpPlugin({
        enabled: true,
        tools: { navigation: true, theme: false, user: false, application: false }
      })

      const files = plugin.run.call(mockContext, { pageSchema })
      const navFile = files.find((f) => f.fileName === 'navigationTools.ts')

      expect(navFile).toBeDefined()
      expect(navFile.fileContent).toContain('import { z } from "@opentiny/next-sdk"')
      expect(navFile.fileContent).toContain('export function registerNavigationTools')
      expect(navFile.fileContent).toContain('server.registerTool')
      expect(navFile.fileContent).toContain('navigate-to-page')
      expect(navFile.fileContent).toContain('go-back')
      expect(navFile.fileContent).toContain('go-forward')
      expect(navFile.fileContent).toContain('get-current-route')
      expect(navFile.fileContent).toContain('"home", "about", "contact"')
    })

    test('should handle pages without router meta', () => {
      const pageSchema = [
        { meta: { router: '/home' } },
        { meta: {} }, // No router
        { meta: { router: '/about' } }
      ]

      const plugin = genMcpPlugin({
        enabled: true,
        tools: { navigation: true, theme: false, user: false, application: false }
      })

      const files = plugin.run.call(mockContext, { pageSchema })
      const navFile = files.find((f) => f.fileName === 'navigationTools.ts')

      expect(navFile.fileContent).toContain('"home", "about"')
      expect(navFile.fileContent).not.toContain('undefined')
    })

    test('should handle empty page schema', () => {
      const plugin = genMcpPlugin({
        enabled: true,
        tools: { navigation: true, theme: false, user: false, application: false }
      })

      const files = plugin.run.call(mockContext, { pageSchema: [] })
      const navFile = files.find((f) => f.fileName === 'navigationTools.ts')

      expect(navFile.fileContent).toContain('z.enum([')
      // Should have at least "home" as default when no pages are provided
      expect(navFile.fileContent).toContain('"home"')
    })
  })

  describe('Theme Tools Generation', () => {
    test('should generate valid theme tools code', () => {
      const plugin = genMcpPlugin({
        enabled: true,
        tools: { navigation: false, theme: true, user: false, application: false }
      })

      const files = plugin.run.call(mockContext, { pageSchema: [] })
      const themeFile = files.find((f) => f.fileName === 'themeTools.ts')

      expect(themeFile).toBeDefined()
      expect(themeFile.fileContent).toContain('import { z } from "@opentiny/next-sdk"')
      expect(themeFile.fileContent).toContain("import { useTheme } from '../../composables/useTheme'")
      expect(themeFile.fileContent).toContain('export function registerThemeTools')
      expect(themeFile.fileContent).toContain('change-theme-mode')
      expect(themeFile.fileContent).toContain('toggle-theme')
      expect(themeFile.fileContent).toContain('get-current-theme')
      expect(themeFile.fileContent).toContain('z.enum(["light", "dark", "auto"])')
    })

    test('should generate useTheme composable', () => {
      const plugin = genMcpPlugin({
        enabled: true,
        tools: { navigation: false, theme: true, user: false, application: false }
      })

      const files = plugin.run.call(mockContext, { pageSchema: [] })
      const useThemeFile = files.find((f) => f.fileName === 'useTheme.ts')

      expect(useThemeFile).toBeDefined()
      expect(useThemeFile.path).toBe('./src/composables')
      expect(useThemeFile.fileContent).toContain('export function useTheme')
      expect(useThemeFile.fileContent).toContain('type ThemeMode')
      expect(useThemeFile.fileContent).toContain('setTheme')
      expect(useThemeFile.fileContent).toContain('toggleTheme')
      expect(useThemeFile.fileContent).toContain('initTheme')
      expect(useThemeFile.fileContent).toContain('watchSystemTheme')
    })
  })

  describe('User Tools Generation', () => {
    test('should generate user tools when user state exists', () => {
      const schema = {
        globalState: [
          {
            id: 'user',
            state: { currentUser: null, isLoggedIn: false }
          }
        ]
      }

      const plugin = genMcpPlugin({
        enabled: true,
        tools: { navigation: false, theme: false, user: true, application: false }
      })

      const files = plugin.run.call(mockContext, schema)
      const userFile = files.find((f) => f.fileName === 'userTools.ts')

      expect(userFile).toBeDefined()
      expect(userFile.fileContent).toContain("import { useUserStore } from '../../stores/user'")
      expect(userFile.fileContent).toContain('export function registerUserTools')
      expect(userFile.fileContent).toContain('user-login')
      expect(userFile.fileContent).toContain('user-logout')
      expect(userFile.fileContent).toContain('get-user-info')
      expect(userFile.fileContent).toContain('update-user-profile')
    })

    test('should not generate user tools when no user state', () => {
      const schema = {
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

      const files = plugin.run.call(mockContext, schema)
      const userFile = files.find((f) => f.fileName === 'userTools.ts')

      expect(userFile).toBeUndefined()
    })

    test('should detect user state by various patterns', () => {
      const testCases = [
        { id: 'user', state: { name: 'test' } },
        { id: 'auth', state: { login: true } },
        { id: 'account', state: { user: {} } },
        { id: 'session', state: { userInfo: {} } }
      ]

      testCases.forEach((testCase) => {
        const schema = { globalState: [testCase] }
        const plugin = genMcpPlugin({
          enabled: true,
          tools: { user: true }
        })

        const files = plugin.run.call(mockContext, schema)
        const userFile = files.find((f) => f.fileName === 'userTools.ts')

        expect(userFile).toBeDefined()
      })
    })
  })

  describe('Application Tools Generation', () => {
    test('should generate application tools based on global state', () => {
      const schema = {
        globalState: [
          {
            id: 'products',
            state: {
              items: [],
              selectedItem: null,
              loading: false
            }
          },
          {
            id: 'cart',
            state: {
              items: [],
              total: 0
            }
          }
        ]
      }

      const plugin = genMcpPlugin({
        enabled: true,
        tools: { navigation: false, theme: false, user: false, application: true }
      })

      const files = plugin.run.call(mockContext, schema)
      const appFile = files.find((f) => f.fileName === 'applicationTools.ts')

      expect(appFile).toBeDefined()
      expect(appFile.fileContent).toContain('export function registerApplicationTools')
      expect(appFile.fileContent).toContain('get-products-state')
      expect(appFile.fileContent).toContain('get-cart-state')
      expect(appFile.fileContent).toContain('update-products-items')
      expect(appFile.fileContent).toContain('update-products-selectedItem')
      expect(appFile.fileContent).toContain('update-cart-items')
      expect(appFile.fileContent).toContain('update-cart-total')
    })

    test('should handle empty global state', () => {
      const schema = { globalState: [] }

      const plugin = genMcpPlugin({
        enabled: true,
        tools: { application: true }
      })

      const files = plugin.run.call(mockContext, schema)
      const appFile = files.find((f) => f.fileName === 'applicationTools.ts')

      expect(appFile).toBeDefined()
      expect(appFile.fileContent).toContain('export function registerApplicationTools')
      // Should have empty function body
      expect(appFile.fileContent).toMatch(/registerApplicationTools[^}]*\{\s*\}/)
    })
  })

  describe('MCP Server Generation', () => {
    test('should generate server with all tools enabled', () => {
      const schema = {
        globalState: [{ id: 'user', state: { name: 'test' } }]
      }

      const plugin = genMcpPlugin({
        enabled: true,
        tools: {
          navigation: true,
          theme: true,
          user: true,
          application: true
        }
      })

      const files = plugin.run.call(mockContext, schema)
      const serverFile = files.find((f) => f.fileName === 'server.ts')

      expect(serverFile).toBeDefined()
      expect(serverFile.fileContent).toContain('import { registerNavigationTools }')
      expect(serverFile.fileContent).toContain('import { registerThemeTools }')
      expect(serverFile.fileContent).toContain('import { registerUserTools }')
      expect(serverFile.fileContent).toContain('import { registerApplicationTools }')
      expect(serverFile.fileContent).toContain('registerNavigationTools(server, router)')
      expect(serverFile.fileContent).toContain('registerThemeTools(server)')
      expect(serverFile.fileContent).toContain('registerUserTools(server)')
      expect(serverFile.fileContent).toContain('registerApplicationTools(server)')
    })

    test('should generate server with selective tools', () => {
      const plugin = genMcpPlugin({
        enabled: true,
        tools: {
          navigation: true,
          theme: false,
          user: false,
          application: true
        }
      })

      const files = plugin.run.call(mockContext, { globalState: [] })
      const serverFile = files.find((f) => f.fileName === 'server.ts')

      expect(serverFile.fileContent).toContain('registerNavigationTools')
      expect(serverFile.fileContent).toContain('registerApplicationTools')
      expect(serverFile.fileContent).not.toContain('registerThemeTools')
      expect(serverFile.fileContent).not.toContain('registerUserTools')
    })
  })

  describe('Base Configuration Generation', () => {
    test('should generate base config with custom values', () => {
      const plugin = genMcpPlugin({
        enabled: true,
        agentRoot: 'https://custom.example.com/',
        sessionId: 'custom-session-456'
      })

      const files = plugin.run.call(mockContext, { pageSchema: [] })
      const baseFile = files.find((f) => f.fileName === 'base.ts')

      expect(baseFile).toBeDefined()
      expect(baseFile.fileContent).toContain('https://custom.example.com/')
      expect(baseFile.fileContent).toContain('custom-session-456')
      expect(baseFile.fileContent).toContain('export const AGENT_ROOT')
      expect(baseFile.fileContent).toContain('export const SESSION_ID')
    })
  })
})
