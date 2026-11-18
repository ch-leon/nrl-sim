import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { migrateState } from '../../src/core/save';
import type { GameState } from '../../src/core/state';
import { validateCompetitions } from '../../src/data/competition';
import {
  chooseOpenCupEntry,
  closeOpenCupRegistration,
  previewOpenCupEntry,
  requestOpenCupWithdrawal
} from '../../src/systems/openCupEntry';
import { freezeMatchEffects } from '../../src/systems/matchIncome';
import { finaliseCalendarFixture, fixtureBridge } from '../../src/systems/competitionCalendar';

function migrated(point: string) {
  const raw = JSON.parse(readFileSync(new URL('../fixtures/saves/league-career/v32-au-' + point + '.json', import.meta.url), 'utf8'));
  const result = migrateState(raw);
  if (!result.ok) throw Error(result.message);
  return result.state;
}
function registered() {
  const state = migrated('week-6');
  const preview = previewOpenCupEntry(state);
  if (!preview.ok) throw Error(preview.message);
  const selected = chooseOpenCupEntry(state, { ...preview.preview, choice: 'enter' });
  if (!selected.ok) throw Error(selected.message);
  const c = closeOpenCupRegistration(selected.state).competitions!;
  const active = migrated('week-7');
  active.competitions!.openCupEntry = c.openCupEntry!;
  active.competitions!.instances.push(c.instances[c.instances.length - 1]!);
  return active;
}
const cup = (s: GameState) => s.competitions!.instances[s.competitions!.instances.length - 1]!;
const valid = (s: GameState) =>
  validateCompetitions(s.competitions, { pack: 'au', season: s.season, week: s.week, clubIds: s.league.clubs.map(c => c.id) });
it('rejects corrupted terms, activation and choice evidence on every publication', () => {
  const active = registered();
  expect(valid(active)).toBeNull();
  for (const mutate of [
    (o: any) => {
      o.extra = true;
    },
    (o: any) => {
      delete o.deadline;
    },
    (o: any) => {
      o.deadline++;
    },
    (o: any) => {
      o.dates.reverse();
    },
    (o: any) => {
      o.offerId += 'x';
    },
    (o: any) => {
      o.season++;
    },
    (o: any) => {
      o.profileVersion++;
    },
    (o: any) => {
      o.profileId = 'uk';
    },
    (o: any) => {
      o.eligibleClubIds.reverse();
    },
    (o: any) => {
      o.draw.scheduleSeed++;
    },
    (o: any) => {
      o.draw.ordinal = 1;
    },
    (o: any) => {
      o.definition.rewards[0].matchBaseMultiplier++;
    },
    (o: any) => {
      o.definition.matchRules.halfMinutes++;
    },
    (o: any) => {
      o.definition.lineup.benchSize++;
    },
    (o: any) => {
      o.resolution = 'declined';
    },
    (o: any) => {
      o.lastChoice.slot = 7;
    },
    (o: any) => {
      o.lastChoice.season++;
    },
    (o: any) => {
      o.lastChoice.choice = 'decline';
    },
    (o: any) => {
      o.lastChoice.offerId += 'x';
    },
    (o: any) => {
      o.lifecycle = 'open';
    },
    (o: any) => {
      o.instanceId += 'x';
    },
    (o: any) => {
      o.withdrawal = { requestSlot: 6, fulfilled: null };
    },
    (o: any) => {
      o.withdrawal = { requestSlot: 7, fulfilled: { fixtureId: 'fake', slot: 7, result: { winnerId: 'player' } } };
    }
  ]) {
    const s = structuredClone(active);
    mutate(s.competitions!.openCupEntry!.current);
    expect(valid(s)).not.toBeNull();
    expect(migrateState(s).ok).toBe(false);
  }
  for (const mutate of [
    (s: GameState) => {
      delete s.competitions!.openCupEntry;
    },
    (s: GameState) => {
      s.competitions!.openCupEntry!.retained.push(s.competitions!.openCupEntry!.current);
    },
    (s: GameState) => {
      cup(s).tieOrder.reverse();
    },
    (s: GameState) => {
      cup(s).entrantIds.reverse();
    },
    (s: GameState) => {
      cup(s).fixtures.pop();
    },
    (s: GameState) => {
      cup(s).definition.rewards = [];
    }
  ]) {
    const s = structuredClone(active);
    mutate(s);
    expect(valid(s)).not.toBeNull();
  }
});
it('refuses a complete but prematurely published draw at the start of week 6', () => {
  const s = migrated('week-6');
  expect(migrateState(closeOpenCupRegistration(s)).ok).toBe(false);
});
it('accepts scheduled kickoff promises but never repairs a pending accepted normal result', () => {
  const s = registered(),
    i = cup(s),
    f = i.fixtures[0]!;
  const pending = freezeMatchEffects(s, fixtureBridge({ instance: i, fixture: f }));
  expect(migrateState(pending).ok).toBe(true);
  const noPrize = structuredClone(pending);
  noPrize.competitionRewards = [];
  expect(migrateState(noPrize).ok).toBe(false);
  const forged = structuredClone(pending),
    reward = forged.competitionRewards[0]!;
  reward.matchBase = reward.matchBase === 8000 ? 18000 : 8000;
  forged.matchIncome.find(r => r.fixture.id === fixtureBridge({ instance: i, fixture: f }).id)!.matchBase = reward.matchBase;
  for (const item of reward.policies) if (item.policy.kind === 'cash') item.cash = reward.matchBase * item.policy.matchBaseMultiplier;
  expect(migrateState(forged).ok).toBe(false);
  const accepted = structuredClone(pending);
  const fixture = cup(accepted).fixtures[0]!;
  fixture.status = 'completed';
  fixture.result = { homeScore: 24, awayScore: 0, decider: 'score', winnerId: fixture.homeId };
  expect(migrateState(accepted).ok).toBe(false);
  const p = previewOpenCupEntry(s);
  if (!p.ok) throw Error(p.message);
  expect(requestOpenCupWithdrawal(s, { ...p.preview, previewKey: 'stale' })).toMatchObject({ ok: false, reason: 'stale' });
  expect(chooseOpenCupEntry(s, { ...p.preview, choice: 'enter' })).toMatchObject({ ok: false, reason: 'unavailable' });
});

it('settles a tied normal cup score once using the saved tie order', () => {
  const s = registered(),
    i = cup(s),
    f = i.fixtures[0]!,
    bridge = fixtureBridge({ instance: i, fixture: f });
  const winner = i.tieOrder.indexOf(f.homeId) < i.tieOrder.indexOf(f.awayId) ? f.homeId : f.awayId;
  const next = finaliseCalendarFixture(s, bridge, { homeScore: 12, awayScore: 12 });
  expect(cup(next).fixtures[0]!.result).toEqual({ homeScore: 12, awayScore: 12, decider: 'seeded-draw', winnerId: winner });
  expect(next.competitionRewards[0]).toMatchObject({
    status: 'settled',
    receipts: [
      { kind: 'cash', clubId: winner },
      { kind: 'reputation', clubId: winner }
    ]
  });
  expect(finaliseCalendarFixture(next, bridge, { homeScore: 12, awayScore: 12 })).toEqual(next);
});
