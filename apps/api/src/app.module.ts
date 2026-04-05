import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TemplatesModule } from './templates/templates.module';
import { StorageModule } from './storage/storage.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { RenderModule } from './render/render.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    TemplatesModule,
    StorageModule,
    ApiKeysModule,
    RenderModule,
  ],
})
export class AppModule {}
