import bcrypt from "bcrypt";
import prismaClient from "../database";

// Para executar manualmente: npx prisma db seed
// Ou individualmente: npx tsx prisma/seeds/create-user-teste.seed.ts

export const seedUserTeste = async () => {
    const email = "teste@gmail.com";
    const password = "Teste123@";
    const name = "Usuario Teste";

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prismaClient.user.upsert({
        where: { email },
        update: {},
        create: {
            email,
            password: hashedPassword,
            name,
            role: "CLIENT",
        },
    });

    console.log(`✅ Usuário de teste OK:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nome: ${user.name}`);
    console.log(`   Role: ${user.role}`);
};