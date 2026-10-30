import { expect, test } from 'vitest';
import fc from 'fast-check';
import {
  applyAction,
  createGame,
  getLegalActions,
  SOLO_STANDARD,
} from './index';

test('property: finite games terminate, preserve bounds, serialize and replay', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 0xffffffff }),
      fc.array(fc.nat(), { maxLength: 100 }),
      (seed, picks) => {
        let state = createGame(SOLO_STANDARD, seed);
        for (let step = 0; step < 400 && state.phase !== 'finished'; step++) {
          const legal = getLegalActions(state, 'p1');
          const action =
            step < picks.length
              ? legal[picks[step]! % legal.length]!
              : (legal.find((a) => a.type === 'endTurn') ?? legal[0]!);
          const result = applyAction(state, action);
          expect(result).toEqual(applyAction(state, action));
          state = result.state;
          const p = state.players[0]!;
          expect(p.hp).toBeGreaterThanOrEqual(0);
          expect(p.hp).toBeLessThanOrEqual(p.maxHp);
          expect(p.hunger).toBeGreaterThanOrEqual(0);
          expect(p.hunger).toBeLessThanOrEqual(5);
          expect(p.coddle).toBeGreaterThanOrEqual(0);
          expect(p.coddle).toBeLessThanOrEqual(6);
          expect(p.cute).toBeGreaterThanOrEqual(1);
          expect(p.cute).toBeLessThanOrEqual(10);
          expect(p.staminaCap).toBeGreaterThanOrEqual(1);
          expect(p.staminaCap).toBeLessThanOrEqual(6);
          expect(JSON.parse(JSON.stringify(state))).toEqual(state);
        }
        expect(state.phase).toBe('finished');
      },
    ),
    { numRuns: 150 },
  );
});
