import { Injectable } from '@nestjs/common';
import { ModelOptions } from './model.interface';
import { YamlService } from '../utils/yaml.service'; import * as path from 'path';

@Injectable()
export class ModelService {
  private models: Record<string, ModelOptions>;

  constructor(private readonly yamlService: YamlService) {
    const filePath = path.join('config', 'models.yaml');
    const rawModels = this.yamlService.read<Record<string, ModelOptions>>(filePath);

    // Add model name into each ModelOptions
    this.models = Object.fromEntries(
      Object.entries(rawModels).map(([key, value]) => [key, { ...value, name: key }])
    );
    console.log(JSON.stringify(this.models, null, 2))
  }

  getModelOptions(modelName: 'testModel' | 'judgeModel'): ModelOptions {
    const model = this.models[modelName];
    if (!model) throw new Error(`Model "${modelName}" not found`);
    return model;
  }

  getAllModels(): ModelOptions[] {
    return Object.values(this.models);
  }
}
