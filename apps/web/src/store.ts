import { createStore } from 'zustand/vanilla';
import {
  applyAction,
  createGame,
  type Action,
  type GameConfig,
  type GameEvent,
  type GameState,
} from '@coddle/engine';
import {
  defaultSettings,
  gameSchema,
  journalSchema,
  read,
  settingsSchema,
  write,
  type Journal,
  type Settings,
  type StoragePort,
} from './storage';

type Store = {
  game: GameState | null;
  settings: Settings;
  journal: Journal;
  events: GameEvent[];
  error: string | null;
  start: (config: GameConfig, seed: number) => void;
  dispatch: (action: Action) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  dismissError: () => void;
};
export function createGameStore(storage: StoragePort) {
  const game = read(storage, 'coddle.game', gameSchema);
  const settings = read(storage, 'coddle.settings', settingsSchema);
  const journal = read(storage, 'coddle.journal', journalSchema);
  return createStore<Store>((set, get) => {
    function save(next: GameState, events: GameEvent[], reset = false): void {
      const current = get();
      const winner =
        next.players.find((player) =>
          next.result?.winners.includes(player.id),
        ) ?? next.players[0]!;
      const players = next.players;
      const discovered = [
        ...new Set(
          [
            ...current.journal.discovered,
            ...next.babyChoices,
            ...players.flatMap((p) => [
              p.babyId,
              ...p.parents,
              ...p.modifiers,
              ...p.hand.map((c) => c.cardId),
              ...p.trouble.map((h) => h.cardId),
            ]),
            ...events.flatMap((e) => (e.cardId ? [e.cardId] : [])),
            ...(next.dayEvent ? [next.dayEvent] : []),
          ].filter(Boolean),
        ),
      ];
      let runs = current.journal.runs;
      if (next.result && (reset || !current.game?.result)) {
        runs = [
          ...runs,
          {
            seed: next.seed,
            babyId: winner.babyId,
            outcome: next.result.outcome,
            score: next.result.score,
            days: next.result.daysSurvived,
            difficulty: next.config.difficulty,
          },
        ]
          .sort((a, b) => b.score - a.score)
          .slice(0, 100);
      }
      const nextJournal = { discovered, runs };
      const errors = [
        write(storage, 'coddle.game', next),
        write(storage, 'coddle.journal', nextJournal),
      ].filter(Boolean);
      set({
        game: next,
        journal: nextJournal,
        events,
        error: errors.join('\n') || current.error,
      });
    }
    return {
      game: game.value,
      settings: settings.value ?? defaultSettings,
      journal: journal.value ?? { discovered: [], runs: [] },
      events: [],
      error:
        [game.error, settings.error, journal.error]
          .filter(Boolean)
          .join('\n') || null,
      start: (config, seed) => {
        try {
          save(createGame(config, seed), [], true);
        } catch (error: unknown) {
          set({
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
      dispatch: (action) => {
        const state = get().game;
        if (!state) {
          set({ error: 'No active game' });
          return;
        }
        try {
          const result = applyAction(state, action);
          save(result.state, result.events);
        } catch (error: unknown) {
          set({
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
      updateSettings: (patch) => {
        const settings = settingsSchema.parse({ ...get().settings, ...patch });
        set({
          settings,
          error: write(storage, 'coddle.settings', settings) ?? get().error,
        });
      },
      dismissError: () => set({ error: null }),
    };
  });
}
