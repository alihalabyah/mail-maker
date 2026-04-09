import { IsObject, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PreviewRequestDto {
  @ApiPropertyOptional({
    example: { firstName: 'John' },
    description: 'Key-value pairs for Handlebars variable substitution',
  })
  @IsObject()
  @IsOptional()
  variables?: Record<string, unknown>;
}
