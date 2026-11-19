import { describe, it, expect } from 'vitest';

// The iPhone app's Xcode settings (docs/specs/ios.md §1, §2, Phase 1; the widget
// extension, App Group and Live Activity keys, Phase 3). Xcode rewrites these
// files when someone clicks through its settings, so a click that changes one fails here.
// No Node types in the tsconfig: files come in as text through Vite's ?raw glob.
const raw = (files: Record<string, unknown>): string => Object.values(files)[0] as string;
const PBXPROJ = raw(import.meta.glob('../ios/App/App.xcodeproj/project.pbxproj', { query: '?raw', import: 'default', eager: true }));
const INFO_PLIST = raw(import.meta.glob('../ios/App/App/Info.plist', { query: '?raw', import: 'default', eager: true }));
const APP_ENTITLEMENTS = raw(import.meta.glob('../ios/App/App/App.entitlements', { query: '?raw', import: 'default', eager: true }));
const WIDGET_ENTITLEMENTS = raw(import.meta.glob('../ios/App/BigCoachWidgets/BigCoachWidgets.entitlements', { query: '?raw', import: 'default', eager: true }));
const CAP_PACKAGE = raw(import.meta.glob('../ios/App/CapApp-SPM/Package.swift', { query: '?raw', import: 'default', eager: true }));
const MAIN_STORYBOARD = raw(import.meta.glob('../ios/App/App/Base.lproj/Main.storyboard', { query: '?raw', import: 'default', eager: true }));

/** Every value a build setting takes in the project, in order. */
const settings = (key: string): string[] =>
  [...PBXPROJ.matchAll(new RegExp(`^\\s*${key} = ([^;]+);`, 'gm'))].map((m) => m[1]!.trim());

/** The <array> of strings after a key in Info.plist. */
const plistArray = (key: string): string[] => {
  const m = new RegExp(`<key>${key}</key>\\s*<array>([\\s\\S]*?)</array>`).exec(INFO_PLIST);
  return m ? [...m[1]!.matchAll(/<string>([^<]*)<\/string>/g)].map((s) => s[1]!) : [];
};

describe('iPhone Xcode project', () => {
  it('uses the free-account bundle ids in Debug and Release: the app and its widget extension', () => {
    const ids = settings('PRODUCT_BUNDLE_IDENTIFIER');
    expect(ids.filter((id) => id === 'au.com.supercooked.bigrugbycoach.dev')).toHaveLength(2);
    expect(ids.filter((id) => id === 'au.com.supercooked.bigrugbycoach.dev.widgets')).toHaveLength(2);
    expect(ids).toHaveLength(4);
  });

  it('has the App target and the BigCoachWidgets extension, embedded in the app', () => {
    expect(PBXPROJ).toMatch(/productType = "com\.apple\.product-type\.app-extension";/);
    expect(PBXPROJ).toMatch(/BigCoachWidgets\.appex in Embed Foundation Extensions/);
    expect(PBXPROJ).toMatch(/dstSubfolderSpec = 13;/);
  });

  it('targets iOS 16.2 everywhere and iPhone only', () => {
    const targets = settings('IPHONEOS_DEPLOYMENT_TARGET');
    expect(targets.length).toBeGreaterThan(0);
    expect(new Set(targets)).toEqual(new Set(['16.2']));
    const families = settings('TARGETED_DEVICE_FAMILY');
    expect(families.length).toBeGreaterThan(0);
    expect(new Set(families)).toEqual(new Set(['1']));
  });

  it('commits no signing team (the free Personal Team is picked in Xcode)', () => {
    expect(PBXPROJ).not.toMatch(/DEVELOPMENT_TEAM/);
  });

  it('each target has one entitlements file, with the App Group and nothing else (no push, no paid capability)', () => {
    expect(settings('CODE_SIGN_ENTITLEMENTS').sort()).toEqual([
      'App/App.entitlements', 'App/App.entitlements',
      'BigCoachWidgets/BigCoachWidgets.entitlements', 'BigCoachWidgets/BigCoachWidgets.entitlements',
    ]);
    for (const file of [APP_ENTITLEMENTS, WIDGET_ENTITLEMENTS]) {
      expect([...file.matchAll(/<key>([^<]+)<\/key>/g)].map((m) => m[1])).toEqual(['com.apple.security.application-groups']);
      expect([...file.matchAll(/<string>([^<]+)<\/string>/g)].map((m) => m[1])).toEqual(['group.au.com.supercooked.bigrugbycoach.dev']);
    }
  });

  it('allows Live Activities, without the frequent-updates key, and opens on the bigcoach:// link', () => {
    expect(INFO_PLIST).toMatch(/<key>NSSupportsLiveActivities<\/key>\s*<true\/>/);
    expect(INFO_PLIST).not.toMatch(/NSSupportsLiveActivitiesFrequentUpdates/);
    expect(plistArray('CFBundleURLSchemes')).toEqual(['bigcoach']);
  });

  it('runs landscape only, with no status bar, on arm64', () => {
    expect(plistArray('UISupportedInterfaceOrientations')).toEqual(['UIInterfaceOrientationLandscapeLeft', 'UIInterfaceOrientationLandscapeRight']);
    expect(INFO_PLIST).not.toMatch(/UISupportedInterfaceOrientations~ipad/);
    expect(INFO_PLIST).toMatch(/<key>UIStatusBarHidden<\/key>\s*<true\/>/);
    expect(plistArray('UIRequiredDeviceCapabilities')).toEqual(['arm64']);
  });

  it("the storyboard's screen is GameViewController", () => {
    expect(MAIN_STORYBOARD).toMatch(/customClass="GameViewController"/);
  });

  // Phase 2 (durable saves): `npx cap sync ios` links the save mirror's plugins; a sync
  // run without them installed would drop them and the app would lose its native saves.
  it('links the Filesystem and Share plugins (the save mirror and the share-sheet export)', () => {
    expect(CAP_PACKAGE).toContain('.package(name: "CapacitorFilesystem", path: "../../../node_modules/@capacitor/filesystem")');
    expect(CAP_PACKAGE).toContain('.package(name: "CapacitorShare", path: "../../../node_modules/@capacitor/share")');
    expect(CAP_PACKAGE).toContain('.product(name: "CapacitorFilesystem", package: "CapacitorFilesystem")');
    expect(CAP_PACKAGE).toContain('.product(name: "CapacitorShare", package: "CapacitorShare")');
  });
});
