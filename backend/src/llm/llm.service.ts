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
      max_tokens: 1000,
    };

    // Configure based on provider type
    switch (providerConfig.provider) {
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
        throw new Error(`Unsupported provider: ${providerConfig.provider}`);
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
    if (!this.client) {
      throw new Error(
        'LLM provider not configured. Please call configureProvider() first.',
      );
    }

    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt is required and must be a string');
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
    };

    try {
      let response: string;

      switch (this.providerType) {
        case 'openai': {
          const completion =
            await this.client.chat.completions.create(completionOptions);
          response = completion.choices[0]?.message?.content || '';
          break;
        }
        default:
          throw new Error(`Provider ${this.providerType} not implemented`);
      }

      return response;
    } catch (error) {
      console.error('LLM Service Error:', error);
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
    if (!this.client) {
      throw new Error(
        'LLM provider not configured. Please call configureProvider() first.',
      );
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('Messages array is required and must not be empty');
    }

    const completionOptions = {
      ...this.defaultOptions,
      ...options,
      messages,
    };

    try {
      let response: string;

      switch (this.providerType) {
        case 'openai': {
          const completion =
            await this.client.chat.completions.create(completionOptions);
          response = completion.choices[0]?.message?.content || '';
          break;
        }
        default:
          throw new Error(`Provider ${this.providerType} not implemented`);
      }

      return response;
    } catch (error) {
      console.error('LLM Service Error:', error);
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
