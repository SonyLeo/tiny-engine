import { WebMcpServer } from '@opentiny/next-sdk'
import type { Router } from 'vue-router'
import { registerNavigationTools } from './tools/navigationTools'
import { registerApplicationTools } from './tools/applicationTools'

export function createMcpServer(router: Router, mcpServerConfig: any) {
  const server = new WebMcpServer(
    { name: 'business-app', version: '1.0.0' },
    { capabilities: mcpServerConfig.capabilities }
  )

  // 注册各类工具
  registerNavigationTools(server, router)
  registerApplicationTools(server)

  return server
}
