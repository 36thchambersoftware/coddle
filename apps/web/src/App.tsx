import { useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { MotionConfig, motion, useReducedMotion } from 'framer-motion';
import { en, getCard } from '@coddle/content';
import { SOLO_STANDARD, type Difficulty } from '@coddle/engine';
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
  const [formError, setFormError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const handledEvents = useRef(events);
  const prefersReduced = useReducedMotion();
  const p = game?.players[0];
  useEffect(() => {
    if (handledEvents.current !== events) {
      feedback(events, settings);
      handledEvents.current = events;
    }
  }, [events, settings]);
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
    start(
      {
        ...SOLO_STANDARD,
        difficulty,
        winCondition: {
          type: 'surviveDays',
          days: days === 'endless' ? null : Number(days),
        },
      },
      n,
    );
    setPage('game');
    setFormError('');
    setMeet(false);
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
            <small>{en.solo}</small>
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
            {game.phase === 'chooseBaby' && (
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
                          playerId: 'p1',
                          cardId: id,
                        });
                        setMeet(true);
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
            {meet && p?.babyId && (
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
            {!meet && p?.babyId && game.phase !== 'finished' && (
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
                <h1>{game.result?.outcome === 'win' ? en.win : en.byeBye}</h1>
                <p>
                  {en.survived}: {game.result?.daysSurvived} · {en.score}:{' '}
                  {game.result?.score}
                </p>
                <p>
                  {en.milestone}:{' '}
                  {p.milestones
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
