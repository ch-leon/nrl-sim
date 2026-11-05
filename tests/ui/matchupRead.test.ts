import { afterEach, describe, expect, it, vi } from 'vitest';
import { fitStars, fitRead, matchupRead, counterRead, halfTimeNumbers } from '../../src/ui/matchupRead';
import { renderPlanFit } from '../../src/ui/planFit';
import { stubDocument, type StubNode } from './stubDom';
import { createNewGame, getState, setState } from '../../src/core/state';
import { initLeague } from '../../src/systems/fixtures';
import { openNextMatch } from '../../src/ui/screens/fixtures';
import { openRivalSquad } from '../../src/ui/screens/rivalSquad';
import { showPlanCard } from '../../src/ui/screens/matchOverlay';
import type { RosterEntry, MatchEvent } from '../../src/sim/events';
const nine = (n: number): RosterEntry[] => ['prop', 'winger', 'halfback'].map(position => ({ name: 'Kai Jones', position: position as RosterEntry['position'], stats: { speed:n, strength:n, skill:n, stamina:n, footyIQ:n } }));
afterEach(() => vi.unstubAllGlobals());
describe('strategy readouts #467', () => {
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
    roster[0] = { ...roster[0]!, name: 'Tui Jones', stats: { ...roster[0]!.stats!, skill: 90 } };
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
