import { getCard } from '@coddle/content';
import { drawCare, take } from './decks';
import { runEffects, trigger } from './effects';
import { addHazards, removeHazard, resolveHazard } from './hazards';
import { hazardCount, rule } from './rules';
import { damage, heal, refreshStats, removeStatus, setStat } from './stats';
import type { Context, GameState, Player } from './types';

function score(player: Player, day: number, difficulty: number): number {
  return day * 10 + player.hp + player.milestones.length * 5 + difficulty;
}
function finish(
  ctx: Context,
  outcome: 'win' | 'loss' | 'gold' | 'silver' | 'bronze',
  winners: string[],
): void {
  const { state } = ctx;
  for (const id of winners) {
    const player = state.players.find((item) => item.id === id);
    if (player)
      milestone(
        { ...ctx, player },
        'iron-baby',
        player.alive && player.hp <= 3,
      );
  }
  const daysSurvived =
    outcome === 'win' ||
    outcome === 'gold' ||
    outcome === 'silver' ||
    outcome === 'bronze'
      ? state.day
      : Math.max(0, state.day - 1);
  const difficulty = { easy: 0, normal: 1, hard: 2, terrible: 3 }[
    state.config.difficulty
  ];
  const scorer =
    state.players.find((p) => winners.includes(p.id)) ?? ctx.player;
  state.result = {
    outcome,
    daysSurvived,
    score: score(scorer, daysSurvived, difficulty),
    winners,
  };
  state.phase = 'finished';
  ctx.events.push({ type: 'result', playerId: scorer.id, after: outcome });
}
function milestone(ctx: Context, id: string, achieved: boolean): void {
  if (!achieved || ctx.player.milestones.includes(id)) return;
  ctx.player.milestones.push(id);
  ctx.events.push({ type: 'milestone', playerId: ctx.player.id, after: id });
}
function checkDeathResult(ctx: Context): void {
  const { state } = ctx;
  const alive = state.players.filter((p) => p.alive);
  if (state.config.winCondition.type === 'lastStanding' && alive.length === 0) {
    const winner =
      alive[0] ??
      [...state.players].sort(
        (a, b) =>
          (state.nightStartHp[b.id] ?? 0) - (state.nightStartHp[a.id] ?? 0) ||
          state.seatOrder.indexOf(a.id) - state.seatOrder.indexOf(b.id),
      )[0]!;
    finish(ctx, 'win', [winner.id]);
  } else if (state.config.interaction === 'coop' && alive.length === 0) {
    finish(ctx, 'loss', []);
  } else if (state.players.length === 1 && !alive.length) {
    finish(ctx, 'loss', []);
  }
}
export function eliminate(ctx: Context): void {
  if (ctx.player.alive === false || ctx.player.hp > 0) return;
  trigger(ctx, 'onElimination');
  if (ctx.player.hp > 0) return;
  ctx.player.alive = false;
  ctx.events.push({ type: 'elimination', playerId: ctx.player.id });
  checkDeathResult(ctx);
}
function applyEvent(state: GameState, events: Context['events']): void {
  if (!state.dayEvent) return;
  const event = getCard(state.dayEvent);
  events.push({ type: 'dayEvent', cardId: event.id });
  for (const player of state.players.filter((p) => p.alive)) {
    const ctx: Context = { state, player, events, source: event };
    refreshStats(ctx, true);
    if (rule(ctx, 'timerMod') < 0) {
      for (const hazard of [...player.trouble]) {
        hazard.timer = Math.max(0, hazard.timer + rule(ctx, 'timerMod'));
        if (!hazard.timer && !getCard(hazard.cardId).hazard?.linger) {
          resolveHazard(ctx, hazard);
          removeHazard(ctx, hazard.uid, false);
        }
      }
    }
    runEffects(ctx, event, 'onArrive');
    if (event.id === 'flu-season')
      addHazards(ctx, rule(ctx, 'fluExtra'), { id: 'fever' });
  }
}
export function wake(ctx: Context, opening = false): void {
  const { state, player: p } = ctx;
  if (!p.alive || state.phase === 'finished') return;
  p.used = [];
  p.carePlayed = 0;
  p.coddlePlayed = false;
  p.answered = 0;
  state.newestHazard = null;
  if (!opening) setStat(ctx, 'shield', 0);
  refreshStats(ctx);
  const sleepy = p.statuses.includes('Sleepless');
  setStat(
    ctx,
    'stamina',
    Math.max(1, p.staminaCap - Number(sleepy)) + p.nextStamina,
  );
  setStat(ctx, 'nextStamina', 0);
  if (sleepy) removeStatus(ctx, 'Sleepless');
  drawCare(ctx, 2 + rule(ctx, 'wakeDraw'));
  trigger(ctx, 'onWake');
  if (state.day >= 2 && state.actedThisDay.length === 0 && !state.dayEvent) {
    state.dayEvent = take(ctx, state.decks.event, 'event');
    applyEvent(state, ctx.events);
  }
  const count = hazardCount(ctx) + state.pendingChaos;
  state.pendingChaos = 0;
  addHazards(ctx, count);
  state.phase = 'action';
  ctx.events.push({ type: 'day', playerId: p.id, after: state.day });
  eliminate(ctx);
  if (!p.alive && !state.result) completeNight(ctx);
}
export function night(ctx: Context): void {
  const { player: p } = ctx;
  ctx.state.nightStartHp[p.id] = p.hp;
  for (const hazard of [...p.trouble]) {
    if (getCard(hazard.cardId).hazard?.linger) continue;
    hazard.timer = Math.max(0, hazard.timer - 1);
    if (!hazard.timer) {
      resolveHazard(ctx, hazard);
      removeHazard(ctx, hazard.uid, false);
    }
  }
  for (const hazard of [...p.trouble]) {
    if (!getCard(hazard.cardId).hazard?.linger) continue;
    hazard.timer = Math.max(0, hazard.timer - 1);
    if (!hazard.timer) resolveHazard(ctx, hazard);
  }
  if (p.statuses.includes('Feverish')) damage(ctx, 1);
  setStat(ctx, 'hunger', p.hunger - 1 - rule(ctx, 'hungerDecay'));
  if (!p.hunger) damage(ctx, 2);
  setStat(ctx, 'coddle', p.coddle - 1);
  if (p.coddle >= 4) heal(ctx, 1);
  trigger(ctx, 'onNight');
  milestone(ctx, 'first-smile', p.coddle >= 4);
  milestone(
    ctx,
    'fed-and-changed',
    p.hunger >= 4 && !p.statuses.includes('Stinky'),
  );
  milestone(ctx, 'rolled-over', p.answered >= 3);
  milestone(ctx, 'clean-sweep', p.trouble.length === 0);
  removeStatus(ctx, 'Fussy');
  removeStatus(ctx, 'ParentsDisabled');
  refreshStats(ctx);
  eliminate(ctx);
  if (ctx.state.phase === 'finished') return;
  if (p.hand.length > 7) ctx.state.phase = 'discard';
  else completeNight(ctx);
}
function finishSurvivalDay(ctx: Context): void {
  const { state } = ctx;
  const alive = state.players.filter((p) => p.alive);
  if (state.config.interaction === 'versus')
    alive.sort(
      (a, b) =>
        b.hp - a.hp ||
        b.milestones.length - a.milestones.length ||
        state.seatOrder.indexOf(a.id) - state.seatOrder.indexOf(b.id),
    );
  const count = alive.length;
  if (state.config.interaction === 'coop') {
    const medal =
      count === state.players.length
        ? 'gold'
        : count >= Math.ceil(state.players.length / 2)
          ? 'silver'
          : count > 0
            ? 'bronze'
            : 'loss';
    finish(
      ctx,
      medal,
      alive.map((p) => p.id),
    );
  } else {
    finish(
      ctx,
      count ? 'win' : 'loss',
      alive.map((p) => p.id),
    );
  }
}
function nextTurn(state: GameState, current: string): Player | undefined {
  const index = state.seatOrder.indexOf(current);
  for (let offset = 1; offset <= state.seatOrder.length; offset++) {
    const id = state.seatOrder[(index + offset) % state.seatOrder.length]!;
    const player = state.players.find((p) => p.id === id);
    if (player?.alive && !state.actedThisDay.includes(id)) return player;
  }
  return undefined;
}
function startNextDay(ctx: Context): void {
  const { state } = ctx;
  if (
    state.config.winCondition.type === 'surviveDays' &&
    state.config.winCondition.days === state.day
  ) {
    finishSurvivalDay(ctx);
    return;
  }
  state.day++;
  state.seatOrder.push(state.seatOrder.shift()!);
  state.actedThisDay = [];
  if (state.dayEvent) state.decks.event.discard.push(state.dayEvent);
  state.dayEvent = null;
  state.nightStartHp = Object.fromEntries(
    state.players.map((p) => [p.id, p.hp]),
  );
  const first =
    state.players.find((p) => p.id === state.seatOrder[0] && p.alive) ??
    state.players.find((p) => p.alive);
  if (!first) {
    finish(ctx, 'loss', []);
    return;
  }
  state.activePlayerId = first.id;
  wake({ ...ctx, player: first });
}
export function completeNight(ctx: Context): void {
  const { state, player: p } = ctx;
  eliminate(ctx);
  if (state.phase === 'finished') return;
  if (!state.actedThisDay.includes(p.id)) state.actedThisDay.push(p.id);
  const next = nextTurn(state, p.id);
  if (next) {
    state.activePlayerId = next.id;
    wake({ ...ctx, player: next });
    return;
  }
  if (state.config.winCondition.type === 'lastStanding') {
    const winner = state.players.find((player) => player.alive);
    if (winner) finish({ ...ctx, player: winner }, 'win', [winner.id]);
    return;
  }
  if (
    state.config.winCondition.type === 'surviveDays' &&
    state.config.winCondition.days === state.day
  ) {
    finishSurvivalDay(ctx);
    return;
  }
  startNextDay(ctx);
}
