import { Module } from '@nestjs/common';
import { ModelService } from './model.service';
import { YamlService } from '../utils/yaml.service';
import { ModelController } from './model.controller';

@Module({
  controllers: [ModelController],
  providers: [ModelService, YamlService],
  exports: [ModelService],
})
export class ModelModule { }
