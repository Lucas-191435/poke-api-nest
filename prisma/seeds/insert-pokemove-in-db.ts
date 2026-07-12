// // Busca um movimento do banco pelo nome
//     getMoveByName = async (moveName: string) => {
//         try {
//             const move = await prismaClient.move.findFirst({
//                 where: {
//                     name: moveName
//                 },
//                 select: {
//                     id: true,
//                     name: true
//                 }
//             });
//             return move;
//         } catch (error) {
//             console.error(`Error fetching move ${moveName} from database:`, error);
//             throw error;
//         }
//     }


// // Processar em lotes menores para evitar problemas com muitos dados
//     createManyPokeMoves = async (moves: PokemonMoveInsert[]) => {
//         try {
//             console.log("Creating pokemon-move relationships:", moves.length, "relationships");

//             const batchSize = 100; // Lotes maiores para relações
//             let totalCreated = 0;

//             for (let i = 0; i < moves.length; i += batchSize) {
//                 const batch = moves.slice(i, i + batchSize);
//                 console.log(`Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(moves.length / batchSize)} (${batch.length} relationships)`);

//                 try {
//                     const createdPokeMoves = await prismaClient.pokemonMove.createMany({
//                         data: batch,
//                         skipDuplicates: true, // Evita erro se relação já existir
//                     });

//                     totalCreated += createdPokeMoves.count;
//                     console.log(`Batch completed. Created ${createdPokeMoves.count} relationships.`);

//                 } catch (batchError) {
//                     console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, batchError);
//                     // Continua com o próximo lote mesmo se um falhar
//                 }
//             }

//             console.log(`Successfully created ${totalCreated} pokemon-move relationships in total`);

//         } catch (error) {
//             console.error("Error creating pokemon-move relationships:", error);
//             throw error;
//         }
//     }

// getAllPokemonsFromDB = async () => {
//         try {
//             const pokemons = await prismaClient.pokemon.findMany({
//                 select: {
//                     id: true,
//                     pokeId: true,
//                     name: true
//                 },
//                 orderBy: {
//                     pokeId: 'asc'
//                 }
//             });
//             return pokemons;
//         } catch (error) {
//             console.error("Error fetching pokemons from database:", error);
//             throw error;
//         }
//     }

// import axios from "axios";

// const PokeAPIClient = axios.create({
//   baseURL: "https://pokeapi.co/api/v2/",
//   headers: {
//     "Content-Type": "application/json",
//   },
// });

// export { PokeAPIClient };


// import PokeMoveService from "../modules/pokemonMove/pokeMove.service";
// import { PokeAPIClient } from "../services/pokeApiService";

// // npx ts-node insert-pokemove-in-db.ts

// enum MoveLearnMethod {
//   LEVEL_UP = "level-up",
//   MACHINE = "machine", 
//   TUTOR = "tutor",
//   EGG = "egg",
//   UNKNOWN = "unknown"
// }

// type PokemonMoveFromAPI = {
//   move: {
//     name: string;
//     url: string;
//   };
//   version_group_details: {
//     level_learned_at: number;
//     move_learn_method: {
//       name: MoveLearnMethod;
//       url: string;
//     };
//     order: number | null;
//     version_group: {
//       name: string;
//       url: string;
//     };
//   }[];
// };

// type PokemonFromAPI = {
//   id: number;
//   name: string;
//   moves: PokemonMoveFromAPI[];
// };

// // Mapear MoveLearnMethod da API para LearnMethod do banco
// const mapLearnMethod = (apiMethod: MoveLearnMethod): 'LEVEL_UP' | 'MACHINE' | 'TUTOR' | 'EGG' | 'UNKNOWN' => {
//   switch (apiMethod) {
//     case MoveLearnMethod.LEVEL_UP:
//       return 'LEVEL_UP';
//     case MoveLearnMethod.MACHINE:
//       return 'MACHINE';
//     case MoveLearnMethod.TUTOR:
//       return 'TUTOR';
//     case MoveLearnMethod.EGG:
//       return 'EGG';
//     default:
//       return 'UNKNOWN';
//   }
// };

// // Delay para evitar rate limiting
// const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// // Busca movimentos de um pokémon específico na PokeAPI
// const fetchPokemonMoves = async (pokeId: number): Promise<PokemonMoveFromAPI[]> => {
//   try {
//     const response: { data: PokemonFromAPI } = await PokeAPIClient.get(`pokemon/${pokeId}`);
//     return response.data.moves;
//   } catch (error) {
//     console.error(`Error fetching moves for pokemon ${pokeId}:`, error);
//     return [];
//   }
// };

// // Processa os movimentos de um pokémon e retorna dados para inserir no banco
// const processPokemonMoves = async (pokemon: { id: string; pokeId: number; name: string }, pokeMoveService: PokeMoveService) => {
//   try {
//     console.log(`Processing moves for ${pokemon.name} (ID: ${pokemon.pokeId})`);
    
//     const apiMoves = await fetchPokemonMoves(pokemon.pokeId);
//     const processedMoves = [];
    
//     for (const apiMove of apiMoves) {
//       // Buscar o movimento no banco pelo nome
//       const dbMove = await pokeMoveService.getMoveByName(apiMove.move.name);
      
//       if (!dbMove) {
//         console.warn(`Move '${apiMove.move.name}' not found in database, skipping...`);
//         continue;
//       }
      
//       // Processar version_group_details
//       let selectedDetail = apiMove.version_group_details.find(detail => 
//         detail.version_group.name === 'black-2-white-2' || detail.version_group.name === 'black-white'
//       );
      
//       // Se não encontrar, usar o primeiro
//       if (!selectedDetail && apiMove.version_group_details.length > 0) {
//         selectedDetail = apiMove.version_group_details[0];
//       }
      
//       if (selectedDetail) {
//         processedMoves.push({
//           pokemonId: pokemon.id,
//           moveId: dbMove.id,
//           learn_method: mapLearnMethod(selectedDetail.move_learn_method.name),
//           level: selectedDetail.level_learned_at || 0
//         });
//       }
//     }
    
//     console.log(`Found ${processedMoves.length} valid moves for ${pokemon.name}`);
//     return processedMoves;
    
//   } catch (error) {
//     console.error(`Error processing moves for pokemon ${pokemon.name}:`, error);
//     return [];
//   }
// };

// const runScript = async () => {
//   const pokeMoveService = new PokeMoveService();
  
//   console.log("🎯 Starting pokemon-move relationships insertion script...");
//   console.log("📋 This process will:");
//   console.log("   1. Fetch all pokemons from database");
//   console.log("   2. For each pokemon, fetch moves from PokeAPI");
//   console.log("   3. Process move learning details");
//   console.log("   4. Insert pokemon-move relationships into database");
//   console.log("⏱️  Estimated time: depends on pokemon count\n");
  
//   const startTime = Date.now();
  
//   try {
//     // 1. Buscar todos os pokémons do banco
//     console.log("📡 Step 1: Fetching pokemons from database...");
//     const pokemons = await pokeMoveService.getAllPokemonsFromDB();
//     console.log(`✅ Found ${pokemons.length} pokemons in database\n`);
    
//     if (pokemons.length === 0) {
//       console.log("⚠️  No pokemons found in database. Please run pokemon insertion first.");
//       return;
//     }
    
//     // 2. Processar pokémons em lotes com rate limiting
//     console.log("🔍 Step 2: Processing pokemon moves...");
//     const allPokemonMoves = [];
//     const batchSize = 5; // Processar 5 pokémons por vez
    
//     for (let i = 0; i < pokemons.length; i += batchSize) {
//       const batch = pokemons.slice(i, i + batchSize);
//       console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(pokemons.length/batchSize)} (pokemons ${i + 1}-${Math.min(i + batchSize, pokemons.length)})`);
      
//       const batchPromises = batch.map(pokemon => 
//         processPokemonMoves(pokemon, pokeMoveService)
//       );
      
//       const batchResults = await Promise.all(batchPromises);
//       const flatResults = batchResults.flat();
//       allPokemonMoves.push(...flatResults);
      
//       console.log(`Batch completed. Found ${flatResults.length} relationships.`);
      
//       // Rate limiting entre batches
//       if (i + batchSize < pokemons.length) {
//         console.log("Waiting 3 seconds before next batch...");
//         await delay(3000);
//       }
//     }
    
//     console.log(`\n✅ Processed all pokemons. Found ${allPokemonMoves.length} total relationships\n`);
    
//     // 3. Inserir no banco
//     console.log("💾 Step 3: Inserting pokemon-move relationships into database...");
//     if (allPokemonMoves.length > 0) {
//       await pokeMoveService.createManyPokeMoves(allPokemonMoves);
//     } else {
//       console.log("⚠️  No relationships to insert.");
//     }
    
//     const endTime = Date.now();
//     const duration = Math.round((endTime - startTime) / 1000);
    
//     console.log("\n🎉 =================================");
//     console.log("✅ Script completed successfully!");
//     console.log(`⏱️  Total time: ${duration} seconds`);
//     console.log(`📊 Processed: ${pokemons.length} pokemons`);
//     console.log(`🔗 Created: ${allPokemonMoves.length} relationships`);
//     console.log("=================================\n");
    
//   } catch (error) {
//     const endTime = Date.now();
//     const duration = Math.round((endTime - startTime) / 1000);
    
//     console.log("\n❌ =================================");
//     console.error("💥 Script failed after", duration, "seconds");
//     console.error("Error:", error);
//     console.log("=================================\n");
//     process.exit(1);
//   }
// };

// runScript();