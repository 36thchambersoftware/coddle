import { getCard, type Card } from '@coddle/content';
import {
  getLegalActions,
  type Action,
  type GameState,
  type Player,
} from '@coddle/engine';

export type BotLevel = 'easy' | 'normal';
function randomPick(state: GameState, player: Player): number {
  let t =
    (state.seed ^
      (state.day * 7919) ^
      (player.carePlayed * 104729) ^
      (player.hand.length * 37) ^
      (player.used.length * 151)) >>>
    0;
  t = Math.imul(t ^ (t >>> 16), 0x45d9f3b);
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}
function damage(card: Card): number {
  return card.effects
    .flatMap((e) => e.ops)
    .reduce((sum, op) => sum + (op.op === 'damage' ? op.n : 0), 0);
}
function actionValue(p: Player, a: Action): number {
  if (a.type === 'chooseBaby') {
    const stats = getCard(a.cardId).stats!;
    return (stats.startHp ?? 0) + (stats.staminaCap ?? 3) * 2;
  }
  if (a.type === 'endTurn') return 0;
  if (a.type === 'discard') {
    const card = getCard(p.hand.find((c) => c.uid === a.cardUid)!.cardId);
    return -card.effects
      .flatMap((e) => e.ops)
      .reduce((n, op) => n + ('n' in op ? Math.max(0, op.n) : 1), 0);
  }
  const h =
    'targetUid' in a ? p.trouble.find((h) => h.uid === a.targetUid) : undefined;
  let prevented = h
    ? damage(getCard(h.cardId)) + (getCard(h.cardId).hazard?.linger ? 3 : 0)
    : 0;
  if (h && h.timer > 1) prevented *= 0.6;
  if (h && h.timer <= 1 && prevented >= p.hp - p.shield - 3) prevented += 30;
  if (a.type === 'bundle') return prevented - 1;
  if (a.type === 'nanny') return prevented + 2;
  if (a.type === 'cry') return prevented * 0.6 - 1;
  if (a.type === 'swap') return prevented - 4;
  if (!('cardUid' in a)) throw new Error('Unsupported bot action');
  const card = getCard(p.hand.find((c) => c.uid === a.cardUid)!.cardId);
  const ops = card.effects
    .filter((e) => e.trigger === 'onPlay')
    .flatMap((e) => e.ops);
  if (h && getCard(h.cardId).hazard?.answerMode === 'all') prevented *= 0.5;
  let benefit = prevented;
  for (const op of ops) {
    switch (op.op) {
      case 'heal':
        benefit += Math.min(op.n, p.maxHp - p.hp) * (p.hp <= 5 ? 2 : 1);
        break;
      case 'hunger':
        benefit += Math.min(op.n, 5 - p.hunger) * (p.hunger <= 2 ? 1.8 : 0.7);
        break;
      case 'coddle':
        benefit += Math.min(op.n, 6 - p.coddle) * 0.5;
        break;
      case 'shield':
        benefit += Math.min(
          op.n,
          p.trouble
            .filter((h) => h.timer <= 1)
            .reduce((n, h) => n + damage(getCard(h.cardId)), 0),
        );
        break;
      case 'removeStatus':
        benefit += p.statuses.includes(
          op.status === 'first' ? p.statuses[0]! : op.status,
        )
          ? 2
          : 0;
        break;
      case 'draw':
        benefit += 0.5 * op.n;
        break;
      case 'nextStamina':
        benefit += 0.7 * op.n;
        break;
      case 'delayHazard':
        benefit += h ? prevented * 0.6 : p.trouble.length * 0.6;
        break;
    }
  }
  // Keep the last Feed/Rest in reserve if its immediate benefit is low.
  if ((card.tags.includes('Feed') || card.tags.includes('Rest')) && benefit < 1)
    benefit -= 1;
  return benefit / Math.max(1, card.cost ?? 0) - 0.1;
}
export function chooseAction(
  state: GameState,
  playerId: string,
  level: BotLevel = 'normal',
): Action {
  const legal = getLegalActions(state, playerId);
  const p = state.players.find((p) => p.id === playerId);
  if (!p || !legal.length) throw new Error('No legal action for bot');
  if (level === 'easy') {
    const r = randomPick(state, p);
    const end = legal.find((a) => a.type === 'endTurn');
    if (end && r < 0.3) return end;
    const weighted = legal
      .filter((a) => a.type !== 'endTurn')
      .flatMap((a) => {
        const card =
          a.type === 'play'
            ? getCard(p.hand.find((c) => c.uid === a.cardUid)!.cardId)
            : undefined;
        return Array<Action>(card ? 3 - (card.cost ?? 0) : 1).fill(a);
      });
    return weighted[Math.floor(r * weighted.length)] ?? legal[0]!;
  }
  return legal.reduce((best, action) =>
    actionValue(p, action) > actionValue(p, best) ? action : best,
  );
}
