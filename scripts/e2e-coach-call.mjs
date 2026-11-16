/** Poll an actual set call, handling half-time even if it appears after polling starts.
 * The game deliberately waits on that sheet; an empty tray there is not a defect.
 * Still fail at the caller if no genuine call lands within the bounded attempts. */
export async function pollCoachCall({ halfTimePending, playHalfTime, attemptCall, wait, attempts = 120 }) {
  let empty = 0;
  const refused = [];
  for (let i = 0; i < attempts; i++) {
    if (await halfTimePending()) await playHalfTime();
    const got = await attemptCall();
    if (got?.made) return { call: got, empty, refused };
    if (got) refused.push(got.call); else empty++;
    await wait(250);
  }
  return { call: null, empty, refused };
}
