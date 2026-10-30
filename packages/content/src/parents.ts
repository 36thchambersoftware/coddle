import { card, effect as e, passive as p } from './helpers';
import type { Card, Effect } from './schema';
const parent = (
  id: string,
  name: string,
  pool: string,
  description: string,
  effects: Effect[],
) => card(id, name, 'parent', [pool], description, effects);
const setup = (ops: Effect['ops'], drawback = false) =>
  e('onSetup', ops, undefined, drawback);
export const parents: Card[] = [
  parent(
    'overbearing-mother',
    'The Overbearing Mother',
    'M',
    '+4 Max HP; -1 Stamina cap.',
    [p('maxHp', 4), p('staminaCap', -1, undefined, undefined, true)],
  ),
  parent(
    'tired-mom',
    'Tired New Mom',
    'M',
    'Start +2 Coddle; Sleepless every third Day.',
    [
      setup([{ op: 'coddle', n: 2 }]),
      e(
        'onWake',
        [{ op: 'addStatus', status: 'Sleepless' }],
        [{ dayModulo: [3, 0] }],
        true,
      ),
    ],
  ),
  parent(
    'helicopter-mom',
    'Helicopter Mom',
    'M',
    'First Hazard timer +1; card Coddle -1, min 1.',
    [
      p('firstHazardTimer', 1),
      p('coddleGain', -1, undefined, undefined, true),
      p('minimumCoddle', 1),
    ],
  ),
  parent(
    'crunchy-mom',
    'Crunchy Mom',
    'M',
    'Feed healing and Hunger +1; Flu Season twice.',
    [
      p('heal', 1, ['Feed']),
      p('hungerGain', 1, ['Feed']),
      p('fluExtra', 1, undefined, undefined, true),
    ],
  ),
  parent('party-mom', 'Party Mom', 'M', 'Day 1: +2 Stamina and +1 Hazard.', [
    e(
      'onWake',
      [{ op: 'stamina', n: 2 }],
      [{ stat: 'day', cmp: '=', value: 1 }],
    ),
    p('hazardCount', 1, undefined, [{ stat: 'day', cmp: '=', value: 1 }], true),
  ]),
  parent(
    'doting-mom',
    'Doting Mom',
    'M',
    '+1 Coddle each Wake; Fussy at Hunger <=1.',
    [
      e('onWake', [{ op: 'coddle', n: 1 }]),
      e(
        'onWake',
        [{ op: 'addStatus', status: 'Fussy' }],
        [{ stat: 'hunger', cmp: '<=', value: 1 }],
        true,
      ),
    ],
  ),
  parent(
    'stable-father',
    'The Stable Father',
    'F',
    '+2 Max HP; first Hazard timer +1.',
    [p('maxHp', 2), p('firstHazardTimer', 1)],
  ),
  parent(
    'deadbeat-dad',
    'Deadbeat Dad',
    'F',
    '-3 Max and Start HP; Night Coddle -1. Day 5: heal 4 and becomes Stable Father.',
    [
      setup([{ op: 'startHpMod', n: -3 }], true),
      p('maxHp', -3, undefined, undefined, true),
      e('onNight', [{ op: 'coddle', n: -1 }], undefined, true),
      {
        ...e(
          'onWake',
          [
            { op: 'heal', n: 4 },
            { op: 'replaceParent', id: 'stable-father' },
          ],
          [{ stat: 'day', cmp: '>=', value: 5 }],
        ),
        once: 'game',
      },
    ],
  ),
  parent('gamer-dad', 'Gamer Dad', 'F', 'Wake draw +1; Hunger decay +1.', [
    p('wakeDraw', 1),
    p('hungerDecay', 1, undefined, undefined, true),
  ]),
  parent(
    'workaholic-dad',
    'Workaholic Dad',
    'F',
    '+1 cap; Coddle cards cost +1.',
    [p('staminaCap', 1), p('careCost', 1, ['Coddle'], undefined, true)],
  ),
  parent(
    'anxious-dad',
    'Anxious Dad',
    'F',
    'Scry 2 each Wake; start each Day Fussy until Comfort.',
    [
      e('onWake', [{ op: 'scry', n: 2 }]),
      e('onWake', [{ op: 'addStatus', status: 'Fussy' }], undefined, true),
    ],
  ),
  parent(
    'handy-dad',
    'Handy Dad',
    'F',
    'Tool cost -1; Broken/Gadget damage +1.',
    [
      p('careCost', -1, ['Tool']),
      p('hazardDamage', 1, ['Broken', 'Gadget'], undefined, true),
    ],
  ),
  parent(
    'grandma',
    'Grandma',
    'G',
    'Feed heal +2; Night Hunger +1, overflow deals 1.',
    [
      p('heal', 2, ['Feed']),
      e('onNight', [{ op: 'hunger', n: 1 }], undefined, true),
      p('nightHungerOverflow', 1, undefined, undefined, true),
    ],
  ),
  parent(
    'nanny',
    'Nanny',
    'G',
    'Once/Day remove Timer-1 Hazard free; Cute -1.',
    [p('freeTimerRemoval', 1), p('cute', -1, undefined, undefined, true)],
  ),
  parent(
    'big-aunt',
    'Big Aunt',
    'G',
    'Rest cards give 1 Coddle; Noise damage +1.',
    [
      e('onPlay', [{ op: 'coddle', n: 1 }], [{ hasTag: 'Rest' }]),
      p('hazardDamage', 1, ['Noise'], undefined, true),
    ],
  ),
];
