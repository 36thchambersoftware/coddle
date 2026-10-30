import { getCard, type Card, type Effect, type Op } from '@coddle/content';
import { discard, drawCare } from './decks';
import { random } from './random';
import { conditions, effectScale, rule, sources } from './rules';
import {
  addStatus,
  damage,
  heal,
  refreshStats,
  removeStatus,
  setStat,
} from './stats';
import { addHazards, removeHazard } from './hazards';
import type { Context } from './types';

function runOp(ctx: Context, op: Op, scale: number): void {
  const p = ctx.player;
  const n = 'n' in op ? op.n * scale : 0;
  switch (op.op) {
    case 'heal':
      heal(ctx, n);
      break;
    case 'damage':
      damage(ctx, n);
      break;
    case 'startHpMod':
      setStat(ctx, 'hp', p.hp + n);
      break;
    case 'shield':
      setStat(ctx, 'shield', p.shield + n);
      break;
    case 'stamina':
      setStat(ctx, 'stamina', p.stamina + n);
      break;
    case 'staminaCapMod':
      p.baseStats.staminaCap += n;
      refreshStats(ctx);
      break;
    case 'nextStamina':
      setStat(
        ctx,
        'nextStamina',
        p.nextStamina +
          Math.max(
            0,
            n +
              (ctx.source?.tags.includes('Rest')
                ? Math.min(0, rule(ctx, 'restStamina'))
                : 0),
          ),
      );
      break;
    case 'maxHpMod':
      p.baseStats.maxHp += n;
      refreshStats(ctx);
      break;
    case 'cuteMod':
      p.baseStats.cute += n;
      refreshStats(ctx);
      break;
    case 'hunger': {
      const gain =
        n > 0 && ctx.source?.type === 'care' ? n + rule(ctx, 'hungerGain') : n;
      if (
        p.hunger + gain > 5 &&
        ctx.source?.type === 'parent' &&
        rule(ctx, 'nightHungerOverflow') > 0
      )
        damage({ ...ctx, source: undefined }, 1);
      setStat(ctx, 'hunger', p.hunger + gain);
      break;
    }
    case 'coddle': {
      let gain = n;
      if (n > 0 && ctx.source?.type === 'care') {
        gain += rule(ctx, 'coddleGain');
        if (ctx.source.tags.includes('Comfort') && p.statuses.includes('Fussy'))
          gain--;
        gain = Math.max(rule(ctx, 'minimumCoddle'), gain, 0);
      }
      setStat(ctx, 'coddle', p.coddle + gain);
      break;
    }
    case 'draw':
      drawCare(ctx, n);
      break;
    case 'discard':
      discard(ctx, n, op.random);
      break;
    case 'addStatus':
      if (op.status !== 'first') {
        const target = ctx.targetPlayerId
          ? ctx.state.players.find((player) => player.id === ctx.targetPlayerId)
          : undefined;
        const targetCtx = target ? { ...ctx, player: target } : ctx;
        addStatus(targetCtx, op.status);
        refreshStats(targetCtx);
      }
      break;
    case 'removeStatus': {
      const status = op.status === 'first' ? p.statuses[0] : op.status;
      if (status) removeStatus(ctx, status);
      break;
    }
    case 'removeHazard': {
      const targets = p.trouble.filter(
        (h) =>
          (!ctx.targetUid || h.uid === ctx.targetUid) &&
          (!op.filter?.id || op.filter.id === h.cardId) &&
          (op.filter?.timer === undefined || h.timer === op.filter.timer),
      );
      for (const target of targets) removeHazard(ctx, target.uid, true);
      break;
    }
    case 'delayHazard':
      for (const h of p.trouble)
        if (op.target === 'all' || h.uid === ctx.targetUid) {
          h.timer = Math.max(0, h.timer + n);
          if (op.addTag && !h.extraTags.includes(op.addTag))
            h.extraTags.push(op.addTag);
        }
      break;
    case 'addHazard':
      addHazards(ctx, n, op.filter);
      break;
    case 'scry':
      if (
        rule(ctx, 'disableAura') <= 0 ||
        !ctx.source?.tags.includes('Monitor')
      ) {
        ctx.state.forecast = ctx.state.decks.hazard.draw
          .filter((id) => (getCard(id).minDay ?? 1) <= ctx.state.day)
          .slice(0, n);
        ctx.events.push({ type: 'scry', after: ctx.state.forecast });
      }
      break;
    case 'replaceParent': {
      const index = p.parents.indexOf(ctx.source?.id ?? '');
      if (index >= 0) {
        p.parents[index] = op.id;
        refreshStats(ctx);
        runEffects(
          { ...ctx, source: getCard(op.id) },
          getCard(op.id),
          'onSetup',
        );
      }
      break;
    }
    case 'revive':
      setStat(ctx, 'hp', op.hp);
      setStat(ctx, 'coddle', p.coddle + op.coddle);
      ctx.events.push({
        type: 'revive',
        playerId: p.id,
        sourceId: ctx.source?.id,
      });
      break;
    case 'randomParentSlots': {
      let roll = random(ctx.state) * op.weights.reduce((a, b) => a + b, 0);
      let count = 0;
      for (; count < op.weights.length - 1; count++) {
        roll -= op.weights[count]!;
        if (roll < 0) break;
      }
      // Consumed by setup; kept out of the card definition.
      p.used.push(`parentSlots:${count}`);
      break;
    }
    case 'rule':
      break;
    case 'auraCoddle':
      if (
        ctx.state.config.interaction === 'coop' &&
        rule(ctx, 'disableAura') <= 0
      ) {
        for (const player of ctx.state.players.filter((other) => other.alive))
          setStat({ ...ctx, player }, 'coddle', player.coddle + n);
      }
      break;
    case 'steal': {
      if (ctx.source?.tags.includes('Sibling') && ctx.targetPlayerId) {
        const target = ctx.state.players.find(
          (player) => player.id === ctx.targetPlayerId,
        );
        if (!target?.hand.length) throw new Error('Target hand is empty');
        const index = Math.floor(random(ctx.state) * target.hand.length);
        const [stolen] = target.hand.splice(index, 1);
        p.hand.push(stolen!);
        ctx.events.push({
          type: 'draw',
          playerId: p.id,
          cardId: stolen!.cardId,
        });
        break;
      }
      throw new Error('Steal requires a versus target');
    }
    case 'passHazard':
    case 'swapHazard':
      throw new Error(
        `Operation ${op.op} requires a multiplayer/action context`,
      );
  }
}
export function runEffects(
  ctx: Context,
  card: Card,
  trigger: Effect['trigger'],
): void {
  card.effects.forEach((effect, index) => {
    const key = `${card.id}:${index}`;
    const used = effect.once === 'game' ? ctx.player.gameUsed : ctx.player.used;
    if (effect.trigger !== trigger || !conditions(ctx, effect.when)) return;
    if (effect.once && used.includes(key)) return;
    const scale = effectScale(ctx, card, effect);
    if (!scale) return;
    if (effect.once) used.push(key);
    for (const op of effect.ops) runOp(ctx, op, scale);
  });
}
export function trigger(ctx: Context, name: Effect['trigger']): void {
  for (const card of sources(ctx))
    runEffects({ ...ctx, source: ctx.source ?? card }, card, name);
}
