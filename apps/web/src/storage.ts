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
        players: z.union([
          z.literal(1),
          z.literal(2),
          z.literal(3),
          z.literal(4),
        ]),
        interaction: z.enum(['none', 'versus', 'coop']),
        perspective: z.literal('baby'),
        botPlayers: z
          .array(z.string().regex(/^p[2-4]$/))
          .max(3)
          .default([]),
        difficulty: z.enum(['easy', 'normal', 'hard', 'terrible']),
        winCondition: z.union([
          z
            .object({
              type: z.literal('surviveDays'),
              days: z.number().int().min(1).max(365).nullable(),
            })
            .strict(),
          z
            .object({ type: z.literal('lastStanding'), days: z.null() })
            .strict(),
        ]),
      })
      .strict(),
    seed: nonnegative.max(0xffffffff),
    rng: nonnegative.max(0xffffffff),
    nextId: z.number().int().positive(),
    day: z.number().int().positive(),
    phase: z.enum(['chooseBaby', 'action', 'discard', 'finished']),
    activePlayerId: z.string().regex(/^p[1-4]$/),
    seatOrder: z
      .array(z.string().regex(/^p[1-4]$/))
      .min(1)
      .max(4),
    actedThisDay: z.array(z.string().regex(/^p[1-4]$/)),
    nightStartHp: z.record(z.string(), nonnegative),
    ghostUsed: z.record(z.string(), nonnegative),
    babyChoices: z.array(knownId).max(2),
    availableBabies: z.array(knownId),
    players: z
      .array(
        z
          .object({
            id: z.string().regex(/^p[1-4]$/),
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
      .min(1)
      .max(4),
    decks: z.object({ care: deck, hazard: deck, event: deck }).strict(),
    dayEvent: knownId.nullable(),
    pendingChaos: nonnegative,
    hazardReshuffles: nonnegative,
    forecast: z.array(knownId),
    newestHazard: z.string().nullable(),
    result: z
      .object({
        outcome: z.enum(['win', 'loss', 'gold', 'silver', 'bronze']),
        score: nonnegative,
        daysSurvived: nonnegative,
        winners: z.array(z.string()),
      })
      .strict()
      .nullable(),
  })
  .strict()
  .superRefine((s, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: 'custom', message });
    if (s.players.length !== s.config.players) issue('Player count mismatch');
    if (
      new Set(s.config.botPlayers).size !== s.config.botPlayers.length ||
      s.config.botPlayers.some((id) => Number(id.slice(1)) > s.config.players)
    )
      issue('Invalid bot seats');
    if (
      s.seatOrder.length !== s.config.players ||
      new Set(s.seatOrder).size !== s.seatOrder.length
    )
      issue('Invalid seat order');
    if (!s.players.some((player) => player.id === s.activePlayerId))
      issue('Unknown active player');
    if ((s.phase === 'finished') !== Boolean(s.result))
      issue('Result/phase mismatch');
    if (
      s.phase !== 'chooseBaby' &&
      s.players.some(
        (player) => !player.babyId || cardTypes.get(player.babyId) !== 'baby',
      )
    )
      issue('Missing Baby');
    if (s.phase === 'chooseBaby' && !s.babyChoices.length)
      issue('Missing Baby choices');
    if (s.babyChoices.some((id) => cardTypes.get(id) !== 'baby'))
      issue('Wrong Baby choice type');
    for (const player of s.players) {
      if (
        player.parents.some((id) => cardTypes.get(id) !== 'parent') ||
        player.modifiers.some((id) => cardTypes.get(id) !== 'modifier')
      )
        issue('Wrong setup card type');
      if (
        player.hand.some((c) => cardTypes.get(c.cardId) !== 'care') ||
        player.trouble.some((c) => cardTypes.get(c.cardId) !== 'hazard')
      )
        issue('Wrong board card type');
      const uids = [...player.hand, ...player.trouble].map((c) => c.uid);
      if (new Set(uids).size !== uids.length) issue('Duplicate instance id');
    }
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
          outcome: z.enum(['win', 'loss', 'gold', 'silver', 'bronze']),
          score: nonnegative,
          days: nonnegative,
          difficulty: z.enum(['easy', 'normal', 'hard', 'terrible']),
        })
        .strict(),
    ),
  })
  .strict();
export type Journal = z.infer<typeof journalSchema>;
