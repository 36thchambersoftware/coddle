import { getCard } from '@coddle/content';
import { drawCare, take } from './decks';
import { runEffects, trigger } from './effects';
import { addHazards, removeHazard, resolveHazard } from './hazards';
import { hazardCount, rule } from './rules';
import { damage, heal, refreshStats, removeStatus, setStat } from './stats';
import type { Context } from './types';

export function eliminate(ctx: Context): void {
  if (ctx.player.hp > 0) return;
  trigger(ctx, 'onElimination');
  if (ctx.player.hp > 0) return;
  ctx.player.alive = false;
  ctx.events.push({ type: 'elimination', playerId: ctx.player.id });
  finish(ctx, false);
}
function milestone(ctx: Context, id: string, achieved: boolean): void {
  if (!achieved || ctx.player.milestones.includes(id)) return;
  ctx.player.milestones.push(id);
  ctx.events.push({ type: 'milestone', playerId: ctx.player.id, after: id });
}
function finish(ctx: Context, won: boolean): void {
  const daysSurvived = won ? ctx.state.day : ctx.state.day - 1;
  if (won) milestone(ctx, 'iron-baby', ctx.player.hp <= 3);
  const difficulty = { easy: 0, normal: 1, hard: 2, terrible: 3 }[
    ctx.state.config.difficulty
  ];
  ctx.state.result = {
    outcome: won ? 'win' : 'loss',
    daysSurvived,
    score:
      daysSurvived * 10 +
      ctx.player.hp +
      ctx.player.milestones.length * 5 +
      difficulty,
  };
  ctx.state.phase = 'finished';
  ctx.events.push({ type: 'result', after: won ? 'win' : 'loss' });
}
export function wake(ctx: Context, opening = false): void {
  const { state, player: p } = ctx;
  p.used = [];
  p.carePlayed = 0;
  p.coddlePlayed = false;
  p.answered = 0;
  state.newestHazard = null;
  if (!opening) setStat(ctx, 'shield', 0);
  // Clear the previous event before computing the new Day's Wake passives.
  if (state.dayEvent) state.decks.event.discard.push(state.dayEvent);
  state.dayEvent = null;
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
  if (state.day >= 2) {
    state.dayEvent = take(ctx, state.decks.event, 'event');
    if (state.dayEvent) {
      refreshStats(ctx, true);
      const card = getCard(state.dayEvent);
      ctx.events.push({ type: 'dayEvent', cardId: card.id });
      if (rule(ctx, 'timerMod') < 0) {
        for (const h of [...p.trouble]) {
          h.timer = Math.max(0, h.timer + rule(ctx, 'timerMod'));
          if (!h.timer && !getCard(h.cardId).hazard?.linger) {
            resolveHazard(ctx, h);
            removeHazard(ctx, h.uid, false);
          }
        }
      }
      runEffects({ ...ctx, source: card }, card, 'onArrive');
      if (card.id === 'flu-season')
        addHazards(ctx, rule(ctx, 'fluExtra'), { id: 'fever' });
    }
  }
  const count = hazardCount(ctx) + state.pendingChaos;
  state.pendingChaos = 0;
  addHazards(ctx, count);
  state.phase = 'action';
  ctx.events.push({ type: 'day', after: state.day });
  eliminate(ctx);
}
export function night(ctx: Context): void {
  const { player: p } = ctx;
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
  if (p.hand.length > 7) ctx.state.phase = 'discard';
  else completeNight(ctx);
}
export function completeNight(ctx: Context): void {
  eliminate(ctx);
  if (ctx.state.phase === 'finished') return;
  if (ctx.state.config.winCondition.days === ctx.state.day) {
    finish(ctx, true);
    return;
  }
  ctx.state.day++;
  wake(ctx);
}
