# Roadmap

Last updated: 2026-11-04

Status checked against GitHub on 4 Nov 2026. Merged tooling is not the same as a
live gameplay change; open PRs below have not shipped.

## Now

**Strategy counters** ([tracker #470](https://github.com/ch-leon/nrl-sim/issues/470)):

- Done: matchup reports ([PR #471](https://github.com/ch-leon/nrl-sim/pull/471))
  and pure derived ratings, fit scores and archetypes
  ([PR #472](https://github.com/ch-leon/nrl-sim/pull/472)). Neither enables counters
  in the live sim.
- In progress: rebuild Grind as Tight, behind a knob at 0
  ([issue #460](https://github.com/ch-leon/nrl-sim/issues/460),
  draft [PR #473](https://github.com/ch-leon/nrl-sim/pull/473)).
- Next in the approved sequence: own-style fit, then Slide, Rush and Compressed
  counters ([#461](https://github.com/ch-leon/nrl-sim/issues/461),
  [#462](https://github.com/ch-leon/nrl-sim/issues/462),
  [#463](https://github.com/ch-leon/nrl-sim/issues/463),
  [#464](https://github.com/ch-leon/nrl-sim/issues/464)), all behind knobs at 0.
- Then switch on and tune to the 2–3 rating-point target
  ([#465](https://github.com/ch-leon/nrl-sim/issues/465)), followed by the UI rename,
  fit/matchup guidance, commentary and AI habits
  ([#466](https://github.com/ch-leon/nrl-sim/issues/466),
  [#467](https://github.com/ch-leon/nrl-sim/issues/467),
  [#468](https://github.com/ch-leon/nrl-sim/issues/468),
  [#469](https://github.com/ch-leon/nrl-sim/issues/469)).
- Save version stays 21 until the AI-habits task. Umbrella defence and stored
  Handling/Tackling stats are parked, per the tracker.

## Next

**Launch plumbing** ([tracker #456](https://github.com/ch-leon/nrl-sim/issues/456)):
decided 2 Nov; implementation remains open. The detailed hub write-up is in open
[PR #457](https://github.com/ch-leon/nrl-sim/pull/457), not yet on main.

- Buildable now: the pop-up shell with a test message
  ([#451](https://github.com/ch-leon/nrl-sim/issues/451)); live targeting needs analytics.
- Waiting on Leon's setup: Firebase hosting and domain
  ([#448](https://github.com/ch-leon/nrl-sim/issues/448)), push
  ([#449](https://github.com/ch-leon/nrl-sim/issues/449)), PostHog analytics and flags
  ([#450](https://github.com/ch-leon/nrl-sim/issues/450),
  [#452](https://github.com/ch-leon/nrl-sim/issues/452)), EmailOctopus
  ([#453](https://github.com/ch-leon/nrl-sim/issues/453)), Android tester distribution
  ([#454](https://github.com/ch-leon/nrl-sim/issues/454)), and privacy work
  ([#455](https://github.com/ch-leon/nrl-sim/issues/455)).
- Hosting and tester distribution must move before the planned repo privacy
  change. The current live build remains on GitHub Pages.

## Recently completed

- Module split of `live.ts` and `e2e-webkit.mjs`, without behaviour changes:
  [PR #443](https://github.com/ch-leon/nrl-sim/pull/443), merged 1 Nov.
- Repo slim: [PR #447](https://github.com/ch-leon/nrl-sim/pull/447), merged 1 Nov.
- Gameplay/UX and commercial-foundation trackers are closed:
  [#372](https://github.com/ch-leon/nrl-sim/issues/372),
  [#365](https://github.com/ch-leon/nrl-sim/issues/365). Commercial launch is still
  separate work; the live commercial switch remains off.
- The older live-sim, Nines, coach-call, interchange and living-league trackers
  are closed, so they are no longer listed as future work
  ([#83](https://github.com/ch-leon/nrl-sim/issues/83),
  [#68](https://github.com/ch-leon/nrl-sim/issues/68)).

## Later

Open backlog checked on 4 Nov 2026; these are not newly scheduled:

- Similar kits are hard to tell apart ([issue #340](https://github.com/ch-leon/nrl-sim/issues/340))
- iOS and Android apps ([issue #335](https://github.com/ch-leon/nrl-sim/issues/335))
- On-field scuffles ([issue #329](https://github.com/ch-leon/nrl-sim/issues/329))
- Judiciary and a club lawyer ([issue #328](https://github.com/ch-leon/nrl-sim/issues/328))
- Scrums ([issue #327](https://github.com/ch-leon/nrl-sim/issues/327))
- Set plays ([issue #326](https://github.com/ch-leon/nrl-sim/issues/326))
- League progression from a lower league ([issue #323](https://github.com/ch-leon/nrl-sim/issues/323))
- Three attacks still sit off with the break rule on ([issue #322](https://github.com/ch-leon/nrl-sim/issues/322))
- App store builds with Capacitor ([issue #89](https://github.com/ch-leon/nrl-sim/issues/89))

## Earlier review follow-ups (status not revalidated)

Carried forward from the 1 Nov hub rather than silently dropped. Confirm before
turning these into new work:

- Whether to make the check and iPhone browser test required in branch protection.
  [AGENTS.md](../../AGENTS.md) already requires green CI in the development process;
  branch-protection enforcement is a separate question.
- Tackle count after goal-line drop-outs or a penalty to the side with the ball.
- CI coverage for locked Coach calls tiles.
- A full tray covering the key-moment banner.
- The Coach calls page's short landscape scroll area.

## Ideas being discussed (not decided)

Source: Leon. None of these is an issue yet.

**Recruitment talks (Leon's idea, 31 Oct 2026, not decided). Open.** Longer talks
for stars and key re-signings, and a Scout staff role. Open: how talks work, who
they apply to and what a Scout does.

**Hometown team (Leon's idea, 31 Oct 2026, not decided). Open.** Pick a real town on
a new game to name your club and ground. Open: whose club it names, where the place
data comes from and whether any of it goes online.

**Labs controls phase 2 (source: Leon's brief for this hub, 1 Nov 2026). Open.**
More hands-on match controls in Labs. Open: which controls, and in what order.
