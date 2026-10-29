import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { stdin, stdout } from 'node:process';
import { chooseAction } from '@coddle/bots';
import { en, getCard } from '@coddle/content';
import {
  applyAction,
  createGame,
  getLegalActions,
  SOLO_STANDARD,
  type Difficulty,
} from '@coddle/engine';
import { describeAction, describeBoard } from './format';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      seed: { type: 'string', default: '42' },
      days: { type: 'string', default: '7' },
      difficulty: { type: 'string', default: 'normal' },
      auto: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });
  if (values.help) {
    console.log(en.cli.usage);
    return;
  }
  const difficulty = values.difficulty;
  if (!['easy', 'normal', 'hard', 'terrible'].includes(difficulty))
    throw new Error('Invalid difficulty');
  let state = createGame(
    {
      ...SOLO_STANDARD,
      difficulty: difficulty as Difficulty,
      winCondition: { type: 'surviveDays', days: Number(values.days) },
    },
    Number(values.seed),
  );
  const input = values.auto
    ? null
    : createInterface({ input: stdin, output: stdout });
  let closed = false;
  input?.on('close', () => {
    closed = true;
  });
  try {
    console.log(
      `${en.title} | ${en.seed} ${values.seed} | ${en.difficultyNames[state.config.difficulty]}`,
    );
    for (let step = 0; state.phase !== 'finished'; step++) {
      if (step > 3000) throw new Error('Playthrough action limit exceeded');
      console.log(`\n${describeBoard(state)}`);
      const actions = getLegalActions(state, 'p1');
      let action;
      if (values.auto) action = chooseAction(state, 'p1', 'normal');
      else {
        actions.forEach((a, i) =>
          console.log(`${i + 1}. ${describeAction(state, a)}`),
        );
        if (!input || closed) {
          console.log(en.cli.eof);
          return;
        }
        const answer = await input.question(en.cli.prompt);
        if (answer.trim().toLowerCase() === 'q') {
          console.log(en.cli.quit);
          return;
        }
        action = actions[Number(answer) - 1];
        if (!action) {
          console.log(en.cli.invalid);
          continue;
        }
      }
      console.log(`> ${describeAction(state, action)}`);
      const oldPhase = state.phase;
      const result = applyAction(state, action);
      state = result.state;
      if (oldPhase === 'chooseBaby') {
        const p = state.players[0]!;
        console.log(`${en.meetBaby}: ${getCard(p.babyId).name}`);
        console.log(
          `${en.parents}: ${p.parents.map((id) => getCard(id).name).join(', ')}`,
        );
        console.log(
          `${en.traits}: ${p.modifiers.map((id) => getCard(id).name).join(', ')}`,
        );
      }
      for (const e of result.events)
        if (
          [
            'dayEvent',
            'hazardResolved',
            'hazardAnswered',
            'milestone',
            'revive',
          ].includes(e.type)
        )
          console.log(
            `${en.eventNames[e.type]}${e.cardId ? `: ${getCard(e.cardId).name}` : e.after ? `: ${e.after}` : ''}`,
          );
    }
    console.log(`\n${describeBoard(state)}`);
    console.log(state.result?.outcome === 'win' ? en.win : en.byeBye);
    console.log(
      `${en.survived}: ${state.result?.daysSurvived} | ${en.score}: ${state.result?.score}`,
    );
  } finally {
    input?.close();
  }
}
main().catch((error: unknown) => {
  console.error(
    `${en.cli.failed}: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
