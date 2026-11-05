# Strategy counters switch-on (#465)

Starting point: latest main `e8b88be` (prerequisite #464 merged). All five
`counters.*.on` switches change from 0 to 1. `SAVE_VERSION` remains 21.
The deterministic mechanics use the existing contact, pass and kick rolls.
Labs and commercial defaults are untouched.

## Replay guards

- Balanced / Slide: `10-26:350:34ab09d37c3de210`, unchanged.
- Expansive / Slide: `8-10:377:e051c574b7fe72b5` →
  `10-38:372:0e0dce9822247ec4`: strategy counters switched on, #465.
  Its negative Slide cell now changes positioning, interceptions and contact.
- These enabled defaults and the resulting fingerprints become the guards
  for subsequent work. Only #465 authorizes this deliberate re-pin.

## Reproduction

Use the balance harness (`balance/README.md`), whole matches, consecutive seeds
and both orientations. Points share means win = 1, draw = ½, loss = 0.

- `balance/plans/counters-enabled.json`: dormant and enabled 5 × 3 matrices,
  500 seeds each way, 1,000 matches per cell.
- `balance/plans/counters-yardstick.json`: current 62/65 versus 60 yardsticks,
  500 seeds each way.
- `balance/plans/counters-fit-enabled.json`: fit 1.5, 0.5 and 1 controls.
  `rating.spread=0` levels playing stats while fit still reads the original
  starting sheets; paired fit-off/on variants isolate its contribution.
- `balance/plans/counters-full-fit.json`: winning style fit 1.5 against losing
  style fit 0.5, both playing at flat 60 via spread 0; dormant/enabled controls.
- `balance/plans/counters-round-robin.json`: every unordered pair of 15 plans,
  100 seeds each way (200 matches per pairing, 2,800 per plan).
- Baseline and enabled soak: `npm run soak -- --difficulties easy,normal,hard --jobs 4`.

Measurements and final acceptance tables are in progress.

## Rival selection (#322)

`rivalTactics` still reads each rival's own nine. `RIVAL_STYLE.packStrength=1.0`
selects Tight for a pack stronger than its own side average, after the pace-first
Expansive choice. Strength contributes to both Carry and Offload, so this remains
directionally appropriate for the rebuilt Tight. A relative 1-point advantage
alone does not guarantee high absolute Tight fit: keep this distinction in #322.
The threshold is unchanged; AI counter-picking belongs to #469.
