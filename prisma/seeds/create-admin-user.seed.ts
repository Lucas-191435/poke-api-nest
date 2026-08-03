import bcrypt from "bcrypt";
import prismaClient from "../database";

// Para executar manualmente: npx prisma db seed
// Ou individualmente: npx tsx prisma/seeds/create-admin-user.seed.ts
// Requer ADMIN_PASSWORD (e opcionalmente ADMIN_EMAIL/ADMIN_NAME) no .env

export const seedAdminUser = async () => {
    const email = process.env.ADMIN_EMAIL ?? "admin@pokeapi.com";
    const name = process.env.ADMIN_NAME ?? "Admin";
    const password = process.env.ADMIN_PASSWORD;

    if (!password) {
        console.warn("⚠️  ADMIN_PASSWORD não definido no .env — seed de admin ignorado.");
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prismaClient.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            role: "ADMIN",
        },
        create: {
            email,
            password: hashedPassword,
            name,
            role: "ADMIN",
        },
    });

    console.log(`✅ Usuário admin OK:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nome: ${user.name}`);
    console.log(`   Role: ${user.role}`);
};
