import { expect, test } from 'vitest';
import { cardIdentitySchema } from './index';

test('rejects empty identities', () => {
  expect(cardIdentitySchema.safeParse({ id: '', name: '' }).success).toBe(
    false,
  );
});
