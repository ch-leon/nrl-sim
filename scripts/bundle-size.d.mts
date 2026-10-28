// Types for scripts/bundle-size.mjs, for tests/qa/bundleSize.test.ts (#400).
export interface BundleSize {
  files: number;
  rawKb: number;
  gzBytes: number;
  gzKb: number;
  biggest: { file: string; kb: number; gzKb: number }[];
  initial?: { files: number; rawKb: number; gzBytes: number; gzKb: number };
}
export function bundleSize(dist: string): BundleSize;
export function initialFiles(html: string): string[];
export function bundleBudgetKb(file?: string): number | null;
export function bundleLine(b: BundleSize, budgetKb: number | null): { over: boolean; text: string };
export function initialLine(b: BundleSize): string | null;
export function reportBundle(b: BundleSize, budgetKb: number | null): boolean;
