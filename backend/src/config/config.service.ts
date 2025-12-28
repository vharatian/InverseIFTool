import { Injectable } from '@nestjs/common';

export interface LLMProviderConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  apiKey: string;
  baseUrl?: string;
  models: string[];
  defaultModel: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ConfigService {
  private config: LLMProviderConfig;

  constructor() {
    // Initialize config from environment variables
    this.config = this.loadConfigFromEnv();
  }

  private loadConfigFromEnv(): LLMProviderConfig {
    const provider = process.env.LLM_PROVIDER || 'openai';
    const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '';
    const baseUrl = process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
    const defaultModel = process.env.LLM_DEFAULT_MODEL || 'gpt-4o-mini';
    const modelsString =
      process.env.LLM_MODELS || 'gpt-4o-mini,gpt-4o,gpt-3.5-turbo';
    const models = modelsString.split(',').map((model) => model.trim());

    return {
      id: 'env-config',
      name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Provider`,
      provider: provider as 'openai' | 'anthropic' | 'google' | 'custom',
      apiKey,
      baseUrl,
      models,
      defaultModel,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  findAll(): LLMProviderConfig[] {
    // Return config without sensitive API key data
    return [
      {
        ...this.config,
        apiKey: this.config.apiKey ? '***' + this.config.apiKey.slice(-4) : '',
      },
    ];
  }

  findOne(id: string): LLMProviderConfig | undefined {
    return id === 'env-config' ? { ...this.config } : undefined;
  }

  findActive(): LLMProviderConfig | undefined {
    return { ...this.config };
  }

  // These methods are no-ops since config is read-only from env
  create(
    configData: Omit<LLMProviderConfig, 'id' | 'createdAt' | 'updatedAt'>,
  ): LLMProviderConfig {
    throw new Error('Configuration is read-only from environment variables');
  }

  update(
    id: string,
    configData: Partial<Omit<LLMProviderConfig, 'id' | 'createdAt'>>,
  ): LLMProviderConfig | null {
    throw new Error('Configuration is read-only from environment variables');
  }

  delete(id: string): boolean {
    throw new Error('Configuration is read-only from environment variables');
  }

  setActive(id: string): boolean {
    throw new Error('Configuration is read-only from environment variables');
  }

  // Method to reload config from environment (useful for testing)
  reloadConfig(): void {
    this.config = this.loadConfigFromEnv();
  }
}
