import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateComponentDto {
  @ApiProperty() @IsString() slug: string;
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() description?: string;
  @ApiProperty() designJson: Record<string, unknown>;
  @ApiProperty() @IsString() htmlTemplate: string;
  @ApiProperty({ required: false }) @IsArray() @IsOptional() variables?: unknown[];
}
