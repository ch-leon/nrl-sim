import { describe, it, expect } from 'vitest';

// The iPhone app's Xcode settings (docs/specs/ios.md §1, §2, Phase 1). Xcode rewrites these
// files when someone clicks through its settings, so a click that changes one fails here.
// No Node types in the tsconfig: files come in as text through Vite's ?raw glob.
const raw = (files: Record<string, unknown>): string => Object.values(files)[0] as string;
const PBXPROJ = raw(import.meta.glob('../ios/App/App.xcodeproj/project.pbxproj', { query: '?raw', import: 'default', eager: true }));
const INFO_PLIST = raw(import.meta.glob('../ios/App/App/Info.plist', { query: '?raw', import: 'default', eager: true }));
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
  it('uses the free-account bundle id in Debug and Release', () => {
    expect(settings('PRODUCT_BUNDLE_IDENTIFIER')).toEqual(['au.com.supercooked.bigrugbycoach.dev', 'au.com.supercooked.bigrugbycoach.dev']);
  });

  it('targets iOS 16.2 everywhere and iPhone only', () => {
    const targets = settings('IPHONEOS_DEPLOYMENT_TARGET');
    expect(targets.length).toBeGreaterThan(0);
    expect(new Set(targets)).toEqual(new Set(['16.2']));
    const families = settings('TARGETED_DEVICE_FAMILY');
    expect(families.length).toBeGreaterThan(0);
    expect(new Set(families)).toEqual(new Set(['1']));
  });

  it('commits no signing team and no entitlements (the free Personal Team is picked in Xcode)', () => {
    expect(PBXPROJ).not.toMatch(/DEVELOPMENT_TEAM/);
    expect(PBXPROJ).not.toMatch(/CODE_SIGN_ENTITLEMENTS|\.entitlements/);
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
});
