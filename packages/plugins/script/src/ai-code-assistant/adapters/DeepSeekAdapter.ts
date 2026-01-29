/**
 * DeepSeek API Adapter
 */

import { DEEPSEEK_CONFIG, HTTP_CONFIG, ERROR_MESSAGES } from './constants'

export async function callDeepSeekAPI(
  prompt: string,
  suffix: string,
  config: any,
  apiKey: string,
  baseUrl: string
): Promise<string> {
  const completionsUrl = baseUrl.replace(DEEPSEEK_CONFIG.PATH_REPLACE, DEEPSEEK_CONFIG.COMPLETION_PATH) + '/completions'

  const requestBody = {
    model: config.model,
    prompt,
    suffix,
    max_tokens: config.maxTokens || DEEPSEEK_CONFIG.FIM.MAX_TOKENS,
    temperature: DEEPSEEK_CONFIG.DEFAULT_TEMPERATURE,
    top_p: DEEPSEEK_CONFIG.TOP_P,
    stream: HTTP_CONFIG.STREAM,
    stop: config.stopSequences
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
    throw new Error(`${ERROR_MESSAGES.REQUEST_FAILED} ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  return data?.choices?.[0]?.text || ''
}
