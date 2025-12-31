import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { LlmController } from './llm.controller';
import { LlmGateway } from './llm.gateway';
import { ConfigModule } from '../config/config.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, AuthModule],
  providers: [LlmService, LlmGateway],
  controllers: [LlmController],
})
export class LlmModule {}
