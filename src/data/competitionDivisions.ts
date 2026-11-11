// Saved regional membership refers to canonical clubs and league instances;
// neither this metadata nor a competition owns a second copy of a roster.
import type { CompetitionInstance } from './competition';
import type { CompetitionCalendarSlot } from './competitionCalendar';

export interface DivisionMetadata {
  id: string;
  name: string;
  rank: number;
  ratingMean: number;
  instanceId: string;
}
export interface CompetitionWorldMetadata {
  profile: { id: string; version: number; pack: string; startingDivisionId: string };
  divisions: DivisionMetadata[];
}

const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const keys = (v: Record<string, unknown>, allowed: readonly string[]): boolean => Object.keys(v).every(k => allowed.includes(k));

export function validateCompetitionWorld(v: unknown, instances: readonly CompetitionInstance[], context: { pack: string; season: number; clubIds: readonly string[]; slots: readonly CompetitionCalendarSlot[] }): string | null {
  if (!object(v) || !keys(v, ['profile', 'divisions']) || !object(v.profile)
    || !keys(v.profile, ['id', 'version', 'pack', 'startingDivisionId']) || !text(v.profile.id)
    || !Number.isSafeInteger(v.profile.version) || (v.profile.version as number) < 1 || v.profile.pack !== context.pack
    || !text(v.profile.startingDivisionId) || !Array.isArray(v.divisions) || v.divisions.length === 0) return 'division world profile';
  const divisionIds = new Set<string>(); const instanceIds = new Set<string>(); const assigned = new Set<string>();
  for (const [rank, d] of v.divisions.entries()) {
    if (!object(d) || !keys(d, ['id', 'name', 'rank', 'ratingMean', 'instanceId']) || !text(d.id) || divisionIds.has(d.id)
      || !text(d.name) || d.rank !== rank || typeof d.ratingMean !== 'number' || !Number.isFinite(d.ratingMean)
      || d.ratingMean < 1 || d.ratingMean > 100 || !text(d.instanceId) || instanceIds.has(d.instanceId)) return 'division world metadata';
    divisionIds.add(d.id); instanceIds.add(d.instanceId);
    const instance = instances.find(i => i.id === d.instanceId);
    if (!instance || instance.season !== context.season || instance.definition.format.kind !== 'league') return 'division world instance';
    if (instance.definition.stages.some(stage => !stage.slotIds)) return 'division world schedule';
    if (instance.definition.stages.some(stage => stage.slotIds!.some(slot => context.slots[slot - 1]?.kind !== 'competition'))) return 'division world stage calendar';
    for (const id of instance.entrantIds) {
      if (assigned.has(id)) return 'division world membership';
      assigned.add(id);
    }
  }
  if (v.profile.startingDivisionId !== (v.divisions[0] as DivisionMetadata).id
    || assigned.size !== context.clubIds.length || context.clubIds.some(id => !assigned.has(id))) return 'division world coverage';
  return null;
}

export function divisionForClub(world: CompetitionWorldMetadata, instances: readonly CompetitionInstance[], clubId: string): { division: DivisionMetadata; instance: CompetitionInstance } | undefined {
  for (const division of world.divisions) {
    const instance = instances.find(i => i.id === division.instanceId);
    if (instance?.entrantIds.includes(clubId)) return { division, instance };
  }
  return undefined;
}
