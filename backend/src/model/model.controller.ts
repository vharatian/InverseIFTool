import { Controller, Get, Param } from '@nestjs/common';
import { ModelService } from './model.service';
import type { ModelOptions } from './model.interface';

@Controller('models')
export class ModelController {
  constructor(private readonly modelService: ModelService) { }

  // GET /models -> all models
  @Get()
  getAllModels(): ModelOptions[] {
    return this.modelService.getAllModels();
  }

  // GET /models/:modelName -> specific model
  @Get(':modelName')
  getModel(@Param('modelName') modelName: 'testModel' | 'judgeModel'): ModelOptions {
    return this.modelService.getModelOptions(modelName);
  }
}
