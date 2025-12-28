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
  private configs: LLMProviderConfig[] = [];

  // Initialize with default OpenAI config if no configs exist
  private initializeDefaultConfig() {
    if (this.configs.length === 0) {
      const defaultConfig: LLMProviderConfig = {
        id: 'default-openai',
        name: 'Default OpenAI',
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY || '',
        baseUrl: 'https://api.openai.com/v1',
        models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
        defaultModel: 'gpt-4o-mini',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.configs.push(defaultConfig);
    }
  }

  findAll(): LLMProviderConfig[] {
    this.initializeDefaultConfig();
    // Return configs without sensitive data
    return this.configs.map((config) => ({
      ...config,
      apiKey: config.apiKey ? '***' + config.apiKey.slice(-4) : '',
    }));
  }

  findOne(id: string): LLMProviderConfig | undefined {
    this.initializeDefaultConfig();
    return this.configs.find((config) => config.id === id);
  }

  findActive(): LLMProviderConfig | undefined {
    this.initializeDefaultConfig();
    return this.configs.find((config) => config.isActive);
  }

  create(
    configData: Omit<LLMProviderConfig, 'id' | 'createdAt' | 'updatedAt'>,
  ): LLMProviderConfig {
    const config: LLMProviderConfig = {
      id: Date.now().toString(),
      ...configData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.configs.push(config);
    return config;
  }

  update(
    id: string,
    configData: Partial<Omit<LLMProviderConfig, 'id' | 'createdAt'>>,
  ): LLMProviderConfig | null {
    const configIndex = this.configs.findIndex((config) => config.id === id);
    if (configIndex === -1) return null;

    this.configs[configIndex] = {
      ...this.configs[configIndex],
      ...configData,
      updatedAt: new Date(),
    };
    return this.configs[configIndex];
  }

  delete(id: string): boolean {
    const configIndex = this.configs.findIndex((config) => config.id === id);
    if (configIndex === -1) return false;

    this.configs.splice(configIndex, 1);
    return true;
  }

  setActive(id: string): boolean {
    const config = this.configs.find((c) => c.id === id);
    if (!config) return false;

    // Set all configs to inactive, then activate the selected one
    this.configs.forEach((c) => (c.isActive = false));
    config.isActive = true;
    config.updatedAt = new Date();
    return true;
  }
}
