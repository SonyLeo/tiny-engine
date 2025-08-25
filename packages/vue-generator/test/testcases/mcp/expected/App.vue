<script setup lang="ts">
import { TinyRemoter } from '@opentiny/next-remoter'
import { WebMcpClient, createMessageChannelPairTransport } from '@opentiny/next-sdk'
import type { Transport } from '@opentiny/next-sdk'
import { AGENT_ROOT, SESSION_ID } from './base'
import { createMcpServer } from './mcp/server'
import { useRouter } from 'vue-router'
import { provide, onMounted } from 'vue'

import { ref } from 'vue'
const count = ref(0)

const router = useRouter()
const [serverTransport, clientTransport] = createMessageChannelPairTransport()

// 定义 MCP Server 的能力
const capabilities = {
  prompts: {
    listChanged: true
  },
  resources: {
    subscribe: true,
    listChanged: true
  },
  tools: {
    listChanged: true
  },
  completions: {},
  logging: {}
}

const mcpServer: {
  transport: Transport | null
  capabilities: Record<string, any>
} = {
  transport: serverTransport,
  capabilities
}

provide('mcpServer', mcpServer)

serverTransport.onerror = (error) => {
  console.error(`ServerTransport error:`, error)
}

const createProxyTransport = async () => {
  const client = new WebMcpClient(
    { name: 'mcp-web-client', version: '1.0.0' },
    {
      capabilities: {
        roots: { listChanged: true },
        sampling: {},
        elicitation: {}
      }
    }
  )
  // @ts-expect-error client
  window.client = client
  await client.connect(clientTransport)

  await client.connect({
    url: AGENT_ROOT + 'mcp',
    sessionId: SESSION_ID,
    agent: true,
    onError: (error: Error) => {
      console.error('Connect proxy error:', error)
    }
  })

  window.addEventListener('pagehide', client.onPagehide)
}

// 初始化MCP服务器
const initMcpServer = async () => {
  try {
    const server = createMcpServer(router, mcpServer)
    await server.connect(mcpServer.transport as Transport)
    console.log('MCP 服务器初始化成功')
  } catch (error) {
    console.error('MCP 服务器初始化失败:', error)
  }
}

onMounted(() => {
  createProxyTransport()
  initMcpServer()
})
</script>

<template>
  <div>{{ count }}</div>
  <TinyRemoter :sessionId="SESSION_ID" class="remoter" />
</template>

<style scoped>
.remoter {
  position: fixed;
  right: 2rem;
  bottom: 2rem;
  width: 50px;
  height: 50px;
  z-index: 1000;
}

@media (max-width: 768px) {
  .remoter {
    right: 1rem;
    bottom: 1rem;
    width: 40px;
    height: 40px;
  }
}

:deep(.next-sdk-trigger-btn) {
  font-size: 30px;
}
</style>
