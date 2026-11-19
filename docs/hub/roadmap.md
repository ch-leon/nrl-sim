# Roadmap

Last updated: 2026-11-19

Status checked against GitHub on 7 Nov 2026. Merged tooling is not the same as a
live gameplay change; work still open below has not shipped.

## Now

- **Attacking shapes.** Forward pods and edge shifts ([PR #715](https://github.com/ch-leon/nrl-sim/pull/715)) and back-door support runs ([PR #722](https://github.com/ch-leon/nrl-sim/pull/722)). Decoys and wider balance acceptance remain open. [Tracker #649](https://github.com/ch-leon/nrl-sim/issues/649)

- **Match presentation — whole-match consistency:** [PR #706](https://github.com/ch-leon/nrl-sim/pull/706), merged 17 November, fixes the binned player and detached overlays at the whistle. Officials, benches and crowd already read consistently with the merged art in the clear/rain/wind audit. Complete-match, interchange and normal/fast-playback evidence is recorded in the PR; real-phone validation remains. Follow the [implementation plan](../plans/2026-11-match-art-and-animation.md).

- **Merged animation foundation:** Leon reviewed the clip and approved the full stack, merged on 17 November 2026 through [PR #705](https://github.com/ch-leon/nrl-sim/pull/705) at `f9f1641`. It includes the art foundation (#697), movement (#699), contact (#701), handling (#703) and connected big moments. The plan records validation and remaining QA/phone performance work. Earlier receiver commitment and pre-release calls remain a separate gameplay change under #672/#649.

- **Match watchability** ([tracker #626](https://github.com/ch-leon/nrl-sim/issues/626)): a review of how the live match looks, moves, sounds and plays, filed as 49 issues. Waves 1 to 3 (phone view, pacing, facing, run cycle, impact, sound, harness telemetry; then commentary, player variety, ball and camera, coach-call payoff, match occasion, frame-time work; then referee and stadium life, a bigger crowd, body language and trait cues) merged in [PR #676](https://github.com/ch-leon/nrl-sim/pull/676); wave 4 (contact variety, the kicker's routine, walk-offs, eyes on the bomb) is in [PR #681](https://github.com/ch-leon/nrl-sim/pull/681). Still owed a phone play-test: frame rate at the new resolution and the new sounds have not been checked on a device. The gameplay issues (attack shapes, last-tackle options, score and clock, held-up) follow, each its own PR measured against the new harness telemetry; an open runner calling for the ball ([#672](https://github.com/ch-leon/nrl-sim/issues/672)) waits on attack shapes, since the sim picks its receiver only as the pass leaves.

- **Defensive retreat play-test** ([PR #677](https://github.com/ch-leon/nrl-sim/pull/677)): watch a match at ×1 and check that defenders get back 10m before rejoining play, especially on dummy-half darts.

- **[Match transition and big-moment release](../specs/match-big-moments.md)** ([issue #588](https://github.com/ch-leon/nrl-sim/issues/588)): integrate the completed catch/pass/ruck transitions and kicks/high-takes/try celebrations onto released build #584. The candidate is being checked for the next playable build; release evidence belongs in its PR.

- **Match-art phone play-test** ([release PR and verification](https://github.com/ch-leon/nrl-sim/pull/584)): play a full match in landscape at ×1 and your usual speed; check player recognition, possession and tacklers releasing into play-the-ball. The PR records the deployed build and required review/CI/QA evidence.

- **Career competitions: league selection shipped; events remain** ([tracker #323](https://github.com/ch-leon/nrl-sim/issues/323)).
  **Design expanded and approved 16 November:** [career opportunities v0.2](../specs/career-opportunities.md)
  replaces forced player promotion with winning to unlock leagues and choosing
  entry each season. Add seasonal windows, player assignments that can overlap
  club fixtures, watched/coached individual challenges, playful beach/fives events,
  recurring opponents and connected rewards. Gear is later. The
  [updated plan](../plans/2026-11-career-competitions.md) separates the delivery
  slices: league choice and unlocks are shipped. The first normal Open Cup adds
  seasonal registration and cash/reputation/trophies in [PR #736](https://github.com/ch-leon/nrl-sim/pull/736)
  ([evidence and release gates](../status/2026-11-open-cup.md)).
  The first assignment, [Skills Camp](../specs/player-assignments.md), is implemented in
  [PR #742](https://github.com/ch-leon/nrl-sim/pull/742): book during Weeks 1–4, miss the Week 5 opener, return
  before Week 6 with development. [Delivery evidence](../status/2026-11-player-assignments.md).
  Further assignments, coached challenges, other formats and their rewards remain later work.
  Earlier structural execution context follows:
  [#569](https://github.com/ch-leon/nrl-sim/issues/569) publishes the
  [technical contract](../specs/career-competitions.md) against current main;
  [delivery status](../status/2026-11-career.md) records evidence and dependencies.
  #536–#539 and #545 have merged, clearing structural state/calendar/division
  work. Remaining annual-cap finance tasks #560–#562 and progression tuning
  #547 stay open. Wider balance and future capacity rewards retain their own
  prerequisites; the first cup cash uses implemented FIN-04 fixture income.
  The state/calendar foundation, isolated AU/UK regional setup and original
  isolated Open Cup sporting prototype are
  merged through [PR #591](https://github.com/ch-leon/nrl-sim/pull/591).   The finance
  model is approved for initial testing: [contract](../specs/finance-prototype.md),
  executable quotes and opening inventory ([PR #595](https://github.com/ch-leon/nrl-sim/pull/595)).
  New careers now keep cash and the annual cap apart ([#557](https://github.com/ch-leon/nrl-sim/issues/557)):
  salaries are a season commitment and do not leave the bank. Signings, renewals
  and releases now follow the cash and cap rules ([#558](https://github.com/ch-leon/nrl-sim/issues/558)):
  a signing needs the fee and cap room, a renewal is free, only in the last
  season of the current deal, and must fit the cap in the season it starts.
  A release is refused when the cash is short. Choosing two or three seasons
  at signing is not in this slice; it stays with the finance presentation
  ([#561](https://github.com/ch-leon/nrl-sim/issues/561)). Rival signings now need both cap room and cash.
  Played-match income and investment costs ([PR #695](https://github.com/ch-leon/nrl-sim/pull/695))
  replace passive weekly income with saved, once-only fixture receipts. Staff
  appointments cost cash upfront; construction records its paid cost for refunds.
  Cap upgrades ([#560](https://github.com/ch-leon/nrl-sim/issues/560)), the complete
  finance-screen cleanup ([#561](https://github.com/ch-leon/nrl-sim/issues/561)),
  and integrated multi-season balance acceptance (#562) remain open.
  Funded sales and durable player histories merged through
  [PR #716](https://github.com/ch-leon/nrl-sim/pull/716), with final
  independent-tool/CI/QA gates recorded in its
  [evidence report](../status/2026-11-player-continuity.md).
  League selection is live in AU and UK: explicit New Game entry, permanent
  title unlocks and deliberate annual choices, with club cap capacity retained
  when moving down. [Merged PR #719](https://github.com/ch-leon/nrl-sim/pull/719)
  passed independent Claude review, all CI/WebKit gates and full QA; the public
  confirmation/reload flow was verified. [Release evidence](../status/2026-11-league-selection.md)
  Optional cup registration, cash/reputation/honours and entry/report/trophy views
  are implemented in [PR #736](https://github.com/ch-leon/nrl-sim/pull/736). Its review and release gates are recorded there.
  Assignments, watched individual challenges, distinct small-sided events,
  future capacity rewards and wider career balance remain subsequent work.
  The approved product direction is recorded in
  [PR #709](https://github.com/ch-leon/nrl-sim/pull/709).
- **Expansive attack still under par** ([issue #322](https://github.com/ch-leon/nrl-sim/issues/322), open).
  The Speed diagnostic and four Speed levers merged in
  [PR #514](https://github.com/ch-leon/nrl-sim/pull/514), with every lever **off**, so
  no match changed. Expansive is still about 41% of level-rating games (−8.4 against
  strength), well under the other attacks. The next pass looks at why a rushing line
  shuts out the wide game; it is not a Speed question.

## Next

- **Receiver preparation merged ([PR #707](https://github.com/ch-leon/nrl-sim/pull/707), 17 November):** the ordinary dummy-half chooses his intended recipient during the existing hold, so that runner can call before release. This addresses #672 with explicit cancellation and unchanged interception/spill rules. Wider attack shapes remain #649. The balance comparison records existing target gaps; real-phone playtesting and separate QA remain release work.

- **Launch plumbing (decided 2 Nov 2026):** hosting, push, analytics, pop-ups, flags, email and privacy. Tracking: [issue #456](https://github.com/ch-leon/nrl-sim/issues/456), which has Leon's setup checklist. Decisions are in [marketing.md](marketing.md#engagement-and-launch-plumbing) ([PR #457](https://github.com/ch-leon/nrl-sim/pull/457), merged 6 Nov). Implementation is still open.
  - **Before launch:** Developer settings is shown in Settings on every build, including GitHub Pages and the Android test APK. Set `VITE_DEV_SETTINGS=0`, or remove Developer settings, before launch. Seeing the page does not change a career.
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

- **[Approved match player art and contact animations](../specs/match-art-prototype.md)** ([PR #584](https://github.com/ch-leon/nrl-sim/pull/584)): integrated into career matches and `/#lab`, including the corrected tackle-leg reach and lowered stance. `/#artlab` retains comparisons. The [original handover](../handoffs/match-art-playable-build.md) records the recovered source and historical checks; the release PR is the verification record. Transition polish and big moments remain separate work after phone feedback.

- **Set plays, phases 1 and 2** ([issue #326](https://github.com/ch-leon/nrl-sim/issues/326)):
  - Phase 1: the plays catalogue and set plays in the match engine, merged in
    [PR #515](https://github.com/ch-leon/nrl-sim/pull/515) on 7 Nov. Matches without
    plays are unchanged; the save stayed at version 22.
  - Phase 2, the club screens: attack coaches, the Office Playbook and a Plays picker
    on Lineup, merged in [PR #516](https://github.com/ch-leon/nrl-sim/pull/516) on
    7 Nov. A side runs plays only if it took some in, and rivals take none yet. This
    took the save to version 23.
  - The issue stays open for the live tray and pop-ups, rival plays and the balance
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
- Set plays, later phases: the live tray and pop-ups, rival plays and the balance pass ([issue #326](https://github.com/ch-leon/nrl-sim/issues/326); phases 1 and 2 merged)
- League progression and seasonal competition choice ([issue #323](https://github.com/ch-leon/nrl-sim/issues/323); expanded approved design in Now)
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

## Designs and ideas

Source: Leon. Approval and delivery status are stated per item; an approved
direction does not mean its implementation has shipped.

**Career opportunities (approved 16 Nov 2026; foundation execution started earlier).**
The [v0.2 design](../specs/career-opportunities.md) and
[revised plan](../plans/2026-11-career-competitions.md) govern the expanded scope:
select eligible leagues, unlock harder choices through titles, send individuals
and groups away, and choose between seasonal events. Keep main leagues believable
and make special events/opponents/rewards playful. Personal XP/traits/badges,
sponsors, bounded cap rewards and invitation chains provide goals; gear is later.
Design direction is agreed; named events and numerical balance are working designs.
The older implementation and filing context below is retained for traceability:
The [Notion specification](https://app.notion.com/p/4150870d4c44810c880ae3395086e9d0)
is filed in NRL Sim HQ → Specs & Decisions, linked to NRL Sim and **In review**.
[Tracker #323](https://github.com/ch-leon/nrl-sim/issues/323) links 14 scoped issues;
[#569](https://github.com/ch-leon/nrl-sim/issues/569) publishes the versioned
[execution contract](../specs/career-competitions.md) and prototype inputs. First deliver the league climb, persistent
players and Open Cup; Sponsor Shield and Rising Stars follow, then a later
Champions Series. The further-event catalogue stays open. Counts, prizes and cap
percentages are explicit working defaults. Reuse finance
[#555](https://github.com/ch-leon/nrl-sim/issues/555) (annual salary cap, separate
cash) and player progression [#535](https://github.com/ch-leon/nrl-sim/issues/535),
rather than duplicating their mechanisms or save policy. The
[original concept](../plans/2026-11-career-competitions.md) is retained as history
and points to the current spec.

**Recruitment talks (Leon's idea, 31 Oct 2026, not decided). Open.** Longer talks
for stars and key re-signings, and a Scout staff role. Open: how talks work, who
they apply to and what a Scout does.

**Labs controls phase 2 (source: Leon's brief for this hub, 1 Nov 2026). Open.**
More hands-on match controls in Labs. Open: which controls, and in what order.

The hometown team idea (31 Oct) has shipped as the offline town list, so it is
under Recently completed.
