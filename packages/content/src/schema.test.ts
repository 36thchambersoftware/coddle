import { expect, test } from 'vitest';
import { cards, cardSchema, getCard, validateContent } from './index';

test('rejects empty identities', () => {
  expect(cardSchema.safeParse({ id: '', name: '' }).success).toBe(false);
});

test.each(cards)('$id validates', (card) => {
  expect(() => cardSchema.parse(card)).not.toThrow();
  expect(getCard(card.id)).toEqual(card);
});
test('rejects duplicate ids, bad costs, missing references and unknown ids', () => {
  const milk = getCard('milk');
  expect(() => validateContent([milk, milk])).toThrow('Duplicate');
  expect(cardSchema.safeParse({ ...milk, cost: 3 }).success).toBe(false);
  expect(() =>
    validateContent([
      {
        ...milk,
        effects: [
          { trigger: 'onPlay', ops: [{ op: 'replaceParent', id: 'missing' }] },
        ],
      },
    ]),
  ).toThrow('reference');
  expect(() => getCard('missing')).toThrow('Unknown');
});
