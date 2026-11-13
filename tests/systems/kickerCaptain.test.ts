// tests/systems/kickerCaptain.test.ts — the goal-kicker and the captain (N11 item 4,
// docs/plans/N10-N12.md): the coach names them on the Lineup screen (save v15),
// the sheet carries them (defaults: the best-kicking half, the smartest starter),
// the kicker takes the conversions, penalty goals and field goals, and the
// captain's Footy IQ and Hothead move the penalty call. A sheet that names
// neither plays exactly as before.
import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/state';
import { migrateState } from '../../src/core/save';
import { autoPick, resolveLineup, setCaptain, setKicker } from '../../src/systems/lineup';
import { kickerAndCaptain, teamSheetFromSquad } from '../../src/match/league/sheets';
import { runMatch } from '../../src/match/league/match';
import { LiveSim } from '../../src/match/league/live';
import { GOALS } from '../../src/match/league/goals';
import { sideSheet } from '../../src/match/balance/measure';
import { NEUTRAL_CAPTAIN, PENALTY, choosePenalty, type PenaltySituation } from '../../src/match/league/penalties';
import type { Player } from '../../src/core/state';
import type { TeamSheet } from '../../src/sim/events';

const game = () => createNewGame('Kick FC', 21);

function man(id: string, position: Player['position'], stats: Partial<Player['stats']>): Player {
  const p = game().squad[0]!;
  return { ...p, id, name: id, position, stats: { speed: 50, strength: 50, stamina: 50, handling: 50, kicking: 50, footyIQ: 50, ...stats } };
}

/** A flat sheet whose nine carry ids, so it can name a kicker and a captain. */
function named(id: string, over: (i: number) => Partial<NonNullable<TeamSheet['roster']>[number]> = () => ({})): TeamSheet {
  const s = sideSheet(id, { rating: 60 });
  return { ...s, roster: s.roster!.map((e, i) => ({ ...e, id: `${id}${i}`, ...over(i) })) };
}

describe('the goal-kicker and the captain (N11)', () => {
  it('defaults: the half with the best Kicking kicks, the best Footy IQ captains; the coach’s picks win when in the nine', () => {
    const nine = [
      man('fb', 'fullback', { handling: 20, kicking: 90, footyIQ: 40 }),
      man('fe', 'five-eighth', { kicking: 70 }),
      man('hb', 'halfback', { kicking: 75 }),
      man('pr', 'prop', { footyIQ: 85 }),
    ];
    expect(kickerAndCaptain(nine)).toEqual({ kicker: 'hb', captain: 'pr' });
    expect(kickerAndCaptain(nine, { kicker: 'fb', captain: 'fe' })).toEqual({ kicker: 'fb', captain: 'fe' });
    expect(kickerAndCaptain(nine, { kicker: 'gone', captain: null })).toEqual({ kicker: 'hb', captain: 'pr' });
    // No half in the nine: the best Kicking anywhere.
    expect(kickerAndCaptain(nine.filter((p) => p.position !== 'five-eighth' && p.position !== 'halfback')).kicker).toBe('fb');
  });

  it('the lineup keeps the picks (tap again for the default); the sheet carries them; old saves require a new career', () => {
    const s = game();
    const lineup = autoPick(s.squad);
    expect(lineup.kicker).toBeNull();
    const wing = lineup.starters[1]!;
    const picked = setCaptain(setKicker(lineup, wing), wing);
    expect(picked).toMatchObject({ kicker: wing, captain: wing });
    expect(setKicker(picked, wing).kicker).toBeNull();
    const day = resolveLineup(picked, s.squad);
    expect(day.changed).toBe(false);
    const sheet = teamSheetFromSquad(s.squad, 'player', 'Kick FC', ['#111', '#eee'], day);
    expect(sheet).toMatchObject({ kicker: wing, captain: wing });
    // A man who has left the club goes back to the default.
    expect(resolveLineup(picked, s.squad.filter((p) => p.id !== wing)).lineup.kicker).toBeNull();
    const { kicker: _k, captain: _c, ...v14Lineup } = s.lineup;
    void _k;
    void _c;
    const res = migrateState({ ...s, version: 14, lineup: v14Lineup as never });
    expect(res).toMatchObject({ ok: false, message: expect.stringMatching(/start a new career/i) });
  });

  it('a sheet naming the slot-5 kicker and a neutral captain plays exactly as one naming neither', () => {
    const away = sideSheet('A', { rating: 60 });
    const plain = named('H');
    // The kicker role is slot 5 (KICKER, the halfback); a flat 60 captain is neutral.
    const neutral: TeamSheet = { ...plain, kicker: plain.roster![5]!.id!, captain: plain.roster![0]!.id! };
    expect(runMatch(neutral, away, { seed: 3 })).toEqual(runMatch(plain, away, { seed: 3 }));
  }, 60_000);

  it('the named kicker takes the goal kicks while he is on, and his Kicking moves the conversion rate (80 seeds)', () => {
    // 80 seeds since the weighted receiver (#649) reshuffled every match: over seeds 1–40 the
    // 2:30 halves left about 40 kicks a side and a gap of 0.08 by luck; over 1–80 it is 0.71 v 0.54.
    const away = sideSheet('A', { rating: 60 });
    // The fullback (slot 0) kicks; his Kicking is the only thing that differs.
    const withKicker = (kicking: number): TeamSheet => {
      const s = named('H', (i) => (i === 0 ? { stats: { speed: 60, strength: 60, stamina: 60, handling: 60, kicking, footyIQ: 60 } } : {}));
      return { ...s, kicker: s.roster![0]!.id! };
    };
    const rate = (kicking: number): { made: number; tried: number; byKicker: number } => {
      const sheet = withKicker(kicking);
      let made = 0;
      let tried = 0;
      let byKicker = 0;
      for (let seed = 1; seed <= 80; seed++) {
        for (const e of runMatch(sheet, away, { seed }).events) {
          if (e.teamId !== sheet.clubId || (e.kind !== 'conversion' && e.kind !== 'penalty-goal')) continue;
          tried++;
          if (e.detail === 'good') made++;
          if (e.player === sheet.roster![0]!.name) byKicker++;
        }
      }
      return { made, tried, byKicker };
    };
    const good = rate(95);
    const poor = rate(25);
    // Nearly all: when the interchange has him off the field, the slot-5 kicker takes it.
    expect(good.byKicker).toBeGreaterThanOrEqual(good.tried * 0.95);
    expect(good.tried).toBeGreaterThan(30);
    expect(good.made / good.tried).toBeGreaterThan(poor.made / poor.tried + 0.1);
  }, 240_000);

  it('kicks in play stay with the slot-5 kicker when another man is named; field goals still come', () => {
    const away = sideSheet('A', { rating: 60 });
    const plain = named('H');
    const fullbackKicks = { ...plain, kicker: plain.roster![0]!.id! };
    const count = (sheet: TeamSheet): { inPlay: number; byFullback: number } => {
      let inPlay = 0;
      let byFullback = 0;
      for (let seed = 1; seed <= 20; seed++) {
        for (const e of runMatch(sheet, away, { seed }).events) {
          if (e.teamId !== sheet.clubId) continue;
          if (e.kind === 'kick') {
            inPlay++;
            if (e.player === sheet.roster![0]!.name) byFullback++;
          }
        }
      }
      return { inPlay, byFullback };
    };
    const before = count(plain);
    const after = count(fullbackKicks);
    // The fullback kicks in play no more than he did unnamed (a scramble now and then), and the side kicks as much.
    expect(after.byFullback).toBeLessThanOrEqual(before.byFullback + 2);
    expect(after.inPlay).toBeGreaterThan(before.inPlay * 0.8);
    // Naming a goal-kicker changes conversions and the late score-margin gate,
    // so rare whole-match field-goal counts cannot isolate role eligibility.
    class GoalRoleSim extends LiveSim {
      attempt(slot: number) {
        this.tick = 100; this.attacking = 'home'; this.dir = 1; this.ends = 1;
        this.phase = { kind: 'play' };
        this.clockTicks = (this.length.halfMinutes * 60 - 60) * 20;
        this.tackles = GOALS.fieldGoalFromTackle;
        for (const p of this.players) {
          p.body.pos = { x: p.side === 'home' ? 40 : 95, y: 5 + p.slot * 7 };
          p.body.vel = { x: 0, y: 0 };
          p.lockUntil = 0; p.busyUntil = 0; p.cooldownUntil = 0;
        }
        const carrier = this.players[slot]!;
        carrier.body.pos = { x: 80, y: 34 };
        carrier.catchTick = 0; carrier.decided = false;
        this.ball = { kind: 'held', by: slot };
        this.rng.next = () => 0.5; // attempt it, avoid the charge-down; same roll for each role
        this.stepPlay();
        const planned = this.pendingGoal;
        if (planned) {
          this.tick = planned.at;
          this.launchGoal();
          this.resolveGoal();
        }
        return this.tickEvents.filter(e => e.kind === 'drop-goal' || e.kind === 'field-goal');
      }
    }
    const attempt = (sheet: TeamSheet, slot: number) =>
      new GoalRoleSim(sheet, away, 1, { length: { halves: 1, halfMinutes: 7 } }).attempt(slot);
    // Both the live slot-5 kicker and a named goal-kicker can drop for goal;
    // naming the fullback never transfers an in-play halfback's ball to him.
    for (const sheet of [plain, fullbackKicks]) {
      expect(attempt(sheet, 5)).toMatchObject([
        { kind: 'drop-goal', slot: 5, player: plain.roster![5]!.name },
        { kind: 'field-goal', slot: 5, player: plain.roster![5]!.name },
      ]);
    }
    expect(attempt(fullbackKicks, 0)).toMatchObject([
      { kind: 'drop-goal', slot: 0, player: plain.roster![0]!.name },
      { kind: 'field-goal', slot: 0, player: plain.roster![0]!.name },
    ]);
    expect(attempt(plain, 0)).toEqual([]);
  }, 240_000);

  it('the captain’s Footy IQ and Hothead move the penalty call', () => {
    const late: PenaltySituation = { shotChance: PENALTY.shotMin - 0.05, toLine: 30, matchLeftS: 100, halfLeftS: 100, siren: false, margin: 0 };
    expect(choosePenalty(late)).toBe('touch');
    expect(choosePenalty({ ...late, captain: NEUTRAL_CAPTAIN })).toBe('touch');
    expect(choosePenalty({ ...late, captain: { footyIQ: 90, hothead: 0 } })).toBe('goal');
    expect(choosePenalty({ ...late, shotChance: PENALTY.shotMin + 0.05, captain: { footyIQ: 30, hothead: 0 } })).toBe('touch');
    // Out of range for the shot: a Hothead taps from 30 m where a cool head kicks for touch.
    const out: PenaltySituation = { ...late, shotChance: 0.1 };
    expect(choosePenalty({ ...out, captain: { footyIQ: 60, hothead: 0 } })).toBe('touch');
    expect(choosePenalty({ ...out, captain: { footyIQ: 60, hothead: 1 } })).toBe('tap');
  });
});
