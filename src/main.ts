import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const corsOrigin = configService.get<string>('CORS_ORIGIN');

  app.enableCors({
    // If CORS_ORIGIN is provided, split it; otherwise, allow all (or a specific default)
    origin: corsOrigin ? corsOrigin.split(',').map((o) => o.trim()) : true, // 'true' reflects the request origin, effectively allowing any
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Serve static files (uploads)
  app.use('/uploads', express.static(join(__dirname, 'uploads')));

  await app.listen(configService.get<number>('PORT') || 8000);
}
bootstrap();
