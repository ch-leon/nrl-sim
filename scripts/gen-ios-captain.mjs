// scripts/gen-ios-captain.mjs — writes the captain icon's asset catalogue into the widget
// extension (scripts/ios-captain.mjs). build:ios runs it; tests/native/iosCaptainAssets.test.ts
// fails while the committed files are out of date.
//
//   npx vite-node scripts/gen-ios-captain.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { IOS_CAPTAIN_CATALOG, captainCatalogFiles } from './ios-captain.mjs';

const files = captainCatalogFiles();
for (const [rel, data] of files) {
  const path = join(IOS_CAPTAIN_CATALOG, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
}
console.log(`[gen-ios-captain] wrote ${files.size} files under ${IOS_CAPTAIN_CATALOG}`);
