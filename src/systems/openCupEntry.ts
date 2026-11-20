import { runningChallengeContext } from '../core/time';
import { FORFEIT_SCORE } from '../config';
import type { GameState } from '../core/state';
import { validateCompetitions, type CompetitionCareerState } from '../data/competition';
import { canonicalLeagueJson } from '../data/leagueCareer';
import { cupDefinition, offerIdentity, type CupChoice, type OpenCupOffer } from '../data/openCupEntry';
import { leagueCareerStateProblem } from './leagueEntryValidation';
import { drawOpenCup, isOpenCupInstance } from './openCup';
import { finaliseCalendarFixture, fixtureBridge } from './competitionCalendar';

export interface OpenCupWithdrawal {
  offerId: string;
  previewKey: string;
}
export interface OpenCupChoice extends OpenCupWithdrawal {
  choice: Exclude<CupChoice, 'unanswered'>;
}
export interface OpenCupEntryPreview extends Omit<OpenCupOffer, 'draw'> {
  previewKey: string;
  fee: 0;
  canChoose: boolean;
  canWithdraw: boolean;
}
export type OpenCupEntryRefusal = { ok: false; reason: 'invalid' | 'unavailable' | 'stale'; message: string };
export type OpenCupEntryPreviewResult = { ok: true; preview: OpenCupEntryPreview } | OpenCupEntryRefusal;
export type OpenCupEntryResult = { ok: true; state: GameState } | OpenCupEntryRefusal;
const refused = (reason: OpenCupEntryRefusal['reason'], message: string): OpenCupEntryRefusal => ({ ok: false, reason, message });

export function createOpenCupOffer(state: GameState): GameState {
  const c = state.competitions;
  if (!c?.leagueCareer || c.leagueCareer.phase !== 'active' || c.openCupEntry?.current.season === state.season) return state;
  const definition = structuredClone(c.openCupEntry?.current.definition ?? cupDefinition(c));
  const dates = [...definition.stages[0]!.slotIds!];
  const prior = c.openCupEntry?.current;
  const retained = prior?.lifecycle === 'drawn' && c.instances.some(i => i.id === prior.instanceId) ? [prior] : [];
  const existing = c.instances.some(i => i.season === state.season && isOpenCupInstance(i));
  const resolution = existing ? 'legacy-cup' : state.week >= dates[0]! ? 'legacy-window-missed' : null;
  const current: OpenCupOffer = {
    offerId: offerIdentity(definition.id, state.season),
    season: state.season,
    profileId: c.world!.profile.id,
    profileVersion: c.world!.profile.version,
    definition,
    dates,
    deadline: dates[0]!,
    eligibleClubIds: state.league.clubs.map(club => club.id).sort(),
    draw: { scheduleSeed: c.leagueCareer.scheduleSeed, ordinal: 0 },
    lifecycle: resolution ? 'unavailable' : 'open',
    resolution,
    choice: 'unanswered',
    lastChoice: null,
    instanceId: null,
    withdrawal: null
  };
  return { ...state, competitions: { ...c, openCupEntry: { version: 1, current, retained } } };
}

function checked(state: GameState, competitions: CompetitionCareerState): GameState {
  const problem = validateCompetitions(competitions, {
    runningChallenge: runningChallengeContext(state),
    pack: state.pack ?? 'au',
    season: state.season,
    week: state.week,
    clubId: state.clubId,
    clubIds: state.league.clubs.map(c => c.id)
  });
  if (problem) throw Error(problem);
  return { ...state, competitions };
}

function changeOffer(state: GameState, current: OpenCupOffer): GameState {
  const c = state.competitions!;
  return checked(state, { ...c, openCupEntry: { ...c.openCupEntry!, current } });
}

export function previewOpenCupEntry(state: GameState): OpenCupEntryPreviewResult {
  const c = state.competitions;
  const o = c?.openCupEntry?.current;
  if (!o || !c.leagueCareer) return refused('unavailable', 'Choose a league to receive your Open Cup offer.');
  const problem = leagueCareerStateProblem(state);
  if (problem) return refused('invalid', problem.message);
  const cup = c.instances.find(i => i.id === o.instanceId);
  const active = c.leagueCareer.phase === 'active' && !state.sacked;
  const canWithdraw =
    active &&
    state.week >= o.deadline &&
    o.resolution === 'entered' &&
    !o.withdrawal &&
    !!cup &&
    ['scheduled', 'active'].includes(cup.status) &&
    !cup.fixtures.some(f => f.result && (f.homeId === state.clubId || f.awayId === state.clubId) && f.result.winnerId !== state.clubId);
  const { draw: _provenance, ...terms } = structuredClone(o);
  return {
    ok: true,
    preview: {
      ...terms,
      fee: 0,
      canChoose: active && o.lifecycle === 'open' && state.week < o.deadline,
      canWithdraw,
      previewKey: canonicalLeagueJson(['open-cup-choice-v1', state])
    }
  };
}

function selectionPreview(state: GameState, selection: OpenCupWithdrawal): OpenCupEntryPreviewResult {
  const p = previewOpenCupEntry(state);
  if (p.ok && (p.preview.offerId !== selection.offerId || p.preview.previewKey !== selection.previewKey))
    return refused('stale', 'The career changed. Review the Open Cup again.');
  return p;
}

export function chooseOpenCupEntry(state: GameState, selection: OpenCupChoice): OpenCupEntryResult {
  const p = selectionPreview(state, selection);
  if (!p.ok) return p;
  if (!['enter', 'decline'].includes(selection.choice)) return refused('invalid', 'Unknown Open Cup choice.');
  if (!p.preview.canChoose) return refused('unavailable', 'Registration is closed for this season.');
  const s = structuredClone(state),
    o = s.competitions!.openCupEntry!.current;
  if (o.choice === selection.choice) return { ok: true, state: s };
  return {
    ok: true,
    state: changeOffer(s, {
      ...o,
      choice: selection.choice,
      lastChoice: { offerId: o.offerId, season: o.season, choice: selection.choice, slot: s.week }
    })
  };
}

export function closeOpenCupRegistration(state: GameState): GameState {
  const c = state.competitions,
    o = c?.openCupEntry?.current;
  if (!c || !o || o.lifecycle !== 'open' || state.week !== o.deadline - 1) return state;
  checked(state, c);
  const instance = drawOpenCup({
    definition: o.definition,
    season: o.season,
    seed: o.draw.scheduleSeed,
    ordinal: o.draw.ordinal,
    clubIds: o.eligibleClubIds,
    playerId: state.clubId,
    enterPlayer: o.choice === 'enter',
    currentSlot: state.week,
    existingInstances: c.instances
  }).instance;
  const resolution = ({ enter: 'entered', decline: 'declined', unanswered: 'expired' } as const)[o.choice];
  return checked(state, {
    ...c,
    instances: [...c.instances, instance],
    openCupEntry: { ...c.openCupEntry!, current: { ...o, lifecycle: 'drawn', resolution, instanceId: instance.id } }
  });
}

export function requestOpenCupWithdrawal(state: GameState, selection: OpenCupWithdrawal): OpenCupEntryResult {
  const p = selectionPreview(state, selection);
  if (!p.ok) return p;
  if (!p.preview.canWithdraw) return refused('unavailable', 'The club has no remaining Open Cup tie to withdraw from.');
  const s = structuredClone(state),
    o = s.competitions!.openCupEntry!.current;
  return { ok: true, state: changeOffer(s, { ...o, withdrawal: { requestSlot: s.week, fulfilled: null } }) };
}

export function resolveOpenCupWithdrawal(state: GameState): GameState {
  const c = state.competitions,
    o = c?.openCupEntry?.current;
  if (!c || !o?.withdrawal || o.withdrawal.fulfilled) return state;
  const instance = c.instances.find(i => i.id === o.instanceId)!;
  const fixture = instance.fixtures.find(
    f => f.slot === state.week && f.status === 'scheduled' && (f.homeId === state.clubId || f.awayId === state.clubId)
  );
  if (!fixture) return state;
  const home = fixture.homeId === state.clubId;
  const next = finaliseCalendarFixture(
    state,
    fixtureBridge({ instance, fixture }),
    { homeScore: home ? 0 : FORFEIT_SCORE, awayScore: home ? FORFEIT_SCORE : 0 },
    true,
    { kind: 'open-cup-withdrawal', offerId: o.offerId }
  );
  if (!next.competitions?.openCupEntry?.current.withdrawal?.fulfilled) throw Error('The Open Cup withdrawal could not be settled.');
  return next;
}
