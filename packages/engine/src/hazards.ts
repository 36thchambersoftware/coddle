import { getCard, type Filter } from '@coddle/content';
import { instance, take } from './decks';
import { runEffects, trigger } from './effects';
import { rule } from './rules';
import { setStat } from './stats';
import type { Context, Hazard } from './types';

export function resolveHazard(ctx: Context, hazard: Hazard): void {
  const card = getCard(hazard.cardId);
  runEffects({ ...ctx, source: card, hazard }, card, 'onResolve');
  ctx.events.push({
    type: 'hazardResolved',
    playerId: ctx.player.id,
    cardId: card.id,
  });
}
export function removeHazard(
  ctx: Context,
  uid: string,
  answered: boolean,
): void {
  const index = ctx.player.trouble.findIndex((h) => h.uid === uid);
  if (index < 0) return;
  const hazard = ctx.player.trouble.splice(index, 1)[0]!;
  ctx.state.decks.hazard.discard.push(hazard.cardId);
  if (ctx.state.newestHazard === uid) ctx.state.newestHazard = null;
  if (answered) {
    ctx.player.answered++;
    const card = getCard(hazard.cardId);
    setStat(
      ctx,
      'coddle',
      ctx.player.coddle + rule(ctx, 'answeredCoddle', card.tags),
    );
    runEffects({ ...ctx, source: card }, card, 'onAnswer');
    trigger({ ...ctx, source: card }, 'onAnswer');
    ctx.events.push({
      type: 'hazardAnswered',
      playerId: ctx.player.id,
      cardId: hazard.cardId,
    });
  }
}
export function addHazards(ctx: Context, n: number, filter?: Filter): void {
  // Each instant card is consumed before chaining, so a finite deck cannot recurse forever.
  for (let i = 0; i < n; i++) {
    const id = take(ctx, ctx.state.decks.hazard, 'hazard', filter);
    // Named event hazards can be created even if both physical copies are in play.
    if (!id && !filter?.id) continue;
    const card = getCard(id ?? filter!.id!);
    if (!card.hazard) throw new Error('Expected hazard');
    const first = !ctx.player.used.includes('hazardArrived');
    ctx.player.used.push('hazardArrived');
    let timer = card.hazard.timer + rule(ctx, 'timerMod');
    if (first)
      timer +=
        rule(ctx, 'firstHazardTimer') +
        Number(ctx.state.config.difficulty === 'easy');
    const hazard: Hazard = {
      ...instance(ctx, card.id),
      timer: Math.max(0, timer),
      answeredTags: [],
      extraTags: [],
      hot: false,
      drawDay: ctx.state.day,
    };
    ctx.player.trouble.push(hazard);
    ctx.state.newestHazard = hazard.uid;
    ctx.state.forecast = ctx.state.forecast.filter(
      (forecast) => forecast !== card.id,
    );
    ctx.events.push({
      type: 'hazardArrived',
      playerId: ctx.player.id,
      cardId: card.id,
      after: hazard.timer,
    });
    runEffects({ ...ctx, source: card, hazard }, card, 'onArrive');
    if (hazard.timer === 0 && !card.hazard.linger) {
      // Keep instant card out of its discard during chained draws.
      ctx.player.trouble = ctx.player.trouble.filter(
        (h) => h.uid !== hazard.uid,
      );
      resolveHazard(ctx, hazard);
      ctx.state.decks.hazard.discard.push(card.id);
      if (ctx.state.newestHazard === hazard.uid) ctx.state.newestHazard = null;
    }
  }
}
