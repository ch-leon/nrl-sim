import { expect, it } from 'vitest';
import { labsPanelModel } from '../../src/labs/panel';
it('describes every switch, its effect and when it applies', () => {
  expect(labsPanelModel(() => false)).toEqual([{
    id: 'match-controls', label: 'Match controls',
    note: 'Retro Bowl style: swipe to pass, step and kick on your own sets. Results count.',
    on: false, smallPrint: 'Changes take effect at the next match.',
  }]);
  expect(labsPanelModel((id) => id === 'match-controls')[0]!.on).toBe(true);
});
import { overridesModel, playtestModel } from '../../src/labs/panel';
it('describes the screen override honestly: browser-local, and real changes stay', () => {
  const [row] = overridesModel(() => false);
  expect(row).toMatchObject({ id: 'open-screens', label: 'Open every Office screen', on: false });
  expect(row!.note).toMatch(/never saved/);
  expect(row!.smallPrint).toMatch(/stays in your career/);
});
it('offers the old resolution as a browser-local fallback that needs a reload (#627)', () => {
  const row = overridesModel((id) => id === 'css-pixels')[1];
  expect(row).toMatchObject({ id: 'css-pixels', label: 'Render at the old resolution', on: true });
  expect(row!.note).toMatch(/never saved/);
  expect(row!.smallPrint).toMatch(/Reload/);
});
it('offers one playtest action at a time, with the reason it must wait', () => {
  expect(playtestModel(false, null)).toMatchObject({ action: 'enter', label: 'Set up playtest career', wait: null });
  expect(playtestModel(true, 'Finish the match first, then come back here.')).toMatchObject({ action: 'return', label: 'Return to my career', wait: 'Finish the match first, then come back here.' });
});
