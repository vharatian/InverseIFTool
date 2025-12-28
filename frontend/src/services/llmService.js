import OpenAI from 'openai'

class LLMService {
  constructor() {
    this.currentProvider = null
    this.client = null
    this.defaultOptions = {}
  }

  /**
   * Configure the LLM service with provider settings
   * @param {Object} providerConfig - Provider configuration from backend
   */
  configureProvider(providerConfig) {
    this.currentProvider = providerConfig

    // Reset client and options
    this.client = null
    this.defaultOptions = {
      model: providerConfig.defaultModel || 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 1000,
    }

    // Configure based on provider type
    switch (providerConfig.provider) {
      case 'openai':
        this.configureOpenAI(providerConfig)
        break
      case 'anthropic':
        this.configureAnthropic(providerConfig)
        break
      case 'google':
        this.configureGoogle(providerConfig)
        break
      default:
        throw new Error(`Unsupported provider: ${providerConfig.provider}`)
    }
  }

  configureOpenAI(config) {
    // Get API key from backend config (now includes actual key)
    let apiKey = config.apiKey

    if (!apiKey) {
      // Fallback to environment variables if backend doesn't provide key
      apiKey = import.meta.env?.VITE_OPENAI_API_KEY
    }

    if (!apiKey) {
      throw new Error(
        'OpenAI API key not found. Please configure it in the backend provider settings.',
      )
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: config.baseUrl || 'https://api.openai.com/v1',
    })

    this.providerType = 'openai'
  }

  configureAnthropic(config) {
    // Placeholder for Anthropic configuration
    throw new Error('Anthropic provider not yet implemented')
  }

  configureGoogle(config) {
    // Placeholder for Google configuration
    throw new Error('Google provider not yet implemented')
  }

  /**
   * Generate a response using the configured LLM provider
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Additional options for the request
   * @returns {Promise<string>} - The LLM response
   */
  async generateResponse(prompt, options = {}) {
    if (!this.client) {
      throw new Error('LLM provider not configured. Please call configureProvider() first.')
    }

    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt is required and must be a string')
    }

    const completionOptions = {
      ...this.defaultOptions,
      ...options,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }

    try {
      let response

      switch (this.providerType) {
        case 'openai':
          const completion = await this.client.chat.completions.create(completionOptions)
          response = completion.choices[0]?.message?.content || ''
          break
        default:
          throw new Error(`Provider ${this.providerType} not implemented`)
      }

      return response
    } catch (error) {
      console.error('LLM Service Error:', error)
      throw new Error(`Failed to get LLM response: ${error.message}`)
    }
  }

  /**
   * Get current provider information
   * @returns {Object|null} - Current provider config or null
   */
  getCurrentProvider() {
    return this.currentProvider
  }

  /**
   * Check if the service is properly configured
   * @returns {boolean} - True if configured and ready to use
   */
  isConfigured() {
    return this.client !== null && this.currentProvider !== null
  }
}

// Create a singleton instance
const llmService = new LLMService()

export default LLMService
export { llmService }
