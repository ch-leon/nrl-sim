# Plan: the deeper default kick-off (#397)

Wave 4, prompt 05. Leon (28 Oct): "Kick offs don't go very far. Should we
influence? Short / long etc". Every kick-off landed on the receivers' 24 m
line, about 26 m from halfway; a real NRL kick-off goes 35–45 m and lands
5–15 m out. The deeper default lands on the receivers' 15 m line with a
kicking Skill of 30 or less, their 8 m line at 90 or more (35–42 m), with a
little more hang (peak 18, was 16). Knob: `kickoff.deepDefault` (0 = the old
kick-off, 1 = the deeper one), `src/match/league/kickoff.ts`.

**Outcome (28 Oct).** On. Both match fingerprints were re-pinned in the
commit that turned it on. The Short and Long kick-off calls draw their dice
only when called, so they move no pin.

## Question

Does the deeper default keep points, tries, completion and possession inside
the §7 bands, for even sides, a rating gap and the attacking and defence
styles? `kickoff-depth.json` is the plan (baseline = the old kick-off,
variant = `kickoff.deepDefault: 1`). Two confirm plans on fresh seeds
(10001+) followed, for the rows the first run left in doubt.

## Results

Wins are on points. Counts are per match, both sides. A `*` is beyond luck.

### Even 60 v 60 (1,000 matches: seeds 1–400 and 10001–10600)

| | points | tries | completion | possession (home) | home win |
|---|---:|---:|---:|---:|---:|
| old kick-off | 25.5 | 5.0 | 69.5% | 50.0% | 51% / 49% |
| deeper default | 28.6 | 5.5* | 69.7% | 49.9% | 42% / 48% |

Tries are inside 4–7 (§7) before and after. Completion sits at the low edge
of 70–80% either way (it did not move). Possession is even, as two even sides
should be. The home win's 51% → 42% on seeds 1–400 was luck: on 600 fresh
seeds it is 49% → 48%.

### Presets (45–55% band, tracked side both ways)

| Preset | Seeds | Old | Deeper |
|---|---|---:|---:|
| Expansive v Balanced | 1–100 | 48.5% | 52.0% |
| Kick-chase v Balanced | 1–100 | 53.5% | 53.0% |
| Rush v Slide | 1–100 | 52.5% | 40.5% |
| Rush v Slide (confirm) | 10001–10300 | 48.5% | 51.7% |
| Compressed v Slide | 10001–10200 | 48.5% | 54.0% |
| Grind v Balanced | 10001–10200 | 47.8% | 49.0% |
| All-out v Balanced | 10001–10200 | 39.3% | 46.0% |

Rush's drop on the first 100 seeds did not hold on 300 fresh ones. Every
preset row gains 0.6–0.8 tries a match (beyond luck) and 3–5 points.

### 70 v 50 (the ~70% target)

| Seeds | Old | Deeper |
|---|---:|---:|
| 1–100 | 70% | 78% |
| 10001–10400 | 76% | 73% |

The first run's 78% was luck. The favourite's win is near the target either way.

### Runs

- `20261028-123504-kickoff-depth` (this plan, before #405)
- `20261028-145438-kickoff-depth` (this plan again on main after #405 and #406, baseline the deeper default: every number the same)
- `20261028-124128-kickoff-depth-confirm` (even, Rush, Compressed, Grind, All-out on 10001+)
- `20261028-135316-kickoff-depth-gap` (70 v 50 on 10001+)

## Other tests the new default moved

Small-sample tests pinned on the default match, each with the reason beside it:
`potentialRng.test.ts` (the season's rngSeed, re-pinned), `kickLayer.test.ts`
(the phone holds the kicker on 63% of kick frames, was about 71%: a longer
kick), `touch.test.ts` (a third seed), `fatigue.test.ts` (eight seeds; a
Stamina-40 side is at about 0.75 after ten minutes; a spent man who gets back
to tired legs runs at −10%), `presets.test.ts` (All-out offloads about 1.46×
Balanced's in the opening 2½ minutes, was over 1.5×), `moreCalls.test.ts` (#396's penalty
pair: 16 seeds to find a home penalty in range, and Tap and go looks on to the first one the
captain did not tap himself).
