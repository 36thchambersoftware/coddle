import { getCard, type Card } from '@coddle/content';
import {
  applyAction,
  getLegalActions,
  type Action,
  type GameState,
  type Player,
} from '@coddle/engine';
import { multiplayerActionValue } from './multiplayer-value';

export type BotLevel = 'easy' | 'normal' | 'hard';
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
function actionValue(state: GameState, p: Player, a: Action): number {
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
  const multiplayerValue = multiplayerActionValue(state, p, a);
  if (multiplayerValue !== undefined) return multiplayerValue;
  const h =
    'targetUid' in a
      ? p.trouble.find((hazard) => hazard.uid === a.targetUid)
      : undefined;
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
function rolloutDamage(state: GameState, p: Player, cardId: string): number {
  const card = getCard(cardId);
  let amount =
    damage(card) +
    Number(state.config.winCondition.days === state.day + 1) +
    Number(state.config.difficulty === 'terrible' && state.day + 1 >= 5) +
    Math.floor(state.day / 3) +
    state.hazardReshuffles;
  const tags = card.tags;
  if (p.cute <= 3 && tags.includes('Gross')) amount--;
  if (p.babyId === 'triplets') amount--;
  if (p.modifiers.includes('iron-tummy') && tags.includes('Gross')) amount--;
  if (p.modifiers.includes('sensitive-skin') && tags.includes('Diaper'))
    amount++;
  return Math.max(0, amount);
}
function simulateNight(
  state: GameState,
  player: Player,
  seed: number,
  rollout: number,
): number {
  const p = structuredClone(player);
  let shield = p.shield;
  let hp = p.hp;
  const hit = (n: number) => {
    const absorbed = Math.min(shield, n);
    shield -= absorbed;
    hp = Math.max(0, hp - n + absorbed);
  };
  for (const hazard of p.trouble) {
    const data = getCard(hazard.cardId).hazard!;
    if (data.linger || hazard.timer <= 1)
      hit(rolloutDamage(state, p, hazard.cardId));
  }
  if (p.statuses.includes('Feverish')) hit(1);
  const hungerDecay = p.parents.includes('gamer-dad')
    ? 2
    : p.babyId === 'chunky-monkey'
      ? 2
      : 1;
  const hunger = Math.max(0, p.hunger - hungerDecay);
  if (hunger === 0) hit(2);
  const coddle = Math.max(0, p.coddle - 1);
  if (coddle >= 4) hp = Math.min(p.maxHp, hp + 1);
  if (hp <= 0) return -100 + hp;
  const nextDay = state.day + 1;
  let count = nextDay === 1 ? 1 : nextDay >= 6 ? 3 : 2;
  if (state.config.difficulty === 'easy' && nextDay <= 3) count--;
  if (
    (state.config.difficulty === 'hard' ||
      state.config.difficulty === 'terrible') &&
    nextDay >= 3
  )
    count++;
  count = Math.max(0, count);
  const weighted = getHazardPool(nextDay);
  let random = (seed ^ Math.imul(rollout + 1, 0x9e3779b9) ^ state.day) >>> 0;
  for (let i = 0; i < count; i++) {
    random =
      (Math.imul(random ^ (random >>> 16), 0x45d9f3b) + 0x6d2b79f5) >>> 0;
    const cardId =
      weighted[Math.floor((random / 4294967296) * weighted.length)]!;
    const card = getCard(cardId);
    const data = card.hazard!;
    const hitsNextNight = data.linger || data.timer <= 1;
    if (data.timer === 0 || hitsNextNight) hit(rolloutDamage(state, p, cardId));
    if (
      card.effects.some((e) =>
        e.ops.some((op) => op.op === 'addStatus' && op.status === 'Feverish'),
      )
    )
      hit(1);
    if (hp <= 0) return -100 + hp;
  }
  return hp * 2 + hunger * 1.5 + coddle * 0.7 + p.stamina * 0.3;
}
const allHazards = getCard;
let hazardPool: string[] | null = null;
function getHazardPool(day: number): string[] {
  if (!hazardPool) {
    hazardPool = [];
    for (const id of [
      'dirty-diaper',
      'diarrhea',
      'vomit',
      'gas',
      'rash',
      'colic',
      'teething',
      'ear-infection',
      'fever',
      'runny-nose',
      'couch',
      'outlet',
      'lego',
      'pet-chaos',
      'sticky-hands',
      'night-terrors',
      'thunderstorm',
      'sunburn',
      'parents-fighting',
      'dropped-pacifier',
      'skipped-nap',
      'hungry-cry',
      'tsunami',
      'visitor',
    ])
      hazardPool.push(id, id);
  }
  return hazardPool.filter((id) => (allHazards(id).minDay ?? 1) <= day);
}
function hardAction(
  state: GameState,
  playerId: string,
  actions: Action[],
): Action {
  const player = state.players.find((p) => p.id === playerId)!;
  if (state.phase !== 'action')
    return actions.reduce((best, action) =>
      actionValue(state, player, action) > actionValue(state, player, best)
        ? action
        : best,
    );
  let best = actions[0]!;
  let bestValue = -Infinity;
  for (const action of actions) {
    const immediate = actionValue(state, player, action);
    let after = state;
    if (action.type !== 'endTurn') after = applyAction(state, action).state;
    const p = after.players.find((candidate) => candidate.id === playerId)!;
    let expected = 0;
    for (let rollout = 0; rollout < 30; rollout++)
      expected += simulateNight(
        after,
        p,
        state.seed ^ (state.rng + actions.indexOf(action)),
        rollout,
      );
    const value = immediate + expected / 30;
    if (value > bestValue) {
      best = action;
      bestValue = value;
    }
  }
  return best;
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
  if (level === 'hard') return hardAction(state, playerId, legal);
  return legal.reduce((best, action) =>
    actionValue(state, p, action) > actionValue(state, p, best) ? action : best,
  );
}
