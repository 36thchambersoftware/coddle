# Coddle

A cute, non-graphic cartoon card game about surviving the nursery.
Browser first; deterministic TypeScript engine shared with future mobile builds.

## Run (macOS and Ubuntu Server)

Install Node.js 22.12+ (or 24/26) and npm 10+, then:

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. For server development, forward port
5173 to your own machine. No backend or database is required.

```sh
npm run lint
npm run validate:content
npm test
npm run build
```

Use `vim docs/DECISIONS.md` to record rule clarifications.
Use `npm run format` to format source and documentation.

## Play solo in the terminal

```sh
npm run play:cli -- --seed 42
npm run play:cli -- --auto --seed 42 --days 7 --difficulty normal
```

Choose the Baby, then select numbered actions. Targeted Care answers matching
Hazards. Nap Time resolves Night; discard choices appear when required.
See the recorded [Standard playthrough](docs/PLAYTHROUGH.md) and
[engine contract](docs/ENGINE.md).

## Workspaces

| Path             | Purpose                               |
| ---------------- | ------------------------------------- |
| packages/engine  | Pure serializable deterministic rules |
| packages/content | Validated card data and effects       |
| packages/bots    | Seeded decision policies              |
| apps/web         | Mobile-first React browser client     |
| tools/sim        | Terminal play and balance simulations |

Rules: [game design](docs/GAME_DESIGN.md). Clarifications:
[decisions](docs/DECISIONS.md). Contributor rules:
[Copilot instructions](.github/copilot-instructions.md).

## Balance simulation

```sh
npm run sim -- --mode solo --days 7 --bot normal --games 10000
npm run sim -- --mode solo --days 7 --bot normal --games 2500 --difficulty all
npm run sim -- --mode solo --days 7 --bot hard --games 1000 --csv /tmp/coddle.csv
```

Simulation is seeded and outputs win rates by Baby/Parent/Difficulty, average
HP by Day, and an optional CSV. Results and known limitations live in
[balance notes](docs/BALANCE.md).

## Milestones

- M0 complete: workspace scaffold, strict TypeScript, formatting, lint, test, CI.
- M1 complete: deterministic solo engine and interactive terminal play.
- M2 complete: mobile-first Solo browser game with settings, save/resume and Baby Journal.
- M3 complete: all starter content, Easy/Normal/Hard bots and simulator; initial balance targets missed, documented in `docs/BALANCE.md`.
- M4: local multiplayer.
- M5: parent modes.
- M6: offline and mobile packaging preparation.
- M7: optional online play, not enabled by default.

Try M3 with `npm run sim -- --mode solo --days 7 --bot normal --games 1000`.
The 10,000-game Normal baseline and recommended follow-up experiments are in
`docs/BALANCE.md`.
