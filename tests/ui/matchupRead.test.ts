import { afterEach, describe, expect, it, vi } from 'vitest';
import { fitStars, fitRead, matchupRead, counterRead, halfTimeNumbers } from '../../src/ui/matchupRead';
import { renderPlanFit } from '../../src/ui/planFit';
import { stubDocument, type StubNode } from './stubDom';
import { createNewGame, getState, setState, type RivalClub } from '../../src/core/state';
import { styleFit } from '../../src/match/league/fit';
import { teamSheetFromRival, teamSheetFromSquad } from '../../src/match/league/sheets';
import { rivalMatchSheet } from '../../src/systems/matchday';
import { playerRivalContext, rivalSheet } from '../../src/systems/rivalRound';
import { resolveLineup, validTactics } from '../../src/systems/lineup';
import { styleLine } from '../../src/ui/tacticsBlurbs';
import { initLeague } from '../../src/systems/fixtures';
import { openNextMatch } from '../../src/ui/screens/fixtures';
import { openRivalSquad } from '../../src/ui/screens/rivalSquad';
import { showPlanCard } from '../../src/ui/screens/matchOverlay';
import type { RosterEntry, MatchEvent } from '../../src/sim/events';
const nine = (n: number): RosterEntry[] => ['prop', 'winger', 'halfback'].map(position => ({ name: 'Kai Jones', position: position as RosterEntry['position'], stats: { speed:n, strength:n, handling:n, kicking:n, stamina:n, footyIQ:n } }));

/** Assert the rendered fit and comparison use the same nine that will kick off. */
function expectScoutingMatchesKickoff(rival: RivalClub) {
  const state = getState();
  setState({ league: { ...state.league,
    clubs: state.league.clubs.map(c => c.id === rival.id ? rival : c),
    fixtures: [{ round: state.week, homeId: state.clubId, awayId: rival.id }],
  } });
  const context = playerRivalContext(getState());
  const kickoff = rivalMatchSheet(rival, context);
  expect(rivalSheet(rival, context)).toEqual(kickoff);
  const theirs = kickoff.roster ?? [];
  const style = kickoff.tactics!;
  const ours = teamSheetFromSquad(state.squad, state.clubId, state.clubName, ['#000000', '#ffffff'], resolveLineup(state.lineup, state.squad)).roster ?? [];
  const stars = `${fitRead(theirs, style.attack).stars} / ${fitRead(theirs, style.defence).stars}`;
  const read = matchupRead(ours, theirs, validTactics(state.lineup.tactics), style);
  const fixture = openNextMatch() as unknown as StubNode;
  expect(fixture.querySelector('[data-preview-line="They play"]')?.textContent).toBe(`They play${styleLine(style)} · ${stars}`);
  expect(fixture.querySelector('[data-preview-line="Matchup"]')?.textContent).toBe(`Matchup${read}`);
  openRivalSquad(rival);
  const body = document.body as unknown as StubNode;
  expect(body.querySelector('[data-usual-fit]')?.textContent).toContain(stars.replace(' / ', '/'));
  expect(body.querySelector('[data-matchup]')?.textContent).toBe(read);
  return kickoff;
}
afterEach(() => vi.unstubAllGlobals());
describe('strategy readouts #467', () => {
  it('displays the six-stat mean for the Balanced contributor', () => {
    const roster = nine(80);
    expect(fitRead(roster, 'balanced').reason).toBe('Jones 80');
    roster[0] = { ...roster[0]!, name: 'Kai Smith', stats: { ...roster[0]!.stats!, kicking: 20 } };
    expect(fitRead([roster[0]!], 'balanced').reason).toBe('Smith 70');
    expect(fitRead(roster, 'balanced').reason).toBe('Jones 80');
    stubDocument();
    const button = document.createElement('button');
    renderPlanFit(button, nine(80), 'balanced');
    expect(button.textContent).toBe('Balanced★★☆Jones 80');
  });

  it('maps fit bands, clamped at zero and three stars', () => {
    expect([-1, 0, .49, .5, .99, 1, 1.49, 1.5, 2].map(fitStars)).toEqual([0,0,0,1,1,2,2,3,3]);
  });
  it('names a player and updates the same button when the selected nine changes', () => {
    stubDocument();
    const b = document.createElement('button');
    renderPlanFit(b, nine(35), 'grind');
    expect(b.textContent).toBe('Tight★☆☆Jones 35');
    renderPlanFit(b, nine(85), 'grind');
    expect(b.textContent).toBe('Tight★★★Jones 85');
    expect(fitRead([], 'slide').reason).toBe('No players');
  });
  it('names the best available kicker even outside the halves', () => {
    const roster = nine(40);
    roster[0] = { ...roster[0]!, name: 'Tui Jones', stats: { ...roster[0]!.stats!, kicking: 90 } };
    roster[2] = { ...roster[2]!, name: 'Kai Smith' };
    expect(fitRead(roster, 'kick-chase').reason).toBe('Jones 90');
  });
  it('reads positive, negative and neutral cells with both fits', () => {
    const them = { attack: 'balanced', defence: 'slide' } as const;
    expect(matchupRead(nine(60), nine(60), {attack:'grind',defence:'slide'}, them)).toBe('Tight v Slide: has room. Fits are close.');
    expect(matchupRead(nine(40), nine(80), {attack:'expansive',defence:'slide'}, them)).toBe('Expansive v Slide: countered. They fit better.');
    expect(matchupRead(nine(80), nine(40), {attack:'balanced',defence:'slide'}, them)).toContain('even. You fit better.');
    expect(counterRead(nine(60), 'slide')).toBe('Try Tight ★★☆ or All-out ★★☆.');
    expect(counterRead(nine(60), 'rush')).toBe('Try Kick-chase ★★☆.');
    expect(counterRead(nine(60), 'compressed')).toBe('Try Expansive ★★☆.');
  });
  it('picks only own recorded events, with style targets and better/equal/worse arrows', () => {
    const events: MatchEvent[] = [ ...Array.from({length:4}, () => ({t:1, kind:'kick' as const, teamId:'you'})), {t:1,kind:'break',teamId:'them'} ];
    expect(halfTimeNumbers(events,'you','balanced').map(n => [n.count,n.arrow])).toEqual([[0,'↓'],[4,'↑'],[0,'↑']]);
    expect(halfTimeNumbers(events,'you','kick-chase')[1]!.arrow).toBe('↓');
    expect(halfTimeNumbers([...events,{t:2,kind:'break',teamId:'you'},{t:3,kind:'break',teamId:'you'}],'you','balanced')[0]!.arrow).toBe('→');
  });
  it('renders fixture and rival scouting rows', () => {
    stubDocument();
    createNewGame('Readouts', 467);
    setState({ league: initLeague(getState()) });
    const rival = getState().league.clubs.find(c => c.id !== getState().clubId)!;
    const modal = openNextMatch() as unknown as StubNode;
    expect(modal.words()).toContain('Matchup');
    expect(modal.words()).toContain('Counters');
    openRivalSquad(rival);
    expect(document.body.textContent).toContain('Usual:');
    expect(document.body.textContent).toContain('Try ');
  });
  it('scouts seed 467 Cairns from its selected nine, not synthetic players', () => {
    stubDocument();
    createNewGame('Readouts', 467);
    setState({ league: initLeague(getState()) });
    const cairns = getState().league.clubs.find(c => c.id === 'rival-cyclones')!;
    const kickoff = expectScoutingMatchesKickoff(cairns);
    expect(kickoff.tactics!.defence).toBe('compressed'); // Normal's habit-aware choice; the selected nine stays the same.
    expect(styleFit(kickoff.roster ?? []).slide).toBeCloseTo(0.97, 2);
    expect(fitRead(kickoff.roster ?? [], 'slide').stars).toBe('★☆☆');
    expect(fitRead(teamSheetFromRival(cairns).roster ?? [], 'slide').stars).toBe('★★☆');
  });
  it.each(['unavailable starters', 'missing squad', 'short squad'] as const)('scouting follows kick-off selection with %s', (mode) => {
    stubDocument();
    createNewGame('Readouts', 467);
    setState({ league: initLeague(getState()) });
    const cairns = getState().league.clubs.find(c => c.id === 'rival-cyclones')!;
    const excluded = rivalMatchSheet(cairns).roster!.slice(0, 2).map(p => p.id);
    const { squad, ...legacy } = cairns;
    const rival = mode === 'missing squad' ? legacy : { ...cairns, squad: mode === 'short squad' ? squad!.slice(0, 8) : squad!.map(p =>
      p.id === excluded[0] ? { ...p, injuredWeeks: 2 } : p.id === excluded[1] ? { ...p, suspendedWeeks: 2 } : p) };
    const kickoff = expectScoutingMatchesKickoff(rival);
    if (mode === 'unavailable starters') {
      for (const id of excluded) expect(kickoff.roster!.some(p => p.id === id)).toBe(false);
    } else expect(kickoff).toEqual(teamSheetFromRival(rival, playerRivalContext(getState())));
  });
  it('renders eight fitted plan buttons and three half-time counts', () => {
    stubDocument();
    const card = showPlanCard({head:'Half-time', roster:nine(60), tactics:{attack:'balanced',defence:'slide'}, numbers:halfTimeNumbers([], 'you', 'balanced'), onPick:()=>null, onDone:()=>{} });
    const root = card.el as unknown as StubNode;
    expect(root.all().filter(n => n.hasAttribute('data-fit'))).toHaveLength(8);
    expect(root.textContent).toContain('Breaks 0 ↓');
    expect(root.textContent).toContain('Kicks 0 ↓');
    expect(root.textContent).toContain('Errors 0 ↑');
    card.close();
  });
});
