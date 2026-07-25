import { IsString } from 'class-validator';

export class SelectLeadDto {
    @IsString()
    battlePokemonId!: string;
}
