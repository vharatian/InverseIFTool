import { Controller, Post, Body, OnModuleInit } from '@nestjs/common';
import { LlmService } from './llm.service';
import { ConfigService } from '../config/config.service';

@Controller('llm')
export class LlmController implements OnModuleInit {
  constructor(
    private readonly llmService: LlmService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Configure the LLM service with the active config on startup
    const config = this.configService.findActive();
    if (config && config.apiKey) {
      this.llmService.configureProvider(config);
    }
  }

  @Post('generate')
  async generateResponse(@Body() body: { prompt: string; options?: any }) {
    const { prompt, options } = body;
    const startTime = Date.now();

    console.log(`[LLM Controller] Generate request received:`, {
      promptLength: prompt?.length || 0,
      hasOptions: !!options,
      provider: options?.provider,
      model: options?.model,
    });

    try {
      const response = await this.llmService.generateResponse(prompt, options);
      const duration = Date.now() - startTime;

      console.log(`[LLM Controller] Generate completed:`, {
        duration: `${duration}ms`,
        responseLength: response.length,
        isEmpty: response.length === 0,
      });

      return { response };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[LLM Controller] Generate failed after ${duration}ms:`, {
        error: error.message,
        provider: options?.provider,
        model: options?.model,
      });
      throw error;
    }
  }

  @Post('generate-with-messages')
  async generateResponseWithMessages(
    @Body() body: { messages: any[]; options?: any },
  ) {
    const { messages, options } = body;
    const startTime = Date.now();

    console.log(`[LLM Controller] Generate with messages request received:`, {
      messagesCount: messages?.length || 0,
      hasSystemMessage: messages?.some(m => m.role === 'system') || false,
      hasOptions: !!options,
      provider: options?.provider,
      model: options?.model,
    });

    try {
      const response = await this.llmService.generateResponseWithMessages(
        messages,
        options,
      );
      const duration = Date.now() - startTime;

      console.log(`[LLM Controller] Generate with messages completed:`, {
        duration: `${duration}ms`,
        responseLength: response.length,
        isEmpty: response.length === 0,
      });

      return { response };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[LLM Controller] Generate with messages failed after ${duration}ms:`, {
        error: error.message,
        messagesCount: messages?.length,
        provider: options?.provider,
        model: options?.model,
      });
      throw error;
    }
  }
}
