# BAK-208 — Match design: contests, traits, tactics, kicks, readability
**GitHub:** https://github.com/ch-leon/nrl-sim/issues/94 (Phase 1.5 under #83) | **Priority:** Highest | **Status:** DRAFT for review (2026-10-16)

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
10% big hit, rest held. Carrier has *Sidestep II* → step becomes 10% + 25% = 35%. Roll
0.22 → **STEP!** — the defender grasps air, the carrier is through, the crowd lifts.

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

## 3. Traits (special skills) — rare, levelled

A trait is a special skill with a level **I, II or III**. Traits are rare: roughly 55% of
generated players have none, 30% have one, 12% two, 3% three or four (superstars).
Levels train up through facilities and coaches (later ticket); generation gives I or II.

Level scales the trait's effect: **I ×1.0 · II ×1.6 · III ×2.2** of the base bonus.

### 3.1 Attacking traits
| Trait | Fires when | Effect (level I) | Shown as |
|---|---|---|---|
| **Sidestep** | One-on-one, carrier not yet in contact | +15% step | STEP! |
| **Bulldozer** | In contact | +12% bust, +8% drive forward on held | BUST! |
| **Fend** | One defender arriving from the side | +12% palm-off | FEND! |
| **Offload King** | Held in a tackle with a support runner inside 5 m | +12% offload | OFFLOAD! |
| **Finisher** | Carry starts inside the opposition 10 m, or chasing a kick into the in-goal | +15% to win that contest; dives for the corner | TRY! (name) |
| **Speedster** | After a break or on a kick chase | +8% top speed for 3 s | burst lines |
| **Playmaker** | First receiver with two or more supports | Picks the better option more often; may throw a cut-out pass to the winger | CUT-OUT! |
| **Boot** | Any kick | +10% distance, +15% accuracy, unlocks 40/20 attempts | 40/20! / BOMB! |

### 3.2 Defensive traits
| Trait | Fires when | Effect (level I) | Shown as |
|---|---|---|---|
| **Hitman** | Square one-on-one tackle | +12% big hit | BIG HIT! |
| **Cover Defender** | Last line / chasing a break | Better intercept angle (+10% speed on the chase), +10% to make the tackle | COVER! |
| **Ball Stripper** | One-on-one tackle completed | +8% strip → turnover | STRIP! |
| **Wall** | Two-defender tackle | Carrier's bust/offload odds −10% each | — |
| **Intercept** | Defender in the lane of a wide pass | +10% intercept | INTERCEPT! |

### 3.3 Mental / meta traits (existing, kept)
Workhorse (training ×1.2, slower fatigue), Young Gun (training ×1.3), Veteran (IQ +5,
slower), Club Legend (morale), Injury Prone (×1.5 injury rolls), **Hothead** (new:
+penalties conceded, +big hits), **Clutch** (new: last 3 minutes, +10% every contest).

### 3.4 Data model
`Player.traits: Trait[]` becomes `TraitInstance[] = { id: TraitId; level: 1 | 2 | 3 }`
with a save migration (old names → level I). Team sheets carry them to the sim.

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
| Big hit (driven back 2.5 m) | 10% | tackler Strength, square angle, Hitman; carrier speed ↓ |
| Bust (broken, carrier continues with burst) | 12% | carrier Strength, speed differential, Bulldozer, Wall − |
| Fend (palm-off, defender stumbles) | 7% | carrier Strength/Skill, side angle, Fend trait |
| Offload (to a support inside 5 m) | 9% | carrier Skill, Offload King, Wall − |
| Strip (turnover) | 2% one-on-one | Ball Stripper, carrier Skill − |

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

### 4.3 Catch (kicks)
Catcher under a bomb: Skill vs the chasers' pressure. Clean take 85% unpressured, 65%
with a chaser inside 2 m, −10% rain. A drop is a scramble for the loose ball.

### 4.4 Kicks
| Kick | When the AI chooses it | Resolution |
|---|---|---|
| **Territory** (long) | Last tackle in own half | Distance from Boot; lands in front of the fullback; chase sets the line |
| **Bomb** | Last tackle, 25–45 m out | High and short; catch contest (§4.3); Boot accuracy puts it on the catcher or 5 m off |
| **Grubber** | Last tackle inside 20 m, or Playmaker earlier | Bounces into the in-goal; attacker vs defender race; try or 20 m restart |
| **Chip** | Red zone, one-on-one with a defender rushing | Over the top, regather chance from Speed |
| **40/20** | Inside own 40, Boot trait or Playmaker, last tackle | Finds touch inside the 20 → fresh set to the kicking team |
| **Field goal** | Last 3 minutes, scores level or within 1, inside 30 m | Boot accuracy, defensive charge-down 8% |

Every kick pop-ups its type; the camera goes wide.

## 5. Tactics by zone

The field is five zones from the attacking side's view: **own 20 · own half ·
midfield · attacking half · red zone (inside 20)**. A team's **preset** sets, per zone:
pass appetite, offload permission, kick choice weights, carrier risk (step attempts vs
carrying into contact), and the defensive line style (rush / slide / compressed).

| Preset | Character | Own 20 | Midfield | Red zone |
|---|---|---|---|---|
| **Grind** | one-out, safe, kick for territory | no offloads, early territory kick | hit-ups, kick on last | second-phase only via trait |
| **Balanced** (default) | sensible | low risk | shifts when numbers | offloads allowed, grubber/chip |
| **Expansive** | wide, second phase | shift once | offloads allowed, cut-outs | everything |
| **Kick-chase** | territory and pressure | kick tackle 3–4 | bombs | grubbers |
| **All-out** | risk everywhere | offloads | offloads, steps | chips, cut-outs, dives |

Presets are unlocked via coaching staff / facilities (later); rivals get one by club
identity. Mid-match coach calls (#73) override the preset for a set.

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

## 8. Fatigue
Stamina drains with metres run and tackles made; recovers slowly in stoppages. Below
40% stamina: top speed −10%, contest odds −5%; below 20%: −20% / −10%. Interchanges
(#70) answer it later; until then it shapes the last minutes.

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

## 10. Open questions (for Leon)
- Trait **names**: happy with these, or want them more "footy" (e.g. *Dancing Feet*, *Wrecking Ball*, *Hands of Glue*)?
- Should **negative traits** (Hothead, Injury Prone, Butterfingers) exist on generated players, or only arrive through events?
- Presets per **attack and defence** separately, or one combined style?
- Slow-motion on big moments: yes/no on a phone?
