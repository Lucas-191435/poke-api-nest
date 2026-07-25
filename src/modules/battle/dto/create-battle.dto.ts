import { IsString, MinLength } from 'class-validator';

export class CreateBattleDto {

    @IsString()
    teamName!: 'teamAlpha'|'teamBeta'|'teamGamma';
}
