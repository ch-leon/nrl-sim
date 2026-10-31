// tests/ui/coachCallsText.test.ts — the coach calls in words (the Coach calls
// page, the Build card, the Guide): every call once at its Coach's Office level,
// locked or unlocked for the club, the next unlock named, and the "when" built
// from the same knobs as the sim's callRefusal.
import { describe, it, expect } from 'vitest';
import { CALLS, CALL_LABEL, COACH_CALLS, unlockedCalls, unlockLevel } from '../../src/match/league/calls';
import { GOALS } from '../../src/match/league/goals';
import { SET_TACKLES } from '../../src/config';
import { callLimitLine, callNames, coachCallsPageData, lockedCallsLine, nextUnlock, officeLevelOf, officeUnlockLine } from '../../src/ui/coachCallsText';
import { coachsOfficeBullet } from '../../src/ui/guide/pages';
import { NINES_PAGE } from '../../src/ui/guide/nines';
import { facilityBlurb } from '../../src/ui/screens/build';
import { FACILITY_CATALOG } from '../../src/data/facility';

const office = (level: number) => (level > 0 ? [{ id: 'co', defId: 'coachsOffice' as const, level, x: 0, y: 0 }] : []);

describe('coachCallsPageData', () => {
  it('lists every call in CALLS.unlocks exactly once, at the level that unlocks it', () => {
    const d = coachCallsPageData(0);
    const listed = d.groups.flatMap((g) => g.calls.map((c) => c.call));
    expect([...listed].sort()).toEqual([...CALLS.unlocks.flat()].sort());
    expect(new Set(listed).size).toBe(listed.length);
    expect([...listed].sort()).toEqual([...COACH_CALLS].sort());
    for (const g of d.groups) for (const c of g.calls) expect(unlockLevel(c.call), c.call).toBe(g.level);
    expect(d.groups.map((g) => g.title)).toEqual(['No office needed', "Coach's Office 1", "Coach's Office 2", "Coach's Office 3"]);
    expect(d.total).toBe(COACH_CALLS.length);
  });

  it('marks each group locked or unlocked for levels 0–3, matching what the match is given', () => {
    for (let level = 0; level <= 3; level++) {
      const d = coachCallsPageData(level);
      expect(d.groups.map((g) => g.unlocked)).toEqual([0, 1, 2, 3].map((i) => i <= level));
      const open = d.groups.filter((g) => g.unlocked).flatMap((g) => g.calls.map((c) => c.call));
      expect([...open].sort()).toEqual([...unlockedCalls(level)].sort());
      expect(d.unlockedCount).toBe(unlockedCalls(level).length);
    }
  });

  it('says the club\'s level and what the next one unlocks, and that all are unlocked at 3', () => {
    expect(coachCallsPageData(0).levelLine).toBe("No Coach's Office yet");
    expect(coachCallsPageData(0).nextLine).toBe("Build a Coach's Office to unlock Shift, Rush, Offload and Gang tackle.");
    expect(coachCallsPageData(1).levelLine).toBe("Coach's Office level 1");
    expect(coachCallsPageData(1).nextLine).toBe('Upgrade it to level 2 to unlock Kick early, Run it, Grubber, Take the two and Tap and go.');
    expect(coachCallsPageData(2).nextLine).toBe('Upgrade it to level 3 to unlock Bomb, Field goal and 40/20.');
    expect(coachCallsPageData(3).nextLine).toBe('Every call is unlocked.');
    expect(nextUnlock(3)).toBeNull();
  });

  it('says when each call can be made from the knobs callRefusal reads', () => {
    const when = (call: string) => coachCallsPageData(3).groups.flatMap((g) => g.calls).find((c) => c.call === call)!.when;
    expect(when('offload')).toBe(`Tackles 1–${CALLS.offload.beforeTackle}`);
    expect(when('kick-early')).toBe(`Tackles ${CALLS.kickEarlyFrom + 1}–${SET_TACKLES - 1}`);
    expect(when('bomb')).toBe(`From tackle ${CALLS.lastFrom + 1}`);
    expect(when('grubber')).toBe(`From tackle ${CALLS.lastFrom + 1}, inside their ${CALLS.grubberInsideM}`);
    expect(when('forty-twenty')).toBe(`From tackle ${CALLS.lastFrom + 1}, behind your 40, in reach of their 20`);
    expect(when('take-two')).toBe('After a penalty in kicking range (a 35%+ shot)');
    expect(when('kickoff-short')).toBe('At your kick-offs');
    expect(when('fresh-legs')).toBe('Once a half, once someone tires');
    expect(when('field-goal')).toContain(`within ${GOALS.fieldGoalRangeM} m`);
    expect(when('field-goal')).toContain('scores level or up to 1 behind');
    // Today's numbers, in words: these move with the knobs above.
    expect(when('offload')).toBe('Tackles 1–4');
    expect(when('kick-early')).toBe('Tackles 3–4');
    expect(when('grubber')).toBe('From tackle 4, inside their 25');
  });

  it('every call has a side, a line of what it does, and the free calls are the ones that don\'t use up the set', () => {
    for (const c of coachCallsPageData(0).groups.flatMap((g) => g.calls)) {
      expect(c.name).toBe(CALL_LABEL[c.call]);
      expect(c.does.length, c.call).toBeGreaterThan(10);
      expect(c.when.length, c.call).toBeGreaterThan(3);
    }
    const free = coachCallsPageData(0).groups.flatMap((g) => g.calls).filter((c) => c.free).map((c) => c.call).sort();
    expect(free).toEqual(['fresh-legs', 'kickoff-long', 'kickoff-short', 'take-two', 'tap-go']);
    expect(callLimitLine()).toBe("One call with the ball and one while defending, each set. Fresh legs, Short kick, Long kick, Take the two and Tap and go don't use up the set's call.");
  });
});

describe('the next unlock, named', () => {
  it('officeUnlockLine: the next level\'s calls, or all unlocked at 3', () => {
    expect(officeUnlockLine(0)).toBe('Level 1 unlocks Shift, Rush, Offload and Gang tackle.');
    expect(officeUnlockLine(1)).toBe('Level 2 unlocks Kick early, Run it, Grubber, Take the two and Tap and go.');
    expect(officeUnlockLine(2)).toBe('Level 3 unlocks Bomb, Field goal and 40/20.');
    expect(officeUnlockLine(3)).toBe('All coach calls are unlocked.');
  });

  it('says Shift once when both shifts are there, each name otherwise', () => {
    expect(callNames(['shift-left', 'shift-right', 'rush'])).toEqual(['Shift', 'Rush']);
    expect(callNames(['shift-left'])).toEqual(['Shift left']);
  });

  it('reads the level back from the calls a match was given', () => {
    for (let level = 0; level <= 3; level++) expect(officeLevelOf(unlockedCalls(level))).toBe(level);
    expect(officeLevelOf([])).toBe(0);
  });

  it('the ticker line fits its width, cutting names to "+N" only when it must', () => {
    expect(lockedCallsLine(1, 56)).toBe("Coach's Office 2 unlocks Kick early, Run it, Grubber +2");
    expect(lockedCallsLine(1, 200)).toBe("Coach's Office 2 unlocks Kick early, Run it, Grubber, Take the two and Tap and go");
    expect(lockedCallsLine(3, 56)).toBeNull();
  });

  it('the Build card: the Coach\'s Office unlocks coach calls as well as morale, naming the club\'s next level', () => {
    const def = FACILITY_CATALOG.coachsOffice;
    const at = (officeLevel: number) => facilityBlurb(def, { level: 1, reputation: 30, officeLevel });
    for (let lv = 0; lv <= 3; lv++) {
      expect(at(lv)).toContain('squad morale/week');
      expect(at(lv)).toContain('Unlocks coach calls.');
      expect(at(lv)).toContain(officeUnlockLine(lv));
    }
    expect(at(0)).toContain('Level 1 unlocks Shift, Rush, Offload and Gang tackle.');
    expect(at(1)).toContain('Level 2 unlocks Kick early, Run it, Grubber, Take the two and Tap and go.');
    expect(at(3)).toContain('All coach calls are unlocked.');
    // With no club level given, a club with none built.
    expect(facilityBlurb(def)).toContain('Level 1 unlocks');
  });

  it('the Guide\'s Grounds page: IQ, skill, morale and the calls, with the club\'s next level', () => {
    expect(coachsOfficeBullet({ facilities: [] })).toContain('IQ and skill, and morale, and it unlocks coach calls');
    expect(coachsOfficeBullet({ facilities: [] })).toContain('Level 1 unlocks Shift, Rush, Offload and Gang tackle.');
    expect(coachsOfficeBullet({ facilities: office(2) })).toContain('Yours is level 2. Level 3 unlocks Bomb, Field goal and 40/20.');
    expect(coachsOfficeBullet({ facilities: office(3) })).toContain('All coach calls are unlocked.');
  });

  it('the Guide\'s coach calls section names each level\'s calls from CALLS.unlocks and links to the page', () => {
    const sec = NINES_PAGE.sections.find((s) => s.heading === 'Tactics, traits and coach calls')!;
    expect(sec.link).toBe('calls');
    const text = sec.bullets!.join(' ');
    expect(text).toContain('level 1, Shift, Rush, Offload and Gang tackle');
    expect(text).toContain('level 3, Bomb, Field goal and 40/20');
  });
});
