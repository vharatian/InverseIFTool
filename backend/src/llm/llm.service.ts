import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService, LLMProviderConfig } from '../config/config.service';

@Injectable()
export class LlmService {
  private client: OpenAI | null = null;
  private currentProvider: LLMProviderConfig | null = null;
  private defaultOptions: any = {};

  constructor(private configService: ConfigService) {}

  /**
   * Get provider config by model name (assumes model format: provider/model)
   * @param model - Model name
   * @returns LLMProviderConfig | null
   */
  private getConfigByProvider(provider: string): LLMProviderConfig | null {
    const configs = this.configService.getFullAll();
    return configs.find((config) => config.provider === provider) || null;
  }

  /**
   * Configure the LLM service with provider settings
   * @param providerConfig - Provider configuration from config service
   */
  configureProvider(providerConfig: LLMProviderConfig) {
    this.currentProvider = providerConfig;

    // Reset client and options
    this.client = null;
    this.defaultOptions = {
      model: providerConfig.defaultModel || 'gpt-4o-mini',
      temperature: 0.7,
    };

    // Configure based on sdk type
    switch (providerConfig.sdk) {
      case 'openai':
        this.configureOpenAI(providerConfig);
        break;
      case 'anthropic':
        this.configureAnthropic(providerConfig);
        break;
      case 'google':
        this.configureGoogle(providerConfig);
        break;
      default:
        throw new Error(`Unsupported sdk: ${providerConfig.sdk}`);
    }
  }

  configureOpenAI(config: LLMProviderConfig) {
    // Get API key from config
    const apiKey = config.apiKey;

    if (!apiKey) {
      throw new Error(
        'OpenAI API key not found. Please configure it in the backend provider settings.',
      );
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: config.baseUrl || 'https://api.openai.com/v1',
    });

    this.providerType = 'openai';
  }

  configureAnthropic(_config: LLMProviderConfig) {
    // Placeholder for Anthropic configuration
    throw new Error('Anthropic provider not yet implemented');
  }

  configureGoogle(_config: LLMProviderConfig) {
    // Placeholder for Google configuration
    throw new Error('Google provider not yet implemented');
  }

  /**
   * Generate a response using the configured LLM provider
   * @param prompt - The prompt to send
   * @param options - Additional options for the request
   * @returns Promise<string> - The LLM response
   */
  async generateResponse(prompt: string, options: any = {}): Promise<string> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const model = options.model || this.defaultOptions.model;
    const provider = options.provider;

    console.log(`[LLM Service] ${requestId} Starting generation request:`, {
      provider,
      model,
      promptLength: prompt?.length || 0,
      promptPreview: prompt?.substring(0, 200) + (prompt?.length > 200 ? '...' : ''),
      options: { ...options, provider: '[REDACTED]' },
      timestamp: new Date().toISOString(),
    });

    if (!provider) {
      throw new Error('Provider must be specified in options');
    }

    const providerConfig = this.getConfigByProvider(provider);
    if (!providerConfig) {
      throw new Error(`No provider found for provider: ${provider}`);
    }

    if (!providerConfig.models.includes(model)) {
      throw new Error(`Model ${model} not available for provider ${provider}`);
    }

    // Remove provider from options as it's not a valid OpenAI parameter
    const { provider: _, ...clientOptions } = options;

    // Configure if not already configured for this provider
    if (
      !this.currentProvider ||
      this.currentProvider.id !== providerConfig.id
    ) {
      console.log(
        `[LLM Service] ${requestId} Configuring provider: ${providerConfig.provider}`,
      );
      this.configureProvider(providerConfig);
    }

    if (!this.client) {
      console.error(`[LLM Service] ${requestId} Client not configured after provider setup`);
      throw new Error(
        'LLM provider not configured. Please call configureProvider() first.',
      );
    }

    if (!prompt || typeof prompt !== 'string') {
      console.error(`[LLM Service] ${requestId} Invalid prompt:`, {
        prompt,
        type: typeof prompt,
      });
      throw new Error('Prompt is required and must be a string');
    }

    const completionOptions = {
      ...this.defaultOptions,
      ...clientOptions,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    try {
      let response: string;

      switch (this.providerType) {
        case 'openai': {
          console.log(`[LLM Service] ${requestId} Sending to OpenAI:`, {
            model,
            messagesCount: completionOptions.messages.length,
            temperature: completionOptions.temperature,
            maxTokens: completionOptions.max_tokens,
          });

          const completion =
            await this.client.chat.completions.create(completionOptions);

          response = completion.choices[0]?.message?.content || '';
          const finishReason = completion.choices[0]?.finish_reason;

          const duration = Date.now() - startTime;
          console.log(`[LLM Service] ${requestId} OpenAI response received:`, {
            responseLength: response.length,
            duration: `${duration}ms`,
            isEmpty: response.length === 0,
            finishReason,
            model,
            usage: completion.usage ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            } : undefined,
            timestamp: new Date().toISOString(),
          });

          if (!response) {
            console.warn(
              `[LLM Service] ${requestId} OpenAI returned empty response for ${model}`,
            );
          }

          break;
        }
        default:
          throw new Error(`Provider ${this.providerType} not implemented`);
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[LLM Service] ${requestId} API call failed after ${duration}ms:`, {
        error: error.message,
        provider,
        model,
        stack: error.stack?.split('\n')[0], // First line of stack trace
        timestamp: new Date().toISOString(),
      });
      throw new Error(`Failed to get LLM response: ${error.message}`);
    }
  }

  /**
   * Generate a response using the configured LLM provider with messages
   * @param messages - Array of message objects with role and content
   * @param options - Additional options for the request
   * @returns Promise<string> - The LLM response
   */
  async generateResponseWithMessages(
    messages: any[],
    options: any = {},
  ): Promise<string> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const provider = options.provider;

    // Log incoming request with message details
    console.log(`[LLM Service] ${requestId} Starting messages request:`, {
      provider: provider || this.currentProvider?.provider,
      messagesCount: messages?.length || 0,
      hasSystemMessage: messages?.some(m => m.role === 'system') || false,
      options: { ...options, provider: '[REDACTED]' },
      timestamp: new Date().toISOString(),
    });

    // Log system message if present
    const systemMessage = messages?.find(m => m.role === 'system');
    if (systemMessage) {
      console.log(`[LLM Service] ${requestId} System message:`, {
        length: systemMessage.content?.length || 0,
        preview: systemMessage.content?.substring(0, 300) + (systemMessage.content?.length > 300 ? '...' : ''),
      });
    }

    // Log user message content (truncated for readability)
    const userMessages = messages?.filter(m => m.role === 'user') || [];
    if (userMessages.length > 0) {
      console.log(`[LLM Service] ${requestId} User messages:`, {
        count: userMessages.length,
        totalLength: userMessages.reduce((sum, m) => sum + (m.content?.length || 0), 0),
        preview: userMessages[0].content?.substring(0, 500) + (userMessages[0].content?.length > 500 ? '...' : ''),
      });
    }

    if (provider) {
      const providerConfig = this.getConfigByProvider(provider);
      if (providerConfig) {
        // Reconfigure if different provider
        if (
          !this.currentProvider ||
          this.currentProvider.id !== providerConfig.id
        ) {
          console.log(
            `[LLM Service] ${requestId} Reconfiguring provider: ${providerConfig.provider}`,
          );
          this.configureProvider(providerConfig);
        }
      }
    }

    if (!this.client) {
      console.error(`[LLM Service] ${requestId} Client not configured`);
      throw new Error(
        'LLM provider not configured. Please call configureProvider() first.',
      );
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      console.error(`[LLM Service] ${requestId} Invalid messages array:`, {
        messages,
        isArray: Array.isArray(messages),
      });
      throw new Error('Messages array is required and must not be empty');
    }

    // Remove provider from options
    const { provider: _, ...clientOptions } = options;

    const completionOptions = {
      ...this.defaultOptions,
      ...clientOptions,
      messages,
    };

    try {
      let response: string;

      switch (this.providerType) {
        case 'openai': {
          console.log(`[LLM Service] ${requestId} Sending messages to OpenAI:`, {
            model: completionOptions.model,
            messagesCount: completionOptions.messages.length,
            temperature: completionOptions.temperature,
            maxTokens: completionOptions.max_tokens,
          });

          const completion =
            await this.client.chat.completions.create(completionOptions);

          response = completion.choices[0]?.message?.content || '';
          const finishReason = completion.choices[0]?.finish_reason;

          const duration = Date.now() - startTime;
          console.log(`[LLM Service] ${requestId} OpenAI response received:`, {
            responseLength: response.length,
            duration: `${duration}ms`,
            isEmpty: response.length === 0,
            finishReason,
            model: completionOptions.model,
            usage: completion.usage ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            } : undefined,
            responsePreview: response.substring(0, 200) + (response.length > 200 ? '...' : ''),
            timestamp: new Date().toISOString(),
          });

          if (!response) {
            console.warn(
              `[LLM Service] ${requestId} OpenAI returned empty response for evaluation`,
            );
          }

          break;
        }
        default:
          throw new Error(`Provider ${this.providerType} not implemented`);
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[LLM Service] ${requestId} Messages API call failed after ${duration}ms:`, {
        error: error.message,
        provider: this.currentProvider?.provider,
        messagesCount: messages.length,
        stack: error.stack?.split('\n')[0], // First line of stack trace
        timestamp: new Date().toISOString(),
      });
      throw new Error(`Failed to get LLM response: ${error.message}`);
    }
  }

  /**
   * Get current provider information
   * @returns LLMProviderConfig | null - Current provider config or null
   */
  getCurrentProvider(): LLMProviderConfig | null {
    return this.currentProvider;
  }

  /**
   * Check if the service is properly configured
   * @returns boolean - True if configured and ready to use
   */
  isConfigured(): boolean {
    return this.client !== null && this.currentProvider !== null;
  }

  private providerType: string = '';
}
