import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'ash@poke.com' })
   @IsEmail()
  email!: string;
}



export class ResetPasswordResponseDto {
  @ApiProperty({ example: 'reset-token' })
  token!: string;
}
