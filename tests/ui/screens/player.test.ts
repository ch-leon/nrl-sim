// tests/ui/screens/player.test.ts — the player page's pure view-model (N7, #185).
// The DOM (openPlayerPage) is not rendered here: the vitest env is 'node'.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  fmtTally, lineupSlotText, moraleReasons, moraleWord, playerActions, playerPageModel, positionLabel, riskWord,
} from '../../../src/ui/screens/player';
import { createNewGame, getState, setState, type Player } from '../../../src/core/state';
import { initLeague } from '../../../src/systems/fixtures';
import { bus } from '../../../src/core/events';
import { marketWage, overallRating } from '../../../src/data/player';
import { CONTRACTS, MORALE, SQUAD_CAP, SQUAD_MIN } from '../../../src/config';
import { renewalFee, transferFee } from '../../../src/systems/contracts';
import { RELEASE_PAYOUT_WEEKS, signingFee } from '../../../src/systems/freeagency';

describe('words', () => {
  it('morale, risk and position read as words', () => {
    expect([85, 70, 69, 50, 49, 30, 29, 1].map(moraleWord))
      .toEqual(['Happy', 'Happy', 'Content', 'Content', 'Unsettled', 'Unsettled', 'Unhappy', 'Unhappy']);
    expect([1, 33, 34, 66, 67, 100].map(riskWord)).toEqual(['low', 'low', 'moderate', 'moderate', 'high', 'high']);
    expect(positionLabel('five-eighth')).toBe('Five-Eighth');
    expect(positionLabel('prop')).toBe('Prop');
  });

  it('formats a tally with the right plurals', () => {
    expect(fmtTally({ games: 1, tries: 1, tackles: 1, lineBreaks: 1 })).toBe('1 game · 1 try · 1 tackle · 1 line break');
    expect(fmtTally({ games: 12, tries: 5, tackles: 140, lineBreaks: 0 })).toBe('12 games · 5 tries · 140 tackles · 0 line breaks');
  });
});

describe('playerPageModel', () => {
  beforeEach(() => {
    bus.clear();
    setState(createNewGame('Test FC', 11));
    initLeague(getState());
  });

  it('describes one of your players: traits with tips, morale, contract, tenure, record, three actions', () => {
    const s = getState();
    const p = s.squad.find((x) => x.traits.length > 0) ?? s.squad[0]!;
    const m = playerPageModel(p, { kind: 'squad' }, s);
    expect(m.where).toMatch(/^Your squad · (Starting \S+|On the bench|Not picked)$/); // the lineup slot (N14)
    expect(m.overall).toBe(overallRating(p));
    expect(m.stats.map((x) => x.label)).toEqual(['Speed', 'Strength', 'Stamina', 'Skill', 'Footy IQ']);
    expect(m.traits).toHaveLength(p.traits.length);
    for (const t of m.traits) {
      expect(t.label).toMatch(/ (I|II|III)$/);
      expect(t.tip.length).toBeGreaterThan(5);
    }
    expect(m.morale.word).toBe(moraleWord(p.morale));
    expect(m.fitness).toBe('Fit');
    expect(m.contract.text).toContain(`${p.contractWeeks} weeks left`);
    expect(m.tenure).toBe('Joined in season 1 · 1st season at the club');
    expect(m.season).toEqual({ games: 0, tries: 0, tackles: 0, lineBreaks: 0 });
    expect(m.career).toEqual(p.career);
    expect(m.actions.map((a) => a.id)).toEqual(['renew', 'sell', 'release']);
  });

  it('shows whole-number stats when training has left fractions', () => {
    const s = getState();
    const p = { ...s.squad[0]!, stats: { speed: 78.6487606885, strength: 54.428, stamina: 55, skill: 60.5, footyIQ: 41.49 } };
    expect(playerPageModel(p, { kind: 'squad' }, s).stats.map((x) => x.value)).toEqual([79, 54, 55, 61, 41]);
  });

  it('prices the squad actions the way the Contracts screen does and guards them', () => {
    const s = getState();
    const p = s.squad[0]!;
    const [renew, sell, release] = playerActions(p, { kind: 'squad' }, s);
    expect(renew!.label).toContain(renewalFee(s, p).toLocaleString('en-US'));
    expect(renew!.enabled).toBe(true);
    expect(sell!.label).toContain(transferFee(p).toLocaleString('en-US'));
    expect(sell!.confirm).toBe('Really sell?');
    expect(release!.label).toContain((RELEASE_PAYOUT_WEEKS * p.wage).toLocaleString('en-US'));
    expect(release!.danger).toBe(true);

    // A full-length contract cannot be renewed; a broke club cannot pay the fee.
    const fresh = { ...p, contractWeeks: CONTRACTS.NEW_CONTRACT_WEEKS };
    expect(playerActions(fresh, { kind: 'squad' }, s)[0]).toMatchObject({ enabled: false, why: 'Contract already full length' });
    expect(playerActions(p, { kind: 'squad' }, { ...s, money: 0 })[0]).toMatchObject({ enabled: false, why: 'Not enough money for the fee' });
    // At the minimum squad nobody can leave.
    const thin = { ...s, squad: s.squad.slice(0, SQUAD_MIN) };
    const acts = playerActions(thin.squad[0]!, { kind: 'squad' }, thin);
    expect(acts[1]).toMatchObject({ enabled: false, why: `Squad at the minimum (${SQUAD_MIN})` });
    expect(acts[2]).toMatchObject({ enabled: false });
  });

  it('explains low morale: under the market, a contract running down, injured', () => {
    const p = getState().squad[0]!;
    expect(moraleReasons({ ...p, wage: marketWage(p), contractWeeks: 40, injuredWeeks: 0 })).toEqual([]);
    const reasons = moraleReasons({ ...p, wage: Math.floor(marketWage(p) * MORALE.LOW_PAY_RATIO) - 1, contractWeeks: MORALE.EXPIRING_WEEKS, injuredWeeks: 2 });
    expect(reasons).toHaveLength(3);
    expect(reasons[0]).toContain('paid under the market');
    expect(reasons[1]).toBe('contract running down');
    expect(reasons[2]).toBe('injured');
  });

  it('offers a free agent for signing at the recruit screen’s fee, or says why not', () => {
    const s = getState();
    const a = s.freeAgents[0]!;
    const m = playerPageModel(a, { kind: 'freeAgent' }, s);
    expect(m.where).toBe('Free agent');
    expect(m.tenure).toBeNull();
    expect(m.season).toBeNull();
    expect(m.morale.reasons).toEqual([]);
    expect(m.contract.text).toMatch(/^Asks \$[\d,]+\/wk on a 52-week deal$/);
    expect(m.actions).toHaveLength(1);
    expect(m.actions[0]).toMatchObject({ id: 'sign', enabled: true });
    expect(m.actions[0]!.label).toContain(signingFee(s, a).toLocaleString('en-US'));
    expect(playerActions(a, { kind: 'freeAgent' }, { ...s, money: 0 })[0]).toMatchObject({ enabled: false, why: 'Not enough money for the fee' });
    const full: Player[] = Array.from({ length: SQUAD_CAP }, (_, i) => ({ ...s.squad[0]!, id: `p${i}` }));
    expect(playerActions(a, { kind: 'freeAgent' }, { ...s, squad: full })[0]).toMatchObject({ enabled: false, why: `Squad full (${SQUAD_CAP})` });
    expect(playerPageModel({ ...a, junior: true }, { kind: 'freeAgent' }, s).where).toBe('Academy prospect');
  });

  it('shows a rival’s player read-only, under the rival’s name', () => {
    const s = getState();
    const club = s.league.clubs.find((c) => c.squad)!;
    const p = { ...club.squad![0]!, injuredWeeks: 3 };
    const m = playerPageModel(p, { kind: 'rival', club }, s);
    expect(m.where).toBe(club.name);
    expect(m.fitness).toBe('Out 3 weeks');
    expect(m.injured).toBe(true);
    expect(m.actions).toEqual([]);
    expect(m.tenure).toBeNull();
    expect(m.season).toBeNull();
  });
});

// N14 (#263): the player page says where he sits in the side that runs out.
describe('lineupSlotText', () => {
  beforeEach(() => {
    bus.clear();
    setState(createNewGame('Test FC', 11));
    initLeague(getState());
  });

  it('a starter by his slot, the bench, or not picked', () => {
    const s = getState();
    s.squad.forEach((p) => { p.injuredWeeks = 0; });
    s.lineup.starters = s.squad.slice(0, 9).map((p) => p.id);
    s.lineup.bench = s.squad.slice(9, 13).map((p) => p.id);
    expect(lineupSlotText(s, s.squad[0]!.id)).toBe('Starting fullback');
    expect(lineupSlotText(s, s.squad[9]!.id)).toBe('On the bench');
    const rest = s.squad.filter((p) => !lineupSlotText(s, p.id).startsWith('Starting') && lineupSlotText(s, p.id) !== 'On the bench');
    for (const p of rest) expect(lineupSlotText(s, p.id)).toBe('Not picked');
  });

  it('an injured starter is out of the side and the man covering him is starting', () => {
    const s = getState();
    s.squad.forEach((p) => { p.injuredWeeks = 0; });
    const fb = s.squad[0]!;
    s.lineup.starters = [fb.id, ...s.squad.slice(1, 9).map((p) => p.id)];
    s.lineup.bench = s.squad.slice(9, 13).map((p) => p.id);
    fb.injuredWeeks = 3;
    expect(lineupSlotText(s, fb.id)).toBe('Picked, but injured');
    const cover = s.squad.find((p) => lineupSlotText(s, p.id) === 'Starting fullback');
    expect(cover).toBeDefined();
    expect(cover!.id).not.toBe(fb.id);
  });
});
