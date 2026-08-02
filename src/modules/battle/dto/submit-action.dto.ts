import { IsString, IsOptional, IsIn } from 'class-validator';
import { BattleActionType } from 'src/generated/prisma/enums';

export class SubmitActionDto {
  @IsIn(['MOVE', 'SWITCH', 'ITEM', 'FORFEIT']) type!: BattleActionType;
  @IsOptional() @IsString() moveId?: string;
  @IsOptional() @IsString() targetPokemonId?: string;
  @IsOptional() @IsString() itemId?: string;
}