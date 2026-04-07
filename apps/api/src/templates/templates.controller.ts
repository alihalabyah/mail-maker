import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { RenderRequestDto } from '../render/dto/render-request.dto';
import { SendTestDto } from '../render/dto/send-test.dto';
import { MailerService } from '../mailer/mailer.service';

@ApiTags('templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('templates')
export class TemplatesController {
  constructor(
    private templatesService: TemplatesService,
    private mailerService: MailerService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new email template' })
  create(@Body() dto: CreateTemplateDto, @CurrentUser() user: User) {
    return this.templatesService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List templates' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templatesService.findAll(
      search,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a template by ID (includes designJson for editor)',
  })
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a template' })
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templatesService.update(id, dto);
  }

  @Post(':id/preview')
  @ApiOperation({
    summary: 'Preview a rendered template (JWT auth, for the UI)',
  })
  async preview(@Param('id') id: string, @Body() dto: RenderRequestDto) {
    const template = await this.templatesService.findOne(id);
    return await this.templatesService.preview(template, dto.variables);
  }

  @Post(':id/send-test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Render and send a test email (JWT auth, for the UI)',
  })
  async sendTest(@Param('id') id: string, @Body() dto: SendTestDto) {
    const template = await this.templatesService.findOne(id);
    const { html, subject } = await this.templatesService.preview(
      template,
      dto.variables ?? {},
    );
    await this.mailerService.sendMail({ to: dto.to, subject, html });
    return { ok: true, to: dto.to, subject };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a template' })
  remove(@Param('id') id: string) {
    return this.templatesService.remove(id);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish current draft as a new version' })
  publish(@Param('id') id: string, @CurrentUser() user: User) {
    return this.templatesService.publish(id, user.id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'List all published versions for a template' })
  listVersions(@Param('id') id: string) {
    return this.templatesService.listVersions(id);
  }

  @Post(':id/versions/:versionId/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a version back to draft' })
  restoreVersion(@Param('id') id: string, @Param('versionId') versionId: string) {
    return this.templatesService.restoreVersion(id, versionId);
  }
}
