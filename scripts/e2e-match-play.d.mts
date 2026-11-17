interface PollMatchPlayOptions<T> {
  probe(): Promise<T | null | false>;
  halfTimePending(): Promise<boolean>;
  continueHalfTime(): Promise<void>;
  finished(): Promise<boolean>;
  reopenTray?(): Promise<void>;
  wait(milliseconds: number): Promise<void>;
  timeoutMs: number;
  description: string;
  now?(): number;
}
export function pollMatchPlay<T>(options: PollMatchPlayOptions<T>): Promise<T>;
