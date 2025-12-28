import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from './config.service';
import type { LLMProviderConfig } from './config.service';

@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  getAllConfigs() {
    return this.configService.findAll();
  }

  @Get('active')
  getActiveConfig(): LLMProviderConfig | { error: string } {
    const config = this.configService.findActive();
    if (!config) {
      return { error: 'No active configuration found' };
    }
    return config;
  }

  @Get(':id')
  getConfigById(@Param('id') id: string): LLMProviderConfig {
    const config = this.configService.findOne(id);
    if (!config) {
      throw new HttpException('Configuration not found', HttpStatus.NOT_FOUND);
    }
    return config;
  }

  @Post()
  createConfig(
    @Body()
    configData: Omit<LLMProviderConfig, 'id' | 'createdAt' | 'updatedAt'>,
  ): LLMProviderConfig {
    return this.configService.create(configData);
  }

  @Put(':id')
  updateConfig(
    @Param('id') id: string,
    @Body() configData: Partial<Omit<LLMProviderConfig, 'id' | 'createdAt'>>,
  ): LLMProviderConfig {
    const updatedConfig = this.configService.update(id, configData);
    if (!updatedConfig) {
      throw new HttpException('Configuration not found', HttpStatus.NOT_FOUND);
    }
    return updatedConfig;
  }

  @Put(':id/activate')
  activateConfig(@Param('id') id: string): {
    success: boolean;
    message: string;
  } {
    const activated = this.configService.setActive(id);
    if (!activated) {
      throw new HttpException('Configuration not found', HttpStatus.NOT_FOUND);
    }
    return { success: true, message: 'Configuration activated successfully' };
  }

  @Delete(':id')
  deleteConfig(@Param('id') id: string): { success: boolean; message: string } {
    const deleted = this.configService.delete(id);
    if (!deleted) {
      throw new HttpException('Configuration not found', HttpStatus.NOT_FOUND);
    }
    return { success: true, message: 'Configuration deleted successfully' };
  }
}
