import { z } from 'zod';
import { cards, statusSchema } from '@coddle/content';
import type { GameState } from '@coddle/engine';

export interface StoragePort {
  get(key: string): string | null;
  set(key: string, value: string): void;
}
export type ReadResult<T> = { value: T | null; error: string | null };
export function read<T>(
  storage: StoragePort,
  key: string,
  schema: z.ZodType<T>,
): ReadResult<T> {
  try {
    const raw = storage.get(key);
    if (raw === null) return { value: null, error: null };
    const result = schema.safeParse(JSON.parse(raw));
    if (!result.success)
      return { value: null, error: `${key}: ${result.error.message}` };
    return { value: result.data, error: null };
  } catch (error: unknown) {
    return {
      value: null,
      error: `${key}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
export function write(
  storage: StoragePort,
  key: string,
  value: unknown,
): string | null {
  try {
    storage.set(key, JSON.stringify(value));
    return null;
  } catch (error: unknown) {
    return `${key}: ${error instanceof Error ? error.message : String(error)}`;
  }
}
const cardTypes = new Map(cards.map((c) => [c.id, c.type]));
const knownId = z.string().refine((id) => cardTypes.has(id), 'Unknown card id');
const hand = z.object({ uid: z.string().min(1), cardId: knownId }).strict();
const nonnegative = z.number().int().nonnegative();
const deck = z
  .object({ draw: z.array(knownId), discard: z.array(knownId) })
  .strict();
export const gameSchema: z.ZodType<GameState> = z
  .object({
    version: z.literal(1),
    config: z
      .object({
        players: z.literal(1),
        interaction: z.literal('none'),
        perspective: z.literal('baby'),
        difficulty: z.enum(['easy', 'normal', 'hard', 'terrible']),
        winCondition: z
          .object({
            type: z.literal('surviveDays'),
            days: z.number().int().min(1).max(365).nullable(),
          })
          .strict(),
      })
      .strict(),
    seed: nonnegative.max(0xffffffff),
    rng: nonnegative.max(0xffffffff),
    nextId: z.number().int().positive(),
    day: z.number().int().positive(),
    phase: z.enum(['chooseBaby', 'action', 'discard', 'finished']),
    activePlayerId: z.literal('p1'),
    babyChoices: z.array(knownId).max(2),
    players: z
      .array(
        z
          .object({
            id: z.literal('p1'),
            babyId: z.union([knownId, z.literal('')]),
            baseStats: z
              .object({
                maxHp: z.number().int().positive(),
                staminaCap: z.number().int(),
                cute: z.number().int(),
              })
              .strict(),
            parents: z.array(knownId).max(3),
            modifiers: z.array(knownId).max(2),
            hp: nonnegative,
            maxHp: z.number().int().positive(),
            stamina: nonnegative,
            staminaCap: z.number().int().min(1).max(6),
            hunger: nonnegative.max(5),
            coddle: nonnegative.max(6),
            cute: z.number().int().min(1).max(10),
            shield: nonnegative,
            statuses: z.array(statusSchema),
            hand: z.array(hand),
            trouble: z.array(
              hand
                .extend({
                  timer: nonnegative,
                  answeredTags: z.array(z.string()),
                  extraTags: z.array(z.string()),
                  hot: z.boolean(),
                  drawDay: z.number().int().positive(),
                })
                .strict(),
            ),
            nextStamina: nonnegative,
            used: z.array(z.string()),
            gameUsed: z.array(z.string()),
            carePlayed: nonnegative,
            coddlePlayed: z.boolean(),
            answered: nonnegative,
            milestones: z.array(z.string()),
            alive: z.boolean(),
            lastDamageSource: z.string().nullable(),
          })
          .strict()
          .refine(
            (p) =>
              p.hp <= p.maxHp && new Set(p.statuses).size === p.statuses.length,
            'Invalid player bounds',
          ),
      )
      .length(1),
    decks: z.object({ care: deck, hazard: deck, event: deck }).strict(),
    dayEvent: knownId.nullable(),
    pendingChaos: nonnegative,
    hazardReshuffles: nonnegative,
    forecast: z.array(knownId),
    newestHazard: z.string().nullable(),
    result: z
      .object({
        outcome: z.enum(['win', 'loss']),
        score: nonnegative,
        daysSurvived: nonnegative,
      })
      .strict()
      .nullable(),
  })
  .strict()
  .superRefine((s, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: 'custom', message });
    const p = s.players[0]!;
    if ((s.phase === 'finished') !== Boolean(s.result))
      issue('Result/phase mismatch');
    if (
      s.phase !== 'chooseBaby' &&
      (!p.babyId || cardTypes.get(p.babyId) !== 'baby')
    )
      issue('Missing Baby');
    if (s.phase === 'chooseBaby' && !s.babyChoices.length)
      issue('Missing Baby choices');
    if (s.babyChoices.some((id) => cardTypes.get(id) !== 'baby'))
      issue('Wrong Baby choice type');
    if (
      p.parents.some((id) => cardTypes.get(id) !== 'parent') ||
      p.modifiers.some((id) => cardTypes.get(id) !== 'modifier')
    )
      issue('Wrong setup card type');
    if (
      p.hand.some((c) => cardTypes.get(c.cardId) !== 'care') ||
      p.trouble.some((c) => cardTypes.get(c.cardId) !== 'hazard')
    )
      issue('Wrong board card type');
    const uids = [...p.hand, ...p.trouble].map((c) => c.uid);
    if (new Set(uids).size !== uids.length) issue('Duplicate instance id');
  });
export const settingsSchema = z
  .object({
    sound: z.boolean(),
    haptics: z.boolean(),
    reducedMotion: z.boolean(),
    textSize: z.enum(['normal', 'large']),
    colorblind: z.boolean(),
    portrait: z.number().int().min(0).max(2),
  })
  .strict();
export type Settings = z.infer<typeof settingsSchema>;
export const defaultSettings: Settings = {
  sound: false,
  haptics: false,
  reducedMotion: false,
  textSize: 'normal',
  colorblind: false,
  portrait: 0,
};
export const journalSchema = z
  .object({
    discovered: z.array(knownId),
    runs: z.array(
      z
        .object({
          seed: nonnegative,
          babyId: knownId,
          outcome: z.enum(['win', 'loss']),
          score: nonnegative,
          days: nonnegative,
          difficulty: z.enum(['easy', 'normal', 'hard', 'terrible']),
        })
        .strict(),
    ),
  })
  .strict();
export type Journal = z.infer<typeof journalSchema>;
