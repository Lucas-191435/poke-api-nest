import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  avatar!: string | null;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class FindUsersResponseDto {
  @ApiProperty()
  count!: number;

  @ApiProperty({ type: [UserResponseDto] })
  rows!: UserResponseDto[];
}

export class UserStatsDto {
  @ApiProperty({ description: 'Total de batalhas vencidas' })
  wins!: number;

  @ApiProperty({ description: 'Total de batalhas perdidas' })
  losses!: number;

  @ApiProperty({ description: 'Total de Pokémons capturados' })
  pokemonLength!: number;

  @ApiProperty({ description: 'Proporção de vitórias (0 a 1) sobre as batalhas finalizadas', example: 0.6667 })
  winRate!: number;
}

export class UserWithStatsResponseDto extends UserResponseDto {
  @ApiProperty({ type: UserStatsDto })
  stats!: UserStatsDto;
}
