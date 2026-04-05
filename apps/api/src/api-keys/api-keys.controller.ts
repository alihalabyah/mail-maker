import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@ApiTags('api-keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api-keys')
export class ApiKeysController {
  constructor(private apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new API key (raw key returned once)' })
  create(@Body() dto: CreateApiKeyDto, @CurrentUser() user: User) {
    return this.apiKeysService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List your API keys' })
  findAll(@CurrentUser() user: User) {
    return this.apiKeysService.findAllForUser(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an API key' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.apiKeysService.remove(id, user.id);
  }
}
