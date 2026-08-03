import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'ash@poke.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'Ash Ketchum' })
  @IsString()
  name!: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
}
