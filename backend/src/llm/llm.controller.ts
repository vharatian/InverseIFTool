import { Controller, Post, Body, OnModuleInit } from '@nestjs/common';
import { LlmService } from './llm.service';
import { ConfigService } from '../config/config.service';

@Controller('llm')
export class LlmController implements OnModuleInit {
  constructor(
    private readonly llmService: LlmService,
    private readonly configService: ConfigService,
  ) { }

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
    console.log("llm prompt", prompt)

    try {
      const response = await this.llmService.generateResponse(prompt, options);
      return { response };
    } catch (error) {
      console.error(`[LLM Controller] Generate failed: ${error.message}`);
      throw error;
    }
  }

  @Post('generate-with-messages')
  async generateResponseWithMessages(
    @Body() body: { messages: any[]; options?: any },
  ) {
    const { messages, options } = body;
    console.log("llm_messages", messages)

    try {
      const response = await this.llmService.generateResponseWithMessages(
        messages,
        options,
      );
      return { response };
    } catch (error) {
      console.error(`[LLM Controller] Generate with messages failed: ${error.message}`);
      throw error;
    }
  }
}
