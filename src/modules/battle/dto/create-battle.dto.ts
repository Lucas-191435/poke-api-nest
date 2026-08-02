import { IsString } from 'class-validator';

export class CreateBattleDto {

    @IsString()
    teamName!: 'teamAlpha'|'teamBeta'|'teamGamma';
}
