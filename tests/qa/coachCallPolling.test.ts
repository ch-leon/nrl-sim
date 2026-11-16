import { describe, expect, it } from 'vitest';
import { pollCoachCall } from '../../scripts/e2e-coach-call.mjs';

const made = { call: 'hit-up', made: true, badge: 'Hit-up', lit: true };
describe('QA coach-call polling across half-time', () => {
  it('continues a half-time sheet that appears after the initial check, then requires a real call', async () => {
    let halfTime = false; let continued = 0; let attempts = 0;
    const events: string[] = [];
    const result = await pollCoachCall({
      halfTimePending: async () => { events.push('check'); return halfTime; },
      playHalfTime: async () => { events.push('continue'); continued++; halfTime = false; },
      attemptCall: async () => {
        events.push('call'); attempts++;
        // Reproduce QA: replay restores the half-time tick; its card appears
        // between the initial check and the first attempt at the coach tray.
        if (attempts === 1) { halfTime = true; return null; }
        return continued === 1 ? made : null;
      },
      wait: async () => { events.push('wait'); }, attempts: 3,
    });
    expect(result).toEqual({ call: made, empty: 1, refused: [] });
    expect(events).toEqual(['check', 'call', 'wait', 'check', 'continue', 'call']);
    expect(continued).toBe(1);
  });
  it('continues half-time already present before the first attempt', async () => {
    let pending = true; let continued = 0;
    const result = await pollCoachCall({ halfTimePending: async () => pending,
      playHalfTime: async () => { pending = false; continued++; }, attemptCall: async () => made, wait: async () => {} });
    expect(result.call).toEqual(made); expect(continued).toBe(1);
  });
  it('does not turn a permanently empty tray into a passing call or extend the attempt bound', async () => {
    let attempts = 0; const waits: number[] = [];
    const result = await pollCoachCall({ halfTimePending: async () => false,
      playHalfTime: async () => { throw new Error('unexpected'); }, attemptCall: async () => { attempts++; return null; },
      wait: async ms => { waits.push(ms); }, attempts: 3 });
    expect(result).toEqual({ call: null, empty: 3, refused: [] });
    expect(attempts).toBe(3); expect(waits).toEqual([250, 250, 250]);
  });
  it('retains refused attempts and propagates a broken half-time interaction', async () => {
    const result = await pollCoachCall({ halfTimePending: async () => false, playHalfTime: async () => {},
      attemptCall: async () => ({ ...made, made: false }), wait: async () => {}, attempts: 2 });
    expect(result).toEqual({ call: null, empty: 0, refused: ['hit-up', 'hit-up'] });
    await expect(pollCoachCall({ halfTimePending: async () => true,
      playHalfTime: async () => { throw new Error('Continue not tappable'); }, attemptCall: async () => made, wait: async () => {} })).rejects.toThrow('Continue not tappable');
  });
});
