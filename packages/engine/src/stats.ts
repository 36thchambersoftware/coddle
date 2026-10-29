import type { Status } from '@coddle/content';
import { damageBonus, rule } from './rules';
import type { Context, Player } from './types';

type Stat =
  | 'hp'
  | 'maxHp'
  | 'stamina'
  | 'staminaCap'
  | 'hunger'
  | 'coddle'
  | 'cute'
  | 'shield'
  | 'nextStamina';
export function setStat(ctx: Context, field: Stat, value: number): void {
  const p = ctx.player;
  const ranges: Record<Stat, [number, number]> = {
    hp: [0, p.maxHp],
    maxHp: [1, 1000],
    stamina: [0, 1000],
    staminaCap: [1, 6],
    hunger: [0, 5],
    coddle: [0, 6],
    cute: [1, 10],
    shield: [0, 1000],
    nextStamina: [0, 1000],
  };
  const [min, max] = ranges[field];
  const next = Math.max(min, Math.min(max, value));
  if (next !== p[field]) {
    ctx.events.push({
      type: 'stat',
      playerId: p.id,
      sourceId: ctx.source?.id,
      field,
      before: p[field],
      after: next,
    });
    p[field] = next;
  }
  if (field === 'maxHp' && p.hp > p.maxHp) setStat(ctx, 'hp', p.maxHp);
}
export function addStatus(ctx: Context, status: Status): void {
  if (ctx.player.statuses.includes(status)) return;
  ctx.player.statuses.push(status);
  ctx.events.push({
    type: 'status',
    playerId: ctx.player.id,
    sourceId: ctx.source?.id,
    after: status,
  });
}
export function removeStatus(ctx: Context, status: Status): void {
  if (!ctx.player.statuses.includes(status)) return;
  ctx.player.statuses = ctx.player.statuses.filter((s) => s !== status);
  ctx.events.push({
    type: 'status',
    playerId: ctx.player.id,
    before: status,
    after: null,
  });
}
export function damage(ctx: Context, n: number): void {
  const p = ctx.player;
  if (ctx.source?.type === 'hazard') {
    const tags = [...ctx.source.tags, ...(ctx.hazard?.extraTags ?? [])];
    n += rule(ctx, 'hazardDamage', tags) + damageBonus(ctx);
    if (p.cute <= 3 && tags.includes('Gross')) n--;
  }
  n = Math.max(0, n);
  const absorbed = Math.min(p.shield, n);
  setStat(ctx, 'shield', p.shield - absorbed);
  if (n > absorbed) {
    setStat(ctx, 'hp', p.hp - (n - absorbed));
    p.lastDamageSource = ctx.source?.id ?? 'starving';
  }
}
export function heal(ctx: Context, n: number): void {
  if (ctx.source?.type === 'care') {
    n += rule(ctx, 'heal');
    if (ctx.player.statuses.includes('Stinky')) n--;
  }
  setStat(ctx, 'hp', ctx.player.hp + Math.max(0, n));
}
export function freshPlayer(id: string): Player {
  return {
    baseStats: { maxHp: 1, staminaCap: 3, cute: 5 },
    id,
    babyId: '',
    parents: [],
    modifiers: [],
    hp: 1,
    maxHp: 1,
    stamina: 0,
    staminaCap: 3,
    hunger: 3,
    coddle: 0,
    cute: 5,
    shield: 0,
    statuses: [],
    hand: [],
    trouble: [],
    nextStamina: 0,
    used: [],
    gameUsed: [],
    carePlayed: 0,
    coddlePlayed: false,
    answered: 0,
    milestones: [],
    alive: true,
    lastDamageSource: null,
  };
}

export function refreshStats(ctx: Context, adjustStamina = false): void {
  const p = ctx.player;
  const oldCap = p.staminaCap;
  setStat(ctx, 'maxHp', p.baseStats.maxHp + rule(ctx, 'maxHp'));
  setStat(ctx, 'staminaCap', p.baseStats.staminaCap + rule(ctx, 'staminaCap'));
  setStat(ctx, 'cute', p.baseStats.cute + rule(ctx, 'cute'));
  if (adjustStamina) setStat(ctx, 'stamina', p.stamina + p.staminaCap - oldCap);
}
