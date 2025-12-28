import OpenAI from 'openai'

interface LLMProvider {
  baseUrl: string
  apiKey: string
  [key: string]: string
}

interface ChatCompletionOptions {
  model?: string
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  stop?: string | string[]
  provider?: LLMProvider
  [key: string]: any
}

/**
 * Get chat completion from OpenAI
 * @param options - Chat completion options (model, temperature, etc.)
 * @param prompt - The prompt text to send to the LLM
 * @returns Promise<string> - The text content of the response
 */
export async function getChatCompletion(
  prompt: string,
  options: ChatCompletionOptions = {},
): Promise<string> {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Prompt is required and must be a string')
  }

  const client = new OpenAI({
    apiKey: options.provider?.apiKey,
    baseURL: options.provider?.baseUrl,
    dangerouslyAllowBrowser: true,
  })

  const completionOptions: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
    model: options.model || 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 1000,
    top_p: options.top_p,
    frequency_penalty: options.frequency_penalty,
    presence_penalty: options.presence_penalty,
    stop: options.stop,
    ...options,
  }

  try {
    const completion = await client.chat.completions.create(completionOptions)
    const content = completion.choices[0]?.message?.content

    if (!content) {
      throw new Error('No content received from OpenAI API')
    }

    return content
  } catch (error) {
    console.error('OpenAI Chat Completion Error:', error)
    throw new Error(
      `Failed to get chat completion: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

/**
 * Get chat completion with full message array support
 * @param messages - Array of message objects with role and content
 * @param options - Chat completion options
 * @returns Promise<string> - The text content of the response
 */
export async function getChatCompletionWithMessages(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options: ChatCompletionOptions = {},
): Promise<string> {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Messages array is required and must not be empty')
  }

  const client = new OpenAI({
    apiKey: options.apiKey,
    organization: options.organization,
    project: options.project,
    baseURL: options.baseUrl,
    dangerouslyAllowBrowser: true,
  })

  const completionOptions: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
    model: options.model || 'gpt-4o-mini',
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 1000,
    top_p: options.top_p,
    frequency_penalty: options.frequency_penalty,
    presence_penalty: options.presence_penalty,
    stop: options.stop,
    ...options,
  }

  try {
    const completion = await client.chat.completions.create(completionOptions)
    const content = completion.choices[0]?.message?.content

    if (!content) {
      throw new Error('No content received from OpenAI API')
    }

    return content
  } catch (error) {
    console.error('OpenAI Chat Completion with Messages Error:', error)
    throw new Error(
      `Failed to get chat completion: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}
