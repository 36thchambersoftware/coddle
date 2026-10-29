import { expect, test } from 'vitest';
import {
  applyAction,
  createGame,
  getLegalActions,
  SOLO_STANDARD,
} from '@coddle/engine';
import { createGameStore } from './store';
import {
  defaultSettings,
  gameSchema,
  read,
  settingsSchema,
  write,
  type StoragePort,
} from './storage';

function memory(): StoragePort {
  const data = new Map<string, string>();
  return {
    get: (key) => data.get(key) ?? null,
    set: (key, value) => {
      data.set(key, value);
    },
  };
}
test('settings and all game phases round-trip storage without altering replay', () => {
  const storage = memory();
  expect(write(storage, 'settings', defaultSettings)).toBeNull();
  expect(read(storage, 'settings', settingsSchema).value).toEqual(
    defaultSettings,
  );
  let state = createGame(SOLO_STANDARD, 52);
  for (let i = 0; i < 100 && state.phase !== 'finished'; i++) {
    expect(gameSchema.safeParse(state).success).toBe(true);
    write(storage, 'game', state);
    const restored = read(storage, 'game', gameSchema);
    expect(restored.error).toBeNull();
    expect(restored.value).toEqual(state);
    const legal = getLegalActions(state, 'p1');
    const action = legal.find((a) => a.type === 'endTurn') ?? legal[0]!;
    expect(applyAction(restored.value!, action)).toEqual(
      applyAction(state, action),
    );
    state = applyAction(state, action).state;
  }
  expect(gameSchema.safeParse(state).success).toBe(true);
});
test('invalid/corrupt saves and blocked storage are reported explicitly', () => {
  const storage = memory();
  storage.set('game', '{bad json');
  expect(read(storage, 'game', gameSchema).error).toBeTruthy();
  storage.set('game', JSON.stringify({ version: 99 }));
  expect(read(storage, 'game', gameSchema).error).toBeTruthy();
  const blocked: StoragePort = {
    get: () => {
      throw new Error('denied');
    },
    set: () => {
      throw new Error('quota');
    },
  };
  expect(read(blocked, 'game', gameSchema).error).toContain('denied');
  expect(write(blocked, 'game', {})).toContain('quota');
  const store = createGameStore(blocked);
  store.getState().start(SOLO_STANDARD, 42);
  expect(store.getState().game).not.toBeNull();
  expect(store.getState().error).toContain('quota');
});
test('rejects invalid board/deck identities and out-of-range saves', () => {
  const state = createGame(SOLO_STANDARD, 1);
  state.players[0]!.hunger = 6;
  expect(gameSchema.safeParse(state).success).toBe(false);
  state.players[0]!.hunger = 3;
  state.babyChoices = ['milk'];
  expect(gameSchema.safeParse(state).success).toBe(false);
});
test('store saves games/settings and journal results exactly once per run', () => {
  const storage = memory();
  const store = createGameStore(storage);
  store
    .getState()
    .start(
      { ...SOLO_STANDARD, winCondition: { type: 'surviveDays', days: 1 } },
      42,
    );
  store.getState().updateSettings({ portrait: 2, reducedMotion: true });
  let steps = 0;
  while (store.getState().game!.phase !== 'finished' && steps++ < 40) {
    const legal = getLegalActions(store.getState().game!, 'p1');
    store
      .getState()
      .dispatch(legal.find((a) => a.type === 'endTurn') ?? legal[0]!);
  }
  expect(store.getState().journal.runs).toHaveLength(1);
  expect(store.getState().journal.discovered.length).toBeGreaterThan(2);
  const restored = createGameStore(storage);
  expect(restored.getState().game).toEqual(store.getState().game);
  expect(restored.getState().settings.portrait).toBe(2);
  restored.getState().dispatch({ type: 'endTurn', playerId: 'p1' });
  expect(restored.getState().error).toContain('Illegal');
  expect(restored.getState().journal.runs).toHaveLength(1);
});
