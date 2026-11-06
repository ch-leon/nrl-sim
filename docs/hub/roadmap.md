# Roadmap

Last updated: 2026-11-06

## Now

- Hometown setup: curated offline Australia and New Zealand towns plus free text, with editable club and ground names; ready for review ([PR #496](https://github.com/ch-leon/nrl-sim/pull/496)). Google Maps remains deferred ([tracker #489](https://github.com/ch-leon/nrl-sim/issues/489)).
- Split `live.ts` and `e2e-webkit.mjs` into modules, no behaviour change: open, awaiting Leon's thumbs up (source: [PR #443](https://github.com/ch-leon/nrl-sim/pull/443))
- Repo slim Leon approved: planned, no PR yet (source: the open PR list)

## Next (as of 1 Nov 2026)

- **Open, waiting on Leon:** make the check and the iPhone browser test required before merging?
- Reviewer polish, not yet filed:
  - The tackle count shows the old count after a goal-line drop-out, or a penalty to the side with the ball, until play restarts.
  - Locked Coach calls tray tiles are untested in CI.
  - A full tray covers more of the key-moment banner.
  - The Coach calls page scrolls in a short area in landscape.

- **Launch plumbing (decided 2 Nov 2026):** hosting, push, analytics, pop-ups, flags, email and privacy. Tracking: [issue #456](https://github.com/ch-leon/nrl-sim/issues/456), which has Leon's setup checklist. Decisions are in [marketing.md](marketing.md#engagement-and-launch-plumbing).
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

## Later

Open issues as of 1 Nov 2026 (from the GitHub issue list on 1 Nov 2026):

- Gameplay & UX pass, Leon's 12: all boxes ticked ([issue #372](https://github.com/ch-leon/nrl-sim/issues/372))
- Commercial foundations: all five built ([issue #365](https://github.com/ch-leon/nrl-sim/issues/365))
- Similar kits are hard to tell apart ([issue #340](https://github.com/ch-leon/nrl-sim/issues/340))
- iOS and Android apps ([issue #335](https://github.com/ch-leon/nrl-sim/issues/335))
- On-field scuffles ([issue #329](https://github.com/ch-leon/nrl-sim/issues/329))
- Judiciary and a club lawyer ([issue #328](https://github.com/ch-leon/nrl-sim/issues/328))
- Scrums ([issue #327](https://github.com/ch-leon/nrl-sim/issues/327))
- Set plays ([issue #326](https://github.com/ch-leon/nrl-sim/issues/326))
- League progression from a lower league ([issue #323](https://github.com/ch-leon/nrl-sim/issues/323))
- Three attacks still sit off with the break rule on ([issue #322](https://github.com/ch-leon/nrl-sim/issues/322))
- Make the match exciting (tracking) ([issue #94](https://github.com/ch-leon/nrl-sim/issues/94))
- App store builds with Capacitor ([issue #89](https://github.com/ch-leon/nrl-sim/issues/89))
- Balance with thousands of headless matches ([issue #87](https://github.com/ch-leon/nrl-sim/issues/87))
- Full match on the live sim ([issue #86](https://github.com/ch-leon/nrl-sim/issues/86))
- Prototype set on the live sim ([issue #85](https://github.com/ch-leon/nrl-sim/issues/85))
- Live match sim rebuild (tracking) ([issue #83](https://github.com/ch-leon/nrl-sim/issues/83))
- Switch to Rugby League Nines rules ([issue #77](https://github.com/ch-leon/nrl-sim/issues/77))
- Mid-match coach calls ([issue #73](https://github.com/ch-leon/nrl-sim/issues/73))
- Interchanges ([issue #70](https://github.com/ch-leon/nrl-sim/issues/70))
- Team selection, tactics, a living league (tracking) ([issue #68](https://github.com/ch-leon/nrl-sim/issues/68))

## Ideas being discussed (not decided)

Source: Leon. None of these is an issue yet.

**Recruitment talks (Leon's idea, 31 Oct 2026, not decided). Open.** Longer talks
for stars and key re-signings, and a Scout staff role. Open: how talks work, who
they apply to and what a Scout does.

**Labs controls phase 2 (source: Leon's brief for this hub, 1 Nov 2026). Open.**
More hands-on match controls in Labs. Open: which controls, and in what order.
