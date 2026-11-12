import { expect, it } from 'vitest';
import { fieldSelectionModel, labsPanelModel, overridesModel, playtestModel } from '../../src/labs/panel';
it('describes every switch, its effect and when it applies', () => {
  expect(labsPanelModel(() => false)).toEqual([{
    id: 'match-controls', label: 'Match controls',
    note: 'Retro Bowl style: swipe to pass, step and kick on your own sets. Results count.',
    on: false, smallPrint: 'Changes take effect at the next match.',
  }]);
  expect(labsPanelModel((id) => id === 'match-controls')[0]!.on).toBe(true);
});
it('describes the screen override honestly: browser-local, and real changes stay', () => {
  const [row] = overridesModel(() => false);
  expect(row).toMatchObject({ id: 'open-screens', label: 'Open every Office screen', on: false });
  expect(row!.note).toMatch(/never saved/);
  expect(row!.smallPrint).toMatch(/stays in your career/);
});
it('offers one playtest action at a time, with the reason it must wait', () => {
  expect(playtestModel(false, null)).toMatchObject({ action: 'enter', label: 'Set up playtest career', wait: null });
  expect(playtestModel(true, 'Finish the match first, then come back here.')).toMatchObject({ action: 'return', label: 'Return to my career', wait: 'Finish the match first, then come back here.' });
});

it('offers the default 100m field and the two experiments with explicit reload wording', () => {
  expect(fieldSelectionModel()).toMatchObject({
    selected: 100, label: 'Field length', applyLabel: 'Apply', wait: null,
    options: [{ value: 100, label: '100m (default)' }, { value: 80, label: '80m' }, { value: 60, label: '60m' }],
  });
  expect(fieldSelectionModel().note).toMatch(/browser only/);
  expect(fieldSelectionModel().smallPrint).toMatch(/reloads between matches/);
});
it('shows the 60m rule limit and the current reason applying must wait', () => {
  const wait = 'A match is waiting to resume. Play it out first.';
  expect(fieldSelectionModel(60, wait)).toMatchObject({ selected: 60, wait });
  expect(fieldSelectionModel(60).smallPrint).toMatch(/40\/20 is off/);
  expect(fieldSelectionModel(80).smallPrint).not.toMatch(/40\/20 is off/);
});
