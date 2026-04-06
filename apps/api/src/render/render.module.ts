import { Module } from '@nestjs/common';
import { RenderController } from './render.controller';
import { RenderService } from './render.service';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { MailerModule } from '../mailer/mailer.module';
import { ComponentsModule } from '../components/components.module';

@Module({
  imports: [ApiKeysModule, MailerModule, ComponentsModule],
  controllers: [RenderController],
  providers: [RenderService],
})
export class RenderModule {}
