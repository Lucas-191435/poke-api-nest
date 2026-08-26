import { ApiProperty } from '@nestjs/swagger';

export class ItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  pokeItemId!: number;

  @ApiProperty({ nullable: true })
  pokeCategoryId!: number | null;

  @ApiProperty({ nullable: true })
  pokeItemPocketId!: number | null;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  sprite!: string | null;

  @ApiProperty({ nullable: true })
  category!: string | null;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  effect!: string | null;

  @ApiProperty()
  isConsumable!: boolean;

  @ApiProperty()
  isHeldItem!: boolean;

  @ApiProperty()
  isBattleUse!: boolean;

  @ApiProperty()
  isDiscardable!: boolean;

  @ApiProperty()
  isPokemonUse!: boolean;

  @ApiProperty({ nullable: true })
  price!: number | null;

  @ApiProperty({ nullable: true })
  regions!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class FindItemsResponseDto {
  @ApiProperty()
  count!: number;

  @ApiProperty({ type: [ItemResponseDto] })
  rows!: ItemResponseDto[];
}
