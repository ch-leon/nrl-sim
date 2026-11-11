import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createLegacyGame } from '../helpers/legacyGame';
import { getState, setState, SAVE_VERSION } from '../../src/core/state';
import { bus } from '../../src/core/events';
import { earnMoney } from '../../src/data/club';
import { initLeague } from '../../src/systems/fixtures';
import { preparePack, selectPack } from '../../src/content';
import { TRAINING_FOCI } from '../../src/systems/training';
import { PERSONAS, personaById } from '../../src/qa/personas';
import { effectValue } from '../../src/qa/personas/policy';
import { careerRoundTrip, observeCareer, type CareerMatch } from '../../src/qa/personas/metrics';
import { compareBaseline, makeBaseline, outliers, personaReport, summarisePersonas } from '../../src/qa/personas/report';
import { runSoak, FINANCE_LINES, type SoakResult } from '../../src/qa/soak';

const stable = ({ ms: _elapsed, ...r }: SoakResult) => r;
describe('AI personas (#534)', () => {
  it('ships exactly four complete policy configs with the agreed mistake rates', () => {
    expect(PERSONAS.map(p => p.id)).toEqual(['careless', 'casual-weekly', 'min-maxer', 'newcomer']);
    const ranges = { 'min-maxer': [0, 0.05], 'casual-weekly': [0.15, 0.25], careless: [0.5, 0.7], newcomer: [0.1, 0.2] };
    for (const p of PERSONAS) {
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.goals.length).toBeGreaterThan(0);
      expect(p.difficulties).toEqual(['easy', 'normal', 'hard']);
      for (const key of ['events', 'training', 'facilities', 'recruits', 'staff', 'tactics', 'attackCoach', 'setPlays']) expect(p).toHaveProperty(key);
      const [low, high] = ranges[p.id as keyof typeof ranges];
      expect(p.mistakeRate).toBeGreaterThanOrEqual(low!);
      expect(p.mistakeRate).toBeLessThanOrEqual(high!);
    }
    expect(personaById('newcomer')).toMatchObject({ events: 'first', training: 'balanced', tactics: 'defaults', attackCoach: 'none', setPlays: 'none' });
    expect(personaById('casual-weekly').staff.roles).not.toContain('analyst');
    expect(() => personaById('extra')).toThrow('Unknown persona');
  });

  it('smoke: same persona + seed + difficulty + pack produces identical real-career metrics', () => {
    for (const seed of [7919, 15838]) {
      const spec = { seed, seasons: 1, weeks: 4, mode: 'persona' as const, persona: 'min-maxer', difficulty: 'normal' as const, pack: 'au' as const };
      const a = runSoak(spec), b = runSoak(spec);
      expect(a.problems).toEqual([]);
      expect(stable(a)).toEqual(stable(b));
      expect(a.career?.weeks).toBe(4);
      expect(a.career?.matches.filter(m => m.kind === 'regular')).toHaveLength(2);
      expect(a.career?.matches.filter(m => m.kind === 'trial')).toHaveLength(2);
      expect(a.career?.cash).toHaveLength(5);
      expect(a.career?.seasons[0]?.completed).toBe(false);
    }
  }, 30_000);

  it('each starter plays real weeks; defaults stay shallow and min-maxer uses coach/playbook/tactics APIs', () => {
    for (const p of PERSONAS) {
      createLegacyGame('Policy', 42);
      initLeague(getState());
      const config = { ...p, mistakeRate: 0 };
      const r = runSoak({ seed: 42, seasons: 1, weeks: 2, mode: 'persona', persona: config, fromSave: { ...getState(), money: 1_000_000 } });
      expect(r.problems, p.id).toEqual([]);
      expect(r.career?.matches).toHaveLength(2);
      expect(TRAINING_FOCI).toContain(getState().training.focus);
      if (p.id === 'min-maxer') {
        expect(getState().staff.some(s => s.role === 'attackCoach')).toBe(true);
        expect(getState().playbook.owned.length).toBeGreaterThan(0);
        expect(r.career!.matches.some(m => m.takenPlays.length > 0)).toBe(true);
        expect(getState().facilities.length).toBeGreaterThan(0);
      }
      if (p.id === 'newcomer' || p.id === 'casual-weekly') {
        expect(getState().training.focus).toBe('balanced');
        expect(getState().staff.some(s => s.role === 'attackCoach')).toBe(false);
        expect(getState().lineup.plays).toEqual([]);
      }
    }
  }, 30_000);

  it('idle and managed remain usable and preserve the current save version', () => {
    for (const mode of ['idle', 'managed'] as const) {
      const r = runSoak({ seed: 101, seasons: 1, weeks: 3, mode });
      expect(r.problems).toEqual([]);
      expect(r.career).toBeUndefined();
      expect(getState().version).toBe(SAVE_VERSION);
    }
    // Persona runs use the current save envelope and Handling/Kicking players.
    expect(SAVE_VERSION).toBe(26);
  }, 20_000);

  it('UK persona smoke is deterministic with the prepared UK pack', async () => {
    await preparePack('uk');
    try {
      const spec = { seed: 19, seasons: 1, weeks: 3, mode: 'persona' as const, persona: 'newcomer', difficulty: 'easy' as const, pack: 'uk' as const };
      const a = runSoak(spec), b = runSoak(spec);
      expect(a.problems).toEqual([]);
      expect(stable(a)).toEqual(stable(b));
      expect(getState().pack).toBe('uk');
      expect(getState().league.clubs).toHaveLength(12);
      const loaded = runSoak({ seed: 19, seasons: 1, weeks: 1, mode: 'persona', persona: 'newcomer', fromSave: getState() });
      expect(loaded).toMatchObject({ pack: 'uk', difficulty: 'easy', fromSave: true });
      expect(loaded.career?.saves[0]?.ok).toBe(true);
    } finally { selectPack('au'); }
  }, 20_000);

  it('save round-trips install production-validated loads and count repairs or refusals', () => {
    createLegacyGame('Saves', 9); initLeague(getState());
    const s = getState();
    expect(careerRoundTrip(s, 1)).toMatchObject({ ok: true, repairs: [], changed: false });
    const repaired = careerRoundTrip({ ...s, lineup: { ...s.lineup, bench: [s.lineup.starters[0]!, 'gone'] } }, 1);
    expect(repaired.ok).toBe(true);
    expect(repaired.repairs.length).toBeGreaterThan(0);
    expect(getState().lineup.starters).toHaveLength(9);
    const bad = careerRoundTrip({ ...s, money: NaN }, 2);
    expect(bad.ok).toBe(false);
    expect(bad.message).toBeDefined();
  });

  it('reports rejected initial saves instead of hiding them from load-health rollups', () => {
    const r = runSoak({ seed: 1, seasons: 1, mode: 'persona', persona: 'newcomer', fromSave: { version: SAVE_VERSION, money: null } });
    expect(r.persona?.id).toBe('newcomer');
    expect(r.career?.saves).toMatchObject([{ ok: false, repairs: [] }]);
    expect(summarisePersonas([r])[0]).toMatchObject({ runs: 1, unrecoverableLoads: 1, minMoney: null });
    expect(personaReport([r], { compared: 0, warnings: [] })).toContain('unloadable:');
    expect(makeBaseline([r], 'not fresh').cases).toEqual([]);
  });

  it('keeps partial preseason and crashed-week finance, and isolates baseline scenarios', () => {
    bus.clear(); createLegacyGame('Boundary', 5); initLeague(getState());
    const observer = observeCareer(() => 55);
    observer.beforeWeek();
    setState({ season: 2, week: 1, preseason: 1 });
    observer.afterWeek(); // finished season 1
    observer.beforeWeek();
    earnMoney(-123, 'event: Boundary');
    setState({ preseason: 2 });
    observer.afterWeek(); // first trial of season 2; week still 1
    observer.finish(); observer.dispose();
    expect(observer.metrics.seasons.map(s => [s.season, s.completed])).toEqual([[1, true], [2, false]]);
    expect(observer.metrics.seasons[1]?.finance.events).toBe(-123);
    const failed = observeCareer(() => 55);
    const opening = getState().money;
    earnMoney(-500, 'event: Failure');
    failed.metrics.stability.crashes++;
    failed.finish(); failed.dispose();
    expect(failed.metrics.seasons[0]).toMatchObject({ completed: false, minMoney: opening - 500, failures: 1, finance: { events: -500 } });
    const r: SoakResult = { seed: 1, mode: 'persona', persona: personaById('newcomer'), career: observer.metrics,
      start: { bestNine: 55, rivalMean: 55, rivalRange: [50, 60] }, seasons: [], problems: [], ms: 0 };
    const baseline = makeBaseline([r], 'boundaries');
    expect(compareBaseline([{ ...r, liveRivals: true }], baseline).compared).toBe(0);
    expect(compareBaseline([{ ...r, fromVersion: 1 }], baseline).compared).toBe(0);
    expect(makeBaseline([{ ...r, fromSave: true }], 'loaded').cases).toEqual([]);
    const future = structuredClone(r);
    future.career!.seasons[1]!.broke = true;
    future.career!.seasons[1]!.failures = 5;
    const early = baseline.cases.filter(c => c.endpoint === 'season:1');
    expect(compareBaseline([future], { ...baseline, cases: early }).warnings).toEqual([]);
  });

  it('uses expected values for visible money, risk and temporary card effects', () => {
    expect(effectValue({ kind: 'money', amount: 1000 })).toBe(1000);
    expect(effectValue({ kind: 'chance', p: 0.25, hit: [{ kind: 'money', amount: -4000 }], hitNews: [] })).toBe(-1000);
    expect(effectValue({ kind: 'modifier', label: 'Rent', trigger: 'weekly', weeks: 3, effects: [{ kind: 'money', amount: 200 }] })).toBe(600);
  });

  it('flags attack/defence and taken-play win-share outliers versus the rest', () => {
    const game = (win: boolean): CareerMatch => ({ season: 1, round: 1, kind: 'regular', forfeit: false, win, draw: false,
      tactics: { attack: win ? 'grind' : 'balanced', defence: 'slide' }, opponent: { attack: 'balanced', defence: 'rush' }, takenPlays: win ? ['block-play'] : [] });
    const games = [...Array.from({ length: 10 }, () => game(true)), ...Array.from({ length: 10 }, () => game(false))];
    expect(outliers(games, 'strategy').every(o => o.warning)).toBe(true);
    expect(outliers(games, 'play')[0]).toMatchObject({ cell: 'block-play', games: 10, winShare: 1, restGames: 10, restWinShare: 0, warning: true });
    expect(outliers(games.slice(0, 2), 'play')[0]?.warning).toBe(false);
    expect(outliers([{ ...game(true), kind: 'trial' }, { ...game(true), forfeit: true }], 'strategy')).toEqual([]);
  });

  it('baseline comparison warns without failing a healthy run; markdown and rollups cover all metrics', () => {
    const r = runSoak({ seed: 7919, seasons: 1, weeks: 4, mode: 'persona', persona: 'min-maxer', difficulty: 'normal', pack: 'au' });
    const baseline = makeBaseline([r], 'test baseline');
    expect(compareBaseline([r], baseline)).toEqual({ compared: 1, warnings: [] });
    baseline.cases[0]!.endMoney += 100_000;
    expect(compareBaseline([r], baseline).warnings.join()).toContain('end cash fell');
    expect(r.problems).toEqual([]);
    const summary = summarisePersonas([r])[0]!;
    expect(summary.regularGames).toBe(2);
    expect(summary.progression['90']).toMatchObject({ meanWeeks: null, reached: 0, censored: 1 });
    expect(Object.keys(summary.finance)).toEqual([...FINANCE_LINES]);
    const report = personaReport([r], compareBaseline([r], baseline));
    for (const word of ['Baseline warnings', 'Progression', 'unrecoverable', 'thrown ticks', 'taken-play', 'Per career', 'unreached']) expect(report).toContain(word);
    const differentPack = { ...r, pack: 'uk' as const };
    expect(compareBaseline([differentPack], baseline).compared).toBe(0);
    const checked = JSON.parse(readFileSync('src/qa/personas/baseline.json', 'utf8'));
    expect(checked.schema).toBe(1);
  }, 15_000);
});
