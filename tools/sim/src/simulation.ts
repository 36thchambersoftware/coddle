import { getCard } from '@coddle/content';
import { chooseAction, type BotLevel } from '@coddle/bots';
import {
  applyAction,
  createGame,
  SOLO_STANDARD,
  type Difficulty,
} from '@coddle/engine';

export type RunResult = {
  seed: number;
  baby: string;
  parents: string[];
  modifiers: string[];
  difficulty: Difficulty;
  bot: BotLevel;
  outcome: 'win' | 'loss';
  score: number;
  days: number;
  finalHp: number;
  hpByDay: number[];
  lastDamageSource: string | null;
};
export type SimulationOptions = {
  games: number;
  days: number;
  difficulty: Difficulty;
  bot: BotLevel;
  seed: number;
};

function play(seed: number, options: SimulationOptions): RunResult {
  let state = createGame(
    {
      ...SOLO_STANDARD,
      difficulty: options.difficulty,
      winCondition: { type: 'surviveDays', days: options.days },
    },
    seed,
  );
  const hpByDay: number[] = [];
  let steps = 0;
  while (state.phase !== 'finished') {
    if (++steps > 2000)
      throw new Error(`Simulation failed to terminate, seed ${seed}`);
    const p = state.players[0]!;
    if (state.phase === 'discard' && p.hand.length === 0)
      throw new Error(`Invalid discard phase, seed ${seed}`);
    const day = state.day;
    const next = applyAction(
      state,
      chooseAction(state, p.id, options.bot),
    ).state;
    if (next.day !== day || next.phase === 'finished')
      hpByDay[day - 1] = next.players[0]!.hp;
    state = next;
  }
  const p = state.players[0]!;
  const result = state.result;
  if (!result) throw new Error(`Missing simulation result, seed ${seed}`);
  return {
    seed,
    baby: p.babyId,
    parents: [...p.parents],
    modifiers: [...p.modifiers],
    difficulty: options.difficulty,
    bot: options.bot,
    outcome: result.outcome === 'win' ? 'win' : 'loss',
    score: result.score,
    days: result.daysSurvived,
    finalHp: p.hp,
    hpByDay,
    lastDamageSource: p.lastDamageSource,
  };
}
export function runGames(options: SimulationOptions): RunResult[] {
  if (
    !Number.isInteger(options.games) ||
    options.games < 1 ||
    options.games > 100_000
  )
    throw new Error('Games must be 1-100000');
  if (!Number.isInteger(options.days) || options.days < 1 || options.days > 365)
    throw new Error('Days must be 1-365');
  if (
    !Number.isInteger(options.seed) ||
    options.seed < 0 ||
    options.seed > 0xffffffff
  )
    throw new Error('Seed must be uint32');
  if (!['easy', 'normal', 'hard', 'terrible'].includes(options.difficulty))
    throw new Error('Invalid difficulty');
  if (!['easy', 'normal', 'hard'].includes(options.bot))
    throw new Error('Invalid bot level');
  return Array.from({ length: options.games }, (_, index) =>
    play((options.seed + Math.imul(index, 0x9e3779b9)) >>> 0, options),
  );
}
type Group = {
  n: number;
  wins: number;
  hp: number;
  days: number;
  hpByDay: number[];
};
export type Summary = {
  overall: Group;
  byBaby: Map<string, Group>;
  byParent: Map<string, Group>;
  byDifficulty: Map<string, Group>;
  byDeathSource: Map<string, number>;
  hpByDay: number[];
};
function add(group: Group, run: RunResult): void {
  group.n++;
  group.wins += Number(run.outcome === 'win');
  group.hp += run.finalHp;
  group.days += run.days;
  run.hpByDay.forEach((hp, day) => {
    group.hpByDay[day] = (group.hpByDay[day] ?? 0) + hp;
  });
}
export function summarize(runs: readonly RunResult[]): Summary {
  const overall: Group = { n: 0, wins: 0, hp: 0, days: 0, hpByDay: [] };
  const byBaby = new Map<string, Group>();
  const byParent = new Map<string, Group>();
  const byDifficulty = new Map<string, Group>();
  const byDeathSource = new Map<string, number>();
  for (const run of runs) {
    add(overall, run);
    if (run.outcome === 'loss') {
      const source = run.lastDamageSource ?? 'unknown';
      byDeathSource.set(source, (byDeathSource.get(source) ?? 0) + 1);
    }
    for (const [map, key] of [
      [byBaby, run.baby],
      [byDifficulty, run.difficulty],
    ] as const) {
      const group = map.get(key) ?? {
        n: 0,
        wins: 0,
        hp: 0,
        days: 0,
        hpByDay: [],
      };
      add(group, run);
      map.set(key, group);
    }
    for (const id of run.parents) {
      const group = byParent.get(id) ?? {
        n: 0,
        wins: 0,
        hp: 0,
        days: 0,
        hpByDay: [],
      };
      add(group, run);
      byParent.set(id, group);
    }
  }
  const hpByDay = overall.hpByDay.map(
    (hp, day) =>
      hp /
      Math.max(1, runs.filter((run) => run.hpByDay[day] !== undefined).length),
  );
  return { overall, byBaby, byParent, byDifficulty, byDeathSource, hpByDay };
}
export function groupLine(name: string, group: Group): string {
  return `${name.padEnd(27)} ${String(group.n).padStart(6)} games  ${((group.wins / group.n) * 100).toFixed(1)}% wins  avg HP ${(
    group.hp / group.n
  ).toFixed(1)}  avg Days ${(group.days / group.n).toFixed(1)}`;
}
export function toCsv(runs: readonly RunResult[]): string {
  const header =
    'seed,baby,parents,modifiers,difficulty,bot,outcome,score,days,final_hp,last_damage,hp_by_day';
  return [
    header,
    ...runs.map((r) =>
      [
        r.seed,
        getCard(r.baby).name,
        r.parents.map((id) => getCard(id).name).join('|'),
        r.modifiers.map((id) => getCard(id).name).join('|'),
        r.difficulty,
        r.bot,
        r.outcome,
        r.score,
        r.days,
        r.finalHp,
        r.lastDamageSource ?? '',
        r.hpByDay.join('|'),
      ]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(','),
    ),
  ].join('\n');
}
