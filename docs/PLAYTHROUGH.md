# M1 Solo Standard CLI playthrough

Reproduce the full terminal transcript:

```sh
npm run play:cli -- --auto --seed 42 --days 7 --difficulty normal
```

This is automatic play using the initial Normal heuristic, not evidence of human
game duration or overall balance.

Setup: Triplets, raised by Helicopter Mom, Big Aunt and Gamer Dad; Iron Tummy and
Sensitive Skin. Opening trouble: Trapped Gas / Big Burp, Timer 3.

| Day | Event              | Selected actions / observations                                                                                            |
| --- | ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | None               | Burp Cloth answers Gas; Milk; Lullaby. Clean Sweep earned.                                                                 |
| 2   | Lazy Sunday        | Swaddle answers Fever; Pacifier delays Diaper; Clean answers Vomit; Bundle answers Diaper. Rolled Over earned.             |
| 3   | Daylight Savings   | Gate answers Outlet; Formula; Change answers Diaper.                                                                       |
| 4   | Growth Spurt       | Delay Colic; Swaddle answers Sunburn; Gate, Bottle, Medicine; Bundle. Fighting and Thunderstorm resolve.                   |
| 5   | Grandparents' Gift | Bundle removes Tsunami; Burp Cloth, Nap, Wipes, Peekaboo. Thunderstorm resolves.                                           |
| 6   | Flu Season         | Ring, Medicine, Change, Skin-to-Skin; Bundle removes Lego.                                                                 |
| 7   | Teething Week      | Final-Day instant hazards leave 10 HP at Wake. Bath answers Rash; Bundle answers Outlet; Kiss; Nap. Finish Night at 11 HP. |

```text
Day 7 | Triplets
Health 11/26 | Hunger 0/5 | Coddle 0/6 | Stamina 1 | Shield 0
Trouble Zone: Teething [Each Night], Runny Nose [T1]
You made it! The nursery celebrates.
Days survived: 7 | Score: 92
```

Interactive play: `npm run play:cli -- --seed 42`. Enter a listed action number;
`q` exits. Illegal actions are rejected by the same API used by the browser.
