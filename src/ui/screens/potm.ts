// GitHub #46: the Player of the Match line. Shown at full time on the full-time
// card and in the match report (matchReport.ts, N9.5), which took over the award's own card.
import type { PlayerOfMatch } from '../../systems/stats';

const n = (v: number, one: string, many: string): string => `${v} ${v === 1 ? one : many}`;

/** One-line stat summary, e.g. "2 tries · 14 tackles · 1 line break". */
export function fmtPotmLine(p: PlayerOfMatch): string {
  return [n(p.tries, 'try', 'tries'), n(p.tackles, 'tackle', 'tackles'), n(p.lineBreaks, 'line break', 'line breaks')].join(' · ');
}

/** The full-time card's shorter line (3s): what he did, the noughts left out ("1 try, 31 tackles"). */
export function fmtPotmShort(p: PlayerOfMatch): string {
  const parts = [p.tries ? n(p.tries, 'try', 'tries') : '', p.tackles ? n(p.tackles, 'tackle', 'tackles') : '', p.lineBreaks ? n(p.lineBreaks, 'line break', 'line breaks') : ''].filter(Boolean);
  return parts.length ? parts.join(', ') : n(p.tackles, 'tackle', 'tackles');
}
