import { expect, test } from 'vitest';
import {
  applyAction,
  createGame,
  getLegalActions,
  SOLO_STANDARD,
} from '@coddle/engine';
import { chooseAction } from './index';

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
