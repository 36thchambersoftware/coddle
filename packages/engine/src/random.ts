import type { GameState } from './types';

export function random(state: Pick<GameState, 'rng'>): number {
  state.rng = (state.rng + 0x6d2b79f5) >>> 0;
  let t = state.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export function shuffle<T>(
  state: Pick<GameState, 'rng'>,
  input: readonly T[],
): T[] {
  const result = [...input];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random(state) * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
