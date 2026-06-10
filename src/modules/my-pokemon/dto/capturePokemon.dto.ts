import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CapturePokemonDto {
    @ApiProperty()
    userId!: string;

    @ApiProperty()
    pokemonId!: string;

    @ApiProperty()
    nickname!: string;
}

