import { describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from '../../src/core/events';

describe('EventEmitter', () => {
  let bus: EventEmitter;
  beforeEach(() => {
    bus = new EventEmitter();
  });

  it('delivers emitted payloads to subscribers', () => {
    const received: number[] = [];
    bus.on('week:advanced', (p) => received.push(p.week));
    bus.emit('week:advanced', { week: 3, season: 1 });
    expect(received).toEqual([3]);
  });

  it('on returns a working unsubscribe closure', () => {
    const received: number[] = [];
    const off = bus.on('week:advanced', (p) => received.push(p.week));
    bus.emit('week:advanced', { week: 1, season: 1 });
    off();
    bus.emit('week:advanced', { week: 2, season: 1 });
    expect(received).toEqual([1]);
  });

  it('off removes a specific handler', () => {
    const a: number[] = [];
    const b: number[] = [];
    const ha = (p: { week: number }) => a.push(p.week);
    const hb = (p: { week: number }) => b.push(p.week);
    bus.on('week:advanced', ha);
    bus.on('week:advanced', hb);
    bus.off('week:advanced', ha);
    bus.emit('week:advanced', { week: 5, season: 1 });
    expect(a).toEqual([]);
    expect(b).toEqual([5]);
  });

  it('tolerates a handler that off()s itself mid-dispatch', () => {
    const order: string[] = [];
    const selfOff = () => {
      order.push('self');
      bus.off('ui:notify', selfOff);
    };
    bus.on('ui:notify', selfOff);
    bus.on('ui:notify', () => order.push('other'));
    // First emit: both fire, selfOff removes itself.
    bus.emit('ui:notify', { text: 'x', kind: 'info' });
    // Second emit: only 'other' remains.
    bus.emit('ui:notify', { text: 'y', kind: 'info' });
    expect(order).toEqual(['self', 'other', 'other']);
  });

  it('emit with no listeners is a no-op', () => {
    expect(() => bus.emit('bankruptcy:warning', { balance: 0 })).not.toThrow();
  });

  it('clear removes all listeners', () => {
    const received: number[] = [];
    bus.on('week:advanced', (p) => received.push(p.week));
    bus.clear();
    bus.emit('week:advanced', { week: 9, season: 1 });
    expect(received).toEqual([]);
  });
});
