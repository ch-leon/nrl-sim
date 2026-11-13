import { describe, expect, it } from 'vitest';
import { createLegacyGame as createNewGame } from '../helpers/legacyGame';
import { getState, type PendingEvent } from '../../src/core/state';
import { initLeague } from '../../src/systems/fixtures';
import { MANAGED, managedEventChoice, runSoak } from '../../src/qa/soak';
import { SQUAD_CAP } from '../../src/config';
import { EVENT_CARDS, type EventEffect } from '../../src/data/events';
import { signRivalPlayer } from '../../src/systems/events';
import { weeklyWages } from '../../src/systems/economy';

describe('managed events use the same budgets as other optional commitments', () => {
  const play = (cardId: string, wage: number) => {
    createNewGame('Event budget', 101);
    initLeague(getState());
    const s = getState();
    const rival = s.league.clubs.find(c => c.id !== s.clubId && c.squad?.length)!;
    const star = rival.squad![0]!;
    const subject = cardId === 'rivalUnsettled' ? star : s.squad[0]!;
    const event: PendingEvent = {
      id: 'budget-event', cardId, season: 1, week: 1, expiresAt: 3,
      subjectId: subject.id, subjectName: subject.name,
      ...(cardId === 'rivalUnsettled' ? { rivalId: rival.id, fee: 1000 } : {}),
    };
    // Ample cash in both controls: only the recurring funding changes.
    const fromSave = { ...s, money: 1_000_000, freeAgents: [],
      squad: s.squad.map(p => ({ ...p, wage })),
      eventDeck: { ...s.eventDeck, pending: [event] } };
    const result = runSoak({ seed: 101, seasons: 1, weeks: 1, mode: 'managed', fromSave });
    expect(result.problems).toEqual([]);
    expect(getState().eventDeck.pending.some(e => e.id === event.id)).toBe(false);
    return { state: getState(), subject };
  };

  it.each([{ wage: 4000, spend: 0 }, { wage: 100, spend: -10_000 }])(
    'a paid camp requires supportable cash flow ($wage wages)', ({ wage, spend }) => {
      const { state } = play('preseasonCamp', wage);
      expect(state.finance.find(f => f.season === 1)!.events).toBe(spend);
    },
  );

  it.each([{ wage: 4000, expected: 4000 }, { wage: 100, expected: 115 }])(
    'a pay rise requires supportable recurring wages ($wage wages)', ({ wage, expected }) => {
      const { state, subject } = play('starPayRise', wage);
      expect(state.squad.find(p => p.id === subject.id)!.wage).toBe(expected);
    },
  );

  it.each([{ wage: 4000, signs: false }, { wage: 100, signs: true }])(
    'an event signing checks wages beyond its affordable fee ($wage wages)', ({ wage, signs }) => {
      const { state, subject } = play('rivalUnsettled', wage);
      expect(state.squad.some(p => p.id === subject.id)).toBe(signs);
      expect(state.finance.find(f => f.season === 1)!.events).toBe(signs ? -1000 : 0);
    },
  );

  it('rejects unavailable and full-squad event signings through the production validity rules', () => {
    createNewGame('Unavailable', 101); initLeague(getState());
    const s = getState();
    const rival = s.league.clubs.find(c => c.id !== s.clubId && c.squad?.length)!;
    const event: PendingEvent = { id: 'star', cardId: 'rivalUnsettled', season: 1, week: 1, expiresAt: 3,
      rivalId: rival.id, subjectId: rival.squad![0]!.id, fee: 1000 };
    const healthy = { ...s, money: 1_000_000, squad: s.squad.map(p => ({ ...p, wage: 100 })) };
    expect(managedEventChoice(healthy, { ...event, subjectId: 'gone' })).toBe(1);
    expect(managedEventChoice({ ...healthy, squad: Array.from({ length: SQUAD_CAP }, (_, i) => ({ ...healthy.squad[0]!, id: `full-${i}` })) }, event)).toBe(1);
  });

  it('budgets exactly one event signing fee at the existing recruitment reserve boundary', () => {
    createNewGame('One fee', 101); initLeague(getState());
    const s = getState();
    const rival = s.league.clubs.find(c => c.id !== s.clubId && c.squad?.length)!;
    const event: PendingEvent = { id: 'star', cardId: 'rivalUnsettled', season: 1, week: 1, expiresAt: 3,
      rivalId: rival.id, subjectId: rival.squad![0]!.id, fee: 1000 };
    const healthy = { ...s, money: 1_000_000, squad: s.squad.map(p => ({ ...p, wage: 100 })) };
    const signed = signRivalPlayer(healthy, event.rivalId, event.subjectId, event.fee!);
    if (typeof signed === 'string') throw new Error(signed);
    expect(signed.money).toBe(healthy.money); // The event ledger, not this pure helper, debits the fee.
    const reserve = MANAGED.STAR_RESERVE + (weeklyWages(signed) - weeklyWages(healthy)) * MANAGED.WAGE_WEEKS + event.fee!;
    expect(managedEventChoice({ ...healthy, money: reserve }, event)).toBe(0);
    expect(managedEventChoice({ ...healthy, money: reserve - 1 }, event)).toBe(1);
  });

  it('preserves existing cash reserves and never mutates state or consumes RNG to inspect a choice', () => {
    createNewGame('Reserve', 101); initLeague(getState());
    const s = getState();
    const event: PendingEvent = { id: 'camp', cardId: 'preseasonCamp', season: 1, week: 1, expiresAt: 3 };
    const healthy = { ...s, squad: s.squad.map(p => ({ ...p, wage: 100 })) };
    const original = JSON.stringify(healthy);
    expect(managedEventChoice({ ...healthy, money: 45_000 }, event)).toBe(1);
    expect(managedEventChoice({ ...healthy, money: 60_000 }, event)).toBe(0);
    expect(JSON.stringify(healthy)).toBe(original);
  });

  it('still takes free/revenue options in debt without crediting future conditional receipts', () => {
    createNewGame('Debt', 101); initLeague(getState());
    const s = { ...getState(), money: -50_000 };
    const event: PendingEvent = { id: 'free', cardId: 'preseasonCamp', season: 1, week: 1, expiresAt: 3 };
    expect(managedEventChoice(s, event)).toBe(1);
    expect(managedEventChoice(s, { ...event, cardId: 'billboardSponsor' })).toBe(0);
    expect(managedEventChoice(s, { ...event, cardId: 'shortsSponsor' })).toBe(0);
  });

  it('every current card has a budget-safe alternative that can be resolved before costly expiry', () => {
    createNewGame('Fallbacks', 101); initLeague(getState());
    const s = { ...getState(), money: -50_000,
      squad: getState().squad.map(p => ({ ...p, wage: 4000 })) };
    const rival = s.league.clubs.find(c => c.id !== s.clubId && c.squad?.length)!;
    for (const card of EVENT_CARDS) {
      const event: PendingEvent = { id: card.id, cardId: card.id, season: 1, week: 1, expiresAt: 3,
        subjectId: card.subject === 'rivalStar' ? rival.squad![0]!.id : s.squad[0]!.id,
        rivalId: rival.id, fee: 1000 };
      const choice = managedEventChoice(s, event);
      expect(choice, card.id).toBeDefined();
      expect(card.choices[choice!]!.effects.some(e =>
        (e.kind === 'money' && e.amount < 0) || (e.kind === 'playerWage' && e.pct > 0) || e.kind === 'signSubject'), card.id).toBe(false);
    }
  });

  it('the deck cannot introduce unknown effect kinds or unprojected recurring financing costs silently', () => {
    const handled = new Set(['money', 'playerWage', 'signSubject', 'reputation', 'squadMorale', 'playerMorale',
      'playerTrait', 'suspend', 'boardPatience', 'flag', 'closeGates', 'chance', 'modifier']);
    const inspect = (effects: readonly EventEffect[], cardId: string, recurring = false): void => {
      for (const effect of effects) {
        expect(handled.has(effect.kind), `${cardId}: ${effect.kind}`).toBe(true);
        if (recurring) expect(
          (effect.kind === 'money' && effect.amount < 0) || (effect.kind === 'playerWage' && effect.pct > 0) || effect.kind === 'signSubject',
          `${cardId}: recurring financing must be projected before adding it to the deck`,
        ).toBe(false);
        if (effect.kind === 'modifier') inspect(effect.effects, cardId, true);
        // Risks are visible but intentionally not rolled or forecast by this policy.
        if (effect.kind === 'chance') inspect(effect.hit, cardId, recurring);
      }
    };
    for (const card of EVENT_CARDS) for (const choice of card.choices) inspect(choice.effects, card.id);
  });
});
