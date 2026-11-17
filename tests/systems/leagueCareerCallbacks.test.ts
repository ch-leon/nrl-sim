import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLegacyGame } from '../helpers/legacyGame';
import { getState, setState } from '../../src/core/state';
import { advanceWeek, clearHeldWeek, clearSeasonHooks, clearTickHooks, weekHeld, withFastForward } from '../../src/core/time';
import { initLeague, registerFixturesSystem } from '../../src/systems/fixtures';
import { forfeitResult, registerPlayerMatchSystem } from '../../src/systems/matchday';
import * as jobs from '../../src/systems/matchJobs';
import type { MatchResult } from '../../src/sim/events';
import { bus } from '../../src/core/events';

afterEach(() => {vi.restoreAllMocks();clearHeldWeek();clearTickHooks();clearSeasonHooks();bus.clear();});
describe('async result ownership across fresh careers', () => {
  it.each(['player','rivals'] as const)('a stale %s worker answer cannot mutate a fresh same-profile interval or release its hold', async owner => {
    const pending: Array<{resolve: (r: MatchResult[]) => void; count: number}> = [];
    vi.spyOn(jobs,'canUseWorker').mockReturnValue(true);
    vi.spyOn(jobs,'playMatchesInWorker').mockImplementation(input => new Promise(resolve => {pending.push({resolve,count:input.length});}));
    const start = (): void => {
      createLegacyGame('Same profile',573);initLeague(getState());
      if(owner==='player') registerPlayerMatchSystem();
      else {registerFixturesSystem();setState({settings:{...getState().settings,liveRivals:true}});}
      if(owner==='player') withFastForward(advanceWeek,{holds:true});else advanceWeek();
    };
    start();expect(weekHeld()).toBe(true);start();expect(weekHeld()).toBe(true);expect(pending).toHaveLength(2);
    const current=getState();const result: MatchResult={...forfeitResult({homeId:'player',awayId:'other'}),events:[],injuries:[],
      stats:{possession:[50,50],tackles:[0,0],errors:[0,0],tries:[0,0]},weather:'clear',momentumTimeline:[]};
    pending[0]!.resolve(Array.from({length:pending[0]!.count},()=>result));
    await Promise.resolve();await Promise.resolve();await Promise.resolve();
    expect(getState()).toBe(current);expect(weekHeld()).toBe(true);
    pending[1]!.resolve(Array.from({length:pending[1]!.count},()=>result));
    await Promise.resolve();await Promise.resolve();await Promise.resolve();
    expect(weekHeld()).toBe(false);expect(getState().week).toBe(2);
  });
});
