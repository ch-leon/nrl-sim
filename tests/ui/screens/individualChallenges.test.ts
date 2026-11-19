import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { bindChallengeLane, type ChallengeLane } from '../../../src/ui/challengeLane';
import { __setStorage, __unlockSaves, setActiveSlot } from '../../../src/core/save';
import { beginNativeCheckpointBoot } from '../../../src/core/storage/nativeCheckpoint';
import { NativeMirror, fileForKey } from '../../../src/core/storage/nativeMirror';
import { changeChallenge, currentIndividualChallenge } from '../../../src/systems/individualChallenges';
import { type GameState, getState, loadState } from '../../../src/core/state';
import { CHALLENGE_EDITIONS, type ChallengeCall } from '../../../src/data/individualChallengeRules';
import { challengeCheckpoint, initialChallengeProgress, resolveChallengeAction } from '../../../src/systems/individualChallengeEngine';
import { clashFrame, LANE_MARKER, CLASH_DURATION } from '../../../src/scenes/individualChallengePresentation';
import { buildIndividualChallengeCards, openIndividualChallenge } from '../../../src/ui/screens/individualChallenges';
import { closeModal } from '../../../src/ui/dom';
import { decisionChipItems } from '../../../src/ui/decisions';
import { report } from '../../../src/ui/screens/individualChallengeCopy';
import { applyAssignmentAward } from '../../../src/systems/assignmentTraining';
import { StubNode, stubDocument } from '../stubDom';

const edition = CHALLENGE_EDITIONS.showground;
const player = { ...edition.opponents[0], id: 'participant' };
function clash(index: number, call: ChallengeCall, j: number) {
  const cp = challengeCheckpoint(edition, player, { ...initialChallengeProgress(player), clashIndex: index })!;
  return resolveChallengeAction(cp, call, j);
}

it('shows every scored contact finishing on the correct side of the marker', () => {
  const outcomes = new Set<number>();
  for (let j = -12; j <= 12; j++) {
    const saved = clash(0, 'power', j);
    const frame = clashFrame(saved, CLASH_DURATION);
    outcomes.add(saved.score);
    expect(Math.sign(frame.carrier.x - LANE_MARKER)).toBe(saved.score - 1);
    expect(clashFrame(saved, 2200).contact?.contact.carrier.who).toBe(player.id);
  }
  expect(outcomes.size).toBe(3);
});

it('gives all six calls distinct approach paths and poses using the committed identities', () => {
  for (const [index, calls] of [[0,['power','angle','controlled']],[1,['shoot','track','wrap']]] as const) {
    const paths = calls.map(call => {
      const saved = clash(index, call, 1);
      const f = clashFrame(saved, 1300);
      const actual = index === 0 ? f.carrier : f.defender;
      expect(actual.picture.who).toBe(player.id);
      return JSON.stringify([actual.x,actual.y,actual.picture.movement]);
    });
    expect(new Set(paths).size).toBe(3);
  }
});

beforeEach(() => stubDocument());
afterEach(() => { closeModal(); bindChallengeLane(null); beginNativeCheckpointBoot(false); __setStorage(null); vi.unstubAllGlobals(); });
it('publishes both editions in League, the actual entry comparison and the tie rule', () => {
  const state: GameState = JSON.parse(readFileSync(new URL('../../fixtures/saves/v34-challenges/v34-au-week-5.json', import.meta.url),'utf8'));
  loadState(state);
  const cards = buildIndividualChallengeCards(state) as unknown as StubNode[];
  expect(cards.map(card => card.words()).join(' ')).toMatch(/Invitational/);
  const page = openIndividualChallenge('showground') as unknown as StubNode;
  expect(page.words()).toMatch(/bonus carry/i);
  const select = page.querySelector('[data-challenge-player]') as unknown as HTMLSelectElement;
  select.value = state.squad.find(p=> !p.injuredWeeks && !p.suspendedWeeks)!.id;
  select.onchange!(new Event('change'));
  for (const term of ['Strength','Speed','Stamina','Footy IQ','Auto-coach title chance']) expect(page.words()).toContain(term);
});

function installCoaching() {
  const bytes = new Map<string,string>();
  const local = {getItem:(key:string) => bytes.get(key) ?? null, setItem:(key:string,value:string) => {bytes.set(key,value);}, removeItem:(key:string) => {bytes.delete(key);}};
  __setStorage(local); __unlockSaves(); setActiveSlot(1);
  function week(n: number): GameState {
    return {...JSON.parse(readFileSync(new URL(`../../fixtures/saves/v34-challenges/v34-au-week-${n}.json`, import.meta.url),'utf8')), version:35};
  }
  const original = week(5);
  const booked = changeChallenge(original,'showground',{kind:'book',participantId:original.squad.find(p=>!p.injuredWeeks && !p.suspendedWeeks)!.id});
  if (!booked.ok) throw Error(booked.message);
  const due = week(6);
  const start = changeChallenge({...due,competitions:{...due.competitions!,individualChallenges:booked.state.competitions!.individualChallenges!}},
    'showground',{kind:'start'});
  if (!start.ok) throw Error(start.message);
  loadState(start.state);
  return {bytes,local};
}
const opened = () => openIndividualChallenge('showground') as unknown as StubNode;
const record = () => currentIndividualChallenge(getState(),'showground')!;
const tap = (d:StubNode, name:string) => {
  const b = d.querySelector(`[data-challenge-${name}]`);
  expect(b,`available control ${name}`).not.toBeNull();
  b!.click();
};

it('saves before staging, skips to the next decision and discards a callback from a closed career', async () => {
  installCoaching();
  const stages: ChallengeLane[] = [];
  bindChallengeLane(lane=>{ stages.push(lane); return {pause:()=>{},close:()=>{}}; });
  const d = opened();
  expect(stages.filter(l=>l.clash)).toHaveLength(0);
  d.querySelector('[data-challenge-call="angle"]')!.click();
  const week = getState().week;
  tap(d,'watch');
  await vi.waitFor(()=>expect(d.querySelector('[data-challenge-skip]')).not.toBeNull());
  const saved = record().contest!.clashes[0]!;
  const animated = stages.find(l=>l.clash)!;
  expect(animated.clash).toEqual(saved);
  tap(d,'skip');
  expect(record().contest!.clashes).toHaveLength(1);
  expect(d.querySelector('[data-challenge-call="track"]')).not.toBeNull();
  expect(getState().week).toBe(week);
  tap(d,'auto');
  await vi.waitFor(()=>expect(d.words()).toMatch(/Return to manual/));
  tap(d,'watch');
  await vi.waitFor(()=>expect(d.querySelector('[data-challenge-skip]')).not.toBeNull());
  animated.onFinish();
  expect(d.querySelector('[data-challenge-skip]')).not.toBeNull();
  stages[stages.length - 1]!.onFinish();
  expect(d.querySelector('[data-challenge-skip]')).toBeNull();
  expect(record().contest!.clashes).toHaveLength(2);
  tap(d,'auto');
  await vi.waitFor(()=>expect(d.querySelector('[data-challenge-call="controlled"]')).not.toBeNull());
  tap(d,'finish');
  expect(record().contest!.clashes).toHaveLength(2);
  tap(d,'confirm');
  await vi.waitFor(()=>expect(d.querySelector('[data-challenge-podium="ready-for-interval"]')).not.toBeNull());
  expect(d.words()).toMatch(/payable on return/);
  tap(d,'leave');
  const before = getState();
  animated.onFinish();
  expect(getState()).toBe(before);
  expect(d.isConnected).toBe(false);
});

it('withholds watched and batch results after a failed native acknowledgement, then confirms the same saved bytes', async () => {
  const {bytes,local} = installCoaching();
  const attach = beginNativeCheckpointBoot(true);
  const d = opened();
  const stages: ChallengeLane[] = [];
  bindChallengeLane(lane=>{ stages.push(lane); return {pause:()=>{},close:()=>{}}; });
  d.querySelector('[data-challenge-call="angle"]')!.click();
  tap(d,'watch');
  await vi.waitFor(()=>expect(d.querySelector('[data-challenge-retry]')).not.toBeNull());
  const single = bytes.get('nrl-sim-save-slot-1')!;
  expect(record().contest!.clashes).toHaveLength(1);
  expect(stages.some(s=>s.clash)).toBe(false);
  expect(d.words()).not.toMatch(/Last clash|crew [+−]|payable on return/);
  // A replacement web view reconstructs the reveal gate before drawing its lane.
  closeModal();
  const reopened = opened();
  expect(reopened.querySelector('[data-challenge-lane]')).toBeNull();
  const files = new Map<string,string>();
  let rejectWrites = false;
  const mirror = new NativeMirror({
    list:async()=>[...files.keys()], exists:async k=>files.has(k), read:async k=>files.get(k)!,
    write:async(k,v)=>{if(rejectWrites) throw Error('device full'); files.set(k,v);},
    remove:async k=>{files.delete(k);}, rename:async(from,to)=>{files.set(to,files.get(from)!);files.delete(from);},
  },()=>{});
  expect(attach(local,mirror)).toBe(true);
  tap(reopened,'retry');
  await vi.waitFor(()=>expect(reopened.querySelector('[data-challenge-call="wrap"]')).not.toBeNull());
  expect(files.get(fileForKey('nrl-sim-save-slot-1'))).toBe(single);
  expect(bytes.get('nrl-sim-save-slot-1')).toBe(single);
  rejectWrites = true;
  tap(reopened,'finish');tap(reopened,'confirm');
  await vi.waitFor(()=>expect(reopened.querySelector('[data-challenge-retry]')).not.toBeNull());
  expect(record().status).toBe('ready-for-interval');
  expect(reopened.querySelector('[data-challenge-podium]')).toBeNull();
  expect(reopened.words()).not.toMatch(/payable on return/);
  const batch = bytes.get('nrl-sim-save-slot-1');
  rejectWrites=false;
  tap(reopened,'retry');
  await vi.waitFor(()=>expect(reopened.querySelector('[data-challenge-podium]')).not.toBeNull());
  expect(bytes.get('nrl-sim-save-slot-1')).toBe(batch);
  expect(files.get(fileForKey('nrl-sim-save-slot-1'))).toBe(batch);
});


it('explains insufficient club cover in the finished report and decision chip', () => {
  installCoaching();
  const finished = changeChallenge(getState(),'showground',{kind:'finish'});
  if (!finished.ok) throw Error(finished.message);
  const participantId = finished.state.competitions!.individualChallenges![0]!.participantId;
  let available = 0;
  loadState({...finished.state, squad:finished.state.squad.map(p=>p.id===participantId ? p : {...p,injuredWeeks:++available <= 12 ? 0 : 2,suspendedWeeks:0})});
  expect(record().status).toBe('ready-for-interval');
  const d = opened();
  expect(d.words()).toContain('Arrange enough legal club cover before advancing the contest week.');
  expect(decisionChipItems(getState())[0]!.note).toContain('club cover');
  expect(decisionChipItems(getState())[0]!.note).not.toContain('coaching decision');
});

it.each([[71.99999999999999,'72'],[71.125,'71.13']])('formats settled XP %s without floating-point tails', (effectiveXp,shown) => {
  installCoaching();
  const finished = changeChallenge(getState(),'showground',{kind:'finish'});
  if (!finished.ok) throw Error(finished.message);
  const r = currentIndividualChallenge(finished.state,'showground')!;
  const entrant = finished.state.squad.find(p=>p.id===r.participantId)!;
  const xp = applyAssignmentAward(entrant,60,{clubFocus:'balanced',mode:'manual'}).receipt;
  const panel = report({...r,status:'completed',award:{xp:{...xp,effectiveXp},cash:0,honour:null}},edition,false) as unknown as StubNode;
  expect(panel.words()).toContain(`+${shown} XP`);
});
