import type { Card, Status } from '@coddle/content';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'terrible';
export type GameConfig = {
  winCondition: { type: 'surviveDays'; days: number | null };
  interaction: 'none';
  perspective: 'baby';
  players: 1;
  difficulty: Difficulty;
};
export const SOLO_STANDARD: GameConfig = {
  winCondition: { type: 'surviveDays', days: 7 },
  interaction: 'none',
  perspective: 'baby',
  players: 1,
  difficulty: 'normal',
};
export type HandCard = { uid: string; cardId: string };
export type Hazard = HandCard & {
  timer: number;
  answeredTags: string[];
  extraTags: string[];
  hot: boolean;
  drawDay: number;
};
export type Player = {
  baseStats: { maxHp: number; staminaCap: number; cute: number };
  id: string;
  babyId: string;
  parents: string[];
  modifiers: string[];
  hp: number;
  maxHp: number;
  stamina: number;
  staminaCap: number;
  hunger: number;
  coddle: number;
  cute: number;
  shield: number;
  statuses: Status[];
  hand: HandCard[];
  trouble: Hazard[];
  nextStamina: number;
  used: string[];
  gameUsed: string[];
  carePlayed: number;
  coddlePlayed: boolean;
  answered: number;
  milestones: string[];
  alive: boolean;
  lastDamageSource: string | null;
};
export type Deck = { draw: string[]; discard: string[] };
export type GameState = {
  version: 1;
  config: GameConfig;
  seed: number;
  rng: number;
  nextId: number;
  day: number;
  phase: 'chooseBaby' | 'action' | 'discard' | 'finished';
  players: Player[];
  activePlayerId: string;
  babyChoices: string[];
  decks: { care: Deck; hazard: Deck; event: Deck };
  dayEvent: string | null;
  pendingChaos: number;
  hazardReshuffles: number;
  forecast: string[];
  newestHazard: string | null;
  result: null | {
    outcome: 'win' | 'loss';
    score: number;
    daysSurvived: number;
  };
};
export type Action =
  | { type: 'chooseBaby'; playerId: string; cardId: string }
  | { type: 'play'; playerId: string; cardUid: string; targetUid?: string }
  | {
      type: 'bundle' | 'cry' | 'nanny' | 'swap';
      playerId: string;
      targetUid: string;
    }
  | { type: 'discard'; playerId: string; cardUid: string }
  | { type: 'endTurn'; playerId: string };
export type Json =
  null | boolean | number | string | Json[] | { [key: string]: Json };
export type GameEvent = {
  type:
    | 'stat'
    | 'status'
    | 'draw'
    | 'hazardArrived'
    | 'hazardResolved'
    | 'hazardAnswered'
    | 'cardPlayed'
    | 'day'
    | 'dayEvent'
    | 'reshuffle'
    | 'scry'
    | 'milestone'
    | 'elimination'
    | 'revive'
    | 'result'
    | 'change';
  playerId?: string;
  sourceId?: string;
  cardId?: string;
  field?: string;
  before?: Json;
  after?: Json;
};
export type Context = {
  state: GameState;
  player: Player;
  events: GameEvent[];
  source?: Card;
  targetUid?: string;
  hazard?: Hazard;
};
