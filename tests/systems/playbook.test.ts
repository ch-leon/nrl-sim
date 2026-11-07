// tests/systems/playbook.test.ts — the playbook (#326, plan §2.3, §11 phase 2):
// a play bought once with money from the matching attack coach, booked on the
// facilities line and kept when he goes; the three taken in checked against
// the playbook. The coach himself is in staff.test.ts.
import { describe, it, expect, beforeEach } from 'vitest';
import { bus } from '../../src/core/events';
import { createNewGame, emptyFinance, getState, setState } from '../../src/core/state';
import { PLAY_IDS, PLAYS_BY_ID, type PlayId } from '../../src/data/plays';
import { PLAYS } from '../../src/match/league/plays';
import { ATTACK_SPECIALITIES, hireAttackCoach, releaseStaff } from '../../src/systems/staff';
import { buyPlay, buyRefusal, ownedPlays, playReason, togglePlay, validPlays } from '../../src/systems/playbook';
import { classifyReason, registerFinanceSystem } from '../../src/systems/economy';

beforeEach(() => {
  bus.clear();
  createNewGame('Plays FC', 326);
});

describe('buying a play (plan §2.1, §2.3)', () => {
  it('needs the coach who teaches it and the money; books `play: <id>` on the facilities line', () => {
    expect(buyRefusal(getState(), 'block-play')).toBe('Hire the direct coach');
    expect(buyPlay('block-play')).toBe(false);
    hireAttackCoach('width');
    expect(buyRefusal(getState(), 'block-play')).toBe('Hire the direct coach');
    releaseStaff('attackCoach');
    hireAttackCoach('direct');
    setState({ money: PLAYS_BY_ID['block-play'].price - 1 });
    expect(buyRefusal(getState(), 'block-play')).toBe('Not enough money');
    expect(buyPlay('block-play')).toBe(false);
    expect(ownedPlays(getState())).toEqual([]);

    setState({ money: 100_000, finance: [emptyFinance(1)] });
    const seen: { delta: number; reason: string }[] = [];
    const offSeen = bus.on('money:changed', (e) => seen.push(e));
    const off = registerFinanceSystem();
    expect(buyPlay('block-play')).toBe(true);
    off();
    offSeen();
    expect(getState().money).toBe(100_000 - 8000);
    expect(seen).toEqual([{ delta: -8000, reason: 'play: block-play', balance: 92_000 }]);
    expect(playReason('block-play')).toBe('play: block-play');
    expect(classifyReason('play: block-play')).toBe('facilities');
    expect(classifyReason('undo:play: block-play')).toBe('facilities');
    expect(getState().finance[0]!.facilities).toBe(-8000);
    expect(getState().finance[0]!.other).toBe(0);
    expect(ownedPlays(getState())).toEqual(['block-play']);
    // Bought once.
    expect(buyRefusal(getState(), 'block-play')).toBe('Already yours');
    expect(buyPlay('block-play')).toBe(false);
    expect(getState().money).toBe(92_000);
  });

  it('every play is opened by exactly one coach, at its catalogue price', () => {
    setState({ money: 1_000_000, reputation: 80 });
    for (const sp of ATTACK_SPECIALITIES) {
      hireAttackCoach(sp);
      for (const id of PLAY_IDS) expect(buyRefusal(getState(), id) === null).toBe(PLAYS_BY_ID[id].family === sp);
      releaseStaff('attackCoach');
    }
  });

  it('plays bought stay when the coach goes, with no penalty, and stay taken', () => {
    hireAttackCoach('direct');
    buyPlay('block-play');
    buyPlay('inside-ball');
    setState({ lineup: togglePlay(getState().lineup, 'block-play', ownedPlays(getState())) });
    const money = getState().money;
    releaseStaff('attackCoach');
    expect(ownedPlays(getState())).toEqual(['block-play', 'inside-ball']);
    expect(getState().lineup.plays).toEqual(['block-play']);
    expect(getState().money).toBe(money);
    expect(validPlays(getState().lineup.plays, getState().playbook.owned)).toEqual(['block-play']);
    // A new coach of another speciality opens his own family; the old plays stay.
    hireAttackCoach('kicking');
    expect(buyRefusal(getState(), 'kick-pass')).toBeNull();
    expect(buyRefusal(getState(), 'short-side-raid')).toBe('Hire the direct coach');
    expect(ownedPlays(getState())).toEqual(['block-play', 'inside-ball']);
  });
});

describe('the three taken in (validPlays, togglePlay)', () => {
  const owned: PlayId[] = ['block-play', 'inside-ball', 'short-side-raid', 'kick-pass'];

  it('validPlays keeps known, owned plays, each once, in order, at most three', () => {
    expect(PLAYS.takeMax).toBe(3);
    expect(validPlays(['inside-ball', 'block-play'], owned)).toEqual(['inside-ball', 'block-play']);
    expect(validPlays(['not-a-play', 'block-play'], owned)).toEqual(['block-play']);
    expect(validPlays(['cut-out-winger', 'block-play'], owned)).toEqual(['block-play']); // not owned
    expect(validPlays(['block-play', 'block-play', 'kick-pass'], owned)).toEqual(['block-play', 'kick-pass']);
    expect(validPlays(['block-play', 'inside-ball', 'short-side-raid', 'kick-pass'], owned)).toEqual(['block-play', 'inside-ball', 'short-side-raid']);
    expect(validPlays(undefined, owned)).toEqual([]);
    expect(validPlays(['block-play'], undefined)).toEqual([]);
    expect(validPlays(['block-play'], ['bogus', 'block-play'])).toEqual(['block-play']);
  });

  it('togglePlay takes in the order tapped, leaves one out on a second tap, and refuses a fourth or one not owned', () => {
    let l = getState().lineup;
    expect(l.plays).toEqual([]);
    for (const id of ['kick-pass', 'block-play', 'inside-ball'] as PlayId[]) l = togglePlay(l, id, owned);
    expect(l.plays).toEqual(['kick-pass', 'block-play', 'inside-ball']);
    expect(togglePlay(l, 'short-side-raid', owned)).toBe(l);
    l = togglePlay(l, 'block-play', owned);
    expect(l.plays).toEqual(['kick-pass', 'inside-ball']);
    expect(togglePlay(l, 'cut-out-winger', owned)).toBe(l);
    l = togglePlay(l, 'short-side-raid', owned);
    expect(l.plays).toEqual(['kick-pass', 'inside-ball', 'short-side-raid']);
    // The rest of the lineup is untouched.
    expect({ ...l, plays: [] }).toEqual(getState().lineup);
  });
});
