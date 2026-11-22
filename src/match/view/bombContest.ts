import { BOMB_RECOVERY_TICKS, BOMB_TAKEOFF_LEAD, type BombContestSnap, type PlayerSnap, type Snapshot } from '../core/snapshot';

export function bombPlayer(contest: BombContestSnap | undefined, player: PlayerSnap) {
  return contest?.players.find(p => p.side === player.side && p.slot === player.slot && p.who === player.who);
}

/** Feet clear of the turf, in world pixels per tick, from takeoff through the landing. */
const JUMP_LIFT = [5, 10, 12, 12, 8, 3, 0];
const ABORT_LAND_TICKS = 3;

export function bombPose(contest: BombContestSnap, tick: number, chaser: boolean, possession: boolean): { frame: number; lift: number } | undefined {
  const age = tick - contest.arrivesTick;
  if (tick < contest.plantTick || age > BOMB_RECOVERY_TICKS) return undefined;
  const released = contest.releasedTick;
  if (released !== undefined && tick >= released) {
    const since = tick - released + 1;
    const lastLift = released - 1 === contest.plantTick ? 0 : JUMP_LIFT[released - 1 - contest.arrivesTick + BOMB_TAKEOFF_LEAD] ?? 0;
    return { frame: since < ABORT_LAND_TICKS ? 3 : since === ABORT_LAND_TICKS ? 4 : 5, lift: lastLift * Math.max(0, 1 - since / ABORT_LAND_TICKS) };
  }
  if (tick === contest.plantTick || age < -BOMB_TAKEOFF_LEAD) return { frame: 0, lift: 0 };
  const frame = age < 0 ? chaser || age === -BOMB_TAKEOFF_LEAD ? 1 : 2
    : age === 0 && possession ? 2 : age < 3 ? 3 : age < BOMB_RECOVERY_TICKS ? 4 : 5;
  return { frame, lift: JUMP_LIFT[age + BOMB_TAKEOFF_LEAD] ?? 0 };
}

/** The last part of a visually contested flight meets the overhead reach. A spill then falls onto its real bounce. */
export function bombBallLift(s: Snapshot): number {
  const c = s.bombContest;
  const b = s.ball;
  if (!c || !b.flight) return b.lift;
  const age = s.tick - c.arrivesTick;
  const approach = b.flight.via === 'kick' && b.flight.arrivesTick === c.arrivesTick;
  const bounce = b.flight.via === 'bounce' && b.flight.startedTick === c.arrivesTick;
  if (!approach && !bounce) return b.lift;
  const reachM = 3.5;
  const fallTicks = 4;
  const lift = approach ? reachM - age * .12 : reachM * Math.max(0, 1 - age / fallTicks);
  const factor = c.releasedTick === undefined ? 1 : Math.max(0, 1 - (s.tick - c.releasedTick + 1) / fallTicks);
  return Math.max(b.lift, lift * factor);
}
