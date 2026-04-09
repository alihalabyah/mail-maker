import {
  IsString,
  IsArray,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiKeyScope } from '@prisma/client';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Order Service' })
  @IsString()
  name: string;

  @ApiProperty({
    enum: ApiKeyScope,
    isArray: true,
    example: [ApiKeyScope.RENDER],
  })
  @IsArray()
  @IsEnum(ApiKeyScope, { each: true })
  scopes: ApiKeyScope[];

  @ApiPropertyOptional({ example: '2027-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
