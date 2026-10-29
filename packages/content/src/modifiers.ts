import { card, effect as e, passive as p } from './helpers';
import type { Card, Effect } from './schema';
const trait = (
  id: string,
  name: string,
  boon: boolean,
  description: string,
  effects: Effect[],
) =>
  card(id, name, 'modifier', [boon ? 'Boon' : 'Quirk'], description, effects);
const setup = (ops: Effect['ops']) => e('onSetup', ops);
export const modifiers: Card[] = [
  trait('ten-fingers', 'Ten Fingers & Ten Toes', true, '+2 Max and Start HP.', [
    setup([
      { op: 'maxHpMod', n: 2 },
      { op: 'heal', n: 2 },
    ]),
  ]),
  trait(
    'strong-lungs',
    'Strong Lungs',
    true,
    'Once/Day: 1 Stamina to delay a Hazard by 1.',
    [p('cryAbility', 1)],
  ),
  trait('iron-tummy', 'Iron Tummy', true, 'Gross hazard damage -1.', [
    p('hazardDamage', -1, ['Gross']),
  ]),
  trait('chubby-cheeks', 'Chubby Cheeks', true, 'Cute +2.', [
    setup([{ op: 'cuteMod', n: 2 }]),
  ]),
  trait('fast-learner', 'Fast Learner', true, 'Draw +1 at Wake.', [
    p('wakeDraw', 1),
  ]),
  trait('heavy-sleeper', 'Heavy Sleeper', true, 'Rest cards give +1 Stamina.', [
    p('restStamina', 1),
  ]),
  trait(
    'lucky-star',
    'Lucky Star',
    true,
    'Once/Day: swap the newest Hazard for a fresh one.',
    [p('swapAbility', 1)],
  ),
  trait('giggler', 'Giggler', true, 'Wake Coddle +1 if Cute >=5.', [
    e(
      'onWake',
      [{ op: 'coddle', n: 1 }],
      [{ stat: 'cute', cmp: '>=', value: 5 }],
    ),
  ]),
  trait(
    'strong-immunity',
    'Strong Immunity',
    true,
    'Cure one status each Night.',
    [e('onNight', [{ op: 'removeStatus', status: 'first' }])],
  ),
  trait('cowlick', 'Cowlick', false, 'Cute -1.', [
    setup([{ op: 'cuteMod', n: -1 }]),
  ]),
  trait('allergic', 'Allergic to Everything', false, 'Feed healing -1.', [
    p('heal', -1, ['Feed']),
  ]),
  trait('sensitive-skin', 'Sensitive Skin', false, 'Diaper hazard damage +1.', [
    p('hazardDamage', 1, ['Diaper']),
  ]),
  trait('colic-prone', 'Colic Prone', false, '+1 Hazard on Day 2.', [
    p('hazardCount', 1, undefined, [{ stat: 'day', cmp: '=', value: 2 }]),
  ]),
  trait(
    'weak-lungs',
    'Weak Lungs',
    false,
    'Cry abilities disabled; start Fussy.',
    [p('cryAbility', -100), setup([{ op: 'addStatus', status: 'Fussy' }])],
  ),
  trait('teething-early', 'Teething Early', false, 'Extra Teething on Day 1.', [
    e(
      'onWake',
      [{ op: 'addHazard', n: 1, filter: { id: 'teething' } }],
      [{ stat: 'day', cmp: '=', value: 1 }],
    ),
  ]),
  trait('fussy-eater', 'Fussy Eater', false, 'Start Hunger 2.', [
    setup([{ op: 'hunger', n: -1 }]),
  ]),
  trait(
    'light-sleeper',
    'Light Sleeper',
    false,
    'Rest Stamina gain -1, min 0.',
    [p('restStamina', -1)],
  ),
  trait('drooler', 'Drooler', false, 'Cute +1, start Stinky.', [
    setup([
      { op: 'cuteMod', n: 1 },
      { op: 'addStatus', status: 'Stinky' },
    ]),
  ]),
];
