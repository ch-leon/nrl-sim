import { describe, it, expect } from 'vitest';
import { BUILD_LABEL_FALLBACK, buildLabel, formatBuildLabel } from '../../src/ui/buildInfo';

describe('formatBuildLabel', () => {
  it('is the UTC build date and the short SHA', () => {
    expect(formatBuildLabel(new Date('2026-10-19T23:59:00Z'), '979cbbe')).toBe('2026-10-19 979cbbe');
  });

  it('says local when there is no SHA to stamp', () => {
    expect(formatBuildLabel(new Date('2026-10-19T00:00:00Z'), null)).toBe('2026-10-19 local');
    expect(formatBuildLabel(new Date('2026-10-19T00:00:00Z'), '  ')).toBe('2026-10-19 local');
  });
});

describe('buildLabel', () => {
  it('is the stamped label (vite.config.ts define) or the fallback', () => {
    // Vitest runs under the Vite config, so the define is normally present; a
    // bundler without it must still get something to show.
    expect(buildLabel()).toMatch(new RegExp(`^(\\d{4}-\\d{2}-\\d{2} \\S+|${BUILD_LABEL_FALLBACK})$`));
  });
});
