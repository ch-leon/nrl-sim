# Finance PR #695: desktop QA half-time race

The first [QA run](https://github.com/ch-leon/nrl-sim/actions/runs/43793065610)
passed the phone's 73 steps and the performance and career-agency jobs. Desktop
failed only `38-coach-call`: "the tray offered no set call for 30 s".

## Evidence and classification

- The saved desktop screenshot `1280x800/38-coach-call.png` in the run's
  `e2e-output` artifact shows the normal half-time sheet, score 0–6, clock 02:30,
  waiting for **Start 2nd Half**. Coach calls are correctly unavailable there.
- The preceding replay returned to 02:30; the subsequent half-time-plan step
  successfully selected Expansive and continued. There were no browser errors
  or layout failures, and the desktop completed the remaining season/reload steps.
- `scripts/e2e-season.mjs` was byte-identical on main and finance commit
  `b8b7ad89` (blob `1fece77d2d7c3771b6bfe36825b55e6c6da657bc`). It checked
  half-time only before starting the coach-call polling loop, not during it.

This is a pre-existing harness timing gap exposed by that playthrough, not
an observed product failure to offer a legal call during active play. The
finance changes may alter the playthrough's timing; this diagnosis does not
claim that an unmodified-main browser run reproduced the same timing.

## Fix and regression coverage

The harness now checks for half-time on every bounded coach-call attempt and
uses the existing real half-time interaction (wait, choose a tactic, Continue).
The deterministic regression introduces the sheet between the initial check
and the first attempt, reproducing the missed transition. Other tests preserve
already-open half-time handling, refused calls, error propagation and the
bounded empty-tray failure. A passing test still requires an actual made and
lit set call and normal tray dismissal; it does not skip or waive the check.

No match-engine, finance-rule or production UI behavior changed in this fix.
The draft PR records the local and remote rerun outcomes; different-tool review
remains a separate required gate.
