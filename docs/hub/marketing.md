# Marketing

Last updated: 2026-11-02 (status as of 2 Nov 2026)

Sources: `src/brand.ts`, `src/commercial/`, `docs/specs/commercial-*.md` and the
issues on [apps](https://github.com/ch-leon/nrl-sim/issues/335),
[entitlements](https://github.com/ch-leon/nrl-sim/issues/362),
[brand](https://github.com/ch-leon/nrl-sim/issues/363),
[paywall](https://github.com/ch-leon/nrl-sim/issues/364) and
[commercial foundations](https://github.com/ch-leon/nrl-sim/issues/365).

## Name

**Open.** The game is still "NRL Sim". A league-neutral name is to come, shown with
"a SuperCOOKED game" once it's chosen (the line is built but hidden). Renaming is a
change to `src/brand.ts` and a rebuild; storage keys never change, so no career is
lost. Naming and trademarks are the apps roadmap's biggest risk: stores often
reject "NRL" and real club names (source: [issue #335](https://github.com/ch-leon/nrl-sim/issues/335)). Players and clubs
in the game are already fictional.

## Disclaimer

From `src/brand.ts`, shown in Settings and meant for the store listing:

> Not affiliated with or endorsed by the NRL, its clubs or players.

## Store copy and screenshots

- **Store copy: Open.**
- **Screenshots: Open.**

## Pricing

Premium, with a free demo and a one-off unlock. Tiers in the code: **demo**,
**standard** (full game on the platform it was bought on) and **all platforms**
(full game everywhere).

- **Price: Open.** None set. The paywall shows a placeholder dash until a store
  supplies the price.
- **Cross-buy: Open.** Is cross-buy included in standard, or only in all platforms?
  The code switch is off (standard unlocks its own platform).
- **Demo length: Open.** Code placeholder: season 1 up to round 3, marked as Leon's
  decision.
- **Today's web players: Open.** Code placeholder: careers already on a device keep
  the full game.

## Payments

- **RevenueCat: planned** for who owns what across Apple, Google and web. Today
  the game uses a local stub with a RevenueCat-shaped seam: no account, SDK or keys.
- **Web checkout: Open.** Paddle or Stripe?
- Each country's store rules (in-app only, link out, "Already bought? Log in") drive
  what the paywall shows (`src/commercial/storeRules.ts`).
- The demo gate, paywall and login sit behind the commercial switch, which is off on
  the live build. The storage adapter, content packs and brand config are in use.

## Store accounts

Not set up, as of 1 Nov 2026 (source: Leon). Apple Developer is about US$99 a
year; Google Play is a one-off US$25 (source: [issue #335](https://github.com/ch-leon/nrl-sim/issues/335)).

## Engagement and launch plumbing

Decided by Leon on 2 Nov 2026. Work is tracked in
[issue #456](https://github.com/ch-leon/nrl-sim/issues/456), which also holds
Leon's setup checklist. Free-tier numbers were checked on 2 Nov 2026 and link to
the official pricing pages.

| What | Decision | Why | Free tier (official source) | Issue |
| --- | --- | --- | --- | --- |
| Hosting | **Firebase Hosting** on our own domain. Nothing player-facing on GitHub or GitHub Pages. | The repo goes private at launch, and on GitHub's free plan Pages needs a public repo ([GitHub pricing](https://github.com/pricing)). Firebase is already the push provider, so it's one project. | Spark: 10 GB stored, 360 MB/day transfer, custom domain + SSL. Blaze: $0.15/GB after ([Firebase pricing](https://firebase.google.com/pricing)) | [#448](https://github.com/ch-leon/nrl-sim/issues/448) |
| Push | **Firebase Cloud Messaging (FCM)** on web and Android. | Leon's pick. It's free and can be sent from the Firebase console. On iPhone it only works once the game is added to the Home Screen (iOS 16.4+) ([WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)). | No cost ([Firebase pricing](https://firebase.google.com/pricing)) | [#449](https://github.com/ch-leon/nrl-sim/issues/449) |
| Analytics | **PostHog**, EU cloud, free plan, anonymous and cookieless (`cookieless_mode: 'always'`), loaded after the title screen. **No Google Analytics.** | One tool covers analytics, flags, A/B tests, session replay and pop-up targeting. Over-limit usage is dropped, not billed. Cookieless keeps us clear of consent banners and children's data ([PostHog data collection](https://posthog.com/docs/privacy/data-collection)). | 1M events, 5K recordings, 1M flag requests, 1,500 survey responses a month. 1 project, 1-year retention ([PostHog pricing](https://posthog.com/pricing)) | [#450](https://github.com/ch-leon/nrl-sim/issues/450) |
| Pop-ups | **Our own styled pop-up** (text, button, image). PostHog decides who sees it; **Firebase Remote Config is the fallback only.** | Leon wants pop-ups, not inbox items. Firebase In-App Messaging has no web support ([docs](https://firebase.google.com/docs/in-app-messaging)). PostHog surveys in API mode let us draw our own UI ([docs](https://posthog.com/docs/surveys/implementing-custom-surveys)). | Remote Config: 100k fetches/day free ([Firebase pricing](https://firebase.google.com/pricing)) | [#451](https://github.com/ch-leon/nrl-sim/issues/451) |
| Flags and A/B tests | **PostHog remote flags**, for presentation only. They **never** change match results, the RNG, sim knobs, the save or what you own. `src/commercial/flags.ts` stays as the build-time switches. | This keeps matches and saves reproducible and keeps the fingerprint pins and `SAVE_VERSION` stable. | Included in the 1M flag requests above | [#452](https://github.com/ch-leon/nrl-sim/issues/452) |
| Email | **EmailOctopus**, sending from our own verified domain. One shared list for all SuperCOOKED games, tagged per game. Export the list regularly. Backups: Loops, then Plunk. | It has the biggest free tier of those compared. The list can move if we switch. | EmailOctopus: 2,500 subscribers, 10,000 emails/mo, 3 automations ([pricing](https://emailoctopus.com/pricing)). Loops: 1,000 contacts, 4,000 sends/30 days ([pricing](https://loops.so/pricing)). Plunk: 1,000 emails/mo ([pricing](https://www.useplunk.com/pricing)) | [#453](https://github.com/ch-leon/nrl-sim/issues/453) |
| Android tester build | **Firebase App Distribution**, replacing the `android-test-latest` GitHub release. The final app id replaces the placeholder `au.supercooked.nrlsim.test`. | The repo goes private. Changing the app id makes it a new app, so testers reinstall. | No cost ([Firebase pricing](https://firebase.google.com/pricing)) | [#454](https://github.com/ch-leon/nrl-sim/issues/454) |
| Privacy | A **privacy policy page** covering analytics, push, email and overseas storage (EU/US). A **legal check** against the OAIC Children's Online Privacy Code before launch. | Some NRL fans are under 18. The code must be registered by 10 Dec 2026 ([OAIC](https://www.oaic.gov.au/privacy/privacy-registers/privacy-codes/childrens-online-privacy-code)). | n/a | [#455](https://github.com/ch-leon/nrl-sim/issues/455) |

**Email rules (Spam Act).** We only email people who opted in: the consent box
starts unticked, and double opt-in keeps the record. Every email identifies the
sender (business name/ABN and contact details) and has a working unsubscribe that is
honoured within 5 working days ([ACMA](https://www.acma.gov.au/avoid-sending-spam)).
No email address goes in the save or in analytics.

**X.** Used for announcements and for cross-promoting future games. The agent
drafts posts; Leon posts them. No repo work, so there's no issue for this.

**Cross-promotion of future games.** Every SuperCOOKED game uses the same Firebase
project, the same EmailOctopus list (tagged per game) and X. The pop-up (#451)
can promote a new game to current players.

**Moving off GitHub Pages.** No "we've moved" notice: Leon is the only player
today and will move his career with save export/import.

**Open.** The custom domain, the final Android app id, and the result of the
children's privacy code check. All three are on Leon's checklist in
[issue #456](https://github.com/ch-leon/nrl-sim/issues/456).
