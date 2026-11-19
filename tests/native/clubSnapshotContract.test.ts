// tests/native/clubSnapshotContract.test.ts — the JSON the game writes for the club widgets
// must decode as ios/App/Shared/ClubSnapshot.swift. On the phone a mismatch (a renamed
// field, a value that is suddenly optional) is a silent decode failure and a widget stuck on
// its empty state, so a rename on either side fails here (or in tsc, for the TypeScript
// side: the field tables below must name exactly the keys of the TypeScript types).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { bus } from '../../src/core/events';
import { createNewGame, getState, setState, type GameState } from '../../src/core/state';
import { clearSeasonHooks, clearTickHooks } from '../../src/core/time';
import { initLeague } from '../../src/systems/fixtures';
import { CLUB_SNAPSHOT_VERSION, clubSnapshot, type ClubSnapshot } from '../../src/native/clubSnapshot';

const SWIFT = readFileSync('ios/App/Shared/ClubSnapshot.swift', 'utf8');

/** Swift type, and whether the TypeScript side may send null (Swift `?`). */
type Field = readonly [swift: string, optional: boolean];

// `satisfies Record<keyof …>`: tsc fails when the TypeScript type gains, loses or renames a field.
const TOP = {
  v: ['Int', false], club: ['Club', false], season: ['Int', false], week: ['Int', false], when: ['String', false],
  next: ['NextMatch', true], noMatch: ['String', true], injured: ['Injured', true], points: ['Int', false],
} as const satisfies Record<keyof ClubSnapshot, Field>;
const CLUB = { name: ['String', false], colors: ['[String]', false] } as const satisfies Record<keyof ClubSnapshot['club'], Field>;
const NEXT = {
  stage: ['String', false], stageShort: ['String', false], opponent: ['String', false], opponentShort: ['String', false], venue: ['String', false],
} as const satisfies Record<keyof NonNullable<ClubSnapshot['next']>, Field>;
const INJURED = {
  name: ['String', false], position: ['String', false], stars: ['Double', false], rounds: ['Int', false], others: ['Int', false],
} as const satisfies Record<keyof NonNullable<ClubSnapshot['injured']>, Field>;

/** A nested struct's body. */
function struct(name: string): string {
  const m = new RegExp(`struct ${name}: Codable, Equatable \\{([\\s\\S]*?)\\n {4}\\}`).exec(SWIFT);
  if (!m) throw new Error(`no struct ${name}`);
  return m[1]!;
}

/** The stored `var name: Type` fields, with their type and optionality. */
function fields(block: string): Record<string, [string, boolean]> {
  return Object.fromEntries([...block.matchAll(/^\s*var (\w+)\s*:\s*([\w[\]]+)(\?)?/gm)].map((m) => [m[1]!, [m[2]!, m[3] === '?']]));
}

const top = /struct ClubSnapshot: Codable, Equatable \{([\s\S]*?)\n\}/.exec(SWIFT)![1]!.replace(/\n {4}struct \w+[\s\S]*?\n {4}\}/g, '');

function career(): GameState {
  bus.clear(); clearTickHooks(); clearSeasonHooks();
  setState(createNewGame('Contract FC', 11));
  initLeague(getState());
  const s = getState();
  return {
    ...s, preseason: 0, week: 5, settings: { ...s.settings, spendPointsMyself: true },
    squad: s.squad.map((p, i) => ({ ...p, injuredWeeks: i === 0 ? 3 : 0, unspentPoints: i === 1 ? 2 : 0 })),
  };
}

/** What JSON.parse makes of a Swift type's values. */
const JSON_TYPE: Record<string, string> = { Int: 'number', Double: 'number', String: 'string', '[String]': 'object', Club: 'object', NextMatch: 'object', Injured: 'object' };

function checkValues(value: Record<string, unknown>, table: Record<string, Field>): void {
  for (const [name, [swift, optional]] of Object.entries(table)) {
    const v = value[name];
    if (v === null) expect(optional, `${name} is null but not optional in Swift`).toBe(true);
    else expect(typeof v, name).toBe(JSON_TYPE[swift]);
    if (swift === 'Int' && v !== null) expect(Number.isInteger(v), `${name} is an Int`).toBe(true);
  }
}

describe('ClubSnapshot.swift and clubSnapshot.ts', () => {
  it('every struct has exactly the fields, types and optionality the TypeScript type has', () => {
    expect(fields(top)).toEqual(TOP);
    expect(fields(struct('Club'))).toEqual(CLUB);
    expect(fields(struct('NextMatch'))).toEqual(NEXT);
    expect(fields(struct('Injured'))).toEqual(INJURED);
  });

  it('a real snapshot has exactly those keys, with values Swift decodes', () => {
    const full = JSON.parse(JSON.stringify(clubSnapshot(career()))) as ClubSnapshot;
    expect(Object.keys(full).sort()).toEqual(Object.keys(TOP).sort());
    expect(Object.keys(full.club).sort()).toEqual(Object.keys(CLUB).sort());
    expect(Object.keys(full.next!).sort()).toEqual(Object.keys(NEXT).sort());
    expect(Object.keys(full.injured!).sort()).toEqual(Object.keys(INJURED).sort());
    checkValues(full as unknown as Record<string, unknown>, TOP);
    checkValues(full.club as unknown as Record<string, unknown>, CLUB);
    checkValues(full.next as unknown as Record<string, unknown>, NEXT);
    checkValues(full.injured as unknown as Record<string, unknown>, INJURED);

    // The other side of every optional: null where Swift says optional, and only there.
    const bare = clubSnapshot({ ...career(), week: 99, squad: career().squad.map((p) => ({ ...p, injuredWeeks: 0 })) })!;
    expect(bare.next).toBeNull();
    expect(bare.injured).toBeNull();
    checkValues(bare as unknown as Record<string, unknown>, TOP);
  });

  it('the schema version: Swift reads exactly the version the game writes', () => {
    expect(clubSnapshot(career())!.v).toBe(CLUB_SNAPSHOT_VERSION);
    const range = /static let supported = (\d+)\.\.\.(\d+)/.exec(SWIFT);
    expect(range).not.toBeNull();
    expect(Number(range![1])).toBeLessThanOrEqual(CLUB_SNAPSHOT_VERSION);
    expect(Number(range![2])).toBe(CLUB_SNAPSHOT_VERSION);
    expect(/static let sample = ClubSnapshot\(\s*v: (\d+)/.exec(readFileSync('ios/App/BigCoachWidgets/ClubWidget.swift', 'utf8'))?.[1]).toBe(String(CLUB_SNAPSHOT_VERSION));
  });

  it('the App Group is the one both targets are entitled to, and the app registers the plugin', () => {
    const group = /static let group = "([^"]+)"/.exec(SWIFT)?.[1];
    expect(group).toBeTruthy();
    for (const f of ['ios/App/App/App.entitlements', 'ios/App/BigCoachWidgets/BigCoachWidgets.entitlements']) {
      expect(readFileSync(f, 'utf8')).toContain(`<string>${group}</string>`);
    }
    expect(readFileSync('ios/App/App/GameViewController.swift', 'utf8')).toMatch(/registerPluginInstance\(ClubWidgetsPlugin\(\)\)/);
    expect(readFileSync('ios/App/BigCoachWidgets/BigCoachWidgetsBundle.swift', 'utf8')).toMatch(/^\s*ClubWidget\(\)\s*$/m);
    const plugin = readFileSync('ios/App/App/LiveActivity/ClubWidgetsPlugin.swift', 'utf8');
    expect(plugin).toContain('jsName = "ClubWidgets"');
    expect(plugin).toContain('CAPPluginMethod(name: "writeSnapshot"');
    expect(readFileSync('src/native/clubWidgetsPlugin.ts', 'utf8')).toContain("registerPlugin<ClubWidgetsNative>('ClubWidgets')");
  });
});
