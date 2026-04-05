import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RenderRequestDto {
  @ApiProperty({
    example: { firstName: 'John', orderNumber: 'ORD-123' },
    description: 'Key-value pairs for Handlebars variable substitution',
  })
  @IsObject()
  variables: Record<string, unknown>;
}
