// tests/systems/rivalStyles.test.ts — rival styles from their squads (N11 item 3,
// docs/plans/N10-N12.md): rivalTactics reads the nine a rival fields instead of a
// hash of its id; the sheet it plays from and the screens say the same; the
// styles vary across a league.
import { describe, it, expect } from 'vitest';
import { RIVAL_STYLE, rivalTactics, type StyleEntry } from '../../src/match/league/presets';
import { createNewGame } from '../../src/core/state';
import { initLeague } from '../../src/systems/fixtures';
import { rivalSheet, rivalStyle } from '../../src/systems/rivalRound';
import { rivalMatchSheet } from '../../src/systems/matchday';

const SLOTS = ['fullback', 'winger', 'winger', 'centre', 'five-eighth', 'halfback', 'hooker', 'prop', 'second-row'] as const;
const BACKS = new Set(['fullback', 'winger', 'centre']);
const PACK = new Set(['hooker', 'prop', 'second-row']);

/** A flat nine at 60, with a few changes: backs' speed, the pack's strength, everyone's stamina, a trait on the halfback. */
function nine(o: { backsSpeed?: number; packStrength?: number; stamina?: number; halfTrait?: string } = {}): StyleEntry[] {
  return SLOTS.map((position) => ({
    position,
    stats: {
      speed: BACKS.has(position) ? (o.backsSpeed ?? 60) : 60,
      strength: PACK.has(position) ? (o.packStrength ?? 60) : 60,
      stamina: o.stamina ?? 60,
      skill: 60,
      footyIQ: 60,
    },
    ...(position === 'halfback' && o.halfTrait ? { traits: [{ id: o.halfTrait }] } : {}),
  }));
}
const club = (strength = 55) => ({ id: 'rival-x', strength });

describe('rival styles from their squads (N11)', () => {
  it('reads the nine: a kicking half, quick backs, a heavy pack, a contender, the rest', () => {
    expect(rivalTactics(club(), nine({ halfTrait: 'bigBoot', backsSpeed: 80 })).attack).toBe('kick-chase');
    expect(rivalTactics(club(), nine({ halfTrait: 'playmaker' })).attack).toBe('kick-chase');
    expect(rivalTactics(club(), nine({ backsSpeed: 70 })).attack).toBe('expansive');
    expect(rivalTactics(club(), nine({ packStrength: 70 })).attack).toBe('grind');
    expect(rivalTactics(club(RIVAL_STYLE.allOutFrom), nine()).attack).toBe('all-out');
    expect(rivalTactics(club(), nine())).toEqual({ attack: 'balanced', defence: 'slide' });
  });

  it('defends from the pack (Rush) or the line’s legs (Compressed), else slides', () => {
    expect(rivalTactics(club(), nine({ packStrength: 70 })).defence).toBe('rush');
    expect(rivalTactics(club(), nine({ stamina: 70 })).defence).toBe('compressed');
    expect(rivalTactics(club(), nine({ stamina: 60 })).defence).toBe('slide');
  });

  it('without a nine (a strength-built sheet) the style is the old one from identity', () => {
    expect(rivalTactics(club(), [])).toEqual(rivalTactics(club()));
  });

  it('the sheet a rival plays from carries its style, and the screens read the same', () => {
    const league = initLeague(createNewGame('X', 11));
    const rivals = league.clubs.filter((c) => c.id !== 'player');
    for (const c of rivals) {
      const sheet = rivalSheet(c);
      expect(sheet.tactics).toEqual(rivalTactics(c, sheet.roster));
      expect(rivalStyle(c)).toEqual(sheet.tactics);
    }
  });

  it('styles vary across a league', () => {
    const attacks = new Set<string>();
    const defences = new Set<string>();
    for (const seed of [1, 2, 3]) {
      for (const c of initLeague(createNewGame('X', seed)).clubs.filter((x) => x.id !== 'player')) {
        const t = rivalStyle(c);
        attacks.add(t.attack);
        defences.add(t.defence);
      }
    }
    expect(attacks.size).toBeGreaterThanOrEqual(4);
    expect(defences.size).toBe(3);
  });

  it('the player sees the style his opponent plays, squad-built or strength-built', () => {
    // Every difficulty plays the same sheet: the difficulty is the rival's edge after the spread (N12.2), not his sheet.
    const league = initLeague(createNewGame('X', 5));
    const rivals = league.clubs.filter((c) => c.id !== 'player');
    for (const c of rivals) {
      expect(rivalMatchSheet(c).tactics, c.id).toEqual(rivalStyle(c));
      // Short of a fit nine: the strength-built sheet, its style from the club's own strength.
      const crocked = { ...c, squad: (c.squad ?? []).map((p) => ({ ...p, injuredWeeks: 3 })) };
      expect(rivalMatchSheet(crocked).tactics, `${c.id} crocked`).toEqual(rivalStyle(crocked));
    }
    // A club near a tier line plays the style the screens show (Hard no longer scales his strength).
    const near = { ...rivals[0]!, strength: 60, squad: [] };
    expect(rivalMatchSheet(near).tactics).toEqual(rivalTactics(near));
  });
});

