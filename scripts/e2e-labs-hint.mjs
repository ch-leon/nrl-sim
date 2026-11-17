/** Advance real opponent sets, never our playable carry. The caller must still
 * assert the production hint is visible: reaching eligibility is not that proof. */
export async function reachLabsHintPossession({ readState, advanceOpponentSet, continueHalfTime, wait, timeoutMs, maxSetSkips = 8, now = Date.now }) {
  const started = now(), deadline = started + timeoutMs;
  let state = null, setSkips = 0;
  const failure = (reason) => new Error(`${reason} before Labs hint possession (${now() - started}ms, ${setSkips} set skips); last state: ${JSON.stringify(state)}`);
  while (now() < deadline) {
    state = await readState();
    if (state.finished) throw failure('Match finished');
    if (state.halfTimePending) await continueHalfTime();
    else if (state.mine && state.attacking === state.mine && state.phase === 'play' && state.holderSide === state.mine && (state.controlsAvailable || state.hintPresent)) return state;
    else if (state.mine && state.controlsAvailable && state.attacking !== state.mine) {
      if (setSkips >= maxSetSkips) throw failure('Progress limit reached');
      // Recheck in the browser task that advances: possession can change after readState.
      if (await advanceOpponentSet()) setSkips++;
    }
    await wait(100);
  }
  throw failure('Timed out');
}
