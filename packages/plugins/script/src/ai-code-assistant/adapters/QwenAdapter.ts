/**
 * Qwen API Adapter
 */

import { QWEN_CONFIG, HTTP_CONFIG, ERROR_MESSAGES } from './constants'

/**
 * Qwen FIM API (Completion)
 */
export async function callQwenFIM(fimPrompt: string, config: any, apiKey: string, baseUrl: string): Promise<string> {
  const completionsUrl = `${baseUrl}${QWEN_CONFIG.COMPLETION_PATH}`

  const requestBody = {
    model: config.model,
    prompt: fimPrompt,
    max_tokens: config.maxTokens,
    temperature: config.temperature || QWEN_CONFIG.DEFAULT_TEMPERATURE,
    top_p: config.top_p || QWEN_CONFIG.TOP_P,
    stream: HTTP_CONFIG.STREAM,
    stop: config.stopSequences,
    presence_penalty: QWEN_CONFIG.PRESENCE_PENALTY
  }

  const response = await fetch(completionsUrl, {
    method: HTTP_CONFIG.METHOD,
    headers: {
      'Content-Type': HTTP_CONFIG.CONTENT_TYPE,
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`${ERROR_MESSAGES.QWEN_API_ERROR} ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  return data?.choices?.[0]?.text || ''
}

/**
 * Qwen Chat API (用于 NES)
 */
export async function callQwenChat(messages: any[], config: any, apiKey: string, baseUrl: string): Promise<string> {
  const chatUrl = `${baseUrl}${QWEN_CONFIG.CHAT_PATH}`

  const requestBody = {
    model: config.model,
    messages,
    max_tokens: config.maxTokens,
    temperature: config.temperature || QWEN_CONFIG.DEFAULT_TEMPERATURE,
    top_p: config.top_p || QWEN_CONFIG.TOP_P,
    stream: HTTP_CONFIG.STREAM
  }

  const response = await fetch(chatUrl, {
    method: HTTP_CONFIG.METHOD,
    headers: {
      'Content-Type': HTTP_CONFIG.CONTENT_TYPE,
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`${ERROR_MESSAGES.QWEN_API_ERROR} ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  return data?.choices?.[0]?.message?.content || ''
}
