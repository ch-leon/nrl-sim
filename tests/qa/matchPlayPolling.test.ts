import { describe, expect, it } from 'vitest';
import { pollMatchPlay } from '../../scripts/e2e-match-play.mjs';

function clock() {
  let elapsed = 0;
  return { now: () => elapsed, wait: async (ms: number) => { elapsed += ms; } };
}

describe('set-play harness waits across match phases', () => {
  it('continues a halftime reached while waiting and reopens the tray before requiring a callable play', async () => {
    const time = clock(); let pending = false; let continued = false; let tray = true; let probes = 0;
    const events: string[] = [];
    const result = await pollMatchPlay({ ...time, timeoutMs: 1000, description: 'an early-tackle set play',
      halfTimePending: async () => pending, finished: async () => false,
      continueHalfTime: async () => { events.push('continue'); pending = false; continued = true; },
      reopenTray: async () => { events.push('reopen'); tray = true; },
      probe: async () => {
        probes++;
        if (probes === 1) { pending = true; tray = false; return null; }
        if (continued && tray) { events.push('called'); return 'second-man'; }
        return null;
      },
    });
    expect(result).toBe('second-man');
    expect(probes).toBe(2);
    expect(events).toEqual(['continue', 'reopen', 'called']);
  });

  it('fails at full time instead of spending the four-minute possession timeout', async () => {
    const time = clock(); let probes = 0;
    await expect(pollMatchPlay({ ...time, timeoutMs: 240000, description: 'Your ball',
      halfTimePending: async () => false, continueHalfTime: async () => {},
      finished: async () => probes === 2, probe: async () => { probes++; return null; },
    })).rejects.toThrow('Match finished before Your ball');
    expect(probes).toBe(2);
    expect(time.now()).toBeLessThan(1000);
  });

  it('does not read a stale title while a halftime sheet is already open', async () => {
    const time = clock(); let pending = true; const events: string[] = [];
    const result = await pollMatchPlay({ ...time, timeoutMs: 1000, description: 'Their ball',
      halfTimePending: async () => pending, finished: async () => false,
      continueHalfTime: async () => { events.push('continue'); pending = false; },
      reopenTray: async () => { events.push('reopen'); },
      probe: async () => { events.push('read'); return true; },
    });
    expect(result).toBe(true);
    expect(events).toEqual(['continue', 'reopen', 'read']);
  });

  it('keeps a missing result a failure after Continue, with the original timeout bound', async () => {
    const time = clock(); let pending = true; let continued = 0;
    await expect(pollMatchPlay({ ...time, timeoutMs: 300, description: 'Second man result',
      halfTimePending: async () => pending, finished: async () => false,
      continueHalfTime: async () => { continued++; pending = false; }, probe: async () => null,
    })).rejects.toThrow('Timed out waiting for Second man result');
    expect(time.now()).toBe(300);
    expect(continued).toBe(1);
  });

  it('propagates a blocked Continue and does not manufacture a successful assertion', async () => {
    const time = clock();
    await expect(pollMatchPlay({ ...time, timeoutMs: 1000, description: 'Your ball',
      halfTimePending: async () => true, finished: async () => false,
      continueHalfTime: async () => { throw new Error('Continue covered'); }, probe: async () => true,
    })).rejects.toThrow('Continue covered');
  });
});
