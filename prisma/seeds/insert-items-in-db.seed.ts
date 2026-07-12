import axios from 'axios';
import prismaClient from '../database';
import { ItemCategory } from 'src/generated/prisma/client';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ITEM_BATCH_SIZE = 10;       // itens buscados em paralelo por batch
const ITEM_BATCH_DELAY_MS = 1500; // delay entre batches de itens
const CATEGORY_DELAY_MS = 500;    // delay entre categorias
const RETRY_ATTEMPTS = 3;         // tentativas em caso de erro 5xx
const RETRY_DELAY_MS = 5000;      // espera antes de cada retry

// ---------------------------------------------------------------------------
// PokeAPI client
// ---------------------------------------------------------------------------

const PokeAPIClient = axios.create({
  baseURL: 'https://pokeapi.co/api/v2/',
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ItemCategoryData = {
  id: number;
  name: string;
  items: { name: string; url: string }[];
  pocket: { name: string; url: string };
};

type ItemData = {
  id: number;
  name: string;
  cost: number;
  attributes: { name: string; url: string }[];
  category: { name: string; url: string };
  effect_entries: { effect: string; short_effect: string; language: { name: string } }[];
  flavor_text_entries: { text: string; language: { name: string }; version_group: { name: string } }[];
  sprites: { default: string | null };
};

type ItemRow = {
  pokeItemId: number;
  pokeCategoryId: number;
  pokeItemPocketId: number;
  name: string;
  sprite: string | null;
  category: ItemCategory | null;
  description: string;
  effect: string;
  isConsumable: boolean;
  isHeldItem: boolean;
  isBattleUse: boolean;
  isDiscardable: boolean;
  isPokemonUse: boolean;
  price: number;
  regions: string;
};

// ---------------------------------------------------------------------------
// Category groups (pockets da PokeAPI)
// ---------------------------------------------------------------------------

const ITEM_CATEGORY_GROUPS = [
  { id: 1, name: 'misc',      itemCategories: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 24, 32, 35, 36, 42] },
  { id: 2, name: 'medicine',  itemCategories: [26, 27, 28, 29, 30] },
  { id: 3, name: 'pokeballs', itemCategories: [33, 34, 39] },
  { id: 4, name: 'machines',  itemCategories: [37] },
  { id: 5, name: 'berries',   itemCategories: [2, 3, 4, 5, 6, 7, 8, 48] },
  { id: 6, name: 'mail',      itemCategories: [25] },
  { id: 7, name: 'battle',    itemCategories: [1, 38, 43] },
  { id: 8, name: 'key',       itemCategories: [20, 21, 22, 23, 40, 41] },
];

// ---------------------------------------------------------------------------
// Helpers: category → enum
// ---------------------------------------------------------------------------

const CATEGORY_MAP: Record<string, string> = {
  'special-balls': 'pokeballs', 'standard-balls': 'pokeballs', 'apricorn-balls': 'pokeballs',
  'healing': 'healing', 'medicine': 'healing', 'revival': 'healing',
  'status-cures': 'healing', 'vitamins': 'healing', 'in-a-pinch': 'healing', 'picky-healing': 'healing',
  'pp-recovery': 'pp_recovery',
  'stat-boosts': 'battle_items', 'type-protection': 'battle_items', 'choice': 'battle_items',
  'effort-training': 'battle_items', 'training': 'battle_items', 'flutes': 'battle_items',
  'miracle-shooter': 'battle_items',
  'held-items': 'held_items', 'bad-held-items': 'held_items', 'plates': 'held_items',
  'species-specific': 'held_items', 'type-enhancement': 'held_items', 'scarves': 'held_items',
  'jewels': 'held_items',
  'evolution': 'evolution',
  'effort-drop': 'berries_food', 'baking-only': 'berries_food', 'catching-bonus': 'berries_food',
  'mulch': 'berries_food', 'nature-mints': 'berries_food', 'curry-ingredients': 'berries_food',
  'sandwich-ingredients': 'berries_food', 'picnic': 'berries_food',
  'all-machines': 'machines', 'tm-materials': 'machines',
  'collectibles': 'collectibles', 'loot': 'collectibles', 'dex-completion': 'collectibles',
  'event-items': 'key_items', 'gameplay': 'key_items', 'plot-advancement': 'key_items',
  'unused': 'key_items', 'apricorn-box': 'key_items', 'data-cards': 'key_items',
  'z-crystals': 'key_items', 'other': 'key_items',
  'all-mail': 'mail',
  'mega-stones': 'special_mechanics', 'memories': 'special_mechanics',
  'species-candies': 'special_mechanics', 'dynamax-crystals': 'special_mechanics',
  'tera-shard': 'special_mechanics',
  'spelunking': 'fossils_and_mining',
};

function mapCategoryToEnum(categoryName: string): ItemCategory | null {
  const value = CATEGORY_MAP[categoryName];
  return value ? (value as ItemCategory) : null;
}

// ---------------------------------------------------------------------------
// Helpers: attributes → flags
// ---------------------------------------------------------------------------

function mapItemAttributes(categoryId: number, attributes: string[]) {
  const isPokemonUse  = [1, 2, 3, 14, 16, 26, 27, 28, 29, 30, 50].includes(categoryId);
  const isConsumable  = [1, 2, 3, 10, 14, 16, 26, 27, 28, 29, 30, 50, 33, 34, 39].includes(categoryId);
  const isHeldItem    = [12, 13, 15, 17, 18, 19, 36, 42, 44, 45, 46].includes(categoryId)
                        || attributes.includes('holdable');
  const isBattleUse   = attributes.includes('usable-in-battle');
  const isDiscardable = ![20, 21, 22, 25, 35, 40, 41].includes(categoryId);

  return { isConsumable, isHeldItem, isBattleUse, isDiscardable, isPokemonUse };
}

// ---------------------------------------------------------------------------
// Helpers: regions
// ---------------------------------------------------------------------------

const VERSION_TO_REGION: Record<string, string> = {
  'red-blue': 'kanto', 'yellow': 'kanto', 'firered-leafgreen': 'kanto',
  'gold-silver': 'johto', 'crystal': 'johto', 'heartgold-soulsilver': 'johto',
  'ruby-sapphire': 'hoenn', 'emerald': 'hoenn', 'omega-ruby-alpha-sapphire': 'hoenn',
  'diamond-pearl': 'sinnoh', 'platinum': 'sinnoh', 'brilliant-diamond-shining-pearl': 'sinnoh',
  'black-white': 'unova', 'black-2-white-2': 'unova',
  'x-y': 'kalos',
  'sun-moon': 'alola', 'ultra-sun-ultra-moon': 'alola',
  'sword-shield': 'galar',
  'scarlet-violet': 'paldea',
};

function getItemRegions(item: ItemData): string {
  const regions = new Set<string>();
  item.flavor_text_entries?.forEach((entry) => {
    const region = VERSION_TO_REGION[entry.version_group?.name];
    if (region) regions.add(region);
  });
  return Array.from(regions).join(',');
}

// ---------------------------------------------------------------------------
// PokeAPI helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchItemCategory(id: number): Promise<ItemCategoryData> {
  const res: { data: ItemCategoryData } = await PokeAPIClient.get(`item-category/${id}`);
  return res.data;
}

async function fetchItem(id: number): Promise<ItemData | null> {
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const res: { data: ItemData } = await PokeAPIClient.get(`item/${id}`);
      return res.data;
    } catch (err: any) {
      const status = err?.response?.status;
      if (attempt < RETRY_ATTEMPTS && status && status >= 500) {
        console.warn(`    ⚠️  item/${id} retornou ${status}, tentativa ${attempt}/${RETRY_ATTEMPTS}. Aguardando ${RETRY_DELAY_MS}ms...`);
        await delay(RETRY_DELAY_MS);
      } else {
        console.error(`    ❌ Falha ao buscar item/${id}:`, err?.message ?? err);
        return null;
      }
    }
  }
  return null;
}

async function fetchItemsInBatches(ids: number[]): Promise<ItemData[]> {
  const results: ItemData[] = [];
  const totalBatches = Math.ceil(ids.length / ITEM_BATCH_SIZE);

  for (let i = 0; i < ids.length; i += ITEM_BATCH_SIZE) {
    const batch = ids.slice(i, i + ITEM_BATCH_SIZE);
    const batchNum = Math.floor(i / ITEM_BATCH_SIZE) + 1;
    console.log(`    → Batch ${batchNum}/${totalBatches} (ids ${batch[0]}…${batch[batch.length - 1]})`);

    const batchData = await Promise.all(batch.map(fetchItem));
    results.push(...batchData.filter((d): d is ItemData => d !== null));

    if (i + ITEM_BATCH_SIZE < ids.length) {
      await delay(ITEM_BATCH_DELAY_MS);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// DB helper
// ---------------------------------------------------------------------------

async function insertItems(items: ItemRow[]): Promise<void> {
  if (items.length === 0) return;
  const result = await prismaClient.item.createMany({
    data: items,
    skipDuplicates: true,
  });
  console.log(`    💾 ${result.count} itens inseridos.`);
}

// ---------------------------------------------------------------------------
// Seed entry point
// ---------------------------------------------------------------------------

export async function seedInsertItems(): Promise<void> {
  for (const group of ITEM_CATEGORY_GROUPS) {
    console.log(`\n📦 Pocket: ${group.name} (${group.itemCategories.length} categorias)`);

    for (const categoryId of group.itemCategories) {
      const category = await fetchItemCategory(categoryId);
      console.log(`  🗂️  Categoria [${categoryId}] ${category.name} — ${category.items.length} itens`);

      const itemIds = category.items.map((item) =>
        parseInt(item.url.split('/').filter(Boolean).pop()!),
      );

      const itemDataList = await fetchItemsInBatches(itemIds);

      const rows: ItemRow[] = itemDataList
        .map((itemData) => {
          const englishEffect = itemData.effect_entries.find((e) => e.language.name === 'en');
          const regions = getItemRegions(itemData);
          const description = englishEffect?.short_effect ?? '';
          const effect = englishEffect?.effect ?? '';

          // Filtra itens sem regiões, descrição ou efeito (sem dados úteis)
          if (!regions || !description || !effect) return null;

          return {
            pokeItemId: itemData.id,
            pokeCategoryId: category.id,
            pokeItemPocketId: group.id,
            name: itemData.name,
            sprite: itemData.sprites?.default ?? null,
            category: mapCategoryToEnum(category.name),
            description,
            effect,
            ...mapItemAttributes(category.id, itemData.attributes.map((a) => a.name)),
            price: itemData.cost,
            regions,
          } satisfies ItemRow;
        })
        .filter((row): row is ItemRow => row !== null);

      await insertItems(rows);

      await delay(CATEGORY_DELAY_MS);
    }
  }
}
