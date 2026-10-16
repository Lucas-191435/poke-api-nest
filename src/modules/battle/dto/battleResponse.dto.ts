import { ApiProperty } from '@nestjs/swagger';

export class CreateOrJoinBattleResponseDto {
  @ApiProperty()
  id!: string;
}

export class JoinBattleBotResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  trainerId!: string;

  @ApiProperty()
  trainerName!: string;
}

export class DeleteAllBattlesResponseDto {
  @ApiProperty()
  count!: number;
}

export class CancelBattleResponseDto {
  @ApiProperty()
  id!: string;
}

export class BattleRoomPlayerDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;
}

export class BattleRoomDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['WAITING_OPPONENT', 'SELECTING_LEAD', 'IN_PROGRESS', 'FINISHED'] })
  status!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: BattleRoomPlayerDto })
  playerA!: BattleRoomPlayerDto;
}

export class FindBattleRoomsResponseDto {
  @ApiProperty({ type: [BattleRoomDto] })
  battles!: BattleRoomDto[];

  @ApiProperty()
  count!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}

export class BattleMoveDto {
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
  damage_class!: string | null;

  @ApiProperty({ nullable: true })
  ailment!: string | null;

  @ApiProperty({ nullable: true })
  target!: string | null;

  @ApiProperty({ nullable: true })
  crit_rate!: number | null;

  @ApiProperty({ nullable: true })
  effect_chance!: number | null;

  @ApiProperty({ nullable: true })
  stat_chance!: number | null;

  @ApiProperty({ nullable: true })
  stat_changes!: unknown;

  @ApiProperty({ nullable: true })
  healing!: number | null;

  @ApiProperty({ nullable: true })
  drain!: number | null;
}

export class BattlePokemonMoveDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  battlePokemonId!: string;

  @ApiProperty()
  moveId!: string;

  @ApiProperty()
  maxPp!: number;

  @ApiProperty()
  currentPp!: number;

  @ApiProperty({ type: BattleMoveDto })
  move!: BattleMoveDto;
}

export class BattlePokemonSpeciesDto {
  @ApiProperty()
  pokeId!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  img1!: string | null;

  @ApiProperty({ nullable: true })
  types!: string | null;
}

export class BattleMyPokemonDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  pokemonId!: string;

  @ApiProperty({ nullable: true })
  nickname!: string | null;

  @ApiProperty({ type: BattlePokemonSpeciesDto })
  pokemon!: BattlePokemonSpeciesDto;
}

export class BattlePokemonDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  battleParticipantId!: string;

  @ApiProperty()
  myPokemonId!: string;

  @ApiProperty()
  position!: number;

  @ApiProperty()
  maxHp!: number;

  @ApiProperty()
  currentHp!: number;

  @ApiProperty()
  atk!: number;

  @ApiProperty()
  def!: number;

  @ApiProperty()
  spAtk!: number;

  @ApiProperty()
  spDef!: number;

  @ApiProperty()
  speed!: number;

  @ApiProperty({ description: 'Estágios de status: atk, def, spAtk, spDef, speed, accuracy, evasion (-6 a 6)' })
  statStages!: unknown;

  @ApiProperty({ enum: ['NONE', 'PARALYZED', 'POISONED', 'BURNED', 'ASLEEP', 'FROZEN', 'CONFUSED'] })
  statusCondition!: string;

  @ApiProperty()
  statusCounter!: number;

  @ApiProperty()
  fainted!: boolean;

  @ApiProperty({ type: BattleMyPokemonDto })
  myPokemon!: BattleMyPokemonDto;

  @ApiProperty({ type: [BattlePokemonMoveDto] })
  moves!: BattlePokemonMoveDto[];
}

export class BattleParticipantDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  battleId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ description: "'teamAlpha' | 'teamBeta' | 'teamGamma'" })
  teamName!: string;

  @ApiProperty()
  activeSlot!: number;

  @ApiProperty({ enum: ['WAITING_ACTION', 'ACTION_SUBMITTED', 'WAITING_FORCED_SWITCH'] })
  turnState!: string;

  @ApiProperty({ nullable: true })
  pendingAction!: unknown;

  @ApiProperty()
  forfeited!: boolean;

  @ApiProperty()
  isBot!: boolean;

  @ApiProperty({ type: [BattlePokemonDto] })
  pokemons!: BattlePokemonDto[];
}

export class BattleTurnLogDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  battleId!: string;

  @ApiProperty()
  turnNumber!: number;

  @ApiProperty({ nullable: true })
  actorParticipantId!: string | null;

  @ApiProperty({ enum: ['MOVE', 'SWITCH', 'ITEM', 'FORFEIT'] })
  actionType!: string;

  @ApiProperty({ description: 'moveId, dano, efetividade, crítico, pokémon trocado, etc.' })
  payload!: unknown;

  @ApiProperty()
  createdAt!: Date;
}

export class BattleSnapshotResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['WAITING_OPPONENT', 'SELECTING_LEAD', 'IN_PROGRESS', 'FINISHED'] })
  status!: string;

  @ApiProperty()
  playerAId!: string;

  @ApiProperty({ nullable: true })
  playerBId!: string | null;

  @ApiProperty()
  turnNumber!: number;

  @ApiProperty({ nullable: true })
  winnerId!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: [BattleParticipantDto] })
  participants!: BattleParticipantDto[];

  @ApiProperty({ type: [BattleTurnLogDto] })
  turnLogs!: BattleTurnLogDto[];
}
