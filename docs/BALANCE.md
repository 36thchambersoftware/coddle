# Balance evidence

## M3 reference batch

Run the reference Standard Normal Normal-bot batch with:

```sh
npm run sim -- --mode solo --days 7 --bot normal --games 10000 --seed 42
```

The simulator seeds each game from the run index and supplied seed, records
final HP/score/Days, breakdowns by selected Baby and each Parent appearance,
and HP after each Night. CSV output is reproducible with `--csv`.
Seed 42; 10,000 games; 7 Days; Normal difficulty; Normal heuristic. Reproduced
from `/tmp/coddle-standard-normal-10000.csv`. This is a deterministic agent
baseline, not a human win-rate estimate.

| Measure                             |                                      Observed |
| ----------------------------------- | --------------------------------------------: |
| Win rate                            |                         47.9% (target 55-70%) |
| Mean final HP                       |                                           3.8 |
| Mean survival                       |                                      6.2 Days |
| Average HP after Night, Days 1-7    | 16.28, 15.39, 14.05, 12.89, 10.64, 6.97, 5.48 |
| Deaths in run                       |                                         5,208 |
| Most common individual hazard cause |     Explosive Diarrhea: 627 (12.0% of deaths) |
| Starvation as last damage source    |                       2,015 (38.7% of deaths) |

No single Hazard caused more than 15% of recorded deaths. Starvation represents
aggregate Hunger decay, not one Hazard. Counts by Baby:

| Baby          | Games | Win rate |
| ------------- | ----: | -------: |
| Chunky Monkey | 1,313 |    50.0% |
| Colicky Kid   |   630 |    29.5% |
| Cutie Pie     |   124 |    67.7% |
| Foster Baby   |   443 |    72.5% |
| Lone Wolf     | 1,169 |    58.6% |
| Miracle Baby  |   254 |    85.0% |
| Night Owl     |   807 |    35.7% |
| Oops Baby     |   469 |    35.6% |
| Sole Survivor |   824 |    45.1% |
| Triplets      | 1,544 |    45.9% |
| Twins         | 1,434 |    47.6% |
| Ugly Duckling |   989 |    43.1% |

Parent appearance rates: Nanny 78.2% (737 appearances), Overbearing Mother
34.0% (1,440), Party Mom 36.1% (1,576), Deadbeat Dad 0.0% (116), and other
Parents 36.2%-60.9%. Parent combinations were not normalized independently;
the listed data does not establish any combination's target rate.

**Targets missed:** overall Normal bot is 7.1 points below target; Colicky Kid
is below 35%; Miracle Baby and Nanny exceed 75%; Overbearing Mother is just
below 35%. Deadbeat's severe result has a smaller appearance count and needs a
specific setup/survival trace before any rule change.

**Proposed next experiment (not applied):** improve Normal bot's Feed-reserve /
Hunger-decay lookahead and run the same 10,000 seeds before changing card data.
If Miracle/Nanny remain above 75% or Colicky/Overbearing remain below 35%, test
one narrowly scoped data change at a time and publish before/after runs. No
starter-card or engine-rule numbers were changed based on this batch.

The Hard bot performs a 30-sample deterministic hazard-draw lookahead using the
public hazard card distribution and visible game state. Normal is a local
heuristic (hazard priority, healing/feed/Coddle value per Stamina) and is
designed to remain under 50 ms; Easy makes cheap-card-biased choices and ends
with unused Stamina on seeded 30% of choices.

## Known simulator caveats

- The initial batch creates the Baby/Parent/Modifier setup from the game's seeded
  setup lottery; groups are not forced to have equal samples.
- Parent rates are per appearance, and combinations are not independent.
- Hard's rollouts estimate the next Night and use the full public Hazard pool;
  they do not model future Day Events, Care draws or a two-step action policy.
- Endless, multiplayer, parent perspectives and network play are not simulated.
- Balance target ranges are provisional until the exact requested 10,000-game
  reference batch and archetype sample counts are recorded below.
