import { BattleAiService } from './battle-ai.service';
import { EngineBattlePokemon, EngineMove, EngineParticipant } from './battle-engine.service';
import { createEmptyStatStages } from './stat-stage-moves';

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
        target: 'selected-pokemon',
        statChance: null,
        statChanges: [],
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

function buildParticipant(participantId: string, pokemons: EngineBattlePokemon[], activeSlot = 0): EngineParticipant {
    return { participantId, activeSlot, pokemons };
}

describe('BattleAiService', () => {
    let service: BattleAiService;

    beforeEach(() => {
        service = new BattleAiService();
    });

    describe('decideAction — vantagem de tipo', () => {
        it('escolhe o golpe de maior dano esperado (power × efetividade × STAB × accuracy)', () => {
            const active = buildPokemon({
                battlePokemonId: 'charizard',
                types: ['fire', 'flying'],
                moves: [
                    { battlePokemonMoveId: 'a', currentPp: 10, move: buildMove({ id: 'flamethrower', type: 'fire', power: 90 }) },
                    { battlePokemonMoveId: 'b', currentPp: 10, move: buildMove({ id: 'wing-attack', type: 'flying', power: 60 }) },
                    { battlePokemonMoveId: 'c', currentPp: 10, move: buildMove({ id: 'dragon-claw', type: 'dragon', power: 80 }) },
                    {
                        battlePokemonMoveId: 'd',
                        currentPp: 10,
                        move: buildMove({ id: 'swords-dance', damageClass: 'status', power: null, target: 'user', statChanges: [{ stat: 'atk', stages: 2 }] }),
                    },
                ],
            });
            const opponentActive = buildPokemon({ battlePokemonId: 'venusaur', types: ['grass', 'poison'] });

            const bot = buildParticipant('bot', [active]);
            const opponent = buildParticipant('opponent', [opponentActive]);

            expect(service.decideAction(bot, opponent)).toEqual({ type: 'MOVE', moveId: 'flamethrower' });
        });

        it('nunca escolhe um golpe com PP zerado', () => {
            const active = buildPokemon({
                moves: [
                    { battlePokemonMoveId: 'a', currentPp: 0, move: buildMove({ id: 'strong', type: 'water', power: 150 }) },
                    { battlePokemonMoveId: 'b', currentPp: 5, move: buildMove({ id: 'weak', type: 'water', power: 40 }) },
                ],
            });
            const opponentActive = buildPokemon({ types: ['fire'] });

            const result = service.decideAction(buildParticipant('bot', [active]), buildParticipant('opp', [opponentActive]));

            expect(result).toEqual({ type: 'MOVE', moveId: 'weak' });
        });

        it('nunca escolhe voluntariamente um golpe com efetividade 0 se houver alternativa', () => {
            const active = buildPokemon({
                moves: [
                    { battlePokemonMoveId: 'a', currentPp: 5, move: buildMove({ id: 'ground-move', type: 'ground', power: 100 }) },
                    { battlePokemonMoveId: 'b', currentPp: 5, move: buildMove({ id: 'normal-move', type: 'normal', power: 40 }) },
                ],
            });
            // flying é imune a ground
            const opponentActive = buildPokemon({ types: ['flying'] });

            const result = service.decideAction(buildParticipant('bot', [active]), buildParticipant('opp', [opponentActive]));

            expect(result).toEqual({ type: 'MOVE', moveId: 'normal-move' });
        });
    });

    describe('decideAction — desvantagem de tipo (seção 3.3 do doc de comportamento)', () => {
        it('usa um golpe de debuff no oponente em vez de atacar fraco, quando ainda não debuffou esse Pokémon', () => {
            const active = buildPokemon({
                battlePokemonId: 'blastoise',
                types: ['water'],
                moves: [
                    { battlePokemonMoveId: 'a', currentPp: 10, move: buildMove({ id: 'hydro-pump', type: 'water', power: 110 }) },
                    {
                        battlePokemonMoveId: 'b',
                        currentPp: 10,
                        move: buildMove({
                            id: 'leer',
                            damageClass: 'status',
                            power: null,
                            target: 'selected-pokemon',
                            statChanges: [{ stat: 'def', stages: -1 }],
                        }),
                    },
                ],
            });
            // grass resiste a water (0.5x) — desvantagem
            const opponentActive = buildPokemon({ battlePokemonId: 'venusaur', types: ['grass', 'poison'] });

            const result = service.decideAction(buildParticipant('bot', [active]), buildParticipant('opp', [opponentActive]));

            expect(result).toEqual({ type: 'MOVE', moveId: 'leer' });
        });

        it('não repete o debuff se o oponente já está com algum stat abaixo de 0', () => {
            const active = buildPokemon({
                types: ['water'],
                moves: [
                    { battlePokemonMoveId: 'a', currentPp: 10, move: buildMove({ id: 'hydro-pump', type: 'water', power: 110 }) },
                    {
                        battlePokemonMoveId: 'b',
                        currentPp: 10,
                        move: buildMove({
                            id: 'leer',
                            damageClass: 'status',
                            power: null,
                            target: 'selected-pokemon',
                            statChanges: [{ stat: 'def', stages: -1 }],
                        }),
                    },
                ],
            });
            const opponentActive = buildPokemon({
                types: ['grass', 'poison'],
                statStages: { ...createEmptyStatStages(), def: -1 },
            });

            const result = service.decideAction(buildParticipant('bot', [active]), buildParticipant('opp', [opponentActive]));

            expect(result).toEqual({ type: 'MOVE', moveId: 'hydro-pump' });
        });

        it('matchup neutro (1x) não dispara o gatilho de debuff', () => {
            const active = buildPokemon({
                types: ['normal'],
                moves: [
                    { battlePokemonMoveId: 'a', currentPp: 10, move: buildMove({ id: 'tackle', type: 'normal', power: 40 }) },
                    {
                        battlePokemonMoveId: 'b',
                        currentPp: 10,
                        move: buildMove({
                            id: 'growl',
                            damageClass: 'status',
                            power: null,
                            target: 'selected-pokemon',
                            statChanges: [{ stat: 'atk', stages: -1 }],
                        }),
                    },
                ],
            });
            // normal é neutro contra ghost/normal? usa um tipo neutro de verdade: electric (não afeta normal)
            const opponentActive = buildPokemon({ types: ['electric'] });

            const result = service.decideAction(buildParticipant('bot', [active]), buildParticipant('opp', [opponentActive]));

            expect(result).toEqual({ type: 'MOVE', moveId: 'tackle' });
        });
    });

    describe('decideAction — fallback de emergência (sem golpe utilizável)', () => {
        it('troca pro melhor matchup vivo quando todos os golpes estão sem PP', () => {
            const active = buildPokemon({
                battlePokemonId: 'active',
                types: ['fire'],
                moves: [{ battlePokemonMoveId: 'a', currentPp: 0, move: buildMove() }],
            });
            const badBackup = buildPokemon({ battlePokemonId: 'bad-backup', position: 1, types: ['fire'] });
            const goodBackup = buildPokemon({ battlePokemonId: 'good-backup', position: 2, types: ['water'] });
            const opponentActive = buildPokemon({ types: ['ground', 'rock'] });

            const bot = buildParticipant('bot', [active, badBackup, goodBackup]);
            const result = service.decideAction(bot, buildParticipant('opp', [opponentActive]));

            expect(result).toEqual({ type: 'SWITCH', targetBattlePokemonId: 'good-backup' });
        });

        it('desiste (FORFEIT) quando não sobra golpe nem Pokémon vivo pra trocar', () => {
            const active = buildPokemon({
                battlePokemonId: 'active',
                moves: [{ battlePokemonMoveId: 'a', currentPp: 0, move: buildMove() }],
            });
            const faintedBackup = buildPokemon({ battlePokemonId: 'fainted', position: 1, fainted: true });
            const opponentActive = buildPokemon();

            const bot = buildParticipant('bot', [active, faintedBackup]);
            const result = service.decideAction(bot, buildParticipant('opp', [opponentActive]));

            expect(result).toEqual({ type: 'FORFEIT' });
        });
    });

    describe('decideSwitch — troca forçada', () => {
        it('escolhe o Pokémon vivo com melhor matchup ofensivo/defensivo, ignorando o desmaiado', () => {
            const fainted = buildPokemon({ battlePokemonId: 'fainted', position: 0, fainted: true });
            // water: ofende 2x contra ground/rock, apanha 1x (neutro) — bom matchup
            const waterMon = buildPokemon({ battlePokemonId: 'water-mon', position: 1, types: ['water'] });
            // normal: ofende 1x, apanha 2x (rock é forte contra normal) — matchup ruim
            const normalMon = buildPokemon({ battlePokemonId: 'normal-mon', position: 2, types: ['normal'] });

            const bot = buildParticipant('bot', [fainted, waterMon, normalMon]);
            const opponentActive = buildPokemon({ types: ['ground', 'rock'] });

            expect(service.decideSwitch(bot, opponentActive)).toBe('water-mon');
        });
    });
});
