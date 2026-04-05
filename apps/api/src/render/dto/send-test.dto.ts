import { IsEmail, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendTestDto {
  @ApiProperty({ example: 'test@example.com' })
  @IsEmail()
  to: string;

  @ApiProperty({
    example: { firstName: 'John' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  variables?: Record<string, unknown>;
}
