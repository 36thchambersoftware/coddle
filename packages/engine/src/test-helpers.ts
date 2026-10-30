import { getCard } from '@coddle/content';
import { applyAction, createGame, SOLO_STANDARD } from './index';
import type { Context, GameState } from './types';

export function fixture(baby = 'sole-survivor'): GameState {
  const initial = createGame(SOLO_STANDARD, 123);
  initial.babyChoices = [baby];
  const state = applyAction(initial, {
    type: 'chooseBaby',
    playerId: 'p1',
    cardId: baby,
  }).state;
  const p = state.players[0]!;
  p.parents = [];
  p.modifiers = [];
  p.trouble = [];
  p.hand = [];
  p.hp = 10;
  p.maxHp = 20;
  p.stamina = 6;
  p.staminaCap = 3;
  p.cute = 5;
  p.hunger = 3;
  p.coddle = 0;
  p.statuses = [];
  p.shield = 0;
  p.used = [];
  p.gameUsed = [];
  state.dayEvent = null;
  state.day = 1;
  state.phase = 'action';
  state.result = null;
  p.baseStats = { maxHp: p.maxHp, staminaCap: p.staminaCap, cute: p.cute };
  return state;
}
export function context(state = fixture()): Context {
  return { state, player: state.players[0]!, events: [] };
}
export function putCare(state: GameState, id: string): string {
  const uid = `test${state.nextId++}`;
  state.players[0]!.hand.push({ uid, cardId: id });
  return uid;
}
export function putHazard(
  state: GameState,
  id: string,
  timer?: number,
): string {
  const uid = `test${state.nextId++}`;
  state.players[0]!.trouble.push({
    uid,
    cardId: id,
    timer: timer ?? getCard(id).hazard!.timer,
    answeredTags: [],
    extraTags: [],
    hot: false,
    drawDay: state.day,
  });
  return uid;
}
