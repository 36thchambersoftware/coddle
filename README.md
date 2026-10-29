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

## Milestones

- M0 complete: workspace scaffold, strict TypeScript, formatting, lint, test, CI.
- M1 complete: deterministic solo engine and interactive terminal play.
- M2: solo browser experience.
- M3: complete content, bots and measured balance.
- M4: local multiplayer.
- M5: parent modes.
- M6: offline and mobile packaging preparation.
- M7: optional online play, not enabled by default.
