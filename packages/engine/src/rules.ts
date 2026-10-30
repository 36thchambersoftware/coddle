import {
  getCard,
  type Card,
  type Condition,
  type Effect,
  type Rule,
} from '@coddle/content';
import type { Context, GameState, Player } from './types';

export function conditions(
  ctx: Context,
  when: Condition[] = [],
  tags = ctx.source?.tags ?? [],
): boolean {
  return when.every((c) => {
    if ('stat' in c) {
      const actual = c.stat === 'day' ? ctx.state.day : ctx.player[c.stat];
      switch (c.cmp) {
        case '<':
          return actual < c.value;
        case '<=':
          return actual <= c.value;
        case '=':
          return actual === c.value;
        case '>=':
          return actual >= c.value;
        case '>':
          return actual > c.value;
      }
    }
    if ('hasTag' in c) return tags.includes(c.hasTag);
    if ('hasStatus' in c) return ctx.player.statuses.includes(c.hasStatus);
    if ('hasParent' in c) return ctx.player.parents.includes(c.hasParent);
    if ('dayModulo' in c)
      return ctx.state.day % c.dayModulo[0] === c.dayModulo[1];
    return ctx.player.carePlayed === 0;
  });
}
export function sources(ctx: Context): Card[] {
  const p = ctx.player;
  return [
    p.babyId,
    ...p.parents,
    ...p.modifiers,
    ...(ctx.state.dayEvent ? [ctx.state.dayEvent] : []),
  ]
    .filter(Boolean)
    .map(getCard);
}
function rawRule(ctx: Context, rule: Rule): number {
  return sources(ctx)
    .filter((c) => c.type !== 'parent')
    .reduce(
      (total, c) =>
        total +
        c.effects
          .filter((e) => e.trigger === 'passive' && conditions(ctx, e.when))
          .flatMap((e) => e.ops)
          .reduce(
            (sum, op) =>
              sum + (op.op === 'rule' && op.rule === rule ? op.n : 0),
            0,
          ),
      0,
    );
}
export function effectScale(ctx: Context, card: Card, effect: Effect): number {
  if (card.type !== 'parent') return 1;
  if (
    effect.drawback &&
    (rawRule(ctx, 'ignoreDrawbacks') > 0 ||
      (card.tags.includes('G') && rawRule(ctx, 'ignoreGuardianDrawbacks') > 0))
  )
    return 0;
  if (!effect.drawback && ctx.player.statuses.includes('ParentsDisabled'))
    return 0;
  // Two independent doublings multiply (Lone Wolf and In-Laws Visit).
  return 2 ** rawRule(ctx, 'parentMultiplier');
}
export function rule(
  ctx: Context,
  key: Rule,
  tags: string[] = ctx.source?.tags ?? [],
): number {
  let total = 0;
  for (const card of sources(ctx))
    for (const effect of card.effects) {
      if (effect.trigger !== 'passive' || !conditions(ctx, effect.when, tags))
        continue;
      for (const op of effect.ops)
        if (
          op.op === 'rule' &&
          op.rule === key &&
          (!op.tags || op.tags.some((tag) => tags.includes(tag)))
        ) {
          total += op.n * effectScale(ctx, card, effect);
        }
    }
  return total;
}
export function careCost(state: GameState, player: Player, card: Card): number {
  const ctx: Context = { state, player, events: [], source: card };
  if (!player.carePlayed && rule(ctx, 'firstCareFree') > 0) return 0;
  return Math.max(0, (card.cost ?? 0) + rule(ctx, 'careCost'));
}
export function canAnswer(card: Card, hazard: Card): boolean {
  return Boolean(
    hazard.hazard &&
    !hazard.hazard.unblockable &&
    hazard.hazard.answeredBy.some((tag) => card.tags.includes(tag)),
  );
}
export function hazardCount(ctx: Context): number {
  const { day, config } = ctx.state;
  let n = day === 1 ? 1 : day >= 6 ? 3 : 2;
  if (config.difficulty === 'easy' && day <= 3) n--;
  if (
    (config.difficulty === 'hard' || config.difficulty === 'terrible') &&
    day >= 3
  )
    n++;
  if (config.winCondition.days === day) n++;
  if (config.winCondition.days === null) n += Math.floor((day - 1) / 3);
  const versusEscalation = config.interaction === 'versus' && day > 12 ? 1 : 0;
  return Math.max(0, n + rule(ctx, 'hazardCount') + versusEscalation);
}
export function damageBonus(ctx: Context): number {
  const { config, day } = ctx.state;
  return (
    Number(config.winCondition.days === day) +
    Number(config.difficulty === 'terrible' && day >= 5) +
    Math.floor((day - 1) / 3) +
    ctx.state.hazardReshuffles
  );
}
