# BAK-208 — Match design: contests, traits, tactics, kicks, readability
**GitHub:** https://github.com/ch-leon/nrl-sim/issues/94 (Phase 1.5 under #83) | **Priority:** Highest | **Status:** LIVING — A, B, C, D and the first slice of E shipped (2026-10-17); numbers in each section are the shipped ones. Every knob with its file and value: `BAK-208-tuning.md`.

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
equal stats → baseline 10% step, 12% bust, 7% fend, 9% offload (if a support is close),
10% big hit, rest held. Carrier has *Dancing Feet II* → step becomes 10% + 24% = 34%. Roll
0.22 → **STEP!** with *DANCING FEET II* under it — the defender grasps air, the carrier is
through, the crowd lifts.

## 2. Base stats (every player)

| Stat | What it drives |
|---|---|
| **Speed** | Top speed, acceleration, chase, the burst after a break |
| **Strength** | Winning contact both ways: busting, driving back, holding |
| **Skill** | Execution: passing, catching, offloading, kicking accuracy, footwork |
| **Footy IQ** | Decisions: when to pass or kick, running the right line, defensive positioning and intercept angles, cover defence |
| **Stamina** | How fast fatigue sets in (§8); tired players lose speed and contest odds |

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
| **Wrecking Ball** | In contact | +12% bust; held → 30% to drive 0.6 m forward in the tackle | BUST! / DRIVE! |
| **Don't Argue** | Tackler not arriving from behind | +12% fend | FEND! |
| **Offload King** | Held with a support runner inside 5 m | +12% offload | OFFLOAD! |
| **Finisher** | Inside the opposition 20 m | +10% bust, +5% fend, +10% step | BUST! / STEP! |
| **Jets** | After a break; on the kick chase | Burst lasts 3 s (not 0.8); +8% speed chasing a kick | longer burst |
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
Workhorse (training ×1.2 at I, ×1.32 II, ×1.44 III; slower fatigue in F), Young Gun
(training ×1.3; age ≤ 20 and rated 60+), Veteran (age 31+), Club Legend (tenure),
Injury Prone (legacy saves only; ×1.4 injury rolls — no longer generated). *Clutch*
(last 3 minutes) waits for the match clock in Phase 2.

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
speed difference, capped ±4%. Last tackle: big hit +3%. Fatigue (§8): a spent carrier
−10% bust/fend/offload; a spent tackler −10% big hit, +6% bust. Stats shift the baseline
by up to ±8% bust, ±4.5% fend, ±5% offload, ∓7% big hit, ∓1% strip (edge 0…1).

Step modifiers: side +5%, behind −5%, carrier fatigue −8%, tackler fatigue +4%; capped
at 60%. A step is tried at most once per defender per possession, when he is inside
2.6 m and no second defender is within 3.5 m. *Implemented in B (#96).*

### 4.2 Pass
Completion by passer Skill and pressure (defender inside 2 m when thrown): base 96%,
−4% under pressure, −6% in rain. Failure = knock-on (turnover). **Intercept**: a defender
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
| **Grubber** | 22–40 m (20%), inside 22 m (50%) | Skids and hops 3 m into the in-goal; race for the loose ball: try, or the defender runs it out |
| **Chip** | 22–40 m (15%), inside 22 m (20%) | 10–13 m over the rushing line, the kicker chases his own |
| **40/20** | Inside own 40, Boot trait or Playmaker, last tackle | *E:* Finds touch inside the 20 → fresh set to the kicking team |
| **Field goal** | Last 3 minutes, scores level or within 1, inside 30 m | *Phase 2:* Boot accuracy, defensive charge-down 8% |

Every kick pop-ups its type (BOMB!, GRUBBER!, CHIP!, CROSS-FIELD!, plain KICK! for
territory); REGATHER! and DROPPED! follow. The camera going wide waits for E. Goal-line
dropouts and dead balls are not modelled yet: a grubber never crosses the dead-ball
line and a defender who gathers it in-goal simply runs it out.

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
| **Expansive** | +15% | ×1.3 (0.8 own 20) | always | width 0.35, cut-out 8%, reach +3 m | edges +0.8 | red zone 30% | cross-field ×1.5, long ×0.8 |
| **Kick-chase** | −5% | ×0.6 | tries 90% | — | — | territory 35% from deep (bomb 40% of those); red zone 55% | bomb ×1.8, grubber ×1.3, long ×1.2 |
| **All-out** | +20% | ×1.6 (1.2 own 20) | always | width 0.45, cut-out 12% | edges +0.5 | red zone 45% | chip ×1.6, cross ×1.3, grubber ×1.2, long ×0.6 |

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
| **Rush** | 6.5 m/s | +1 | normal | ×0.6 | big hit +4%, bust +5% | +4% |
| **Compressed** | 4.5 m/s | — | pull ×1.4 toward the ball (edges open) | ×1.2 | bust −4%, offload −3% | −2% |

### 5.3 Who plays what
Rivals get a fixed style from club identity: contenders (65+) Expansive / All-out /
Balanced, mid-table Balanced / Kick-chase / Expansive, strugglers Grind / Kick-chase /
Balanced, with the defence from a second roll. The player's club plays Balanced / Slide
until coaching staff and facilities unlock presets (later ticket). Mid-match coach calls
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
| Trait firing | "SIDESTEP II!" in the trait colour under the word | commentary names the trait |
| Kick | type (BOMB!, 40/20!) | wide camera, trail |
| Try | existing banner (#82) | scorer's traits listed |

The commentary ticker gets a line for every pop-up, naming players. The lab shows an
**event feed** and a **per-5-minute stats strip** (tackles, breaks, offloads, errors,
kicks, tries) so balance is seen, not guessed.

## 7. Balance targets (to verify in Phase 3)

Per full Nines match (two 9:00 halves), both sides combined, 60-rated teams:
tackles 90–120 · line breaks 8–14 · offloads 8–14 · errors 10–16 · kicks 12–18 ·
tries 5–9 · completion 70–80%. Stronger team wins ~70% at a 20-point rating gap.

## 8. Fatigue — *F, next; design updated 2026-10-17*

Stamina drains with metres run and tackles made; recovers slowly in stoppages. Below
40% stamina: top speed −10%, contest odds −5%; below 20%: −20% / −10%. Interchanges
(#70) answer it later; until then it shapes the last minutes.

### 8.1 The wrestle (Leon, 2026-10-17)
Tackles should sometimes need more than one man, and that is where fatigue shows. Model
contact as a **struggle**, Kairosoft-soccer style: on contact a small bar over the pair
is the carrier's fight left in him (from Strength + Stamina, less the fatigue he carries).
Each tackler in the tackle drains it; a second and third man drain it much faster. While
it lasts the carrier keeps driving (metres after contact), and if it is not empty when
the defenders' own effort runs out he is through (a late bust, announced). When it empties
he is held; **how long the wrestle lasted sets the play-the-ball speed** (a long wrestle
= slow ruck, the defence gets set; a quick one = quick play-the-ball, the line is short).
Everyone involved loses fatigue, the carrier most, more per defender. Numbers to come
with F; the current instant `contest()` becomes the opening roll of the wrestle, with the
step and the big hit still resolving at contact.

## 9. Delivery (each a PR with lab sign-off; order fixed, numbers negotiable)

| # | Mechanic | Doc section |
|---|---|---|
| A | Pop-ups + commentary for what already happens; lab event feed + stats strip | §6 |
| B | Contest v2: situation modifiers, Step, Strip, Intercept | §4.1–4.2 |
| C | Traits with levels in the data model and the sim, shown when they fire | §3 |
| D | Zone tactics and presets | §5 |
| E | Kick types, catches, scrambles | §4.3–4.4 |
| F | Fatigue | §8 |

Then BAK-207 Phase 2 (full match, scoring, halves) and Phase 3 (balance).

## 10. Decisions (Leon, 2026-10-17)
- Trait **names**: footy slang (§3).
- **Negative traits**: not straight negatives on generated players — **double-edged** ones
  that make a player brilliant some days and costly on others (§3.3). Injury Prone stays
  only on migrated saves.
- Presets: **separate attack and defence** presets (D, §5 — to be reshaped accordingly).
- Slow-motion on big moments: **keep it**.

## 11. Brainstorm backlog (not scheduled)
- **Coach calls during play** (Leon, 2026-10-17; extends #73). Presets are set at the
  breaks (kick-off, half-time, after a try); *during* play a small bar of chips lets the
  player influence the **next play only**: e.g. *Hit-up* · *Shift left* / *Shift right* ·
  *Kick early* · *Chip & chase* · *Rush* / *Hold* on defence. One call per set (or a
  cooldown) keeps it a nudge, not a joystick; the call shows as a pop-up when it happens
  and the stats strip could count calls that paid off. Needs the Phase 2 match screen.
- **The wrestle** → §8.1.
- **Refinement pass** on everything shipped in A–D once Phase 2 gives full matches to
  measure against §7 (Leon: "we may need to refine it still, come back to it later").
