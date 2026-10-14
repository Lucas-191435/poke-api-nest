import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CapturePokemonDto {
    @ApiProperty()
    @IsString()
    pokemonId!: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    nickname!: string;
}
