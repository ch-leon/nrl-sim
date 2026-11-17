/** Keep set-play assertions live across the normal halftime hold. Never treat
 * continuation or full time as evidence that the requested condition occurred. */
export async function pollMatchPlay({ probe, halfTimePending, continueHalfTime, finished, reopenTray, wait, timeoutMs, description, now = Date.now }) {
  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    if (await finished()) throw new Error(`Match finished before ${description}`);
    if (await halfTimePending()) {
      await continueHalfTime();
      if (reopenTray) await reopenTray();
    }
    const result = await probe();
    if (result) return result;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${description}`);
}
