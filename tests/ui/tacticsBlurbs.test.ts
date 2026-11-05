import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ATTACK_PRESETS, PRESET_LABEL } from '../../src/match/league/presets';
import { Commentator } from '../../src/match/view/commentary';
import { el, segmented } from '../../src/ui/dom';
import { GUIDE_PAGES, renderGuidePage } from '../../src/ui/guide/guide';
import { TACTIC_BLURB, TACTIC_SHORT, styleLine } from '../../src/ui/tacticsBlurbs';
import { stubDocument } from './stubDom';

describe('Tight display name with the legacy grind id (#466)', () => {
  beforeEach(stubDocument);
  afterEach(() => vi.unstubAllGlobals());

  it('renders the label, offload blurb and three-letter chip using the shared display data', () => {
    const attack = segmented(ATTACK_PRESETS.map((id) => ({ id, label: PRESET_LABEL[id], title: TACTIC_BLURB[id] })), 'grind', () => {});
    const button = attack.buttons.get('grind')!;
    expect(button.textContent).toBe('Tight');
    expect(button.title).toBe('Forwards carry through the middle and offload in the tackle; kick for territory from deep.');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    const blurb = el('p', { text: `${PRESET_LABEL.grind}: ${TACTIC_BLURB.grind}` });
    const chip = el('span', { text: TACTIC_SHORT.grind });
    expect(chip.textContent).toBe('TGT');
    expect(chip.textContent!.length).toBe(3);
    expect(`${attack.el.textContent} ${blurb.textContent} ${chip.textContent}`).not.toMatch(/grind/i);
    expect(styleLine({ attack: 'grind', defence: 'slide' })).toBe('Tight · Slide');
  });

  it('renders both guides without the retired name', () => {
    for (const page of GUIDE_PAGES) expect(renderGuidePage(page).textContent).not.toMatch(/grind/i);
    expect(renderGuidePage(GUIDE_PAGES.find((p) => p.id === 'tactics')!).textContent).toContain('a heavy pack plays Tight');
    expect(renderGuidePage(GUIDE_PAGES.find((p) => p.id === 'nines')!).textContent).toContain('Tight, Balanced');
  });

  it('announces a legacy plan-change event as Tight', () => {
    const c = new Commentator(1, { home: 'Home FC', away: 'Away FC' });
    const line = c.line({ tick: 20, kind: 'plan', side: 'home', text: '', detail: 'grind/slide' });
    expect(line).toContain('Tight / Slide');
    expect(line).not.toMatch(/grind/i);
  });
});
