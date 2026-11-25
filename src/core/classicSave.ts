// A Classic career is the old single 16-club season. League career is the only
// mode (#819). This predicate is pure: it never migrates, never touches storage
// and never throws, so a Classic save can be recognised before anything tries to
// load it.
//
// Classic: a save object (it has a numeric version) with no competitions.leagueCareer,
// whose competitions calendar is not a League career calendar. A League career
// calendar is the structural calendar (mode 'structural') shared by a League
// career and an isolated developer prototype. Those stay where they are. Anything
// that is not a save object (corrupt text, a future shape we cannot even parse)
// is not Classic: the existing corrupt / future handling keeps it.

const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

function asSave(raw: unknown): Record<string, unknown> | null {
  let value = raw;
  if (typeof raw === 'string') {
    try { value = JSON.parse(raw) as unknown; }
    catch { return null; }
  }
  return record(value) ? value : null;
}

/** The structural calendar a League career (and an isolated developer prototype) plays. */
export function isLeagueCareerCalendar(competitions: unknown): boolean {
  if (!record(competitions)) return false;
  const calendar = competitions.calendar;
  return record(calendar) && calendar.mode === 'structural';
}

/** True when the payload is a Classic career save. Never throws. */
export function isClassicSave(raw: unknown): boolean {
  const save = asSave(raw);
  if (!save || typeof save.version !== 'number') return false;
  const competitions = save.competitions;
  if (record(competitions) && competitions.leagueCareer != null) return false;
  if (isLeagueCareerCalendar(competitions)) return false;
  return true;
}

/** The one-time line a retired Classic career shows. */
export const CLASSIC_RETIRED_TEXT = 'Classic mode has been retired. Start a new League career.';
