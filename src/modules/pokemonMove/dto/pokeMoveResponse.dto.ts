import { ApiProperty } from '@nestjs/swagger';

export class PokemonMoveEntryDto {
  @ApiProperty()
  learn_method!: string;

  @ApiProperty()
  level!: number;

  @ApiProperty()
  id!: string;

  @ApiProperty()
  pokeMoveId!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  accuracy!: number | null;

  @ApiProperty({ nullable: true })
  power!: number | null;

  @ApiProperty({ nullable: true })
  pp!: number | null;

  @ApiProperty({ nullable: true })
  priority!: number | null;

  @ApiProperty({ nullable: true })
  type!: string | null;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  target!: string | null;

  @ApiProperty({ nullable: true })
  damage_class!: string | null;

  @ApiProperty({ nullable: true })
  effect!: string | null;

  @ApiProperty({ nullable: true })
  effect_chance!: number | null;

  @ApiProperty({ nullable: true })
  ailment!: string | null;

  @ApiProperty({ nullable: true })
  category!: string | null;

  @ApiProperty({ nullable: true })
  crit_rate!: number | null;

  @ApiProperty({ nullable: true })
  drain!: number | null;

  @ApiProperty({ nullable: true })
  flinch_chance!: number | null;

  @ApiProperty({ nullable: true })
  healing!: number | null;

  @ApiProperty({ nullable: true })
  min_hits!: number | null;

  @ApiProperty({ nullable: true })
  max_hits!: number | null;

  @ApiProperty({ nullable: true })
  min_turns!: number | null;

  @ApiProperty({ nullable: true })
  max_turns!: number | null;

  @ApiProperty({ nullable: true })
  stat_chance!: number | null;

  @ApiProperty({ nullable: true })
  stat_changes!: unknown;
}

export class GetPokemonMoveResponseDto {
  @ApiProperty({ nullable: true })
  name!: string | undefined;

  @ApiProperty({ type: [PokemonMoveEntryDto] })
  moves!: PokemonMoveEntryDto[];
}
