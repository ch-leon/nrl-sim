# BAK-208 — Match design: contests, traits, tactics, kicks, readability
**GitHub:** https://github.com/ch-leon/nrl-sim/issues/94 (Phase 1.5 under #83) | **Priority:** Highest | **Status:** LIVING — A, B, C, D, F, F2 and the first slice of E shipped (2026-10-17); numbers in each section are the shipped ones. Every knob with its file and value: `BAK-208-tuning.md`.

> **Purpose.** The live sim (BAK-207) now plays a real set: tackles, play-the-ball,
> passes, kicks. It works and it is still a bit boring. This document is the single
> source of truth for *why a match is exciting to watch*: how every contest is decided,
> what traits are and how they fire, how tactics change behaviour by field zone, what
> kicks exist, and how all of it is **shown** to the player. One mechanic per PR, each
> adding its section's numbers and tests here. Nothing here is final until it has been
> watched in the lab and signed off.

## 0. Principles

1. **Show, don't imply.** Every notable outcome is announced on screen (pop-up, name,
   sound, a beat of slow-motion for the big ones). A break nobody notices did not happen.
2. **Earned, not random.** Outcomes come from the *situation* and the *players*, then a
   roll. Two defenders square on should feel different from one tired one arriving late.
3. **Identity.** Stats make players good; **traits** make them memorable. Most players
   have none; a superstar has several. Teams have a style you can see.
4. **Deterministic.** One seeded roll per decision; a Flag code replays everything.
5. **Nines.** Nine a side, five-tackle sets, fast ball movement. Space is the point.

## 1. The contest recipe

Every contest (tackle, step, pass, offload, kick, catch, strip) resolves the same way:

```
baseline(situation) → ± attributes → ± traits (announced when they fire) → one roll
```

- **Situation** is the geometry and context the sim already knows: how many defenders
  are committed, closing angle (square / from the side / from behind), speed difference,
  field zone, tackle number, fatigue, weather.
- **Attributes** are the five base stats every player has (§2).
- **Traits** add their bonus only in their situation (§3) and always show their name.
- **Roll** is `rng.next()` against the final probabilities. Same seed, same match.

A worked example (tackle, §4.1): one-on-one, carrier running square at a defender of
equal stats → baseline 10% step, 12% bust, 7% fend, 12% offload (if a support is within 7 m; Phase 3, was 9% within 5 m),
10% big hit, rest held. Carrier has *Dancing Feet II* → step becomes 10% + 24% = 34%. Roll
0.22 → **STEP!** with *DANCING FEET II* under it — the defender grasps air, the carrier is
through, the crowd lifts.

## 2. Base stats (every player)

| Stat | What it drives |
|---|---|
| **Speed** | Top (sprint) speed, acceleration, chase, the burst after a break |
| **Strength** | Winning contact both ways: busting, driving back, holding |
| **Skill** | Execution: passing, catching, offloading, kicking accuracy, footwork |
| **Footy IQ** | Decisions: when to pass or kick, running the right line, defensive positioning and intercept angles, cover defence |
| **Stamina** | How fast fatigue sets in (§8); tired players lose speed and contest odds. With F2, also how long a player can sprint and how fast he gets his gas back (§8.2) |

Derived (not stored): **Footwork** = (Speed + Skill) / 2 for steps; **Defence** =
(Strength + Footy IQ) / 2 for tackles; **Boot** = (Skill + Footy IQ) / 2 for kicks.

## 3. Traits (special skills) — rare, levelled — *implemented in C (#97)*

A trait is a special skill with a level **I, II or III**. Traits are rare: of generated
*average* players 55% have none, 30% one, 12% two, 3% three or four; rookies fewer
(70 / 25 / 5), stars more (30 / 35 / 23 / 12 — the superstars). Which trait is rolled is
weighted ×3 to the position (a prop is a Wrecking Ball, a winger has Dancing Feet).
Generation gives level I (75%) or II; **III is only ever trained** (facilities and
coaches, later ticket). Rival clubs roll theirs the same way from the club seed.

Level scales the trait's upside: **I ×1.0 · II ×1.6 · III ×2.2** of the base bonus.
Names are footy slang (decision 2026-10-17). Every firing is announced: the pop-up word
gets the trait under it in its own colour (*STEP!* / *KAVANAGH* / *DANCING FEET II*),
the commentary line names it, and the lab stats strip counts them (`Skill n`).

### 3.1 Attacking traits
| Trait | Fires when | Effect (level I) | Shown as |
|---|---|---|---|
| **Dancing Feet** | One-on-one, before contact | +15% step | STEP! |
| **Wrecking Ball** | In contact | +12% bust; held → 30% to keep driving: +30% fight in the wrestle (§8.1) | BUST! / DRIVE! |
| **Don't Argue** | Tackler not arriving from behind | +12% fend | FEND! |
| **Offload King** | Held with a support runner inside 7 m | +12% offload | OFFLOAD! |
| **Finisher** | Inside the opposition 20 m | +10% bust, +5% fend, +10% step | BUST! / STEP! |
| **Jets** | After a break; on the kick chase | A bigger gas tank: ×1.4 at I (§8.2); +8% speed chasing a kick | longer sprint |
| **Playmaker** | Engaged with the ball | +10% to pass rather than carry; reach 12 + 3 m/level → the cut-out ball | CUT-OUT! |
| **Big Boot** | Last-tackle kick | +10% distance, scatter ×0.85 (40/20s arrive with E) | KICK! |

### 3.2 Defensive traits
| Trait | Fires when | Effect (level I) | Shown as |
|---|---|---|---|
| **Hitman** | Square tackle | +12% big hit | BIG HIT! |
| **Last Line** | Lone tackler; the line is broken | Carrier −10% bust / −10% fend; +10% speed covering a break | — |
| **Pickpocket** | One-on-one tackle | +8% strip | STRIP! |
| **Brick Wall** | Two or three in the tackle | Carrier −10% bust, −10% offload | — |
| **Poacher** | In the lane of a pass | +10% intercept | INTERCEPT! |

### 3.3 Double-edged traits (decision: no straight negatives on generated players)
The upside scales with level; the cost is fixed, so training one is always a net gain.

| Trait | Upside (level I) | Cost |
|---|---|---|
| **Hothead** | +12% big hit from any angle | flies out of the line: busted +8%, stepped +8% |
| **Razzle Dazzle** | +20% offload | his offloads are spilled 10% more often ("wild offload") |
| **Gambler** | +15% intercept | a missed read leaves him beaten and out of the play (GAMBLED!) |

### 3.4 Meta traits (existing, kept)
Workhorse (training ×1.2 at I, ×1.32 II, ×1.44 III; legs drain ×0.9 at I, ×0.84 II, ×0.78 III — §8), Young Gun
(training ×1.3; age ≤ 20 and rated 60+), Veteran (age 31+), Club Legend (tenure),
Injury Prone (legacy saves only; ×1.4 injury rolls — no longer generated). *Clutch*
(the last sixth of the match, now 2:20 — `goals.fieldGoalLastS`) waits for the match clock in Phase 2.

### 3.5 Data model
`Player.traits: TraitInstance[] = { id: TraitId; level: 1 | 2 | 3 }` (`src/data/traits.ts`
is the catalogue). Save v6 migrates old names to level I (`hardMan` → `hitman`). Team
sheets carry them to both engines; `src/match/league/traits.ts` turns them into the
probability points the contest adds (§4.1). Lab: **Skills** = as rolled / none / all
superstars (two level-III position traits each), `#lab?traits=stars`.

## 4. Contests

### 4.1 Tackle (the big one)
Resolved when a committed defender reaches the carrier. Order of checks:

1. **Step** (pre-contact, one-on-one only): baseline 10% at even footwork vs defence;
   ±1% per 2 stat points of edge; angle from the side +5%; fatigue of the defender +;
   two defenders committed → 0%. Success: defender misses, carrier continues (shown).
2. **Contact outcome** (everyone still here):

| Outcome | Even baseline | Main modifiers |
|---|---|---|
| Held | remainder | — |
| Big hit (driven back 2.5 m) | 10% | tackler Strength, square angle, Hitman / Hothead; carrier speed ↓ |
| Bust (broken, carrier continues with burst) | 12% | carrier Strength, speed differential, Wrecking Ball, Finisher; Brick Wall −, Last Line − |
| Fend (palm-off, defender stumbles) | 7% | carrier Strength/Skill, side angle, Don't Argue |
| Offload (to a support inside 5 m) | 9% | carrier Skill, Offload King, Razzle Dazzle; Brick Wall − |
| Strip (turnover) | 2% one-on-one | Pickpocket, carrier Skill − |

Two defenders: bust −6%, fend −4%, offload −3%, big hit +4%; three: −9 / −6 / −5 / +6.
Angle (from the tackler's closing direction vs the carrier's heading): **side** fend +5%,
big hit −4%; **behind** bust +4%, fend +3%, big hit −6%. Momentum: ±1% bust per m/s of
speed difference, capped ±4%. Last tackle: big hit +3%. Fatigue (§8): a tired carrier
−5% bust/fend/offload, a spent one −10%; a tired tackler −5% big hit and +3% bust, spent
−10% / +6%. This table is the **opening roll**: a *held* result becomes the wrestle
(§8.1); the big hit, bust, fend, offload and strip resolve at contact as before. Stats shift the baseline
by up to ±8% bust, ±4.5% fend, ±5% offload, ∓7% big hit, ∓1% strip (edge 0…1).

Step modifiers: side +5%, behind −5%, carrier fatigue −8%, tackler fatigue +4%; capped
at 60%. A step is tried at most once per defender per possession, when he is inside
2.6 m and no second defender is within 3.5 m. *Implemented in B (#96).*

### 4.2 Pass
Completion by passer Skill and pressure (defender inside 2 m when thrown): base 96%,
−4% under pressure; in rain the knock-on chance is ×1.6 (BAK-207 2f, tuning §18). Failure = knock-on (turnover). **Intercept**: a defender
within 1.5 m of the pass line has 6% (+trait) to pick it off — shown and often a try.
Cut-out passes (Playmaker) skip a receiver: higher reward, 2× intercept exposure.

**On the move** (lab feedback round 2). A pass is thrown to where the receiver will be,
allowing for his run-up (current forward speed, then acceleration to top speed, over
the flight), never ahead of the passer; he runs *through* the catch point rather than
stopping under it, and checks back only when the ball is at or behind him. As the ball
is heeled at a ruck the backline comes up onto it (3 m ahead of their standing spots,
less for the forwards close to the ruck) so the first receiver takes it at ~2.5 m/s,
not standing. Carrying the ball costs 5% of top speed.

### 4.3 Catch (kicks) — *first slice implemented (lab feedback round 2)*
A kick hangs for its flight time (2√(2·peak/g): a 12 m kick ≈ 3.1 s, a bomb ≈ 4 s), so
chasers and catchers can get under it. **Whoever is nearest the landing point within
2.5 m takes it** (the nominated man on a near tie): the kicking side's kicker and two
nearest chase it flat out, the receiving side has a second man under it beside the
catcher, and the defending fullback drops to 24 m behind his line on the last tackle
and goes to the landing spot the moment the kicker shapes to kick. Drop: 6% alone,
18% with a chaser inside 2 m (−/+ by Skill); a drop is a scramble for anyone. The kicking
side getting there first is a **regather** (fresh set, or a try next tick if he is over
the line). Rain and the Skill-vs-pressure table above wait for E.

### 4.4 Kicks — *first slice implemented: long, bomb, grubber, chip, cross-field*
The kicker makes **one call** for the last tackle: inside 6 m he runs it; inside 40 m he
runs it one time in five; otherwise a kick by zone, each announced by type. On the
second-last tackle inside 25 m he goes early 35% of the time (grubber 60 / chip 40):

| Kick | When the AI chooses it | Resolution |
|---|---|---|
| **Territory** (long) | Beyond 50 m (85%), or 40–50 m (20%) | Distance from Boot; lands in front of the fullback; chase sets the line |
| **Bomb** | Beyond 50 m (15%), 40–50 m (50%), 22–40 m (30%) | Peak 20 m, 22–28 m long, onto the fullback's patch; catch contest (§4.3) |
| **Cross-field** | 40–50 m (30%), 22–40 m (35%), inside 22 m (30%) | Peak 13 m, to the far winger, 2 m short of the line; winger vs winger under it |
| **Grubber** | 22–40 m (20%), inside 22 m (50%) | From inside 16 m, skids about 3 m into the in-goal; from further out, about 8 m short of the line, aimed at a winger's lane pulled back toward the kicker. The wingers start their run on the second-last. A try or a repeat set sometimes; usually the defence gets it |
| **Chip** | 22–40 m (15%), inside 22 m (20%) | 10–13 m over the rushing line, the kicker chases his own |
| **40/20** | Inside own 40, last tackle: 8% of kickers, +20% a level of Big Boot or Playmaker | *Implemented in BAK-207 2d:* lands 26 m out, 3 m in from touch and rolls on; out inside their 20 after a bounce → **40/20!**, a tap restart for the kicking side 10 m in from touch |
| **Touch-finder** | Territory kick from deep: own 20 60%, own half 50%, midfield 35%, attacking half 15% | *Implemented in BAK-207 2d:* aims to land 4 m in from the nearer touchline (± 5 m × Boot), rolls 9–13 m for the line; out on the full → the other side's play-the-ball level with the kick |
| **Field goal** | Last 3 minutes, his side level or a point behind, inside 30 m, tackle 3 or later | *Implemented in BAK-207 2c:* a drop kick, odds by angle, distance, Skill and Boot; charge-down 8%; a miss is a 20 m restart |
| **Conversion** | After every try | *Implemented in BAK-207 2c:* a Nines drop kick in line with the try, from where the posts look widest; GOAL! / MISSED! |

Every kick pop-ups its type (BOMB!, GRUBBER!, CHIP!, CROSS-FIELD!, plain KICK! for
territory); REGATHER! and DROPPED! follow. **The camera goes wide** (N15.3, #297): from the kick's
third tick in the air the view reads where it will land (the sim flies it on a fixed curve)
and frames the landing, the kicker and the top of the flight at the widest whole-number
zoom that holds them; a trail follows the ball from the boot and fades after the catch or
the bounce, and the framing is back on the ball within a second. A bomb or a cross-field
kick rings the two under it as it comes down and lights the one who takes it; a grubber
leaves a skid mark at each hop (`src/match/view/kickLayer.ts`, tuning reference §9).
**Touch and dead ball** (BAK-207 2d): the side that touched the ball last loses it. Into
touch → TOUCH, a play-the-ball 10 m in from touch for the other side (no scrums); a carrier
held on the touchline can be bundled out (INTO TOUCH!). Dead in-goal or over the dead-ball
line off the attack (a grubber can run on up to 6 m) → DEAD BALL, a 20 m tap restart for
the defence; a defender who gathers a kick in his own in-goal grounds it for the same when
pressed or deep, else runs it out; held in his own in-goal, or the ball dead off him →
DROP-OUT from the middle of his try line (tuning reference §16).

## 5. Tactics by zone — *implemented in D (#98)*

The field is five zones from the attacking side's view, by metres to the line it is
attacking: **own 20** (>80) · **own half** (60–80) · **midfield** (40–60) · **attacking
half** (20–40) · **red zone** (≤20). A side carries **two presets** (decision
2026-10-17): an **attack** preset read per zone every time the carrier decides, and a
**defence** preset for how the line is set. Numbers are deltas and multipliers on the
sim's defaults (`src/match/league/presets.ts`).

### 5.1 Attack presets
| Preset | Pass | Offloads | Step | Width / cut-out | Prefers | Early kicks | Kick bias |
|---|---|---|---|---|---|---|---|
| **Grind** | −15% (−25% own 20) | never (½ in the attacking half, 0.7 red zone) | tries 60% | — | hit-ups +1.0 | territory 25% from deep (40% own 20); red zone 20% | long ×1.6, bomb ×0.7, chip/cross ×0.5 |
| **Balanced** (default) | 0 | normal (0.6 own 20) | always | — | halves first, forwards early | red zone 35% | — |
| **Expansive** | 0 (N13: was +15%) | ×1.3 (0.8 own 20) | always | width 0.28, cut-out 2% (1% own 20), reach +3 m (N13: was 0.35 / 8%) | edges +0.8 | red zone 18% (N13: was 30%) | cross-field ×1.5, long ×0.8 |
| **Kick-chase** | −5% | ×0.6 | tries 90% | — | — | territory 35% from deep (bomb 40% of those); red zone 55% | bomb ×1.8, grubber ×1.3, long ×1.2 |
| **All-out** | 0 (N13: was +15%; Phase 3 had cut +20% to +15%) | ×1.5 (1.2 own 20; N13: was ×1.6) | always | width 0.35, cut-out 3% (N13: was 0.45 / 12%) | edges +0.5 | red zone 15% (N13: was 30%) | chip ×1.6, cross ×1.3, grubber ×1.2, long ×0.6 |

*Pass* adds to the engaged carrier's chance of passing (base 30% + Skill/300). *Offloads*
multiplies the offload odds (§4.1); 0 means support is ignored. *Step* is the chance he
tries the step one-on-one rather than tucking it. *Width* softens the preference for the
6 m pass; *cut-out* is the chance per engagement of throwing to the widest man in reach.
*Prefers* adds to the receiver choice (forwards' hit-ups on tackles 1–3; centres and
wingers). **Overlap** (all presets): when a side has more players than the defence within
20 m on one side of the passer, receivers that way get +0.8 (×1 + width).

### 5.2 Defence presets
| Preset | Line speed | Commits | Lanes | Markers hold | Every tackle | Stepped |
|---|---|---|---|---|---|---|
| **Slide** (default) | 5 m/s | 2 (3–4 when the line is broken) | normal | ×1.0 | — | — |
| **Rush** | 6.2 m/s (N13: was 6.5) | +1 | normal | ×0.6 | big hit +4%, bust +11% (Phase 3: was +5%) | +4% |
| **Compressed** | 4.5 m/s | — | pull ×1.1 toward the ball (N13: was ×1.4) | ×1.05 (N13: was ×1.2) | bust −2% (N13: was −4%), offload −3% | +3% (N13: was −2%; the open edges can be stepped) |

### 5.3 Who plays what
Rivals' styles follow from the nine they field (N11, tuning reference §28): a half with Big
Boot or Playmaker kicks and chases, quick backs go Expansive, a heavy pack grinds, a
contender with none of those goes All-out, the rest are Balanced; a strong pack rushes, a fit
line compresses, the rest slide. Re-read from the squad as it stands, not stored. A rival with too
few fit men for a nine (a strength-built sheet) keeps the old fixed style from club identity:
contenders (65+) Expansive / All-out / Balanced, mid-table Balanced / Kick-chase / Expansive,
strugglers Grind / Kick-chase / Balanced, with the defence from a second roll. The player's club plays Balanced / Slide
until the coach picks otherwise: since N11 the Lineup screen has a chip per attack and
defence preset, saved in the lineup (save v14) and carried on the team sheet. Mid-match coach calls
(#73) will override the preset for a set. Lab: **H / A** pickers per side for attack and
defence ("club" keeps the club's own), `#lab?hatk=grind&hdef=rush&aatk=…&adef=…`, and the
hint line names what each side is playing.

Measured (12 seeds × 2½ min, 60-rated sheets, v Balanced / Slide): Expansive throws
more than twice Grind's offloads and more cut-outs, Grind kicks long more often and steps
less; Kick-chase kicks more and bombs more; All-out offloads 1.5× Balanced; Rush makes
15%+ more big hits but concedes more busts and steps than Slide.

## 6. Readability (how it is shown)

| Event | Pop-up | Extra |
|---|---|---|
| Step / fend / bust / offload | word + player surname over his head, 1.2 s | 0.25 s slow-mo on bust |
| Big hit | BIG HIT! | camera shake, 0.3 s slow-mo, crowd roar |
| Intercept / strip | word + name | camera snaps to the ball |
| Trait firing | "SIDESTEP II!" in the trait colour under the word | commentary names the trait; six moves draw on the pitch when the trait fired (N15.4): the fend's arm, the step's cut, Big Boot's wider trail, the Playmaker's line, the Wrecking Ball's drive, the Hitman's shock |
| Kick | type (BOMB!, 40/20!) | wide camera, trail |
| Try | existing banner (#82) | scorer's traits listed |
| Wrestle (§8.1) | bar over the carrier: fight left, green → yellow → red, a pip per man on him | BROKE FREE! on a late bust |
| Quick play-the-ball / legs gone | QUICK PTB! · COOKED! | slow rucks are commentary only |

The commentary ticker gets a line for every pop-up, naming players. The lab shows an
**event feed** and a **per-5-minute stats strip** (tackles, breaks, offloads, errors,
kicks, tries) so balance is seen, not guessed.

## 7. Balance targets (to verify in Phase 3)

Per full Nines match (two 7:00 halves), both sides combined, 60-rated teams:
tackles 117–163 · line breaks 10–19 · offloads 6–11 · errors 8–12 · kicks 16–25 ·
tries 4–7 · completion 70–80%. Stronger team wins ~70% at a 20-point rating gap.
The count bands are the 9:00-half bands ×7/9, rounded (2026-10-25). Completion is a
rate and stayed.
*Phase 3 (2026-10-19, assumed — needs Leon):* tackles, line breaks and kicks were first
set at 90–120, 8–14 and 12–18, a tackle every 9–12 s of game clock, slower than real
league (about 7.5 s). The sim plays a tackle every 5–7 s, and per tackle its line breaks
and kicks were already in the old bands; those three bands are scaled to its tempo
(×1.67 low, ×1.75 high) rather than slowing the game and re-tuning the legs.
Measured by the balance harness (`balance/README.md`): every report marks these bands,
and the standard plan re-runs on each match-code change to `main`.

## 8. Fatigue — *implemented in F*

Every player has **legs**, an energy tank from 1 (fresh) to 0 (spent)
(`src/match/league/fatigue.ts`). It drains **0.0193% per metre run** (0.015% × 9/7:
the same share of a 7:00 half as 0.015% was of a 9:00 half), **0.77% / 0.51%** per
contact for carrier / tackler (0.6% / 0.4% × 9/7) and the wrestle's cost (§8.1); it
comes back **0.0257% a second** standing or walking (under 1.5 m/s) and **0.257% a
second** in a stoppage (after a try, before the restart). The sprint tank is not
scaled: a sprint is still a few seconds. Everything he spends is × his **drain rate**: 1.5 − Stamina/100, clamped 0.6…1.4
(Stamina 50 ×1, 80 ×0.7, 20 ×1.3), × 0.9 / 0.84 / 0.78 for Workhorse I / II / III.

| Legs | Top speed | Contest (§4.1) | Step |
|---|---|---|---|
| ≥ 40% | — | — | — |
| **Tired** < 40% | −10% | carrier −5% bust / fend / offload · tackler −5% big hit, +3% bust conceded | carrier −4%, tackler +2% |
| **Spent** < 20% | −20% | −10% / −10% · +6% | −8% / +4% |

A player going under 20% is announced once (**COOKED!**, "… is cooked"; renamed from GASSED! with F2, where gas is the sprint tank) until he
is back over 30%. Half-time and interchanges (BAK-207 2a, 2b) give legs back (§8.2).

Measured (8 seeds × 18 min, 60-rated sheets, on the old 9:00 halves): at Stamina 50 a side's average legs are
88 / 78 / 67 / 55 / 44 / 32% at 3 / 6 / 9 / 12 / 15 / 18 min — tired for the last two or
three minutes. Stamina 30 is tired from ~12 min and down to 20% at full time; Stamina 80
finishes on 61%. The drain and the recovery above are that curve ×9/7, so the same
share of a 7:00 half is about as tired.

### 8.1 The wrestle (Leon, 2026-10-17) — *implemented in F*
Contact is a **struggle**, Kairosoft-soccer style (`src/match/league/wrestle.ts`). The
contest (§4.1) is the opening roll; a *held* result starts the wrestle. A bar over the
carrier is the **fight** left in him, in seconds against one average man:
1.1 s × (1 + (Str − 50)/120 + (Sta − 50)/240) × (1 − 0.5 × legs lost), × 0.75…1.25 from
one roll (a Wrecking Ball who keeps driving: × 1 + 0.3/level). Each man in the tackle
drains it by his **hold** (1 + (Str − 50)/120, −40% when spent), summed and × **1 / 1.5 / 2**
for one / two / three men. The defenders have **grip**: the first man 1.3 s, each joiner
0.35 s more (× 1 + (Str − 50)/150 + (IQ − 50)/300, −40% when spent). Free defenders within
6 m come in to help; one reaching the carrier joins (three at most).

- **Fight gone → held.** The tackle is counted then ("… wraps up …", "(2 men)").
- **Grip gone first → BROKE FREE!** A late bust: the tacklers go down and sit out, the
  carrier bursts away. Rare between fresh, even sides; it is where strength mismatches
  and tired tacklers show.
- **Driven over the line** in the tackle → try.
- **Metres after contact**: he drives forward at 1.5 m/s × fight left ÷ men on him.
- **Ruck speed** from how long it lasted: 5 ticks down at ≤ 0.35 s to 18 at ≥ 1.2 s (the
  old fixed 10 sits at ~0.65 s, the average). **QUICK PTB!** at ≤ 0.35 s, a "slow
  play-the-ball" line at ≥ 1.2 s. The big hit still resolves at contact (no wrestle, the
  old 10 ticks down).
- **Legs**: carrier 1.03% per second per man on him, each tackler 0.77% a second (the 9:00-half rates × 9/7).
- Never longer than 3 s.

Measured (8 seeds × 18 min, Stamina 50): ~160 wrestles a match averaging 0.63 s; 20 held
by one man, 123 by two, 14 by three; 6.5 late busts, 10 quick and 4 slow play-the-balls.
Stamina 30 v 80: ~10 late busts a match.

Lab: **Legs** = fresh / last 10 min (38%, tired) / cooked (18%, spent),
`#lab?legs=late`; the label reads `legs 74/71%` (home / away average).

### 8.2 Sprint, gas and getting legs back (Leon, 2026-10-18) — *implemented in F2*

F gave every player one bar, **legs**: full at kick-off, spent by running, contact and
wrestling, coming back only a little. Everyone also ran flat out all the time. F2 splits
effort into two bars so that pace is something a player *spends* (`src/match/league/gas.ts`):

- **Gas** (short-term): a small sprint tank. Sprinting empties it in seconds; jogging
  or standing refills it in seconds.
- **Legs** (long-term, F's bar): drains over the match and is the **ceiling** on gas.
  At 60% legs the gas tank only fills to 60%, and refills more slowly.

**Pace.** A player runs at **cruise**, 94% of his top speed, unless he is sprinting.
**Sprinting** is top speed (the Speed stat, 6–9 m/s) and burns gas. With the gas gone he
is **blown**: 75% of top speed until gas is back to a quarter, then cruise again. The
old break burst (×1.15 for 0.8 s) is retired: after beating a man the carrier simply
sprints (`gas.breakBurst` keeps the old burst for experiments; it made no difference).

**Who sprints.** Only when it matters, so the burst reads on screen:
- the carrier with space (nobody in his lane for 15 m), after a break, step or fend, or
  through the line;
- a committed defender closing the last 8 m, and every defender covering a broken line
  (the fullback included);
- kick and loose-ball chasers, and the catcher getting under a kick;
- support runners within 10 m of the carrier when he goes.

Everyone else cruises or holds position. A receiver runs onto an ordinary pass at
cruise and keeps his gas for the line.

| | Shipped | At Stamina 30 / 50 / 80 |
|---|---|---|
| Cruise | 94% of top speed | — |
| Gas tank | 0.5 + Stamina/18 seconds of sprint | 2.2 / 3.3 / 4.9 s |
| Gas refill (cruising; ×1.5 standing) | full in 12 − Stamina/25 seconds | 10.8 / 10 / 8.8 s |
| Blown | 75% of top speed until gas is back to 25% | — |
| Legs as ceiling | gas max = legs; refill × (0.5 + 0.5 × legs) | — |
| Legs cost of running | per metre ×1.5 sprinting, ×0.9 cruising | — |
| Jets (replaces its burst) | gas tank × (1 + 0.4 × level multiplier) | I ×1.4, II ×1.64, III ×1.88 |

**Changed from the design, by measurement** (balance harness, 20–30 matches a row):
- Cruise **94%, not 88%.** Tries track cruise pace: the whole attack slows while the
  defensive line still rushes up at its preset speed. 88% gave 3.9 tries a match between
  even sides, 94% gives 5.0–5.5, 100% restores the pre-F2 7.2.
- The carrier needs **15 m of clear lane, not 6 m**, and receivers no longer sprint onto
  ordinary passes. At 6 m he sprinted off every play-the-ball (the line is 10 m away) and
  a third of all carries ran dry before contact.
- Support runners sprint **whenever the carrier does**, not only on a break, so they stay
  in reach for the offload.
- Cruising costs legs ×0.9 (not ×0.8) so a match drains as F did.

**What it produces** (tests and lab check):
- A **Speed 90 / Stamina 30** winger who breaks with a defender 2 m behind is run down
  inside 35 m by a **Speed 70 / Stamina 80** fullback; with **Stamina 70** he gets away
  (`tests/match/league/gas.test.ts`, the sim's own movement and gas).
- Measured over 30 full matches (standard plan): legs at full time 39% between even sides
  (F: 40%); about 16 carriers run dry a match, 36 when Speed 85 / Stamina 30 fliers play
  Speed 65 / Stamina 80 stayers; 1–2.6 run-downs a match.
- **The cost:** about two fewer tries a match than before F2 in every matchup (even sides
  7.2 → 5.0, still inside §7; Rush and Expansive matchups 4.5–4.7, just under it). Cruise
  pace is the lever (`gas.cruise`); left at 94% pending the Phase 3 balance pass.
- **N9.3 follow-ups:** attacking kicks (bomb, grubber, chip, cross-field) are chased at a
  sprint with the nearest winger joining, territory kicks at cruise; the defensive line
  moves up at its preset speed × cruise / 94%, so cruise can come down without the line
  outrunning the attack (0.88 now costs 0.3–1.1 tries a match, was 1.1+). Nothing beyond luck
  in the match counts (tuning reference §25).
- Fliers v stayers: the fliers break more (63 a match against 50 between even sides) but
  win 7% of matches, on 23% legs at full time to the stayers' 62%. Stamina stays decisive
  until half-time and interchanges give legs back.

**Shown as:** a speed streak behind anyone sprinting; a thin gas bar under the carrier
when he is sprinting or blown and under anyone sprinting at him (blue, yellow when low,
red when blown); **RUN DOWN!** when a carrier is caught from behind by a sprinting man
within 6 s of breaking; "has nothing left in the tank" in the commentary when a carrier
runs dry.

**Getting legs back** (rides with the features it belongs to):
- **Half-time** — *implemented in BAK-207 2a*: every player gets back **half of what
  he has lost** (40% → 70%), gas full (to his legs). Over whole matches even sides now
  end on about 52% legs instead of 35%, and stamina 30 v 80 on 36% / 69% instead of
  23% / 63% (tuning reference §13).
- **Interchange** — *implemented in BAK-207 2b* (#70): a benched player recovers **about
  6.4% a minute** (0.05 × 9/7), **up to 90%**, never back to fresh within a match. The
  old 5% a minute reached that cap across an 18-minute match; the higher rate reaches
  it across 14. Taken off at 40%, four minutes later he is back at about 66% (it was
  60% at 5% a minute). The coach's rotation (off / standard / heavy) swaps
  the most tired men after a try; with a standard bench even sides end on about 71% legs
  instead of 52%, and the Stamina 30 side against Stamina 80 on 60% / 71% instead of
  36% / 69%; on heavy rotation it wins one match in five instead of none (tuning
  reference §14).
- **Stoppages** keep F's slow recovery.

**Stats, after F2:** Speed is how fast a player can go; Stamina is how long he can go
that fast and how soon he can do it again. That makes real archetypes: the flier who
makes the break but can't finish it, the workhorse who is never quick and never stops.

## 9. Delivery (each a PR with lab sign-off; order fixed, numbers negotiable)

| # | Mechanic | Doc section |
|---|---|---|
| A | Pop-ups + commentary for what already happens; lab event feed + stats strip | §6 |
| B | Contest v2: situation modifiers, Step, Strip, Intercept | §4.1–4.2 |
| C | Traits with levels in the data model and the sim, shown when they fire | §3 |
| D | Zone tactics and presets | §5 |
| E | Kick types, catches, scrambles | §4.3–4.4 |
| F | Fatigue and the wrestle — *shipped* | §8 |
| F2 | Sprint and gas; legs as their ceiling — *shipped* (half-time shipped with BAK-207 2a, the bench with 2b) | §8.2 |
| F2+ | Sprint follow-ups (kick chase, line speed on cruise, lab legs bar, stamina knobs) — *shipped* (N9.3) | §8.2, §11 |
| N13.5 | A side's plan can change at half-time and after a try, by a rule the match opts into — *shipped* (off unless a side is named; N14 wires the rivals). Tuning §30 | §5 |

Then BAK-207 Phase 2 (full match, scoring, halves) and Phase 3 (balance).

## 10. Decisions (Leon, 2026-10-17 / 18)
- Trait **names**: footy slang (§3).
- **Negative traits**: not straight negatives on generated players — **double-edged** ones
  that make a player brilliant some days and costly on others (§3.3). Injury Prone stays
  only on migrated saves.
- Presets: **separate attack and defence** presets (D, §5 — to be reshaped accordingly).
- Slow-motion on big moments: **keep it**.
- Fatigue (2026-10-18): F's single legs bar stays as the prototype; stamina being decisive
  is fine for now because **half-time and interchanges** will give legs back (§8.2).
- **Sprint and gas** (2026-10-18): two bars, gas for short bursts and legs as its
  ceiling; fast players with little stamina make breaks they can't finish (§8.2, F2).

## 11. Brainstorm backlog (not scheduled)
- **Coach calls during play** (Leon, 2026-10-17; extends #73). Presets are set at the
  breaks (kick-off, half-time, after a try); *during* play a small bar of chips lets the
  player influence the **next play only**: e.g. *Hit-up* · *Shift left* / *Shift right* ·
  *Kick early* · *Chip & chase* · *Rush* / *Hold* on defence. One call per set (or a
  cooldown) keeps it a nudge, not a joystick; the call shows as a pop-up when it happens
  and the stats strip could count calls that paid off. Needs the Phase 2 match screen.
- **Refinement pass** on everything shipped in A–D once Phase 2 gives full matches to
  measure against §7 (Leon: "we may need to refine it still, come back to it later").
- ~~**Sprint follow-ups**~~ and ~~**stamina knobs by name**~~: shipped in N9.3 (§8.2; the
  tuning reference §10 and §25, with a kick-chase run and a stamina sweep).
- ~~**A side changes plan at the breaks**~~: shipped in N13.5 (tuning §30). The rule
  is off unless the match names the sides, so the golden even match is unchanged.
  N14 decides which rivals use it.
- **§7 outliers for the Phase 3 pass**, measured with the standard plan: line breaks
  ~50 a match (target 8–14), offloads ~2 (8–14), tackles ~175 (90–120), and 70 v 50
  winning every match (target ~70%). Structural, not one knob; good harness work.
