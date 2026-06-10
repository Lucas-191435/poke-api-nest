import { ApiProperty } from '@nestjs/swagger';

export class LeavePokemonDto {
    @ApiProperty({
        description: 'ID do usuário que deseja liberar o Pokémon',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    userId!: string;

    @ApiProperty({
        description: 'ID do Pokémon que será liberado',
        example: '456e7890-e12b-34d5-a678-526714174001',
    })
    pokemonId!: string;
}

