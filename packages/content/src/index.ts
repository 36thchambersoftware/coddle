import { babies } from './babies';
import { parents } from './parents';
import { modifiers } from './modifiers';
import { careCards } from './care';
import { hazards } from './hazards';
import { dayEvents } from './events';
import { cardSchema, type Card } from './schema';

export * from './schema';
export { en } from './strings';
export { babies, parents, modifiers, careCards, hazards, dayEvents };
export const cards: Card[] = [
  ...babies,
  ...parents,
  ...modifiers,
  ...careCards,
  ...hazards,
  ...dayEvents,
];
export function validateContent(input: readonly Card[] = cards): void {
  const ids = new Set<string>();
  for (const card of input) {
    cardSchema.parse(card);
    if (ids.has(card.id)) throw new Error(`Duplicate card id: ${card.id}`);
    ids.add(card.id);
  }
  for (const card of input)
    for (const effect of card.effects)
      for (const op of effect.ops) {
        if (
          op.op === 'replaceParent' &&
          !input.some((c) => c.id === op.id && c.type === 'parent')
        )
          throw new Error(`Missing parent reference: ${op.id}`);
        if (
          op.op === 'addHazard' &&
          op.filter?.id &&
          !input.some((c) => c.id === op.filter?.id && c.type === 'hazard')
        )
          throw new Error(`Missing hazard reference: ${op.filter.id}`);
      }
}
validateContent();
const byId = new Map(cards.map((card) => [card.id, card]));
export function getCard(id: string): Card {
  const found = byId.get(id);
  if (!found) throw new Error(`Unknown card: ${id}`);
  return found;
}
