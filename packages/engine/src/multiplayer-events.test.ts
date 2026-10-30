import { expect, test } from 'vitest';
import {
  applyAction,
  createGame,
  getLegalActions,
  SOLO_STANDARD,
} from './index';
import type { GameState } from './types';

function setup(interaction: 'versus' | 'coop', days = 2): GameState {
  let state = createGame(
    {
      ...SOLO_STANDARD,
      players: 2,
      interaction,
      winCondition: { type: 'surviveDays', days },
    },
    400,
  );
  while (state.phase === 'chooseBaby')
    state = applyAction(
      state,
      getLegalActions(state, state.activePlayerId)[0]!,
    ).state;
  return state;
}
function endTurn(state: GameState): GameState {
  state = applyAction(
    state,
    getLegalActions(state, state.activePlayerId).find(
      (action) => action.type === 'endTurn',
    )!,
  ).state;
  while (state.phase === 'discard')
    state = applyAction(
      state,
      getLegalActions(state, state.activePlayerId)[0]!,
    ).state;
  return state;
}
test('shared Day Events recycle after a full multiplayer Day', () => {
  let state = setup('versus', 4);
  state.decks.event.draw = ['growth-spurt', 'lazy-sunday'];
  state.decks.event.discard = [];
  state.decks.hazard.draw = [];
  state.decks.hazard.discard = [];
  for (const player of state.players) {
    player.trouble = [];
    player.hp = player.maxHp;
    player.hunger = 5;
  }
  state = endTurn(state);
  state = endTurn(state);
  expect(state.dayEvent).toBe('growth-spurt');
  state = endTurn(state);
  state = endTurn(state);
  expect(state.dayEvent).toBe('lazy-sunday');
  expect(state.decks.event.discard).toContain('growth-spurt');
});
test('Power Outage suppresses co-op Aura but preserves the played card effect', () => {
  let state = setup('coop');
  state.dayEvent = 'power-outage';
  state.players.forEach((player) => {
    player.cute = 5;
    player.coddle = 0;
    player.statuses = [];
  });
  const uid = `c${state.nextId++}`;
  state.players[0]!.hand.push({ uid, cardId: 'lullaby' });
  const lullaby = getLegalActions(state, 'p1').find(
    (action) => action.type === 'play' && action.cardUid === uid,
  );
  state = applyAction(state, lullaby!).state;
  expect(state.players[0]!.coddle).toBe(1);
  expect(state.players[1]!.coddle).toBe(0);
});
