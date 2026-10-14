import { BattleTurnState } from 'src/generated/prisma/enums';
import { BattleRepository } from '../repositories/battle.repository';
import { BattleAiService } from './battle-ai.service';
import { BattleEngineService, EngineParticipant, ResolveTurnResult, TurnLogEntry } from './battle-engine.service';
import { BattleService } from './battle.services';
import { createEmptyStatStages } from './stat-stage-moves';

// Participante "do banco" mínimo — sem pokémons, já que o engine é mockado e só o id/isBot importam aqui.
function buildDbParticipant(id: string, overrides: Record<string, unknown> = {}) {
    return { id, userId: `user-${id}`, activeSlot: 0, isBot: false, pendingAction: null, pokemons: [], ...overrides };
}

function buildEngineParticipant(participantId: string, fainted: boolean): EngineParticipant {
    return {
        participantId,
        activeSlot: 0,
        pokemons: [
            {
                battlePokemonId: `${participantId}-poke-0`,
                position: 0,
                types: ['normal'],
                maxHp: 100,
                currentHp: fainted ? 0 : 100,
                atk: 50,
                def: 50,
                spAtk: 50,
                spDef: 50,
                speed: 50,
                fainted,
                statusCondition: 'NONE',
                statusCounter: 0,
                statStages: createEmptyStatStages(),
                moves: [],
            },
        ],
    };
}

describe('BattleService — trocas forçadas no log emitido', () => {
    let repository: Record<string, jest.Mock>;
    let engine: { resolveTurn: jest.Mock };
    let ai: { decideAction: jest.Mock; decideSwitch: jest.Mock };
    let service: BattleService;

    beforeEach(() => {
        repository = {
            findParticipantByUser: jest.fn(),
            getBattleSnapshot: jest.fn().mockResolvedValue({ turnNumber: 3 }),
            applyForcedSwitch: jest.fn(),
            savePendingAction: jest.fn(),
            getParticipantsForResolution: jest.fn(),
            persistTurnResolution: jest.fn().mockResolvedValue({ turnNumber: 4 }),
        };
        engine = { resolveTurn: jest.fn() };
        ai = { decideAction: jest.fn().mockReturnValue({ type: 'MOVE', moveId: 'm1' }), decideSwitch: jest.fn() };
        service = new BattleService(
            repository as unknown as BattleRepository,
            engine as unknown as BattleEngineService,
            ai as unknown as BattleAiService,
        );
    });

    it('troca forçada do humano devolve a entrada "switch" forçada pra ser emitida ao vivo', async () => {
        const logEntry: TurnLogEntry = { event: 'switch', participantId: 'p1', battlePokemonId: 'bp-2', forced: true };
        repository.findParticipantByUser.mockResolvedValue({ id: 'p1', turnState: BattleTurnState.WAITING_FORCED_SWITCH });
        repository.applyForcedSwitch.mockResolvedValue({ participant: {}, logEntry });

        const result = await service.submitAction({
            battleId: 'b1',
            userId: 'user-p1',
            action: { type: 'SWITCH', targetPokemonId: 'bp-2' },
        });

        expect(result).toEqual({ status: 'forced-switch-resolved', participantId: 'p1', log: [logEntry] });
    });

    it('troca forçada do bot entra no fim do log do turn-resolved, depois do desmaio', async () => {
        const human = buildDbParticipant('human', { pendingAction: { type: 'MOVE', moveId: 'm1' } });
        const bot = buildDbParticipant('bot', { isBot: true });
        repository.findParticipantByUser.mockResolvedValue({ id: 'human', turnState: BattleTurnState.WAITING_ACTION });
        repository.getParticipantsForResolution.mockResolvedValue([human, bot]);

        const faintEntry: TurnLogEntry = {
            event: 'move',
            participantId: 'human',
            moveId: 'm1',
            damageClass: 'physical',
            targetParticipantId: 'bot',
            targetBattlePokemonId: 'bot-poke-0',
            missed: false,
            damage: 100,
            effectiveness: 'effective',
            critical: false,
            targetFainted: true,
        };
        const engineResult: ResolveTurnResult = {
            log: [faintEntry],
            participants: [buildEngineParticipant('human', false), buildEngineParticipant('bot', true)],
            forcedSwitchParticipantIds: ['bot'],
            winnerParticipantId: null,
            finished: false,
        };
        engine.resolveTurn.mockReturnValue(engineResult);
        ai.decideSwitch.mockReturnValue('bot-poke-1');
        const switchEntry: TurnLogEntry = { event: 'switch', participantId: 'bot', battlePokemonId: 'bot-poke-1', forced: true };
        repository.applyForcedSwitch.mockResolvedValue({ participant: {}, logEntry: switchEntry });

        const result = await service.submitAction({
            battleId: 'b1',
            userId: 'user-human',
            action: { type: 'MOVE', moveId: 'm1' },
        });

        if (result.status !== 'turn-resolved') throw new Error(`status inesperado: ${result.status}`);
        expect(result.log).toEqual([faintEntry, switchEntry]);
        expect(result.forcedSwitchParticipantIds).toEqual([]);
        // O que foi persistido como resolução do turno não inclui a troca (ela é gravada pelo applyForcedSwitch).
        const [persisted] = repository.persistTurnResolution.mock.calls[0] as [{ result: ResolveTurnResult }];
        expect(persisted.result.log).toEqual([faintEntry]);
    });
});
