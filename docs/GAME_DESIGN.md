# Coddle: game design

Cartoon survival card game. All portraits are cosmetic; only named archetypes
affect mechanics. No graphic injury, group-based stereotypes, or disability jokes.
At zero Health a baby takes a balloon/cloud "Bye-Bye"; elimination copy is localized.

## 3. Core concept and stats

- Health (HP): zero eliminates; never above Max HP.
- Stamina: refills each Wake to cap (base 3, range 1-6).
- Hunger: range 0-5, starts 3. Lose 1 each Night; at zero take 2 Starving damage.
- Coddle: range 0-6. Lose 1 each Night. After decay, 4+ heals 1 (Secure Attachment).
  Once per turn spend 2 to remove any Hazard (Bundle of Love).
- Cute: range 1-10. At 7+ the first Coddle-tag card each turn gives +1 Coddle
  (Adorable). At 3 or less, Gross hazard damage is reduced by 1 (Built Tough).
  Cute breaks flavor ties for Parents/Modifiers, never portrait-based balance.
- Shield: each absorbs 1 damage, including unblockable damage; clears next Wake.
- Hand: draw 5 at setup, 2 at Wake; discard to 7 at Night.
- One Day is one complete round of living players' turns.

## 4. Setup

1. Draw two Baby cards, keep one, return the other and shuffle. Solo Hard keeps
   the first. Archetype determines stats and parent slots.
2. Draw matching Parents for M/F/Guardian slots; Any draws from the combined pool.
   Optional draft: draw three Parents and keep as many as required slots.
3. Draw and keep two random Modifiers, without guaranteeing a Boon/Quirk mix.
4. Apply Baby, Parents, then Modifiers. Present a combined Meet Your Baby biography.
5. Draw five Care cards.

## 5. Turn structure

1. Wake: clear Shield, refill Stamina, draw 2, trigger onWake. From Day 2, flip one
   shared Day Event before the first player's turn.
2. Hazards Roll In: draw into the Trouble Zone. Timer 0 resolves immediately;
   Timer 1 resolves tonight, Timer 2 tomorrow night.
3. Actions: play affordable Care cards, abilities, or versus passes in any order.
   Resolve effects immediately in listed order, without a stack. Nap Time ends actions.
4. Night: decrement timers and resolve those reaching 0 (damage before status);
   apply Lingering effects; decay Hunger and check Starving; decay Coddle and check
   Secure Attachment; trigger onNight; discard to 7; check elimination.
5. After everyone finishes, advance Day and rotate the first player clockwise.

Care cards targeting a Hazard remove it when tags match answeredBy. Unmatched
cards still perform normal effects. Answer-mode `all` requires every listed tag.
Two Coddle removes any Hazard once per turn. Resolved/answered cards discard;
empty decks reshuffle with Day-based Rising Chaos maintained.

Statuses are unique: Stinky reduces Care healing by 1 (minimum zero), cured by
Clean; Fussy reduces Comfort Coddle gains by 1 until Night ends; Feverish deals
1 each Night, cured by Medicine or Rest; Sleepless reduces next Wake's cap by 1.

## 6. Card types

Baby (archetype and parent slots); Parent (Mother/Father/Guardian passive perk and
drawback); Modifier (persistent Boon/Quirk); Care (hand card); Hazard (Trouble
Zone); Day Event (table-wide). All cards have id, name, type, tags, rarity,
effects, flavor, artKey. Care costs are 0-2. Art uses swappable emoji/SVG keys.

## 7. Starter content

Numbers below are design baselines, not permission to silently rebalance.

### Babies

| Baby                  | HP start/max | Cap | Cute | Parents  | Trait                                                  |
| --------------------- | ------------ | --- | ---- | -------- | ------------------------------------------------------ |
| Sole Survivor         | 14/14        | 3   | 5    | M+F      | First Care per Day free                                |
| Twins: Double Trouble | 20/20        | 4   | 6    | M+F      | +1 Hazard Day 2+; healing Care gives 1 Coddle          |
| Triplets (rare)       | 26/26        | 5   | 6    | Any x3   | +2 Hazards Day 2+; hazard damage -1                    |
| Preemie               | 8/12         | 3   | 7    | M+F      | Start Coddle 3; Care healing +1                        |
| Chunky Monkey         | 18/18        | 3   | 6    | M+F      | Hunger decays 2; Feed Hunger +1                        |
| Ugly Duckling         | 15/16        | 3   | 2    | M+F      | Start Shield 3; Coddle cards gain -1 Coddle, min 1     |
| Cutie Pie             | 10/12        | 3   | 9    | M+F      | Adorable grants +2 instead of +1                       |
| Night Owl             | 12/12        | 4   | 5    | M+F      | Sleepless Day 1; Rest Stamina +1                       |
| Colicky Kid           | 13/13        | 3   | 8    | M+F      | +1 Hazard odd Days; answered Colic grants 2 Coddle     |
| Lone Wolf             | 16/16        | 3   | 4    | Any x1   | Parent perk doubled, drawback ignored                  |
| Oops Baby             | 12/12        | 3   | 5    | Any x0-3 | Slot count weights 1/2/3/2                             |
| Foster Baby           | 12/14        | 3   | 5    | G x2     | Guardian drawbacks ignored                             |
| Miracle Baby (rare)   | 11/11        | 3   | 8    | M+F      | Once, elimination instead sets HP 4 and gives 4 Coddle |

### Parents: perk / drawback

Mothers: Overbearing Mother (+4 Max HP / -1 cap); Tired New Mom (start +2 Coddle /
Sleepless every third Day); Helicopter Mom (first Hazard timer +1 / card Coddle
-1, min 1); Crunchy Mom (Feed heal +1, Hunger +1 / Flu Season twice); Party Mom
(+2 Stamina Day 1 / +1 Hazard Day 1); Doting Mom (+1 Coddle Wake / Fussy at Hunger <=1).

Fathers: Stable Father (+2 Max HP, first Hazard timer +1 / no drawback);
Deadbeat Dad (-3 Max and Start HP, lose 1 Coddle Night / Day 5 heal 4 once and
permanently become Stable Father); Gamer Dad (+1 draw Wake / extra Hunger decay);
Workaholic Dad (+1 cap / Coddle cost +1); Anxious Dad (scry 2 Wake / Fussy each
Day until Comfort); Handy Dad (Tool cost -1 / Broken or Gadget damage +1).

Guardians: Grandma (Feed healing +2 / Night Hunger +1, 1 damage on overflow);
Nanny (free Timer-1 removal once/Day / Cute -1); Big Aunt (Rest Coddle +1 /
Noise damage +1).

### Modifiers

Boons: Ten Fingers & Ten Toes (+2 Max/Start HP); Strong Lungs (once/Day,
1 Stamina delays one Hazard); Iron Tummy (Gross damage -1); Chubby Cheeks
(Cute +2); Fast Learner (Wake draw +1); Heavy Sleeper (Rest Stamina +1);
Lucky Star (once/Day swap a newly drawn Hazard); Giggler (Wake Coddle +1 if
Cute >=5); Strong Immunity (cure one status each Night).

Quirks: Cowlick (Cute -1); Allergic to Everything (Feed healing -1);
Sensitive Skin (Diaper damage +1); Colic Prone (+1 Hazard Day 2); Weak Lungs
(disable Cry abilities, start Fussy); Teething Early (Teething Day 1);
Fussy Eater (start Hunger 2); Light Sleeper (Rest Stamina -1, min 0);
Drooler (Cute +1, start Stinky).

### Care: copies, cost, effects

| Card             | Copies | Cost | Effects                                   |
| ---------------- | ------ | ---- | ----------------------------------------- |
| Milk             | 5      | 1    | Hunger +2, heal 1                         |
| Formula Bottle   | 3      | 1    | Hunger +2, heal 1, remove Fussy           |
| Mashed Peas      | 2      | 2    | Hunger +3, heal 2; Day 3+                 |
| Warm Bottle      | 2      | 0    | Hunger +1                                 |
| Cuddle           | 5      | 1    | Coddle +2                                 |
| Lullaby          | 3      | 1    | Coddle +1, Comfort, co-op Aura +1 to all  |
| Peekaboo         | 3      | 0    | Coddle +1; Cute >=7 draws 1               |
| Skin-to-Skin     | 2      | 2    | Coddle +4, heal 2                         |
| Kiss the Boo-Boo | 3      | 1    | Heal 2, Comfort                           |
| Diaper Change    | 5      | 1    | Clean, remove Stinky                      |
| Bath Time        | 2      | 2    | Clean, heal 1, Coddle +1                  |
| Wet Wipes        | 3      | 0    | Remove Stinky                             |
| Nap              | 4      | 1    | Next Day Stamina +1, heal 1, Rest         |
| Swaddle          | 3      | 1    | Shield 3                                  |
| White Noise      | 2      | 1    | Noise, Shield 1                           |
| Pacifier         | 3      | 0    | Chosen Hazard timer +1, adds Noisy        |
| Teething Ring    | 3      | 1    | Teething                                  |
| Baby Monitor     | 2      | 0    | Scry 3                                    |
| Stroller Walk    | 2      | 2    | All own timers +1                         |
| Burp Cloth       | 3      | 1    | Burp                                      |
| Baby Gate        | 2      | 1    | Watch                                     |
| Medicine Dropper | 2      | 1    | Medicine, cure Feverish                   |
| Steal the Binky  | 2      | 1    | Versus only: steal random rival hand card |
| Mimic Cry        | 1      | 2    | Versus only: rival Fussy                  |

Shared Care deck in multiplayer, personal in solo; reshuffle discard when empty.
Each Care reshuffle adds 2 to the next Hazard Roll (Rising Chaos).

### Hazards

| Hazard                  | Timer  | Damage / other                        | Tags            | Answer               |
| ----------------------- | ------ | ------------------------------------- | --------------- | -------------------- |
| Dirty Diaper            | 1      | 3                                     | Gross, Passable | Clean                |
| Explosive Diarrhea      | 0      | 4, Stinky                             | Gross, Passable | Instant              |
| Projectile Vomit        | 1      | 2, Hunger -1                          | Gross, Passable | Clean                |
| Trapped Gas / Big Burp  | 2      | 3                                     | Gross, Passable | Burp                 |
| Diaper Rash             | Linger | 1 per Night                           | Diaper          | Clean                |
| Colic Scream            | 2      | 4, Fussy                              | Noise, Colic    | Comfort              |
| Teething                | Linger | 1 per Night, Fussy                    | Teething        | Teething             |
| Ear Infection           | 2      | 3, Feverish                           | Illness         | Medicine             |
| Fever                   | 2      | 4, Feverish                           | Illness         | Rest or Medicine     |
| Runny Nose              | 2      | 1, Sleepless                          | Illness         | Clean                |
| Rolled Off Couch        | 0      | 3                                     | Instant         | Instant              |
| Crawling to the Outlet  | 1      | 5                                     | Accident        | Watch                |
| Lego Choking Hazard     | 1      | 5                                     | Accident        | Watch                |
| Pet Chaos (Cat on Face) | 1      | 3                                     | Accident        | Watch                |
| Sticky Sibling Hands    | 1      | 2, Stinky                             | Gross           | Clean                |
| Night Terrors           | 1      | 2, Sleepless                          | Noise           | Comfort or Rest      |
| Thunderstorm            | 1      | 2, Fussy                              | Noise           | Noise or Comfort     |
| Sunburn                 | 2      | 3                                     | Weather         | Rest                 |
| Parents Fighting        | 1      | Disable Parent perks until Night ends | Noise           | Comfort              |
| Dropped Pacifier        | 0      | Random Care discard 1                 | Instant         | Instant              |
| Skipped Nap             | 0      | Stamina -1 this Day                   | Instant         | Instant              |
| Hungry Cry              | 1      | Hunger -2, damage 1                   | Noise           | Feed                 |
| Teething Tsunami        | 2      | 6; rare, Day 5+                       | Teething        | Teething AND Comfort |
| Surprise Visitor        | 0      | Coddle +2, draw another Hazard        | Mixed           | Instant              |

Hazard deck approximately 50; later Days weight stronger rarities.

## 8. Days, events, difficulty

Hazards: Day 1 = 1; Days 2-5 = 2 (Days 4-5 add 1 for Chaos); Day 6+ = 3.
Add archetype, difficulty, and mode modifiers.

One shared event each Day from Day 2: Growth Spurt (Hunger -2); Teething Week
(everyone Teething); Daylight Savings (everyone Sleepless); Flu Season (everyone
Fever); Lazy Sunday (-1 Hazard, min 0); Full Moon (timers -1, min 0);
Power Outage (no Aura/Monitor); In-Laws Visit (double Parent perks and drawbacks);
Grandparents' Gift (draw 2 Care).

Final Night of survival: +1 Hazard and hazard damage +1.
Easy: -1 Hazard Days 1-3, +2 Start HP, first Hazard timer +1.
Normal: unchanged. Hard: +1 Hazard Day 3+, start Hunger 2.
Terrible Twos: Hard plus damage +1 Day 5+, unlocks Endless.
Endless: hazards +1 every three Days; local score leaderboard.

## 9. Game modes

Presets: winCondition lastStanding or surviveDays(N); interaction none/versus/coop;
perspective baby/parent; players 1-4.

Baby modes: Solo Survival (5/7/10 Days or Endless); Last Baby Standing (2-4);
Survival Race (2-4, multiple winners at Day N, ranked by HP and Milestones);
Co-op Nursery (2-4).

Versus: once per turn pay 1 Stamina to pass a Passable Hazard to a rival. Timer
is retained and the Hazard becomes Hot, preventing further passes. Include
Sibling cards. After Day 12 everyone draws +1 Hazard. If all go out the same
Night, highest HP at the start of that Night wins.

Local multiplayer supports pass-and-play with a privacy screen before each human
turn, or bots in the remaining seats. Each seat chooses a distinct Baby and has
its own board and hand; Care, Hazard, and Day Event decks are shared. Survival
Race ranks survivors by remaining HP, Milestones, then seating order.

Co-op: Share costs 1 Stamina once/turn, giving a Care card to another baby.
Lullaby Aura benefits all. All survivors = Gold; at least half = Silver;
at least one = Bronze; none = Loss. Eliminated babies become Ghost Helpers,
giving one living baby 1 Shield once each Day.

Parent perspective: Parent is the character; Sanity (HP) max 12, zero is immediate
Burnout; Patience cap 3-5; Coddle Bank 0-6. Baby has its own HP, Hunger, Cute,
Quirks and Trouble Zone with normal Needs draws. Care affects the Baby;
the first Coddle card per turn also restores 1 Sanity. Each Night lose 1 Sanity
if any Need resolved unanswered, plus 1 if Baby ends Fussy.
Deep Breath: 1 Stamina, heal 2 Sanity, once/Day.
Phone a Friend: spend 2 Sanity, draw 2 Care.

Solo Parent: one parent, one baby. Co-Parent: two parents, one shared baby;
Hand-off once/Day restores 2 Sanity and partner acts first next turn.
Daycare: one parent, 2-3 babies, hazards per baby; all surviving wins, at least
half is partial win. Baby loss costs 3 Sanity; only all babies lost ends Daycare.
Other parent modes lose on any baby loss or Parent Burnout.

Score: 10 per Day survived + remaining HP + 5 per Milestone + difficulty multiplier.
Each milestone once: First Smile (Night Coddle >=4); Fed and Changed (Night
Hunger >=4 without Stinky); Rolled Over (answer 3 Hazards in one turn);
Iron Baby (win at HP <=3); Clean Sweep (Night Trouble Zone empty).
