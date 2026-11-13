/** Physical lengths available in Experiments, in metres. */
export const FIELD_LENGTHS = [100, 80, 60] as const;
export type FieldLength = typeof FIELD_LENGTHS[number];
export const isFieldLength = (value: unknown): value is FieldLength => FIELD_LENGTHS.some(n => n === value);

/** Keep normal worker names intact; experimental workers freeze the page's choice. */
export function fieldWorkerName(name: string, length: FieldLength): string {
  return length === 100 ? name : `${name}--field-${length}`;
}
export function fieldFromWorkerName(name: unknown): FieldLength {
  if (typeof name !== 'string') return 100;
  const match = /^match-(?:skip|background|replay|art)--field-(80|60)$/.exec(name);
  return match ? Number(match[1]) as FieldLength : 100;
}
