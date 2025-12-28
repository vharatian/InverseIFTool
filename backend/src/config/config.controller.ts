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
  createConfig(): { error: string; message: string } {
    return {
      error: 'Configuration Read-Only',
      message:
        'LLM provider configuration is read from environment variables. Update your .env file to change settings.',
    };
  }

  @Put(':id')
  updateConfig(): { error: string; message: string } {
    return {
      error: 'Configuration Read-Only',
      message:
        'LLM provider configuration is read from environment variables. Update your .env file to change settings.',
    };
  }

  @Put(':id/activate')
  activateConfig(): { error: string; message: string } {
    return {
      error: 'Configuration Read-Only',
      message:
        'LLM provider configuration is read from environment variables. Only one configuration is supported.',
    };
  }

  @Delete(':id')
  deleteConfig(): { error: string; message: string } {
    return {
      error: 'Configuration Read-Only',
      message:
        'LLM provider configuration is read from environment variables and cannot be deleted.',
    };
  }
}
