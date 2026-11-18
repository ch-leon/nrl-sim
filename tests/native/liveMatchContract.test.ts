// tests/native/liveMatchContract.test.ts — the JSON the game sends to the LiveMatch plugin
// must decode as ios/App/Shared/MatchActivityAttributes.swift. On the phone a mismatch
// (a renamed field, a changed enum value) is a silent decode failure and no Live
// Activity, so a rename on either side fails here.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { TICKER_HALVES, TICKER_POSES, TICKER_SIDES, TICKER_STATES, startTicker } from '../../src/native/liveMatchTicker';

const SWIFT = readFileSync('ios/App/Shared/MatchActivityAttributes.swift', 'utf8');

/** The stored `var name:` fields in a block of Swift. */
const fields = (block: string): string[] => [...block.matchAll(/^\s*var (\w+)\s*:/gm)].map((m) => m[1]!);

/** A String enum's raw values: the case name, or its `= "raw"`. */
function rawValues(name: string): string[] {
  const m = new RegExp(`enum ${name}: String, Codable, Hashable \\{([\\s\\S]*?)\\}`).exec(SWIFT);
  if (!m) throw new Error(`no enum ${name}`);
  return [...m[1]!.matchAll(/case ([^\n]+)/g)]
    .flatMap((c) => c[1]!.split(','))
    .map((item) => {
      const raw = /=\s*"([^"]*)"/.exec(item);
      return raw ? raw[1]! : item.trim().replace(/`/g, '');
    });
}

const contentBlock = /struct ContentState: Codable, Hashable \{([\s\S]*?)\n {4}\}/.exec(SWIFT)?.[1] ?? '';
const attributesBlock = SWIFT.replace(/struct ContentState[\s\S]*?\n {4}\}/, '').replace(/enum \w+[\s\S]*?\n {4}\}/g, '');

const ticker = startTicker(
  { home: { clubId: 'h', name: 'Home Side', colors: ['#112233', '#ffffff'] }, away: { clubId: 'a', name: 'Away Side', colors: ['#445566', '#ffffff'] }, mine: 'home' },
  2.5,
)!;

describe('MatchActivityAttributes.swift and liveMatchTicker.ts', () => {
  it('ContentState has exactly the fields the game sends', () => {
    expect(contentBlock).not.toBe('');
    expect(fields(contentBlock).sort()).toEqual(Object.keys(ticker.content).sort());
  });

  it('the attributes have exactly the fields the game sends', () => {
    expect(fields(attributesBlock).sort()).toEqual(Object.keys(ticker.attributes).sort());
  });

  it('the enums take exactly the values the game sends', () => {
    expect(rawValues('MatchState')).toEqual([...TICKER_STATES]);
    expect(rawValues('Pose')).toEqual([...TICKER_POSES]);
    expect(rawValues('Half')).toEqual([...TICKER_HALVES]);
    expect(rawValues('Side')).toEqual([...TICKER_SIDES]);
  });

  it('the Swift field types decode the values (numbers as Int, the rest as String or an enum)', () => {
    const types = Object.fromEntries([...SWIFT.matchAll(/^\s*var (\w+)\s*:\s*(\w+)/gm)].map((m) => [m[1]!, m[2]!]));
    const want: Record<string, string> = { Int: 'number', String: 'string', Half: 'string', MatchState: 'string', Pose: 'string', Side: 'string' };
    for (const [name, value] of Object.entries({ ...ticker.content, ...ticker.attributes })) {
      expect(want[types[name]!], name).toBe(typeof value);
    }
  });
});
