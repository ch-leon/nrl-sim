import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { __setStorage, loadSlot, setActiveSlot } from '../../src/core/save';
import type { GameState } from '../../src/core/state';
import { liveMatchKey, slotKey } from '../../src/core/storageKeys';
import { changeChallenge } from '../../src/systems/individualChallenges';
import { readLiveMatch } from '../../src/systems/liveMatchRecord';
import { CHALLENGE_REPLAY_PROBLEM } from '../../src/systems/parkedLeagueFixture';

function fixture(week: number): GameState {
  return {...JSON.parse(readFileSync(new URL(`../fixtures/saves/v34-challenges/v34-au-week-${week}.json`, import.meta.url), 'utf8')), version:35};
}
function checked(result: ReturnType<typeof changeChallenge>): GameState {
  if (!result.ok) throw Error(result.message);
  return result.state;
}
function career(status: 'booked' | 'coaching' | 'ready-for-interval') {
  const initial=fixture(5), due=fixture(6);
  const player=initial.squad.find(p=>!p.injuredWeeks && !p.suspendedWeeks && due.squad.some(q=>q.id===p.id && !q.injuredWeeks && !q.suspendedWeeks))!;
  const booked=checked(changeChallenge(initial,'showground',{kind:'book',participantId:player.id}));
  const state={...due, competitions:{...due.competitions!,individualChallenges:booked.competitions!.individualChallenges!}};
  if (status==='booked') return state;
  const coaching=checked(changeChallenge(state,'showground',{kind:'start'}));
  return status==='coaching' ? coaching : checked(changeChallenge(coaching,'showground',{kind:'finish'}));
}
function storage(state: GameState, sidecar: string, slot=1) {
  const bytes=new Map([[slotKey(slot),JSON.stringify(state)],[liveMatchKey(slot),sidecar]]);
  const store={getItem:(key:string)=>bytes.get(key)??null,setItem:(key:string,value:string)=>{bytes.set(key,value);},removeItem:(key:string)=>{bytes.delete(key);}};
  __setStorage(store); vi.stubGlobal('localStorage',store); setActiveSlot(1);
  return bytes;
}
afterEach(()=>{__setStorage(null);vi.unstubAllGlobals();});

for (const status of ['booked','ready-for-interval'] as const) {
  it(`loads ${status} career when a truncated sidecar cannot be resumed, preserving both files`,()=>{
    const state=career(status), sidecar='{"season":1,"week":6,';
    const bytes=storage(state,sidecar), before=[...bytes];
    expect(readLiveMatch()).toBeNull();
    const result=loadSlot();
    expect(result.status).toBe('ok');
    if (result.status==='ok') expect(result.state).toEqual(state);
    expect([...bytes]).toEqual(before);
  });
}
for (const status of ['booked','coaching'] as const) for (const slot of [1,2]) {
  it(`refuses ${status} with a recoverable legacy sidecar in slot ${slot}, preserving both files`,()=>{
    const state=career(status);
    const live=JSON.parse(readFileSync(new URL('../fixtures/saves/v34-challenges/live-matches/v34-au-week-6.json',import.meta.url),'utf8'));
    live.engineId='legacy-engine-before-identity';
    const bytes=storage(state,JSON.stringify(live),slot), before=[...bytes];
    if (slot===1) expect(readLiveMatch()).toMatchObject({season:state.season,week:state.week});
    expect(loadSlot(slot)).toMatchObject({status:'corrupt',message:CHALLENGE_REPLAY_PROBLEM});
    expect([...bytes]).toEqual(before);
  });
}
