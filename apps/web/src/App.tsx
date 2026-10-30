import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { MotionConfig, motion, useReducedMotion } from 'framer-motion';
import { en, getCard } from '@coddle/content';
import { chooseAction } from '@coddle/bots';
import {
  SOLO_STANDARD,
  type Difficulty,
  type GameConfig,
} from '@coddle/engine';
import { Board } from './Board';
import { CardView } from './CardView';
import { Portrait } from './Portrait';
import { SettingsPanel } from './SettingsPanel';
import { feedback } from './feedback';
import { createGameStore } from './store';
import type { StoragePort } from './storage';

const browserStorage: StoragePort = {
  get: (key) => window.localStorage.getItem(key),
  set: (key, value) => window.localStorage.setItem(key, value),
};
const store = createGameStore(browserStorage);
type Page = 'game' | 'settings' | 'rules' | 'journal' | 'new';
type Mode = 'solo' | 'lastStanding' | 'race' | 'coop';
function isMode(value: string): value is Mode {
  return ['solo', 'lastStanding', 'race', 'coop'].includes(value);
}
export function App() {
  const {
    game,
    settings,
    journal,
    events,
    error,
    start,
    dispatch,
    updateSettings,
    dismissError,
  } = useStore(store);
  const [page, setPage] = useState<Page>('game');
  const [inspect, setInspect] = useState<string | null>(null);
  const [meet, setMeet] = useState(false);
  const [seed, setSeed] = useState('42');
  const [days, setDays] = useState('7');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [mode, setMode] = useState<Mode>('solo');
  const [playerCount, setPlayerCount] = useState('2');
  const [fillWithBots, setFillWithBots] = useState(false);
  const [readyPlayerId, setReadyPlayerId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const handledEvents = useRef(events);
  const prefersReduced = useReducedMotion();
  const p = game?.players.find((player) => player.id === game.activePlayerId);
  const botTurn =
    !!game && game.config.botPlayers.includes(game.activePlayerId);
  const requiresPrivacy =
    !!game &&
    game.players.length > 1 &&
    !botTurn &&
    readyPlayerId !== game.activePlayerId;
  useLayoutEffect(() => {
    setReadyPlayerId(null);
  }, [game?.activePlayerId]);
  useEffect(() => {
    if (handledEvents.current !== events) {
      feedback(events, settings);
      handledEvents.current = events;
    }
  }, [events, settings]);
  useEffect(() => {
    if (!game || !game.config.botPlayers.includes(game.activePlayerId)) return;
    const timer = window.setTimeout(() => {
      let current = store.getState().game;
      let steps = 0;
      const botLevel =
        current?.config.difficulty === 'easy'
          ? 'easy'
          : current?.config.difficulty === 'normal'
            ? 'normal'
            : 'hard';
      while (
        current &&
        current.phase !== 'finished' &&
        current.config.botPlayers.includes(current.activePlayerId) &&
        steps < 100
      ) {
        const previous = current;
        const action = chooseAction(current, current.activePlayerId, botLevel);
        store.getState().dispatch(action);
        current = store.getState().game;
        if (current === previous) break;
        steps++;
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [game]);
  useEffect(() => {
    if (inspect) dialog.current?.showModal();
    else dialog.current?.close();
  }, [inspect]);
  function begin() {
    const n = Number(seed);
    if (!Number.isInteger(n) || n < 0 || n > 0xffffffff || !seed.trim()) {
      setFormError(en.invalidSeed);
      return;
    }
    const players: GameConfig['players'] =
      mode === 'solo'
        ? 1
        : playerCount === '2'
          ? 2
          : playerCount === '3'
            ? 3
            : 4;
    const config: GameConfig = {
      ...SOLO_STANDARD,
      players,
      interaction:
        mode === 'solo' ? 'none' : mode === 'coop' ? 'coop' : 'versus',
      botPlayers:
        fillWithBots && players > 1
          ? Array.from({ length: players - 1 }, (_, i) => `p${i + 2}`)
          : [],
      difficulty,
      winCondition:
        mode === 'lastStanding'
          ? { type: 'lastStanding', days: null }
          : {
              type: 'surviveDays',
              days: days === 'endless' ? null : Number(days),
            },
    };
    start(config, n);
    setPage('game');
    setFormError('');
    setMeet(false);
    setReadyPlayerId(null);
  }
  const latest = events
    .filter((e) => !['change', 'stat', 'draw'].includes(e.type))
    .slice(-3);
  return (
    <MotionConfig
      reducedMotion={
        settings.reducedMotion || prefersReduced ? 'always' : 'never'
      }
    >
      <main
        className={`app ${settings.colorblind ? 'colorblind' : ''} ${settings.reducedMotion ? 'reduce-motion' : ''} text-${settings.textSize}`}
      >
        <header className="app-header">
          <button className="brand" onClick={() => setPage('game')}>
            {en.title}
            <small>
              {game?.players.length && game.players.length > 1
                ? en.multiplayer
                : en.solo}
            </small>
          </button>
          <nav aria-label={en.settings}>
            <button onClick={() => setPage('rules')}>{en.rules}</button>
            <button onClick={() => setPage('settings')}>{en.settings}</button>
            <button onClick={() => setPage('journal')}>{en.journal}</button>
          </nav>
        </header>
        {error && (
          <div className="error panel" role="alert">
            <strong>{en.errorHeading}</strong>
            <p>{en.storageError}</p>
            <details>
              <summary>{en.inspect}</summary>
              <pre>{error}</pre>
            </details>
            <button onClick={dismissError}>{en.clearError}</button>
          </div>
        )}
        {page !== 'game' && (
          <button className="back" onClick={() => setPage('game')}>
            {en.back}
          </button>
        )}
        {(page === 'new' || (!game && page === 'game')) && (
          <section className="panel welcome">
            <Portrait variant={settings.portrait} />
            <h1>{en.title}</h1>
            <p>{en.tagline}</p>
            <label>
              {en.seed}
              <input
                inputMode="numeric"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
              />
            </label>
            <label>
              {en.mode}
              <select
                value={mode}
                onChange={(e) => {
                  if (isMode(e.target.value)) setMode(e.target.value);
                }}
              >
                <option value="solo">{en.solo}</option>
                <option value="lastStanding">{en.lastStanding}</option>
                <option value="race">{en.survivalRace}</option>
                <option value="coop">{en.coopNursery}</option>
              </select>
            </label>
            {mode !== 'solo' && (
              <>
                <label>
                  {en.players}
                  <select
                    value={playerCount}
                    onChange={(e) => setPlayerCount(e.target.value)}
                  >
                    {[2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="toggle">
                  {en.fillWithBots}
                  <input
                    type="checkbox"
                    checked={fillWithBots}
                    onChange={(e) => setFillWithBots(e.target.checked)}
                  />
                </label>
              </>
            )}
            <label>
              {en.days}
              <select value={days} onChange={(e) => setDays(e.target.value)}>
                <option value="5">{en.short}</option>
                <option value="7">{en.standard}</option>
                <option value="10">{en.long}</option>
                <option value="endless">{en.endless}</option>
              </select>
            </label>
            <label>
              {en.difficulty}
              <select
                value={difficulty}
                onChange={(e) => {
                  const d = e.target.value;
                  if (
                    d === 'easy' ||
                    d === 'normal' ||
                    d === 'hard' ||
                    d === 'terrible'
                  )
                    setDifficulty(d);
                }}
              >
                {Object.entries(en.difficultyNames).map(([id, name]) => (
                  <option value={id} key={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            {formError && <p role="alert">{formError}</p>}
            <button className="primary" onClick={begin}>
              {en.start}
            </button>
            {game && <p>{en.newRunHint}</p>}
          </section>
        )}
        {page === 'settings' && (
          <SettingsPanel settings={settings} update={updateSettings} />
        )}
        {page === 'rules' && (
          <section className="panel">
            <h2>{en.rules}</h2>
            {en.rulesText.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </section>
        )}
        {page === 'journal' && (
          <section className="panel">
            <h2>{en.journal}</h2>
            <h3>{en.bestRuns}</h3>
            {!journal.runs.length && <p>{en.noRuns}</p>}
            {journal.runs.map((r, i) => (
              <p key={i}>
                {getCard(r.babyId).name} · {en.score} {r.score} · {en.survived}{' '}
                {r.days} · {en.seed} {r.seed}
              </p>
            ))}
            <h3>
              {en.discovered} ({journal.discovered.length})
            </h3>
            <div className="collection">
              {journal.discovered.map((id) => (
                <button key={id} onClick={() => setInspect(id)}>
                  {getCard(id).name}
                </button>
              ))}
            </div>
          </section>
        )}
        {page === 'game' && game && (
          <>
            <motion.div
              key={game.day}
              className="day-banner"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {en.day} {game.day}
              {game.config.winCondition.days
                ? ` / ${game.config.winCondition.days}`
                : ` · ${en.endless}`}
            </motion.div>
            {botTurn && game.phase !== 'finished' && (
              <section className="panel privacy" role="status">
                <h1>{en.botThinking}</h1>
              </section>
            )}
            {requiresPrivacy && (
              <section className="panel privacy">
                <h1>
                  {en.player} {game.activePlayerId.slice(1)}
                </h1>
                <p>{en.privacy}</p>
                <button
                  className="primary"
                  onClick={() => setReadyPlayerId(game.activePlayerId)}
                >
                  {en.ready}
                </button>
              </section>
            )}
            {!botTurn && !requiresPrivacy && game.phase === 'chooseBaby' && (
              <section className="panel">
                <h1>{en.chooseBaby}</h1>
                <div className="baby-choices">
                  {game.babyChoices.map((id) => (
                    <button
                      className="card"
                      key={id}
                      onClick={() => {
                        dispatch({
                          type: 'chooseBaby',
                          playerId: game.activePlayerId,
                          cardId: id,
                        });
                        if (game.players.length === 1) setMeet(true);
                      }}
                    >
                      <CardView card={getCard(id)} />
                      <span>
                        {en.hp} {getCard(id).stats?.startHp}/
                        {getCard(id).stats?.maxHp} · {en.stamina}{' '}
                        {getCard(id).stats?.staminaCap}
                      </span>
                      <strong>{en.choose}</strong>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {!botTurn && !requiresPrivacy && meet && p?.babyId && (
              <section className="panel meet">
                <Portrait variant={settings.portrait} />
                <h1>{en.meetBaby}</h1>
                <h2>{getCard(p.babyId).name}</h2>
                <p>
                  {en.bio}{' '}
                  {p.parents.map((id) => getCard(id).name).join(' & ') ||
                    en.noParents}
                </p>
                {p.modifiers.map((id) => (
                  <p key={id}>
                    <b>{getCard(id).name}</b>: {getCard(id).description}
                  </p>
                ))}
                <button className="primary" onClick={() => setMeet(false)}>
                  {en.continue}
                </button>
              </section>
            )}
            {!botTurn &&
              !requiresPrivacy &&
              !meet &&
              p?.babyId &&
              game.phase !== 'finished' && (
                <Board
                  game={game}
                  settings={settings}
                  dispatch={dispatch}
                  inspect={setInspect}
                />
              )}
            {game.phase === 'finished' && !meet && p && (
              <section className="panel result">
                <Portrait
                  variant={settings.portrait}
                  floating={game.result?.outcome === 'loss'}
                />
                <h1>
                  {game.result?.outcome === 'loss'
                    ? en.byeBye
                    : game.result?.outcome === 'silver'
                      ? en.silverResult
                      : game.result?.outcome === 'bronze'
                        ? en.bronzeResult
                        : game.config.interaction === 'coop'
                          ? en.coOpResult
                          : game.config.winCondition.type === 'lastStanding'
                            ? en.playerWins
                            : en.win}
                </h1>
                {game.result?.winners.length ? (
                  <p>
                    {en.players}:{' '}
                    {game.result.winners
                      .map((id) => `${en.player} ${id.slice(1)}`)
                      .join(', ')}
                  </p>
                ) : null}
                <p>
                  {en.survived}: {game.result?.daysSurvived} · {en.score}:{' '}
                  {game.result?.score}
                </p>
                <p>
                  {en.milestone}:{' '}
                  {(
                    game.players.find((player) =>
                      game.result?.winners.includes(player.id),
                    ) ?? p
                  ).milestones
                    .map(
                      (id) => en.milestones[id as keyof typeof en.milestones],
                    )
                    .join(' · ')}
                </p>
                <button className="primary" onClick={() => setPage('new')}>
                  {en.restart}
                </button>
              </section>
            )}
            <div className="event-log" role="log" aria-live="polite">
              {events
                .filter((e) => e.type === 'stat' && e.field === 'hp')
                .map((e, i) => (
                  <motion.span
                    className="floating-number"
                    key={`${game.day}-${i}-${e.after}`}
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                  >
                    {en.icons.hp}{' '}
                    {typeof e.after === 'number' && typeof e.before === 'number'
                      ? `${e.after > e.before ? '+' : ''}${e.after - e.before}`
                      : ''}
                  </motion.span>
                ))}
              {latest.map((e, i) => (
                <motion.p
                  key={`${game.day}-${i}-${e.type}-${e.cardId}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {en.eventNames[e.type]}
                  {e.cardId ? `: ${getCard(e.cardId).name}` : ''}
                </motion.p>
              ))}
            </div>
            {game.phase !== 'finished' && (
              <button className="new-game" onClick={() => setPage('new')}>
                {en.restart}
              </button>
            )}
          </>
        )}
        <dialog ref={dialog} onCancel={() => setInspect(null)}>
          {inspect && <CardView card={getCard(inspect)} />}
          <button className="primary" onClick={() => setInspect(null)}>
            {en.close}
          </button>
        </dialog>
      </main>
    </MotionConfig>
  );
}
