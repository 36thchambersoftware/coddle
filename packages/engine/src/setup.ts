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
    config.perspective !== 'baby' ||
    ![1, 2, 3, 4].includes(config.players) ||
    !['easy', 'normal', 'hard', 'terrible'].includes(config.difficulty)
  )
    throw new Error('Invalid game configuration');
  if (
    !Array.isArray(config.botPlayers) ||
    new Set(config.botPlayers).size !== config.botPlayers.length ||
    config.botPlayers.some((id) => {
      return (
        typeof id !== 'string' ||
        !/^p[2-4]$/.test(id) ||
        Number(id.slice(1)) > config.players
      );
    })
  )
    throw new Error('Bot seats must be unique multiplayer seats');
  if ((config.players === 1) !== (config.interaction === 'none'))
    throw new Error('Solo uses none; multiplayer requires versus or coop');
  if (
    config.winCondition.type === 'lastStanding' &&
    (config.winCondition.days !== null ||
      config.interaction !== 'versus' ||
      config.players < 2)
  )
    throw new Error('Last standing requires 2-4 versus players');
  if (
    config.winCondition.type === 'surviveDays' &&
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
    players: Array.from({ length: config.players }, (_, i) =>
      freshPlayer(`p${i + 1}`),
    ),
    activePlayerId: 'p1',
    seatOrder: Array.from({ length: config.players }, (_, i) => `p${i + 1}`),
    actedThisDay: [],
    nightStartHp: {},
    ghostUsed: {},
    babyChoices: [],
    availableBabies: [],
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
  state.availableBabies = shuffle(
    state,
    babies.map((c) => c.id),
  );
  state.babyChoices = state.availableBabies.slice(
    0,
    config.difficulty === 'hard' || config.difficulty === 'terrible' ? 1 : 2,
  );
  const expand = (list: typeof careCards) =>
    list.flatMap((c) => Array<string>(c.copies ?? 1).fill(c.id));
  state.decks.care.draw = shuffle(
    state,
    expand(
      careCards.filter(
        (c) => config.interaction === 'versus' || !c.tags.includes('Sibling'),
      ),
    ),
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
  ctx.state.availableBabies = ctx.state.availableBabies.filter(
    (babyId) => babyId !== id,
  );
  ctx.state.babyChoices = [];
  const next = ctx.state.players.find((player) => !player.babyId);
  if (next) {
    ctx.state.activePlayerId = next.id;
    ctx.state.babyChoices = shuffle(ctx.state, ctx.state.availableBabies).slice(
      0,
      ctx.state.config.difficulty === 'hard' ||
        ctx.state.config.difficulty === 'terrible'
        ? 1
        : 2,
    );
    return;
  }
  for (const player of ctx.state.players) drawCare({ ...ctx, player }, 5);
  ctx.state.activePlayerId = ctx.state.seatOrder[0]!;
  ctx.state.nightStartHp = Object.fromEntries(
    ctx.state.players.map((player) => [player.id, player.hp]),
  );
  wake({ ...ctx, player: ctx.state.players[0]! }, true);
}
