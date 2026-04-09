import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DomainsService } from './domains.service';

@ApiTags('domains')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('domains')
export class DomainsController {
  constructor(private service: DomainsService) {}

  @Get()
  @ApiOperation({ summary: 'List all domains' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get domain by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create domain' })
  create(@Body('name') name: string, @Body('description') description?: string) {
    return this.service.create(name, description);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update domain' })
  update(
    @Param('id') id: string,
    @Body('name') name?: string,
    @Body('description') description?: string,
  ) {
    return this.service.update(id, name, description);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete domain' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
