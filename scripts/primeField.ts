// Freeze the headless field before any match module imports.
// Node reads FIELD_LENGTH from the worker name (src/labs/fieldLength.ts).
// NRL_SOAK_FIELD=80 or 60 uses that existing name; 100 and anything else stay on the normal field.
const raw = process.env.NRL_SOAK_FIELD;
if (raw === '80' || raw === '60') {
  const g = globalThis as { name?: string };
  if (!g.name?.includes('--field-')) g.name = `match-skip--field-${raw}`;
}
