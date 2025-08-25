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
        tools: { navigation: true, application: false }
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
        tools: { navigation: true, application: false }
      })

      const files = plugin.run.call(mockContext, { pageSchema })
      const navFile = files.find((f) => f.fileName === 'navigationTools.ts')

      expect(navFile).toBeDefined()
      expect(navFile.fileContent).toContain('"home", "about"')
    })

    test('should handle empty page schema', () => {
      const pageSchema = []

      const plugin = genMcpPlugin({
        enabled: true,
        tools: { navigation: true, application: false }
      })

      const files = plugin.run.call(mockContext, { pageSchema })
      const navFile = files.find((f) => f.fileName === 'navigationTools.ts')

      expect(navFile).toBeDefined()
      expect(navFile.fileContent).toContain('"home"') // Default route
    })
  })

  describe('Application Tools Generation', () => {
    test('should generate application tools based on global state', () => {
      const schema = {
        globalState: [
          {
            id: 'user',
            state: {
              currentUser: null,
              isLoggedIn: false
            }
          },
          {
            id: 'products',
            state: {
              items: [],
              loading: false
            }
          }
        ]
      }

      const plugin = genMcpPlugin({
        enabled: true,
        tools: { navigation: false, application: true }
      })

      const files = plugin.run.call(mockContext, schema)
      const appFile = files.find((f) => f.fileName === 'applicationTools.ts')

      expect(appFile).toBeDefined()
      expect(appFile.fileContent).toContain('export function registerApplicationTools')
      expect(appFile.fileContent).toContain('get-user-state')
      expect(appFile.fileContent).toContain('update-user-currentUser')
      expect(appFile.fileContent).toContain('get-products-state')
      expect(appFile.fileContent).toContain('update-products-items')
    })

    test('should handle empty global state', () => {
      const schema = {
        globalState: []
      }

      const plugin = genMcpPlugin({
        enabled: true,
        tools: { navigation: false, application: true }
      })

      const files = plugin.run.call(mockContext, schema)
      const appFile = files.find((f) => f.fileName === 'applicationTools.ts')

      expect(appFile).toBeDefined()
      expect(appFile.fileContent).toContain('export function registerApplicationTools')
    })
  })

  describe('MCP Server Generation', () => {
    test('should generate server with selective tools', () => {
      const plugin = genMcpPlugin({
        enabled: true,
        tools: { navigation: true, application: false }
      })

      const files = plugin.run.call(mockContext, {})
      const serverFile = files.find((f) => f.fileName === 'server.ts')

      expect(serverFile).toBeDefined()
      expect(serverFile.fileContent).toContain('import { registerNavigationTools }')
      expect(serverFile.fileContent).not.toContain('import { registerApplicationTools }')
      expect(serverFile.fileContent).toContain('registerNavigationTools(server, router)')
      expect(serverFile.fileContent).not.toContain('registerApplicationTools(server)')
    })

    test('should generate server with all supported tools enabled', () => {
      const plugin = genMcpPlugin({
        enabled: true,
        tools: { navigation: true, application: true }
      })

      const files = plugin.run.call(mockContext, {})
      const serverFile = files.find((f) => f.fileName === 'server.ts')

      expect(serverFile).toBeDefined()
      expect(serverFile.fileContent).toContain('import { registerNavigationTools }')
      expect(serverFile.fileContent).toContain('import { registerApplicationTools }')
      expect(serverFile.fileContent).toContain('registerNavigationTools(server, router)')
      expect(serverFile.fileContent).toContain('registerApplicationTools(server)')
    })
  })

  describe('Base Configuration Generation', () => {
    test('should generate base config with custom values', () => {
      const plugin = genMcpPlugin({
        enabled: true,
        agentRoot: 'https://custom-agent.example.com/',
        sessionId: 'custom-session-123'
      })

      const files = plugin.run.call(mockContext, {})
      const baseFile = files.find((f) => f.fileName === 'base.ts')

      expect(baseFile).toBeDefined()
      expect(baseFile.fileContent).toContain('https://custom-agent.example.com/')
      expect(baseFile.fileContent).toContain('custom-session-123')
      expect(baseFile.fileContent).toContain('export const AGENT_ROOT')
      expect(baseFile.fileContent).toContain('export const SESSION_ID')
    })
  })
})
