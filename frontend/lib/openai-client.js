import OpenAI from 'openai'

class OpenAIClient {
  constructor(config = {}) {
    // Get API key from environment variables
    let apiKey = config.apiKey
    if (!apiKey) {
      throw 'no apikey fount'
    }

    this.client = new OpenAI({
      apiKey,
      organization: config.organization,
      project: config.project,
      ...config.clientOptions,
      dangerouslyAllowBrowser: true,
    })

    this.defaultOptions = {
      model: config.model || 'gpt-4o-mini',
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens,
      ...config.defaultOptions,
    }
  }

  async createChatCompletion(messages, options = {}) {
    const completionOptions = {
      ...this.defaultOptions,
      ...options,
      messages,
    }

    try {
      const completion = await this.client.chat.completions.create(completionOptions)
      return completion
    } catch (error) {
      console.error('OpenAI API Error:', error)
      throw error
    }
  }

  async simpleChatCompletion(prompt, options = {}) {
    const messages = [
      {
        role: 'user',
        content: prompt,
      },
    ]

    const completion = await this.createChatCompletion(messages, options)
    return completion.choices[0]?.message?.content || ''
  }

  updateConfig(config) {
    if (config.apiKey) {
      this.client = new OpenAI({
        apiKey: config.apiKey,
        organization: config.organization || this.client.organization,
        project: config.project || this.client.project,
        dangerouslyAllowBrowser: true,
      })
    }

    if (config.model || config.temperature || config.maxTokens || config.defaultOptions) {
      this.defaultOptions = {
        ...this.defaultOptions,
        model: config.model || this.defaultOptions.model,
        temperature: config.temperature || this.defaultOptions.temperature,
        max_tokens: config.maxTokens,
        ...config.defaultOptions,
      }
    }
  }
}

// Create a default instance
const defaultClient = new OpenAIClient()

export default OpenAIClient
export { defaultClient as openaiClient }
