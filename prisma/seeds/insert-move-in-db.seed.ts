import axios from 'axios';
import prismaClient from '../database';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const LIST_PAGE_SIZE = 100;    // moves por página na listagem
const LIST_DELAY_MS = 500;     // delay entre páginas da listagem
const DETAIL_BATCH_SIZE = 10;  // moves buscados em paralelo por batch
const DETAIL_DELAY_MS = 2000;  // delay entre batches de detalhe
const DB_BATCH_SIZE = 50;      // moves inseridos por vez no banco

// ---------------------------------------------------------------------------
// PokeAPI client
// ---------------------------------------------------------------------------

const PokeAPIClient = axios.create({
  baseURL: 'https://pokeapi.co/api/v2/',
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MoveRef = { name: string; url: string };

type MoveDetail = {
  id: number;
  name: string;
  accuracy: number | null;
  power: number | null;
  pp: number;
  priority: number;
  effect_chance: number | null;
  damage_class: { name: string } | null;
  type: { name: string } | null;
  target: { name: string } | null;
  effect_entries: { effect: string; short_effect: string; language: { name: string } }[];
  stat_changes: { change: number; stat: { name: string } }[];
  meta: {
    ailment: { name: string } | null;
    category: { name: string } | null;
    crit_rate: number;
    drain: number;
    flinch_chance: number;
    healing: number;
    min_hits: number | null;
    max_hits: number | null;
    min_turns: number | null;
    max_turns: number | null;
    stat_chance: number;
  } | null;
};

type MoveRow = {
  pokeMoveId: number;
  name: string;
  accuracy: number | null;
  power: number | null;
  pp: number;
  priority: number;
  type: string | null;
  description: string | null;
  target: string | null;
  damage_class: string | null;
  effect: string | null;
  effect_chance: number | null;
  ailment: string | null;
  category: string | null;
  crit_rate: number;
  drain: number;
  flinch_chance: number;
  healing: number;
  min_hits: number | null;
  max_hits: number | null;
  min_turns: number | null;
  max_turns: number | null;
  stat_chance: number;
  stat_changes: { stat: string; change: number }[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function transformMove(move: MoveDetail): MoveRow {
  const englishEffect = move.effect_entries?.find((e) => e.language?.name === 'en');

  return {
    pokeMoveId: move.id,
    name: move.name,
    accuracy: move.accuracy ?? null,
    power: move.power ?? null,
    pp: move.pp,
    priority: move.priority,
    type: move.type?.name ?? null,
    description: englishEffect?.short_effect ?? null,
    target: move.target?.name ?? null,
    damage_class: move.damage_class?.name ?? null,
    effect: englishEffect?.effect ?? null,
    effect_chance: move.effect_chance ?? null,
    ailment: move.meta?.ailment?.name ?? null,
    category: move.meta?.category?.name ?? null,
    crit_rate: move.meta?.crit_rate ?? 0,
    drain: move.meta?.drain ?? 0,
    flinch_chance: move.meta?.flinch_chance ?? 0,
    healing: move.meta?.healing ?? 0,
    min_hits: move.meta?.min_hits ?? null,
    max_hits: move.meta?.max_hits ?? null,
    min_turns: move.meta?.min_turns ?? null,
    max_turns: move.meta?.max_turns ?? null,
    stat_chance: move.meta?.stat_chance ?? 0,
    stat_changes: (move.stat_changes ?? []).map((sc) => ({ stat: sc.stat.name, change: sc.change })),
  };
}

// ---------------------------------------------------------------------------
// PokeAPI helpers
// ---------------------------------------------------------------------------

async function fetchAllMoveRefs(): Promise<MoveRef[]> {
  const all: MoveRef[] = [];
  let path = `move?limit=${LIST_PAGE_SIZE}&offset=0`;

  while (path) {
    console.log(`  📄 Listando: ${path}`);
    const res: { data: { count: number; next: string | null; results: MoveRef[] } } =
      await PokeAPIClient.get(path);

    all.push(...res.data.results);
    console.log(`     ${all.length}/${res.data.count} referências coletadas`);

    path = res.data.next
      ? res.data.next.replace('https://pokeapi.co/api/v2/', '')
      : '';

    if (path) await delay(LIST_DELAY_MS);
  }

  return all;
}

async function fetchMoveDetail(ref: MoveRef): Promise<MoveDetail | null> {
  try {
    const id = ref.url.split('/').filter(Boolean).pop();
    if (!id) throw new Error(`URL inválida: ${ref.url}`);
    const res: { data: MoveDetail } = await PokeAPIClient.get(`move/${id}`);
    return res.data;
  } catch (err) {
    console.error(`  ⚠️  Erro ao buscar move "${ref.name}":`, err);
    return null;
  }
}

async function fetchMovesInBatches(refs: MoveRef[]): Promise<MoveDetail[]> {
  const results: MoveDetail[] = [];
  const totalBatches = Math.ceil(refs.length / DETAIL_BATCH_SIZE);

  for (let i = 0; i < refs.length; i += DETAIL_BATCH_SIZE) {
    const batch = refs.slice(i, i + DETAIL_BATCH_SIZE);
    const batchNum = Math.floor(i / DETAIL_BATCH_SIZE) + 1;

    console.log(
      `  → Batch ${batchNum}/${totalBatches} (${batch[0].name} … ${batch[batch.length - 1].name})`,
    );

    const batchResults = await Promise.all(batch.map(fetchMoveDetail));
    const valid = batchResults.filter((m): m is MoveDetail => m !== null);
    results.push(...valid);

    if (i + DETAIL_BATCH_SIZE < refs.length) {
      await delay(DETAIL_DELAY_MS);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// DB helper
// ---------------------------------------------------------------------------

async function insertMoveBatches(rows: MoveRow[]): Promise<number> {
  let totalUpserted = 0;
  const totalBatches = Math.ceil(rows.length / DB_BATCH_SIZE);

  for (let i = 0; i < rows.length; i += DB_BATCH_SIZE) {
    const batch = rows.slice(i, i + DB_BATCH_SIZE);
    console.log(
      `  💾 Upsert lote ${Math.floor(i / DB_BATCH_SIZE) + 1}/${totalBatches} (${batch.length} moves)`,
    );

    try {
      // upsert (não createMany+skipDuplicates) pra que re-rodar o seed também atualize moves já
      // existentes no banco com campos novos (ex.: stat_changes, capturado a partir desta mudança).
      await Promise.all(
        batch.map((row) =>
          prismaClient.move.upsert({
            where: { pokeMoveId: row.pokeMoveId },
            create: row,
            update: row,
          }),
        ),
      );
      totalUpserted += batch.length;
    } catch (err) {
      console.error(`  ⚠️  Erro no lote, continuando...`, err);
    }
  }

  return totalUpserted;
}

// ---------------------------------------------------------------------------
// Seed entry point
// ---------------------------------------------------------------------------

export async function seedInsertMoves(): Promise<void> {
  console.log('📡 Buscando referências de moves na PokeAPI...');
  const refs = await fetchAllMoveRefs();
  console.log(`✅ ${refs.length} moves encontrados.\n`);

  console.log('🔍 Buscando detalhes dos moves...');
  const details = await fetchMovesInBatches(refs);
  console.log(`✅ ${details.length} moves com detalhes carregados.\n`);

  console.log('🔄 Transformando e inserindo no banco...');
  const rows = details.map(transformMove);
  const upserted = await insertMoveBatches(rows);

  console.log(`✅ ${upserted} moves inseridos/atualizados com sucesso.`);
}
