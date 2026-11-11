// A repeatable, scrub-able art rehearsal. Both views consume exactly this state.
// It deliberately has no career state or match outcome logic.
import type { Action, Facing } from '../../art/prototype/player';
import { TACKLE_FPS, TACKLE_START, TACKLE_PTB } from '../../art/prototype/tackle';

export const DURATION = 10;
export const BEATS = [
  { at: 0, label: 'Carry' }, { at: 2, label: 'Pass' }, { at: 3.15, label: 'Catch' },
  { at: 3.35, label: 'Accelerate' }, { at: 5.5, label: 'Plant' }, { at: 5.7, label: 'Contact' },
  { at: 5.95, label: 'Wrap' }, { at: 6.25, label: 'Drive' }, { at: 6.7, label: 'Fall' },
  { at: 7.15, label: 'Ground' }, { at: 7.65, label: 'Release' }, { at: 8.3, label: 'Play-the-ball' },
] as const;
export interface ArtActor {
  id: string; x: number; y: number; action: Action; frame: number;
  facing: Facing; left: boolean; side: 'home' | 'away'; possession: boolean;
}
export interface ArtMoment { actors: ArtActor[]; ball: { x: number; y: number } | null; beat: string; tackleFrame?: number }
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp(t);

export function momentAt(seconds: number, lane = 0): ArtMoment {
  const t = Math.max(0, Math.min(DURATION, seconds));
  const cycle = Math.floor(t * 12) % 6;
  const carrier: ArtActor = { id: 'p-art-9', x: lerp(.18, .35, t / 2), y: .54 + lane, action: 'carry', frame: cycle, facing: 'front', left: false, side: 'home', possession: t < 2.55 };
  const runner: ArtActor = { id: 'p-art-4', x: lerp(.29, .65, t / 5.7), y: .74 + lane, action: 'run', frame: (cycle + 2) % 6, facing: 'front', left: false, side: 'home', possession: t >= 3.15 };
  const tackler: ArtActor = { id: 'p-art-11', x: lerp(.83, .72, t / 5.7), y: lerp(.59, .725, t / 5.7) + lane, action: 'run', frame: (cycle + 3) % 6, facing: 'back', left: true, side: 'away', possession: false };
  if (t >= 2) carrier.action = t < 3 ? 'pass' : 'idle';
  if (t >= 2 && t < 3) carrier.frame = Math.min(5, Math.floor((t - 2) * 6));
  if (t >= 2.95 && t < 3.35) runner.action = 'catch';
  if (t >= 3.35) runner.action = 'carry';
  if (t >= 5.7) { runner.action = 'brace'; tackler.action = 'wrap'; tackler.x = .72; }
  if (t >= 6.25) { runner.x = lerp(.65, .58, (t - 6.25) / .9); tackler.x = runner.x + .07; }
  if (t >= 7.15) { runner.action = 'ground'; tackler.action = 'ground'; tackler.y = .725 + lane; }
  if (t >= TACKLE_PTB) {
    runner.action = 'ptb'; runner.frame = Math.min(5, Math.floor((t - TACKLE_PTB) * 3.5));
    tackler.action = 'idle'; tackler.x = .78;
    tackler.y = .62 + lane;
  }
  let ball: ArtMoment['ball'] = null;
  if (t >= 2.55 && t < 3.15) {
    const u = (t - 2.55) / .6;
    ball = { x: lerp(carrier.x + .045, runner.x + .045, u), y: lerp(carrier.y, runner.y, u) - Math.sin(u * Math.PI) * .1 };
  }
  const support: ArtActor[] = [
    { id: 'p-art-7', x: .16, y: .81, action: 'idle', frame: 0, facing: 'front', left: false, side: 'home', possession: false },
    { id: 'p-art-2', x: .45, y: .30, action: 'idle', frame: 0, facing: 'back', left: false, side: 'home', possession: false },
    { id: 'p-art-5', x: .75, y: .35, action: 'idle', frame: 0, facing: 'front', left: true, side: 'away', possession: false },
  ];
  return { actors: [...support, carrier, runner, tackler], ball, beat: [...BEATS].reverse().find(b => t >= b.at)!.label,
    ...(t >= TACKLE_START ? { tackleFrame: Math.floor((t - TACKLE_START) * TACKLE_FPS + 1e-8) } : {}),
  };
}
