import bcrypt from "bcrypt";
import prismaClient from "../database";

// Para executar manualmente: npx prisma db seed
// Ou individualmente: npx tsx prisma/seeds/create-test-trainers.seed.ts
// Requer que seedInsertPokemon, seedInsertMoves e seedInsertPokemonMoves já tenham rodado,
// pois os pokémons e movimentos do Time Alpha são resolvidos a partir do banco.

const PASSWORD = "Teste123@";
const MOVES_PER_POKEMON = 4;

type Trainer = {
    name: string;
    team: string[]; // nomes (slug da PokeAPI) dos pokémons do Time Alpha
    avatar: string;
};

const TRAINERS: Trainer[] = [
    {
        name: "Red",
        team: ["pikachu", "charizard", "blastoise", "venusaur", "snorlax", "lapras"],
        avatar: "red"
    },
    {
        name: "Brendan",
        team: ["sceptile", "swampert", "blaziken", "gardevoir", "breloom", "manectric"],
        avatar: "brendan"
    },
    {
        name: "Gold",
        team: ["typhlosion", "feraligatr", "meganium", "ampharos", "steelix", "heracross"],
        avatar: "ethan"
    },
    {
        name: "Dawn",
        team: ["empoleon", "lopunny", "pachirisu", "mamoswine", "togekiss", "typhlosion"],
        avatar: "dawn"
    },
    {
        name: "Cynthia",
        team: ["garchomp", "milotic", "lucario", "roserade", "togekiss", "spiritomb"],
        avatar: "cynthia"
    },
    {
        name: "Lucas",
        team: ["infernape", "staraptor", "floatzel", "luxray", "roserade", "garchomp"],
        avatar: "lucas"
    },
    {
        name: "May",
        team: ["blaziken", "beautifly", "delcatty", "munchlax", "glaceon", "wartortle"],
        avatar: "may"
    },
    {
        name: "Rosa",
        team: ["samurott", "unfezant", "liepard", "gigalith", "simisear", "cinccino"],
        avatar: "rosa"
    },
    {
        name: "Lyra",
        team: ["meganium", "azumarill", "girafarig", "miltank", "sudowoodo", "wobbuffet"],
        avatar: "lyra"
    },
    {
        name: "Nate",
        team: ["emboar", "unfezant", "krookodile", "chandelure", "escavalier", "haxorus"],
        avatar: "nate"
    },
    {
        name: "Hilbert",
        team: ["serperior", "simisage", "swoobat", "gigalith", "zoroark", "golurk"],
        avatar: "hilbert"
    },
];

const pickMoveIdsForPokemon = async (pokemonId: string): Promise<string[]> => {
    const pokemonMoves = await prismaClient.pokemonMove.findMany({
        where: { pokemonId },
        orderBy: [{ learn_method: "asc" }, { level: "desc" }],
        select: { moveId: true },
    });

    const moveIds: string[] = [];
    for (const { moveId } of pokemonMoves) {
        if (!moveIds.includes(moveId)) moveIds.push(moveId);
        if (moveIds.length === MOVES_PER_POKEMON) break;
    }
    return moveIds;
};

const seedTrainerTeam = async (trainer: Trainer) => {
    const email = `${trainer.name.toLowerCase()}@pokeapi.com`;
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);

    const user = await prismaClient.user.upsert({
        where: { email },
        update: { role: "TEST", avatar: trainer.avatar },
        create: {
            email,
            password: hashedPassword,
            name: trainer.name,
            role: "TEST",
            avatar: trainer.avatar
        },
    });

    console.log(`✅ Treinador de teste OK: ${user.name} (${user.email})`);

    for (const pokemonName of trainer.team) {
        const pokemon = await prismaClient.pokemon.findFirst({ where: { name: pokemonName } });

        if (!pokemon) {
            console.warn(`   ⚠️  Pokémon '${pokemonName}' não encontrado no banco — pulei. Rode os seeds de pokémon/moves primeiro.`);
            continue;
        }

        const moveIds = await pickMoveIdsForPokemon(pokemon.id);

        await prismaClient.myPokemon.upsert({
            where: { userId_pokemonId: { userId: user.id, pokemonId: pokemon.id } },
            update: {
                teamAlpha: true,
                teamAlphaMove: moveIds,
            },
            create: {
                userId: user.id,
                pokemonId: pokemon.id,
                teamAlpha: true,
                teamAlphaMove: moveIds,
            },
        });

        console.log(`   🎮 ${pokemon.name} adicionado ao Time Alpha (${moveIds.length} movimentos)`);
    }
};

export const seedTestTrainers = async () => {
    for (const trainer of TRAINERS) {
        await seedTrainerTeam(trainer);
    }
};
