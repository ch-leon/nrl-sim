import type { TouchJudgePose } from '../../art/match/touchJudge';
import type { Snapshot } from '../core/snapshot';
import type { Vec } from '../core/vec';
import { CONVERSION_SIGNAL_TICKS, touchJudgeSpots } from '../league/live/touchJudges';

export { CONVERSION_SIGNAL_TICKS, TOUCH_JUDGE_FADE_TICKS } from '../league/live/touchJudges';
const FLAG_LIFT_TICKS = 3;
const JUDGE_EXIT_TICKS = 5;
// Two complete sweeps. Give each end of the gesture a beat, then lower the flag.
const MISS_WAVE: readonly TouchJudgePose[] = [
  'waveOut', 'waveOut', 'waveOut',
  'waveMidOut', 'waveAcross', 'waveMidIn', 'waveIn', 'waveIn',
  'waveMidIn', 'waveAcross', 'waveMidOut', 'waveOut', 'waveOut',
  'waveMidOut', 'waveAcross', 'waveMidIn', 'waveIn', 'waveIn',
  'waveMidIn', 'waveAcross', 'waveMidOut', 'waveOut', 'waveOut',
];

export function conversionJudges(s: Snapshot, heldTicks = 0): { feet: [Vec, Vec]; lookAt: Vec; pose: TouchJudgePose; alpha: number } | null {
  const cue = s.conversion;
  if (!cue) return null;
  const age = cue.decision ? s.tick - cue.decision.tick + heldTicks : 0;
  if (age >= CONVERSION_SIGNAL_TICKS) return null;
  const feet = touchJudgeSpots(cue.toward);
  const alpha = Math.min(1, (CONVERSION_SIGNAL_TICKS - age) / JUDGE_EXIT_TICKS);
  let pose: TouchJudgePose = s.ball.flight?.via === 'kick' ? 'watch' : 'ready';
  if (cue.decision) {
    pose = cue.decision.good ? (age < FLAG_LIFT_TICKS ? 'raise' : 'up') : MISS_WAVE[Math.floor(age)] ?? 'ready';
  }
  return { feet, lookAt: cue.spot, pose, alpha };
}
