import { ApiProperty } from '@nestjs/swagger';

export class UpdatePokemonMovesDto {
    @ApiProperty({
        description: 'ID do Pokémon que deseja atualizar os movimentos',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    myPokemonId!: string;

    @ApiProperty({
        description: 'Nome do time que será atualizado',
        example: 'teamAlpha',
    })
    teamName!: 'teamAlpha' | 'teamBeta' | 'teamGamma';

    @ApiProperty({
        description: 'Lista de movimentos que serão atribuídos ao Pokémon',
        example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174002', '123e4567-e89b-12d3-a456-426614174003'],
    })
    moves!: string[];
}

