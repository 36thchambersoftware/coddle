import type { Card, Condition, Effect, Op, Rule } from './schema';

export const effect = (
  trigger: Effect['trigger'],
  ops: Op[],
  when?: Condition[],
  drawback = false,
): Effect => ({
  trigger,
  ops,
  ...(when ? { when } : {}),
  ...(drawback ? { drawback } : {}),
});
export const passive = (
  rule: Rule,
  n: number,
  tags?: string[],
  when?: Condition[],
  drawback = false,
): Effect =>
  effect(
    'passive',
    [{ op: 'rule', rule, n, ...(tags ? { tags } : {}) }],
    when,
    drawback,
  );
export const card = (
  id: string,
  name: string,
  type: Card['type'],
  tags: string[],
  description: string,
  effects: Effect[],
  extra: Partial<Card> = {},
): Card => ({
  id,
  name,
  type,
  tags,
  description,
  effects,
  rarity: 'common',
  flavor: 'Small baby. Big feelings.',
  artKey: type,
  ...extra,
});
