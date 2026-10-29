import { execute, getLegalActions } from './actions';
import type { Action, GameEvent, GameState, Json } from './types';

export { createGame } from './setup';
export { getLegalActions };
export { SOLO_STANDARD } from './types';
export type {
  Action,
  Difficulty,
  GameConfig,
  GameEvent,
  GameState,
  Hazard,
  Player,
} from './types';

function changes(before: Json, after: Json, path = ''): GameEvent[] {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (
    before &&
    after &&
    typeof before === 'object' &&
    typeof after === 'object' &&
    !Array.isArray(before) &&
    !Array.isArray(after)
  ) {
    return [
      ...new Set([...Object.keys(before), ...Object.keys(after)]),
    ].flatMap((key) =>
      changes(
        before[key] ?? null,
        after[key] ?? null,
        path ? `${path}.${key}` : key,
      ),
    );
  }
  return [{ type: 'change', field: path, before, after }];
}
export function applyAction(
  state: GameState,
  action: Action,
): { state: GameState; events: GameEvent[] } {
  const legal = getLegalActions(state, action.playerId).some(
    (candidate) =>
      Object.keys(candidate).length === Object.keys(action).length &&
      Object.entries(candidate).every(([key, value]) =>
        Object.entries(action).some(([k, v]) => k === key && v === value),
      ),
  );
  if (!legal) throw new Error('Illegal action');
  const next = structuredClone(state);
  const player = next.players.find((p) => p.id === action.playerId)!;
  const events: GameEvent[] = [];
  execute({ state: next, player, events }, action);
  events.push(
    ...changes(
      JSON.parse(JSON.stringify(state)) as Json,
      JSON.parse(JSON.stringify(next)) as Json,
    ),
  );
  return { state: next, events };
}
