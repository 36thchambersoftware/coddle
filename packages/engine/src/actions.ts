import { getCard } from '@coddle/content';
import { canAnswer, careCost, rule } from './rules';
import { runEffects, trigger } from './effects';
import { addHazards, removeHazard } from './hazards';
import { removeStatus, setStat } from './stats';
import { chooseBaby } from './setup';
import { completeNight, night } from './turn';
import type { Action, Context, GameState, Player } from './types';

export function getLegalActions(state: GameState, playerId: string): Action[] {
  const p = state.players.find((p) => p.id === playerId);
  if (!p || playerId !== state.activePlayerId || state.phase === 'finished')
    return [];
  if (state.phase === 'chooseBaby')
    return state.babyChoices.map((cardId) => ({
      type: 'chooseBaby',
      playerId,
      cardId,
    }));
  if (state.phase === 'discard')
    return p.hand.map((c) => ({ type: 'discard', playerId, cardUid: c.uid }));
  const ctx: Context = { state, player: p, events: [] };
  const actions: Action[] = [{ type: 'endTurn', playerId }];
  for (const c of p.hand) {
    const card = getCard(c.cardId);
    if (careCost(state, p, card) > p.stamina || (card.minDay ?? 1) > state.day)
      continue;
    const chosen = card.effects.some((e) =>
      e.ops.some((op) => op.op === 'delayHazard' && op.target !== 'all'),
    );
    if (!chosen) actions.push({ type: 'play', playerId, cardUid: c.uid });
    for (const h of p.trouble)
      if (chosen || canAnswer(card, getCard(h.cardId)))
        actions.push({
          type: 'play',
          playerId,
          cardUid: c.uid,
          targetUid: h.uid,
        });
  }
  for (const h of p.trouble) {
    const target = { playerId, targetUid: h.uid };
    if (p.coddle >= 2 && !p.used.includes('bundle'))
      actions.push({ type: 'bundle', ...target });
    if (
      rule(ctx, 'cryAbility') > 0 &&
      p.stamina >= 1 &&
      !p.used.includes('cry')
    )
      actions.push({ type: 'cry', ...target });
    if (
      rule(ctx, 'freeTimerRemoval') > 0 &&
      h.timer === 1 &&
      !p.used.includes('nanny')
    )
      actions.push({ type: 'nanny', ...target });
    if (
      rule(ctx, 'swapAbility') > 0 &&
      h.uid === state.newestHazard &&
      !p.used.includes('swap')
    )
      actions.push({ type: 'swap', ...target });
  }
  return actions;
}
function play(ctx: Context, action: Extract<Action, { type: 'play' }>): void {
  const p = ctx.player;
  const index = p.hand.findIndex((c) => c.uid === action.cardUid);
  const handCard = p.hand.splice(index, 1)[0]!;
  const card = getCard(handCard.cardId);
  const care: Context = { ...ctx, source: card, targetUid: action.targetUid };
  setStat(care, 'stamina', p.stamina - careCost(ctx.state, p, card));
  const h = p.trouble.find((h) => h.uid === action.targetUid);
  if (h && canAnswer(card, getCard(h.cardId))) {
    const data = getCard(h.cardId).hazard!;
    h.answeredTags = [
      ...new Set([
        ...h.answeredTags,
        ...card.tags.filter((tag) => data.answeredBy.includes(tag)),
      ]),
    ];
    if (
      data.answerMode !== 'all' ||
      data.answeredBy.every((tag) => h.answeredTags.includes(tag))
    )
      removeHazard(care, h.uid, true);
  }
  // Fussy modifies this card's gains; Comfort then cures it.
  runEffects(care, card, 'onPlay');
  trigger(care, 'onPlay');
  if (card.tags.includes('Clean')) removeStatus(care, 'Stinky');
  if (card.tags.includes('Comfort')) removeStatus(care, 'Fussy');
  if (card.tags.includes('Medicine') || card.tags.includes('Rest'))
    removeStatus(care, 'Feverish');
  if (card.tags.includes('Rest'))
    setStat(
      care,
      'stamina',
      p.stamina + Math.max(0, rule(care, 'restStamina')),
    );
  if (card.effects.some((e) => e.ops.some((op) => op.op === 'heal')))
    setStat(care, 'coddle', p.coddle + rule(care, 'healingCoddle'));
  if (card.tags.includes('Coddle')) {
    if (!p.coddlePlayed && p.cute >= 7)
      setStat(care, 'coddle', p.coddle + 1 + rule(care, 'adorableBonus'));
    p.coddlePlayed = true;
  }
  p.carePlayed++;
  ctx.state.decks.care.discard.push(card.id);
  ctx.state.newestHazard = null;
  ctx.events.push({ type: 'cardPlayed', playerId: p.id, cardId: card.id });
}
export function execute(ctx: Context, action: Action): void {
  const p: Player = ctx.player;
  switch (action.type) {
    case 'chooseBaby':
      chooseBaby(ctx, action.cardId);
      break;
    case 'endTurn':
      night(ctx);
      break;
    case 'discard': {
      const index = p.hand.findIndex((c) => c.uid === action.cardUid);
      ctx.state.decks.care.discard.push(p.hand.splice(index, 1)[0]!.cardId);
      if (p.hand.length <= 7) completeNight(ctx);
      break;
    }
    case 'play':
      play(ctx, action);
      break;
    case 'bundle':
      p.used.push('bundle');
      setStat(ctx, 'coddle', p.coddle - 2);
      removeHazard(ctx, action.targetUid, true);
      break;
    case 'cry': {
      p.used.push('cry');
      setStat(ctx, 'stamina', p.stamina - 1);
      p.trouble.find((h) => h.uid === action.targetUid)!.timer++;
      break;
    }
    case 'nanny':
      p.used.push('nanny');
      removeHazard(ctx, action.targetUid, true);
      break;
    case 'swap':
      p.used.push('swap');
      removeHazard(ctx, action.targetUid, false);
      addHazards(ctx, 1);
      break;
  }
}
