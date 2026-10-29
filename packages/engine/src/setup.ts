import {
  babies,
  careCards,
  dayEvents,
  getCard,
  hazards,
  modifiers,
  parents,
} from '@coddle/content';
import { drawCare } from './decks';
import { runEffects } from './effects';
import { shuffle } from './random';
import { freshPlayer, refreshStats } from './stats';
import { wake } from './turn';
import type { Context, GameConfig, GameState } from './types';

export function createGame(config: GameConfig, seed: number): GameState {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new Error('Seed must be uint32');
  if (
    config.players !== 1 ||
    config.perspective !== 'baby' ||
    config.interaction !== 'none' ||
    config.winCondition.type !== 'surviveDays' ||
    !['easy', 'normal', 'hard', 'terrible'].includes(config.difficulty)
  )
    throw new Error('Only Solo Survival is implemented');
  if (
    config.winCondition.days !== null &&
    (!Number.isInteger(config.winCondition.days) ||
      config.winCondition.days < 1 ||
      config.winCondition.days > 365)
  )
    throw new Error('Survival days must be 1-365 or null for Endless');
  const state: GameState = {
    version: 1,
    config: structuredClone(config),
    seed,
    rng: seed,
    nextId: 1,
    day: 1,
    phase: 'chooseBaby',
    players: [freshPlayer('p1')],
    activePlayerId: 'p1',
    babyChoices: [],
    decks: {
      care: { draw: [], discard: [] },
      hazard: { draw: [], discard: [] },
      event: { draw: [], discard: [] },
    },
    dayEvent: null,
    pendingChaos: 0,
    hazardReshuffles: 0,
    forecast: [],
    newestHazard: null,
    result: null,
  };
  state.babyChoices = shuffle(
    state,
    babies.map((c) => c.id),
  ).slice(
    0,
    config.difficulty === 'hard' || config.difficulty === 'terrible' ? 1 : 2,
  );
  const expand = (list: typeof careCards) =>
    list.flatMap((c) => Array<string>(c.copies ?? 1).fill(c.id));
  state.decks.care.draw = shuffle(
    state,
    expand(careCards.filter((c) => !c.tags.includes('Sibling'))),
  );
  state.decks.hazard.draw = shuffle(state, expand(hazards));
  state.decks.event.draw = shuffle(state, expand(dayEvents));
  return state;
}
export function chooseBaby(ctx: Context, id: string): void {
  const p = ctx.player;
  const baby = getCard(id);
  const stats = baby.stats;
  if (!stats?.maxHp || stats.startHp === undefined)
    throw new Error('Baby missing stats');
  p.babyId = id;
  p.maxHp = stats.maxHp;
  p.hp = stats.startHp;
  p.cute = stats.cute ?? 5;
  p.staminaCap = stats.staminaCap ?? 3;
  p.hunger = stats.hunger ?? 3;
  p.coddle = stats.coddle ?? 0;
  p.baseStats = { maxHp: p.maxHp, staminaCap: p.staminaCap, cute: p.cute };
  runEffects({ ...ctx, source: baby }, baby, 'onSetup');
  const lottery = p.used.find((key) => key.startsWith('parentSlots:'));
  const slots = lottery
    ? Array<'Any'>(Number(lottery.split(':')[1])).fill('Any')
    : (baby.parentSlots ?? []);
  const pool = shuffle(ctx.state, parents);
  for (const slot of slots) {
    const index = pool.findIndex(
      (c) => slot === 'Any' || c.tags.includes(slot),
    );
    if (index < 0) throw new Error(`Parent pool exhausted: ${slot}`);
    const parent = pool.splice(index, 1)[0]!;
    p.parents.push(parent.id);
  }
  for (const id of p.parents) {
    const c = getCard(id);
    runEffects({ ...ctx, source: c }, c, 'onSetup');
  }
  refreshStats(ctx);
  p.modifiers = shuffle(ctx.state, modifiers)
    .slice(0, 2)
    .map((c) => c.id);
  for (const id of p.modifiers) {
    const c = getCard(id);
    runEffects({ ...ctx, source: c }, c, 'onSetup');
  }
  if (ctx.state.config.difficulty === 'easy')
    p.hp = Math.min(p.maxHp, p.hp + 2);
  if (
    ctx.state.config.difficulty === 'hard' ||
    ctx.state.config.difficulty === 'terrible'
  )
    p.hunger = Math.min(p.hunger, 2);
  ctx.state.babyChoices = [];
  drawCare(ctx, 5);
  wake(ctx, true);
}
