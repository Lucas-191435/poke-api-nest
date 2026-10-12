import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { GetPokemonsQueryDto } from './dto/getPokemonsQuery.dto';
import { PokemonRepository } from './pokemon.repository';

describe('GetPokemonsQueryDto', () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true });
    const parse = (query: Record<string, unknown>) =>
        pipe.transform(query, { type: 'query', metatype: GetPokemonsQueryDto }) as Promise<GetPokemonsQueryDto>;

    it('normaliza types e regions separados por vírgula', async () => {
        const dto = await parse({ types: 'Fire, water', regions: 'kanto,JOHTO' });
        expect(dto.types).toEqual(['fire', 'water']);
        expect(dto.regions).toEqual(['KANTO', 'JOHTO']);
    });

    it('aceita parâmetros repetidos', async () => {
        const dto = await parse({ types: ['fire', 'water'], regions: ['HOENN'] });
        expect(dto.types).toEqual(['fire', 'water']);
        expect(dto.regions).toEqual(['HOENN']);
    });

    it('ignora filtros vazios e converte paginação', async () => {
        const dto = await parse({ page: '2', pageSize: '24', query: '', types: '', regions: '' });
        expect(dto.page).toBe(2);
        expect(dto.pageSize).toBe(24);
        expect(dto.types).toBeUndefined();
        expect(dto.regions).toBeUndefined();
    });

    it('rejeita tipo inválido', async () => {
        await expect(parse({ types: 'fire,banana' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejeita região inválida', async () => {
        await expect(parse({ regions: 'GALAR' })).rejects.toBeInstanceOf(BadRequestException);
    });
});

describe('PokemonRepository.getPokemons', () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const repository = new PokemonRepository({ pokemon: { findMany, count } } as any);

    beforeEach(() => jest.clearAllMocks());

    it('monta where com types (OR, match exato no JSON) e regions (in)', async () => {
        await repository.getPokemons({ query: 'char', types: ['fire', 'ice'], regions: ['KANTO', 'JOHTO'] });

        const { where } = findMany.mock.calls[0][0];
        expect(where).toEqual({
            AND: [
                { OR: [{ name: { contains: 'char' } }] },
                { OR: [{ types: { contains: '"fire"' } }, { types: { contains: '"ice"' } }] },
                { region: { in: ['KANTO', 'JOHTO'] } },
            ],
        });
        expect(count).toHaveBeenCalledWith({ where });
    });

    it('sem filtros não restringe o where', async () => {
        await repository.getPokemons({});
        expect(findMany.mock.calls[0][0].where).toEqual({ AND: undefined });
    });
});
