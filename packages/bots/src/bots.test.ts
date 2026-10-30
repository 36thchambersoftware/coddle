import { expect, test } from 'vitest';
import {
  applyAction,
  createGame,
  getLegalActions,
  SOLO_STANDARD,
} from '@coddle/engine';
import { chooseAction } from './index';

function multiplayer(interaction: 'versus' | 'coop') {
  let state = createGame(
    {
      ...SOLO_STANDARD,
      players: 2,
      interaction,
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

test.each(['easy', 'normal'] as const)(
  '%s bot is deterministic, pure and legal',
  (level) => {
    let state = createGame(SOLO_STANDARD, 42);
    while (state.phase !== 'finished') {
      const snapshot = structuredClone(state);
      const action = chooseAction(state, 'p1', level);
      expect(action).toEqual(chooseAction(state, 'p1', level));
      expect(state).toEqual(snapshot);
      expect(getLegalActions(state, 'p1')).toContainEqual(action);
      state = applyAction(state, action).state;
    }
    expect(() => chooseAction(state, 'p1', level)).toThrow('No legal action');
  },
);
test('Normal decisions meet the 50 ms budget without reading hidden deck order', () => {
  let s = createGame(SOLO_STANDARD, 55);
  s = applyAction(s, chooseAction(s, 'p1')).state;
  const start = performance.now();
  for (let i = 0; i < 50; i++) chooseAction(s, 'p1');
  expect((performance.now() - start) / 50).toBeLessThan(50);
  const other = structuredClone(s);
  other.decks.care.draw.reverse();
  other.decks.hazard.draw.reverse();
  other.rng = 99;
  expect(chooseAction(s, 'p1')).toEqual(chooseAction(other, 'p1'));
});
test('Hard bot runs deterministic 30-draw lookahead without mutating hidden deck state', () => {
  let state = createGame(SOLO_STANDARD, 71);
  const choice = chooseAction(state, 'p1', 'hard');
  expect(choice).toEqual(chooseAction(state, 'p1', 'hard'));
  state = applyAction(state, choice).state;
  const snapshot = structuredClone(state);
  const action = chooseAction(state, 'p1', 'hard');
  expect(action).toEqual(chooseAction(state, 'p1', 'hard'));
  expect(state).toEqual(snapshot);
  expect(getLegalActions(state, 'p1')).toContainEqual(action);
  expect(() =>
    chooseAction(
      {
        ...state,
        decks: { ...state.decks, hazard: { draw: [], discard: [] } },
      },
      'p1',
      'hard',
    ),
  ).not.toThrow();
});
test('Multiplayer bots evaluate pass, share, Sibling and Ghost Helper actions', () => {
  const versus = multiplayer('versus');
  const player = versus.players[0]!;
  player.stamina = 4;
  player.trouble.push({
    uid: `h${versus.nextId++}`,
    cardId: 'dirty-diaper',
    timer: 1,
    answeredTags: [],
    extraTags: [],
    hot: false,
    drawDay: 1,
  });
  player.hand.push({ uid: `c${versus.nextId++}`, cardId: 'mimic-cry' });
  expect(
    getLegalActions(versus, player.id).some(
      (action) => action.type === 'play' && action.targetPlayerId === 'p2',
    ),
  ).toBe(true);
  expect(() => chooseAction(versus, player.id)).not.toThrow();
  expect(() => chooseAction(versus, player.id, 'hard')).not.toThrow();

  const coop = multiplayer('coop');
  coop.players[0]!.alive = false;
  coop.players[1]!.trouble.push({
    uid: `h${coop.nextId++}`,
    cardId: 'dirty-diaper',
    timer: 1,
    answeredTags: [],
    extraTags: [],
    hot: false,
    drawDay: 1,
  });
  coop.activePlayerId = 'p2';
  expect(() => chooseAction(coop, 'p2')).not.toThrow();
  expect(
    getLegalActions(coop, 'p2').some((action) => action.type === 'ghost'),
  ).toBe(true);

  const sharing = multiplayer('coop');
  expect(
    getLegalActions(sharing, 'p1').some((action) => action.type === 'share'),
  ).toBe(true);
  expect(() => chooseAction(sharing, 'p1')).not.toThrow();
});
