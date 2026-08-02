import {
    BattleEngineService,
    EngineBattlePokemon,
    EngineMove,
    EngineParticipant,
    ResolveTurnInput,
    TurnLogEntry,
} from './battle-engine.service';
import { createEmptyStatStages, getStatMultiplier } from './stat-stage-moves';

function buildMove(overrides: Partial<EngineMove> = {}): EngineMove {
    return {
        id: 'move-1',
        name: 'tackle',
        power: 40,
        accuracy: 100,
        priority: 0,
        type: 'normal',
        damageClass: 'physical',
        critRate: 0,
        ailment: null,
        ailmentChance: null,
        healing: 0,
        drain: 0,
        ...overrides,
    };
}

function buildPokemon(overrides: Partial<EngineBattlePokemon> = {}): EngineBattlePokemon {
    return {
        battlePokemonId: 'poke-1',
        position: 0,
        types: ['normal'],
        maxHp: 100,
        currentHp: 100,
        atk: 50,
        def: 50,
        spAtk: 50,
        spDef: 50,
        speed: 50,
        fainted: false,
        statusCondition: 'NONE',
        statusCounter: 0,
        statStages: createEmptyStatStages(),
        moves: [{ battlePokemonMoveId: 'bpm-1', currentPp: 10, move: buildMove() }],
        ...overrides,
    };
}

function buildParticipant(participantId: string, pokemon: EngineBattlePokemon): EngineParticipant {
    return { participantId, activeSlot: 0, pokemons: [pokemon] };
}

/** Devolve o `spy` de Math.random pronto pra ser restaurado com `.mockRestore()`. */
function mockRandomSequence(values: number[]): jest.SpiedFunction<typeof Math.random> {
    const spy = jest.spyOn(Math, 'random');
    values.forEach((value) => spy.mockImplementationOnce(() => value));
    return spy;
}

function findMoveEntry(log: TurnLogEntry[], participantId: string) {
    const entry = log.find((e) => e.event === 'move' && e.participantId === participantId);
    if (!entry || entry.event !== 'move') throw new Error('move log entry not found');
    return entry;
}

function switchToSelf(participantId: string, battlePokemonId: string) {
    return { participantId, action: { type: 'SWITCH' as const, targetBattlePokemonId: battlePokemonId } };
}

describe('BattleEngineService', () => {
    let service: BattleEngineService;

    beforeEach(() => {
        service = new BattleEngineService();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('paralisia total bloqueia a ação e não gasta PP', () => {
        const attacker = buildPokemon({ battlePokemonId: 'a1', statusCondition: 'PARALYZED' });
        const defender = buildPokemon({ battlePokemonId: 'b1' });

        const spy = mockRandomSequence([0.1]); // < FULL_PARALYSIS_CHANCE (0.25) => paralisado total

        const result = service.resolveTurn({
            turnNumber: 1,
            participants: [buildParticipant('A', attacker), buildParticipant('B', defender)],
            actions: [
                { participantId: 'A', action: { type: 'MOVE', moveId: 'move-1' } },
                switchToSelf('B', 'b1'),
            ],
        } satisfies ResolveTurnInput);

        spy.mockRestore();

        const blocked = result.log.find((e) => e.event === 'status-blocked' && e.participantId === 'A');
        expect(blocked).toMatchObject({ statusCondition: 'PARALYZED', reason: 'paralyzed' });
        expect(result.log.some((e) => e.event === 'move' && e.participantId === 'A')).toBe(false);

        const updatedAttacker = result.participants[0].pokemons[0];
        expect(updatedAttacker.moves[0].currentPp).toBe(10);
    });

    it('veneno e queimadura causam dano no fim do turno e podem desmaiar o pokémon', () => {
        const poisoned = buildPokemon({ battlePokemonId: 'a1', maxHp: 16, currentHp: 1, statusCondition: 'POISONED' });
        const burned = buildPokemon({ battlePokemonId: 'b1', maxHp: 32, currentHp: 32, statusCondition: 'BURNED' });

        const result = service.resolveTurn({
            turnNumber: 1,
            participants: [buildParticipant('A', poisoned), buildParticipant('B', burned)],
            actions: [switchToSelf('A', 'a1'), switchToSelf('B', 'b1')],
        } satisfies ResolveTurnInput);

        const poisonTick = result.log.find((e) => e.event === 'status-tick' && e.participantId === 'A');
        const burnTick = result.log.find((e) => e.event === 'status-tick' && e.participantId === 'B');

        expect(poisonTick).toMatchObject({ statusCondition: 'POISONED', damage: 2, targetFainted: true });
        expect(burnTick).toMatchObject({ statusCondition: 'BURNED', damage: 2, targetFainted: false });

        expect(result.participants[0].pokemons[0].fainted).toBe(true);
        expect(result.participants[0].pokemons[0].currentHp).toBe(0);
        expect(result.winnerParticipantId).toBe('B');
        expect(result.finished).toBe(true);
    });

    it('confusão pode fazer o pokémon se acertar sozinho, sem gastar PP nem usar o move escolhido', () => {
        const attacker = buildPokemon({ battlePokemonId: 'a1', statusCondition: 'CONFUSED', statusCounter: 3 });
        const defender = buildPokemon({ battlePokemonId: 'b1' });

        // 1ª chamada: rollConfusionSelfHit (< 1/3 => se acerta sozinho); 2ª: randomFactor do dano
        const spy = mockRandomSequence([0.1, 0.5]);

        const result = service.resolveTurn({
            turnNumber: 1,
            participants: [buildParticipant('A', attacker), buildParticipant('B', defender)],
            actions: [
                { participantId: 'A', action: { type: 'MOVE', moveId: 'move-1' } },
                switchToSelf('B', 'b1'),
            ],
        } satisfies ResolveTurnInput);

        spy.mockRestore();

        const hit = result.log.find((e) => e.event === 'confusion-hit' && e.participantId === 'A');
        expect(hit).toBeDefined();
        if (!hit || hit.event !== 'confusion-hit') throw new Error('unreachable');

        expect(result.log.some((e) => e.event === 'move' && e.participantId === 'A')).toBe(false);

        const updatedAttacker = result.participants[0].pokemons[0];
        expect(updatedAttacker.moves[0].currentPp).toBe(10);
        expect(updatedAttacker.currentHp).toBe(100 - hit.damage);
        expect(updatedAttacker.statusCounter).toBe(2);
    });

    it('sono bloqueia enquanto o contador não zera e cura no turno em que zera', () => {
        const sleepingAttacker = buildPokemon({ battlePokemonId: 'a1', statusCondition: 'ASLEEP', statusCounter: 1 });
        const defender = buildPokemon({ battlePokemonId: 'b1' });

        const blockedTurn = service.resolveTurn({
            turnNumber: 1,
            participants: [buildParticipant('A', sleepingAttacker), buildParticipant('B', defender)],
            actions: [
                { participantId: 'A', action: { type: 'MOVE', moveId: 'move-1' } },
                switchToSelf('B', 'b1'),
            ],
        } satisfies ResolveTurnInput);

        expect(blockedTurn.log.some((e) => e.event === 'status-blocked' && e.reason === 'asleep')).toBe(true);
        expect(blockedTurn.participants[0].pokemons[0].statusCounter).toBe(0);
        expect(blockedTurn.participants[0].pokemons[0].statusCondition).toBe('ASLEEP');

        // Turno seguinte: contador zerado => acorda e o move executa normalmente.
        const spy = mockRandomSequence([0.01, 0.99, 0.5]); // missed(hit), crit(não), randomFactor

        const wakeTurn = service.resolveTurn({
            turnNumber: 2,
            participants: blockedTurn.participants,
            actions: [
                { participantId: 'A', action: { type: 'MOVE', moveId: 'move-1' } },
                switchToSelf('B', 'b1'),
            ],
        } satisfies ResolveTurnInput);

        spy.mockRestore();

        expect(wakeTurn.log.some((e) => e.event === 'status-cured' && e.statusCondition === 'ASLEEP')).toBe(true);
        expect(wakeTurn.participants[0].pokemons[0].statusCondition).toBe('NONE');
        expect(wakeTurn.log.some((e) => e.event === 'move' && e.participantId === 'A')).toBe(true);
    });

    it('move de status puro não calcula dano e aplica o stat stage da tabela curada', () => {
        const leer = buildMove({ id: 'move-leer', name: 'leer', power: null, accuracy: 100, damageClass: 'status' });
        const tackle = buildMove({ id: 'move-tackle', name: 'tackle', power: 40, accuracy: 100, damageClass: 'physical' });

        const attacker = buildPokemon({
            battlePokemonId: 'a1',
            moves: [
                { battlePokemonMoveId: 'bpm-leer', currentPp: 10, move: leer },
                { battlePokemonMoveId: 'bpm-tackle', currentPp: 10, move: tackle },
            ],
        });
        const defender = buildPokemon({ battlePokemonId: 'b1' });

        const spy = mockRandomSequence([0.01]); // Leer: missed roll (acerta)

        const turn1 = service.resolveTurn({
            turnNumber: 1,
            participants: [buildParticipant('A', attacker), buildParticipant('B', defender)],
            actions: [
                { participantId: 'A', action: { type: 'MOVE', moveId: 'move-leer' } },
                switchToSelf('B', 'b1'),
            ],
        } satisfies ResolveTurnInput);

        spy.mockRestore();

        const leerEntry = findMoveEntry(turn1.log, 'A');
        expect(leerEntry.damage).toBe(0);
        expect(turn1.participants[1].pokemons[0].currentHp).toBe(100);

        const statChange = turn1.log.find((e) => e.event === 'stat-change' && e.participantId === 'B');
        expect(statChange).toMatchObject({ stat: 'def', stages: -1, newStage: -1 });
        expect(turn1.participants[1].pokemons[0].statStages.def).toBe(-1);
        expect(getStatMultiplier(-1)).toBeCloseTo(2 / 3);

        // Turno 2: Tackle contra o defensor debilitado deve causar mais dano que contra um sem debuff.
        const seqDebuffed = mockRandomSequence([0.01, 0.99, 0.5]);
        const turn2Debuffed = service.resolveTurn({
            turnNumber: 2,
            participants: turn1.participants,
            actions: [
                { participantId: 'A', action: { type: 'MOVE', moveId: 'move-tackle' } },
                switchToSelf('B', 'b1'),
            ],
        } satisfies ResolveTurnInput);
        seqDebuffed.mockRestore();

        const controlDefender = buildPokemon({ battlePokemonId: 'b1' });
        const seqControl = mockRandomSequence([0.01, 0.99, 0.5]);
        const turn2Control = service.resolveTurn({
            turnNumber: 2,
            participants: [turn1.participants[0], buildParticipant('B', controlDefender)],
            actions: [
                { participantId: 'A', action: { type: 'MOVE', moveId: 'move-tackle' } },
                switchToSelf('B', 'b1'),
            ],
        } satisfies ResolveTurnInput);
        seqControl.mockRestore();

        const damageDebuffed = findMoveEntry(turn2Debuffed.log, 'A').damage;
        const damageControl = findMoveEntry(turn2Control.log, 'A').damage;

        expect(damageDebuffed).toBeGreaterThan(damageControl);
    });

    it('move de cura pura recupera HP do próprio atacante, sem passar do HP máximo', () => {
        const recover = buildMove({
            id: 'move-recover',
            name: 'recover',
            power: null,
            accuracy: 100,
            damageClass: 'status',
            healing: 50,
        });

        const attacker = buildPokemon({
            battlePokemonId: 'a1',
            currentHp: 40,
            moves: [{ battlePokemonMoveId: 'bpm-recover', currentPp: 10, move: recover }],
        });
        const defender = buildPokemon({ battlePokemonId: 'b1' });

        const spy = mockRandomSequence([0.01]); // missed roll (acerta)

        const result = service.resolveTurn({
            turnNumber: 1,
            participants: [buildParticipant('A', attacker), buildParticipant('B', defender)],
            actions: [
                { participantId: 'A', action: { type: 'MOVE', moveId: 'move-recover' } },
                switchToSelf('B', 'b1'),
            ],
        } satisfies ResolveTurnInput);

        spy.mockRestore();

        const healEntry = result.log.find((e) => e.event === 'heal' && e.participantId === 'A');
        expect(healEntry).toMatchObject({ amount: 50 });
        expect(result.participants[0].pokemons[0].currentHp).toBe(90);
    });

    it('move com drain positivo cura o atacante proporcionalmente ao dano causado', () => {
        const gigaDrain = buildMove({
            id: 'move-giga-drain',
            name: 'giga-drain',
            power: 40,
            accuracy: 100,
            damageClass: 'special',
            type: 'grass',
            drain: 50,
        });

        const attacker = buildPokemon({
            battlePokemonId: 'a1',
            currentHp: 50,
            moves: [{ battlePokemonMoveId: 'bpm-giga-drain', currentPp: 10, move: gigaDrain }],
        });
        const defender = buildPokemon({ battlePokemonId: 'b1' });

        const spy = mockRandomSequence([0.01, 0.99, 0.5]); // missed(hit), crit(não), randomFactor

        const result = service.resolveTurn({
            turnNumber: 1,
            participants: [buildParticipant('A', attacker), buildParticipant('B', defender)],
            actions: [
                { participantId: 'A', action: { type: 'MOVE', moveId: 'move-giga-drain' } },
                switchToSelf('B', 'b1'),
            ],
        } satisfies ResolveTurnInput);

        spy.mockRestore();

        const damageDealt = findMoveEntry(result.log, 'A').damage;
        const expectedHeal = Math.floor((damageDealt * 50) / 100);

        const healEntry = result.log.find((e) => e.event === 'heal' && e.participantId === 'A');
        expect(healEntry).toMatchObject({ amount: expectedHeal });
        expect(result.participants[0].pokemons[0].currentHp).toBe(50 + expectedHeal);
    });

    it('move com drain negativo causa recuo no atacante, podendo desmaiá-lo', () => {
        const takeDown = buildMove({
            id: 'move-take-down',
            name: 'take-down',
            power: 40,
            accuracy: 100,
            damageClass: 'physical',
            type: 'normal',
            drain: -25,
        });

        const buildAttacker = (currentHp: number) =>
            buildPokemon({
                battlePokemonId: 'a1',
                currentHp,
                moves: [{ battlePokemonMoveId: 'bpm-take-down', currentPp: 10, move: takeDown }],
            });

        // Cenário 1: recuo tira HP mas não desmaia.
        const spy1 = mockRandomSequence([0.01, 0.99, 0.5]);
        const result1 = service.resolveTurn({
            turnNumber: 1,
            participants: [buildParticipant('A', buildAttacker(100)), buildParticipant('B', buildPokemon({ battlePokemonId: 'b1' }))],
            actions: [
                { participantId: 'A', action: { type: 'MOVE', moveId: 'move-take-down' } },
                switchToSelf('B', 'b1'),
            ],
        } satisfies ResolveTurnInput);
        spy1.mockRestore();

        const damageDealt = findMoveEntry(result1.log, 'A').damage;
        const expectedRecoil = Math.floor((damageDealt * 25) / 100);

        const recoilEntry1 = result1.log.find((e) => e.event === 'recoil' && e.participantId === 'A');
        expect(recoilEntry1).toMatchObject({ damage: expectedRecoil, targetFainted: false });
        expect(result1.participants[0].pokemons[0].currentHp).toBe(100 - expectedRecoil);
        expect(result1.finished).toBe(false);

        // Cenário 2: o mesmo recuo, mas o atacante já está com HP baixo o suficiente pra desmaiar.
        const spy2 = mockRandomSequence([0.01, 0.99, 0.5]);
        const result2 = service.resolveTurn({
            turnNumber: 1,
            participants: [
                buildParticipant('A', buildAttacker(expectedRecoil)),
                buildParticipant('B', buildPokemon({ battlePokemonId: 'b1' })),
            ],
            actions: [
                { participantId: 'A', action: { type: 'MOVE', moveId: 'move-take-down' } },
                switchToSelf('B', 'b1'),
            ],
        } satisfies ResolveTurnInput);
        spy2.mockRestore();

        const recoilEntry2 = result2.log.find((e) => e.event === 'recoil' && e.participantId === 'A');
        expect(recoilEntry2).toMatchObject({ targetFainted: true });
        expect(result2.participants[0].pokemons[0].fainted).toBe(true);
        expect(result2.participants[0].pokemons[0].currentHp).toBe(0);
        expect(result2.winnerParticipantId).toBe('B');
        expect(result2.finished).toBe(true);
    });

    it('quem desmaia no turno não chega a agir, mesmo tendo submetido um MOVE', () => {
        const quickAttack = buildMove({ id: 'move-quick-attack', name: 'quick-attack', priority: 1 });
        const counterTackle = buildMove({ id: 'move-tackle-b', name: 'tackle' });

        const attackerA = buildPokemon({
            battlePokemonId: 'a1',
            moves: [{ battlePokemonMoveId: 'bpm-a', currentPp: 10, move: quickAttack }],
        });
        const attackerB = buildPokemon({
            battlePokemonId: 'b1',
            currentHp: 1, // qualquer dano de A já desmaia
            moves: [{ battlePokemonMoveId: 'bpm-b', currentPp: 10, move: counterTackle }],
        });

        // Só 3 sorteios: A é sempre primeiro (priority 1), e B nem chega a rolar nada (fainted).
        const spy = mockRandomSequence([0.01, 0.99, 0.5]); // A: missed(hit), crit(não), randomFactor

        const result = service.resolveTurn({
            turnNumber: 1,
            participants: [buildParticipant('A', attackerA), buildParticipant('B', attackerB)],
            actions: [
                { participantId: 'A', action: { type: 'MOVE', moveId: 'move-quick-attack' } },
                { participantId: 'B', action: { type: 'MOVE', moveId: 'move-tackle-b' } },
            ],
        } satisfies ResolveTurnInput);

        spy.mockRestore();

        const aEntry = findMoveEntry(result.log, 'A');
        expect(aEntry.targetFainted).toBe(true);

        expect(result.log.some((e) => e.event === 'move' && e.participantId === 'B')).toBe(false);
        expect(result.log.some((e) => e.event === 'move-failed' && e.participantId === 'B')).toBe(false);

        const updatedB = result.participants[1].pokemons[0];
        expect(updatedB.fainted).toBe(true);
        expect(updatedB.moves[0].currentPp).toBe(10); // PP de B não foi gasto

        const updatedA = result.participants[0].pokemons[0];
        expect(updatedA.currentHp).toBe(100); // B nunca chegou a bater em A

        expect(result.winnerParticipantId).toBe('A');
        expect(result.finished).toBe(true);
    });
});
