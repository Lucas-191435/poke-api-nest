import { ApiProperty } from '@nestjs/swagger';

export class PokedexEntryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  number!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: [String] })
  types!: string[];

  @ApiProperty({ type: [String] })
  abilities!: string[];

  @ApiProperty({ nullable: true })
  region!: string | null;

  @ApiProperty({ nullable: true })
  height!: number | null;

  @ApiProperty({ nullable: true })
  weight!: number | null;

  @ApiProperty()
  img1!: string;

  @ApiProperty()
  img2!: string;

  @ApiProperty()
  img3!: string;
}

export class FindPokemonsResponseDto {
  @ApiProperty({ type: [PokedexEntryDto] })
  pokemon!: PokedexEntryDto[];

  @ApiProperty()
  count!: number;
}

export class PokemonDescriptionDto {
  @ApiProperty()
  version!: string;

  @ApiProperty()
  description!: string;
}

export class PokemonEvolutionDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  id!: number;

  @ApiProperty({ nullable: true })
  level!: number | null;
}

export class PokemonSpriteDto {
  @ApiProperty()
  label!: string;

  @ApiProperty()
  url!: string;
}

export class PokemonStatDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  value!: number;
}

export class PokemonDetailResponseDto extends PokedexEntryDto {
  @ApiProperty({ type: [PokemonDescriptionDto] })
  descriptions!: PokemonDescriptionDto[];

  @ApiProperty({ type: [PokemonEvolutionDto] })
  evolutionChain!: PokemonEvolutionDto[];

  @ApiProperty({ type: [PokemonSpriteDto] })
  sprites!: PokemonSpriteDto[];

  @ApiProperty({ type: [String] })
  regions!: string[];

  @ApiProperty({ type: [PokemonStatDto] })
  stats!: PokemonStatDto[];
}
