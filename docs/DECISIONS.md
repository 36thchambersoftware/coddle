# Rules decisions

## Project baseline

- Milestones are delivered sequentially. Optional online M7 is not part of the
  offline-first baseline.
- Content numbers retain the supplied design baseline until simulator evidence
  supports an explicit balance proposal.
- The listed Care copy counts, not the approximate "about 60", define deck size.
- Stats that specify Start HP change current HP; Max HP-only perks do not also
  heal. Easy's +2 Start HP remains capped by the resulting Max HP.
- Solo setup is an explicit choice between two seeded Baby draws. Hard and
  Terrible Twos keep the first. Parents and Modifiers then draw without replacement.
- Mandatory discard is a separate choice before Night finishes. Timer hazards
  resolve in arrival order, followed by lingering hazards in arrival order.
- A Night checks baby elimination after all Night effects, as specified. Instant
  daytime hazards check elimination immediately after completing the roll.
- A status added at Night can affect that Night: Feverish ticks in the lingering
  step, Sleepless is consumed at the next Wake, Fussy clears after onNight.
- An AND answer accumulates matching tags across multiple targeted Care cards.
  Until all required tags are supplied, the Hazard remains in play.
- Where damage is described as unblockable it skips answering, not Shield.
- In survival, final-Day bonus applies once to that Day's draw count and each
  hazard's damage, including lingering damage.
- Endless does not promise termination; finite survival and last-standing games
  are the termination-property subjects.

## M1 implementation clarifications

- Opening Wake draws its usual 2 after the opening 5, but preserves Shield
  explicitly awarded by setup. Later Wakes clear Shield.
- Coddle/soothing Care cards use Comfort where their function is comforting;
  category Clean/Rest tags count for answering even on cards without explicit
  "answers" copy (for example Wet Wipes and Swaddle).
- Scry reveals eligible upcoming hazards but does not reorder them.
- Hazard deck uses two of every listed Hazard (48 cards). Named event/trait
  hazards draw a physical copy if available, otherwise create an extra instance.
- Rising Chaos adds +1 hazard damage every three completed Days, and +1 per
  Hazard-deck reshuffle. Care-deck reshuffles still queue the specified +2 draws.
  These unspecified escalation numbers are explicit baselines, not balance claims.
- Rare Teething Tsunami cannot draw before Day 5. Care's Day restriction limits
  playing, not drawing (Mashed Peas can appear in the opening hand).
- Events flip after onWake as written. Sleepless added by onWake/events applies
  to the next refill, including Tired New Mom's every-third-Day status.
- Full Moon changes existing pending timers and new arrivals once each; a pending
  timer reduced to zero resolves immediately. Lingering timers can be delayed.
- Parent stat passives recalculate live. In-Laws doubles current stat modifiers;
  temporary cap changes adjust that Day's available Stamina by the cap delta.
  Suppressed Max HP perks can clamp HP; restoring a maximum never heals.
- Parent start-HP penalties bypass Shield. Max-HP-only perks never grant Start HP.
- Lone Wolf and In-Laws are independent doublings (x4 together).
- Light Sleeper reduces Rest's energy gains, including Nap's next-Day gain,
  to a minimum zero. Positive Rest bonuses grant energy immediately.
- Lucky Star can swap only the newest still-pending Hazard before another Care
  card is played. Timer-zero Hazards resolve before the action phase.
- Strong Immunity cures the oldest acquired status. Night discards are chosen.
- The additive difficulty score bonus is Easy 0 / Normal 1 / Hard 2 / Terrible 3;
  the specification says "+ difficulty multiplier" without giving values.
- "Chaos" is not one of the specified nine Day Events, so no additional Chaos
  event is invented. Optional Parent draft is deferred with multiplayer setup.
