import { Injectable } from '@nestjs/common';

export interface LLMProviderConfig {
  id: string;
  name: string;
  provider: string;
  sdk:
    | 'openai'
    | 'anthropic'
    | 'google'
    | 'custom';
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

  constructor() {
    // Initialize configs from environment variables
    this.configs = this.loadConfigsFromEnv();
  }

  private loadConfigsFromEnv(): LLMProviderConfig[] {
    const configs: LLMProviderConfig[] = [];

    // Load configs from LLM_PROVIDERS list
    const providersString = process.env.LLM_PROVIDERS || 'openai';
    const providers = providersString.split(',').map((p) => p.trim());

    for (const provider of providers) {
      const config = this.loadConfigFromEnv(provider);
      if (config) {
        configs.push(config);
      }
    }

    // If no configs loaded, load default
    if (configs.length === 0) {
      const defaultConfig = this.loadConfigFromEnv();
      if (defaultConfig) {
        configs.push(defaultConfig);
      }
    }

    return configs;
  }

  private loadConfigFromEnv(provider?: string): LLMProviderConfig | null {
    const prov = provider || process.env.LLM_PROVIDER || 'openai';
    const prefix = provider ? `LLM_${prov.toUpperCase()}` : 'LLM';
    const apiKeyEnv = provider ? `${prefix}_API_KEY` : 'LLM_API_KEY';
    const baseUrlEnv = `${prefix}_BASE_URL`;
    const defaultModelEnv = `${prefix}_DEFAULT_MODEL`;
    const modelsEnv = `${prefix}_MODELS`;
    const sdkEnv = `${prefix}_SDK`;

    const apiKey =
      process.env[apiKeyEnv] ||
      (prov === 'openai' ? process.env.OPENAI_API_KEY : '') ||
      '';
    if (!apiKey) {
      console.warn(`No API key found for provider ${prov}`);
      return null;
    }

    const baseUrl =
      process.env[baseUrlEnv] ||
      (prov === 'openai' ? 'https://api.openai.com/v1' : '');
    const defaultModel =
      process.env[defaultModelEnv] || (prov === 'openai' ? 'gpt-4o-mini' : '');
    const modelsString =
      process.env[modelsEnv] ||
      (prov === 'openai' ? 'gpt-4o-mini,gpt-4o,gpt-3.5-turbo' : '');
    const models = modelsString.split(',').map((model) => model.trim());
    const sdk = (process.env[sdkEnv] || 'openai') as
      | 'openai'
      | 'anthropic'
      | 'google'
      | 'custom';

    return {
      id: `${prov}-config`,
      name: `${prov.charAt(0).toUpperCase() + prov.slice(1)} Provider`,
      provider: prov,
      sdk,
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
    // Return configs without sensitive API key data
    return this.configs.map((config) => ({
      ...config,
      apiKey: config.apiKey ? '***' + config.apiKey.slice(-4) : '',
    }));
  }

  findOne(id: string): LLMProviderConfig | undefined {
    return this.configs.find((config) => config.id === id);
  }

  findActive(): LLMProviderConfig | undefined {
    return this.configs.find((config) => config.isActive) || this.configs[0];
  }

  findProviderForModel(model: string): LLMProviderConfig | undefined {
    return this.configs.find((config) => config.models.includes(model));
  }

  getFullAll(): LLMProviderConfig[] {
    return this.configs;
  }

  getAllModels(): string[] {
    const allModels: string[] = [];
    for (const config of this.configs) {
      allModels.push(...config.models);
    }
    return [...new Set(allModels)]; // Remove duplicates
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

  // Method to reload configs from environment (useful for testing)
  reloadConfig(): void {
    this.configs = this.loadConfigsFromEnv();
  }
}
