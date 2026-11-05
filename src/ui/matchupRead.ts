// Readouts only: fixed team sheets and events; no sim state or saved fields.
import { derivedRatings, styleFit } from '../match/league/fit';
import { ATTACK_PRESETS, BACKS, HALVES, PACK, PRESET_LABEL, type AttackPreset, type DefencePreset, type TeamTactics } from '../match/league/presets';
import type { MatchEvent, RosterEntry } from '../sim/events';

export type Plan = AttackPreset | DefencePreset;
/** Equal half-point bands across fit's 0–1.5 range; neutral fit 1 earns two. */
export function fitStars(fit: number): number {
  return Math.max(0, Math.min(3, Math.floor(fit * 2)));
}
export function fitRead(roster: readonly RosterEntry[], plan: Plan): { stars: string; reason: string } {
  const fit = styleFit(roster)[plan];
  const roles = plan === 'grind' || plan === 'compressed' ? PACK
    : plan === 'expansive' || plan === 'slide' ? BACKS : plan === 'kick-chase' ? HALVES : null;
  const rating = (p: RosterEntry): number => {
    const r = derivedRatings(p);
    const s = p.stats;
    switch (plan) {
      case 'grind': return (r.carry + r.offload) / 2;
      case 'compressed': return r.contactD;
      case 'slide': return r.edgeD;
      case 'expansive': return ((s?.speed ?? 60) * 2 + r.footwork) / 3;
      case 'kick-chase': return (s?.skill ?? 60) + (p.traits?.some(t => t.id === 'bigBoot') ? 8 : 0);
      case 'rush': return ((s?.stamina ?? 60) + r.contactD) / 2;
      case 'all-out': return (r.offload + r.footwork + (s?.stamina ?? 60)) / 3;
      default: return s ? Object.values(s).reduce((a, b) => a + b, 0) / 5 : 60;
    }
  };
  const best = roster.filter(p => !roles || roles.includes(p.position)).map(p => ({ p, n: rating(p) })).sort((a,b) => b.n - a.n)[0];
  return { stars: '★'.repeat(fitStars(fit)) + '☆'.repeat(3 - fitStars(fit)),
    reason: best ? `${best.p.name.split(' ').slice(-1)[0]} ${Math.round(best.n)}` : 'No players' };
}

const MATRIX: Record<AttackPreset, Record<DefencePreset, number>> = {
  grind: { slide: 1, rush: 0, compressed: -1 }, balanced: { slide: 0, rush: 0, compressed: 0 },
  expansive: { slide: -1, rush: 0, compressed: 1 }, 'kick-chase': { slide: -1, rush: 1, compressed: 0 },
  'all-out': { slide: 1, rush: -1, compressed: 0 },
};
/** Matrix direction, qualified by both starting fits; never promises a win. */
export function matchupRead(yours: readonly RosterEntry[], theirs: readonly RosterEntry[], you: TeamTactics, them: TeamTactics): string {
  const a = styleFit(yours)[you.attack], d = styleFit(theirs)[them.defence];
  const cell = MATRIX[you.attack][them.defence];
  const read = cell === 0 || a === 0 || d === 0 ? 'even' : cell > 0 ? 'has room' : 'countered';
  const fit = a > d + 0.1 ? 'You fit better.' : d > a + 0.1 ? 'They fit better.' : 'Fits are close.';
  return `${PRESET_LABEL[you.attack]} v ${PRESET_LABEL[them.defence]}: ${read}. ${fit}`;
}
export function counterRead(yours: readonly RosterEntry[], defence: DefencePreset): string {
  return `Try ${ATTACK_PRESETS.filter(p => MATRIX[p][defence] > 0).map(p => `${PRESET_LABEL[p]} ${fitRead(yours, p).stars}`).join(' or ')}.`;
}

/** Half-time guide counts, not a prediction: more breaks/kicks and fewer errors.
 * Targets are deliberately simple style expectations, displayed with the counts. */
export function halfTimeNumbers(events: readonly MatchEvent[], teamId: string, attack: AttackPreset): { label: string; count: number; target: number; arrow: string }[] {
  const own = events.filter(e => e.teamId === teamId);
  return [
    { label: 'Breaks', kind: 'break', target: attack === 'expansive' || attack === 'all-out' ? 3 : 2, fewer: false },
    { label: 'Kicks', kind: 'kick', target: attack === 'kick-chase' ? 6 : 3, fewer: false },
    { label: 'Errors', kind: 'error', target: attack === 'all-out' ? 3 : 2, fewer: true },
  ].map(({ label, kind, target, fewer }) => {
    const count = own.filter(e => e.kind === kind).length;
    return { label, count, target, arrow: count === target ? '→' : (fewer ? count < target : count > target) ? '↑' : '↓' };
  });
}
