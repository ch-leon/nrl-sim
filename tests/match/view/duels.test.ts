import { expect, it } from 'vitest';
import { Runner } from '../../../src/match/core/engine';
import type { DuelPlayer, SimEvent } from '../../../src/match/core/snapshot';
import { labSheet } from '../../../src/match/lab/sheets';
import { LiveSim } from '../../../src/match/league/live';
import { DuelTimeline } from '../../../src/match/view/duels';

const runner: DuelPlayer = { side: 'home', who: 'runner-id', slot: 3, name: 'Alex Lane' };
const chaser: DuelPlayer = { side: 'away', who: 'chaser-id', slot: 3, name: 'Sam Field' };
const win = (tick: number, kind: string, winner = runner, loser = chaser): SimEvent => ({
  tick, kind, text: '', duel: { winner, loser },
});

it('uses player identity across slots, counts distinct wins, and keeps the reverse matchup separate', () => {
  const memory = new DuelTimeline();
  const first = win(10, 'step'), duplicate = win(10, 'fend');
  const replacement = win(20, 'fend', runner, { ...chaser, who: 'different-id' });
  const rematch = win(30, 'break-tackle', { ...runner, slot: 2 }, chaser);
  const revenge = win(45, 'held-up', chaser, runner);
  memory.sync([first, duplicate, replacement, rematch, revenge]);
  expect(memory.result(first)?.text).toBe('Alex Lane steps Sam Field.');
  expect(memory.result(duplicate)).toBeUndefined();
  expect(memory.result(replacement)?.wins).toBe(1);
  expect(memory.result(rematch)?.text).toBe('Alex Lane busts through Sam Field again!');
  expect(memory.result(revenge)?.text).toBe('Sam Field holds up Alex Lane.');
});

it('finds the first step-then-bust repeat and hears the first win when resumed from a Lab seek', () => {
  // Reapers v Crocs, seeds 1–60, a fresh sheet each seed. The first pair whose
  // opening win is a step and whose second is a clean bust is seed 3.
  const home = labSheet('rival-reapers');
  const away = labSheet('rival-crocs');
  const live = new Runner(seed => new LiveSim(home, away, seed), 3);
  const memory = new DuelTimeline();
  const next = (kind: string): SimEvent => live.cur.events.find(e => e.kind === kind)!;

  live.seek(3418);
  live.step();
  const step = next('step');
  memory.sync(live.history);
  expect(step.text).toBe('Cruz Goalby steps Rhys Iliffe!');
  expect(memory.result(step)?.text).toBe('Cruz Goalby steps Rhys Iliffe.');

  live.seek(5423);
  live.step();
  const bust = next('break-tackle');
  memory.sync(live.history);
  expect(memory.result(step)).toBeUndefined(); // The old timeline was rebuilt.
  expect(bust.text).toBe('Cruz Goalby busts through Rhys Iliffe');
  expect(memory.result(bust)?.text).toBe('Cruz Goalby busts through Rhys Iliffe again!');

  live.reseed(1);
  memory.sync(live.history);
  expect(memory.result(bust)).toBeUndefined();
}, 30_000);
