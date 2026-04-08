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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { ComponentsService } from './components.service';
import { CreateComponentDto } from './dto/create-component.dto';
import { UpdateComponentDto } from './dto/update-component.dto';
import { RenderRequestDto } from '../render/dto/render-request.dto';

@ApiTags('components')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('components')
export class ComponentsController {
  constructor(private componentsService: ComponentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a component' })
  create(@Body() dto: CreateComponentDto, @CurrentUser() user: User) {
    return this.componentsService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all components' })
  findAll() {
    return this.componentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a component by ID' })
  findOne(@Param('id') id: string) {
    return this.componentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a component' })
  update(@Param('id') id: string, @Body() dto: UpdateComponentDto) {
    return this.componentsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a component' })
  remove(@Param('id') id: string) {
    return this.componentsService.remove(id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a component' })
  duplicate(@Param('id') id: string) {
    return this.componentsService.duplicate(id);
  }

  @Post(':id/preview')
  @ApiOperation({ summary: 'Preview rendered component HTML' })
  async preview(@Param('id') id: string, @Body() dto: RenderRequestDto) {
    const component = await this.componentsService.findOne(id);
    const hbs = await this.componentsService.resolvePartials(
      component.htmlTemplate,
      dto.variables,
    );
    const html = this.componentsService.renderHtml(
      component,
      dto.variables,
      hbs,
    );
    return { html };
  }
}
