// Immutable historical saves now verify the new-career refusal policy (#536).
// Supported current-format fixtures validate and play on through the systems;
// they are added alongside old files, never substituted for historical bytes.
/// <reference types="vite/client" />
import { beforeAll, describe, it, expect } from 'vitest';
import { preparePack } from '../../src/content';
import { coachAddress } from '../../src/ui/coachName';
import { SAVE_VERSION } from '../../src/core/state';
import { WEEKS_PER_SEASON } from '../../src/config';
import { migrateState } from '../../src/core/save';
import { checkState, runSoak } from '../../src/qa/soak';

// The tsconfig has no Node types, so the directory is read with Vite's glob
// (the test runs under vitest), not node:fs.
const saves = import.meta.glob('../fixtures/saves/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const files = Object.keys(saves).sort();
const versionOf = (file: string): number => (saves[file] as { version?: number }).version ?? 0;
const versions = files.map(versionOf);
/** The versions whose saves play a whole season: the oldest and the newest in the corpus. */
const FULL = new Set([Math.min(...versions), Math.max(...versions)]);
/** Weeks the saves of the versions in between play: enough for a tick of every system. */
const SHORT_WEEKS = 4;
/** One version in between whose mid-season save plays on past the season's end, so a migrated save still crosses a rollover. */
const middle = [...new Set(versions)].filter((v) => !FULL.has(v)).sort((a, b) => a - b);
const CROSS = middle[Math.floor(middle.length / 2)];
beforeAll(async () => { await preparePack('uk'); });

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

      if ((raw.version ?? 0) < 24) {
        it('requires a new career without changing the historical fixture', () => {
          const before = JSON.stringify(raw);
          expect(migrateState(raw)).toMatchObject({ ok: false, message: expect.stringMatching(/older version.*start a new career/i) });
          expect(JSON.stringify(raw)).toBe(before);
        });
        return;
      }

      it('loads supported saves and passes checkState', () => {
        const res = migrateState(raw);
        expect(res.ok, res.ok ? '' : res.message).toBe(true);
        if (!res.ok) return;
        expect(res.state.version).toBe(SAVE_VERSION);
        expect(coachAddress(res.state)).toBe('Coach');
        expect(checkState(res.state)).toEqual([]);
      });

      if (FULL.has(versionOf(file))) {
        it('plays a season headless with no problems', () => {
          const r = runSoak({ seed: 1, seasons: 1, mode: 'managed', fromSave: raw });
          expect(r.problems).toEqual([]);
          expect(r.seasons.length, 'reached the next season').toBe(1);
        }, 120_000);
      } else if (versionOf(file) === CROSS && name.includes('-mid-season')) {
        it('plays on past the rollover headless with no problems', () => {
          const weeks = WEEKS_PER_SEASON + 1 - (raw.week ?? 1);
          const r = runSoak({ seed: 1, seasons: 1, weeks, mode: 'managed', fromSave: raw });
          expect(r.problems).toEqual([]);
          expect(r.seasons.length, 'reached the next season').toBe(1);
        }, 120_000);
      } else {
        it(`plays ${SHORT_WEEKS} weeks headless with no problems`, () => {
          const r = runSoak({ seed: 1, seasons: 1, weeks: SHORT_WEEKS, mode: 'managed', fromSave: raw });
          expect(r.problems).toEqual([]);
        }, 120_000);
      }
    });
  }
});
