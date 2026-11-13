// src/ui/playbookText.ts — the words for set plays on the club's screens (#326,
// phase 2): the Playbook, the Lineup's Plays sheet, the half-time card's line
// and the Guide. Every "needs IQ" is playFit's (match/league/plays.ts), read
// against today's nine as the Lineup has them, so the screens and the sim
// agree on who is short. Pure: no DOM.
import type { GameState } from '../core/state';
import { PLAYS_BY_ID, type Play, type PlayId } from '../data/plays';
import { playFit, PLAYS, type PlayMan } from '../match/league/plays';
import { PRESET_LABEL, type Zone } from '../match/league/presets';
import { LINEUP_SLOTS, resolveLineup, statsAt } from '../systems/lineup';

const surname = (name: string): string => name.trim().split(/\s+/).pop() ?? name;

/** Today's nine by slot as a play reads them (name, footy IQ as he plays the slot); an empty slot is a hole. */
export function todaysNine(state: Pick<GameState, 'lineup' | 'squad'>): PlayMan[] {
  const starters = resolveLineup(state.lineup, state.squad).starters;
  return LINEUP_SLOTS.map((pos, slot) => {
    const p = starters[slot];
    return p ? { name: p.name, footyIQ: statsAt(p, pos).footyIQ } : (undefined as unknown as PlayMan);
  });
}

/** "Needs: Smith 58/58 ✓ · Jones 49/52 ⚠": each of the play's men, his IQ against the need. */
export function playFitLine(play: Play, nine: readonly PlayMan[]): string {
  const fit = playFit(play, nine);
  return `Needs: ${fit.roles.map((r) => `${surname(r.name)} ${Math.round(r.iq)}/${r.need} ${r.short > 0 ? '⚠' : '✓'}`).join(' · ')}`;
}

/** The short read: "✓ IQ" when every need is met, else the man furthest short ("⚠ Jones 49/52"). */
export function playFitShort(play: Play, nine: readonly PlayMan[]): { ok: boolean; text: string } {
  const fit = playFit(play, nine);
  return fit.shortfall <= 0 ? { ok: true, text: '✓ IQ' } : { ok: false, text: `⚠ ${surname(fit.worst.name)} ${Math.round(fit.worst.iq)}/${fit.worst.need}` };
}

const ZONE_WORDS: Readonly<Record<Zone, string>> = {
  own20: 'your 20', ownHalf: 'your half', midfield: 'halfway', attackingHalf: 'their half', redZone: 'their 20',
};
const ZONE_ORDER: readonly Zone[] = ['own20', 'ownHalf', 'midfield', 'attackingHalf', 'redZone'];

const SIDE_WORDS: Readonly<Record<NonNullable<Play['when']['side']>, string>> = {
  open: 'to the open side', short: 'down the short side', near: 'to the near wing', overlap: 'where the overlap is',
};

/** When a play can be run, in one line: "Tackles 1–3 · your half to their half · to the open side". */
export function playWhenLine(play: Play): string {
  const w = play.when;
  const parts: string[] = [];
  const tap = play.from.includes('tap');
  if (tap && !play.from.includes('ptb')) parts.push('Off a tap');
  else if (tap) parts.push('Off a tap or the play-the-ball');
  if (w.tackles) parts.push(w.tackles[0] === w.tackles[1] ? `tackle ${w.tackles[0]}` : `tackles ${w.tackles[0]}–${w.tackles[1]}`);
  if (w.toLineM) parts.push(w.toLineM[0] <= 0 ? `inside ${w.toLineM[1]} m of their line` : `${w.toLineM[0]}–${w.toLineM[1]} m out`);
  if (w.zones) {
    const zs = ZONE_ORDER.filter((z) => w.zones!.includes(z));
    if (zs.length === 4 && !zs.includes('own20')) parts.push('anywhere but your 20');
    else if (zs.length === 1) parts.push(ZONE_WORDS[zs[0]!]);
    else if (zs.length > 1) parts.push(`${ZONE_WORDS[zs[0]!]} to ${ZONE_WORDS[zs[zs.length - 1]!]}`);
  }
  if (w.side) parts.push(SIDE_WORDS[w.side]);
  const line = parts.join(' · ');
  return line.charAt(0).toUpperCase() + line.slice(1);
}

/** The play's attack style in words ("Tight", "Expansive"): the side's preset it leans into. */
export function playStyleLabel(play: Play): string {
  return PRESET_LABEL[play.style];
}

/** The Lineup's button: "Plays: Block · Cut-out · —", a dash for each of the three not taken. */
export function playsButtonLabel(plays: readonly PlayId[]): string {
  const names = plays.slice(0, PLAYS.takeMax).map((id) => PLAYS_BY_ID[id]?.short ?? id);
  while (names.length < PLAYS.takeMax) names.push('—');
  return `Plays: ${names.join(' · ')}`;
}

/** The half-time card's read-only line: "Plays: Block play · Cut-out" (null with none taken). */
export function halfTimePlaysLine(plays: readonly PlayId[] | undefined): string | null {
  const names = (plays ?? []).flatMap((id) => (PLAYS_BY_ID[id] ? [PLAYS_BY_ID[id].short] : []));
  return names.length > 0 ? `Plays: ${names.join(' · ')}` : null;
}
