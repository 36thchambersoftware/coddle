import { expect, test } from 'vitest';
import { runGames, summarize, toCsv } from './simulation';
import { careCards, hazards, dayEvents } from '@coddle/content';

test('simulation is seeded, bounded and aggregates accurate summaries/CSV', () => {
  const options = {
    games: 12,
    days: 3,
    difficulty: 'easy' as const,
    bot: 'normal' as const,
    seed: 1,
  };
  const runs = runGames(options);
  expect(runGames(options)).toEqual(runs);
  expect(runs).toHaveLength(12);
  const summary = summarize(runs);
  expect(summary.overall.n).toBe(12);
  expect(summary.overall.wins).toBe(
    runs.filter((run) => run.outcome === 'win').length,
  );
  expect(summary.byBaby.size).toBeGreaterThan(0);
  expect(toCsv(runs).split('\n')).toHaveLength(13);
  expect(() => runGames({ ...options, games: 0 })).toThrow('Games');
});

test('starter deck copy counts and event coverage match M3 content', () => {
  expect(careCards.reduce((sum, card) => sum + (card.copies ?? 1), 0)).toBe(67);
  expect(hazards.reduce((sum, card) => sum + (card.copies ?? 1), 0)).toBe(48);
  expect(dayEvents).toHaveLength(9);
});
