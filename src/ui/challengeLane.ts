// The dialog owns the lifetime of a viewport in the existing game canvas.
// Keeping Phaser at the scene binding lets the club screens open independently.
import type { Position } from '../core/state';
import type { ChallengeClash, ChallengeRole } from '../data/individualChallengeRules';

export interface ChallengeLane {
  element: HTMLElement;
  clubId: string;
  colors: readonly [string, string];
  playerId: string;
  position?: Position;
  opponentId: string;
  role: ChallengeRole;
  clash?: ChallengeClash;
  onFinish: () => void;
}
export interface LaneControls { pause(paused: boolean): void; close(): void }
let mount: ((options: ChallengeLane) => LaneControls) | null = null;
export function bindChallengeLane(factory: typeof mount): void { mount = factory; }
export function mountChallengeLane(options: ChallengeLane): LaneControls | null { return mount?.(options) ?? null; }
