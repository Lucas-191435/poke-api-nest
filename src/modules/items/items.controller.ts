import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Public } from 'src/common/auth/public.decorator';
import { ItemsService } from './items.service';
import { Throttle } from '@nestjs/throttler';


@ApiTags('items')
@Controller("items")
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) { }


  @Get()
  @Throttle({
    default: {
      limit: 70,
      ttl: 60000,
    },
  })
  @ApiOperation({ summary: 'Lista paginada de items' })
  @ApiQuery({
    name: 'page',
    description: 'Número da página para paginação',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'pageSize',
    description: 'Número de itens por página',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'query',
    description: 'Consulta de pesquisa',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'categoryId',
    description: 'Consulta de pesquisa',
    required: false,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de Pokémon retornada com sucesso',
  })
  async getItems(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Query('query') query?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.itemsService.getItems({ page, pageSize, query, categoryId });
  }

}