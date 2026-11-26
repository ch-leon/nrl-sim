// The card week's pick (#846): three faces, a refused card, a trait card's
// target list, pass, the outcome line, the last match panel, the HUD chip and
// the title's option behind the Labs switch.
vi.mock('../../src/art/coachFace', () => ({ coachFaceDataUrl: () => 'data:image/png;base64,face' }));
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { selectPack } from '../../src/content';
import { bus } from '../../src/core/events';
import { getState, loadState, setState, type GameState } from '../../src/core/state';
import { __setLabs } from '../../src/labs/flags';
import { prepareLeagueCareer } from '../../src/systems/leagueCareerSetup';
import { cardOfferView, chooseCard, plantCard } from '../../src/systems/cardWeek';
import { closeModal, closeScreen, dialogOpen, el, openModal } from '../../src/ui/dom';
import { cardChipCount, initCardWeekPick, lastMatchView, openCardPick, picksWaitingText, replacesLine, tierLabel, traitTargetRows } from '../../src/ui/cardWeek';
import { openCardsScreen } from '../../src/ui/screens/cards';
import { openWeekSummary, weekSnapshot, weekSummary } from '../../src/ui/weekSummary';
import { createHud } from '../../src/ui/hud';
import { showTitleFlow } from '../../src/ui/title';
import { stubLocalStorage } from '../commercial/memStorage';
import { StubNode, stubDocument } from './stubDom';

const body = () => document.body as unknown as StubNode;
const pick = () => body().querySelector('[data-card-pick]')!;

let base: GameState;
const fresh = async (): Promise<GameState> => {
  selectPack('au');
  base ??= await prepareLeagueCareer({ clubName: 'Card FC', seed: 7, cardWeek: true });
  return structuredClone(base);
};
const plant = (s: GameState, id: string): GameState => {
  const r = plantCard(s, id);
  if (typeof r === 'string') throw new Error(r);
  return r;
};

beforeEach(() => { stubDocument(); bus.clear(); });
afterEach(() => { closeModal(); closeScreen(); vi.useRealTimers(); vi.unstubAllGlobals(); __setLabs(null); });

describe('the view model', () => {
  it('says the tier in words and names the man a full squad would lose', () => {
    expect(tierLabel('gold')).toBe('Gold');
    expect(tierLabel('grey')).toBe('Grey');
    expect(picksWaitingText(1)).toBe('1 pick waiting');
    expect(picksWaitingText(3)).toBe('3 picks waiting');
    expect(replacesLine({ player: { name: 'A', position: 'prop', rating: 70, salary: 1, replacesName: 'Sam Smith', releaseCost: 4000 } }))
      .toBe('Replaces Sam Smith (release costs $4,000)');
    expect(replacesLine({ player: { name: 'A', position: 'prop', rating: 70, salary: 1 } })).toBeNull();
  });

  it('lists a trait card\'s targets starters first, with the level each would reach', async () => {
    const s = plant(await fresh(), 'playmaker');
    const face = cardOfferView(s).cards[0]!;
    const rows = traitTargetRows(s, face);
    const starters = s.lineup.starters.filter((id): id is string => !!id);
    expect(rows.slice(0, starters.length).map((r) => r.playerId)).toEqual(starters.filter((id) => rows.some((r) => r.playerId === id)));
    expect(rows.every((r) => /^Playmaker (I|II|III)$/.test(r.label))).toBe(true);
  });

  it('counts the chip only on a card-week career with a pick on show', async () => {
    const s = await fresh();
    expect(cardChipCount(s)).toBe(3);
    const { cardWeek: _cw, ...plain } = s;
    expect(cardChipCount(plain as GameState)).toBe(0);
    expect(cardChipCount({ ...s, cardWeek: { ...s.cardWeek!, owed: 0, starterLeft: 0, offers: [] } })).toBe(0);
  });
});

describe('the pick', () => {
  it('shows three faces from the view model, with the count waiting', async () => {
    loadState(await fresh());
    openCardPick();
    const faces = pick().querySelectorAll('.nrl-card-face');
    expect(faces).toHaveLength(3);
    const view = cardOfferView(getState());
    for (const [i, f] of view.cards.entries()) {
      const words = faces[i]!.words();
      expect(words).toContain(f.title);
      expect(words).toContain(f.effect);
      expect(words).toContain(tierLabel(f.tier));
      if (f.player) expect(words).toContain(`${f.player.rating}`);
    }
    expect(pick().words()).toContain('Pick a card');
    expect(pick().words()).toContain('3 picks waiting');
  });

  it('shows a refused card disabled, with its reason', async () => {
    // A set play is planted, then the attack coach's play is already owned: the card is refused.
    const s = await fresh();
    const coached = { ...s, staff: [{ role: 'attackCoach' as const, name: 'Coach', wage: 1, hiredSeason: 1, speciality: 'direct' as const }] };
    const planted = plant(coached, 'setPlay');
    const card = planted.cardWeek!.offers[0]!.cards[0]!;
    if (card.kind !== 'setPlay') throw new Error('not a set play');
    loadState({ ...planted, playbook: { owned: [card.playId] } });
    openCardPick();
    const play = pick().querySelector('[data-card-play-now="0"]')!;
    expect(play.disabled).toBe(true);
    expect(play.parentNode!.parentNode!.words()).toContain('That play is already yours.');
    expect(pick().querySelector('[data-card-choice="0"]')!.disabled).toBe(false);
  });

  it('plays a trait from the pick through its target list, with a way back, and says what happened', async () => {
    loadState(plant(await fresh(), 'playmaker'));
    openCardPick();
    pick().querySelector('[data-card-play-now="0"]')!.click();
    expect(pick().querySelectorAll('[data-card-target]').length).toBeGreaterThan(0);
    pick().querySelector('[data-card-back]')!.click();
    expect(pick().querySelectorAll('[data-card-choice]')).toHaveLength(3);
    pick().querySelector('[data-card-play-now="0"]')!.click();
    const target = pick().querySelectorAll('[data-card-target]')[0]!;
    const id = target.getAttribute('data-card-target')!;
    target.click();
    const name = getState().squad.find((p) => p.id === id)!.name;
    expect(pick().querySelector('[data-card-outcome]')!.words()).toContain(`${name} has Playmaker`);
    expect(getState().cardWeek!.starterLeft).toBe(2);
    expect(getState().cardWeek!.cardTraits).toEqual([expect.objectContaining({ playerId: id, trait: 'playmaker' })]);
    expect(pick().words()).toContain('2 picks waiting');
  });

  it('passes a pick after a one-line confirm, and closes when the last pick goes', async () => {
    const s = await fresh();
    loadState({ ...s, cardWeek: { ...s.cardWeek!, starterLeft: 1, offers: s.cardWeek!.offers.slice(0, 1) } });
    openCardPick();
    pick().querySelector('[data-card-pass]')!.click();
    expect(pick().words()).toContain('Pass this pick?');
    pick().querySelector('[data-card-pass-confirm]')!.click();
    expect(getState().cardWeek!.owed).toBe(0);
    expect(getState().cardWeek!.history.slice(-1)[0]!.cardId).toBe('pass');
    expect(dialogOpen()).toBe(false);
  });

  it('shows the last match: a line per player, and a card mark on card players and card traits', async () => {
    const s = await fresh();
    const [a, b, c] = s.squad;
    loadState({ ...s, cardWeek: { ...s.cardWeek!, cardPlayers: [a!.id], cardTraits: [{ playerId: b!.id, trait: 'lastLine' }],
      lastMatch: { season: 1, week: 5, opponentName: 'Rivals', rows: [a, b, c].map((p, i) => ({ playerId: p!.id, name: p!.name, tries: i, tackles: 10 + i, lineBreaks: 2 * i })) } } });
    openCardPick();
    const panel = pick().querySelector('[data-card-last-match]')!;
    expect(panel.hasAttribute('open')).toBe(true);
    expect(panel.words()).toContain('Last match v Rivals');
    const rows = panel.querySelectorAll('[data-card-last-row]');
    expect(rows).toHaveLength(3);
    expect(rows[1]!.words()).toContain('11');
    expect(rows[0]!.querySelector('.nrl-card-mark')).not.toBeNull();
    expect(rows[1]!.querySelector('.nrl-card-mark')).not.toBeNull();
    expect(rows[2]!.querySelector('.nrl-card-mark')).toBeNull();
    expect(lastMatchView(getState())!.rows[2]).toMatchObject({ tries: 2, lineBreaks: 4, tackles: 12, card: false });
  });

  it('keeps the last match panel closed before the first match', async () => {
    loadState(await fresh());
    openCardPick();
    const panel = pick().querySelector('[data-card-last-match]')!;
    expect(panel.hasAttribute('open')).toBe(false);
    expect(panel.words()).toContain('none played yet');
  });
});

describe('the HUD chip', () => {
  it('shows the picks waiting with another screen open and opens Cards; hidden without a card week', async () => {
    const s = await fresh();
    loadState(s);
    const open = vi.fn();
    const hud = createHud({ onCards: open, cards: cardChipCount });
    const chip = body().querySelector('[data-card-chip]')!;
    expect(chip.hidden).toBe(false);
    expect(chip.words()).toContain('3 PICKS');
    chip.querySelector('.nrl-card-chip-pick')!.click();
    expect(open).toHaveBeenCalledOnce();
    openModal(el('p', { text: 'Squad' }), { screen: true, key: 'squad' });
    expect(chip.hidden).toBe(false);
    setState({ cardWeek: { ...s.cardWeek!, starterLeft: 1, offers: s.cardWeek!.offers.slice(0, 1) } });
    expect(chip.words()).toContain('1 PICK');
    const { cardWeek: _cw, ...plain } = s;
    loadState(plain as GameState);
    expect(chip.hidden).toBe(true);
    hud.destroy();
  });
});

describe('Cards and new grants', () => {
  it('shows a held trait and its level and hint, plays it from the hand, and logs the activity', async () => {
    loadState(plant(await fresh(), 'playmaker'));
    const s = getState();
    openCardPick();
    pick().querySelector('[data-card-choice="0"]')!.click();
    expect(getState().squad).toBe(s.squad);
    closeModal();
    openCardsScreen();
    const screen = body().querySelector('[data-cards-screen]')!;
    expect(screen.words()).toContain('Hand (1/5)');
    expect(screen.querySelector('[data-hand-card="playmaker"]')!.words()).toContain('Grey · I');
    expect(screen.words()).toContain('Good if');
    screen.querySelector('[data-hand-play="0"]')!.click();
    screen.querySelectorAll('[data-card-target]')[0]!.click();
    expect(screen.words()).toContain('Hand (0/5)');
    expect(screen.words()).toMatch(/Playmaker (I|II|III) on/);
    expect(screen.words()).toContain('Took Playmaker');
    expect(screen.words()).toContain('Played Playmaker');
    expect(getState().cardWeek!.hand).toEqual([]);
  });

  it('disables both actions when the hand is full until the player discards a specific card', async () => {
    const s = plant(await fresh(), 'cashInjection');
    loadState(s);
    for (let i = 0; i < 5; i++) {
      loadState(plant(getState(), 'cashInjection'));
      expect(chooseCard(0).ok).toBe(true);
    }
    loadState(plant(getState(), 'cashInjection'));
    openCardPick();
    expect(pick().querySelector('[data-card-choice="0"]')!.disabled).toBe(true);
    expect(pick().querySelector('[data-card-play-now="0"]')!.disabled).toBe(true);
    pick().querySelector('[data-card-make-room]')!.click();
    pick().querySelector('[data-card-discard="2"]')!.click();
    expect(getState().cardWeek!.hand).toHaveLength(4);
    expect(pick().querySelector('[data-card-choice="0"]')!.disabled).toBe(false);
    pick().querySelector('[data-card-choice="0"]')!.click();
    expect(getState().cardWeek!.hand).toHaveLength(5);
  });

  it('opens once per grant even at the same queue length, waits behind a dialog, and stays closed on reload', async () => {
    const s = await fresh();
    vi.useFakeTimers();
    loadState(s);
    const stop = initCardWeekPick();
    vi.advanceTimersByTime(50);
    expect(pick()).not.toBeNull();
    expect(getState().cardWeek!.seenGrant).toBe(3);
    closeModal();
    openModal(el('p', { text: 'Week summary' }));
    setState({ cardWeek: { ...getState().cardWeek!, grants: 4 } });
    bus.emit('week:advanced', { season: s.season, week: s.week + 1 });
    vi.advanceTimersByTime(400);
    expect(pick()).toBeNull();
    closeModal();
    vi.advanceTimersByTime(400);
    expect(pick()).not.toBeNull();
    closeModal();
    vi.advanceTimersByTime(500);
    expect(pick()).toBeNull();
    stop();
    loadState(JSON.parse(JSON.stringify(getState())));
    const stopReload = initCardWeekPick();
    vi.advanceTimersByTime(500);
    expect(pick()).toBeNull();
    stopReload();
  });

  it('links the weekly summary to a pick even when a full queue kept the waiting count the same', async () => {
    const s = await fresh();
    loadState(s);
    const before = weekSnapshot(s);
    const summary = weekSummary(before, weekSnapshot({ ...s, week: s.week + 1, cardWeek: { ...s.cardWeek!, grants: 4 } }));
    expect(summary.newCardPicks).toBe(1);
    openWeekSummary(summary, { onAdvance: () => {}, onPick: () => { openCardPick(); } });
    const line = body().querySelector('.nrl-summary-pick')!;
    expect(line.words()).toContain('New card pick');
    line.querySelector('.nrl-btn-outline')!.click();
    expect(pick()).not.toBeNull();
  });
});

describe('the title option', () => {
  beforeEach(() => { stubLocalStorage(); });
  const start = async (labs: boolean, tick: boolean) => {
    __setLabs({ visible: true, on: { 'card-week': labs }, hintsSeen: [] });
    const root = new StubNode('div');
    const result = showTitleFlow(root as unknown as HTMLElement);
    await vi.dynamicImportSettled();
    const box = root.querySelector('[data-nrl-card-week]');
    if (box) (box as unknown as HTMLInputElement).checked = tick;
    root.querySelector('[data-nrl-start]')!.click();
    root.querySelector('[data-nrl-start-confirm]')?.click();
    return { box, row: box?.parentNode ?? null, choice: await result };
  };

  it('is absent with the Labs switch off', async () => {
    const { box, choice } = await start(false, true);
    expect(box).toBeNull();
    expect(choice.cardWeek).toBeUndefined();
  });

  it('carries the tick to a League career with the switch on', async () => {
    const { box, choice } = await start(true, true);
    expect(box).not.toBeNull();
    expect(choice).toMatchObject({ careerMode: 'league', cardWeek: true });
  });

  it('leaves it off unticked', async () => {
    const { choice } = await start(true, false);
    expect(choice.cardWeek).toBeUndefined();
  });
});
