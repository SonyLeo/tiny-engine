import { z } from '@opentiny/next-sdk'
import type { WebMcpServer } from '@opentiny/next-sdk'
import { useUserStore } from '../../stores/user'
import { useProductsStore } from '../../stores/products'

export function registerApplicationTools(server: WebMcpServer) {
  const userStore = useUserStore()

  server.registerTool(
    'get-user-state',
    {
      title: '获取User状态',
      description: '获取当前User的状态信息',
      inputSchema: {}
    },
    async () => {
      try {
        return {
          content: [
            {
              type: 'text',
              text: `User状态：${JSON.stringify(userStore.$state, null, 2)}`
            }
          ]
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `获取User状态失败：${error}`
            }
          ]
        }
      }
    }
  )

  server.registerTool(
    'update-user-currentUser',
    {
      title: '更新User的currentUser',
      description: '更新User状态中的currentUser属性',
      inputSchema: {
        value: z.any().describe('新的currentUser值')
      }
    },
    async ({ value }: { value: any }) => {
      try {
        userStore.currentUser = value
        return {
          content: [
            {
              type: 'text',
              text: `User的currentUser已更新为：${JSON.stringify(value)}`
            }
          ]
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `更新User的currentUser状态失败：${error}`
            }
          ]
        }
      }
    }
  )

  server.registerTool(
    'update-user-isLoggedIn',
    {
      title: '更新User的isLoggedIn',
      description: '更新User状态中的isLoggedIn属性',
      inputSchema: {
        value: z.any().describe('新的isLoggedIn值')
      }
    },
    async ({ value }: { value: any }) => {
      try {
        userStore.isLoggedIn = value
        return {
          content: [
            {
              type: 'text',
              text: `User的isLoggedIn已更新为：${JSON.stringify(value)}`
            }
          ]
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `更新User的isLoggedIn状态失败：${error}`
            }
          ]
        }
      }
    }
  )
  const productsStore = useProductsStore()

  server.registerTool(
    'get-products-state',
    {
      title: '获取Products状态',
      description: '获取当前Products的状态信息',
      inputSchema: {}
    },
    async () => {
      try {
        return {
          content: [
            {
              type: 'text',
              text: `Products状态：${JSON.stringify(productsStore.$state, null, 2)}`
            }
          ]
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `获取Products状态失败：${error}`
            }
          ]
        }
      }
    }
  )

  server.registerTool(
    'update-products-items',
    {
      title: '更新Products的items',
      description: '更新Products状态中的items属性',
      inputSchema: {
        value: z.any().describe('新的items值')
      }
    },
    async ({ value }: { value: any }) => {
      try {
        productsStore.items = value
        return {
          content: [
            {
              type: 'text',
              text: `Products的items已更新为：${JSON.stringify(value)}`
            }
          ]
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `更新Products的items状态失败：${error}`
            }
          ]
        }
      }
    }
  )

  server.registerTool(
    'update-products-cartCount',
    {
      title: '更新Products的cartCount',
      description: '更新Products状态中的cartCount属性',
      inputSchema: {
        value: z.any().describe('新的cartCount值')
      }
    },
    async ({ value }: { value: any }) => {
      try {
        productsStore.cartCount = value
        return {
          content: [
            {
              type: 'text',
              text: `Products的cartCount已更新为：${JSON.stringify(value)}`
            }
          ]
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `更新Products的cartCount状态失败：${error}`
            }
          ]
        }
      }
    }
  )
}
