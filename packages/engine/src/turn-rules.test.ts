import { expect, test } from 'vitest';
import { getCard } from '@coddle/content';
import { applyAction, getLegalActions } from './index';
import { context, fixture, putCare, putHazard } from './test-helpers';
import { addHazards } from './hazards';
import { hazardCount, damageBonus } from './rules';
import { refreshStats } from './stats';
import { wake } from './turn';
import { runEffects } from './effects';

test('all Day Events perform their arrival/passive effects', () => {
  for (const id of [
    'growth-spurt',
    'teething-week',
    'daylight-savings',
    'flu-season',
    'gift',
  ]) {
    const ctx = context();
    ctx.state.day = 2;
    ctx.state.decks.event = { draw: [id], discard: [] };
    ctx.state.decks.hazard = { draw: [], discard: [] };
    wake(ctx);
    if (id === 'growth-spurt') expect(ctx.player.hunger).toBe(1);
    if (id === 'teething-week')
      expect(ctx.player.trouble.some((h) => h.cardId === 'teething')).toBe(
        true,
      );
    if (id === 'daylight-savings')
      expect(ctx.player.statuses).toContain('Sleepless');
    if (id === 'flu-season')
      expect(ctx.player.trouble.some((h) => h.cardId === 'fever')).toBe(true);
    if (id === 'gift') expect(ctx.player.hand).toHaveLength(4);
  }
});
test('Full Moon decrements old and new hazards exactly once', () => {
  const ctx = context();
  ctx.state.day = 2;
  putHazard(ctx.state, 'gas', 2);
  ctx.state.decks.event = { draw: ['full-moon'], discard: [] };
  ctx.state.decks.hazard = { draw: ['gas', 'gas'], discard: [] };
  wake(ctx);
  expect(ctx.player.trouble.map((h) => h.timer)).toEqual([1, 1, 1]);
});
test('In-Laws doubles live parent stats then expires without cumulative growth', () => {
  const ctx = context();
  ctx.player.parents = ['stable-father', 'workaholic-dad'];
  refreshStats(ctx);
  expect(ctx.player.maxHp).toBe(22);
  expect(ctx.player.staminaCap).toBe(4);
  ctx.state.day = 2;
  ctx.state.decks.event = { draw: ['in-laws', 'lazy-sunday'], discard: [] };
  ctx.state.decks.hazard = { draw: [], discard: [] };
  wake(ctx);
  expect(ctx.player.maxHp).toBe(24);
  expect(ctx.player.stamina).toBe(5);
  ctx.state.day++;
  ctx.state.dayEvent = null;
  ctx.state.actedThisDay = [];
  wake(ctx);
  expect(ctx.player.maxHp).toBe(22);
  expect(ctx.player.staminaCap).toBe(4);
});
test('Feverish ticks before hunger and Rest cures it; Fussy modifies then clears', () => {
  let state = fixture();
  state.config.winCondition.days = 1;
  const p = state.players[0]!;
  p.statuses = ['Feverish', 'Fussy'];
  p.cute = 5;
  p.coddle = 0;
  const cardUid = putCare(state, 'cuddle');
  state = applyAction(state, { type: 'play', playerId: 'p1', cardUid }).state;
  expect(state.players[0]!.coddle).toBe(1);
  expect(state.players[0]!.statuses).not.toContain('Fussy');
  state = applyAction(state, { type: 'endTurn', playerId: 'p1' }).state;
  expect(state.players[0]!.hp).toBe(9);
  const s = fixture();
  s.players[0]!.statuses = ['Feverish'];
  const rest = putCare(s, 'nap');
  expect(
    applyAction(s, { type: 'play', playerId: 'p1', cardUid: rest }).state
      .players[0]!.statuses,
  ).not.toContain('Feverish');
});
test('Sleepless is consumed by next Wake and lowers only that refill', () => {
  const ctx = context();
  ctx.player.statuses = ['Sleepless'];
  ctx.state.decks.hazard = { draw: [], discard: [] };
  wake(ctx);
  expect(ctx.player.stamina).toBe(2);
  expect(ctx.player.statuses).not.toContain('Sleepless');
  wake(ctx);
  expect(ctx.player.stamina).toBe(3);
});
test('Nanny, Strong Lungs, Weak Lungs, Lucky Star availability', () => {
  let s = fixture();
  const p = s.players[0]!;
  p.parents = ['nanny'];
  p.modifiers = ['strong-lungs', 'lucky-star'];
  const targetUid = putHazard(s, 'dirty-diaper');
  s.newestHazard = targetUid;
  for (const type of ['nanny', 'cry', 'swap'])
    expect(getLegalActions(s, 'p1').some((a) => a.type === type)).toBe(true);
  p.modifiers.push('weak-lungs');
  expect(getLegalActions(s, 'p1').some((a) => a.type === 'cry')).toBe(false);
  s = applyAction(s, { type: 'nanny', playerId: 'p1', targetUid }).state;
  expect(s.players[0]!.trouble).toHaveLength(0);
});
test('difficulty, final-Day and Day-based chaos modifiers are explicit', () => {
  const ctx = context();
  expect(hazardCount(ctx)).toBe(1);
  ctx.state.config.difficulty = 'easy';
  expect(hazardCount(ctx)).toBe(0);
  ctx.state.day = 7;
  ctx.state.config.difficulty = 'terrible';
  expect(hazardCount(ctx)).toBe(5);
  expect(damageBonus(ctx)).toBe(4);
  ctx.state.config.winCondition.days = null;
  expect(hazardCount(ctx)).toBe(6);
});
test('versus adds one Hazard per seat after Day 12', () => {
  const ctx = context();
  ctx.state.config.players = 2;
  ctx.state.config.interaction = 'versus';
  ctx.state.config.winCondition.days = null;
  ctx.state.day = 12;
  expect(hazardCount(ctx)).toBe(6);
  ctx.state.day = 13;
  expect(hazardCount(ctx)).toBe(8);
});
test('instant hazards use Shield; forecast skips ineligible cards; outage disables Monitor', () => {
  const ctx = context();
  ctx.player.shield = 4;
  ctx.state.decks.hazard = { draw: ['couch'], discard: [] };
  addHazards(ctx, 1);
  expect(ctx.player.hp).toBe(10);
  expect(ctx.player.shield).toBe(1);
  ctx.state.decks.hazard.draw = ['tsunami', 'gas', 'fever', 'colic'];
  runEffects(
    { ...ctx, source: getCard('monitor') },
    getCard('monitor'),
    'onPlay',
  );
  expect(ctx.state.forecast).toEqual(['gas', 'fever', 'colic']);
  ctx.state.forecast = [];
  ctx.state.dayEvent = 'power-outage';
  runEffects(
    { ...ctx, source: getCard('monitor') },
    getCard('monitor'),
    'onPlay',
  );
  expect(ctx.state.forecast).toEqual([]);
});
test('Redemption replaces Parent permanently and Strong Immunity cures one status', () => {
  const ctx = context();
  ctx.player.parents = ['deadbeat-dad'];
  ctx.state.day = 5;
  ctx.player.modifiers = ['strong-immunity'];
  ctx.player.statuses = ['Stinky', 'Feverish'];
  runEffects(
    { ...ctx, source: getCard('deadbeat-dad') },
    getCard('deadbeat-dad'),
    'onWake',
  );
  expect(ctx.player.parents).toEqual(['stable-father']);
  expect(ctx.player.hp).toBe(14);
  runEffects(
    { ...ctx, source: getCard('strong-immunity') },
    getCard('strong-immunity'),
    'onNight',
  );
  expect(ctx.player.statuses).toEqual(['Feverish']);
});
