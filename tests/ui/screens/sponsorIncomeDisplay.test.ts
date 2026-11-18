import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubDocument, type StubNode } from '../stubDom';
import { bus } from '../../../src/core/events';
import { createNewGame, setState } from '../../../src/core/state';
import { freshCapAccount } from '../../../src/systems/cap';
import { sponsorIncome } from '../../../src/systems/economy';
import { competitions, progress } from '../../data/leagueCareerFixtures';
import { closeModal, closeScreen } from '../../../src/ui/dom';
import { openBuildScreen, openFacilityPopup } from '../../../src/ui/screens/build';
import { guidePage } from '../../../src/ui/guide/guide';

const board = { id: 'sponsor', defId: 'sponsorBoard' as const, level: 1 as const, x: 0, y: 0 };
const body = (): StubNode => document.body as unknown as StubNode;

beforeEach(() => { bus.clear(); stubDocument(); });
afterEach(() => { closeModal(); closeScreen(); bus.clear(); vi.unstubAllGlobals(); });

describe('Sponsor Board displays use the actual sporting income basis', () => {
  for (const [marked, amount] of [[true, '$240'], [false, '$540']] as const) {
    describe(marked ? 'Local League with retained Premier capacity' : 'unmarked DEV Local with Premier capacity', () => {
      beforeEach(() => {
        const state = createNewGame('Sponsor FC', 574);
        state.capAccount = freshCapAccount('premier');
        state.competitions = competitions(1, false);
        if (marked) state.competitions.leagueCareer = { ...progress(), phase: 'active' };
        state.facilities = [board];
        expect(sponsorIncome(state)).toBe(marked ? 240 : 540);
        setState(state);
      });

      it('quotes the L1 purchase in the Build menu', () => {
        setState({ facilities: [] });
        openBuildScreen(null);
        const row = body().querySelector('[data-facility="sponsorBoard"]');
        expect(row).not.toBeNull();
        expect(row!.querySelector('.nrl-build-blurb')!.textContent).toContain(`+${amount} per played non-trial match at L1`);
      });

      it('quotes the placed board on its facility card', () => {
        openFacilityPopup(board);
        expect(body().querySelector('.nrl-facility-blurb')!.textContent).toContain(`+${amount} per played non-trial match at L1`);
      });

      it('quotes the loaded club on the Money guide page', () => {
        const words = guidePage('money').sections.flatMap(s => s.bullets ?? []).join(' ');
        expect(words).toContain(`Yours (level 1) pays ${amount} per eligible match`);
      });
    });
  }
});
