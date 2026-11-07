// tests/match/league/plays.test.ts — set plays, the pure half (#326, plan §3.1,
// §11 phase 1): the catalogue's shape, the odds table, when each play can be
// run, the half's own pick, a rival's plays, and the fit line that names the
// man furthest short.
import { describe, it, expect, afterEach } from 'vitest';
import { PLAY_IDS, PLAY_LIST, PLAYS_BY_ID, isPlayId, playsOfFamily, type Play, type PlayId } from '../../../src/data/plays';
import { NO_AUTO_USED, PLAYS, STYLE_FAMILY, pickAutoPlay, playBonus, playFit, playOdds, playOfDetail, playOutcome, playShortTitle, playTitle, playWhen, rivalPlays, roleSlot, sheetPlays, stylePlays, type PlayFacts, type PlayMan } from '../../../src/match/league/plays';
import { applyTuning } from '../../../src/match/league/tuning';

const nine = (iq: number, over: Record<number, number> = {}): PlayMan[] => Array.from({ length: 9 }, (_, slot) => ({ name: `Man ${slot}`, footyIQ: over[slot] ?? iq }));

const ZONE_TO_LINE = { own20: 90, ownHalf: 70, midfield: 50, attackingHalf: 30, redZone: 10 } as const;

/** Facts under which `play` can be run: its first launch point, its first tackle, the middle of its first zone (or its distance band). */
function goodFacts(play: Play): PlayFacts {
  const from = play.from[0]!;
  const tackle = play.when.tackles?.[0] ?? 1;
  const toLine = play.when.toLineM ? (play.when.toLineM[0] + play.when.toLineM[1]) / 2 : ZONE_TO_LINE[play.when.zones?.[0] ?? 'midfield'];
  return { from, tackle, toLine, touchM: play.when.side === 'short' ? 10 : 30, last: false, kickAway: false };
}

let restore: (() => void) | null = null;
afterEach(() => {
  restore?.();
  restore = null;
});

describe('the catalogue (plan §2.1)', () => {
  it('has ten plays, two or three a style, every family, needs 48–70, flat one-off prices', () => {
    expect(PLAY_LIST).toHaveLength(10);
    expect(new Set(PLAY_IDS).size).toBe(10);
    for (const style of ['grind', 'expansive', 'kick-chase', 'all-out'] as const) {
      const n = PLAY_LIST.filter((p) => p.style === style).length;
      expect(n, style).toBeGreaterThanOrEqual(2);
      expect(n, style).toBeLessThanOrEqual(3);
    }
    expect(playsOfFamily('direct').map((p) => p.id)).toEqual(['block-play', 'inside-ball', 'short-side-raid']);
    expect(playsOfFamily('width').map((p) => p.id)).toEqual(['cut-out-winger', 'second-man', 'block-shift']);
    expect(playsOfFamily('kicking').map((p) => p.id)).toEqual(['kick-pass', 'chip-chase']);
    expect(playsOfFamily('razzle').map((p) => p.id)).toEqual(['tap-rambo', 'long-ball']);
    for (const p of PLAY_LIST) {
      for (const r of p.roles) {
        expect(r.iq, `${p.id} ${r.job}`).toBeGreaterThanOrEqual(48);
        expect(r.iq, `${p.id} ${r.job}`).toBeLessThanOrEqual(70);
      }
      expect(p.price).toBeGreaterThan(0);
      expect(p.script.length, p.id).toBeGreaterThanOrEqual(1);
      expect(p.roles.some((r) => r.job === 'caller' || r.job === 'kicker' || r.job === 'taker'), p.id).toBe(true);
      expect(Boolean(p.kick), p.id).toBe(p.family === 'kicking');
      // A decoy never takes the pass.
      for (const d of p.decoys) expect(p.script.some((s) => s.to === d.to), `${p.id} decoy`).toBe(false);
    }
    expect(isPlayId('block-play')).toBe(true);
    expect(isPlayId('the-flying-wedge')).toBe(false);
  });
  it('ships the scrum plays from a tap too, so they play before scrums exist (#327)', () => {
    for (const p of PLAY_LIST.filter((x) => x.from.includes('scrum'))) expect(p.from, p.id).toContain('tap');
    expect(PLAYS_BY_ID['tap-rambo'].from).toEqual(['tap', 'scrum']);
    expect(PLAYS_BY_ID['long-ball'].from).toEqual(['tap', 'scrum', 'ptb']);
  });
  it('names a play for the commentary and the ticker', () => {
    expect(playTitle(PLAYS_BY_ID['block-play'])).toBe('the block play');
    expect(playTitle(PLAYS_BY_ID['tap-rambo'])).toBe('the Rambo');
    expect(playShortTitle(PLAYS_BY_ID['cut-out-winger'])).toBe('the cut-out');
    expect(playShortTitle(PLAYS_BY_ID['long-ball'])).toBe('the long ball');
    expect(playOfDetail('set-play:kick-pass')?.id).toBe('kick-pass');
    expect(playOfDetail('chip-chase')?.id).toBe('chip-chase');
    expect(playOfDetail('shift-left')).toBeNull();
  });
});

describe('playOdds (plan §3.1)', () => {
  const block = PLAYS_BY_ID['block-play'];
  it('zero shortfall with no style or counter term is failBase; ten short on two roles is +0.30; capped', () => {
    // A Balanced side against Rush: block play is Tight, and Tight v Rush is neutral in the matrix.
    expect(playOdds(block, 0, 'balanced', 'rush').fail).toBeCloseTo(PLAYS.failBase);
    expect(playOdds(block, 20, 'balanced', 'rush').fail).toBeCloseTo(PLAYS.failBase + 0.3);
    expect(playOdds(block, 200, 'balanced', 'rush').fail).toBe(PLAYS.failCap);
  });
  it('a play of the side’s own style breaks down less; the defence that reads its style more, the one that leaves room less', () => {
    expect(playOdds(block, 0, 'grind', 'rush').fail).toBeCloseTo(PLAYS.failBase + PLAYS.styleFail);
    const cut = PLAYS_BY_ID['cut-out-winger'];
    expect(playOdds(cut, 0, 'balanced', 'slide').fail).toBeCloseTo(PLAYS.failBase + PLAYS.counterFail.against);
    expect(playOdds(cut, 0, 'balanced', 'compressed').fail).toBeCloseTo(PLAYS.failBase + PLAYS.counterFail.for);
    expect(playOdds(cut, 0, 'balanced', 'rush').fail).toBeCloseTo(PLAYS.failBase);
    // Rush punishes the razzle plays and rewards the kicks.
    expect(playOdds(PLAYS_BY_ID['long-ball'], 0, 'balanced', 'rush').fail).toBeCloseTo(PLAYS.failBase + PLAYS.counterFail.against);
    expect(playOdds(PLAYS_BY_ID['kick-pass'], 0, 'balanced', 'rush').fail).toBeCloseTo(PLAYS.failBase + PLAYS.counterFail.for);
    expect(playOdds(cut, 0, 'expansive', 'slide').fail).toBeCloseTo(PLAYS.failBase + PLAYS.styleFail + PLAYS.counterFail.against);
  });
  it('the intercept band grows with the shortfall from the play’s own base, capped', () => {
    expect(playOdds(block, 0, 'balanced', 'rush').intercept).toBeCloseTo(PLAYS.interceptBase);
    expect(playOdds(block, 20, 'balanced', 'rush').intercept).toBeCloseTo(PLAYS.interceptBase + 20 * PLAYS.interceptPerPoint);
    expect(playOdds(PLAYS_BY_ID['tap-rambo'], 0, 'balanced', 'rush').intercept).toBeCloseTo(0.08);
    expect(playOdds(PLAYS_BY_ID['long-ball'], 0, 'balanced', 'rush').intercept).toBeCloseTo(0.1);
    expect(playOdds(block, 500, 'balanced', 'rush').intercept).toBe(PLAYS.interceptCap);
  });
  it('one roll decides: under fail × intercept an intercept, under fail a breakdown, else it comes off', () => {
    const odds = { fail: 0.4, intercept: 0.25 };
    expect(playOutcome(0.05, odds)).toBe('intercept');
    expect(playOutcome(0.0999, odds)).toBe('intercept');
    expect(playOutcome(0.1, odds)).toBe('breakdown');
    expect(playOutcome(0.3999, odds)).toBe('breakdown');
    expect(playOutcome(0.4, odds)).toBe('ok');
  });
  it('scales the success mods by the side’s plan fit only when it plays the play’s style', () => {
    expect(playBonus(PLAYS_BY_ID['second-man'], 'balanced', 1.5)).toEqual({ broken: 0.08, fend: 0.03 });
    const b = playBonus(PLAYS_BY_ID['second-man'], 'expansive', 1.5);
    expect(b.broken).toBeCloseTo(0.12);
    expect(b.fend).toBeCloseTo(0.045);
    restore = applyTuning({ 'plays.bonusByFit': 0 });
    expect(playBonus(PLAYS_BY_ID['second-man'], 'expansive', 1.5)).toEqual({ broken: 0.08, fend: 0.03 });
  });
  it('follows its knobs by name', () => {
    restore = applyTuning({ 'plays.failBase': 0.3, 'plays.failPerPoint': 0.01, 'plays.counterFail.against': 0.1 });
    expect(playOdds(PLAYS_BY_ID['cut-out-winger'], 10, 'balanced', 'slide').fail).toBeCloseTo(0.3 + 0.1 + 0.1);
  });
});

describe('playWhen: every catalogue entry (plan §3.2)', () => {
  it.each(PLAY_IDS)('%s: runs from its own spot, and says why not from anywhere else', (id) => {
    const play = PLAYS_BY_ID[id];
    const ok = goodFacts(play);
    expect(playWhen(play, ok)).toBeNull();
    expect(playWhen(play, { ...ok, kickAway: true })).toBe('the kick’s away');
    expect(playWhen(play, { ...ok, last: true })).toBe(play.kick ? null : 'last tackle');
    // A launch point it has not got.
    const missing = (['ptb', 'tap'] as const).find((f) => !play.from.includes(f));
    if (missing) expect(playWhen(play, { ...ok, from: missing })).toBe('not from here');
    // Outside its zones (their 20 or our 20, whichever it leaves out) or its distance.
    if (play.when.zones && !play.when.zones.includes('own20')) expect(playWhen(play, { ...ok, toLine: 90 })).toBe('not from here');
    if (play.when.toLineM) expect(playWhen(play, { ...ok, toLine: play.when.toLineM[1] + 1 })).toBe('not from here');
    // Outside its tackles.
    if (play.when.tackles) {
      if (play.when.tackles[1] < 5) expect(playWhen(play, { ...ok, tackle: play.when.tackles[1] + 1 })).toBe('not from here');
      if (play.when.tackles[0] > 1) expect(playWhen(play, { ...ok, tackle: play.when.tackles[0] - 1 })).toBe('not from here');
    }
    // The short side needs the ball near touch; every other side does not.
    expect(playWhen(play, { ...ok, touchM: PLAYS.shortSideM + 1 })).toBe(play.when.side === 'short' ? 'not from here' : null);
  });
  it('reads as the table: the block play from your half to theirs on tackles 1–3; the long ball on tackle 1 only', () => {
    const block = PLAYS_BY_ID['block-play'];
    expect(playWhen(block, { from: 'ptb', tackle: 2, toLine: 35, touchM: 30, last: false, kickAway: false })).toBeNull();
    expect(playWhen(block, { from: 'ptb', tackle: 2, toLine: 15, touchM: 30, last: false, kickAway: false })).toBe('not from here');
    expect(playWhen(block, { from: 'tap', tackle: 1, toLine: 35, touchM: 30, last: false, kickAway: false })).toBe('not from here');
    const long = PLAYS_BY_ID['long-ball'];
    expect(playWhen(long, { from: 'tap', tackle: 1, toLine: 50, touchM: 30, last: false, kickAway: false })).toBeNull();
    expect(playWhen(long, { from: 'ptb', tackle: 1, toLine: 50, touchM: 30, last: false, kickAway: false })).toBeNull();
    expect(playWhen(long, { from: 'ptb', tackle: 2, toLine: 50, touchM: 30, last: false, kickAway: false })).toBe('not from here');
    expect(playWhen(PLAYS_BY_ID['kick-pass'], { from: 'ptb', tackle: 5, toLine: 25, touchM: 30, last: true, kickAway: false })).toBeNull();
  });
});

describe('pickAutoPlay: the half’s own call (plan §3.1)', () => {
  const list: PlayId[] = ['block-play', 'second-man', 'inside-ball'];
  const facts: PlayFacts = { from: 'ptb', tackle: 2, toLine: 35, touchM: 30, last: false, kickAway: false };
  it('the first in the list that can be run from here', () => {
    expect(pickAutoPlay(list, facts, NO_AUTO_USED, 0)).toBe('block-play');
    expect(pickAutoPlay(list, { ...facts, toLine: 15 }, NO_AUTO_USED, 0)).toBe('second-man');
    expect(pickAutoPlay(['kick-pass'], facts, NO_AUTO_USED, 0)).toBeNull();
  });
  it('not the same play again for auto.cooldownSets sets', () => {
    const used = { half: 1, launched: 1, lastSet: { 'block-play': 4 } };
    expect(pickAutoPlay(list, facts, used, 4)).toBe('second-man');
    expect(pickAutoPlay(list, facts, used, 4 + PLAYS.auto.cooldownSets - 1)).toBe('second-man');
    expect(pickAutoPlay(list, facts, used, 4 + PLAYS.auto.cooldownSets)).toBe('block-play');
  });
  it('at most auto.perHalf a half', () => {
    expect(pickAutoPlay(list, facts, { half: 1, launched: PLAYS.auto.perHalf - 1, lastSet: {} }, 0)).toBe('block-play');
    expect(pickAutoPlay(list, facts, { half: 1, launched: PLAYS.auto.perHalf, lastSet: {} }, 0)).toBeNull();
  });
});

describe('playFit: the fit line', () => {
  it('names each man against his need, sums the shortfall, and names the worst', () => {
    const fit = playFit(PLAYS_BY_ID['block-play'], nine(60, { 5: 48, 7: 49 }));
    expect(fit.roles.map((r) => [r.slot, r.iq, r.need, r.short])).toEqual([[5, 48, 58, 10], [7, 49, 50, 1], [8, 60, 52, 0]]);
    expect(fit.shortfall).toBe(11);
    expect(fit.worst.name).toBe('Man 5');
    const met = playFit(PLAYS_BY_ID['block-play'], nine(70));
    expect(met.shortfall).toBe(0);
    expect(met.worst.slot).toBe(5);
  });
  it('finds the play side’s winger and edge; with no side, the edge that leaves it further short', () => {
    expect([roleSlot('wing', 'left'), roleSlot('wing', 'right'), roleSlot('edge', 'left'), roleSlot('edge', 'right'), roleSlot(4, 'right')]).toEqual([1, 2, 3, 8, 4]);
    const cut = PLAYS_BY_ID['cut-out-winger'];
    const men = nine(62, { 2: 40 });
    expect(playFit(cut, men, 'left').shortfall).toBe(0);
    expect(playFit(cut, men, 'right').shortfall).toBe(12);
    expect(playFit(cut, men).shortfall).toBe(12);
    expect(playFit(cut, men).worst.slot).toBe(2);
  });
});

describe('rivalPlays (plan §5)', () => {
  it('counts by difficulty: Easy none, Normal one, Hard three (or the family’s all)', () => {
    expect(rivalPlays('grind', nine(60), 'easy')).toEqual([]);
    expect(rivalPlays('grind', nine(60), 'normal')).toHaveLength(1);
    expect(rivalPlays('grind', nine(60), 'hard')).toEqual(['block-play', 'inside-ball', 'short-side-raid']);
    expect(rivalPlays('kick-chase', nine(60), 'hard')).toEqual(['kick-pass', 'chip-chase']);
  });
  it('picks the family’s plays his nine is least short for, ties in catalogue order, and the same every time', () => {
    // A dumb spine gets the cheap play; a smart one the shift.
    const dumbHalves = nine(66, { 4: 50, 5: 50 });
    const fits = playsOfFamily('width').map((p) => playFit(p, dumbHalves).shortfall);
    const best = playsOfFamily('width')[fits.indexOf(Math.min(...fits))]!.id;
    expect(rivalPlays('expansive', dumbHalves, 'normal')).toEqual([best]);
    expect(rivalPlays('expansive', nine(70), 'normal')).toEqual(['cut-out-winger']);
    expect(rivalPlays('balanced', nine(70), 'hard')).toEqual(stylePlays('balanced'));
    expect(STYLE_FAMILY.balanced).toBe('width');
  });
});

describe('sheetPlays: a sheet’s plays as the sim runs them', () => {
  it('known ids, no repeats, at most three; none with plays.on 0', () => {
    expect(sheetPlays(undefined)).toEqual([]);
    expect(sheetPlays(['block-play', 'block-play', 'nope' as PlayId, 'kick-pass', 'chip-chase', 'long-ball'])).toEqual(['block-play', 'kick-pass', 'chip-chase']);
    restore = applyTuning({ 'plays.on': 0 });
    expect(sheetPlays(['block-play'])).toEqual([]);
  });
});
