import axios from 'axios';
import prismaClient from '../database';
import { Region } from 'src/generated/prisma/client';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BATCH_SIZE = 10;       // requisições simultâneas por batch
const BATCH_DELAY_MS = 1000; // espera entre batches (ms) para evitar rate-limit

// ---------------------------------------------------------------------------
// PokeAPI client
// ---------------------------------------------------------------------------

const PokeAPIClient = axios.create({
  baseURL: 'https://pokeapi.co/api/v2/',
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PokeListResponse = {
  data: {
    results: { name: string; url: string }[];
  };
};

type PokeDetailResponse = {
  data: {
    id: number;
    name: string;
    height: number;
    weight: number;
    abilities: { ability: { name: string } }[];
    types: { type: { name: string } }[];
    stats: { base_stat: number; stat: { name: string } }[];
    sprites: {
      versions: {
        'generation-v'?: {
          'black-white'?: {
            animated?: { front_default: string | null };
            front_default?: string | null;
          };
        };
      };
      other: {
        'official-artwork': { front_default: string | null };
      };
    };
  };
};

type PokemonRow = {
  pokeId: number;
  name: string;
  types: string;
  abilities: string;
  region: Region;
  height: number;
  weight: number;
  img1: string | null;
  img2: string | null;
  img3: string | null;
  hp: number;
  atk: number;
  def: number;
  spAtk: number;
  spDef: number;
  speed: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRegion(pokeId: number): Region {
  if (pokeId <= 151) return Region.KANTO;
  if (pokeId <= 251) return Region.JOHTO;
  if (pokeId <= 386) return Region.HOENN;
  if (pokeId <= 494) return Region.SINNOH;
  return Region.UNOVA;
}

function getStat(stats: PokeDetailResponse['data']['stats'], name: string): number {
  return stats.find((s) => s.stat.name === name)?.base_stat ?? 0;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchPokemonNames(offset: number, limit: number): Promise<string[]> {
  const res: PokeListResponse = await PokeAPIClient.get('pokemon', {
    params: { offset, limit },
  });
  return res.data.results.map((p) => p.name);
}

async function fetchPokemonDetail(name: string): Promise<PokemonRow> {
  const res: PokeDetailResponse = await PokeAPIClient.get(`pokemon/${name}`);
  const d = res.data;

  return {
    pokeId: d.id,
    name: d.name,
    types: JSON.stringify(d.types.map((t) => t.type.name)),
    abilities: JSON.stringify(d.abilities.map((a) => a.ability.name)),
    region: getRegion(d.id),
    height: d.height,
    weight: d.weight,
    img1: d.sprites.versions['generation-v']?.['black-white']?.animated?.front_default ?? null,
    img2: d.sprites.versions['generation-v']?.['black-white']?.front_default ?? null,
    img3: d.sprites.other['official-artwork']?.front_default ?? null,
    hp: getStat(d.stats, 'hp'),
    atk: getStat(d.stats, 'attack'),
    def: getStat(d.stats, 'defense'),
    spAtk: getStat(d.stats, 'special-attack'),
    spDef: getStat(d.stats, 'special-defense'),
    speed: getStat(d.stats, 'speed'),
  };
}

// Busca detalhes em batches de BATCH_SIZE com delay entre eles
async function fetchInBatches(names: string[]): Promise<PokemonRow[]> {
  const results: PokemonRow[] = [];

  for (let i = 0; i < names.length; i += BATCH_SIZE) {
    const batch = names.slice(i, i + BATCH_SIZE);
    console.log(`  → Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(names.length / BATCH_SIZE)} (${batch[0]} … ${batch[batch.length - 1]})`);

    const batchData = await Promise.all(batch.map(fetchPokemonDetail));
    results.push(...batchData);

    if (i + BATCH_SIZE < names.length) {
      await delay(BATCH_DELAY_MS);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Regions config
// ---------------------------------------------------------------------------

const REGIONS = [
  { name: 'Kanto', offset: 0,   limit: 151 },
  { name: 'Johto', offset: 151, limit: 100 },
  { name: 'Hoenn', offset: 251, limit: 135 },
  { name: 'Sinnoh', offset: 386, limit: 108 },
  { name: 'Unova', offset: 494, limit: 155 },
];

// ---------------------------------------------------------------------------
// Seed entry point
// ---------------------------------------------------------------------------

export async function seedInsertPokemon(): Promise<void> {
  for (const region of REGIONS) {
    console.log(`\n🌍 ${region.name} — buscando ${region.limit} pokémons...`);

    const names = await fetchPokemonNames(region.offset, region.limit);
    const rows = await fetchInBatches(names);

    console.log(`  💾 Inserindo ${rows.length} registros no banco...`);
    await prismaClient.pokemon.createMany({
      data: rows,
      skipDuplicates: true,
    });

    console.log(`  ✅ ${region.name} concluído.`);
  }
}
