// tests/qa/corpus.test.ts — the save corpus: real saves dumped by the phone
// playthrough (scripts/e2e-season.mjs writes e2e-output/saves/) and committed as
// tests/fixtures/saves/v<version>-<point>.json. Every one must keep loading as the
// game moves on: it migrates to SAVE_VERSION, passes the soak's invariant checks,
// and plays a whole season headless through every system. One file per save
// version at each point, never edited after it lands (tests/fixtures/saves/README.md).
/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { SAVE_VERSION } from '../../src/core/state';
import { migrateState } from '../../src/core/save';
import { checkState, runSoak } from '../../src/qa/soak';

// The tsconfig has no Node types, so the directory is read with Vite's glob
// (the test runs under vitest), not node:fs.
const saves = import.meta.glob('../fixtures/saves/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const files = Object.keys(saves).sort();

describe('save corpus', () => {
  it('has at least one save', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    describe(file.slice(file.lastIndexOf('/') + 1), () => {
      const raw = saves[file] as { version?: number; season?: number; week?: number };
      const name = file.slice(file.lastIndexOf('/') + 1);

      it('is named after the version it was saved at, and that version is not from the future', () => {
        expect(name.startsWith(`v${raw.version}-`), `${name} declares version ${raw.version}`).toBe(true);
        expect(raw.version).toBeLessThanOrEqual(SAVE_VERSION);
      });

      it('migrates to SAVE_VERSION and passes checkState', () => {
        const res = migrateState(raw);
        expect(res.ok, res.ok ? '' : res.message).toBe(true);
        if (!res.ok) return;
        expect(res.state.version).toBe(SAVE_VERSION);
        expect(checkState(res.state)).toEqual([]);
      });

      it('plays a season headless with no problems', () => {
        const r = runSoak({ seed: 1, seasons: 1, mode: 'managed', fromSave: raw });
        expect(r.problems).toEqual([]);
        expect(r.seasons.length, 'reached the next season').toBe(1);
      }, 60_000);
    });
  }
});
