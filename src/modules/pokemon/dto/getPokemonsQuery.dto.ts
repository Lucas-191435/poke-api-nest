import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Region } from 'src/generated/prisma/enums';

export const POKEMON_TYPES = [
  'normal', 'fire', 'water', 'grass', 'electric', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
] as const;

// Aceita "fire,water" e também ?types=fire&types=water
const toList = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = Array.isArray(value) ? value : [value];
  const list = raw
    .flatMap((v) => String(v).split(','))
    .map((v) => v.trim())
    .filter(Boolean);
  return list.length > 0 ? list : undefined;
};

export class GetPokemonsQueryDto {
  @ApiPropertyOptional({ description: 'Número da página para paginação', type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Número de itens por página', type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Consulta de pesquisa' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Tipos de Pokémon (OR). Separados por vírgula ou repetidos',
    enum: POKEMON_TYPES,
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => toList({ value })?.map((v) => v.toLowerCase()))
  @IsArray()
  @IsIn(POKEMON_TYPES, { each: true })
  types?: string[];

  @ApiPropertyOptional({
    description: 'Regiões (OR). Separadas por vírgula ou repetidas',
    enum: Region,
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => toList({ value })?.map((v) => v.toUpperCase()))
  @IsArray()
  @IsEnum(Region, { each: true })
  regions?: Region[];
}
