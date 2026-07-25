import { IsString, MinLength } from 'class-validator';

export class JoinBattleDto {

    @IsString()
    teamName!: 'teamAlpha'|'teamBeta'|'teamGamma';
}
