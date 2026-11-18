// scripts/gen-ios-colors.mjs — writes ios/App/BigCoachWidgets/BrandColors.swift from the
// colour tokens (scripts/ios-colors.mjs). build:ios runs it; tests/native/iosBrandColors.test.ts
// fails while the committed file is out of date.
//
//   npx vite-node scripts/gen-ios-colors.mjs
import { writeFileSync } from 'node:fs';
import { IOS_COLORS_PATH, swiftBrandColors } from './ios-colors.mjs';

writeFileSync(IOS_COLORS_PATH, swiftBrandColors());
console.log(`[gen-ios-colors] wrote ${IOS_COLORS_PATH}`);
