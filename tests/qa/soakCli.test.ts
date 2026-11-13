import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { expect, it } from 'vitest';

it('rejects tuning before the fixed career-agency gate can start any careers', () => {
  const result = spawnSync(process.execPath, [realpathSync('node_modules/.bin/vite-node'), 'scripts/soak.ts', '--',
    '--career-agency', '--tune', 'rules.halfMinutes=7', '--jobs', '0'], { encoding: 'utf8', timeout: 10_000 });
  // Invalid jobs is a second early-stop guard, so a regression cannot launch a soak.
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('--career-agency');
  expect(result.stderr).toContain('tuning');
  expect(result.stderr).not.toContain('--jobs must be a positive integer');
}, 15_000);
