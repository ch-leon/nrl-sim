// scripts/bundle-size.mjs — the built bundle's size against its budget, as a warning.
// Every js and css file under <dist>/assets, gzipped one by one and summed: the
// number the perf budget's bundleGzKb row has tracked since N8. Over the budget it
// says so (a GitHub warning annotation under Actions) but never fails: the bundle
// grows with every screen, and a feature should not be blocked for a few KB. The
// line goes into the job summary too, so the size can be followed build by build.
//
//   npm run build && node scripts/bundle-size.mjs              (dist/, the budget file's row)
//   node scripts/bundle-size.mjs e2e-output/dist --budget-kb 600
//
// e2e-perf.mjs imports bundleSize() from here, so both report the same number.
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BUDGET_FILE = fileURLToPath(new URL('./perf-budget.json', import.meta.url));

/** The built bundle: raw and gzipped bytes of everything the page loads. */
export function bundleSize(dist) {
  const assets = join(dist, 'assets');
  const files = readdirSync(assets).filter((f) => /\.(js|css)$/.test(f));
  let raw = 0, gz = 0; const biggest = [];
  for (const f of files) {
    const buf = readFileSync(join(assets, f));
    const z = gzipSync(buf).length;
    raw += buf.length; gz += z;
    biggest.push({ file: f, kb: Math.round(buf.length / 1024), gzKb: Math.round(z / 1024) });
  }
  biggest.sort((a, b) => b.kb - a.kb);
  const html = statSync(join(dist, 'index.html')).size;
  return { files: files.length, rawKb: Math.round((raw + html) / 1024), gzBytes: gz, gzKb: Math.round(gz / 1024), biggest: biggest.slice(0, 3) };
}

/** The bundle's warning line in perf-budget.json (KB, gzipped). */
export function bundleBudgetKb(file = BUDGET_FILE) {
  return JSON.parse(readFileSync(file, 'utf8')).warn?.bundleGzKb ?? null;
}

/** One line for the log and the job summary, and whether it is over. */
export function bundleLine(b, budgetKb) {
  const size = `${b.gzBytes.toLocaleString('en-US')} bytes (${b.gzKb} KB) gzipped, ${b.files} js/css files`;
  if (budgetKb === null) return { over: false, text: `Bundle: ${size}.` };
  const over = b.gzKb > budgetKb;
  return { over, text: `Bundle: ${size}; budget ${budgetKb} KB, ${over ? `over by ${b.gzKb - budgetKb} KB` : `${budgetKb - b.gzKb} KB to spare`}.` };
}

/** Print the line; under Actions, add it to the job summary and warn when over. Never fails. */
export function reportBundle(b, budgetKb) {
  const { over, text } = bundleLine(b, budgetKb);
  console.log(text);
  if (process.env.GITHUB_ACTIONS) {
    if (over) console.log(`::warning title=Bundle over budget::${text} Raise warn.bundleGzKb in scripts/perf-budget.json with a note, or trim the bundle.`);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${over ? '⚠️ ' : ''}${text}\n`);
  }
  return over;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const kbAt = args.indexOf('--budget-kb');
  const dist = args.find((a, i) => !a.startsWith('--') && (kbAt < 0 || i !== kbAt + 1)) ?? 'dist';
  if (!existsSync(join(dist, 'assets'))) {
    console.error(`no build at ${dist}/assets: run npm run build first`);
    process.exit(1);
  }
  reportBundle(bundleSize(dist), kbAt >= 0 ? Number(args[kbAt + 1]) : bundleBudgetKb());
}
