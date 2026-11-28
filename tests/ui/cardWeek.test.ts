// The card week's pick (#846): three faces, a refused card, a trait card's
// target list, pass, the outcome line, the last match panel, the HUD chip and
// the title's option behind the Labs switch.
vi.mock('../../src/art/coachFace', () => ({ coachFaceDataUrl: () => 'data:image/png;base64,face' }));
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { selectPack } from '../../src/content';
import { bus } from '../../src/core/events';
import { __unlockSaves, loadCareer, migrateState, saveIfChanged, setActiveSlot } from '../../src/core/save';
import { CORRUPT_SAVE_KEY, slotKey } from '../../src/core/storageKeys';
import { isCardWeek } from '../../src/core/saveValidation';
import { getState, loadState, setState, type GameState } from '../../src/core/state';
import { __setLabs } from '../../src/labs/flags';
import { prepareLeagueCareer } from '../../src/systems/leagueCareerSetup';
import { releasedState } from '../../src/systems/freeagency';
import { PLAYS_BY_ID } from '../../src/data/plays';
import { commitment, publishedCap } from '../../src/systems/cap';
import { validatePlayerPopulation } from '../../src/systems/playerCareer';
import { RIVAL_POSITION_MIN } from '../../src/systems/rivals';
import { cardOfferView, cardWeekTick, chooseCard, plantCard, playChosenCard, playPickCard, rerollCard, takeCard } from '../../src/systems/cardWeek';
import { closeModal, closeScreen, dialogOpen, el, openModal } from '../../src/ui/dom';
import { cardChipCount, faceLines, initCardWeekPick, lastMatchView, openCardPick, picksWaitingText, replacesLine, tierLabel, traitStepLabel, traitTargetRows } from '../../src/ui/cardWeek';
import { TRAITS } from '../../src/data/traits';
import { STAFF, staffWage } from '../../src/systems/staff';
import { fmtMoney } from '../../src/utils/money';
import { activeLines, openCardsScreen } from '../../src/ui/screens/cards';
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

  it('lists a trait card\'s targets starters first, with the step each would take', async () => {
    const s = plant(await fresh(), 'playmaker');
    const face = cardOfferView(s).cards[0]!;
    const rows = traitTargetRows(s, face);
    const starters = s.lineup.starters.filter((id): id is string => !!id);
    expect(rows.slice(0, starters.length).map((r) => r.playerId)).toEqual(starters.filter((id) => rows.some((r) => r.playerId === id)));
    expect(rows.every((r) => /^Playmaker (new|I|II) → (I|II|III)$/.test(r.label))).toBe(true);
    const byId = new Map(s.squad.map((p) => [p.id, p]));
    for (const r of rows) {
      const p = byId.get(r.playerId)!;
      const held = p.traits?.find((t) => t.id === 'playmaker')?.level ?? 0;
      expect(r.label).toBe(traitStepLabel('Playmaker', held, held + 1));
      expect(r.suited).toBe(TRAITS.playmaker.fit!.includes(p.position));
    }
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
  it('shows five faces from the view model, with the count waiting', async () => {
    loadState(await fresh());
    openCardPick();
    const faces = pick().querySelectorAll('.nrl-card-face');
    expect(faces).toHaveLength(5);
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

  it('stays on the same match pick after one keep and closes after two with starters still waiting', async () => {
    const s = await fresh();
    const [starter] = s.cardWeek!.offers;
    const grant = s.cardWeek!.grants + 1;
    const match = { ...starter!, kind: 'match' as const, grant };
    loadState({ ...s, cardWeek: { ...s.cardWeek!, owed: 1, grants: grant, offers: [...s.cardWeek!.offers, match] } });
    openCardPick(grant);
    expect(pick().words()).toContain('Keep 2 cards');
    pick().querySelector('[data-card-choice="0"]')!.click();
    expect(pick().getAttribute('data-card-grant')).toBe(String(grant));
    expect(pick().words()).toContain('1 keep left');
    expect(pick().querySelectorAll('[data-card-choice]')).toHaveLength(4);
    pick().querySelector('[data-card-choice="0"]')!.click();
    expect(dialogOpen()).toBe(false);
    expect(getState().cardWeek).toMatchObject({ starterLeft: 3, owed: 0 });
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
    expect(pick().querySelectorAll('[data-card-choice]')).toHaveLength(5);
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
    expect(screen.querySelector('[data-hand-card="playmaker"]')!.words()).toContain('Grey · Level I');
    expect(screen.words()).toContain('Good if');
    screen.querySelector('[data-hand-play="0"]')!.click();
    screen.querySelectorAll('[data-card-target]')[0]!.click();
    expect(screen.words()).toContain('Hand (0/5)');
    expect(screen.words()).toMatch(/Playmaker (I|II|III) on/);
    expect(screen.words()).toContain('Took Playmaker');
    expect(screen.words()).toContain('Played Playmaker');
    expect(getState().cardWeek!.hand).toEqual([]);
  });

  it('allows Play now with a full hand and requires a discard before taking a sixth card', async () => {
    loadState(await fresh());
    for (const id of ['analyst', 'assistantCoach', 'lastLine', 'playmaker', 'finisher']) {
      loadState(plant(getState(), id));
      expect(chooseCard(0).ok).toBe(true);
    }
    loadState(plant(getState(), 'cashInjection'));
    const hand = getState().cardWeek!.hand;
    const money = getState().money;
    openCardPick();
    expect(pick().querySelector('[data-card-choice="0"]')!.disabled).toBe(true);
    const play = pick().querySelector('[data-card-play-now="0"]')!;
    expect(play.disabled).toBe(false);
    play.click();
    expect(getState().cardWeek!.hand).toEqual(hand);
    expect(getState().money).toBe(money + 15_000);
    loadState(plant(getState(), 'cashInjection'));
    openCardPick();
    pick().querySelector('[data-card-make-room]')!.click();
    pick().querySelector('[data-card-discard="2"]')!.click();
    expect(getState().cardWeek!.hand).toHaveLength(4);
    pick().querySelector('[data-card-choice="0"]')!.click();
    expect(getState().cardWeek!.hand).toHaveLength(5);
    expect(getState().cardWeek!.hand[4]).toMatchObject({ cardId: 'cashInjection', level: 2 });
  });

  it('shows a departed recruit’s refusal with a full hand and lets the player pass', async () => {
    const base = await prepareLeagueCareer({ clubName: 'Card FC', seed: 37, cardWeek: true });
    loadState(plant({ ...base, money: 1_000_000 }, 'propSigning'));
    expect(playChosenCard('pick', 0).ok).toBe(true);
    const recruitId = getState().cardWeek!.cardPlayers[0]!;
    for (const id of ['analyst', 'assistantCoach', 'lastLine', 'playmaker', 'finisher']) {
      loadState(plant(getState(), id));
      expect(chooseCard(0).ok).toBe(true);
    }
    const waiting = plant(getState(), 'propSigning');
    const released = releasedState(waiting, recruitId);
    if (!('state' in released)) throw new Error(released.message);
    loadState(released.state);
    const hand = getState().cardWeek!.hand;
    openCardPick();
    const take = pick().querySelector('[data-card-choice="0"]')!;
    const play = pick().querySelector('[data-card-play-now="0"]')!;
    expect(take.disabled).toBe(true);
    expect(play.disabled).toBe(true);
    expect(play.parentNode!.parentNode!.words()).toContain(`${released.released.name} is no longer at the club`);
    expect(pick().words()).toContain('Hand full. Play or discard a card first.');
    expect(pick().querySelector('[data-card-make-room]')!.disabled).toBe(false);

    const pass = pick().querySelector('[data-card-pass]')!;
    expect(pass.disabled).toBe(false);
    pass.click();
    pick().querySelector('[data-card-pass-confirm]')!.click();
    expect(getState().cardWeek!.offers).toEqual([]);
    expect(getState().cardWeek!.hand).toEqual(hand);
    expect(dialogOpen()).toBe(false);
  });

  it('opens actual new League picks through every entry point, even with three starters and a full match queue', async () => {
    const s = await fresh();
    const league = s.competitions!.instances.find(i => i.definition.format.kind === 'league' && i.entrantIds.includes(s.clubId))!;
    const matches = league.fixtures.filter(f => (f.homeId === s.clubId || f.awayId === s.clubId) && f.slot !== undefined)
      .sort((a, b) => a.slot! - b.slot!).slice(0, 5);
    expect(matches).toHaveLength(5);
    vi.useFakeTimers();
    loadState(s);
    const stop = initCardWeekPick();
    vi.advanceTimersByTime(50);
    expect(pick().getAttribute('data-card-grant')).toBe('1');
    expect(getState().cardWeek!.offers.map(o => o.seen)).toEqual([true, undefined, undefined]);
    closeModal();

    for (const [i, fixture] of matches.entries()) {
      // Hold the auto prompt behind the actual summary until the test dismisses it.
      openModal(el('p', { text: 'Week summary' }));
      const before = weekSnapshot(getState());
      const state = getState();
      const next = cardWeekTick({
        ...state, week: fixture.slot!,
        competitions: { ...state.competitions!, instances: state.competitions!.instances.map(instance => instance.id === league.id ? {
          ...instance, fixtures: instance.fixtures.map(f => f.id === fixture.id ? {
            ...f, status: 'completed', result: { homeScore: 10, awayScore: 0, decider: 'score', winnerId: f.homeId },
          } : f),
        } : instance) },
      });
      loadState({ ...next, week: fixture.slot! + 1 });
      const cw = getState().cardWeek!;
      const newest = cw.offers[cw.offers.length - 1]!;
      expect(cw).toMatchObject({ starterLeft: 3, owed: Math.min(3, i + 1), grants: i + 4 });
      expect(newest).toMatchObject({ kind: i === 4 ? 'decree' : 'match', grant: i + 4, week: fixture.slot });
      const assertShown = () => {
        expect(pick().getAttribute('data-card-grant')).toBe(String(newest.grant));
        const choices = pick().querySelectorAll('[data-card-choice]');
        expect(choices.map(c => c.getAttribute('data-card-id'))).toEqual(newest.cards.map(c => c.cardId));
        expect(choices.some(c => !c.disabled)).toBe(true);
        if (i === 4) {
          expect(pick().words()).toContain('Decree pick');
          expect(pick().querySelector('[data-card-reroll]')).toBeNull();
          expect(pick().querySelector('[data-card-play-now]')).toBeNull();
        }
      };

      vi.advanceTimersByTime(400);
      expect(pick()).toBeNull();
      closeModal();
      openCardsScreen();
      const screen = body().querySelector('[data-cards-screen]')!;
      expect(screen.querySelectorAll('[data-cards-offer]')).toHaveLength(cw.offers.length);
      screen.querySelector('[data-cards-offer="2"]')!.click();
      expect(pick().getAttribute('data-card-grant')).toBe('2');
      expect(getState().cardWeek!.offers.find(o => o.grant === newest.grant)!.seen).toBeUndefined();
      closeModal();
      closeScreen();

      bus.emit('week:advanced', { season: s.season, week: getState().week });
      vi.advanceTimersByTime(400);
      assertShown();
      closeModal();
      expect(getState().cardWeek!.offers.find(o => o.grant === newest.grant)!.seen).toBe(true);
      vi.advanceTimersByTime(500);
      expect(pick()).toBeNull();

      const summary = weekSummary(before, weekSnapshot(getState()));
      expect(summary.newCardPicks).toBe(1);
      openWeekSummary(summary, { onAdvance: () => {}, onPick: () => { openCardPick(); } });
      body().querySelector('.nrl-summary-pick')!.querySelector('.nrl-btn-outline')!.click();
      assertShown();
      closeModal();

      openCardsScreen();
      body().querySelector('[data-cards-screen]')!.querySelector('[data-cards-pick]')!.click();
      assertShown();
      closeModal();
      closeScreen();
    }
    expect(getState().cardWeek!.history.map(h => h.action)).toEqual(['expire', 'expire']);
    expect(getState().cardWeek!.offers.map(o => o.grant)).toEqual([1, 2, 3, 6, 7, 8]);
    stop();
    loadState(JSON.parse(JSON.stringify(getState())));
    const stopReload = initCardWeekPick();
    vi.advanceTimersByTime(500);
    expect(pick()).toBeNull();
    stopReload();

    openCardsScreen();
    body().querySelector('[data-cards-offer="6"]')!.click();
    expect(pick().getAttribute('data-card-grant')).toBe('6');
    pick().querySelectorAll('[data-card-choice]').find(c => !c.disabled)!.click();
    expect(pick().getAttribute('data-card-grant')).toBe('6');
    pick().querySelectorAll('[data-card-choice]').find(c => !c.disabled)!.click();
    expect(getState().cardWeek!.offers.map(o => o.grant)).toEqual([1, 2, 3, 7, 8]);
    expect(getState().cardWeek!.starterLeft).toBe(3);
    expect(getState().cardWeek!.owed).toBe(2);
  });

  it('keeps older match grants unshown when opening a newer match first', async () => {
    const s = await fresh();
    const matchOffers = [4, 5].map(grant => ({ ...s.cardWeek!.offers[0]!, kind: 'match' as const, grant }));
    loadState({ ...s, cardWeek: { ...s.cardWeek!, offers: [...s.cardWeek!.offers, ...matchOffers], grants: 5, owed: 2 } });
    vi.useFakeTimers();
    const stop = initCardWeekPick();
    openCardPick();
    expect(pick().getAttribute('data-card-grant')).toBe('5');
    expect(getState().cardWeek!.offers[3]!.seen).toBeUndefined();
    closeModal();
    vi.advanceTimersByTime(400);
    expect(pick().getAttribute('data-card-grant')).toBe('4');
    stop();
  });

});

describe('legacy Cards saves', () => {
  const fixture = () => gunzipSync(readFileSync(new URL('../fixtures/saves/v39-card-week-legacy-steals.json.gz', import.meta.url))).toString();

  it.each(['pick', 'hand'] as const)('loads, shows and plays a stolen recruit via the %s and a held stolen set play', async source => {
    const storage = stubLocalStorage();
    __unlockSaves();
    setActiveSlot(1);
    const original = fixture();
    storage.setItem(slotKey(1), original);
    const base = JSON.parse(original) as GameState;

    const continueFromSlot = async () => {
      loadState(await fresh());
      const root = new StubNode('div');
      const title = showTitleFlow(root as unknown as HTMLElement);
      root.querySelector('[data-nrl-continue-1]')!.click();
      expect(await title).toEqual({ mode: 'continue' });
      const loaded = loadCareer();
      if (loaded.status !== 'ok') throw new Error(JSON.stringify(loaded));
      loadState(loaded.state);
      expect(getState().week).toBe(13);
      return loaded;
    };

    expect(await continueFromSlot()).toMatchObject({ outcome: 'valid', repairs: [] });
    expect(storage.getItem(slotKey(1))).toBe(original);
    expect(getState().cardWeek).toEqual({
      ...base.cardWeek, weeklyFatigue: {}, offers: base.cardWeek!.offers.map(offer => ({ ...offer, keptCardIds: [] })),
    });

    const winPick = base.cardWeek!.offers.slice(-1)[0]!;
    const index = winPick.cards.findIndex(card => card.fromClubId);
    const recruit = winPick.cards[index];
    const setPlay = base.cardWeek!.hand[0]?.offered;
    if (recruit?.kind !== 'player' || setPlay?.kind !== 'setPlay') throw new Error('Missing legacy cards');
    const id = recruit.player.id;
    const rival = base.league.clubs.find(club => club.id === recruit.fromClubId)!;
    expect(base.playbook.owned).not.toContain(setPlay.playId);

    openCardsScreen();
    const screen = body().querySelector('[data-cards-screen]')!;
    const label = screen.querySelector(`[data-cards-offer="${winPick.grant}"]`)!.words();
    expect(label).toMatch(/^Match pick.*Latest/);
    expect(label).not.toContain(rival.name);
    const heldPlay = screen.querySelector(`[data-hand-card="${setPlay.cardId}"]`)!;
    expect(heldPlay.words()).toContain(PLAYS_BY_ID[setPlay.playId].name);
    expect(heldPlay.words()).toContain(`From ${rival.name}`);
    heldPlay.querySelector('[data-hand-play="0"]')!.click();
    expect(getState().playbook.owned).toContain(setPlay.playId);
    closeScreen();

    openCardPick(winPick.grant);
    const face = pick().querySelectorAll('.nrl-card-face')[index]!;
    expect(face.words()).toContain('Reece Fenuamea');
    expect(face.words()).toContain(`From ${rival.name}`);
    if (source === 'hand') {
      face.querySelector(`[data-card-choice="${index}"]`)!.click();
      expect(getState().league.clubs.find(club => club.id === rival.id)).toEqual(rival);
      closeModal();
      openCardsScreen();
      const heldRecruit = body().querySelector(`[data-hand-card="${recruit.cardId}"]`)!;
      expect(heldRecruit.words()).toContain('Reece Fenuamea');
      heldRecruit.querySelector('[data-hand-play="0"]')!.click();
      closeScreen();
    } else {
      face.querySelector(`[data-card-play-now="${index}"]`)!.click();
      closeModal();
    }

    const saved = JSON.parse(storage.getItem(slotKey(1))!) as GameState;
    expect(saved.cardWeek!.hand).toHaveLength(0);
    expect(saved.cardWeek!.cardPlayers).toEqual([id]);
    expect(saved.playbook.owned).toContain(setPlay.playId);
    expect(isCardWeek(saved.cardWeek)).toBe(true);
    expect(saved.squad.find(player => player.id === id)?.clubHistory?.spells.map(spell => spell.clubId))
      .toEqual([saved.clubId, rival.id, saved.clubId]);
    const updated = saved.league.clubs.find(club => club.id === rival.id)!;
    expect(updated.squad).toHaveLength(rival.squad!.length);
    expect(updated.squad!.some(p => p.id === id)).toBe(false);
    expect(updated.squad!.filter(p => !rival.squad!.some(old => old.id === p.id))).toMatchObject([{ position: recruit.player.position }]);
    expect(updated.squad!.filter(p => p.position === recruit.player.position && p.injuredWeeks === 0 && !p.suspendedWeeks).length)
      .toBeGreaterThanOrEqual(RIVAL_POSITION_MIN);
    expect(commitment(updated.squad!, saved.season)).toBeLessThanOrEqual(publishedCap(updated.capAccount!));
    expect(validatePlayerPopulation(saved)).toBeNull();
    expect(saved.rngSeed).toBe(base.rngSeed);
    expect(saved.eventDeck).toEqual(base.eventDeck);
    expect(await continueFromSlot()).toMatchObject({ outcome: 'valid', repairs: [] });
    expect(getState().cardWeek!.cardPlayers).toEqual([id]);
    expect(getState().squad.find(player => player.id === id)?.name).toBe('Reece Fenuamea');

    // Recreate the metadata written by the earlier v38 build and keep its bytes in recovery.
    const duplicate = JSON.stringify({ ...saved, version: 38, cardWeek: { ...saved.cardWeek!, cardPlayers: [id, id] } });
    storage.setItem(slotKey(1), duplicate);
    expect(await continueFromSlot()).toMatchObject({ outcome: 'repaired', repairs: [{ field: 'cardWeek.cardPlayers' }] });
    expect(storage.getItem(slotKey(1))).toBe(duplicate);
    expect(storage.getItem(CORRUPT_SAVE_KEY)).toContain(id);
    expect(saveIfChanged(getState())).toBe(true);
    expect(await continueFromSlot()).toMatchObject({ outcome: 'valid', repairs: [] });
  });

  it('rerolls a saved steal into a normal match pick and keeps the hand', () => {
    const loaded = migrateState(JSON.parse(fixture()));
    if (!loaded.ok) throw new Error(loaded.message);
    const base = loaded.state;
    const winPick = base.cardWeek!.offers.slice(-1)[0]!;
    const rerolled = rerollCard(base, winPick.grant);
    if (typeof rerolled === 'string') throw new Error(rerolled);
    const next = rerolled.cardWeek!.offers.slice(-1)[0]!;
    expect(next).toMatchObject({ kind: 'match', season: winPick.season, week: winPick.week, grant: winPick.grant });
    expect(next.fromClubId).toBeUndefined();
    expect(next.cards.every(card => !card.fromClubId)).toBe(true);
    expect(rerolled.cardWeek!.hand).toEqual(base.cardWeek!.hand);
    expect(isCardWeek(rerolled.cardWeek)).toBe(true);
  });
});

describe('active card and strike displays', () => {
  it('shows the newest recruit record and source for the same player', async () => {
    const s = await fresh();
    const player = s.squad.find(p => p.position === 'hooker')!;
    const rival = s.league.clubs.find(c => c.id !== s.clubId)!;
    s.cardWeek!.cardPlayers = [player.id];
    s.cardWeek!.active = [{ kind: 'player', cardId: 'hookerSigning', level: 1, playerId: player.id }];
    expect(activeLines(s)[0]).toMatch(/Joined from a card.*Level I/);
    s.cardWeek!.active.push({ kind: 'player', cardId: `steal-player:hooker:${player.id}`, level: 2,
      playerId: player.id, fromClubId: rival.id });
    const [line] = activeLines(s);
    expect(line).toContain(`From ${rival.name}`);
    expect(line).toContain('Level II');
    expect(line).not.toContain('Joined from a card');
  });

  it('keeps the board objective detail and only appends a positive strike count', async () => {
    const base = await fresh();
    loadState({ ...base, money: 12_000, objectives: [
      { id: 'cash', kind: 'solvent', target: 20_000, status: 'pending', text: 'Finish with $20,000' },
    ] });
    const hud = createHud({ onBoard: () => {}, runwayWeeks: () => 2 });
    const board = body().querySelector('[data-hud="board"]')!;
    const detail = board.querySelector('.nrl-decisions-chip-top')!;
    expect(board.hidden).toBe(false);
    expect(detail.textContent).toBe('You have $12k');
    expect(board.getAttribute('aria-label')).not.toContain('strikes');

    setState({ cardWeek: { ...base.cardWeek!, strikes: { season: base.season, count: 1, lossRun: 0,
      log: [{ week: 1, reason: 'margin', margin: 24 }],
    } } });
    expect(detail.textContent).toBe('You have $12k · 1 strike');
    expect(board.getAttribute('aria-label')).toContain('You have $12k. 1 strike');
    hud.destroy();
  });

  it('shows strikes in words on Cards, the HUD board chip and the week summary', async () => {
    const before = await fresh();
    const after: GameState = { ...before, week: 4, boardPatience: 1, cardWeek: {
      ...before.cardWeek!, strikes: { season: 1, count: 3, lossRun: 0, log: [
        { week: 1, reason: 'margin', margin: 26 }, { week: 2, reason: 'run' }, { week: 3, reason: 'margin', margin: 30, absorbed: true },
      ] },
    } };
    loadState(after);
    const hud = createHud({ onBoard: () => {} });
    expect(body().querySelector('[data-hud="board"]')!.words()).toContain('3 strikes');
    expect(body().querySelector('[data-hud="board"]')!.getAttribute('aria-label')).toContain('patience 1/');
    hud.destroy();
    openCardsScreen();
    const section = body().querySelector('[data-card-strikes]')!;
    expect(section.words()).toContain('Strikes this season');
    expect(section.words()).toContain('3 strikes');
    expect(section.words()).toContain('Strike: lost by 30');
    expect(section.words()).toContain('Strike absorbed');
    closeScreen();
    const summary = weekSummary(weekSnapshot(before), weekSnapshot(after));
    expect(summary.strikes).toEqual(['Strike: lost by 26', 'Strike: third loss in a row', 'Strike absorbed']);
    openWeekSummary(summary, { onAdvance: () => {} });
    expect(body().querySelector('[data-week-summary]')!.words()).toContain('Strike absorbed');
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

describe('each kind of face (#846 play-test)', () => {
  const rich = async (): Promise<GameState> => ({ ...(await fresh()), money: 10_000_000, boardPatience: 4 });
  const SIGNINGS = { propSigning: 'prop', hookerSigning: 'hooker', centreSigning: 'centre', fullbackSigning: 'fullback' } as const;
  const faceWords = (s: GameState, id: string): string => {
    loadState(plant(s, id));
    openCardPick();
    const words = pick().querySelector('[data-card-choice="0"]')!.parentNode!.parentNode!.words();
    closeModal();
    return words;
  };
  const taken = <T,>(r: T | string): T => { if (typeof r === 'string') throw new Error(r); return r; };

  it('shows each kind\'s facts on the face', async () => {
    const s = await rich();
    // A player card at a position that is not the club's best man's (none is offered there).
    const id = (Object.keys(SIGNINGS) as (keyof typeof SIGNINGS)[]).find((c) => typeof plantCard(s, c) !== 'string')!;
    const player = faceWords(s, id);
    expect(player).toMatch(new RegExp(`Your best ${SIGNINGS[id]} now: .+ \\d+`));
    expect(player).toMatch(/\+\d+ better/);
    expect(faceWords(s, 'marqueeGamble')).toContain('Board patience 4 → 3 of 5');
    const trait = faceWords(s, 'lastLine');
    expect(trait).toContain(TRAITS.lastLine.blurb);
    expect(trait).toContain('Suits: fullback, winger');
    const analyst = faceWords(s, 'analyst');
    expect(analyst).toContain(STAFF.analyst.blurb);
    expect(analyst).toContain(`Wage ${fmtMoney(staffWage(s, 'analyst'))} a week`);
    expect(analyst).toContain('Saves the $12,000 fee');
    const coach = faceWords(s, 'directAttackCoach');
    expect(coach).toContain('Opens Block play, Inside ball, Short-side raid');
    expect(coach).toContain('each still bought separately');
    const coached = { ...s, staff: [{ role: 'attackCoach' as const, name: 'Coach', wage: 1, hiredSeason: 1, speciality: 'direct' as const }] };
    const play = faceWords(coached, 'setPlay');
    const card = getState().cardWeek!.offers[0]!.cards[0]!;
    if (card.kind !== 'setPlay') throw new Error('not a set play');
    const named = PLAYS_BY_ID[card.playId];
    expect(play).toContain(named.blurb);
    expect(play).toContain(`Saves ${fmtMoney(named.price)}`);
    expect(play.split(named.name)).toHaveLength(2); // named once, not twice
    const cash = faceWords(s, 'cashInjection');
    expect(cash).not.toMatch(/Saves|Wage|Suits|Your best|Board patience/);
  });

  it('shows no floor and no fee on an upgrade, and the cut wage', async () => {
    const s = await rich();
    const id = (Object.keys(SIGNINGS) as (keyof typeof SIGNINGS)[]).find((c) => typeof plantCard(s, c) !== 'string')!;
    const joined = taken(playPickCard(plant(s, id), 0)).state;
    const upgrade = faceWords(joined, id);
    expect(upgrade).toContain('Level II');
    expect(upgrade).not.toMatch(/Your best|Nobody plays there|better/);
    const hired = taken(playPickCard(plant(s, 'analyst'), 0)).state;
    const staff = faceWords(hired, 'analyst');
    expect(staff).toContain(`Wage ${fmtMoney(Math.round(staffWage(s, 'analyst') * 0.75))} a week`);
    expect(staff).not.toContain('Saves the');
  });

  it('makes no "better" claim when the gap is not above nothing', async () => {
    const base = cardOfferView(plant(await fresh(), 'cashInjection')).cards[0]!;
    const lines = faceLines({ ...base, floor: { line: 'Your best prop now: A 60', gap: 0 } }).map((l) => l.text);
    expect(lines).toEqual(['Your best prop now: A 60']);
    expect(faceLines({ ...base, floor: { line: 'Nobody plays there now', gap: null } }).map((l) => l.text)).toEqual(['Nobody plays there now']);
  });

  it('lists each target\'s step, a Level II card\'s too, and marks men the trait suits', async () => {
    const s = await rich();
    const holder = s.squad[0]!;
    const withOne = { ...s, squad: s.squad.map((p) => (p === holder ? { ...p, traits: [{ id: 'lastLine' as const, level: 1 as const }] } : p)) };
    loadState(plant(withOne, 'lastLine'));
    openCardPick();
    pick().querySelector('[data-card-play-now="0"]')!.click();
    expect(pick().words()).toContain(TRAITS.lastLine.blurb);
    expect(pick().querySelector(`[data-card-target="${holder.id}"]`)!.words()).toContain('Last Line I → II');
    const other = getState().squad.find((p) => p.id !== holder.id)!;
    expect(pick().querySelector(`[data-card-target="${other.id}"]`)!.words()).toContain('Last Line new → I');
    const suited = pick().querySelectorAll('[data-card-suited]');
    expect(suited.length).toBe(getState().squad.filter((p) => ['fullback', 'winger'].includes(p.position)).length);
    expect(suited.every((n) => n.words().includes('suits'))).toBe(true);
    closeModal();
    // Held at I, the next copy is Level II: he would go from I to III, a new man to II.
    loadState(plant(taken(takeCard(plant(withOne, 'lastLine'), 0)), 'lastLine'));
    openCardPick();
    pick().querySelector('[data-card-play-now="0"]')!.click();
    expect(pick().querySelector(`[data-card-target="${holder.id}"]`)!.words()).toContain('Last Line I → III');
    expect(pick().querySelector(`[data-card-target="${other.id}"]`)!.words()).toContain('Last Line new → II');
  });

  it('shows the same facts on a held card in Cards', async () => {
    loadState(plant(await rich(), 'analyst'));
    openCardPick();
    pick().querySelector('[data-card-choice="0"]')!.click();
    closeModal();
    openCardsScreen();
    const held = body().querySelector('[data-hand-card="analyst"]')!.words();
    expect(held).toContain(STAFF.analyst.blurb);
    expect(held).toContain('Saves the $12,000 fee');
  });
});
