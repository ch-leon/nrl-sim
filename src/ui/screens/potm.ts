// GitHub #46: the Player of the Match line. Shown at full time in the match
// report (matchReport.ts, N9.5), which took over the award's own card.
import type { PlayerOfMatch } from '../../systems/stats';

/** One-line stat summary, e.g. "2 tries · 14 tackles · 1 line break". */
export function fmtPotmLine(p: PlayerOfMatch): string {
  const n = (v: number, one: string, many: string) => `${v} ${v === 1 ? one : many}`;
  return [n(p.tries, 'try', 'tries'), n(p.tackles, 'tackle', 'tackles'), n(p.lineBreaks, 'line break', 'line breaks')].join(' · ');
}
