import { expect, test } from 'vitest';
import { getCard } from '@coddle/content';
import {
  applyAction,
  createGame,
  getLegalActions,
  SOLO_STANDARD,
} from './index';
import type { GameConfig, GameState } from './types';

function setup(
  players: 2 | 3 | 4,
  interaction: 'versus' | 'coop',
  win: GameConfig['winCondition'] = { type: 'surviveDays', days: 2 },
): GameState {
  const config: GameConfig = {
    ...SOLO_STANDARD,
    players,
    interaction,
    winCondition: win,
  };
  let state = createGame(config, 400);
  while (state.phase === 'chooseBaby') {
    const action = getLegalActions(state, state.activePlayerId)[0]!;
    state = applyAction(state, action).state;
  }
  return state;
}
function action(
  state: GameState,
  type: string,
  playerId = state.activePlayerId,
) {
  return getLegalActions(state, playerId).find(
    (candidate) => candidate.type === type,
  );
}
function endTurn(state: GameState): GameState {
  state = applyAction(state, action(state, 'endTurn')!).state;
  while (state.phase === 'discard')
    state = applyAction(
      state,
      getLegalActions(state, state.activePlayerId)[0]!,
    ).state;
  return state;
}
test('2-4 players use distinct Baby cards and shared hands/deck with seating order', () => {
  for (const count of [2, 3, 4] as const) {
    const state = setup(count, 'versus');
    expect(state.players).toHaveLength(count);
    expect(new Set(state.players.map((p) => p.babyId)).size).toBe(count);
    expect(state.players[0]!.hand.length).toBeGreaterThanOrEqual(7);
    expect(state.players.slice(1).every((p) => p.hand.length >= 5)).toBe(true);
    expect(state.seatOrder).toEqual(state.players.map((p) => p.id));
    expect(
      state.decks.care.draw.filter((id) => id === 'steal-binky').length +
        state.players
          .flatMap((p) => p.hand)
          .filter((c) => c.cardId === 'steal-binky').length,
    ).toBe(2);
  }
});
test('turns pass to each living seat, rotate daily, and apply one shared Day Event', () => {
  let state = setup(2, 'versus');
  state.decks.event.draw = ['growth-spurt'];
  for (const player of state.players) player.hunger = 5;
  state = endTurn(state);
  expect(state.activePlayerId).toBe('p2');
  expect(state.day).toBe(1);
  for (const player of state.players) player.hunger = 5;
  state = endTurn(state);
  expect(state.day).toBe(2);
  expect(state.activePlayerId).toBe('p2');
  expect(state.dayEvent).toBe('growth-spurt');
  expect(state.players[0]!.hunger).toBe(3);
  expect(state.players[1]!.hunger).toBeLessThanOrEqual(3);
});
test('Pass the Parcel costs one Stamina, marks Hot, and cannot be passed twice', () => {
  let state = setup(2, 'versus');
  const p = state.players[0]!;
  p.stamina = 4;
  const uid = `h${state.nextId++}`;
  p.trouble.push({
    uid,
    cardId: 'dirty-diaper',
    timer: 1,
    answeredTags: [],
    extraTags: [],
    hot: false,
    drawDay: 1,
  });
  const pass = getLegalActions(state, p.id).find(
    (a) =>
      a.type === 'pass' && a.targetPlayerId === 'p2' && a.hazardUid === uid,
  );
  expect(pass).toBeDefined();
  state = applyAction(state, pass!).state;
  expect(state.players[0]!.stamina).toBe(3);
  expect(state.players[0]!.trouble.some((hazard) => hazard.uid === uid)).toBe(
    false,
  );
  expect(
    state.players[1]!.trouble.find((hazard) => hazard.uid === uid),
  ).toMatchObject({
    uid,
    timer: 1,
    hot: true,
  });
  state.players[1]!.stamina = 4;
  state.activePlayerId = 'p2';
  expect(
    getLegalActions(state, 'p2').some(
      (a) => a.type === 'pass' && a.hazardUid === uid,
    ),
  ).toBe(false);
});
test('Sibling cards target rivals and steal or apply Fussy', () => {
  let state = setup(2, 'versus');
  const actor = state.players[0]!;
  const rival = state.players[1]!;
  const uid = `c${state.nextId++}`;
  actor.hand.push({ uid, cardId: 'steal-binky' });
  const rivalHand = [...rival.hand];
  const steal = getLegalActions(state, actor.id).find(
    (a) =>
      a.type === 'play' && a.cardUid === uid && a.targetPlayerId === rival.id,
  );
  expect(steal).toBeDefined();
  state = applyAction(state, steal!).state;
  const stolenUid = rivalHand.find(
    (c) => !state.players[1]!.hand.some((remaining) => remaining.uid === c.uid),
  )?.uid;
  expect(stolenUid).toBeDefined();
  expect(state.players[0]!.hand.some((c) => c.uid === stolenUid)).toBe(true);
  const mimic = `c${state.nextId++}`;
  state.players[0]!.hand.push({ uid: mimic, cardId: 'mimic-cry' });
  const cry = getLegalActions(state, actor.id).find(
    (a) =>
      a.type === 'play' && a.cardUid === mimic && a.targetPlayerId === rival.id,
  );
  expect(cry).toBeDefined();
  state = applyAction(state, cry!).state;
  expect(state.players[1]!.statuses).toContain('Fussy');
});
test('Co-op share transfers one card for Stamina, Lullaby helps all, and ghosts shield once', () => {
  let state = setup(2, 'coop');
  const p1 = state.players[0]!;
  const p2 = state.players[1]!;
  p1.stamina = 4;
  const cardUid = p1.hand[0]!.uid;
  const share = getLegalActions(state, p1.id).find(
    (a) =>
      a.type === 'share' && a.cardUid === cardUid && a.targetPlayerId === p2.id,
  );
  expect(share).toBeDefined();
  state = applyAction(state, share!).state;
  expect(state.players[0]!.stamina).toBe(3);
  expect(state.players[1]!.hand.some((c) => c.uid === cardUid)).toBe(true);
  state.players[0]!.hand.push({ uid: `l${state.nextId++}`, cardId: 'lullaby' });
  const lullaby = getLegalActions(state, p1.id).find(
    (a) => a.type === 'play' && a.cardUid === `l${state.nextId - 1}`,
  );
  expect(lullaby).toBeDefined();
  state = applyAction(state, lullaby!).state;
  expect(state.players[0]!.coddle).toBe(2);
  expect(state.players[1]!.coddle).toBe(1);
  state.players[0]!.alive = false;
  state.players[1]!.shield = 0;
  state.activePlayerId = p2.id;
  const ghost = getLegalActions(state, p2.id).find((a) => a.type === 'ghost');
  expect(ghost).toBeDefined();
  state = applyAction(state, ghost!).state;
  expect(state.players[1]!.shield).toBe(1);
  expect(getLegalActions(state, p2.id).some((a) => a.type === 'ghost')).toBe(
    false,
  );
});
test('last-standing tie breaks from each baby’s pre-Night Health', () => {
  let state = setup(2, 'versus', { type: 'lastStanding', days: null });
  state.players[0]!.hp = 1;
  state.players[0]!.hunger = 0;
  state = endTurn(state);
  expect(state.phase).not.toBe('finished');
  state.players[1]!.hp = 1;
  state.players[1]!.hunger = 0;
  state = endTurn(state);
  expect(state.result?.winners).toEqual(['p1']);
  expect(state.result?.outcome).toBe('win');
  expect(state.players[0]!.milestones).not.toContain('iron-baby');
});
test('Co-op yields Silver when at least half survive and Gold when all survive', () => {
  let state = setup(2, 'coop', { type: 'surviveDays', days: 1 });
  state.players[0]!.hp = 1;
  state.players[0]!.hunger = 0;
  state = endTurn(state);
  state = endTurn(state);
  expect(state.result?.outcome).toBe('silver');
  expect(state.result?.winners).toEqual(['p2']);
  state = setup(2, 'coop', { type: 'surviveDays', days: 1 });
  state = endTurn(state);
  state = endTurn(state);
  expect(state.result?.outcome).toBe('gold');
  expect(state.result?.winners).toEqual(['p1', 'p2']);
});
test('Survival Race ranks surviving seats by Health, then Milestones', () => {
  let state = setup(2, 'versus', { type: 'surviveDays', days: 1 });
  state.decks.hazard.draw = [];
  state.decks.hazard.discard = [];
  for (const player of state.players) {
    player.trouble = [];
    player.baseStats.maxHp = 20;
    player.maxHp = 20;
    player.hunger = 5;
  }
  state.players[0]!.hp = 10;
  state.players[1]!.hp = 11;
  state.players[0]!.milestones.push('first-smile');
  state = endTurn(state);
  state = endTurn(state);
  expect(state.result?.winners).toEqual(['p2', 'p1']);
  expect(state.result?.score).toBeGreaterThan(0);
  state = setup(2, 'versus', { type: 'surviveDays', days: 1 });
  state.decks.hazard.draw = [];
  state.decks.hazard.discard = [];
  for (const player of state.players) {
    player.trouble = [];
    player.baseStats.maxHp = 20;
    player.maxHp = 20;
    player.hp = 10;
    player.hunger = 5;
  }
  state.players[0]!.milestones.push('first-smile');
  state = endTurn(state);
  state = endTurn(state);
  expect(state.result?.winners).toEqual(['p1', 'p2']);
});
test('Survival winners earn Iron Baby before their score is calculated', () => {
  let state = setup(2, 'coop', { type: 'surviveDays', days: 1 });
  state.decks.hazard.draw = [];
  state.decks.hazard.discard = [];
  for (const player of state.players) {
    player.trouble = [];
    player.hunger = 5;
  }
  state.players[0]!.hp = 3;
  state.players[1]!.hp = 10;
  state = endTurn(state);
  state = endTurn(state);
  expect(state.players[0]!.milestones).toContain('iron-baby');
  expect(state.result?.score).toBe(
    10 + state.players[0]!.hp + state.players[0]!.milestones.length * 5 + 1,
  );
});
test('Invalid multiplayer presets reject unsupported combination', () => {
  expect(() => createGame({ ...SOLO_STANDARD, players: 2 }, 1)).toThrow('Solo');
  expect(() =>
    createGame({ ...SOLO_STANDARD, players: 1, interaction: 'coop' }, 1),
  ).toThrow('Solo');
  expect(() =>
    createGame(
      {
        ...SOLO_STANDARD,
        players: 2,
        interaction: 'versus',
        botPlayers: ['p3'],
      },
      1,
    ),
  ).toThrow('Bot seats');
  expect(getCard('steal-binky').type).toBe('care');
});
