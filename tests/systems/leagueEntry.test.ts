import { createOpenCupOffer } from '../../src/systems/openCupEntry';
import { __setStorage } from '../../src/core/save';
import { afterEach, describe, expect, it } from 'vitest';
import { createNewGame, getState, loadState, type GameState } from '../../src/core/state';
import { validateCurrent } from '../../src/core/saveValidation';
import { setCareerNamespace } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX } from '../../src/core/storageKeys';
import { advanceUntil } from '../../src/core/advance';
import { publishedCap, freezeSignedTerms, capRoomFor } from '../../src/systems/cap';
import { leagueCareerStateProblem } from '../../src/systems/leagueEntryValidation';
import { leagueCommitmentPreview } from '../../src/systems/leagueSelection';
import { closeLeagueSeason } from '../../src/systems/leagueCareer';
import { prepareDivisionFinals } from '../../src/systems/divisionCareer';
import { competitionLadder } from '../../src/systems/competitionCalendar';
import { emptyFinance } from '../../src/core/state';
import { activePack, preparePack, selectPack } from '../../src/content';
import { AU_CAREER_PROFILE } from '../../src/content/career/au';
import { UK_CAREER_PROFILE } from '../../src/content/career/uk';
import { setupStructuralDivisionCareer } from '../../src/systems/divisionCareer';
import { previewLeagueEntry, acceptLeagueEntry } from '../../src/systems/leagueEntry';
import { clearHeldWeek, clearTickHooks, clearSeasonHooks, withFastForward, advanceWeek } from '../../src/core/time';
import { registerAllSystems } from '../../src/qa/soak';
import { bus } from '../../src/core/events';

async function initial(region: 'au' | 'uk' = 'au') {
  setCareerNamespace(DEV_TEST_PREFIX);
  await preparePack(region);
  createNewGame('Selection', 573, region === 'uk' ? { home: { town: 'Leeds', country: 'GB', lat: 53.8, lon: -1.5 } } : {});
  const profile = region === 'au' ? AU_CAREER_PROFILE : UK_CAREER_PROFILE;
  const state = structuredClone(setupStructuralDivisionCareer(profile, 573, undefined, { enterOpenCup: false }));
  const c = state.competitions!;
  c.leagueCareer = {
    version: 1, scheduleSeed: 573, clubId: state.clubId, phase: 'initial-choice',
    access: [{ leagueId: profile.startingDivisionId }], initialFields: Object.fromEntries(c.world!.divisions.map(d =>
      [d.id, c.instances.find(i => i.id === d.instanceId)!.entrantIds.slice()]))
  };
  return state;
}
function preview(s: GameState, id = s.competitions!.world!.profile.startingDivisionId) {
  const r = previewLeagueEntry(s, id);
  if (!r.ok) throw new Error(r.message);
  return r.preview;
}
function accept(s: GameState, id?: string) {
  const result = acceptLeagueEntry(s, preview(s, id));
  if (!result.ok) throw new Error(result.message);
  return result.state;
}
// Controlled sporting results, using the production bracket, standings and
// close owners. The regional integration cases below play the actual matches.
function settleWithTitle(active: GameState, win: boolean, bottomClubId?: string): GameState {
  let s = structuredClone(active);
  // This main-league-only fixture skips from opening day to the finals.
  // Model a migrated season with its cup registration window already missed.
  delete s.competitions!.openCupEntry;
  s = createOpenCupOffer({...s, week: 7});
  const c = s.competitions!;
  const current = () => s.competitions!.instances.filter(i => i.season === s.season);
  const play = (f: typeof c.instances[number]['fixtures'][number], winner: string) => {
    f.status = 'completed';
    f.result = { homeScore: f.homeId === winner ? 12 : 0, awayScore: f.awayId === winner ? 12 : 0, winnerId: winner, decider: 'score' };
  };
  for (const i of current()) {
    if (i.definition.format.kind !== 'league') {
      i.status = 'withdrawn'; for (const f of i.fixtures) f.status = 'cancelled';
      continue;
    }
    for (const f of i.fixtures) play(f, f.homeId === bottomClubId ? f.awayId : f.awayId === bottomClubId ? f.homeId
      : f.awayId === s.clubId ? s.clubId : f.homeId);
    i.status = 'active';
  }
  for (let round = 1; round <= 2; round++) {
    s.week = current().find(i => i.definition.format.kind === 'league')!.definition.stages[1]!.slotIds![round - 1]!;
    s.competitions!.calendar!.elapsedIntervals = c.leagueCareer!.accepted!.startInterval + s.week - 1;
    s = prepareDivisionFinals(s);
    for (const i of current().filter(i => i.definition.format.kind === 'league')) {
      const finals = i.fixtures.filter(f => f.stageId === i.definition.stages[1]!.id && f.round === round);
      for (const f of finals) {
        const playing = f.homeId === s.clubId || f.awayId === s.clubId;
        const winner = playing ? (win || round === 1 ? s.clubId : f.homeId === s.clubId ? f.awayId : f.homeId) : f.homeId;
        play(f, winner);
      }
      if (round === 2) { i.status = 'completed'; i.winnerId = finals[0]!.result!.winnerId!; }
    }
  }
  const own = current().find(i => i.definition.format.kind === 'league' && i.entrantIds.includes(s.clubId))!;
  s.league.ladder = competitionLadder(own);
  const closed = closeLeagueSeason(s);
  expect(closed.competitions!.leagueCareer!.phase).toBe('next-season-choice');
  return closed;
}
afterEach(() => { __setStorage(null); bus.clear(); clearHeldWeek(); clearTickHooks(); clearSeasonHooks(); selectPack('au'); setCareerNamespace(null); });
describe('League entry quotes and atomic candidates', () => {
  it('freezes a full first-season choice without allocating people, dice or a new draw', async () => {
    const s = await initial();
    const bytes = JSON.stringify(s);
    const p = preview(s);
    expect(p).toMatchObject({ eligible: true, sourceSeason: 1, targetSeason: 1, trialSlots: [1, 4], movements: [] });
    expect(p.quote.opponents.map(o => o.clubId)).toEqual(p.fieldIds.filter(id => id !== s.clubId));
    const locked = preview(s, s.competitions!.world!.divisions[1]!.id);
    expect(locked).toMatchObject({ eligible: false, requirement: { leagueId: p.leagueId }, evidence: null });
    expect(locked.quote.commitments[0]!.tier).toBe('championship');
    expect(acceptLeagueEntry(s, locked)).toMatchObject({ ok: false, reason: 'locked' });
    expect(acceptLeagueEntry({ ...s, rngSeed: s.rngSeed + 1 }, p)).toMatchObject({ ok: false, reason: 'stale' });
    const started = accept(s);
    expect(started.competitions!.instances).toEqual(s.competitions!.instances);
    expect(started.squad).toEqual(s.squad);
    expect(started.playerPopulation).toEqual(s.playerPopulation);
    expect(started.rngSeed).toBe(s.rngSeed);
    expect(started.competitions!.leagueCareer!.accepted).toMatchObject({ quote: p.quote, annualChanges: null });
    expect(acceptLeagueEntry(started, p)).toMatchObject({ ok: false, reason: 'unavailable' });
    expect(JSON.stringify(s)).toBe(bytes);
  });

  it('refuses malformed, unsupported and implicitly entered initial schedules without rewriting any snapshot', async () => {
    const s = await initial();
    const id = s.competitions!.world!.profile.startingDivisionId;
    const change = (mutate: (s: GameState) => void) => {
      const broken = structuredClone(s); mutate(broken);
      const bytes = JSON.stringify(broken);
      expect(previewLeagueEntry(broken, id).ok).toBe(false);
      expect(JSON.stringify(broken)).toBe(bytes);
    };
    change(b => { delete b.squad[0]!.xp; });
    change(b => { b.league.ladder = b.league.ladder.slice(1); });
    change(b => { b.finance.push({ ...b.finance[0]! }); });
    change(b => { b.version = (b.version + 1) as typeof b.version; });
    change(b => { b.squad[0]!.deal!.renewal = { salary: 999999, startSeason: b.squad[0]!.deal!.endSeason + 1, endSeason: b.squad[0]!.deal!.endSeason + 1 }; });
    change(b => { b.league.clubs.find(c => c.squad)!.capAccount = undefined as never; });
    change(b => { b.competitions!.instances[0]!.definition.matchRules.tryPoints++; });
    change(b => { b.competitions!.instances[0]!.definition.venues.final = 'same-as-rounds'; });
    change(b => {
      const d = b.competitions!.instances[0]!.definition; const f = d.stages[1]!; d.stages.splice(1, 1,
        { ...f, id: 'sf', rounds: 1, slotIds: [f.slotIds![0]!] }, { ...f, id: 'gf', rounds: 1, slotIds: [f.slotIds![1]!] });
    });
    change(b => { b.competitions!.instances[0]!.fixtures.pop(); });
    change(b => { b.freeAgents.push({ ...b.squad[0]!, id: 'unsigned-signed', clubHistory: { spells: [], academyDiscountUsed: true } }); });
    const marked = structuredClone(s.competitions!.leagueCareer!);
    createNewGame('Implicit cup', 573);
    const opted = structuredClone(setupStructuralDivisionCareer(AU_CAREER_PROFILE, 573));
    opted.competitions!.leagueCareer = marked;
    expect(previewLeagueEntry(opted, id)).toMatchObject({ ok: false, reason: 'unsupported' });
  });

  it('refuses unsupported round counts and fixture IDs reserved for future finals', async () => {
    const s = await initial();
    const id = s.competitions!.world!.profile.startingDivisionId;
    const minimum = structuredClone(s);
    const supported = minimum.competitions!.instances[0]!;
    supported.definition.stages[0]!.rounds = 7;
    supported.definition.stages[0]!.slotIds = supported.definition.stages[0]!.slotIds!.slice(0, 7);
    supported.fixtures = supported.fixtures.filter(f => f.round <= 7);
    expect(acceptLeagueEntry(minimum, preview(minimum)).ok).toBe(true);
    const short = structuredClone(s);
    const league = short.competitions!.instances[0]!;
    league.definition.stages[0]!.rounds = 6;
    league.definition.stages[0]!.slotIds = league.definition.stages[0]!.slotIds!.slice(0, 6);
    league.fixtures = league.fixtures.filter(f => f.round <= 6);
    expect(previewLeagueEntry(short, id)).toMatchObject({ ok: false, reason: 'unsupported' });
    const collision = structuredClone(s);
    const draw = collision.competitions!.instances[0]!;
    draw.fixtures[0]!.id = `${draw.id}:f${draw.fixtures.length}`;
    expect(previewLeagueEntry(collision, id)).toMatchObject({ ok: false, reason: 'unsupported' });
  });

  it('preserves reordered saved membership and fixtures when confirming the opening draw', async () => {
    const s = await initial();
    const c = s.competitions!;
    c.leagueCareer!.initialFields = Object.fromEntries(Object.entries(c.leagueCareer!.initialFields).map(([id, ids]) => [id, [...ids].reverse()]));
    for (const i of c.instances) i.fixtures.reverse();
    c.instances.reverse();
    const bytes = JSON.stringify(s);
    const current = c.instances.find(i => i.id === c.world!.divisions[0]!.instanceId)!;
    const p = preview(s);
    expect(p.fieldIds).toEqual(current.entrantIds);
    expect(p.quote.opponents.map(o => o.clubId)).toEqual(current.entrantIds.filter(id => id !== s.clubId));
    const started = accept(s);
    expect(JSON.stringify(started.competitions!.instances)).toBe(JSON.stringify(c.instances));
    expect(JSON.stringify(started.competitions!.leagueCareer!.initialFields)).toBe(JSON.stringify(c.leagueCareer!.initialFields));
    expect(JSON.stringify(s)).toBe(bytes);
  });

  it('admits signed integer cash but rejects fractional and unsafe player cash before entry', async () => {
    const s = await initial();
    const id = s.competitions!.world!.profile.startingDivisionId;
    for (const money of [s.money + 0.5, Number.MAX_SAFE_INTEGER + 1, Number.MIN_SAFE_INTEGER - 1]) {
      expect(previewLeagueEntry({ ...s, money }, id)).toMatchObject({ ok: false });
    }
    expect(accept({ ...s, money: -100 }).money).toBe(-100);
  });

  it('requires opening capacity to match every club initial league', async () => {
    const s = await initial();
    const player = structuredClone(s); player.capAccount.tier = 'premier';
    expect(leagueCareerStateProblem(player)).not.toBeNull();
    const rival = structuredClone(s);
    const id = rival.competitions!.leagueCareer!.initialFields[rival.competitions!.world!.divisions[0]!.id]!.find(id => id !== rival.clubId)!;
    rival.league.clubs.find(c => c.id === id)!.capAccount!.tier = 'premier';
    expect(leagueCareerStateProblem(rival)).not.toBeNull();
  });

  it('rejects invented player attainment and AI capacity below retained evidence after annual entry', async () => {
    const closed = settleWithTitle(accept(await initial()), true);
    const middle = closed.competitions!.world!.divisions[1]!.id;
    const next = accept(closed, middle);
    expect(leagueCareerStateProblem(next)).toBeNull();
    const invented = structuredClone(next);
    invented.capAccount.tier = 'premier';
    const receipt = invented.competitions!.leagueCareer!.accepted!;
    const forged = { clubId: invented.clubId, ...leagueCommitmentPreview(invented.squad, invented.capAccount, 2, 1) };
    receipt.quote.commitments[0] = forged;
    receipt.annualChanges!.commitments[0] = forged;
    expect(leagueCareerStateProblem(invented)).not.toBeNull();
    const prior = structuredClone(next);
    prior.competitions!.leagueCareer!.accepted!.quote.commitments[0]!.previousTier = 'championship';
    expect(leagueCareerStateProblem(prior)).not.toBeNull();
    const ai = structuredClone(next);
    const moved = ai.competitions!.leagueCareer!.accepted!.movements.find(m => m.clubId !== ai.clubId)!;
    const rival = ai.league.clubs.find(c => c.id === moved.clubId)!;
    rival.capAccount!.tier = 'local';
    const lower = { clubId: rival.id, ...leagueCommitmentPreview(rival.squad!, rival.capAccount!, 2, 0) };
    ai.competitions!.leagueCareer!.accepted!.quote.commitments[1] = { ...lower, previousTier: 'championship' };
    ai.competitions!.leagueCareer!.accepted!.annualChanges!.commitments[1] = lower;
    expect(leagueCareerStateProblem(ai)).not.toBeNull();
  });

  it('requires exact AI attainment while every prior season remains observable', async () => {
    const first = accept(await initial());
    const [local, middle] = first.competitions!.world!.divisions.map(d => d.id) as [string, string];
    const second = accept(settleWithTitle(first, true), middle);
    const third = accept(settleWithTitle(second, false), local);
    for (const source of [second, third]) {
      const invented = structuredClone(source);
      const receipt = invented.competitions!.leagueCareer!.accepted!;
      const untouchedId = invented.competitions!.leagueCareer!.initialFields[local]!.find(id => id !== source.clubId
        && !receipt.movements.some(m => m.clubId === id))!;
      invented.league.clubs.find(c => c.id === untouchedId)!.capAccount!.tier = 'premier';
      expect(leagueCareerStateProblem(invented)).not.toBeNull();
    }
    // This rival legitimately reaches Championship now; its quoted prior
    // capacity must still be Local while S1 and S2 membership remain known.
    const forgedPrevious = structuredClone(third);
    const quote = forgedPrevious.competitions!.leagueCareer!.accepted!.quote.commitments.find(q => q.clubId !== third.clubId)!;
    expect(quote).toMatchObject({ previousTier: 'local', tier: 'championship' });
    quote.previousTier = 'championship';
    expect(leagueCareerStateProblem(forgedPrevious)).not.toBeNull();
  });

  it('retains genuine AI attainment after its higher-league season has been pruned', async () => {
    const first = accept(await initial());
    const [local, middle] = first.competitions!.world!.divisions.map(d => d.id) as [string, string];
    const second = accept(settleWithTitle(first, true), middle);
    const third = accept(settleWithTitle(second, false), local);
    const promoted = third.competitions!.leagueCareer!.accepted!.movements.find(m => m.clubId !== third.clubId)!.clubId;
    expect(third.competitions!.leagueCareer!.initialFields[local]).toContain(promoted);
    expect(third.league.clubs.find(c => c.id === promoted)!.capAccount!.tier).toBe('championship');
    const fourth = accept(settleWithTitle(third, true, promoted), middle);
    expect(fourth.competitions!.leagueCareer!.accepted!.movements).toContainEqual({ clubId: promoted, fromLeagueId: middle, toLeagueId: local });
    const fifth = accept(settleWithTitle(fourth, false), middle);
    expect(fifth.competitions!.instances.some(i => i.season === 3)).toBe(false);
    const retainedLeagues = fifth.competitions!.instances.filter(i => i.definition.format.kind === 'league' && i.entrantIds.includes(promoted));
    expect(retainedLeagues.every(i => i.definition.id.endsWith(`:${local}`))).toBe(true);
    expect(fifth.league.clubs.find(c => c.id === promoted)!.capAccount!.tier).toBe('championship');
    expect(leagueCareerStateProblem(fifth)).toBeNull();
  });

  it('restricts frozen strengths to the integer range produced by real squads', async () => {
    const first = accept(await initial());
    const second = accept(settleWithTitle(first, false));
    for (const source of [first, second]) for (const side of ['quote', 'annualChanges'] as const) {
      if (!source.competitions!.leagueCareer!.accepted![side]) continue;
      for (const strength of [1.5, 29, 90.5, 91]) {
        const broken = structuredClone(source);
        broken.competitions!.leagueCareer!.accepted![side]!.opponents[0]!.strength = strength;
        expect(leagueCareerStateProblem(broken)).not.toBeNull();
      }
      for (const strength of [30, 90]) {
        const valid = structuredClone(source);
        valid.competitions!.leagueCareer!.accepted![side]!.opponents[0]!.strength = strength;
        expect(leagueCareerStateProblem(valid)).toBeNull();
      }
    }
  });

  it('reports the board dismissal when a completed career is also at its choice gate', async () => {
    const active = accept(await initial());
    active.boardPatience = 1; active.objectives = [{ id: 'building', kind: 'build', text: 'Build five facilities', status: 'pending', target: 5 }];
    const s = settleWithTitle(active, false);
    expect(s.sacked).toBeDefined();
    loadState(s);
    expect(previewLeagueEntry(s, s.competitions!.world!.profile.startingDivisionId)).toMatchObject({ ok: false, reason: 'unavailable' });
    expect(await advanceUntil({ kind: 'weeks', weeks: 1 })).toMatchObject({ weeksPlayed: 0, stop: { kind: 'target', text: 'The board has sacked you.' } });
  });

  it('keeps permanent title access and attained player/AI capacity through stay, up, two-tier down and return', async () => {
    const opening = await initial();
    const [local, middle, top] = opening.competitions!.world!.divisions.map(d => d.id) as [string, string, string];
    const first = settleWithTitle(accept(opening), true);
    const won = preview(first, middle);
    expect(won.evidence).toMatchObject({ season: 1, leagueId: local, targetLeagueId: middle, result: { winnerId: first.clubId } });
    expect(accept(first, local).competitions!.leagueCareer!.accepted!.movements).toEqual([]);
    const relegated = first.league.clubs.find(c => c.id === won.movements[1]!.clubId)!;
    for (const p of relegated.squad!) { p.age = 22; p.deal = { salary: 2000, startSeason: 1, endSeason: 3 }; }
    const protectedAi = relegated.squad![0]!;
    protectedAi.deal!.salary = 800000;
    relegated.capAccount = freezeSignedTerms([protectedAi], {
      ...relegated.capAccount!, purchasedLevel: 1, lastPurchaseSeason: 1,
      earnedBasisPoints: 500, receipts: ['prior-award']
    }, 1);
    const second = accept(first, middle);
    const retained = second.league.clubs.find(c => c.id === relegated.id)!;
    const invalidPrevious = structuredClone(second);
    const forged = { clubId: retained.id, ...leagueCommitmentPreview(retained.squad!, { ...retained.capAccount!, tier: 'local' }, 2, 0) };
    invalidPrevious.competitions!.leagueCareer!.accepted!.quote.commitments[1] = forged;
    invalidPrevious.competitions!.leagueCareer!.accepted!.annualChanges!.commitments[1] = forged;
    expect(validateCurrent(invalidPrevious as unknown as Record<string, unknown>).ok).toBe(false);
    expect(retained.capAccount).toEqual(relegated.capAccount);
    expect(retained.cash).toBe(relegated.cash);
    expect(second.competitions!.leagueCareer!.accepted!.quote.commitments[1]!.years.map(y => y.season)).toEqual([2, 3]);
    expect(second.competitions!.leagueCareer!.accepted!.movements).toEqual(won.movements);
    const next = settleWithTitle(second, true);
    const third = accept(next, top);
    expect(third.capAccount.tier).toBe('premier');
    const lost = settleWithTitle(third, false);
    lost.capAccount = { ...lost.capAccount, purchasedLevel: 2, lastPurchaseSeason: 3, earnedBasisPoints: 1000, receipts: ['old-cap-receipt'] };
    const survivor = lost.squad.find(p => p.emergencyDealEndSeason === undefined)!;
    survivor.age = 21;
    survivor.deal = { salary: 900000, startSeason: 3, endSeason: 4, renewal: { salary: 950000, startSeason: 5, endSeason: 6 } };
    lost.capAccount = freezeSignedTerms([survivor], lost.capAccount, 3);
    const down = preview(lost, local);
    expect(down.movements).toHaveLength(3);
    expect(down.quote.commitments[0]).toMatchObject({ previousTier: 'premier', tier: 'premier', cap: publishedCap(lost.capAccount) });
    expect(down.quote.commitments[0]!.years.map(y => [y.season, y.protectedAmount])).toEqual([[4, 900000], [5, 950000], [6, 950000]]);
    const fourth = accept(lost, local);
    expect(fourth.competitions!.leagueCareer!.accepted!.movements).toEqual(down.movements);
    expect(fourth.capAccount).toMatchObject({ tier: 'premier', purchasedLevel: 2, earnedBasisPoints: 1000, receipts: lost.capAccount.receipts });
    expect(fourth.capAccount.protectedTerms).toEqual(expect.arrayContaining(lost.capAccount.protectedTerms!));
    const added = fourth.capAccount.protectedTerms!.filter(t => t.playerId !== survivor.id);
    expect(added.every(t => fourth.squad.find(p => p.id === t.playerId)?.emergencyDealEndSeason === 4)).toBe(true);
    expect(fourth.money).toBe(lost.money);
    expect(fourth.squad.find(p => p.id === survivor.id)!.deal).toEqual(survivor.deal);
    expect(capRoomFor(fourth.squad, fourth.capAccount, 4, 1)).toBe(false);
    const again = settleWithTitle(fourth, false);
    const back = accept(again, top);
    expect(back.competitions!.leagueCareer!.access).toEqual(third.competitions!.leagueCareer!.access);
    expect(back.competitions!.leagueCareer!.accepted!.movements).toHaveLength(3);
    expect(back.capAccount.tier).toBe('premier');
    expect(back.squad.find(p => p.id === survivor.id)!.deal).toEqual(survivor.deal!.renewal);
    expect(back.squad.find(p => p.id === survivor.id)!.contractWeeks).toBe(2 * back.competitions!.calendar!.slots.length);
  });

  it('preserves planning books and separates promised years from renewal, expiry, retirement and intake', async () => {
    const closed = settleWithTitle(accept(await initial()), false);
    const [renew, expire, retire] = closed.squad;
    renew!.age = 22; renew!.deal = { salary: 1000, startSeason: 1, endSeason: 1, renewal: { salary: 1250, startSeason: 2, endSeason: 3 } };
    expire!.age = 22; expire!.deal = { salary: 2000, startSeason: 1, endSeason: 1 };
    retire!.age = 37; retire!.deal = { salary: 4000, startSeason: 1, endSeason: 3 };
    closed.finance.push({ ...emptyFinance(2), contracts: -500 });
    const p = preview(closed); const bytes = JSON.stringify(closed);
    const detached = acceptLeagueEntry(closed, p);
    if (!detached.ok) throw new Error(detached.message);
    expect(JSON.stringify(closed)).toBe(bytes);
    const next = detached.state;
    expect(next.squad.find(x => x.id === renew!.id)).toMatchObject({ age: 23, deal: renew!.deal!.renewal, contractWeeks: 50 });
    expect(next.squad.some(x => x.id === expire!.id)).toBe(false);
    expect(next.playerPopulation.retired.find(x => x.id === retire!.id)).toMatchObject({ age: 38, retiredAt: { season: 2, week: 1 } });
    expect(next.freeAgents.every(p => p.contractWeeks === 0)).toBe(true);
    expect(next.finance).toEqual(closed.finance);
    expect(next.money).toBe(closed.money); expect(next.reputation).toBe(closed.reputation);
    expect(next.competitions!.leagueCareer!.accepted!.quote).toEqual(p.quote);
    expect(next.competitions!.leagueCareer!.accepted!.annualChanges!.commitments[0]!.years).not.toEqual(p.quote.commitments[0]!.years);
    expect(next.history[0]!.review).toMatchObject({ ...closed.history[0]!.review, retired: expect.arrayContaining([{ name: retire!.name, age: 38 }]) });
    expect(acceptLeagueEntry(JSON.parse(JSON.stringify(next)), p)).toMatchObject({ ok: false, reason: 'unavailable' });
    expect(acceptLeagueEntry(closed, p)).toEqual(detached);
    const collision = settleWithTitle(next, false);
    collision.playerPopulation.nextPlayerOrdinal = 1;
    const afterCollision = accept(collision);
    const newJuniors = afterCollision.freeAgents.filter(p => p.junior && !collision.freeAgents.some(old => old.id === p.id));
    const newScholars = afterCollision.squad.filter(p => p.emergencyDealEndSeason === 3);
    expect(afterCollision.competitions!.leagueCareer!.accepted!.annualChanges!.academyBirths).toBe(newJuniors.length + newScholars.length);
    closed.playerPopulation.nextPlayerOrdinal = Number.MAX_SAFE_INTEGER - 1;
    const exhausted = preview(closed); const before = JSON.stringify(closed);
    expect(acceptLeagueEntry(closed, exhausted)).toMatchObject({ ok: false, reason: 'annual-failure', message: expect.stringMatching(/birth admission/i) });
    expect(JSON.stringify(closed)).toBe(before);
  });

  it('discards completed expiry and youth candidates when the later unsigned market intake exhausts IDs', async () => {
    const closed = settleWithTitle(accept(await initial()), false);
    for (const p of [...closed.squad, ...closed.league.clubs.flatMap(c => c.squad ?? [])]) {
      p.deal = { salary: 1000, startSeason: 1, endSeason: 2 };
      p.age = 22;
    }
    closed.playerPopulation.nextPlayerOrdinal = Number.MAX_SAFE_INTEGER - 4;
    const p = preview(closed); const original = JSON.stringify(closed);
    const result = acceptLeagueEntry(closed, p);
    expect(result).toMatchObject({ ok: false, reason: 'annual-failure', message: 'Unsigned market birth admission failed' });
    expect(JSON.stringify(closed)).toBe(original);
  });

  it('previews a saved UK draw with AU selected and refuses annual generation until UK content is loaded', async () => {
    const closed = settleWithTitle(accept(await initial('uk')), false);
    const before = JSON.stringify(closed);
    const expected = preview(closed);
    selectPack('au');
    const p = preview(closed);
    expect(p).toEqual(expected);
    expect(acceptLeagueEntry(closed, p)).toMatchObject({ ok: false, reason: 'unsupported' });
    expect(activePack().id).toBe('au');
    expect(JSON.stringify(closed)).toBe(before);
    selectPack('uk');
    expect(acceptLeagueEntry(closed, p).ok).toBe(true);
  });

  it.each(['au', 'uk'] as const)('plays two complete %s calendars and admits the third with the registered systems', async region => {
    const s = await initial(region);
    const bytes = new Map<string,string>();
    __setStorage({getItem:k => bytes.get(k) ?? null,setItem:(k,v)=>{bytes.set(k,v);},removeItem:k=>{bytes.delete(k);}});
    loadState(accept(s));
    registerAllSystems();
    for (const season of [1, 2]) {
      const length = getState().competitions!.calendar!.slots.length;
      withFastForward(() => { for (let i = 0; i < length; i++)advanceWeek(); });
      const closed = getState();
      expect(closed.competitions!.leagueCareer!.phase).toBe('next-season-choice');
      const p = preview(closed);
      const unpaid = structuredClone(closed);
      delete unpaid.matchIncome[0]!.receipt;
      expect(acceptLeagueEntry(unpaid, p).ok).toBe(false);
      const next = accept(closed);
      expect(next).toMatchObject({ season: season + 1, week: 1, playerPopulation: { lastAcademyIntakeSeason: season + 1, lastMarketIntakeSeason: season + 1 } });
      expect(next.competitions!.leagueCareer!.accepted!.quote).toEqual(p.quote);
      expect(next.competitions!.instances.every(i => i.season === season || i.season === season + 1)).toBe(true);
      const beforePeople = [...closed.squad, ...closed.freeAgents, ...closed.league.clubs.flatMap(c => c.squad ?? [])];
      const afterPeople = new Map([...next.squad, ...next.freeAgents, ...next.league.clubs.flatMap(c => c.squad ?? []), ...next.playerPopulation.retired].map(p => [p.id, p.age]));
      expect(beforePeople.every(p => afterPeople.get(p.id) === p.age + 1)).toBe(true);
      expect(next.competitions!.instances.filter(i => i.season === season + 1).every(i => ['league', 'exhibition'].includes(i.definition.format.kind))).toBe(true);
      expect(next.matchIncome).toEqual(closed.matchIncome.filter(r => r.season === season));
      expect(next.history[season - 1]!.review).toMatchObject(closed.history[season - 1]!.review!);
      const checked = validateCurrent(JSON.parse(JSON.stringify(next)));
      expect(checked).toMatchObject({ ok: true, repairs: [] });
      if (checked.ok) loadState(checked.state);
    }
  }, 90000);
});
