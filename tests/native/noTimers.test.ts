// tests/native/noTimers.test.ts — Leon's rules for the lock screen (docs/specs/ios.md §6):
// nothing timed or built on a real-time wait, and nothing that needs the paid account
// (push). The iPhone code may not use any construct that ticks by itself, ends on a
// clock, or asks for push.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function files(dir: string, ext: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'DerivedData' || name === 'public' || name === 'node_modules' || name.startsWith('.') ? [] : files(path, ext);
    return ext.test(name) ? [path] : [];
  });
}

const BANNED: [string, RegExp][] = [
  ['Text(timerInterval:)', /Text\(\s*timerInterval/],
  ['ProgressView(timerInterval:)', /ProgressView\(\s*timerInterval/],
  ['Text style .timer', /style:\s*\.timer/],
  ['Text style .relative', /style:\s*\.relative/],
  ['a stale date', /staleDate:(?!\s*nil\b)/],
  ['a timed dismissal .after(', /\.after\(/],
  ['push', /pushType:(?!\s*nil\b)/],
  ['the push entitlement', /aps-environment/],
  ['TimelineView', /TimelineView/],
  ['setInterval', /\bsetInterval\b/],
  ['setTimeout', /\bsetTimeout\b/],
  // The club widgets (Phase 5): one timeline entry that never refreshes by itself.
  ['a timeline that refreshes at its end (.atEnd)', /\.atEnd\b/],
  ['a Foundation Timer', /\bTimer\s*[.(]/],
  ['relative date text', /RelativeDateTimeFormatter|Text\([^)]*,\s*style:/],
  ['setInterval-like polling via requestAnimationFrame', /\brequestAnimationFrame\b/],
];

const SCANNED = [
  ...files('ios/App', /\.(swift|entitlements|plist)$/),
  ...files('src/native', /\.ts$/),
];

describe('no timers and no push in the iPhone code', () => {
  it("the club widget's only timeline is one entry with a .never policy", () => {
    const widget = readFileSync('ios/App/BigCoachWidgets/ClubWidget.swift', 'utf8');
    const policies = [...widget.matchAll(/policy:\s*\.(\w+)/g)].map((m) => m[1]);
    expect(policies).toEqual(['never']);
    expect(widget).toMatch(/Timeline\(entries: \[ClubEntry\([^\]]*\)\], policy: \.never\)/);
  });

  it('scans the Swift, the entitlements and plists, and src/native', () => {
    expect(SCANNED.some((f) => f.endsWith('MatchLiveActivity.swift'))).toBe(true);
    expect(SCANNED.some((f) => f.endsWith('LiveMatchPlugin.swift'))).toBe(true);
    expect(SCANNED.some((f) => f.endsWith('liveMatch.ts'))).toBe(true);
    for (const f of ['ClubWidget.swift', 'ClubWidgetsPlugin.swift', 'ClubSnapshot.swift', 'clubWidgets.ts', 'clubSnapshot.ts']) {
      expect(SCANNED.some((p) => p.endsWith(f)), f).toBe(true);
    }
  });

  for (const [what, pattern] of BANNED) {
    it(`uses no ${what}`, () => {
      const hits = SCANNED.filter((f) => pattern.test(readFileSync(f, 'utf8')));
      expect(hits).toEqual([]);
    });
  }
});
