import { AU_PACK } from '../../src/content/au';
import { createCompetitionInstance, competitionFixtureId, type CompetitionDefinition, type CompetitionInstance } from '../../src/data/competition';

/** Metadata fixture, not an enabled competition or a claim of tuned prizes. */
export function cupDefinition(pack = 'au'): CompetitionDefinition {
  return {
    id: 'test-cup', version: 1, pack, name: 'Test Cup', format: { kind: 'knockout' },
    minEntrants: 2, maxEntrants: 4, slotCount: 28,
    stages: [{ id: 'cup', name: 'Cup', kind: 'knockout', rounds: 2 }],
    matchRules: { ...AU_PACK.rules }, drawnKnockout: 'seeded-draw',
    lineup: { onField: 9, benchSize: 4, minSquad: 13, maxSquad: 30 }, eligibility: { kind: 'open' },
    venues: { rounds: 'drawn-home', final: 'neutral' },
    rewards: [
      { id: 'win', stageId: 'cup', round: 2, kind: 'cash', matchBaseMultiplier: 2 },
      { id: 'title', stageId: 'cup', round: 2, kind: 'honour', title: 'Test Cup winner' },
    ],
  };
}
export function cupInstance(clubIds: readonly string[], pack = 'au', ordinal = 0): CompetitionInstance {
  const instance = createCompetitionInstance(cupDefinition(pack), 1, ordinal, clubIds);
  instance.status = 'scheduled'; instance.stageId = 'cup';
  instance.fixtures = [{
    id: competitionFixtureId(instance.id, 0), competitionId: instance.id, stageId: 'cup', round: 1,
    slot: 7, homeId: clubIds[0]!, awayId: clubIds[1]!, neutral: false, status: 'scheduled',
  }];
  return instance;
}
