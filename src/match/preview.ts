/** Build-only experimental rules. Omitted in normal builds and shared with Workers. */
export interface MatchPreview {
  fieldLength: 100 | 80 | 60;
  halfMinutes: 2.5;
}

export function resolveMatchPreview(raw: string | undefined): MatchPreview | null {
  if (!raw) return null;
  if (raw !== '100' && raw !== '80' && raw !== '60') throw new Error('NRL_MATCH_PREVIEW_LENGTH must be 100, 80 or 60');
  return { fieldLength: Number(raw) as MatchPreview['fieldLength'], halfMinutes: 2.5 };
}

declare const __NRL_MATCH_PREVIEW__: MatchPreview | null | undefined;
export const MATCH_PREVIEW: MatchPreview | null = typeof __NRL_MATCH_PREVIEW__ === 'undefined' ? null : __NRL_MATCH_PREVIEW__ ?? null;

/** Actual viewing time; seeking or changing speed makes the sample unsuitable for comparison. */
export class PreviewWatchClock {
  readonly milliseconds = [0, 0];
  clean = true;
  advance(ms: number, half: number, speed: number, phase: string, playing: boolean): void {
    if (!playing || phase === 'half-time' || phase === 'full-time' || half < 1 || half > 2) return;
    if (speed !== 1) this.clean = false;
    this.milliseconds[half - 1]! += Math.max(0, ms);
  }
  invalidate(): void { this.clean = false; }
  reset(): void { this.milliseconds.fill(0); this.clean = true; }
}
