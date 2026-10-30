import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { en, getCard } from '@coddle/content';
import {
  getLegalActions,
  type Action,
  type GameState,
  type Player,
} from '@coddle/engine';
import { CardView } from './CardView';
import { Portrait } from './Portrait';
import type { Settings } from './storage';

type Props = {
  game: GameState;
  dispatch: (a: Action) => void;
  settings: Settings;
  inspect: (id: string) => void;
};
function Stats({ player }: { player: Player }) {
  const stats = [
    { key: 'hp', n: player.hp, max: player.maxHp },
    { key: 'hunger', n: player.hunger, max: 5 },
    { key: 'coddle', n: player.coddle, max: 6 },
    {
      key: 'stamina',
      n: player.stamina,
      max: Math.max(player.staminaCap, player.stamina),
    },
  ] as const;
  return (
    <div className="stats">
      {stats.map((s) => (
        <div key={s.key} className={`stat stat-${s.key}`}>
          <label>
            {en.icons[s.key]} {en[s.key]}{' '}
            <strong>
              {s.n}/{s.max}
            </strong>
          </label>
          <meter min={0} max={s.max} value={s.n} aria-label={en[s.key]} />
        </div>
      ))}
      <span>
        {en.icons.cute} {en.cute} <b>{player.cute}</b>
      </span>
      <span>
        {en.icons.shield} {en.shield} <b>{player.shield}</b>
      </span>
    </div>
  );
}
export function Board({ game, dispatch, settings, inspect }: Props) {
  const p = game.players.find((player) => player.id === game.activePlayerId)!;
  const [selected, setSelected] = useState<string | null>(null);
  const [ability, setAbility] = useState<
    'bundle' | 'cry' | 'nanny' | 'swap' | null
  >(null);
  const actions = getLegalActions(game, p.id);
  const selectedCard = p.hand.find((c) => c.uid === selected);
  const plays = actions.filter(
    (a) => a.type === 'play' && a.cardUid === selected,
  );
  const shares = actions.filter(
    (a) => a.type === 'share' && a.cardUid === selected,
  );
  const playerTargets = plays.filter(
    (a) => a.type === 'play' && a.targetPlayerId,
  );
  const targets = ability ? actions.filter((a) => a.type === ability) : plays;
  function act(a: Action) {
    dispatch(a);
    setSelected(null);
    setAbility(null);
  }
  function selectCard(uid: string) {
    if (game.phase === 'discard') {
      const discard = actions.find(
        (a) => a.type === 'discard' && a.cardUid === uid,
      );
      if (discard) act(discard);
      return;
    }
    const untargeted = actions.find(
      (a) =>
        a.type === 'play' &&
        a.cardUid === uid &&
        !a.targetUid &&
        !a.targetPlayerId,
    );
    if (selected === uid && untargeted) act(untargeted);
    else {
      setSelected(uid);
      setAbility(null);
    }
  }
  function target(uid: string) {
    const action = targets.find((a) => 'targetUid' in a && a.targetUid === uid);
    if (action) act(action);
    else {
      const h = p.trouble.find((h) => h.uid === uid);
      if (h) inspect(h.cardId);
    }
  }
  function drop(uid: string, cardUid: string) {
    const a = actions.find(
      (a) => a.type === 'play' && a.cardUid === cardUid && a.targetUid === uid,
    );
    if (a) act(a);
  }
  return (
    <>
      <motion.section className="baby-board panel" layout>
        <Portrait variant={settings.portrait} />
        <div className="baby-summary">
          <h2>{getCard(p.babyId).name}</h2>
          <Stats player={p} />
        </div>
        {!!p.statuses.length && (
          <p className="statuses">
            {en.status}: {p.statuses.join(' · ')}
          </p>
        )}
      </motion.section>
      {game.players.length > 1 && (
        <section className="seat-strip" aria-label={en.players}>
          {game.players.map((player) => (
            <div
              key={player.id}
              className={`seat ${player.id === p.id ? 'active-seat' : ''} ${!player.alive ? 'eliminated-seat' : ''}`}
            >
              <strong>
                {en.player} {player.id.slice(1)}
              </strong>
              <span>
                {player.alive
                  ? `${en.hp} ${player.hp}/${player.maxHp} · ${en.trouble} ${player.trouble.length}`
                  : en.byeBye}
              </span>
            </div>
          ))}
        </section>
      )}
      <div className="trait-strip" aria-label={en.parents}>
        {[...p.parents, ...p.modifiers].map((id) => (
          <button key={id} onClick={() => inspect(id)}>
            {en.icons[getCard(id).type]} {getCard(id).name}
          </button>
        ))}
      </div>
      {game.dayEvent && (
        <button
          className="event-banner"
          onClick={() => inspect(game.dayEvent!)}
        >
          {en.icons.event} {getCard(game.dayEvent).name}
          <small>{getCard(game.dayEvent).description}</small>
        </button>
      )}
      <section className="trouble-zone" aria-label={en.trouble}>
        <h3>{en.trouble}</h3>
        <div className="hazards">
          <AnimatePresence>
            {[...p.trouble]
              .sort((a, b) => a.timer - b.timer)
              .map((h) => {
                const card = getCard(h.cardId);
                const valid = targets.some(
                  (a) => 'targetUid' in a && a.targetUid === h.uid,
                );
                const passes = actions.filter(
                  (action) =>
                    action.type === 'pass' && action.hazardUid === h.uid,
                );
                return (
                  <div className="hazard-seat" key={h.uid}>
                    <motion.button
                      layout
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.2, opacity: 0, rotate: 12 }}
                      className={`hazard card ${valid ? 'valid-target' : ''}`}
                      onClick={() => target(h.uid)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        drop(h.uid, e.dataTransfer.getData('text/plain'));
                      }}
                      aria-label={`${card.name}, ${en.timer} ${h.timer}${valid ? `, ${en.selectTarget}` : ''}`}
                    >
                      <span className="timer">
                        {en.icons.timer}
                        {card.hazard?.linger ? '∞' : h.timer}
                      </span>
                      <CardView card={card} compact />
                      {h.answeredTags.length > 0 && (
                        <span>{h.answeredTags.join(' + ')}</span>
                      )}
                    </motion.button>
                    {passes.map((action) =>
                      action.type === 'pass' ? (
                        <button
                          key={action.targetPlayerId}
                          className="pass-action"
                          onClick={() => act(action)}
                        >
                          {en.passTo} {action.targetPlayerId.slice(1)}
                        </button>
                      ) : null,
                    )}
                  </div>
                );
              })}
          </AnimatePresence>
          {!p.trouble.length && <p className="quiet">{en.noTrouble}</p>}
        </div>
        {actions.some((action) => action.type === 'ghost') && (
          <section className="interaction-actions">
            <h3>{en.ghost}</h3>
            {actions.map((action) =>
              action.type === 'ghost' ? (
                <button
                  key={`${action.helperId}-${action.targetPlayerId}`}
                  onClick={() => act(action)}
                >
                  {en.player} {action.helperId.slice(1)} → {en.player}{' '}
                  {action.targetPlayerId.slice(1)}
                </button>
              ) : null,
            )}
          </section>
        )}
      </section>
      <div className="abilities">
        {(['bundle', 'cry', 'nanny', 'swap'] as const).map((key) => {
          const legal = actions.some((a) => a.type === key);
          if (!legal && key !== 'bundle') return null;
          return (
            <button
              key={key}
              disabled={!legal}
              aria-pressed={ability === key}
              onClick={() => {
                setAbility(ability === key ? null : key);
                setSelected(null);
              }}
            >
              {en[key]}
              {key === 'bundle' && <small>{en.icons.coddle} 2</small>}
            </button>
          );
        })}
      </div>
      {game.forecast.length > 0 && (
        <p className="forecast">
          {en.nextHazards}:{' '}
          {game.forecast.map((id) => getCard(id).name).join(' → ')}
        </p>
      )}
      <section className="hand-zone" aria-label={en.hand}>
        <h3>{game.phase === 'discard' ? en.discard : en.hand}</h3>
        <p className="hint">{en.dragHint}</p>
        <div className="hand">
          <AnimatePresence>
            {p.hand.map((c) => (
              <motion.button
                key={c.uid}
                layout
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: selected === c.uid ? -8 : 0, opacity: 1 }}
                exit={{ y: -70, opacity: 0, scale: 0.5 }}
                className={`card care ${selected === c.uid ? 'selected' : ''}`}
                aria-pressed={selected === c.uid}
                draggable
                onDragStartCapture={(e) =>
                  e.dataTransfer.setData('text/plain', c.uid)
                }
                onClick={() => selectCard(c.uid)}
              >
                <CardView card={getCard(c.cardId)} compact />
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
        {selectedCard && (
          <div className="preview panel">
            <CardView card={getCard(selectedCard.cardId)} />
            <p>
              {playerTargets.length
                ? en.chooseRival
                : shares.length
                  ? en.sharePrompt
                  : plays.length
                    ? en.selectTarget
                    : en.cannotPlay}
            </p>
            {plays
              .filter(
                (a) => a.type === 'play' && !a.targetUid && !a.targetPlayerId,
              )
              .map((a) => (
                <button key={a.type} className="primary" onClick={() => act(a)}>
                  {en.confirmPlay}
                </button>
              ))}
            {plays.map((a) =>
              a.type === 'play' && a.targetPlayerId ? (
                <button key={a.targetPlayerId} onClick={() => act(a)}>
                  {en.player} {a.targetPlayerId.slice(1)}
                </button>
              ) : null,
            )}
            {shares.map((a) =>
              a.type === 'share' ? (
                <button
                  key={`share-${a.targetPlayerId}`}
                  onClick={() => act(a)}
                >
                  {en.shareTo} {en.player} {a.targetPlayerId.slice(1)}
                </button>
              ) : null,
            )}
          </div>
        )}
      </section>
      <footer className="turn-footer">
        <span>
          {game.players.length > 1
            ? `${en.player} ${p.id.slice(1)} · ${en.day} ${game.day}`
            : `${en.icons.sleep} ${en.day} ${game.day}`}
        </span>
        <button
          className="primary nap"
          disabled={game.phase !== 'action'}
          onClick={() => act({ type: 'endTurn', playerId: p.id })}
        >
          {en.napTime}
        </button>
      </footer>
    </>
  );
}
