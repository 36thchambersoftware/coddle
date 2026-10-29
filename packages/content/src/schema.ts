import { z } from 'zod';

export const statusSchema = z.enum([
  'Stinky',
  'Fussy',
  'Feverish',
  'Sleepless',
  'ParentsDisabled',
]);
export const ruleSchema = z.enum([
  'maxHp',
  'staminaCap',
  'cute',
  'careCost',
  'heal',
  'hungerGain',
  'coddleGain',
  'hazardDamage',
  'hazardCount',
  'firstHazardTimer',
  'wakeDraw',
  'hungerDecay',
  'adorableBonus',
  'firstCareFree',
  'parentMultiplier',
  'ignoreDrawbacks',
  'ignoreGuardianDrawbacks',
  'healingCoddle',
  'answeredCoddle',
  'restStamina',
  'freeTimerRemoval',
  'cryAbility',
  'swapAbility',
  'fluExtra',
  'disableAura',
  'timerMod',
  'minimumCoddle',
  'nightHungerOverflow',
]);
export const conditionSchema = z.union([
  z
    .object({
      stat: z.enum(['hp', 'hunger', 'coddle', 'cute', 'day', 'stamina']),
      cmp: z.enum(['<', '<=', '=', '>=', '>']),
      value: z.number(),
    })
    .strict(),
  z.object({ hasTag: z.string() }).strict(),
  z.object({ hasStatus: statusSchema }).strict(),
  z.object({ hasParent: z.string() }).strict(),
  z.object({ firstThisTurn: z.literal(true) }).strict(),
  z
    .object({
      dayModulo: z.tuple([
        z.number().int().positive(),
        z.number().int().nonnegative(),
      ]),
    })
    .strict(),
]);
const numeric = (op: string) =>
  z.object({ op: z.literal(op), n: z.number().int() }).strict();
export const filterSchema = z
  .object({
    id: z.string().optional(),
    tags: z.array(z.string()).optional(),
    timer: z.number().int().nonnegative().optional(),
  })
  .strict();
export const opSchema = z.union([
  ...(
    [
      'heal',
      'shield',
      'stamina',
      'staminaCapMod',
      'hunger',
      'coddle',
      'maxHpMod',
      'cuteMod',
      'draw',
      'scry',
      'nextStamina',
      'startHpMod',
    ] as const
  ).map(numeric),
  z
    .object({
      op: z.literal('damage'),
      n: z.number().int().nonnegative(),
      unblockable: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      op: z.literal('discard'),
      n: z.number().int().nonnegative(),
      random: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      op: z.enum(['addStatus', 'removeStatus']),
      status: z.union([statusSchema, z.literal('first')]),
    })
    .strict(),
  z
    .object({ op: z.literal('removeHazard'), filter: filterSchema.optional() })
    .strict(),
  z
    .object({
      op: z.literal('delayHazard'),
      n: z.number().int(),
      target: z.enum(['chosen', 'all']).optional(),
      addTag: z.string().optional(),
    })
    .strict(),
  z
    .object({
      op: z.literal('addHazard'),
      n: z.number().int().nonnegative(),
      filter: filterSchema.optional(),
    })
    .strict(),
  z.object({ op: z.enum(['passHazard', 'swapHazard']) }).strict(),
  z
    .object({
      op: z.literal('rule'),
      rule: ruleSchema,
      n: z.number().int(),
      tags: z.array(z.string()).optional(),
    })
    .strict(),
  z.object({ op: z.literal('replaceParent'), id: z.string() }).strict(),
  z
    .object({
      op: z.literal('revive'),
      hp: z.number().int().positive(),
      coddle: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      op: z.literal('randomParentSlots'),
      weights: z.array(z.number().int().positive()).min(1),
    })
    .strict(),
  z.object({ op: z.literal('auraCoddle'), n: z.number().int() }).strict(),
  z.object({ op: z.literal('steal'), n: z.number().int().positive() }).strict(),
]);
// A discriminated TypeScript union (numeric() intentionally has a narrow runtime schema).
export type Status = z.infer<typeof statusSchema>;
export type Rule = z.infer<typeof ruleSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type Filter = z.infer<typeof filterSchema>;
type NumericName =
  | 'heal'
  | 'shield'
  | 'stamina'
  | 'staminaCapMod'
  | 'hunger'
  | 'coddle'
  | 'maxHpMod'
  | 'cuteMod'
  | 'draw'
  | 'scry'
  | 'nextStamina'
  | 'startHpMod';
export type Op =
  | { op: NumericName; n: number }
  | { op: 'damage'; n: number; unblockable?: boolean }
  | { op: 'discard'; n: number; random?: boolean }
  | { op: 'addStatus' | 'removeStatus'; status: Status | 'first' }
  | { op: 'removeHazard'; filter?: Filter }
  | { op: 'delayHazard'; n: number; target?: 'chosen' | 'all'; addTag?: string }
  | { op: 'addHazard'; n: number; filter?: Filter }
  | { op: 'passHazard' | 'swapHazard' }
  | { op: 'rule'; rule: Rule; n: number; tags?: string[] }
  | { op: 'replaceParent'; id: string }
  | { op: 'revive'; hp: number; coddle: number }
  | { op: 'randomParentSlots'; weights: number[] }
  | { op: 'auraCoddle' | 'steal'; n: number };
export const effectSchema = z
  .object({
    trigger: z.enum([
      'onPlay',
      'onSetup',
      'onWake',
      'onNight',
      'onArrive',
      'onResolve',
      'onAnswer',
      'onDamage',
      'onElimination',
      'passive',
    ]),
    when: z.array(conditionSchema).optional(),
    ops: z.array(opSchema),
    drawback: z.boolean().optional(),
    once: z.enum(['game', 'turn']).optional(),
  })
  .strict();
export type Effect = Omit<z.infer<typeof effectSchema>, 'ops'> & { ops: Op[] };
export const cardSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    type: z.enum(['baby', 'parent', 'modifier', 'care', 'hazard', 'event']),
    cost: z.number().int().min(0).max(2).optional(),
    tags: z.array(z.string()),
    rarity: z.enum(['common', 'uncommon', 'rare']),
    flavor: z.string().min(1),
    artKey: z.string().min(1),
    description: z.string().min(1),
    copies: z.number().int().positive().optional(),
    minDay: z.number().int().positive().optional(),
    stats: z
      .object({
        maxHp: z.number().int().positive().optional(),
        startHp: z.number().int().nonnegative().optional(),
        staminaCap: z.number().int().min(1).max(6).optional(),
        cute: z.number().int().min(1).max(10).optional(),
        coddle: z.number().int().min(0).max(6).optional(),
        hunger: z.number().int().min(0).max(5).optional(),
      })
      .strict()
      .optional(),
    parentSlots: z
      .array(z.enum(['M', 'F', 'G', 'Any']))
      .max(3)
      .optional(),
    hazard: z
      .object({
        timer: z.number().int().nonnegative(),
        linger: z.boolean().optional(),
        passable: z.boolean().optional(),
        unblockable: z.boolean().optional(),
        answeredBy: z.array(z.string()),
        answerMode: z.enum(['any', 'all']).optional(),
      })
      .strict()
      .optional(),
    effects: z.array(effectSchema),
  })
  .strict()
  .superRefine((card, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: 'custom', message });
    if (card.type === 'care' && card.cost === undefined)
      issue('Care requires cost');
    if (card.type !== 'care' && card.cost !== undefined)
      issue('Only Care has cost');
    if (card.type === 'hazard' && !card.hazard)
      issue('Hazard requires hazard data');
    if (
      card.type === 'baby' &&
      (!card.stats?.maxHp ||
        card.stats.startHp === undefined ||
        !card.parentSlots)
    )
      issue('Baby requires starting HP, Max HP and parent slots');
    if (
      card.stats?.startHp !== undefined &&
      card.stats.maxHp !== undefined &&
      card.stats.startHp > card.stats.maxHp
    )
      issue('Start HP exceeds Max HP');
  });
export type Card = Omit<z.infer<typeof cardSchema>, 'effects'> & {
  effects: Effect[];
};
