import type { CompetitionInstance } from './competition';

export interface CompetitionCalendarSlot {
  id: number;
  kind: 'preseason' | 'competition' | 'rest';
}
/** Explicit structural playtest activation. No production entry or finance is enabled. */
export interface CompetitionCalendar {
  mode: 'structural';
  status: 'active' | 'awaiting-next-season';
  season: number;
  elapsedIntervals: number;
  slots: CompetitionCalendarSlot[];
}

const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown, min = 0): v is number => Number.isSafeInteger(v) && (v as number) >= min;

export function validateCompetitionCalendar(v: unknown, instances: readonly CompetitionInstance[], season: number, week?: number): string | null {
  if (!object(v) || Object.keys(v).some(k => !['mode', 'status', 'season', 'elapsedIntervals', 'slots'].includes(k))
    || v.mode !== 'structural' || (v.status !== 'active' && v.status !== 'awaiting-next-season')
    || !integer(v.season, 1) || !integer(v.elapsedIntervals) || !Array.isArray(v.slots) || v.slots.length === 0) return 'competition calendar';
  if (v.season !== (v.status === 'active' ? season : season - 1)) return 'competition calendar season';
  if (week !== undefined && (!integer(week, 1) || (v.status === 'active' ? week > v.slots.length : week !== 1))) return 'competition calendar cursor';
  for (const [index, slot] of v.slots.entries()) {
    if (!object(slot) || Object.keys(slot).some(k => k !== 'id' && k !== 'kind') || slot.id !== index + 1
      || !['preseason', 'competition', 'rest'].includes(String(slot.kind))) return 'competition calendar slots';
  }
  const currentInstances = instances.filter(i => i.season === v.season);
  if (!currentInstances.length) return 'competition calendar instances';
  for (const instance of currentInstances) {
    if (instance.definition.slotCount !== v.slots.length) return 'competition calendar snapshot bounds';
    for (const fixture of instance.fixtures) {
      if (fixture.slot === undefined || fixture.status === 'cancelled') continue;
      const slot = v.slots[fixture.slot - 1] as CompetitionCalendarSlot | undefined;
      if (!slot || slot.kind === 'rest') return 'competition fixture on rest slot';
      if (week !== undefined && v.status === 'active' && fixture.status === 'scheduled' && fixture.slot < week) return 'competition fixture in past slot';
      if (week !== undefined && v.status === 'active' && fixture.status === 'completed' && fixture.slot > week) return 'competition result in future slot';
    }
  }
  return null;
}
