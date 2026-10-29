# Engine contract (save format version 1)

`createGame(config, seed)` validates a uint32 seed and config and returns the
Baby-choice phase. `getLegalActions(state, playerId)` lists complete legal action
objects; inactive/unknown players and finished games have no actions.
`applyAction(state, action)` rejects illegal actions, clones input, and returns
`{ state, events }`. Save with JSON; replay the same seed/config/actions.
No clock, DOM, IO, or global randomness is used by the engine.

## State fields

| Field                    | Meaning                                                                 |
| ------------------------ | ----------------------------------------------------------------------- |
| version                  | Save schema version; currently 1                                        |
| config                   | Validated independent copy of mode/difficulty/survival duration         |
| seed / rng               | Initial seed and current mulberry32 uint32 accumulator                  |
| nextId                   | Monotonic instance identifier counter                                   |
| day                      | Current Day, starting 1                                                 |
| phase                    | chooseBaby, action, discard, finished                                   |
| players / activePlayerId | Player boards and seat allowed to act                                   |
| babyChoices              | Seeded setup options; empty after choice                                |
| decks                    | Care/Hazard/Event draw and discard card-id arrays; draw index 0 is next |
| dayEvent                 | Current event card id, or null                                          |
| pendingChaos             | Extra hazards consumed by next roll after Care reshuffles               |
| hazardReshuffles         | Persistent damage escalation from hazard reshuffles                     |
| forecast                 | Scry-visible upcoming hazard ids                                        |
| newestHazard             | Latest pending hazard eligible for Lucky Star, or null                  |
| result                   | Outcome, completed Days and score; null until finished                  |

Player fields: `id`, `babyId`, `parents`, `modifiers` identify the board.
`baseStats` stores intrinsic Max HP, Stamina cap and Cute before live Parent
passives, preventing temporary event modifiers accumulating across Days.
`hp`, `maxHp`, `stamina`, `staminaCap`, `hunger`, `coddle`, `cute`, `shield` are
bounded statistics. `statuses` has unique enum members. `hand` contains
`{uid,cardId}` instances. `trouble` adds `timer`, `answeredTags` (AND progress),
`extraTags`, `hot`, `drawDay`. `nextStamina` is next-Wake bonus energy.
`used` and `gameUsed` record per-turn/per-game abilities and once effects.
`carePlayed`, `coddlePlayed`, `answered` track turn bonuses/milestones.
`milestones` is unique earned ids. `alive` records elimination.
`lastDamageSource` attributes the latest HP damage for simulator death reports.

## Effect DSL

All definitions are Zod-validated TS const data. Triggers: onPlay, onSetup,
onWake, onNight, onArrive, onResolve, onAnswer, onDamage, onElimination, passive.
Conditions compare a stat, test a tag/status/parent, first play, or Day modulo.
Effects can be marked `drawback` for Parent suppression or `once: game|turn`.

| Operation                       | Behavior                                                             |
| ------------------------------- | -------------------------------------------------------------------- |
| heal                            | Add HP after Care healing modifiers, Stinky, and Max HP cap          |
| damage                          | Hazard modifiers, rising difficulty, Built Tough, then Shield and HP |
| shield                          | Add temporary damage absorption                                      |
| stamina                         | Add current energy, floor zero                                       |
| staminaCapMod                   | Modify future refill cap, clamp 1-6                                  |
| nextStamina                     | Add next-Wake bonus energy                                           |
| startHpMod                      | Setup-only HP change that bypasses Shield                            |
| hunger                          | Modify Hunger, apply Feed modifiers on positive Care gains           |
| coddle                          | Modify Coddle, apply card gains and Fussy modifiers                  |
| maxHpMod                        | Change maximum; clamp current HP without healing                     |
| cuteMod                         | Change Cute, clamp 1-10                                              |
| draw                            | Draw Care, reshuffle discard when needed                             |
| discard                         | Discard count, optionally seeded random                              |
| addStatus                       | Add a unique status                                                  |
| removeStatus                    | Remove named status, or `first` in acquisition order                 |
| removeHazard                    | Answer targeted/filtered hazards                                     |
| delayHazard                     | Change chosen/all hazard timers, optionally add a tag                |
| addHazard                       | Draw hazards, optionally from a specific id/tag filter               |
| scry                            | Reveal next eligible hazard ids without reordering                   |
| rule                            | Declarative calculation modifier; see rule enum in content schema    |
| replaceParent                   | Replace effect source Parent and apply replacement setup perk        |
| revive                          | Set HP and add Coddle on elimination                                 |
| randomParentSlots               | Weighted seeded setup lottery for parent count                       |
| auraCoddle                      | Reserved co-op operation; no recipients in solo                      |
| steal / passHazard / swapHazard | Require interaction/action context; rejected in solo effects         |

Rule values aggregate Baby, Parents, Modifiers, Event, then statuses. Rule
optional tags match any source tag. Parent perks/drawbacks are doubled by
In-Laws; Lone Wolf doubles perks independently and ignores drawbacks.
There are no per-card custom handlers.

## Events

Semantic events include stats (before/after), statuses, draws, hazard arrival,
resolution/answer, card play, Day, Day Event, reshuffle, scry, milestone,
elimination, revival and result. `change` events supply complete top-level
JSON before/after patches (player/deck arrays atomically), covering bookkeeping
as well as visible state. UI animations consume semantic events, not patches.

## Current supported scope

Solo Baby Survival (Easy/Normal/Hard/Terrible, finite 1-365 Days or Endless).
Unsupported multiplayer/parent configs explicitly fail, rather than pretending
to implement another mode. Sibling cards are validated but excluded from solo.
