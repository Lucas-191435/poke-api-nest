import { Body, Controller, Post, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from 'src/common/auth/public.decorator';
import { LoginDto, LoginResponseDto, ResetPasswordDto, ResetPasswordResponseDto } from './dto';

@ApiTags('auth')
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login do usuário' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }


  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Resetar a senha do usuário' })
  @ApiResponse({ status: 200, description: 'Token de reset de senha enviado com sucesso', type: ResetPasswordResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email);
  }
}