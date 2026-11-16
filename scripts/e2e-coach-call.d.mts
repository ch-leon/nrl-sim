interface CallAttempt { call: string; made: boolean; badge: string; lit: boolean }
interface PollOptions {
  halfTimePending(): Promise<boolean>;
  playHalfTime(): Promise<void>;
  attemptCall(): Promise<CallAttempt | null>;
  wait(milliseconds: number): Promise<void>;
  attempts?: number;
}
export function pollCoachCall(options: PollOptions): Promise<{ call: CallAttempt | null; empty: number; refused: string[] }>;
