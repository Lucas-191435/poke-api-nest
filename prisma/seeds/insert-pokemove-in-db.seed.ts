import axios from 'axios';
import prismaClient from '../database';
import { LearnMethod } from 'src/generated/prisma/client';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const POKEMON_BATCH_SIZE = 5;    // pokémons processados em paralelo por batch
const BATCH_DELAY_MS = 3000;     // espera entre batches de pokémons (ms)
const DB_INSERT_BATCH_SIZE = 100; // relações inseridas por vez no banco

// ---------------------------------------------------------------------------
// PokeAPI client
// ---------------------------------------------------------------------------

const PokeAPIClient = axios.create({
  baseURL: 'https://pokeapi.co/api/v2/',
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

enum MoveLearnMethod {
  LEVEL_UP = 'level-up',
  MACHINE = 'machine',
  TUTOR = 'tutor',
  EGG = 'egg',
  UNKNOWN = 'unknown',
}

type PokemonMoveFromAPI = {
  move: { name: string; url: string };
  version_group_details: {
    level_learned_at: number;
    move_learn_method: { name: MoveLearnMethod; url: string };
    version_group: { name: string; url: string };
  }[];
};

type PokemonMoveInsert = {
  pokemonId: string;
  moveId: string;
  learn_method: LearnMethod;
  level: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapLearnMethod(apiMethod: MoveLearnMethod): LearnMethod {
  switch (apiMethod) {
    case MoveLearnMethod.LEVEL_UP: return LearnMethod.LEVEL_UP;
    case MoveLearnMethod.MACHINE:  return LearnMethod.MACHINE;
    case MoveLearnMethod.TUTOR:    return LearnMethod.TUTOR;
    case MoveLearnMethod.EGG:      return LearnMethod.EGG;
    default:                       return LearnMethod.UNKNOWN;
  }
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function getAllPokemonsFromDB() {
  return prismaClient.pokemon.findMany({
    select: { id: true, pokeId: true, name: true },
    orderBy: { pokeId: 'asc' },
  });
}

async function getMoveByName(moveName: string) {
  return prismaClient.move.findFirst({
    where: { name: moveName },
    select: { id: true, name: true },
  });
}

async function insertPokemonMovesBatch(moves: PokemonMoveInsert[]): Promise<number> {
  let totalCreated = 0;

  for (let i = 0; i < moves.length; i += DB_INSERT_BATCH_SIZE) {
    const batch = moves.slice(i, i + DB_INSERT_BATCH_SIZE);
    console.log(
      `    💾 Inserindo lote ${Math.floor(i / DB_INSERT_BATCH_SIZE) + 1}/${Math.ceil(moves.length / DB_INSERT_BATCH_SIZE)} (${batch.length} relações)`,
    );

    try {
      const result = await prismaClient.pokemonMove.createMany({
        data: batch,
        skipDuplicates: true,
      });
      totalCreated += result.count;
    } catch (err) {
      console.error(`    ⚠️  Erro no lote, continuando...`, err);
    }
  }

  return totalCreated;
}

// ---------------------------------------------------------------------------
// PokeAPI helpers
// ---------------------------------------------------------------------------

async function fetchPokemonMoves(pokeId: number): Promise<PokemonMoveFromAPI[]> {
  try {
    const res: { data: { moves: PokemonMoveFromAPI[] } } = await PokeAPIClient.get(
      `pokemon/${pokeId}`,
    );
    return res.data.moves;
  } catch (err) {
    console.error(`    ⚠️  Erro ao buscar moves do pokémon ${pokeId}:`, err);
    return [];
  }
}

async function processPokemon(
  pokemon: { id: string; pokeId: number; name: string },
): Promise<PokemonMoveInsert[]> {
  const apiMoves = await fetchPokemonMoves(pokemon.pokeId);
  const result: PokemonMoveInsert[] = [];

  for (const apiMove of apiMoves) {
    const dbMove = await getMoveByName(apiMove.move.name);
    if (!dbMove) continue;

    // Prefere black-2-white-2 / black-white; caso contrário usa o primeiro
    const detail =
      apiMove.version_group_details.find(
        (d) =>
          d.version_group.name === 'black-2-white-2' ||
          d.version_group.name === 'black-white',
      ) ?? apiMove.version_group_details[0];

    if (detail) {
      result.push({
        pokemonId: pokemon.id,
        moveId: dbMove.id,
        learn_method: mapLearnMethod(detail.move_learn_method.name),
        level: detail.level_learned_at ?? 0,
      });
    }
  }

  console.log(`    🔗 ${pokemon.name}: ${result.length} moves válidos`);
  return result;
}

// ---------------------------------------------------------------------------
// Seed entry point
// ---------------------------------------------------------------------------

export async function seedInsertPokemonMoves(): Promise<void> {
  console.log('📡 Buscando pokémons do banco...');
  const pokemons = await getAllPokemonsFromDB();

  if (pokemons.length === 0) {
    console.log('⚠️  Nenhum pokémon encontrado no banco. Execute seedInsertPokemon primeiro.');
    return;
  }

  console.log(`✅ ${pokemons.length} pokémons encontrados.\n`);

  const allMoves: PokemonMoveInsert[] = [];
  const totalBatches = Math.ceil(pokemons.length / POKEMON_BATCH_SIZE);

  for (let i = 0; i < pokemons.length; i += POKEMON_BATCH_SIZE) {
    const batch = pokemons.slice(i, i + POKEMON_BATCH_SIZE);
    const batchNum = Math.floor(i / POKEMON_BATCH_SIZE) + 1;

    console.log(
      `  → Batch ${batchNum}/${totalBatches} (${batch[0].name} … ${batch[batch.length - 1].name})`,
    );

    const batchResults = await Promise.all(batch.map(processPokemon));
    const flat = batchResults.flat();
    allMoves.push(...flat);

    console.log(`    Subtotal: ${flat.length} relações neste batch.\n`);

    if (i + POKEMON_BATCH_SIZE < pokemons.length) {
      await delay(BATCH_DELAY_MS);
    }
  }

  console.log(`\n💾 Total de relações coletadas: ${allMoves.length}. Inserindo no banco...`);
  const created = await insertPokemonMovesBatch(allMoves);
  console.log(`✅ ${created} relações pokemon-move inseridas com sucesso.`);
}
