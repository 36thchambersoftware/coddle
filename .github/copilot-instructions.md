# Coddle contributor instructions

## Architecture

- TypeScript, strict, no `any`. npm workspaces.
- `packages/engine`: pure deterministic rules; no DOM, timers, or Math.random.
- `packages/content`: Zod-validated data-driven cards and effect DSL.
- `packages/bots`: pure AI using public information and its own hand only.
- `apps/web`: mobile-first Vite/React, Zustand, Framer Motion.
- `tools/sim`: seeded CLI simulations and CSV reporting.
- Engine API: createGame(config, seed), getLegalActions(state, playerId),
  applyAction(state, action) -> { state, events }.
- State must round-trip JSON. RNG state lives inside GameState.
- UI renders engine state and structured events; never duplicates game rules.
- Storage interface wraps localStorage, replaceable by Capacitor later.
- No backend before optional M7. No native builds yet.

## Rules glossary

- Day: round of all living turns. Rotate starting seat each Day.
- Wake: clear Shield, refill Stamina, draw 2, onWake, shared event Day 2+.
- Trouble Zone: pending Hazards with visible countdown timers.
- Timer 0: immediate. Timer 1: tonight. Linger: each Night until answered.
- Night: timers, lingering, Hunger decay/Starving, Coddle decay/heal,
  onNight, discard to 7, elimination.
- Health: 0-Max HP. Stamina cap: 1-6. Hunger: 0-5. Coddle: 0-6. Cute: 1-10.
- Starving: Hunger 0 after decay deals 2. Secure Attachment: Coddle >=4
  after decay heals 1. Shield absorbs all damage types, then clears at Wake.
- Adorable: Cute >=7, first Coddle-tag card gives +1 per turn.
- Built Tough: Cute <=3, Gross hazard damage -1.
- Bundle of Love: spend 2 Coddle, remove any Hazard, once per turn.
- Answering: Care tags must match targeted hazard answeredBy; `all` needs all tags.
- Stinky: Care healing -1, cured by Clean. Fussy: Comfort Coddle -1 until Night ends.
- Feverish: Night damage 1, cured by Medicine/Rest.
- Sleepless: next Wake cap -1, then consumed.
- Rising Chaos: Care reshuffle adds 2 Hazards to next roll.
- Pass the Parcel: versus, 1 Stamina, once/turn, Passable becomes Hot.
- Share: co-op, 1 Stamina, once/turn. Ghost Helper: 1 Shield/day.
- Parent: Sanity max 12, Patience is Stamina; baby board is separate.
- Full source of truth: docs/GAME_DESIGN.md; clarifications: docs/DECISIONS.md.

## Coding and content

- Small pure functions; engine source files under 300 lines.
- Never hard-code card names in engine. Use ids, tags, generic operations.
- Effects resolve in listed order; passive order Baby, Parents, Modifiers, Statuses.
- Damage: base, modifiers (floor zero), Shield, HP (floor zero).
- Healing: base, modifiers (floor zero), Max HP cap.
- Emit structured events for every state change.
- All user-facing copy belongs in strings tables (English first) or card data.
- Portrait skin tone, hair, gender are cosmetic; never change balance.
- Cute cartoon dark comedy only, no graphic content or disability jokes.
- Elimination copy is centralized, default "Bye-Bye" balloon/cloud.
- Effect DSL preferred; each custom-handler escape needs its own unit test.
- Document every state field and op in docs/ENGINE.md.
- Vitest: test every public engine API, generate tests for cards, property-test
  bounds and termination. Validate content using npm run validate:content.
- Run lint, tests, validation and build before milestone commits.
- Commit each milestone; include docs and a short thing-to-try summary.
- Never silently rebalance: report simulation evidence in docs/BALANCE.md.
- Pick simplest ambiguous rule, record decision, continue unless blocked.
- README/docs terminal file-edit instructions use vim (macOS and Ubuntu).
