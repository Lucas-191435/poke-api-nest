import { Injectable } from '@nestjs/common';
import { ItemsRepository } from './items.repository';

@Injectable()
export class ItemsService {
    constructor(
        private readonly itemsRepository: ItemsRepository,
    ) { }

      async getItems(params: {
        page: string;
        pageSize: string;
        query?: string;
        categoryId?: string;
    }) {
        const { page, pageSize, query, categoryId } = params;
        console.log('categoryId', categoryId)
        const pokeMove = await this.itemsRepository.getItems({
                query: query ? query : undefined,
                page: page ? parseInt(page) : 1,
                pokeItemPocketId: categoryId ? parseInt(categoryId) : undefined,
                pageSize: pageSize ? parseInt(pageSize) : 20,
            });

        return pokeMove
    }
}