import { describe, expect, it } from 'vitest';
import { reachLabsHintPossession, type LabsHintState } from '../../scripts/e2e-labs-hint.mjs';

const carry: LabsHintState = {
  mine: 'home', attacking: 'home', phase: 'play', holderSide: 'home',
  controlsAvailable: true, hintPresent: false, finished: false, halfTimePending: false,
  tick: 560, clock: { half: 1, seconds: 28 },
};
function harness(initial: LabsHintState) {
  let state = { ...initial }, elapsed = 0, skips = 0, continuations = 0;
  return {
    readState: async () => ({ ...state }), now: () => elapsed,
    wait: async (ms: number) => { elapsed += ms; },
    advanceOpponentSet: async () => { skips++; return true; },
    continueHalfTime: async () => { continuations++; state.halfTimePending = false; },
    set: (next: Partial<LabsHintState>) => { state = { ...state, ...next }; },
    counts: () => ({ skips, continuations }), timeoutMs: 500,
  };
}

describe('Labs hint possession witness', () => {
  it('advances the opponent set, then lets our ruck become a real playable carry', async () => {
    const h = harness({ ...carry, attacking: 'away', holderSide: null });
    const result = await reachLabsHintPossession({ ...h,
      advanceOpponentSet: async () => { h.set({ attacking: 'home', phase: 'ruck' }); return true; },
      wait: async (ms) => { await h.wait(ms); if (h.now() === 200) h.set({ phase: 'play', holderSide: 'home' }); },
    });
    expect(result).toMatchObject({ attacking: 'home', phase: 'play', holderSide: 'home' });
    expect(h.now()).toBe(200);
  });

  it('does not mistake our attack with no holder or an opposing holder for eligibility', async () => {
    const h = harness({ ...carry, holderSide: null });
    await expect(reachLabsHintPossession({ ...h,
      wait: async (ms) => { await h.wait(ms); h.set({ holderSide: 'away' }); },
    })).rejects.toThrow(/Timed out.*"holderSide":"away".*"seconds":28/);
    expect(h.counts().skips).toBe(0);
  });

  it('accepts an already displayed hint holding a genuine own-side carry', async () => {
    const h = harness({ ...carry, controlsAvailable: false, hintPresent: true });
    expect(await reachLabsHintPossession(h)).toMatchObject({ hintPresent: true });
    expect(h.now()).toBe(0);
  });

  it('does not manufacture a hint: a playable carry still needs the caller visible-hint assertion', async () => {
    const h = harness(carry);
    expect(await reachLabsHintPossession(h)).toMatchObject({ hintPresent: false });
  });

  it('fails immediately at full time with the last tick and clock', async () => {
    const h = harness({ ...carry, finished: true });
    await expect(reachLabsHintPossession(h)).rejects.toThrow(/Match finished.*"tick":560.*"seconds":28/);
    expect(h.now()).toBe(0);
    expect(h.counts().skips).toBe(0);
  });

  it('bounds opponent-set progress even when the requested possession never arrives', async () => {
    const h = harness({ ...carry, attacking: 'away', holderSide: 'away' });
    await expect(reachLabsHintPossession({ ...h, maxSetSkips: 2 })).rejects.toThrow(/Progress limit.*2 set skips.*"attacking":"away"/);
    expect(h.counts().skips).toBe(2);
  });

  it('times out stalled unavailable controls rather than skipping or declaring success', async () => {
    const h = harness({ ...carry, controlsAvailable: false });
    await expect(reachLabsHintPossession(h)).rejects.toThrow(/Timed out.*0 set skips.*"controlsAvailable":false/);
    expect(h.now()).toBe(500);
    expect(h.counts().skips).toBe(0);
  });

  it('continues normal halftime but still requires a subsequent playable carry', async () => {
    const h = harness({ ...carry, controlsAvailable: false, halfTimePending: true });
    await expect(reachLabsHintPossession(h)).rejects.toThrow('Timed out');
    expect(h.counts().continuations).toBe(1);
  });
});
