# Roadmap

Last updated: 2026-11-07

Status checked against GitHub on 7 Nov 2026. Merged tooling is not the same as a
live gameplay change; work still open below has not shipped.

## Now

- **Expansive attack still under par** ([issue #322](https://github.com/ch-leon/nrl-sim/issues/322), open).
  The Speed diagnostic and four Speed levers merged in
  [PR #514](https://github.com/ch-leon/nrl-sim/pull/514), with every lever **off**, so
  no match changed. Expansive is still about 41% of level-rating games (−8.4 against
  strength), well under the other attacks. The next pass looks at why a rushing line
  shuts out the wide game; it is not a Speed question.
- **Labs: shorter matches** ([issue #513](https://github.com/ch-leon/nrl-sim/issues/513)):
  about 4 minutes of watching at ×1, behind a Labs toggle that is off by default.
  Planned and awaiting Leon's go; no PR yet.

## Next

- **Launch plumbing (decided 2 Nov 2026):** hosting, push, analytics, pop-ups, flags, email and privacy. Tracking: [issue #456](https://github.com/ch-leon/nrl-sim/issues/456), which has Leon's setup checklist. Decisions are in [marketing.md](marketing.md#engagement-and-launch-plumbing) ([PR #457](https://github.com/ch-leon/nrl-sim/pull/457), merged 6 Nov). Implementation is still open.
  - Buildable now: the pop-up itself, with a test message ([issue #451](https://github.com/ch-leon/nrl-sim/issues/451)).
  - Waiting on Leon's setup:
    - Firebase Hosting on our own domain ([issue #448](https://github.com/ch-leon/nrl-sim/issues/448))
    - push ([issue #449](https://github.com/ch-leon/nrl-sim/issues/449))
    - PostHog analytics ([issue #450](https://github.com/ch-leon/nrl-sim/issues/450))
    - remote flags and A/B tests ([issue #452](https://github.com/ch-leon/nrl-sim/issues/452))
    - EmailOctopus sign-up ([issue #453](https://github.com/ch-leon/nrl-sim/issues/453))
    - Android tester build via App Distribution ([issue #454](https://github.com/ch-leon/nrl-sim/issues/454))
    - privacy policy and the children's privacy code check ([issue #455](https://github.com/ch-leon/nrl-sim/issues/455))
  - The repo goes private at launch, once hosting and the tester build have moved.
    Until then the live build stays on GitHub Pages.

## Recently completed

- **Set plays, phase 1** ([issue #326](https://github.com/ch-leon/nrl-sim/issues/326)):
  the plays catalogue and set plays in the match engine, merged to main in
  [PR #515](https://github.com/ch-leon/nrl-sim/pull/515) on 7 Nov. It is **off by
  default**: matches without plays are unchanged and the save version stays 22.
  The issue stays open for the later phases: club screens, rival plays and the balance
  pass.
- **Strategy counters** ([tracker #470](https://github.com/ch-leon/nrl-sim/issues/470), closed):
  - Matchup reports, derived ratings and the Grind-to-Tight rebuild
    ([PR #471](https://github.com/ch-leon/nrl-sim/pull/471),
    [PR #472](https://github.com/ch-leon/nrl-sim/pull/472),
    [PR #473](https://github.com/ch-leon/nrl-sim/pull/473)).
  - Own-style fit and the Slide, Rush and Compressed counters
    ([PR #500](https://github.com/ch-leon/nrl-sim/pull/500) to
    [PR #503](https://github.com/ch-leon/nrl-sim/pull/503)).
  - Counters switched on and validated in the live game
    ([PR #506](https://github.com/ch-leon/nrl-sim/pull/506)).
  - The Tight rename on every screen, plan fit, matchup scouting and half-time
    readouts, counter commentary and "out-schemed" reasons
    ([PR #507](https://github.com/ch-leon/nrl-sim/pull/507),
    [PR #510](https://github.com/ch-leon/nrl-sim/pull/510),
    [PR #512](https://github.com/ch-leon/nrl-sim/pull/512)).
  - Rivals counter the player's recent plans by difficulty
    ([PR #511](https://github.com/ch-leon/nrl-sim/pull/511)). This took the save to
    version 22.
- **New game experience** ([tracker #489](https://github.com/ch-leon/nrl-sim/issues/489), still open):
  - Phase 1: coach name, one guide voice and face, the "Coach says" line, a recruit
    shortlist of 4, runway in weeks, and difficulty lines
    ([PR #490](https://github.com/ch-leon/nrl-sim/pull/490) to
    [PR #494](https://github.com/ch-leon/nrl-sim/pull/494),
    [PR #499](https://github.com/ch-leon/nrl-sim/pull/499)).
  - Phase 2: the facility unlock ladder with a veteran skip, and Finance, Staff and
    Contracts opening in season one
    ([PR #497](https://github.com/ch-leon/nrl-sim/pull/497),
    [PR #498](https://github.com/ch-leon/nrl-sim/pull/498)).
  - Phase 3 and 4: expansion-club framing
    ([PR #504](https://github.com/ch-leon/nrl-sim/pull/504)), the curated offline
    Australia and New Zealand town list plus free text
    ([PR #496](https://github.com/ch-leon/nrl-sim/pull/496)), the nearest club as derby
    rival ([PR #505](https://github.com/ch-leon/nrl-sim/pull/505)), two pre-season trial
    weeks ([PR #508](https://github.com/ch-leon/nrl-sim/pull/508)) and an English-style
    league for UK home towns ([PR #509](https://github.com/ch-leon/nrl-sim/pull/509)).
  - Still open: the board grant in tranches is parked
    ([issue #483](https://github.com/ch-leon/nrl-sim/issues/483)), and Google Maps
    stays deferred.
- Module split of `live.ts` and `e2e-webkit.mjs`, without behaviour changes:
  [PR #443](https://github.com/ch-leon/nrl-sim/pull/443), merged 1 Nov.
- Repo slim: [PR #447](https://github.com/ch-leon/nrl-sim/pull/447), merged 1 Nov.
- Gameplay/UX and commercial-foundation trackers are closed:
  [#372](https://github.com/ch-leon/nrl-sim/issues/372),
  [#365](https://github.com/ch-leon/nrl-sim/issues/365). Commercial launch is still
  separate work; the live commercial switch remains off.

## Later

Open backlog checked on 7 Nov 2026; these are not newly scheduled:

- Similar kits are hard to tell apart ([issue #340](https://github.com/ch-leon/nrl-sim/issues/340))
- iOS and Android apps ([issue #335](https://github.com/ch-leon/nrl-sim/issues/335))
- On-field scuffles ([issue #329](https://github.com/ch-leon/nrl-sim/issues/329))
- Judiciary and a club lawyer ([issue #328](https://github.com/ch-leon/nrl-sim/issues/328))
- Scrums ([issue #327](https://github.com/ch-leon/nrl-sim/issues/327))
- Set plays, later phases: club screens, rival plays and the balance pass ([issue #326](https://github.com/ch-leon/nrl-sim/issues/326); phase 1 merged, off by default)
- League progression from a lower league ([issue #323](https://github.com/ch-leon/nrl-sim/issues/323))
- Expansive still under par ([issue #322](https://github.com/ch-leon/nrl-sim/issues/322); in Now)
- App store builds with Capacitor ([issue #89](https://github.com/ch-leon/nrl-sim/issues/89))
- Open questions carried over from retired plan docs ([issue #446](https://github.com/ch-leon/nrl-sim/issues/446))
- Launch plumbing implementation ([issue #456](https://github.com/ch-leon/nrl-sim/issues/456); see Next)
- New game experience tracker and the parked board grant
  ([issue #489](https://github.com/ch-leon/nrl-sim/issues/489),
  [issue #483](https://github.com/ch-leon/nrl-sim/issues/483))

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

**Labs controls phase 2 (source: Leon's brief for this hub, 1 Nov 2026). Open.**
More hands-on match controls in Labs. Open: which controls, and in what order.

The hometown team idea (31 Oct) has shipped as the offline town list, so it is
under Recently completed.
