import { writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { runGames, summarize, groupLine, toCsv } from './simulation';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      mode: { type: 'string', default: 'solo' },
      days: { type: 'string', default: '7' },
      bot: { type: 'string', default: 'normal' },
      games: { type: 'string', default: '10000' },
      difficulty: { type: 'string', default: 'normal' },
      seed: { type: 'string', default: '42' },
      csv: { type: 'string' },
    },
  });
  if (values.mode !== 'solo')
    throw new Error('Only --mode solo is implemented');
  const difficultyList = ['easy', 'normal', 'hard', 'terrible'] as const;
  if (
    values.difficulty !== 'all' &&
    !difficultyList.includes(
      values.difficulty as (typeof difficultyList)[number],
    )
  )
    throw new Error('Invalid difficulty');
  if (!['easy', 'normal', 'hard'].includes(values.bot))
    throw new Error('Invalid bot');
  const common = {
    games: Number(values.games),
    days: Number(values.days),
    bot: values.bot as 'easy' | 'normal' | 'hard',
    seed: Number(values.seed),
  };
  const difficulties =
    values.difficulty === 'all'
      ? difficultyList
      : [values.difficulty as (typeof difficultyList)[number]];
  const runs = difficulties.flatMap((difficulty, index) =>
    runGames({
      ...common,
      difficulty,
      seed: (common.seed + Math.imul(index, 0x85ebca6b)) >>> 0,
    }),
  );
  const summary = summarize(runs);
  console.log(
    `Solo · ${common.days} Days · ${values.difficulty} · ${common.bot} bot · ${runs.length} games`,
  );
  console.log(groupLine('Overall', summary.overall));
  console.log('\nBy Baby');
  for (const [id, group] of [...summary.byBaby].sort(([a], [b]) =>
    a.localeCompare(b),
  ))
    console.log(groupLine(id, group));
  console.log('\nBy Parent (each appearance)');
  for (const [id, group] of [...summary.byParent].sort(([a], [b]) =>
    a.localeCompare(b),
  ))
    console.log(groupLine(id, group));
  console.log('\nDeaths by last damage source');
  for (const [id, count] of [...summary.byDeathSource].sort(
    (a, b) => b[1] - a[1],
  ))
    console.log(`${id.padEnd(27)} ${count}`);
  console.log('\nBy Difficulty');
  for (const [id, group] of summary.byDifficulty)
    console.log(groupLine(id, group));
  console.log('\nAverage Health after Night');
  summary.hpByDay.forEach((hp, day) =>
    console.log(`Day ${day + 1}: ${hp.toFixed(2)}`),
  );
  if (values.csv) {
    await writeFile(values.csv, toCsv(runs), 'utf8');
    console.log(`\nCSV written: ${values.csv}`);
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
