import { describe, expect, test } from 'vitest';
import {
  babies,
  careCards,
  getCard,
  hazards,
  parents,
  modifiers,
  dayEvents,
} from '@coddle/content';
import {
  applyAction,
  createGame,
  getLegalActions,
  SOLO_STANDARD,
} from './index';
import { context, fixture, putCare, putHazard } from './test-helpers';
import { damage, heal, refreshStats, setStat } from './stats';
import { rule, careCost } from './rules';
import { runEffects } from './effects';
import { drawCare } from './decks';
import { addHazards } from './hazards';
import { random, shuffle } from './random';
import type { GameState } from './types';

function invariant(s: GameState): void {
  for (const p of s.players) {
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
    expect(p.stamina).toBeGreaterThanOrEqual(0);
    expect(new Set(p.statuses).size).toBe(p.statuses.length);
    expect(p.trouble.every((h) => h.timer >= 0)).toBe(true);
  }
  expect(JSON.parse(JSON.stringify(s))).toEqual(s);
}
test('createGame validates inputs and serializes its seed/config', () => {
  expect(() => createGame(SOLO_STANDARD, -1)).toThrow('Seed');
  expect(() =>
    createGame(
      { ...SOLO_STANDARD, winCondition: { type: 'surviveDays', days: 0 } },
      1,
    ),
  ).toThrow('days');
  const config = structuredClone(SOLO_STANDARD);
  const s = createGame(config, 0);
  config.difficulty = 'easy';
  expect(s.config.difficulty).toBe('normal');
  invariant(s);
});
test('hard draws one Baby; normal draws two; invalid actors have no actions', () => {
  expect(
    createGame({ ...SOLO_STANDARD, difficulty: 'hard' }, 1).babyChoices,
  ).toHaveLength(1);
  expect(createGame(SOLO_STANDARD, 1).babyChoices).toHaveLength(2);
  expect(getLegalActions(createGame(SOLO_STANDARD, 1), 'nope')).toEqual([]);
});
test('actions are immutable, deterministic, replayable and reject illegal input', () => {
  const s = fixture();
  const original = JSON.stringify(s);
  const cardUid = putCare(s, 'milk');
  const snapshot = structuredClone(s);
  const action = { type: 'play' as const, playerId: 'p1', cardUid };
  const result = applyAction(s, action);
  expect(s).toEqual(snapshot);
  expect(result).toEqual(
    applyAction(JSON.parse(JSON.stringify(s)) as GameState, action),
  );
  expect(result.events.some((e) => e.type === 'cardPlayed')).toBe(true);
  expect(
    result.events.some((e) => e.type === 'change' && e.field === 'players'),
  ).toBe(true);
  expect(() => applyAction(s, { ...action, cardUid: 'missing' })).toThrow(
    'Illegal',
  );
  expect(original).not.toBe(JSON.stringify(s));
});
test('RNG and shuffle are reproducible and never mutate their input', () => {
  const a = { rng: 8 };
  const b = { rng: 8 };
  expect(Array.from({ length: 10 }, () => random(a))).toEqual(
    Array.from({ length: 10 }, () => random(b)),
  );
  const input = [1, 2, 3, 4];
  expect(shuffle({ rng: 99 }, input).sort()).toEqual(input);
  expect(input).toEqual([1, 2, 3, 4]);
});
describe('generated card execution', () => {
  test.each(babies)('$id setup', (baby) => {
    const s = createGame(SOLO_STANDARD, 20);
    s.babyChoices = [baby.id];
    invariant(
      applyAction(s, { type: 'chooseBaby', playerId: 'p1', cardId: baby.id })
        .state,
    );
  });
  test.each(careCards.filter((c) => !c.tags.includes('Sibling')))(
    '$id plays legally',
    (card) => {
      const s = fixture();
      s.day = 5;
      const cardUid = putCare(s, card.id);
      const targetUid = putHazard(s, 'dirty-diaper');
      const action = getLegalActions(s, 'p1').find(
        (a) =>
          a.type === 'play' &&
          a.cardUid === cardUid &&
          ('targetUid' in a ? a.targetUid === targetUid : true),
      );
      expect(action).toBeDefined();
      invariant(applyAction(s, action!).state);
    },
  );
  test.each(hazards)('$id resolves and preserves invariants', (card) => {
    const ctx = context();
    ctx.state.day = 5;
    addHazards(ctx, 1, { id: card.id });
    runEffects({ ...ctx, source: card }, card, 'onResolve');
    invariant(ctx.state);
  });
  test.each([...parents, ...modifiers, ...dayEvents])(
    '$id effects execute',
    (card) => {
      const ctx = context();
      ctx.player.parents = card.type === 'parent' ? [card.id] : [];
      if (card.type === 'modifier') ctx.player.modifiers = [card.id];
      for (const trigger of [
        'onSetup',
        'onWake',
        'onNight',
        'onArrive',
      ] as const)
        runEffects({ ...ctx, source: card }, card, trigger);
      invariant(ctx.state);
    },
  );
});
test('matching Clean answers a hazard, heals less while Stinky, then cures it', () => {
  const s = fixture();
  s.players[0]!.statuses = ['Stinky'];
  const cardUid = putCare(s, 'bath');
  const targetUid = putHazard(s, 'dirty-diaper');
  const p = applyAction(s, { type: 'play', playerId: 'p1', cardUid, targetUid })
    .state.players[0]!;
  expect(p.trouble).toHaveLength(0);
  expect(p.hp).toBe(10);
  expect(p.statuses).not.toContain('Stinky');
});
test('AND answers accumulate tags across cards', () => {
  let s = fixture();
  s.day = 5;
  const targetUid = putHazard(s, 'tsunami');
  const ring = putCare(s, 'teething-ring');
  const cuddle = putCare(s, 'cuddle');
  s = applyAction(s, {
    type: 'play',
    playerId: 'p1',
    cardUid: ring,
    targetUid,
  }).state;
  expect(s.players[0]!.trouble).toHaveLength(1);
  s = applyAction(s, {
    type: 'play',
    playerId: 'p1',
    cardUid: cuddle,
    targetUid,
  }).state;
  expect(s.players[0]!.trouble).toHaveLength(0);
});
test('Bundle costs 2, once/turn, and can remove a partial AND hazard', () => {
  const s = fixture();
  s.players[0]!.coddle = 4;
  const targetUid = putHazard(s, 'tsunami');
  putHazard(s, 'gas');
  const next = applyAction(s, {
    type: 'bundle',
    playerId: 'p1',
    targetUid,
  }).state;
  expect(next.players[0]!.coddle).toBe(2);
  expect(getLegalActions(next, 'p1').some((a) => a.type === 'bundle')).toBe(
    false,
  );
});
test('damage modifiers precede Shield; healing caps and Stinky has a floor', () => {
  const ctx = context();
  ctx.player.cute = 2;
  ctx.player.modifiers = ['iron-tummy'];
  ctx.player.shield = 1;
  damage({ ...ctx, source: getCard('dirty-diaper') }, 3);
  expect(ctx.player.hp).toBe(10);
  expect(ctx.player.shield).toBe(0);
  heal(ctx, 100);
  expect(ctx.player.hp).toBe(20);
  ctx.player.statuses = ['Stinky'];
  ctx.player.modifiers = ['allergic'];
  heal({ ...ctx, source: getCard('milk') }, 1);
  expect(ctx.player.hp).toBe(20);
  setStat(ctx, 'cute', -9);
  expect(ctx.player.cute).toBe(1);
});
test('Lone Wolf doubles perk and ignores drawback, Foster ignores Guardian drawbacks', () => {
  const ctx = context(fixture('lone-wolf'));
  ctx.player.parents = ['workaholic-dad'];
  expect(careCost(ctx.state, ctx.player, getCard('cuddle'))).toBe(1);
  runEffects(
    { ...ctx, source: getCard('workaholic-dad') },
    getCard('workaholic-dad'),
    'onSetup',
  );
  refreshStats(ctx);
  expect(ctx.player.staminaCap).toBe(5);
  ctx.player.babyId = 'foster-baby';
  ctx.player.parents = ['nanny'];
  const cute = ctx.player.cute;
  runEffects({ ...ctx, source: getCard('nanny') }, getCard('nanny'), 'onSetup');
  expect(ctx.player.cute).toBe(cute);
  ctx.player.statuses.push('ParentsDisabled');
  expect(rule(ctx, 'freeTimerRemoval')).toBe(0);
});
test('Care reshuffle is delayed chaos and unavailable future hazards stay in deck', () => {
  const ctx = context();
  ctx.state.decks.care = { draw: [], discard: ['milk'] };
  drawCare(ctx, 1);
  expect(ctx.state.pendingChaos).toBe(2);
  ctx.state.decks.hazard = { draw: ['tsunami', 'dirty-diaper'], discard: [] };
  addHazards(ctx, 1);
  expect(ctx.player.trouble[0]!.cardId).toBe('dirty-diaper');
  expect(ctx.state.decks.hazard.draw).toContain('tsunami');
});
test('Timer 2 hits tomorrow; lingering ticks nightly; Shield clears at next Wake', () => {
  const s = fixture();
  s.players[0]!.shield = 20;
  s.players[0]!.hunger = 5;
  putHazard(s, 'gas');
  putHazard(s, 'rash');
  const next = applyAction(s, { type: 'endTurn', playerId: 'p1' }).state;
  expect(next.players[0]!.trouble.find((h) => h.cardId === 'gas')!.timer).toBe(
    1,
  );
  expect(next.players[0]!.trouble.some((h) => h.cardId === 'rash')).toBe(true);
  expect(next.players[0]!.shield).toBe(0);
});
test('Night decay, Secure Attachment, discard, and final victory ordering', () => {
  let s = fixture();
  s.config.winCondition.days = 1;
  const p = s.players[0]!;
  p.hp = 5;
  p.hunger = 1;
  p.coddle = 5;
  for (let i = 0; i < 9; i++) putCare(s, 'milk');
  s = applyAction(s, { type: 'endTurn', playerId: 'p1' }).state;
  expect(s.phase).toBe('discard');
  expect(s.players[0]!.hp).toBe(4);
  expect(s.players[0]!.coddle).toBe(4);
  while (s.phase === 'discard')
    s = applyAction(s, getLegalActions(s, 'p1')[0]!).state;
  expect(s.result?.outcome).toBe('win');
  expect(s.players[0]!.hand).toHaveLength(7);
  expect(getLegalActions(s, 'p1')).toEqual([]);
});
test('Miracle revives once and a later zero Health eliminates', () => {
  let s = fixture('miracle-baby');
  s.players[0]!.hp = 0;
  s.players[0]!.hunger = 5;
  s = applyAction(s, { type: 'endTurn', playerId: 'p1' }).state;
  expect(s.players[0]!.gameUsed).toHaveLength(1);
  expect(s.phase).not.toBe('finished');
  s.players[0]!.hp = 0;
  s.players[0]!.hunger = 5;
  s.players[0]!.trouble = [];
  s = applyAction(s, { type: 'endTurn', playerId: 'p1' }).state;
  expect(s.result?.outcome).toBe('loss');
});
