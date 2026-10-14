import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ required: false, nullable: true, example: 'red' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  avatar?: string;

  @ApiProperty({ required: false, nullable: true, maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  description?: string;
}
