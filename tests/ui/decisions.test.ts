import { describe, it, expect, beforeEach } from 'vitest';
import {
  advanceAsk, advancesLeft, decisionViews, deadlineText, keepAdvancingLabel, longAdvanceQuestion, pendingDecisionCount,
  CONFIRM_SPAN,
} from '../../src/ui/decisions';
import { createNewGame, getState, setState } from '../../src/core/state';
import { absWeek, plantPending } from '../../src/systems/events';
import { EVENTS } from '../../src/config';

beforeEach(() => {
  createNewGame('Test Club', 1);
});

describe('advancesLeft', () => {
  it('counts the advances a card survives: 1 means the next one takes its default', () => {
    const s = { season: 1, week: 5 };
    const now = absWeek(1, 5);
    expect(advancesLeft({ expiresAt: now }, s)).toBe(1);
    expect(advancesLeft({ expiresAt: now + 2 }, s)).toBe(3);
    // An expired card still reads as due on the next advance, never 0 or less.
    expect(advancesLeft({ expiresAt: now - 3 }, s)).toBe(1);
  });
});

describe('decisionViews (#345, #346)', () => {
  it('splits the Bali trip into a sure line and a risk line per choice', () => {
    plantPending('baliTrip');
    const [v] = decisionViews(getState());
    expect(v!.title).toBeTruthy();
    expect(v!.advancesLeft).toBe(1); // a season-end card is due on the advance it is offered
    const go = v!.choices.find((c) => c.label === 'Let them go')!;
    expect(go.sure).toBe('squad morale +6');
    expect(go.risks).toHaveLength(1);
    expect(go.risks[0]).toMatch(/^\d+(\.\d+)?% risk: a 2-3 week ban, −\$2,500, reputation -2, board patience -1$/);
    const ban = v!.choices.find((c) => c.label === 'Ban the trip')!;
    expect(ban).toMatchObject({ sure: 'squad morale -8', risks: [] });
    expect(v!.choices.filter((c) => c.isDefault)).toHaveLength(1);
    expect(v!.defaultLabel).toBe(v!.choices.find((c) => c.isDefault)!.label);
  });

  it('skips cards that are no longer in the deck', () => {
    plantPending('fanDay');
    const s = getState();
    setState({ eventDeck: { ...s.eventDeck, pending: [...s.eventDeck.pending, { ...s.eventDeck.pending[0]!, id: 'x', cardId: 'gone' }] } });
    expect(decisionViews(getState()).map((v) => v.id)).toEqual(['fanDay-show']);
    expect(pendingDecisionCount(getState())).toBe(2);
  });
});

describe('deadlineText', () => {
  it('says the next advance takes the default, or how many weeks are left', () => {
    expect(deadlineText({ advancesLeft: 1, defaultLabel: 'Ban the trip' })).toBe('Answer before you advance, or it\'s "Ban the trip".');
    expect(deadlineText({ advancesLeft: 2, defaultLabel: 'Decline' })).toBe('2 weeks to answer, or it\'s "Decline".');
  });
});

describe('advanceAsk (#338)', () => {
  it('is null with nothing pending: the advance goes at once', () => {
    expect(advanceAsk(getState(), 1)).toBeNull();
  });

  it('lists every pending card and names the default a run would take', () => {
    plantPending('baliTrip');
    const ask = advanceAsk(getState(), 1)!;
    expect(ask.rows).toHaveLength(1);
    expect(ask.rows[0]).toMatchObject({ id: 'baliTrip-show', due: true });
    expect(ask.rows[0]!.note).toContain('no answer means "');
    expect(ask.due).toBe(1);
    expect(ask.proceed).toBe('Take the default and advance');
  });

  it('a card with weeks left is listed but not due on a one-week advance', () => {
    plantPending('fanDay');
    const ask = advanceAsk(getState(), 1)!;
    expect(ask.rows[0]).toMatchObject({ due: false, note: `${EVENTS.ANSWER_WEEKS + 1} weeks left to answer` });
    expect(ask.due).toBe(0);
    expect(ask.proceed).toBe('Advance, answer later');
    // A run long enough to reach its deadline takes it.
    expect(advanceAsk(getState(), EVENTS.ANSWER_WEEKS + 1)!.due).toBe(1);
  });

  it('says "defaults" for more than one', () => {
    plantPending('baliTrip');
    plantPending('fanDay');
    expect(advanceAsk(getState(), 22)!.proceed).toBe('Take the defaults and advance');
  });

  it('says how long a run past ×4 weeks is, since it stands in for the long-run confirm (#350 H3)', () => {
    plantPending('fanDay');
    expect(advanceAsk(getState(), 1)!.question).toBeNull();
    expect(advanceAsk(getState(), CONFIRM_SPAN)!.question).toBeNull();
    expect(advanceAsk(getState(), 22)!.question).toBe('Play 22 weeks? It stops for decisions.');
  });
});

describe('long advances (#350 H3) and Keep advancing (N4)', () => {
  it('confirms runs longer than ×4 weeks', () => {
    expect(longAdvanceQuestion(CONFIRM_SPAN)).toBeNull();
    expect(longAdvanceQuestion(22)).toBe('Play 22 weeks? It stops for decisions.');
  });

  it('labels what is left of the run', () => {
    expect(keepAdvancingLabel({ kind: 'weeks', weeks: 3 })).toBe('Keep advancing (3 weeks)');
    expect(keepAdvancingLabel({ kind: 'weeks', weeks: 1 })).toBe('Keep advancing (1 week)');
    expect(keepAdvancingLabel({ kind: 'finals' })).toBe('Keep advancing to finals');
    expect(keepAdvancingLabel({ kind: 'seasonEnd' })).toBe('Keep advancing to season end');
  });
});
