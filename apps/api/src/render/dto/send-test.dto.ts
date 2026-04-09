import { IsEmail, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendTestDto {
  @ApiProperty({ example: 'test@example.com' })
  @IsEmail()
  to: string;

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

  @ApiProperty({
    example: { firstName: 'John' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  variables?: Record<string, unknown>;
}
