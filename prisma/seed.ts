import prismaClient from './database';
import { seedUserTeste } from './seeds/create-user-teste.seed';
import { seedInsertPokemon } from './seeds/insert-pokemon-in-db.seed';

async function main() {
  console.log('🌱 Iniciando seeds do banco de dados...\n');

  await seedUserTeste();
  console.log('');

  await seedInsertPokemon();
  console.log('');
}

(async () => {
  try {
    await main();
    await prismaClient.$disconnect();
    console.log('\n✨ Todos os seeds concluídos com sucesso!');
  } catch (error) {
    console.error('❌ Falha ao executar seeds:', error);
    await prismaClient.$disconnect();
    process.exit(1);
  }
})();
