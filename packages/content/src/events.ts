import { card, effect as e, passive as p } from './helpers';
import type { Card, Effect } from './schema';
const event = (
  id: string,
  name: string,
  description: string,
  effects: Effect[],
) => card(id, name, 'event', [], description, effects);
export const dayEvents: Card[] = [
  event('growth-spurt', 'Growth Spurt', 'Everyone: Hunger -2.', [
    e('onArrive', [{ op: 'hunger', n: -2 }]),
  ]),
  event('teething-week', 'Teething Week', 'Everyone receives Teething.', [
    e('onArrive', [{ op: 'addHazard', n: 1, filter: { id: 'teething' } }]),
  ]),
  event(
    'daylight-savings',
    'Daylight Savings',
    'Everyone receives Sleepless.',
    [e('onArrive', [{ op: 'addStatus', status: 'Sleepless' }])],
  ),
  event('flu-season', 'Flu Season', 'Everyone receives Fever.', [
    e('onArrive', [{ op: 'addHazard', n: 1, filter: { id: 'fever' } }]),
  ]),
  event(
    'lazy-sunday',
    'Lazy Sunday',
    'One fewer Hazard this Day (minimum zero).',
    [p('hazardCount', -1)],
  ),
  event('full-moon', 'Full Moon', 'All Hazard timers -1 (minimum zero).', [
    p('timerMod', -1),
  ]),
  event('power-outage', 'Power Outage', 'No Aura or Monitor effects today.', [
    p('disableAura', 1),
  ]),
  event(
    'in-laws',
    'In-Laws Visit',
    'Double Parent perks and drawbacks today.',
    [p('parentMultiplier', 1)],
  ),
  event('gift', "Grandparents' Gift", 'Everyone draws 2 Care.', [
    e('onArrive', [{ op: 'draw', n: 2 }]),
  ]),
];
