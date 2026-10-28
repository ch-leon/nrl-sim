# #350 P1 portrait menus: screenshots (not for merging)

WebKit as an iPhone (touch, DPR 2 or 3). Larger text unless the name says otherwise.

- `before/`: main at 375×667 and 320×568. Upright, every screen showed the rotate card
  (`*-home.png`, `*-squad.png`); `before/under-card/` is what was under it, the card hidden.
- `after/`: this branch at the same sizes: the title, Club home (`*-home.png`), Squad,
  League (`*-fixtures.png`), Build, Office's tiles (`*-office-.png`) and Finance.
- `after/menus/`: every menu the e2e phase (`runPortraitMenus`) walks, at Larger, at
  320×568, 375×667, 390×844 and 430×932.
- `after/match-390x844/`: See the grounds (the card and ◂ Back), placement under the card,
  the kick-off upright, a turn mid-match, the full-time report upright, the reload.
- `after/playtest-390x844/`: the play-test, step by step.
- `landscape-568x320-larger/`: `main-*` and `this-*`, the same views on both (player names
  are random per new game; the layout is the same).
