import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../api-keys/guards/api-key.guard';
import { RenderService } from './render.service';
import { RenderRequestDto } from './dto/render-request.dto';
import { SendTestDto } from './dto/send-test.dto';
import { MailerService } from '../mailer/mailer.service';

@ApiTags('v1 (external API)')
@ApiHeader({
  name: 'X-API-Key',
  description: 'API key for external service authentication (or Authorization: Bearer <key>)',
  required: true,
})
@UseGuards(ApiKeyGuard)
@Controller('v1')
export class RenderController {
  constructor(
    private renderService: RenderService,
    private mailerService: MailerService,
  ) {}

  @Get('templates/:idOrSlug')
  @ApiOperation({ summary: 'Get template metadata and variable schema' })
  async getTemplate(@Param('idOrSlug') idOrSlug: string) {
    const template = await this.renderService.getTemplate(idOrSlug);
    const { designJson: _designJson, htmlTemplate: _html, ...meta } = template;
    return meta;
  }

  @Post('render/:idOrSlug')
  @ApiOperation({ summary: 'Render a template with variable substitution' })
  render(@Param('idOrSlug') idOrSlug: string, @Body() dto: RenderRequestDto) {
    return this.renderService.render(idOrSlug, dto.variables);
  }

  @Post('send-test/:idOrSlug')
  @HttpCode(200)
  @ApiOperation({ summary: 'Render a template and send it to a test email address (e.g. Mailpit)' })
  async sendTest(@Param('idOrSlug') idOrSlug: string, @Body() dto: SendTestDto) {
    const { html, subject } = await this.renderService.render(idOrSlug, dto.variables ?? {});
    await this.mailerService.sendMail({ to: dto.to, subject, html });
    return { ok: true, to: dto.to, subject };
  }
}
