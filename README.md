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
