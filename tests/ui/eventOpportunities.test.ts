import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getState, loadState, setState, type GameState } from '../../src/core/state';
import { closeModal, dialogOpen } from '../../src/ui/dom';
import { askBeforeAdvance, advanceUntilAsked } from '../../src/ui/decisions';
import { openEvents } from '../../src/ui/eventOpportunities';
import { StubNode, stubDocument } from './stubDom';

function state(): GameState {
  return JSON.parse(readFileSync(new URL('../fixtures/saves/v34-challenges/v34-au-week-5.json', import.meta.url), 'utf8'));
}
const body = () => document.body as unknown as StubNode;
beforeEach(() => { stubDocument(); loadState(state()); });
afterEach(() => { closeModal(); vi.unstubAllGlobals(); });
it('Review opens all named events without entering or advancing', () => {
  const original = JSON.stringify(getState()); const proceed = vi.fn();
  askBeforeAdvance(1, proceed);
  expect(body().querySelector('[data-event-reminder]')!.words()).toContain('Closes this week');
  body().querySelector('[data-review-events]')!.click();
  expect(body().querySelector('[data-events-list]')!.words()).toContain("Big Mick's Break the Line");
  expect(body().querySelector('[data-events-list]')!.words()).toContain("Mick's Invitational");
  expect(proceed).not.toHaveBeenCalled();
  expect(JSON.stringify(getState())).toBe(original);
});
it('intentional skip advances once and only acknowledges the rows shown for that run', () => {
  const proceed = vi.fn(); askBeforeAdvance(1, proceed);
  body().querySelector('[data-skip-events]')!.click();
  expect(proceed).toHaveBeenCalledOnce();
  expect([...proceed.mock.calls[0]![0]]).toEqual(['1:player:showground']);
  expect(dialogOpen()).toBe(false);
  askBeforeAdvance(1, proceed);
  expect(body().querySelector('[data-event-reminder]')).not.toBeNull();
});
it('rejects callbacks after a week change or career installation', () => {
  const proceed = vi.fn(); askBeforeAdvance(1, proceed);
  const old = body().querySelector('[data-skip-events]')!;
  setState({week:6}); old.click(); expect(proceed).not.toHaveBeenCalled();
  loadState(state()); askBeforeAdvance(1, proceed);
  const review = body().querySelector('[data-review-events]')!;
  loadState(state()); review.click();
  expect(body().querySelector('[data-events-list]')).toBeNull();
});
it('refreshes the list on state changes and closes when the career is replaced', () => {
  openEvents();
  expect(body().querySelector('[data-opportunity="showground"]')!.words()).toContain('Closes this week');
  setState({week:6});
  expect(body().querySelector('[data-opportunity="showground"]')!.words()).toContain('next season');
  loadState(state());
  expect(dialogOpen()).toBe(false);
});
it('carries the acknowledged keys into a multi-week run without repeating the reminder', async () => {
  const run = vi.fn(async () => ({weeksPlayed: 4, stop: {kind:'target' as const, text:'Done'}}));
  advanceUntilAsked({kind:'weeks',weeks:4}, run);
  body().querySelector('[data-skip-events]')!.click();
  expect(run).toHaveBeenCalledOnce();
  expect([...(run.mock.calls[0] as unknown as [unknown, Set<string>])[1]]).toEqual(['1:player:showground','1:player:open-cup']);
  await Promise.resolve();
  expect(dialogOpen()).toBe(false);
});
