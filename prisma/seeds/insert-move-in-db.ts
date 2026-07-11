// import MoveService from "../modules/moves/moves.service";
// import IMovesPokeAPI from "../modules/moves/movesPokeApi.service";
// import { Move } from "../modules/moves/types/IMove";



//     // Processar em lotes menores para evitar problemas com muitos dados
//     createManyMoves = async (moves: Array<any>) => {
//         try {
//             console.log("Creating moves:", moves.length, "moves");
            
//             const batchSize = 50;
//             let totalCreated = 0;
            
//             for (let i = 0; i < moves.length; i += batchSize) {
//                 const batch = moves.slice(i, i + batchSize);
//                 console.log(`Inserting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(moves.length/batchSize)} (${batch.length} moves)`);
                
//                 try {
//                     const createdMoves = await prismaClient.move.createMany({
//                         data: batch,
//                         skipDuplicates: true, // Evita erro se move já existir
//                     });
                    
//                     totalCreated += createdMoves.count;
//                     console.log(`Batch completed. Created ${createdMoves.count} moves.`);
                    
//                 } catch (batchError) {
//                     console.error(`Error inserting batch ${Math.floor(i/batchSize) + 1}:`, batchError);
//                     // Continua com o próximo lote mesmo se um falhar
//                 }
//             }
            
//             console.log(`Successfully created ${totalCreated} moves in total`);
            
//         } catch (error) {
//             console.error("Error creating moves:", error);
//             throw error;
//         }
//     }

//     // Busca todos os moves com paginação
//     getAllMoves = async () => {
//         try {
//             console.log("Fetching all moves from PokeAPI...");
//             const allMoves: Array<{ name: string; url: string }> = [];
//             let url = "move?limit=100&offset=0";

//             while (url) {
//                 console.log(`Fetching: ${url}`);
                
//                 const response: {
//                     data: {
//                         count: number;
//                         next: string | null;
//                         previous: string | null;
//                         results: Array<{ name: string; url: string }>;
//                     }
//                 } = await PokeAPIClient.get(url);

//                 allMoves.push(...response.data.results);
//                 url = response.data.next ? response.data.next.replace('https://pokeapi.co/api/v2/', '') : '';
                
//                 console.log(`Fetched ${response.data.results.length} moves. Total: ${allMoves.length}/${response.data.count}`);
                
//                 // Delay para evitar rate limiting
//                 if (url) {
//                     await this.delay(500);
//                 }
//             }

//             console.log(`Successfully fetched all ${allMoves.length} moves`);
//             return allMoves;
//         } catch (error) {
//             console.error("Error fetching all moves from PokeAPI:", error);
//             throw error;
//         }
//     }
//       // Busca múltiples moves em lote com rate limiting
//     getMovesInBatches = async (moveReferences: Array<{ name: string; url: string }>) => {
//         const moves: Move[] = [];
//         const batchSize = 10; // Processar 10 moves por vez
        
//         for (let i = 0; i < moveReferences.length; i += batchSize) {
//             const batch = moveReferences.slice(i, i + batchSize);
//             console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(moveReferences.length/batchSize)} (moves ${i + 1}-${Math.min(i + batchSize, moveReferences.length)})`);
            
//             const batchPromises = batch.map(async (moveRef) => {
//                 try {
//                     // Extrair ID da URL
//                     const id = moveRef.url.split('/').filter(Boolean).pop();
//                     if (!id) throw new Error(`Invalid URL: ${moveRef.url}`);
                    
//                     const move = await this.findMove(parseInt(id));
//                     return move;
//                 } catch (error) {
//                     console.error(`Error fetching move ${moveRef.name}:`, error);
//                     return null;
//                 }
//             });
            
//             const batchResults = await Promise.all(batchPromises);
//             const validMoves = batchResults.filter(move => move !== null) as Move[];
//             moves.push(...validMoves);
            
//             // Delay entre batches para evitar rate limiting
//             if (i + batchSize < moveReferences.length) {
//                 console.log("Waiting 2 seconds before next batch...");
//                 await this.delay(2000);
//             }
//         }
        
//         return moves;
//     }  
// export interface Move {
//   accuracy: number | null;
//   contest_combos: {
//     normal: {
//       use_after: null | Array<{ name: string; url: string }>;
//       use_before: null | Array<{ name: string; url: string }>;
//     };
//     super: {
//       use_after: null | Array<{ name: string; url: string }>;
//       use_before: null | Array<{ name: string; url: string }>;
//     };
//   };
//   contest_effect: { url: string };
//   contest_type: { name: string; url: string };
//   damage_class: { name: string; url: string };
//   effect_chance: number | null;
//   effect_changes: Array<EffectChange>;
//   effect_entries: Array<{
//     effect: string;
//     language: { name: string; url: string };
//     short_effect: string;
//   }>;
//   flavor_text_entries: Array<{
//     flavor_text: string;
//     language: { name: string; url: string };
//     version_group: { name: string; url: string };
//   }>;
//   generation: { name: string; url: string };
//   id: number;
//   learned_by_pokemon: Array<{ name: string; url: string }>;
//   machines: Array<Machine>;
//   meta: {
//     ailment: { name: string; url: string };
//     ailment_chance: number;
//     category: { name: string; url: string };
//     crit_rate: number;
//     drain: number;
//     flinch_chance: number;
//     healing: number;
//     max_hits: number | null;
//     max_turns: number | null;
//     min_hits: number | null;
//     min_turns: number | null;
//     stat_chance: number;
//   };
//   name: string;
//   names: Array<{
//     language: { name: string; url: string };
//     name: string;
//   }>;
//   past_values: Array<PastValue>;
//   power: number | null;
//   pp: number;
//   priority: number;
//   stat_changes: Array<StatChange>;
//   super_contest_effect: { url: string };
//   target: { name: string; url: string };
//   type: { name: string; url: string };
// }
// // npx ts-node insert-moves-in-db.ts

// // Transforma os dados da PokeAPI para o formato do banco
// const transformMoveData = (move: Move) => {
//     // Busca a descrição em inglês
//     const englishEffect = move.effect_entries?.find(entry => entry.language?.name === 'en');
    
//     return {
//         pokeMoveId: move.id,
//         name: move.name,
//         accuracy: move.accuracy,
//         power: move.power,
//         pp: move.pp,
//         priority: move.priority,
//         type: move.type?.name || null,
//         description: englishEffect?.short_effect || null,
//         target: move.target?.name || null,
//         damage_class: move.damage_class?.name || null,
//         effect: englishEffect?.effect || null,
//         effect_chance: move.effect_chance,
//         ailment: move.meta?.ailment?.name || null,
//         category: move.meta?.category?.name || null,
//         crit_rate: move.meta?.crit_rate || 0,
//         drain: move.meta?.drain || 0,
//         flinch_chance: move.meta?.flinch_chance || 0,
//         healing: move.meta?.healing || 0,
//         min_hits: move.meta?.min_hits || null,
//         max_hits: move.meta?.max_hits || null,
//         min_turns: move.meta?.min_turns || null,
//         max_turns: move.meta?.max_turns || null,
//         stat_chance: move.meta?.stat_chance || 0,
//     };
// };

// const runScript = async () => {
//     const moveService = new MoveService();
//     const movesPokeAPI = new IMovesPokeAPI();
    
//     console.log("🎯 Starting moves insertion script...");
//     console.log("📋 This process will:");
//     console.log("   1. Fetch all 937 moves from PokeAPI");
//     console.log("   2. Process them in batches with rate limiting");
//     console.log("   3. Transform data to database format");
//     console.log("   4. Insert them into the database");
//     console.log("⏱️  Estimated time: 10-15 minutes\n");
    
//     const startTime = Date.now();
    
//     try {
//         // 1. Buscar todas as referências de moves
//         console.log("📡 Step 1: Fetching move references from PokeAPI...");
//         const moveReferences = await movesPokeAPI.getAllMoves();
//         console.log(`✅ Found ${moveReferences.length} moves to process\n`);
        
//         // 2. Buscar detalhes de cada move em lotes
//         console.log("🔍 Step 2: Fetching detailed move data...");
//         const detailedMoves = await movesPokeAPI.getMovesInBatches(moveReferences);
//         console.log(`✅ Successfully fetched details for ${detailedMoves.length} moves\n`);
        
//         // 3. Transformar dados para formato do banco
//         console.log("🔄 Step 3: Transforming data for database...");
//         const transformedMoves = detailedMoves.map(move => transformMoveData(move));
//         console.log(`✅ Transformed ${transformedMoves.length} moves\n`);
        
//         // 4. Inserir em lotes no banco
//         console.log("💾 Step 4: Inserting moves into database...");
//         await moveService.createManyMoves(transformedMoves);
        
//         const endTime = Date.now();
//         const duration = Math.round((endTime - startTime) / 1000);
        
//         console.log("\n🎉 =================================");
//         console.log("✅ Script completed successfully!");
//         console.log(`⏱️  Total time: ${duration} seconds`);
//         console.log(`📊 Processed: ${transformedMoves.length} moves`);
//         console.log("=================================");
        
//     } catch (error) {
//         const endTime = Date.now();
//         const duration = Math.round((endTime - startTime) / 1000);
        
//         console.log("\n❌ =================================");
//         console.error("💥 Script failed after", duration, "seconds");
//         console.error("Error:", error);
//         console.log("=================================");
//         process.exit(1);
//     }
// };

// runScript();