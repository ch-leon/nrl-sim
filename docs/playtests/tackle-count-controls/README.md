# Tackle count and Labs gestures — 30 October 2026

Landscape phone captures at 667×375, 844×390 and 956×330, each at Normal (1), Large (1.15) and Larger (1.3) text. The coach tray is open and LAST TACKLE is visible. Nines uses five-tackle sets, so the denominator stays 5.

Captured with Playwright's mobile/touch iPhone context, DPR 2, using the installed Chromium as an explicit fallback. WebKit's download was blocked by this cloud environment's network policy; these are Chromium captures, not Safari captures. The same smoke phase runs in WebKit CI with its existing 20-minute job limit.

Reproduce from the implementation branch:

```sh
npm run e2e:webkit -- --controls-only
# Explicit fallback if WebKit is unavailable:
E2E_CHROMIUM_PATH=/usr/bin/chromium npm run e2e:webkit -- --controls-only
```

The smoke waits for the player's team to possess the ball and reach the last tackle, checks the count for clipping and overlap with the score, coach tray, bottom controls, Skip and LABS badge, then sends a backward drag without a hold and waits for a kick event. `controlled-kick.png` captures the result.

These binary review artifacts belong only on `codex/tackle-count-controls-screenshots`; do not merge this branch into main.
