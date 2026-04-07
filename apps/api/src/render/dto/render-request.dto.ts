import { IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RenderRequestDto {
  @ApiProperty({
    example: { firstName: 'John', orderNumber: 'ORD-123' },
    description: 'Key-value pairs for Handlebars variable substitution',
  })
  @IsObject()
  variables: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'en', enum: ['en', 'ar'], default: 'en' })
  @IsOptional()
  @IsString()
  locale?: string;
}
