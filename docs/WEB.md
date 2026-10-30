# Browser client

Run `npm run dev`, then open the Vite localhost URL. The client uses the same
engine API as the CLI; saves contain serialized `GameState`, not UI state.
Settings and the local Baby Journal use a validated `StoragePort`, currently
backed by `localStorage`. Corrupt or unavailable storage is surfaced in the
interface; a game remains playable for the current page session.

At 390x844, the header and status board lead into the horizontally scrollable
Trouble Zone and hand. Tap a card to preview; tap again to play an untargeted
card. Matching cards highlight Hazards, which may be tapped or receive a dragged
card. Nap Time resolves Night; discard actions are prompted from the hand.
Reduced-motion follows OS preferences and the stored preference. Illustrative
portraits are generated SVG and the same portrait variants have identical rules.
The sound manager uses intentionally silent named cues until original assets are
available. Haptics use the browser vibration API where supported.

Settings, How to Play, and the discovered-card / best-run Baby Journal are
available from the header. The Settings page includes sound, haptics, reduced
motion, text size, contrast palette, and cosmetic portrait. English strings are
centralized in `packages/content/src/strings.ts`.

### Try M2

Start a Normal seven-Day seeded run, choose a Baby, inspect its Parents and
Modifiers, tap Burp Cloth, then tap the highlighted Trapped Gas. Play Feed and
Rest cards, press Nap Time, and continue until a run is complete. Refresh during
a run to verify local save/resume; open the Journal to see the run and discovered
cards.
