import { expect, test, describe } from 'vitest'
import genMcpPlugin from '@/plugins/genMcpPlugin'
import { mcpAppSchemaBasic } from './mockData.js'
import fs from 'fs'
import path from 'path'

describe('Generate MCP Result Files', () => {
  test('should generate result files for comparison', () => {
    // 创建结果目录
    const resultDir = './test/testcases/mcp/result'
    if (!fs.existsSync(resultDir)) {
      fs.mkdirSync(resultDir, { recursive: true })
    }

    // 模拟上下文
    const mockContext = {
      getFile: (filePath, fileName) => {
        if (fileName === 'App.vue') {
          return {
            fileContent: `<script setup lang="ts">
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <div>{{ count }}</div>
</template>`
          }
        }
        if (fileName === 'main.ts') {
          return {
            fileName: 'main.ts',
            fileContent: `import { createApp } from 'vue'
import './style.css'
import router from './router'
import App from './App.vue'

createApp(App).use(router).mount('#app')`
          }
        }
        return null
      },
      replaceFile: (file) => {
        // 保存修改的文件
        const filePath = path.join(resultDir, file.fileName)
        fs.writeFileSync(filePath, file.fileContent, 'utf8')
        console.log(`Generated: ${file.fileName}`)
      }
    }

    // 生成 MCP 文件
    const plugin = genMcpPlugin({
      enabled: true,
      tools: {
        navigation: true,
        application: true
      }
    })

    const files = plugin.run.call(mockContext, mcpAppSchemaBasic)

    // 保存生成的文件
    files.forEach((file) => {
      const fileName = file.fileName
      const filePath = path.join(resultDir, fileName)

      // 创建子目录
      const dir = path.dirname(filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      fs.writeFileSync(filePath, file.fileContent, 'utf8')
      console.log(`Generated: ${fileName} at ${file.path}`)
    })

    expect(files.length).toBeGreaterThan(0)
    console.log('MCP result files generated successfully!')
  })
})
