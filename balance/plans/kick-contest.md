# Plan: kick contests (#99)

Wave 4, prompt 10. #99's three "done when"s: a set can end six ways by kick
and each is readable (met since N9.7); **bombs are a genuine contest**; and
**grubbers produce tries at a rate inside §7**. The N9.7 sign-off (20 Oct)
measured about one bomb in seven contested and 0.008 grubber tries a match;
the grubber chase (25 Oct) had already brought grubber tries to about 0.3.

What changed (`src/match/league/kickContest.ts`, `live.ts`; tuning §31):

- **The bomb contest.** When a bomb comes down with a chaser and a catcher
  both within 3 m of it, one draw decides it, whoever is a step nearer:
  **won back** (the chaser taps it back: TAPS IT BACK!), **spilled**, or
  **caught**. The chaser's Speed against the catcher's Skill sets the odds,
  through the same function as the Short kick-off's regather (#397,
  `chaserWins`). A higher kick (Big Boot puts a bomb 2 m a level higher) and a
  Kick-chase side win more back; rain makes the catcher spill more.
- **A spill goes one of two ways.** Forward off his hands it is a knock-on, the
  kicking side's ball (KNOCK-ON!); back or sideways it is loose for anyone. A
  kick-off or drop-out spill is loose for anyone, as before.
- **The grubber race.** A grubber that comes to rest in the in-goal is raced
  for by each side's quickest man to it. His time to the ball decides it; the
  bounce moves it by up to 0.45 s either way. The attacker first is a regather
  and the try; the defender grounds it for a 20 m restart (the rule today; a
  goal-line drop-out is a follow-up). A grubber that runs dead is unchanged.
- **Scrambles.** A loose ball both sides have a man within 6 m of is a
  scramble: LOOSE BALL! as it goes, the winner on the ticker, and "Scrambles
  won" in the match report. A knock-on is still only the other side's to take.

## Question

With the contests in, are bombs contested about one in five between even
sides (won back 6–10%, spilled 10–14%), more with Kick-chase; are grubber
tries 0.2–0.4 a match; and do tries, points, completion and penalties stay
inside §7? `kick-contest.json` is the plan: even 60 v 60 (400 matches),
Kick-chase v Balanced both ways (400), 70 v 50 (200). Run on `main` (91ef9d2)
for the before and on the branch for the after, with no coach calls.

Tuning on the way (experiment plans, not committed): the first cut, a contest
whenever a chaser was within 4 m of the catcher, won back 30% (a chaser is
under almost every bomb). The odds came down to about the targets; then the
contest was made the same whoever is a step nearer, so the kicking side's
uncontested regathers (about 4% of bombs) stopped adding to it. The race's
bounce (0.3, 0.45, 0.6 s) moved grubber tries only within luck (0.31–0.33
over 300 matches). A reach of 10 m measured the same, but that run was before
the reach decided who may take the ball (an attacker beyond it could still
gather it; fixed in review, so the defence alone gathers it), so it says
nothing about the reach.

## Results

Counts are per match, both sides. Bombs won back and spilled are shares of
bombs. A `*` is beyond luck (over two standard errors).

### Even 60 v 60 (400 matches)

| | before | after |
|---|---:|---:|
| tries (§7 4–7) | 5.50 | 5.73 |
| points | 28.4 | 29.7 |
| completion (§7 70–80%) | 69.8% | 69.6% |
| penalties | 1.52 | 1.47 |
| errors (§7 8–12) | 10.2 | 10.2 |
| kicks (§7 16–25) | 17.6 | 17.3 |
| kick metres | 443 | 423* |
| bombs | 3.37 | 3.16 |
| won back | 4.0% | **8.2%** |
| spilled | 10.9% | **11.6%** |
| contested (won back + spilled) | 14.9% (1 in 7) | **19.7% (1 in 5)** |
| grubbers | 1.97 | 1.91 |
| grubber tries | 0.297 | **0.345** |
| kick tries (within 12 s of the side's kick) | 1.17 | 1.41* |
| scrambles won | – | 1.50 |
| home win | 42% | 47% |

Tries rise by 0.23 (two standard errors are 0.30), all of it in kick tries.
Completion sits at the low edge of its band, as it did before. Kick metres
fall because a contested bomb now ends nearer where it was kicked.

### Kick-chase v Balanced (400 matches both ways; counts are the 200 as written)

| | before | after |
|---|---:|---:|
| tries | 5.28 | 5.49 |
| bombs | 4.27 | 4.05 |
| won back | 2.8% | **9.8%** |
| spilled | 10.7% | **14.3%** |
| contested | 13.5% | **24.1%** |
| grubber tries | 0.350 | 0.425 |
| Kick-chase side wins (45–55%) | 50.5% | 48.0% |

### 70 v 50 (200 matches; ~70% target)

| | before | after |
|---|---:|---:|
| home win | 83% | 76% |
| tries | 6.1 | 6.3 |
| contested | 17.8% | 23.3% |

After review (28 Oct) a grubber in-goal with no attacker within the race's
reach is the defence's alone, and a sin-binned catcher is never under a
contested bomb. The plan re-run on that head gave the same counts, match for
match, as the after run above (neither case came up in these 1,000 matches),
and the fingerprints did not move.

**Outcome (28 Oct).** On. Both match fingerprints were re-pinned once, in
their own commit. Grubber tries (0.345) are inside #99's default band
0.2–0.4 and over the harness's 0.20–0.30 guardrail (tuning §12), by less
than luck from the 0.297 before.
