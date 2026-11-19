// tests/ui/screens/nextOpponentCard.test.ts — the next-opponent card at the top of the club's fixtures
// (SuperCOOKED 23), on the stand-in DOM, over a real league with the ladder and fixtures set by hand.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StubNode, stubDocument } from '../stubDom';
import { createNewGame, getState, setState } from '../../../src/core/state';
import { bus } from '../../../src/core/events';
import { initLeague } from '../../../src/systems/fixtures';
import { nextMatchPreview } from '../../../src/systems/league';
import { closeModal, dialogOpen } from '../../../src/ui/dom';
import { fmtOrdinal, nextOpponentCard } from '../../../src/ui/screens/fixtures';

const node = (n: unknown): StubNode => n as StubNode;
const cls = (c: StubNode, name: string): string => c.querySelector(`.${name}`)!.textContent;

beforeEach(() => {
  bus.clear();
  stubDocument();
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  setState(createNewGame('Test Club', 2301));
  initLeague(getState());
});
afterEach(() => { closeModal(); bus.clear(); vi.unstubAllGlobals(); });

/** The club's next fixture, as the card will read it. */
const nextFixture = () => {
  const s = getState();
  const p = nextMatchPreview(s)!;
  const f = s.league.fixtures.filter((x) => !x.result && (x.round >= s.week || s.week === 1 && x.round <= 0)
    && (x.homeId === 'player' || x.awayId === 'player')).sort((a, b) => a.round - b.round)[0]!;
  return { f, opp: p.opponent.id, name: p.opponent.name };
};
/** Make the next fixture a home or away one. */
function placeNext(home: boolean) {
  const n = nextFixture();
  n.f.homeId = home ? 'player' : n.opp;
  n.f.awayId = home ? n.opp : 'player';
  return n;
}
const row = (id: string) => getState().league.ladder.find((r) => r.clubId === id)!;

describe('nextOpponentCard', () => {
  it('is a tap target marked data-next-card, with the stage, where, stars, name, stripe and line', () => {
    const { name } = placeNext(true);
    const c = node(nextOpponentCard(getState()));
    expect(c.tagName).toBe('BUTTON');
    expect('data-next-card' in c.attrs).toBe(true);
    expect(c.querySelector('.nrl-next-card-stripe')).not.toBeNull();
    expect(cls(c, 'nrl-next-card-name')).toBe(`v ${name}`);
    expect(c.attrs['aria-label']).toContain(`v ${name}`);
  });

  it('says "v" and Home for a home game', () => {
    const { name } = placeNext(true);
    const c = node(nextOpponentCard(getState()));
    expect(cls(c, 'nrl-next-card-name')).toBe(`v ${name}`);
    expect(cls(c, 'nrl-next-card-when')).toMatch(/ · Home$/);
  });

  it('says "@" and Away for an away game', () => {
    const { name } = placeNext(false);
    const c = node(nextOpponentCard(getState()));
    expect(cls(c, 'nrl-next-card-name')).toBe(`@ ${name}`);
    expect(cls(c, 'nrl-next-card-when')).toMatch(/ · Away$/);
    expect(c.attrs['aria-label']).toContain(`at ${name}`);
  });

  it('labels the pre-season weeks as trials: round -1 is Trial 1, round 0 Trial 2', () => {
    placeNext(true);
    expect(nextMatchPreview(getState())!.round).toBe(-1);
    expect(cls(node(nextOpponentCard(getState())), 'nrl-next-card-when')).toBe('Next · Trial 1 · Home');
    const s = getState();
    s.league.fixtures.filter((f) => f.round === -1).forEach((f) => { f.result = { homeScore: 10, awayScore: 6 }; });
    s.week = 1;
    expect(nextMatchPreview(s)!.round).toBe(0);
    expect(cls(node(nextOpponentCard(s)), 'nrl-next-card-when')).toMatch(/^Next · Trial 2 · (Home|Away)$/);
  });

  it('labels a season round as Round n', () => {
    const s = getState();
    s.week = 3;
    expect(cls(node(nextOpponentCard(s)), 'nrl-next-card-when')).toMatch(/^Next · Round 3 · (Home|Away)$/);
  });

  it('shows no place and "no games yet" before the opponent has played, even with a ladder position', () => {
    const { opp } = placeNext(true);
    expect(row(opp).played).toBe(0);
    expect(nextMatchPreview(getState())!.opponent.ladderPos).toBeGreaterThan(0);
    const line = cls(node(nextOpponentCard(getState())), 'nrl-next-card-line');
    expect(line).toBe('no games yet · First meeting this season');
  });

  it('shows their place and record once they have played', () => {
    const { opp } = placeNext(true);
    const s = getState();
    const r = row(opp);
    Object.assign(r, { played: 4, wins: 3, losses: 1, draws: 0, points: 6 });
    s.league.ladder = [r, ...s.league.ladder.filter((x) => x !== r)];
    expect(cls(node(nextOpponentCard(s)), 'nrl-next-card-line')).toBe('1st · won 3, lost 1 · First meeting this season');
  });

  it('adds draws to the record only when there were some, and uses the ladder position as the ordinal', () => {
    const { opp } = placeNext(true);
    const s = getState();
    const r = row(opp);
    Object.assign(r, { played: 4, wins: 1, losses: 2, draws: 1 });
    s.league.ladder = [...s.league.ladder.filter((x) => x !== r), r];
    const pos = s.league.ladder.length;
    expect(cls(node(nextOpponentCard(s)), 'nrl-next-card-line')).toBe(`${fmtOrdinal(pos)} · won 1, lost 2, drew 1 · First meeting this season`);
  });

  it('puts this season\'s earlier meeting in the line', () => {
    // Trials do not count as meetings, so play the next round 3 game's opponent in round 1.
    const s = getState();
    s.week = 3;
    const opp = nextMatchPreview(s)!.opponent.id;
    s.league.fixtures.push({ round: 1, homeId: 'player', awayId: opp, result: { homeScore: 18, awayScore: 12 } });
    const line = cls(node(nextOpponentCard(s)), 'nrl-next-card-line');
    expect(line).not.toContain('First meeting');
    expect(line).toContain('won 18–12 at home');
  });

  it('is null with no match to come', () => {
    const s = getState();
    s.league.fixtures.forEach((f) => { f.result = { homeScore: 1, awayScore: 0 }; });
    expect(nextOpponentCard(s)).toBeNull();
  });

  it('a tap opens the full preview as a dialog', () => {
    placeNext(true);
    const c = node(nextOpponentCard(getState()));
    expect(dialogOpen()).toBe(false);
    c.click();
    expect(dialogOpen()).toBe(true);
    const preview = (document.body as unknown as StubNode).querySelector('[data-next-match]');
    expect(preview).not.toBeNull();
    expect(preview!.words()).toContain('Head to head');
  });
});
