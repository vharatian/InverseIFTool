import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix for API routes
  app.setGlobalPrefix('api');

  // Enable CORS for frontend communication
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests from localhost on common development ports
      const defaultOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
      ];

      // Add configured FRONTEND_URL if set
      if (process.env.FRONTEND_URL) {
        defaultOrigins.push(process.env.FRONTEND_URL);
      }

      // Add additional origins from ALLOWED_ORIGINS env var
      if (process.env.ALLOWED_ORIGINS) {
        const additionalOrigins = process.env.ALLOWED_ORIGINS.split(',').map(
          (url) => url.trim(),
        );
        defaultOrigins.push(...additionalOrigins);
      }

      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);

      if (defaultOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3002);
  console.log(
    `🚀 Backend server running on: http://localhost:${process.env.PORT ?? 3002}`,
  );
}
bootstrap();
