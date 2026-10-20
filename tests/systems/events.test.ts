// tests/systems/events.test.ts — random events deck (GitHub #75).
import { describe, it, expect, beforeEach } from 'vitest';
import {
  absWeek, applyEffects, chooseEvent, describeEffects, drawEvent, eventsTick, fillText, isEligible,
  registerEventsSystem, resolveEvent, subjectCandidates, tickModifiers, weekResult,
} from '../../src/systems/events';
import { EVENT_CARDS, cardById, type EventCardDef } from '../../src/data/events';
import { initLeague, registerFixturesSystem, PLAYER_ID } from '../../src/systems/fixtures';
import { createNewGame, getState, setState, type GameState, type PendingEvent } from '../../src/core/state';
import { bus } from '../../src/core/events';
import { advanceWeek, clearSeasonHooks, clearTickHooks, withFastForward } from '../../src/core/time';
import { makeRng } from '../../src/utils/rng';
import { EVENTS, WEEKS_PER_SEASON } from '../../src/config';
import { marketWage, overallRating } from '../../src/data/player';
import { SIGNING_FEE_WEEKS, signingFee } from '../../src/systems/freeagency';
import { transferFee } from '../../src/systems/contracts';

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

const card = (id: string): EventCardDef => cardById(id)!;

/** A state holding one pending card. */
const withPending = (s: GameState, ev: Partial<PendingEvent> & { cardId: string }): GameState => ({
  ...s,
  eventDeck: {
    ...s.eventDeck,
    pending: [...s.eventDeck.pending, { id: `${ev.cardId}-x`, season: s.season, week: s.week, expiresAt: absWeek(s.season, s.week) + EVENTS.ANSWER_WEEKS, ...ev }],
  },
});

describe('the deck', () => {
  it('has about 15 cards with unique ids, 1–3 choices and a valid default', () => {
    expect(EVENT_CARDS.length).toBeGreaterThanOrEqual(14);
    expect(new Set(EVENT_CARDS.map((c) => c.id)).size).toBe(EVENT_CARDS.length);
    for (const c of EVENT_CARDS) {
      expect(c.choices.length).toBeGreaterThanOrEqual(1);
      expect(c.choices.length).toBeLessThanOrEqual(3);
      expect(c.choices[c.defaultChoice]).toBeDefined();
      expect(c.weight).toBeGreaterThan(0);
      expect(c.cooldown).toBeGreaterThan(0);
      // {player} only appears on cards that pick a subject.
      const usesPlayer = [c.text, ...c.choices.map((ch) => ch.outcome)].some((t) => t.includes('{player}'));
      if (usesPlayer) expect(c.subject).toBeDefined();
    }
  });
});

describe('text', () => {
  it('fills placeholders and summarises effects', () => {
    expect(fillText('{player} at {club}', { subjectName: 'Jo Bloggs', clubName: 'Crushers' })).toBe('Jo Bloggs at Crushers');
    expect(describeEffects([{ kind: 'money', amount: -5000 }, { kind: 'squadMorale', amount: 6 }])).toBe('−$5,000 · squad morale +6');
    expect(describeEffects([{ kind: 'modifier', label: 'x', trigger: 'win', weeks: 4, effects: [{ kind: 'money', amount: 3000 }] }]))
      .toBe('+$3,000 a win for 4 weeks');
    expect(describeEffects([{ kind: 'modifier', label: 'x', trigger: 'win', weeks: 1, effects: [{ kind: 'reputation', amount: 4 }] }]))
      .toBe('reputation +4 if you win next week');
    expect(describeEffects([])).toBe('no effect');
  });
});

describe('eligibility', () => {
  it('respects cooldowns and never offers a card that is already pending', () => {
    const s = fresh();
    const c = card('billboardSponsor');
    expect(isEligible(c, s, 1)).toBe(true);
    const cooled = { ...s, eventDeck: { ...s.eventDeck, cooldowns: { billboardSponsor: 10 } } };
    expect(isEligible(c, cooled, 9)).toBe(false);
    expect(isEligible(c, cooled, 10)).toBe(true);
    expect(isEligible(c, withPending(s, { cardId: 'billboardSponsor' }), 1)).toBe(false);
  });

  it('checks week, reputation, money and facility conditions', () => {
    const s = fresh();
    expect(isEligible(card('preseasonCamp'), { ...s, week: 2 }, 2)).toBe(true);
    expect(isEligible(card('preseasonCamp'), { ...s, week: 5 }, 5)).toBe(false);
    expect(isEligible(card('preseasonCamp'), { ...s, week: 2, money: 9_000 }, 2)).toBe(false);
    expect(isEligible(card('merchDeal'), { ...s, reputation: 29 }, 1)).toBe(false);
    expect(isEligible(card('merchDeal'), { ...s, reputation: 30 }, 1)).toBe(true);
    expect(isEligible(card('stormDamage'), { ...s, facilities: [] }, 1)).toBe(false);
  });

  it('nextMatch: needs a fixture next round, at home when asked', () => {
    const s = fresh();
    const next = s.league.fixtures.find((f) => f.round === s.week + 1 && (f.homeId === PLAYER_ID || f.awayId === PLAYER_ID))!;
    expect(isEligible(card('tvFeature'), s, 1)).toBe(true);
    expect(isEligible(card('foodTruck'), s, 1)).toBe(next.homeId === PLAYER_ID);
    const noFixtures = { ...s, league: { ...s.league, fixtures: [] } };
    expect(isEligible(card('tvFeature'), noFixtures, 1)).toBe(false);
  });

  it('subject rules pick the right player, and skip when nobody fits', () => {
    const s = fresh();
    const star = subjectCandidates(s, 'star')[0]!;
    expect(Math.max(...s.squad.filter((p) => p.injuredWeeks <= 0).map(overallRating))).toBe(overallRating(star));
    const happy = { ...s, squad: s.squad.map((p) => ({ ...p, morale: 80 })) };
    expect(subjectCandidates(happy, 'unhappy')).toEqual([]);
    expect(isEligible(card('unhappyTalk'), happy, 1)).toBe(false);
    const sad = { ...happy, squad: happy.squad.map((p, i) => (i === 3 ? { ...p, morale: 20 } : p)) };
    expect(subjectCandidates(sad, 'unhappy').map((p) => p.id)).toEqual([sad.squad[3]!.id]);
    const injured = { ...sad, squad: sad.squad.map((p, i) => (i === 3 ? { ...p, injuredWeeks: 2 } : p)) };
    expect(subjectCandidates(injured, 'unhappy')).toEqual([]);
  });
});

describe('drawEvent', () => {
  it('is deterministic per seed', () => {
    const s = fresh();
    const draws = (seed: number) => Array.from({ length: 40 }, (_, i) => drawEvent(s, 10, makeRng(seed + i))?.cardId ?? null);
    expect(draws(1)).toEqual(draws(1));
    expect(draws(1)).not.toEqual(draws(1000));
  });

  it('holds off within the gap and while MAX_PENDING cards wait', () => {
    const s = fresh();
    const recent = { ...s, eventDeck: { ...s.eventDeck, lastDrawn: 9 } };
    for (let i = 0; i < 30; i++) expect(drawEvent(recent, 10, makeRng(i))).toBeNull();
    let full = s;
    for (let i = 0; i < EVENTS.MAX_PENDING; i++) full = withPending(full, { cardId: EVENT_CARDS[i]!.id, id: `p${i}` });
    for (let i = 0; i < 30; i++) expect(drawEvent(full, 10, makeRng(i))).toBeNull();
  });

  it('stamps the subject and the answer deadline', () => {
    const s = fresh();
    for (let i = 0; i < 200; i++) {
      const ev = drawEvent(s, 10, makeRng(i));
      if (!ev) continue;
      expect(ev.expiresAt).toBe(10 + EVENTS.ANSWER_WEEKS);
      const rule = card(ev.cardId).subject;
      if (rule === 'rivalStar') {
        const club = s.league.clubs.find((c) => c.id === ev.rivalId)!;
        expect(club.squad!.some((p) => p.id === ev.subjectId && p.name === ev.subjectName)).toBe(true);
      } else if (rule) {
        expect(s.squad.some((p) => p.id === ev.subjectId && p.name === ev.subjectName)).toBe(true);
      }
    }
  });
});

describe('resolveEvent', () => {
  it('applies a choice exactly once: the card leaves pending first', () => {
    const s = withPending(fresh(), { cardId: 'fanDay', id: 'fd' });
    const r = resolveEvent(s, 'fd', 0, 1)!;
    expect(r.money).toEqual([{ amount: -5_000, reason: 'event: Fan day' }]);
    expect(r.state.reputation).toBe(s.reputation + 1);
    expect(r.state.squad[0]!.morale).toBe(Math.min(100, s.squad[0]!.morale + 6));
    expect(r.state.eventDeck.pending).toEqual([]);
    expect(r.news[0]!.text).toContain('Fan day was a hit');
    expect(resolveEvent(r.state, 'fd', 0, 1)).toBeNull();
    expect(resolveEvent(s, 'fd', 5, 1)).toBeNull();
  });

  it('player effects hit only the subject: wage, morale and traits', () => {
    const s0 = fresh();
    const who = s0.squad[2]!;
    const s = withPending(s0, { cardId: 'starPayRise', id: 'pr', subjectId: who.id, subjectName: who.name });
    const r = resolveEvent(s, 'pr', 0, 1)!;
    const after = r.state.squad.find((p) => p.id === who.id)!;
    expect(after.wage).toBe(Math.round(who.wage * 1.15));
    expect(after.morale).toBe(Math.min(100, who.morale + 15));
    expect(r.state.squad.filter((p) => p.id !== who.id)).toEqual(s.squad.filter((p) => p.id !== who.id));
    expect(r.news[0]!.text).toContain(who.name);

    const t = applyEffects(s0, [{ kind: 'playerTrait', trait: 'workhorse' }, { kind: 'playerTrait', trait: 'workhorse' }], {
      cardId: 'x', reason: 'x', subjectId: who.id, now: 1,
    });
    const lvl = t.state.squad.find((p) => p.id === who.id)!.traits.find((tr) => tr.id === 'workhorse')!.level;
    const before = who.traits.find((tr) => tr.id === 'workhorse')?.level ?? 0;
    expect(lvl).toBe(Math.min(3, before + 2));
  });

  it('a subject who has left the squad is skipped without error', () => {
    const s = withPending(fresh(), { cardId: 'starPayRise', id: 'pr', subjectId: 'gone', subjectName: 'Old Mate' });
    const r = resolveEvent(s, 'pr', 1, 1)!;
    expect(r.state.squad).toEqual(s.squad);
    expect(r.news[0]!.text).toContain('Old Mate');
  });

  it('a card dropped from the deck since the save just disappears', () => {
    const s = withPending(fresh(), { cardId: 'retiredCard', id: 'old' });
    const r = resolveEvent(s, 'old', 0, 1)!;
    expect(r.state.eventDeck.pending).toEqual([]);
    expect(r.money).toEqual([]);
  });

  it('every choice of every card resolves: money matches its effects and news is posted', () => {
    const s0 = fresh();
    const who = s0.squad[0]!;
    for (const c of EVENT_CARDS) {
      c.choices.forEach((ch, i) => {
        const s = withPending(s0, { cardId: c.id, id: 'e', subjectId: who.id, subjectName: who.name });
        const r = resolveEvent(s, 'e', i, 1)!;
        const expected = ch.effects.filter((e) => e.kind === 'money').map((e) => (e as { amount: number }).amount);
        expect(r.money.map((m) => m.amount)).toEqual(expected);
        expect(r.news).toHaveLength(1);
        const mods = ch.effects.filter((e) => e.kind === 'modifier').length;
        expect(r.state.eventDeck.modifiers).toHaveLength(mods);
      });
    }
  });
});

describe('modifiers', () => {
  const winState = (s: GameState, won: boolean): GameState => {
    const fx = s.league.fixtures.find((f) => f.round === s.week && (f.homeId === PLAYER_ID || f.awayId === PLAYER_ID))!;
    const us = won ? 20 : 6;
    const them = won ? 6 : 20;
    const result = fx.homeId === PLAYER_ID ? { homeScore: us, awayScore: them } : { homeScore: them, awayScore: us };
    return { ...s, league: { ...s.league, fixtures: s.league.fixtures.map((f) => (f === fx ? { ...f, result } : f)) } };
  };
  const withMod = (s: GameState, trigger: 'win' | 'loss' | 'weekly', weeks: number): GameState => ({
    ...s,
    eventDeck: { ...s.eventDeck, modifiers: [{ id: 'm', cardId: 'c', label: 'Test bonus', trigger, weeksLeft: weeks, effects: [{ kind: 'money', amount: 3000 }] }] },
  });

  it('win modifiers pay only on a win, and count down either way', () => {
    const s = withMod(fresh(), 'win', 2);
    expect(weekResult(winState(s, true))).toBe('win');
    const won = tickModifiers(winState(s, true), 1);
    expect(won.money).toEqual([{ amount: 3000, reason: 'Test bonus' }]);
    expect(won.state.eventDeck.modifiers[0]!.weeksLeft).toBe(1);
    const lost = tickModifiers(winState(s, false), 1);
    expect(lost.money).toEqual([]);
    expect(lost.state.eventDeck.modifiers[0]!.weeksLeft).toBe(1);
  });

  it('weekly modifiers pay every week for their span, then expire', () => {
    let s = withMod(fresh(), 'weekly', 3);
    let paid = 0;
    for (let i = 0; i < 5; i++) {
      const r = tickModifiers(s, i);
      paid += r.money.reduce((t, m) => t + m.amount, 0);
      expect(r.news).toEqual([]); // steady money shows in the ledger only
      s = r.state;
    }
    expect(paid).toBe(9000);
    expect(s.eventDeck.modifiers).toEqual([]);
  });
});

describe('eventsTick', () => {
  it('takes the default once the answer window has passed', () => {
    const s0 = fresh();
    const now = absWeek(s0.season, s0.week);
    const s = withPending(s0, { cardId: 'fanDay', id: 'fd', expiresAt: now });
    const r = eventsTick(s);
    expect(r.state.eventDeck.pending.some((p) => p.id === 'fd')).toBe(false);
    expect(r.money).toEqual([]); // Fan day's default is "Not this year"
    expect(r.news.some((n) => n.text.startsWith('No answer, so: No fan day'))).toBe(true);
    const early = eventsTick(withPending(s0, { cardId: 'fanDay', id: 'fd', expiresAt: now + 1 }));
    expect(early.state.eventDeck.pending.some((p) => p.id === 'fd')).toBe(true);
  });

  it('advances only the deck stream, never rngSeed', () => {
    const s = fresh();
    const r = eventsTick(s);
    expect(r.state.rngSeed).toBe(s.rngSeed);
    expect(r.state.eventDeck.rng).not.toBe(s.eventDeck.rng);
  });
});

describe('chooseEvent (store glue)', () => {
  it('routes money through the ledger event and posts the outcome', () => {
    const s = withPending(fresh(), { cardId: 'billboardSponsor', id: 'bb' });
    setState({ eventDeck: s.eventDeck });
    const money: { delta: number; reason: string }[] = [];
    const news: string[] = [];
    bus.on('money:changed', ({ delta, reason }) => money.push({ delta, reason }));
    bus.on('ui:notify', ({ text }) => news.push(text));
    const before = getState().money;
    expect(chooseEvent('bb', 0)).toBe(true);
    expect(getState().money).toBe(before + 5_000);
    expect(money).toEqual([{ delta: 5_000, reason: 'event: Billboard offer' }]);
    expect(news[0]).toContain('billboard');
    expect(chooseEvent('bb', 0)).toBe(false);
    expect(getState().money).toBe(before + 5_000);
  });
});

describe('two-season headless run', () => {
  /** Play two seasons with nobody answering; record every card drawn. */
  const run = (seed: number) => {
    fresh(seed);
    registerFixturesSystem();
    registerEventsSystem();
    const draws: { cardId: string; at: number }[] = [];
    withFastForward(() => {
      for (let i = 0; i < 2 * WEEKS_PER_SEASON; i++) {
        const before = new Set(getState().eventDeck.pending.map((p) => p.id));
        const at = absWeek(getState().season, getState().week);
        advanceWeek();
        for (const p of getState().eventDeck.pending) if (!before.has(p.id)) draws.push({ cardId: p.cardId, at });
      }
    });
    return draws;
  };

  it('deals a card every 3–4 weeks on average and never repeats one inside its cooldown', () => {
    let total = 0;
    const seeds = [1, 2, 3, 4, 5];
    for (const seed of seeds) {
      const draws = run(seed);
      total += draws.length;
      const lastAt = new Map<string, number>();
      for (const d of draws) {
        const prev = lastAt.get(d.cardId);
        if (prev !== undefined) expect(d.at - prev).toBeGreaterThanOrEqual(card(d.cardId).cooldown);
        lastAt.set(d.cardId, d.at);
      }
      // At most one per week.
      expect(new Set(draws.map((d) => d.at)).size).toBe(draws.length);
    }
    const weeksPerCard = (seeds.length * 2 * WEEKS_PER_SEASON) / total;
    expect(weeksPerCard).toBeGreaterThanOrEqual(3);
    expect(weeksPerCard).toBeLessThanOrEqual(4);
  });

  it('is deterministic: same seed, same cards', () => {
    expect(run(11)).toEqual(run(11));
  });
});

describe('rival player cards (#74)', () => {
  const setup = () => {
    const s = fresh(21);
    // Make one rival's best player clearly better than anyone at the club.
    const rival = s.league.clubs.find((c) => c.id === 'rival-reapers')!;
    const star = { ...rival.squad![0]!, stats: { speed: 95, strength: 95, stamina: 95, skill: 95, footyIQ: 95 }, injuredWeeks: 0 };
    const clubs = s.league.clubs.map((c) => (c.id === rival.id ? { ...c, squad: [star, ...c.squad!.slice(1)] } : c));
    return { s: { ...s, money: 500_000, league: { ...s.league, clubs } }, star, rivalId: rival.id };
  };

  it('rivalStars offers only players who would start for you, that you can afford and fit', async () => {
    const { rivalStars } = await import('../../src/systems/events');
    const { s, star } = setup();
    expect(rivalStars(s).some((r) => r.player.id === star.id)).toBe(true);
    expect(rivalStars({ ...s, money: 0 })).toEqual([]);
    const full = { ...s, squad: Array.from({ length: 30 }, (_, i) => ({ ...s.squad[i % s.squad.length]!, id: `x${i}` })) };
    expect(rivalStars(full)).toEqual([]);
  });

  it('a drawn card quotes the rival, rating and fee, and signing moves the player across', () => {
    const { s, star, rivalId } = setup();
    let ev: PendingEvent | null = null;
    for (let seed = 0; !ev || ev.cardId !== 'rivalUnsettled'; seed++) {
      const only = { ...s, eventDeck: { ...s.eventDeck, cooldowns: Object.fromEntries(EVENT_CARDS.filter((c) => c.id !== 'rivalUnsettled').map((c) => [c.id, 999])) } };
      ev = drawEvent(only, 10, makeRng(seed));
    }
    expect(ev.rivalId).toBeDefined();
    expect(ev.vars?.rival).toBeDefined();
    const picked = s.league.clubs.find((c) => c.id === ev!.rivalId)!.squad!.find((p) => p.id === ev!.subjectId)!;
    const st = { ...s, eventDeck: { ...s.eventDeck, pending: [ev] } };
    const r = resolveEvent(st, ev.id, 0, 10)!;
    expect(r.state.squad.some((p) => p.id === picked.id && p.contractWeeks === 52)).toBe(true);
    expect(r.state.league.clubs.find((c) => c.id === ev!.rivalId)!.squad!.some((p) => p.id === picked.id)).toBe(false);
    expect(r.money).toEqual([{ amount: -ev.fee!, reason: 'event: Unsettled at a rival' }]);
    expect(r.news[0]!.text).toContain(ev.vars!.rival!);
    void star; void rivalId;
  });

  it('quotes the Recruit screen\'s signingFee for the star, not four weeks\' wages (N12)', async () => {
    const { rivalStars } = await import('../../src/systems/events');
    const { s: base, star: old, rivalId } = setup();
    const star = { ...old, age: 26 }; // a 95 in his prime
    const s = { ...base, league: { ...base.league, clubs: base.league.clubs.map((c) => (c.id === rivalId ? { ...c, squad: [star, ...c.squad!.slice(1)] } : c)) } };
    const offer = rivalStars(s).find((r) => r.player.id === star.id)!;
    expect(offer.fee).toBe(signingFee(s, star));
    expect(offer.fee).toBe(transferFee(star)); // by rating and age, no Scout Office
    expect(offer.fee).toBeGreaterThan(4 * SIGNING_FEE_WEEKS * marketWage(star)); // was SIGNING_FEE_WEEKS × his wage
    // The Scout Office's discount applies on the card as on the Recruit screen.
    const scouted = { ...s, facilities: [{ id: 'sc', defId: 'scoutOffice' as const, level: 2 as const, x: 0, y: 0 }] };
    const discounted = rivalStars(scouted).find((r) => r.player.id === star.id)!;
    expect(discounted.fee).toBe(signingFee(scouted, star));
    expect(discounted.fee).toBe(Math.round(transferFee(star) * 0.8));
    // Four weeks' wages in the bank is no longer enough to be offered him.
    expect(rivalStars({ ...s, money: offer.fee - 1 }).some((r) => r.player.id === star.id)).toBe(false);
  });

  it('the drawn card\'s text and the money taken are that fee (N12)', () => {
    const { s } = setup();
    let ev: PendingEvent | null = null;
    for (let seed = 0; !ev || ev.cardId !== 'rivalUnsettled'; seed++) {
      const only = { ...s, eventDeck: { ...s.eventDeck, cooldowns: Object.fromEntries(EVENT_CARDS.filter((c) => c.id !== 'rivalUnsettled').map((c) => [c.id, 999])) } };
      ev = drawEvent(only, 10, makeRng(seed));
    }
    const picked = s.league.clubs.find((c) => c.id === ev!.rivalId)!.squad!.find((p) => p.id === ev!.subjectId)!;
    expect(ev.fee).toBe(signingFee(s, picked));
    expect(ev.vars!.fee).toBe(`$${signingFee(s, picked).toLocaleString('en-US')}`);
    const r = resolveEvent({ ...s, eventDeck: { ...s.eventDeck, pending: [ev] } }, ev.id, 0, 10)!;
    expect(r.money).toEqual([{ amount: -signingFee(s, picked), reason: 'event: Unsettled at a rival' }]);
  });

  it('falls through cleanly when the player has gone or the money has run out', () => {
    const { s, star, rivalId } = setup();
    const ev: PendingEvent = { id: 'ru', cardId: 'rivalUnsettled', season: 1, week: 1, expiresAt: 3, subjectId: star.id, subjectName: star.name, rivalId, fee: 50_000, vars: { rival: 'Reapers' } };
    const broke = resolveEvent({ ...s, money: 10, eventDeck: { ...s.eventDeck, pending: [ev] } }, 'ru', 0, 1)!;
    expect(broke.money).toEqual([]);
    expect(broke.state.squad).toEqual(s.squad);
    expect(broke.news[0]!.text).toContain("couldn't afford");
    const gone = resolveEvent({ ...s, eventDeck: { ...s.eventDeck, pending: [{ ...ev, subjectId: 'nobody' }] } }, 'ru', 0, 1)!;
    expect(gone.news[0]!.text).toContain('no longer available');
  });
});
