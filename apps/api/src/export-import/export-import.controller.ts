import {
  Controller,
  Get,
  Post,
  UseGuards,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { ExportImportService } from './export-import.service';
import { FileDownloadInterceptor } from './interceptors/file-download.interceptor';

@ApiTags('export-import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('export-import')
export class ExportImportController {
  constructor(private service: ExportImportService) {}

  @Get('templates/:id/export')
  @ApiOperation({ summary: 'Export template as JSON file' })
  @UseInterceptors(FileDownloadInterceptor)
  async exportTemplate(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.exportTemplate(id, user.email);
  }

  @Post('templates/import')
  @ApiOperation({ summary: 'Import template from JSON file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importTemplate(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    let data: any;
    try {
      data = JSON.parse(file.buffer.toString('utf-8'));
    } catch (err) {
      throw new BadRequestException('Invalid JSON file');
    }

    return this.service.importTemplate(data, user.id, {});
  }

  @Get('components/:id/export')
  @ApiOperation({ summary: 'Export component as JSON file' })
  @UseInterceptors(FileDownloadInterceptor)
  async exportComponent(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.exportComponent(id, user.email);
  }

  @Post('components/import')
  @ApiOperation({ summary: 'Import component from JSON file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importComponent(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    let data: any;
    try {
      data = JSON.parse(file.buffer.toString('utf-8'));
    } catch (err) {
      throw new BadRequestException('Invalid JSON file');
    }

    return this.service.importComponent(data, user.id, {});
  }
}
