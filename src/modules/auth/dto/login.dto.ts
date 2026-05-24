import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'ash@poke.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  password!: string;
}


class UserResponseDto {
    @ApiProperty()
    id!: string;

    @ApiProperty({ nullable: true })
    avatar!: string | null;

    @ApiProperty()
    email!: string;

    @ApiProperty()
    name!: string;

    @ApiProperty()
    role!: string;
}

export class LoginResponseDto {
    @ApiProperty({ type: UserResponseDto })
    user!: UserResponseDto;

    @ApiProperty({ description: 'Token JWT de acesso' })
    token!: string;
}
