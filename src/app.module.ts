import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import * as Joi from 'joi';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { IconsModule } from './icons/icons.module';
import { CategoriesModule } from './categories/categories.module';
import { SubCategoriesModule } from './sub-categories/sub-categories.module';
import { TagsModule } from './tags/tags.module';
import { BundlesModule } from './bundles/bundles.module';
import { R2Module } from './r2/r2.module';

@Module({
  imports: [
    // ✅ Environment Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test', 'provision')
          .default('development'),

        PORT: Joi.number().default(8000),

        DATABASE_URL: Joi.string().required(),

        JWT_SECRET: Joi.string().required(),

        CORS_ORIGIN: Joi.string().default(
          'https://admin-flat-icons.vercel.app/',
        ),

        // R2 Configuration
        R2_ACCESS_KEY_ID: Joi.string().required(),
        R2_SECRET_ACCESS_KEY: Joi.string().required(),
        R2_ACCOUNT_ID: Joi.string().required(),
        R2_BUCKET_NAME: Joi.string().required(),
      }),
    }),

    // ✅ Database Connection (Neon PostgreSQL)
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        ssl: {
          rejectUnauthorized: false,
        },
        autoLoadEntities: true,
        synchronize:
          configService.get<string>('NODE_ENV') === 'development',
      }),
    }),

    // ✅ Static Files (Uploads Folder)
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads'),
      serveRoot: '/uploads',
    }),

    // ✅ Feature Modules
    AuthModule,
    UserModule,
    IconsModule,
    CategoriesModule,
    SubCategoriesModule,
    TagsModule,
    BundlesModule,
    R2Module,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
