import { IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RenderRequestDto {
  @ApiProperty({
    example: { firstName: 'John', orderNumber: 'ORD-123' },
    description: 'Key-value pairs for Handlebars variable substitution',
  })
  @IsObject()
  variables: Record<string, unknown>;

  @ApiProperty({
    example: 'prod',
    description: 'Domain slug to render template from (e.g., prod, uat, dev)',
    required: true
  })
  @IsString()
  domainSlug: string;

  @ApiPropertyOptional({ example: 'en', enum: ['en', 'ar'], default: 'en' })
  @IsOptional()
  @IsString()
  locale?: string;
}
