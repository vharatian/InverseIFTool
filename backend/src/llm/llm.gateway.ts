import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LlmService } from './llm.service';
import { ConfigService } from '../config/config.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  path: '/socket.io',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class LlmGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly llmService: LlmService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) { }

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;

    if (!token) {
      console.log(
        `[LLM WS] Connection rejected: no token provided for client ${client.id}`,
      );
      client.disconnect();
      return;
    }

    try {
      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token);
      // Store user info on socket for potential future use
      client.data.user = payload;
      console.log(
        `[LLM WS] Authenticated client connected: ${client.id} (user: ${payload.email})`,
      );
    } catch (error) {
      console.log(
        `[LLM WS] Connection rejected: invalid token for client ${client.id}`,
      );
      client.disconnect();
      return;
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`[LLM WS] Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('generate')
  async handleGenerate(
    @MessageBody() data: { id?: string; prompt: string; options?: any },
    @ConnectedSocket() client: Socket,
  ) {
    const { id, prompt, options } = data;
    const startTime = Date.now();

    console.log(`[LLM WS] Generate request from ${client.id}:`, {
      promptLength: prompt?.length || 0,
      hasOptions: !!options,
      provider: options?.provider,
      model: options?.model,
    });

    try {
      await this.llmService.generateResponseStream(prompt, options, client, id);
      const duration = Date.now() - startTime;
      console.log(
        `[LLM WS] Generate completed for ${client.id} in ${duration}ms`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[LLM WS] Generate failed for ${client.id} after ${duration}ms:`,
        error.message,
      );
      client.emit(
        'error',
        id ? { id, message: error.message } : { message: error.message },
      );
    }
  }

  @SubscribeMessage('generate-with-messages')
  async handleGenerateWithMessages(
    @MessageBody() data: { id?: string; messages: any[]; options?: any },
    @ConnectedSocket() client: Socket,
  ) {
    const { id, messages, options } = data;
    const startTime = Date.now();

    console.log(`[LLM WS] Generate with messages request from ${client.id}:`, {
      messagesCount: messages?.length || 0,
      hasSystemMessage: messages?.some((m) => m.role === 'system') || false,
      hasOptions: !!options,
      provider: options?.provider,
      model: options?.model,
    });

    try {
      await this.llmService.generateResponseWithMessagesStream(
        messages,
        options,
        client,
        id,
      );
      const duration = Date.now() - startTime;
      console.log(
        `[LLM WS] Generate with messages completed for ${client.id} in ${duration}ms`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[LLM WS] Generate with messages failed for ${client.id} after ${duration}ms:`,
        error.message,
      );
      client.emit(
        'error',
        id ? { id, message: error.message } : { message: error.message },
      );
    }
  }
}
