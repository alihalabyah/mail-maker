import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TemplateVariableDto } from './template-variable.dto';

export class CreateTemplateDto {
  @ApiProperty({ example: 'Welcome Email' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'welcome-email', description: 'URL-safe slug (lowercase, hyphens only)' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase alphanumeric with hyphens',
  })
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Welcome, {{firstName}}!' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Unlayer design JSON' })
  @IsObject()
  designJson: Record<string, unknown>;

  @ApiProperty({ description: 'Rendered HTML exported from the editor' })
  @IsString()
  htmlTemplate: string;

  @ApiProperty({ type: [TemplateVariableDto], default: [] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVariableDto)
  variables: TemplateVariableDto[];
}
