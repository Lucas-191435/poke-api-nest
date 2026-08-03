import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from 'src/common/auth/public.decorator';
import { Roles } from 'src/common/auth/roles.decorator';
import { Role } from 'src/generated/prisma/enums';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto, FindUsersResponseDto, UserWithStatsResponseDto } from './dto';

@ApiTags('user')
@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Lista paginada de usuários (admin)' })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'pageSize', required: false, type: String })
  @ApiQuery({ name: 'query', required: false, type: String, description: 'Busca por nome ou e-mail' })
  @ApiResponse({ status: 200, description: 'Usuários retornados com sucesso', type: FindUsersResponseDto })
  @ApiResponse({ status: 403, description: 'Apenas administradores podem listar usuários' })
  findUsers(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Query('query') query?: string,
  ) {
    return this.userService.findUsers({ page, pageSize, query });
  }

  @Get(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Detalhes de um usuário, incluindo estatísticas de batalha' })
  @ApiResponse({ status: 200, description: 'Usuário encontrado com sucesso', type: UserWithStatsResponseDto })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  findUser(@Param('id') id: string) {
    return this.userService.findUser(id);
  }

  @Public()
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Cria um usuário' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso', type: UserResponseDto })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado' })
  createUser(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto);
  }

  @Put(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Atualiza nome, descrição e avatar de um usuário' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado com sucesso', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.updateUser(id, dto);
  }

  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Deleta um usuário (admin)' })
  @ApiResponse({ status: 200, description: 'Usuário deletado com sucesso' })
  @ApiResponse({ status: 403, description: 'Apenas administradores podem deletar usuários' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }
}
