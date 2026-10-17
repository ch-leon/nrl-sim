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
Kick-chase, All-out · Slide, Rush, Compressed), e.g. `#lab?hatk=expansive&adef=rush`.
