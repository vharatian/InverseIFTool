import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { SeedService } from './seeders/seed.service';
import { User } from './users/user.entity';
import { LlmModule } from './llm/llm.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'database.sqlite',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // Set to false in production
      logging: process.env.NODE_ENV === 'development',
    }),
    TypeOrmModule.forFeature([User]),
    UsersModule,
    ConfigModule,
    AuthModule,
    LlmModule,
  ],
  controllers: [AppController],
  providers: [AppService, SeedService],
})
export class AppModule {}
