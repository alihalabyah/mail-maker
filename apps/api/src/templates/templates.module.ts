import { Module } from '@nestjs/common';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { MailerModule } from '../mailer/mailer.module';
import { ComponentsModule } from '../components/components.module';

@Module({
  imports: [MailerModule, ComponentsModule],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
