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
  const normalizeOrigin = (origin: string) => origin.trim().replace(/\/+$/, '');
  const allowedOrigins = corsOrigin
    ? corsOrigin
      .split(',')
      .map((origin) => normalizeOrigin(origin))
      .filter(Boolean)
    : [];

  app.enableCors({
    // Normalize origins to avoid subtle mismatches like trailing slash differences.
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0) {
        callback(null, true);
        return;
      }

      const requestOrigin = normalizeOrigin(origin);
      const isAllowed = allowedOrigins.includes(requestOrigin);

      callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
    },
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
