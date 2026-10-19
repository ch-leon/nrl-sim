# NRL Sim

A Kairosoft-style rugby league club management sim. Build your grounds, recruit
and train a squad, and watch Nines matches play out. Phaser 3 + TypeScript, with
every pixel of art generated in code.

**Play it:** https://ch-leon.github.io/nrl-sim/ (deployed from `main`; installable
as an app from the browser's share / install menu)

## Develop

```bash
npm install
npm run dev      # http://localhost:5173 (add `-- --host` to open it on a phone on the same Wi-Fi)
npm test         # vitest
npm run build    # typecheck + production build into dist/
```

CI runs the typecheck, tests and build on every PR. Merges to `main` deploy to
GitHub Pages automatically. Architecture notes live in `docs/ARCHITECTURE.md`
and feature specs in `docs/specs/`.

## Match lab

The live match simulation (`docs/specs/BAK-207-live-match-sim.md`) is being
built in the open at **https://ch-leon.github.io/nrl-sim/#lab**. Pick two
teams and a seed, then play, pause, step one tick, slow down or scrub back.
**⚑ Flag** copies a code like `nrl1:7:1240:crushers~larrikins:…` that pins the
exact moment on screen with your note — paste it into an issue or chat and the
same frame can be rebuilt. `#lab?flag=<code>` (or the Load button) reopens it.
**Skills** switches the special-skill sandbox (`docs/specs/BAK-208-match-rules-and-skills.md`
§3): as rolled, none, or every player a superstar (`#lab?traits=stars`). The **H / A**
pickers set each side's attack and defence preset (§5: Grind, Balanced, Expansive,
Kick-chase, All-out · Slide, Rush, Compressed), e.g. `#lab?hatk=expansive&adef=rush`;
the line under them names the style each side is playing. Changing any picker restarts
the match from the kick-off on the same seed.
**Legs** starts everyone fresh, on last-ten-minute legs or cooked (§8,
`#lab?legs=late`, `legs=spent`); a bar over a tackled carrier shows the wrestle (§8.1).
**Bench** sets how hard both coaches rotate their four interchange players (off,
standard, heavy; `#lab?bench=heavy`): after a try the most tired men jog off and fresh
ones jog on (**ON!**). Every try is followed by a drop-kick conversion (**GOAL!** or
**MISSED!**), and late in a close match the kicker drops for a **FIELD GOAL!**.
The lab plays a whole Nines match: two 9:00 halves with the clock and score in the
label, half-time and full time; **⏩** skips to the next break. Speed streaks mark
anyone sprinting, and a thin gas bar sits under the carrier and whoever is sprinting
at him (§8.2); **COOKED!** means a player's legs are spent,
**RUN DOWN!** that a carrier was caught from behind after a break.
Balance experiments (many seeds, knobs overridden by name) run headless with
`npm run balance` — see `balance/README.md`.
Every tunable number, with its file and current value, is listed in
`docs/specs/BAK-208-tuning.md`.
