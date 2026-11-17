export interface LabsHintState {
  mine: string | null;
  attacking: string | null;
  phase: string | null;
  holderSide: string | null;
  controlsAvailable: boolean;
  hintPresent: boolean;
  finished: boolean;
  halfTimePending: boolean;
  tick: number | null;
  clock: { half: number; seconds: number } | null;
}
interface LabsHintOptions {
  readState(): Promise<LabsHintState>;
  advanceOpponentSet(): Promise<boolean>;
  continueHalfTime(): Promise<void>;
  wait(milliseconds: number): Promise<void>;
  timeoutMs: number;
  maxSetSkips?: number;
  now?(): number;
}
export function reachLabsHintPossession(options: LabsHintOptions): Promise<LabsHintState>;
