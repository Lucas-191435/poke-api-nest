
// export function mapCategoryToEnum(categoryName: string, categoryId: number): string | null {
//   // Mapeia nomes das categorias da PokéAPI para valores do enum ItemCategory
//   const categoryMapping: Record<string, string> = {
//     // Pokeballs
//     "special-balls": "pokeballs",
//     "standard-balls": "pokeballs",
//     "apricorn-balls": "pokeballs",
    
//     // Healing
//     "healing": "healing", 
//     "medicine": "healing",
//     "revival": "healing",
//     "status-cures": "healing",
//     "vitamins": "healing",
//     "in-a-pinch": "healing",
//     "picky-healing": "healing",
    
//     // PP Recovery
//     "pp-recovery": "pp_recovery",
    
//     // Battle items
//     "stat-boosts": "battle_items",
//     "type-protection": "battle_items",
//     "choice": "battle_items",
//     "effort-training": "battle_items",
//     "training": "battle_items",
//     "flutes": "battle_items",
//     "miracle-shooter": "battle_items",
    
//     // Held items
//     "held-items": "held_items",
//     "bad-held-items": "held_items",
//     "plates": "held_items",
//     "species-specific": "held_items",
//     "type-enhancement": "held_items",
//     "scarves": "held_items",
//     "jewels": "held_items",
    
//     // Evolution
//     "evolution": "evolution",
    
//     // Berries/Food
//     "effort-drop": "berries_food",
//     "baking-only": "berries_food",
//     "catching-bonus": "berries_food",
//     "mulch": "berries_food",
//     "nature-mints": "berries_food",
//     "curry-ingredients": "berries_food",
//     "sandwich-ingredients": "berries_food",
//     "picnic": "berries_food",
    
//     // Machines
//     "all-machines": "machines",
//     "tm-materials": "machines",
    
//     // Collectibles
//     "collectibles": "collectibles",
//     "loot": "collectibles",
//     "dex-completion": "collectibles",
    
//     // Key items
//     "event-items": "key_items",
//     "gameplay": "key_items",
//     "plot-advancement": "key_items",
//     "unused": "key_items",
//     "apricorn-box": "key_items",
//     "data-cards": "key_items",
//     "z-crystals": "key_items",
//     "other": "key_items",
    
//     // Mail
//     "all-mail": "mail",
    
//     // Special mechanics (categorias avançadas)
//     "mega-stones": "special_mechanics",
//     "memories": "special_mechanics",
//     "species-candies": "special_mechanics",
//     "dynamax-crystals": "special_mechanics",
//     "tera-shard": "special_mechanics",
    
//     // Fossils and mining
//     "spelunking": "fossils_and_mining"
//   };
  
//   return categoryMapping[categoryName] || null;
// }

//     findItemCategory = async (id: number) => {
//         try {
//             const itemCategory: {
//                 data: {
//                     id: number;
//                     items: Array<{
//                         name: string;
//                         url: string;
//                     }>;
//                     name: string;
//                     names: Array<{
//                         language: {
//                             name: string;
//                             url: string;
//                         };
//                         name: string;
//                     }>;
//                     pocket: {
//                         name: string;
//                         url: string;
//                     };
//                 }
//             } = await PokeAPIClient.get(`item-category/${id}`);
//             return itemCategory.data;
//         } catch (error) {
//             console.error("Error fetching items from PokeAPI:", error);
//             throw error;
//         }
//     }

//     findItem = async (id: number) => {
//         try {
//             const item: {
//                 data: {
//                     attributes: Array<{
//                         name: string;
//                         url: string;
//                     }>;
//                     baby_trigger_for: null | any;
//                     category: {
//                         name: string;
//                         url: string;
//                     };
//                     cost: number;
//                     effect_entries: Array<{
//                         effect: string;
//                         language: {
//                             name: string;
//                             url: string;
//                         };
//                         short_effect: string;
//                     }>;
//                     flavor_text_entries: Array<{
//                         language: {
//                             name: string;
//                             url: string;
//                         };
//                         text: string;
//                         version_group: {
//                             name: string;
//                             url: string;
//                         };
//                     }>;
//                     fling_effect: null | any;
//                     fling_power: null | number;
//                     game_indices: Array<{
//                         game_index: number;
//                         generation: {
//                             name: string;
//                             url: string;
//                         };
//                     }>;
//                     held_by_pokemon: Array<{
//                         pokemon: {
//                             name: string;
//                             url: string;
//                         };
//                         version_details: Array<{
//                             rarity: number;
//                             version: {
//                                 name: string;
//                                 url: string;
//                             };
//                         }>;
//                     }>;
//                     id: number;
//                     machines: Array<{
//                         machine: {
//                             url: string;
//                         };
//                         version_group: {
//                             name: string;
//                             url: string;
//                         }
//                     }
//                     >;
//                     name: string;
//                     sprites: {
//                         default: string;
//                     };
//                 }
//             } = await PokeAPIClient.get(`item/${id}`);
//             return item.data;
//         } catch (error) {
//             console.error("Error fetching items from PokeAPI:", error);
//             throw error;
//         }
//     }
// }
//  createManyItems: AppItemsService.CreateManyItems.Handler = async (items) => {
//         try {
//             console.log("Creating items:", items.length, "items");

//             const createdItems = await prismaClient.item.createMany({
//                 data: items,
//                 skipDuplicates: true, // Evita erro se item já existir
//             });

//             console.log("Successfully created", createdItems.count, "items");

//         } catch (error) {
//             console.error("Error creating items:", error);
//             throw error;
//         }
//     }

// export function mapItemAttributes(categoryId: number, attributes: string[]) {
//   const isPokemonUse = [
//     1, 2, 3, 14, 16,
//     26, 27, 28, 29, 30,
//     50
//   ].includes(categoryId);

//   const isConsumable = [
//     1, 2, 3, 10, 14, 16,
//     26, 27, 28, 29, 30,
//     50,
//     33, 34, 39
//   ].includes(categoryId);

//   const isHeldItem =
//     [
//       12, 13, 15, 17, 18, 19,
//       36, 42, 44, 45, 46
//     ].includes(categoryId) ||
//     attributes.includes("holdable");

//   const isBattleUse =
//     attributes.includes("usable-in-battle");

//   const isDiscardable =
//     ![
//       20, 21, 22, 25, 35, 40, 41
//     ].includes(categoryId);

//   return {
//     isConsumable,
//     isHeldItem,
//     isBattleUse,
//     isDiscardable,
//     isPokemonUse
//   };
// }

// export const ITEM_CATEGORY_GROUPS = [
//     {
//         id: 1,
//         name: "misc",
//         itemCategories: [
//             9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 24, 32, 35, 36, 42
//         ]
//     },
//     {
//         id: 2,
//         name: "medicine",
//         itemCategories: [
//             26, 27, 28, 29, 30,
//         ]
//     },
//     {
//         id: 3,
//         name: "pokeballs",
//         itemCategories: [
//             33, 34, 39
//         ]
//     },

//     {
//         id: 4,
//         name: "machines",
//         itemCategories: [
//             37
//         ]
//     },

//     {
//         id: 5,
//         name: "berries",
//         itemCategories: [
//             2, 3, 4, 5, 6, 7, 8, 48
//         ]
//     },

//     {
//         id: 6,
//         name: "mail",
//         itemCategories: [
//             25
//         ]
//     },
//     {
//         id: 7,
//         name: "battle",
//         itemCategories: [
//             1, 38, 43
//         ]
//     },
//     {
//         id: 8,
//         name: "key",
//         itemCategories: [
//             20, 21, 22, 23, 40, 41
//         ]
//     },
// ];

// import { ITEM_CATEGORY_GROUPS, mapItemAttributes, mapCategoryToEnum } from "../const/items_categorys";
// import ItemsPokeAPI from "../modules/items/itemsPokeApi.service";
// import ItemsService from "../modules/items/items.service";

// //  npx ts-node src/scripts/insert-items-in-db.ts
// const VERSION_TO_REGION: Record<string, string> = {
//   // Kanto
//   "red-blue": "kanto",
//   "yellow": "kanto",
//   "firered-leafgreen": "kanto",

//   // Johto
//   "gold-silver": "johto",
//   "crystal": "johto",
//   "heartgold-soulsilver": "johto",

//   // Hoenn
//   "ruby-sapphire": "hoenn",
//   "emerald": "hoenn",
//   "omega-ruby-alpha-sapphire": "hoenn",

//   // Sinnoh
//   "diamond-pearl": "sinnoh",
//   "platinum": "sinnoh",
//   "brilliant-diamond-shining-pearl": "sinnoh",

//   // Unova
//   "black-white": "unova",
//   "black-2-white-2": "unova",

//   // Kalos
//   "x-y": "kalos",

//   // Alola
//   "sun-moon": "alola",
//   "ultra-sun-ultra-moon": "alola",

//   // Galar
//   "sword-shield": "galar",

//   // Paldea
//   "scarlet-violet": "paldea",
// };

// function getItemRegions(itemData: any): string {
//   const regions = new Set<string>();

//   itemData.flavor_text_entries?.forEach((entry: any) => {
//     const vg = entry.version_group?.name;
//     const region = VERSION_TO_REGION[vg];

//     if (region) {
//       regions.add(region);
//     }
//   });

//   return Array.from(regions).toString();
// }

// const runScript = async () => {
//     const itemsPokeApiService = new ItemsPokeAPI();
//     const itemsService = new ItemsService();
//     try {

//         for (const group of ITEM_CATEGORY_GROUPS) {
//             console.log(`Group: ${group.name}`);
//             for (const categoryId of group.itemCategories) {
//                 const category = await itemsPokeApiService.findItemCategory(categoryId);
//                 if(category.id === 10) console.log(`  Category ID: ${categoryId}, Name: ${category.name}`, category.items);

//                 const mappedItemsIds: number[] = category.items.map(item => {
//                     const id = parseInt(item.url.split("/").slice(-2, -1)[0]);
//                     return id;
//                 })

//                 if(category.id === 10) console.log(`  Mapped Item IDs for Category ID ${categoryId}:`, mappedItemsIds);

//                 const dataItems = await Promise.all(mappedItemsIds.map(async (itemId) => {
//                     const itemData = await itemsPokeApiService.findItem(itemId);
//                     return {
//                         pokeItemId: itemData.id,
//                         pokeCategoryId: category.id,
//                         pokeItemPocketId: group.id,
//                         name: itemData.name,
//                         sprite: itemData.sprites?.default || null,
//                         category: mapCategoryToEnum(category.name, category.id),
//                         description: itemData.effect_entries.find((entry) => entry.language.name === "en")?.short_effect || "",
//                         effect: itemData.effect_entries.find((entry) => entry.language.name === "en")?.effect || "",
//                         ...mapItemAttributes(category.id, itemData.attributes.map(attr => attr.name)),
//                         price: itemData.cost,
//                         regions: getItemRegions(itemData),
//                     }
//                 }));

//                 const filteredDataItems = dataItems.filter(item => item.regions !== "" && item.description !== "" && item.effect !== "");

//                 if(category.id === 10) console.log(`  Data for Items in Category ID ${categoryId}:`, filteredDataItems);

//                 await itemsService.createManyItems(filteredDataItems);
//             }
//         }

//     } catch (error) {
//         console.error("Error running script:", error);
//     }
// }

// runScript();