import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TemplateVariableDto {
  @ApiProperty({ example: 'firstName' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'First Name' })
  @IsString()
  label: string;

  @ApiProperty({ enum: ['string', 'number', 'boolean', 'date'] })
  @IsEnum(['string', 'number', 'boolean', 'date'])
  type: 'string' | 'number' | 'boolean' | 'date';

  @ApiProperty()
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
