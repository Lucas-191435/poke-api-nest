import { ApiProperty } from '@nestjs/swagger';

export class MyPokemonSpeciesDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  pokeId!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  img1!: string | null;

  @ApiProperty({ nullable: true })
  types!: string | null;
}

export class MyPokemonDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  pokemonId!: string;

  @ApiProperty({ nullable: true })
  nickname!: string | null;

  @ApiProperty({ nullable: true })
  teamAlpha!: boolean | null;

  @ApiProperty({ nullable: true })
  teamBeta!: boolean | null;

  @ApiProperty({ nullable: true })
  teamGamma!: boolean | null;

  @ApiProperty()
  teamAlphaMove!: string[];

  @ApiProperty()
  teamBetaMove!: string[];

  @ApiProperty()
  teamGammaMove!: string[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class MyPokemonWithSpeciesDto extends MyPokemonDto {
  @ApiProperty({ type: MyPokemonSpeciesDto })
  pokemon!: MyPokemonSpeciesDto;
}

export class LeavePokemonResponseDto {
  @ApiProperty()
  message!: string;
}

export class UpdateTeamDetailsDto {
  @ApiProperty()
  removed!: number;

  @ApiProperty()
  added!: number;
}

export class UpdatePokemonTeamResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: UpdateTeamDetailsDto })
  details!: UpdateTeamDetailsDto;
}
