# NRL Sim

Start with docs/hub/ ([README.md](docs/hub/README.md)) for what NRL Sim is, what's in it and what's next.

This file covers how work moves through the repo. `CLAUDE.md` covers how the game
is built, where decisions live, and the conventions. The cloud setup below is the
short version of its **Cloud environment** section.

## Development process

1. **Issues.** Work comes in as GitHub issues, each with a plain "done when" line.
   Leon sometimes opens issues himself straight from a Claude planning session.
   Treat those like any other issue and pick them up from the issue list.
2. **Build.** Any of Cursor cloud agents, Claude Code or Codex, whichever has usage
   left (the split shifts with usage). One change per PR. Big refactors run alone.
3. **Check.** Always a different tool from the one that built it. The checker
   reviews against the issue's "done when" line and the diff, and lists problems
   rather than rewriting.
4. **Prove.** CI must be green: `check`, the `webkit (<group>)` shards and the
   `webkit` aggregate on the PR, plus the QA workflow (nightly, or run on demand).
   Nothing is done on an agent's say-so.
5. **Play-test.** Leon gets the live build link (https://ch-leon.github.io/nrl-sim/)
   and one line on what to try. Bugs he finds are batched into one fix-up PR.
6. **Merge** after CI is green and Leon gives a thumbs up. Post one short update,
   and stay quiet when nothing changed.

Update docs/hub/features.md Recently added (and roadmap.md if relevant) in every PR that changes the game.

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
