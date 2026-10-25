// tests/systems/wildcards.test.ts — off-field wildcard cards and the Bali trip (#324, #325).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  absWeek, applyEffects, applySeasonEvents, describeEffects, drawEvent, effectiveChance,
  eventsTick, incidentWeight, isEligible, resolveDueRollovers, resolveEvent,
} from '../../src/systems/events';
import { cardById, EVENT_CARDS } from '../../src/data/events';
import { initLeague } from '../../src/systems/fixtures';
import { createNewGame, getState, resetForNewSeason, setState, type GameState, type Player } from '../../src/core/state';
import { bus } from '../../src/core/events';
import { clearSeasonHooks, clearTickHooks } from '../../src/core/time';
import { makeRng, type Rng } from '../../src/utils/rng';
import { EVENTS, WILDCARDS } from '../../src/config';
import { reviewSuspension } from '../../src/systems/suspension';
import { isFieldable, resolveLineup } from '../../src/systems/lineup';
import { applyInjuries } from '../../src/systems/training';
import { clampMorale } from '../../src/systems/morale';
import { asOldSave } from '../../src/qa/soak';
import { __setStorage, load, migrateState, save, setActiveSlot, type StorageLike } from '../../src/core/save';

beforeEach(() => {
  bus.clear();
  clearTickHooks();
  clearSeasonHooks();
});

const fresh = (seed = 7): GameState => {
  createNewGame('Test FC', seed);
  initLeague(getState());
  return getState();
};

/** Floats consumed in order by next(), and by int() / pick() which are built on it. */
function scripted(rolls: readonly number[]): Rng {
  const q = [...rolls];
  const next = (): number => {
    const n = q.shift();
    if (n === undefined) throw new Error('scripted rng ran out');
    return n;
  };
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    pick: <T>(arr: readonly T[]): T => {
      if (arr.length === 0) throw new Error('rng.pick: empty');
      return arr[int(0, arr.length - 1)] as T;
    },
    shuffle: <T>(arr: readonly T[]): T[] => [...arr],
    state: () => 0,
  };
}

const withWelfare = (s: GameState): GameState => ({
  ...s,
  staff: [...s.staff, { role: 'welfare', name: 'Pat Doyle', wage: 700, hiredSeason: 1 }],
});

const week2 = (s: GameState): GameState => ({ ...s, season: 2, week: 1 });

describe('wildcard odds', () => {
  it('shows the incident chance, and half of it once a Welfare Manager is hired', () => {
    expect(effectiveChance(WILDCARDS.INCIDENT_CHANCE, true, false)).toBe(0.25);
    expect(effectiveChance(WILDCARDS.INCIDENT_CHANCE, true, true)).toBe(0.125);
    expect(effectiveChance(0.25, false, true)).toBe(0.25);
    const bali = cardById('baliTrip')!.choices[0]!.effects;
    expect(describeEffects(bali)).toContain('25%');
    expect(describeEffects(bali, { welfare: true })).toContain('12.5%');
    expect(describeEffects(bali, { welfare: true })).toContain('2-3 week ban');
  });

  it('a roll of 0.2 hits without Welfare and misses with them; 0.1 hits either way', () => {
    const s = week2(fresh());
    const effects = cardById('baliTrip')!.choices[0]!.effects;
    const ctx = { cardId: 'baliTrip', reason: 'event: Trip to Bali', now: absWeek(2, 1), clubName: s.clubName };
    const banned = (state: GameState, rolls: number[]): number =>
      applyEffects(state, effects, ctx, scripted(rolls)).state.squad.filter((p) => (p.suspendedWeeks ?? 0) > 0).length;

    // Chance roll, then (on a hit) the player weight, the ban length, and the story line.
    expect(banned(s, [0.2, 0, 0, 0])).toBe(1);
    expect(banned(withWelfare(s), [0.2])).toBe(0);
    expect(banned(s, [0.1, 0, 0, 0])).toBe(1);
    expect(banned(withWelfare(s), [0.1, 0, 0, 0])).toBe(1);
    expect(banned(s, [0.1, 0, 0.99, 0])).toBe(1);
    const long = applyEffects(s, effects, ctx, scripted([0.1, 0, 0.99, 0]));
    expect(long.state.squad.find((p) => (p.suspendedWeeks ?? 0) > 0)!.suspendedWeeks).toBe(3);
    const short = applyEffects(s, effects, ctx, scripted([0.1, 0, 0, 0]));
    expect(short.state.squad.find((p) => (p.suspendedWeeks ?? 0) > 0)!.suspendedWeeks).toBe(2);
  });

  it('letting them go lands on about a quarter of trips, and half of that with Welfare', () => {
    const base = week2(fresh(3));
    const run = (welfare: boolean, seed: number): { id?: string; weeks?: number } => {
      const s: GameState = {
        ...(welfare ? withWelfare(base) : base),
        eventDeck: { ...base.eventDeck, rng: seed, pending: [], cooldowns: {}, flags: [] },
      };
      const offered = applySeasonEvents(s);
      const ev = offered.eventDeck.pending.find((p) => p.cardId === 'baliTrip')!;
      const r = resolveEvent(offered, ev.id, 0, absWeek(2, 1))!;
      const who = r.state.squad.find((p) => (p.suspendedWeeks ?? 0) > 0);
      return who?.suspendedWeeks ? { id: who.id, weeks: who.suspendedWeeks } : {};
    };

    const seeds = 4000;
    const plain = Array.from({ length: seeds }, (_, i) => run(false, i + 1));
    const cared = Array.from({ length: seeds }, (_, i) => run(true, i + 1));
    const plainHits = plain.filter((h) => h.weeks);
    const caredHits = cared.filter((h) => h.weeks);
    expect(plainHits.length / seeds).toBeGreaterThan(0.21);
    expect(plainHits.length / seeds).toBeLessThan(0.29);
    expect(caredHits.length / seeds).toBeGreaterThan(0.09);
    expect(caredHits.length / seeds).toBeLessThan(0.16);
    expect(caredHits.length / plainHits.length).toBeGreaterThan(0.35);
    expect(caredHits.length / plainHits.length).toBeLessThan(0.65);
    for (const h of [...plainHits, ...caredHits]) expect(h.weeks === 2 || h.weeks === 3).toBe(true);

    const a = run(false, 42);
    const b = run(false, 42);
    expect(a).toEqual(b);
  });

  it('weights a hothead on low morale about nine times a calm player, and not by rating', () => {
    const s = fresh();
    const hot: Player = {
      ...s.squad[0]!, id: 'hot', name: 'Hot Head', morale: 20, junior: false,
      injuredWeeks: 0, suspendedWeeks: 0, traits: [{ id: 'hothead', level: 3 }],
    };
    const calm: Player = {
      ...s.squad[1]!, id: 'calm', name: 'Calm Hand', morale: 80, junior: false,
      injuredWeeks: 0, suspendedWeeks: 0, traits: [], stats: { ...s.squad[1]!.stats, skill: 99, footyIQ: 99 },
    };
    expect(incidentWeight(hot)).toBe(9);
    expect(incidentWeight(calm)).toBe(1);
    const state = { ...s, squad: [calm, hot] };
    const effect = [{
      kind: 'chance' as const, p: 1, risk: true, pick: 'incident' as const,
      hit: [{ kind: 'suspend' as const, weeks: 1, source: 'event' as const }],
      hitNews: ['{player}'],
    }];
    let hotHits = 0;
    const n = 2000;
    for (let seed = 0; seed < n; seed++) {
      const r = applyEffects(state, effect, { cardId: 'x', reason: 'x', now: 1, clubName: s.clubName }, makeRng(seed));
      const who = r.state.squad.find((p) => (p.suspendedWeeks ?? 0) > 0);
      if (who?.id === 'hot') hotHits++;
    }
    expect(hotHits / n).toBeGreaterThan(0.86);
    expect(hotHits / n).toBeLessThan(0.94);
  });
});

describe('ban carry-over', () => {
  it('offers the trip once at the new season, and again the season after', () => {
    const s = fresh();
    expect(s.eventDeck.pending.some((p) => p.cardId === 'baliTrip')).toBe(false);
    expect(isEligible(cardById('baliTrip')!, s, 1)).toBe(false);
    const offered = applySeasonEvents(week2(s));
    const trips = offered.eventDeck.pending.filter((p) => p.cardId === 'baliTrip');
    expect(trips).toHaveLength(1);
    expect(trips[0]!.expiresAt).toBe(absWeek(2, 1));
    expect(applySeasonEvents(offered)).toBe(offered);
    const nextYear = applySeasonEvents({
      ...offered, season: 3, week: 1,
      eventDeck: { ...offered.eventDeck, pending: [] },
    });
    expect(nextYear.eventDeck.pending.filter((p) => p.cardId === 'baliTrip')).toHaveLength(1);
  });

  it('an allowed trip that goes wrong bans someone for the opening weeks, then he plays', () => {
    const s = week2(fresh());
    const offered = applySeasonEvents(s);
    const ev = offered.eventDeck.pending.find((p) => p.cardId === 'baliTrip')!;
    // Hunt a seed whose trip actually goes wrong, then replay that deck.
    let hit: GameState | null = null;
    for (let seed = 1; seed < 80 && !hit; seed++) {
      const trial = resolveEvent(
        { ...offered, eventDeck: { ...offered.eventDeck, rng: seed } },
        ev.id, 0, absWeek(2, 1),
      )!;
      if (trial.state.squad.some((p) => (p.suspendedWeeks ?? 0) >= 2)) hit = trial.state;
    }
    expect(hit).not.toBeNull();
    const who = hit!.squad.find((p) => (p.suspendedWeeks ?? 0) >= 2)!;
    const weeks = who.suspendedWeeks!;
    const lineup = {
      ...hit!.lineup,
      starters: hit!.lineup.starters.map((id, i) => (i === 0 ? who.id : id === who.id ? hit!.lineup.starters[0]! : id)),
    };
    const before = resolveLineup(lineup, hit!.squad);
    expect(before.starters.some((p) => p?.id === who.id)).toBe(false);
    expect(before.fills.some((f) => f.why === 'suspended' && f.out === who.name)).toBe(true);
    expect(isFieldable(who)).toBe(false);

    const quiet: GameState = {
      ...hit!,
      lineup,
      eventDeck: {
        ...hit!.eventDeck,
        pending: [],
        lastDrawn: absWeek(2, 1),
        cooldowns: Object.fromEntries(EVENT_CARDS.map((c) => [c.id, 9_999])),
      },
    };
    let cur = quiet;
    for (let i = 0; i < weeks; i++) {
      expect(isFieldable(cur.squad.find((p) => p.id === who.id)!)).toBe(false);
      cur = eventsTick(cur).state;
    }
    const back = cur.squad.find((p) => p.id === who.id)!;
    expect(back.suspendedWeeks).toBe(0);
    expect(isFieldable(back)).toBe(true);
  });

  it('a ban already on the books survives the season reset', () => {
    const s = fresh();
    setState({ squad: s.squad.map((p, i) => (i === 0 ? { ...p, suspendedWeeks: 3 } : p)) });
    resetForNewSeason();
    const next = getState();
    expect(next.season).toBe(2);
    expect(next.week).toBe(1);
    expect(next.squad[0]!.suspendedWeeks).toBe(3);
    expect(isFieldable(next.squad[0]!)).toBe(false);
  });

  it('leaving the trip unanswered takes the ban, and the squad morale drops', () => {
    const s = week2(fresh());
    const offered = applySeasonEvents(s);
    const due = resolveDueRollovers(offered, absWeek(2, 1));
    expect(due.state.eventDeck.pending.some((p) => p.cardId === 'baliTrip')).toBe(false);
    expect(due.state.squad.every((p) => (p.suspendedWeeks ?? 0) === 0)).toBe(true);
    expect(due.state.squad[0]!.morale).toBe(clampMorale(s.squad[0]!.morale - 8));
    expect(due.news[0]!.text).toContain('No answer');
  });

  it('the medics do not shorten a ban', () => {
    const s = fresh();
    setState({
      squad: s.squad.map((p, i) => (i === 0 ? { ...p, injuredWeeks: 4, suspendedWeeks: 3 } : p)),
    });
    applyInjuries(getState());
    const p = getState().squad[0]!;
    expect(p.injuredWeeks).toBe(3);
    expect(p.suspendedWeeks).toBe(3);
  });
});

describe('chains and the weekly draw', () => {
  it('never draws the trip mid-season, and only follows a night out or a Bali incident', () => {
    const s = fresh();
    for (let i = 0; i < 400; i++) {
      const ev = drawEvent({ ...s, eventDeck: { ...s.eventDeck, lastDrawn: 0 } }, 10 + i, makeRng(i));
      if (ev) expect(ev.cardId).not.toBe('baliTrip');
    }
    const star = s.squad.find((p) => p.injuredWeeks <= 0 && !p.junior)!;
    const pending = {
      ...s,
      eventDeck: {
        ...s.eventDeck,
        pending: [{ id: 'night', cardId: 'nightOut', season: 1, week: 1, expiresAt: 1 + EVENTS.ANSWER_WEEKS, subjectId: star.id, subjectName: star.name }],
      },
    };
    expect(resolveEvent(pending, 'night', 0, 1)!.state.eventDeck.flags).not.toContain('nightOut');
    const out = resolveEvent(pending, 'night', 1, 1)!;
    expect(out.state.eventDeck.flags).toContain('nightOut');
    expect(isEligible(cardById('nightClip')!, s, 2)).toBe(false);
    expect(isEligible(cardById('nightClip')!, out.state, 2)).toBe(true);
    expect(isEligible(cardById('baliHangover')!, s, 2)).toBe(false);
    const flagged = { ...s, week: 2, eventDeck: { ...s.eventDeck, flags: ['baliIncident'] } };
    expect(isEligible(cardById('baliHangover')!, flagged, absWeek(1, 2))).toBe(true);
    expect(isEligible(cardById('baliHangover')!, { ...flagged, week: 9 }, absWeek(1, 9))).toBe(false);
  });

  it('the weekly cap ignores a trip that is still waiting', () => {
    const offered = applySeasonEvents(week2(fresh()));
    expect(offered.eventDeck.pending).toHaveLength(1);
    let drawn: ReturnType<typeof drawEvent> = null;
    for (let i = 0; i < 100 && !drawn; i++) {
      drawn = drawEvent(
        { ...offered, eventDeck: { ...offered.eventDeck, lastDrawn: 0 } },
        absWeek(2, 1),
        makeRng(i),
      );
    }
    expect(drawn).not.toBeNull();
    expect(drawn!.cardId).not.toBe('baliTrip');
  });
});

describe('the lawyer hook', () => {
  it('reviewSuspension returns the weeks unchanged and does not roll', () => {
    const s = fresh();
    const rng = makeRng(5);
    const before = rng.state();
    expect(reviewSuspension(s, { weeks: 3, source: 'event', cause: 'event: Night out' }, rng)).toBe(3);
    expect(reviewSuspension(s, { weeks: 2, source: 'trip', cause: 'event: Trip to Bali' }, rng)).toBe(2);
    expect(reviewSuspension(s, { weeks: 4, source: 'judiciary', cause: 'judiciary' }, rng)).toBe(4);
    expect(reviewSuspension(s, { weeks: -2, source: 'event', cause: 'event: Night out' }, rng)).toBe(0);
    expect(rng.state()).toBe(before);
  });
});

describe('saves', () => {
  const mem = (): StorageLike & { map: Map<string, string> } => {
    const map = new Map<string, string>();
    return {
      map,
      getItem: (k) => (map.has(k) ? map.get(k)! : null),
      setItem: (k, v) => { map.set(k, v); },
      removeItem: (k) => { map.delete(k); },
    };
  };

  beforeEach(() => {
    __setStorage(mem());
    setActiveSlot(1);
  });

  afterEach(() => {
    __setStorage(null);
  });

  it('a v20 save gains zero bans and an empty flag list', () => {
    const s = fresh();
    const raw = asOldSave(s, 20);
    expect((raw.eventDeck as { flags?: unknown }).flags).toBeUndefined();
    expect((raw.squad as { suspendedWeeks?: number }[])[0]).not.toHaveProperty('suspendedWeeks');
    const res = migrateState(raw);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.state.version).toBe(21);
    expect(res.state.eventDeck.flags).toEqual([]);
    expect(res.state.squad.every((p) => p.suspendedWeeks === 0)).toBe(true);
  });

  it('keeps a pending trip and a banned player through a save round-trip', () => {
    const s = applySeasonEvents(week2(fresh(11)));
    const banned = s.squad[3]!;
    const state: GameState = {
      ...s,
      squad: s.squad.map((p) => (p.id === banned.id ? { ...p, suspendedWeeks: 3 } : p)),
      eventDeck: { ...s.eventDeck, flags: ['nightOut'] },
    };
    save(state);
    const loaded = load();
    expect(loaded?.eventDeck.pending.some((p) => p.cardId === 'baliTrip')).toBe(true);
    expect(loaded?.eventDeck.flags).toEqual(['nightOut']);
    expect(loaded?.squad.find((p) => p.id === banned.id)?.suspendedWeeks).toBe(3);
  });
});

describe('the deck the soak actually takes', () => {
  it('keeps the costly ban off choice 0, except the trip the manager is allowed to permit', () => {
    for (const c of EVENT_CARDS) {
      if (c.id === 'baliTrip') {
        expect(c.defaultChoice).toBe(1);
        expect(c.choices[0]!.label).toBe('Let them go');
        continue;
      }
      expect(c.choices[0]!.effects.some((e) => e.kind === 'suspend' || e.kind === 'chance')).toBe(false);
    }
  });
});
