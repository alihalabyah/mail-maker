import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@mail-maker.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'changeme123' })
  @IsString()
  @MinLength(8)
  password: string;
}
