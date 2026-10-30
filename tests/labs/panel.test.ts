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
