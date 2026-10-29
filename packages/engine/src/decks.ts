import { getCard, type Filter } from '@coddle/content';
import { random, shuffle } from './random';
import type { Context, Deck, HandCard } from './types';

export function instance(ctx: Context, cardId: string): HandCard {
  return { uid: `c${ctx.state.nextId++}`, cardId };
}
export function take(
  ctx: Context,
  deck: Deck,
  kind: 'care' | 'hazard' | 'event',
  filter?: Filter,
): string | null {
  const matches = (id: string) => {
    const card = getCard(id);
    return (
      (kind !== 'hazard' || (card.minDay ?? 1) <= ctx.state.day) &&
      (!filter?.id || filter.id === id) &&
      (!filter?.tags || filter.tags.some((tag) => card.tags.includes(tag)))
    );
  };
  if (!deck.draw.some(matches) && deck.discard.some(matches)) {
    deck.draw.push(...shuffle(ctx.state, deck.discard));
    deck.discard = [];
    if (kind === 'care') ctx.state.pendingChaos += 2;
    if (kind === 'hazard') ctx.state.hazardReshuffles++;
    ctx.events.push({ type: 'reshuffle', field: kind });
  }
  const index = deck.draw.findIndex(matches);
  if (index < 0) return null;
  return deck.draw.splice(index, 1)[0]!;
}
export function drawCare(ctx: Context, n: number): void {
  for (let i = 0; i < n; i++) {
    const id = take(ctx, ctx.state.decks.care, 'care');
    if (!id) break;
    ctx.player.hand.push(instance(ctx, id));
    ctx.events.push({ type: 'draw', playerId: ctx.player.id, cardId: id });
  }
}
export function discard(ctx: Context, n: number, randomly = false): void {
  for (let i = 0; i < n && ctx.player.hand.length; i++) {
    const index = randomly
      ? Math.floor(random(ctx.state) * ctx.player.hand.length)
      : 0;
    ctx.state.decks.care.discard.push(
      ctx.player.hand.splice(index, 1)[0]!.cardId,
    );
  }
}
