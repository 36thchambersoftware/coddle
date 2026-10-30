import { getCard } from '@coddle/content';
import type { Action, GameState, Player } from '@coddle/engine';

function damage(cardId: string): number {
  return getCard(cardId)
    .effects.flatMap((effect) => effect.ops)
    .reduce((sum, op) => sum + (op.op === 'damage' ? op.n : 0), 0);
}
export function multiplayerActionValue(
  state: GameState,
  player: Player,
  action: Action,
): number | undefined {
  if (action.type === 'pass') {
    const hazard = player.trouble.find((item) => item.uid === action.hazardUid);
    const target = state.players.find(
      (item) => item.id === action.targetPlayerId,
    );
    if (!hazard || !target) return -Infinity;
    let prevented =
      damage(hazard.cardId) + (getCard(hazard.cardId).hazard?.linger ? 3 : 0);
    if (hazard.timer > 1) prevented *= 0.6;
    if (hazard.timer <= 1 && prevented >= player.hp - player.shield - 3)
      prevented += 30;
    return prevented - 1 + target.hp * 0.01;
  }
  if (action.type === 'ghost') {
    const target = state.players.find(
      (item) => item.id === action.targetPlayerId,
    );
    if (!target) return -Infinity;
    const incoming = target.trouble
      .filter(
        (hazard) => getCard(hazard.cardId).hazard?.linger || hazard.timer <= 1,
      )
      .reduce((sum, hazard) => sum + damage(hazard.cardId), 0);
    return incoming > target.shield ? incoming - target.shield : 0;
  }
  if (action.type === 'share') {
    const target = state.players.find(
      (item) => item.id === action.targetPlayerId,
    );
    const card = getCard(
      player.hand.find((item) => item.uid === action.cardUid)!.cardId,
    );
    if (!target) return -Infinity;
    let benefit = 0;
    for (const effect of card.effects.filter(
      (item) => item.trigger === 'onPlay',
    ))
      for (const op of effect.ops) {
        if (op.op === 'heal')
          benefit += Math.min(op.n, target.maxHp - target.hp) * 1.5;
        if (op.op === 'hunger')
          benefit += Math.min(op.n, 5 - target.hunger) * 1.2;
        if (op.op === 'coddle')
          benefit += Math.min(op.n, 6 - target.coddle) * 0.5;
        if (op.op === 'shield' && target.trouble.length)
          benefit += Math.min(op.n, target.trouble.length);
      }
    if (
      target.trouble.some((hazard) =>
        getCard(hazard.cardId).hazard?.answeredBy.some((tag) =>
          card.tags.includes(tag),
        ),
      )
    )
      benefit += 2;
    return benefit - 0.5;
  }
  if (action.type === 'play') {
    const card = getCard(
      player.hand.find((item) => item.uid === action.cardUid)!.cardId,
    );
    if (!card.tags.includes('Sibling')) return undefined;
    const target = action.targetPlayerId
      ? state.players.find((item) => item.id === action.targetPlayerId)
      : undefined;
    if (
      card.effects.some((effect) => effect.ops.some((op) => op.op === 'steal'))
    )
      return target?.hand.length ? 1 : -1;
    if (
      target &&
      card.effects.some((effect) =>
        effect.ops.some((op) => op.op === 'addStatus' && op.status === 'Fussy'),
      )
    )
      return target.statuses.includes('Fussy') ? -1 : 0.5;
  }
  return undefined;
}
