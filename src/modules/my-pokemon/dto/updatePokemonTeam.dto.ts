import { ApiProperty } from '@nestjs/swagger';

export class UpdatePokemonTeamDto {
    @ApiProperty({
        description: 'Nome do time que será atualizado',
        example: 'teamAlpha',
    })
    teamName!: 'teamAlpha' | 'teamBeta' | 'teamGamma';

    @ApiProperty({
        description: 'Lista de IDs dos Pokémons que farão parte do time',
        example: ['456e7890-e12b-34d5-a678-526714174001', '789e0123-e45b-67d8-a901-234567890123'],
    })
    team!: string[];
}

