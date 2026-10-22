# NRL Sim

Read `CLAUDE.md` for how the game is built, where decisions live, and the
conventions. The cloud setup below is the short version of its **Cloud environment**
section.

## Checks

What CI runs on every PR:

```bash
npx tsc --noEmit
npx vitest run
npm run build
```

## Cursor Cloud specific instructions

`scripts/cloud-setup.sh` installs Node 22 if the image does not already have it,
runs `npm ci` when `node_modules` is missing or stale, and links a Chromium that
matches `playwright-core` at `/opt/pw-browsers/chromium`.

- Cursor cloud agents run it from `.cursor/environment.json` (`install`) when the
  environment is built.
- Claude Code on the web runs it from the SessionStart hook in `.claude/settings.json`,
  only when `CLAUDE_CODE_REMOTE=true`. A failure is logged and the session continues.

`npm run e2e:season` and `npm run e2e:perf` launch that Chromium (`CHROMIUM_PATH`
overrides the path). `npm run e2e:webkit` needs WebKit, which setup does not install:

```bash
npx playwright-core install --with-deps webkit
```
