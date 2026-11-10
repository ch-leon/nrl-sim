// scripts/e2e-analytics.mjs — anonymous analytics in a real browser, offline (#450).
//
// Builds the game with a made-up public token (phc_…, never a real one), serves it
// with `vite preview`, and answers PostHog's EU host from inside the browser
// (page.route), so nothing ever reaches PostHog and no account or network is
// needed. The automation guard (navigator.webdriver, src/analytics/config.ts)
// keeps analytics off in every other e2e run; this one alone reads as a person's
// browser, to check the path a player takes:
//   1. the title screen: no request to PostHog, the SDK chunk not fetched, and no
//      PostHog cookie or storage key;
//   2. a new career and a tap on SQUAD: career_started and tab_viewed reach the EU
//      host, cookieless (no person, the cookieless flag), with only the agreed
//      properties and the address without its query;
//   3. still no PostHog cookie, localStorage or sessionStorage key after sending;
//   4. fail-open: PostHog unreachable, and the SDK chunk itself failing to load:
//      the game still reaches the club and its tabs work, with no page error;
//   5. off: the match lab (#lab), Labs (?labs=1) and ?e2e send nothing.
// Exits 1 on any failure.
//
//   npm run e2e:analytics                 (Chromium at CHROMIUM_PATH or /opt/pw-browsers/chromium)
//   npm run e2e:analytics -- --webkit     (Playwright's WebKit, as CI fetches it)
//   npm run e2e:analytics -- --dump       (print every captured event in full)
import { spawn } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import { chromium, webkit } from 'playwright-core';

const argv = process.argv.slice(2);
const WEBKIT = argv.includes('--webkit');
const PORT = Number(process.env.E2E_PORT ?? 4199);
const ROOT = `http://localhost:${PORT}/`;
const DIST = join(process.env.E2E_OUT ?? 'e2e-output', 'dist-analytics');
const FAKE_TOKEN = 'phc_e2eFakeTokenNotReal0000000000';
const EU = 'https://eu.i.posthog.com';
const CHROME_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const ALLOWED_OWN = new Set(['difficulty', 'result', 'tab', 'enabled', 'popup_id', 'app_build', 'platform']);
const failures = [];
const fail = (m) => { failures.push(m); console.log(`  ✗ ${m}`); };
const ok = (m) => console.log(`  ✓ ${m}`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let server = null;
async function build() {
  console.log('building with a made-up token…');
  await new Promise((res, rej) => {
    const b = spawn('npx', ['vite', 'build', '--outDir', DIST, '--emptyOutDir', '--logLevel', 'warn'], {
      stdio: 'inherit', env: { ...process.env, VITE_POSTHOG_KEY: FAKE_TOKEN },
    });
    b.on('exit', (code) => (code === 0 ? res() : rej(new Error(`vite build failed (${code})`))));
  });
  server = spawn('npx', ['vite', 'preview', '--outDir', DIST, '--port', String(PORT), '--strictPort'], { stdio: 'ignore', detached: true });
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error(`vite preview exited (${server.exitCode}); is port ${PORT} taken? Set E2E_PORT.`);
    try { if ((await fetch(ROOT)).ok) return; } catch { /* not up yet */ }
    await wait(500);
  }
  throw new Error('preview server did not start');
}
const stop = () => { if (server) try { process.kill(-server.pid); } catch { /* gone */ } };

/** The events in one capture request, whatever its encoding. */
function decode(req) {
  const url = new URL(req.url());
  const buf = req.postDataBuffer();
  if (!buf) return [];
  let text;
  if (url.searchParams.get('compression') === 'gzip-js' || (buf[0] === 0x1f && buf[1] === 0x8b)) text = gunzipSync(buf).toString('utf8');
  else {
    text = buf.toString('utf8');
    if (text.startsWith('data=')) text = Buffer.from(decodeURIComponent(text.slice(5)), 'base64').toString('utf8');
  }
  const body = JSON.parse(text);
  return Array.isArray(body) ? body : Array.isArray(body.batch) ? body.batch : [body];
}

async function open(browser, { blockHost = false, blockChunk = false } = {}) {
  // This one run reads as a person's browser (see the top of this file): not under
  // automation, and (Chromium) not HeadlessChrome, which PostHog's own bot filter drops.
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    ...(WEBKIT ? {} : { userAgent: CHROME_UA }),
  });
  await ctx.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }));
  const seen = { posthog: [], chunk: 0, events: [], errors: [] };
  await ctx.route(/posthog\.com/, async (route) => {
    const req = route.request();
    seen.posthog.push(req.url());
    if (!req.url().startsWith(EU)) return route.abort();
    if (blockHost) return route.abort('internetdisconnected');
    try { seen.events.push(...decode(req)); } catch (e) { seen.errors.push(`undecodable capture: ${e.message}`); }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":1}' });
  });
  await ctx.route(/posthogClient-[^/]*\.js/, (route) => {
    seen.chunk++;
    return blockChunk ? route.abort('internetdisconnected') : route.continue();
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', (e) => {
    if (!e.message.includes('analytics-548-probe')) seen.errors.push(`pageerror: ${e.message}`);
  });
  return { ctx, page, seen };
}

/** PostHog's own keys in this page's cookies and storage. */
const phStorage = (page) => page.evaluate(() => {
  const keys = (s) => { try { return Object.keys(s); } catch { return []; } };
  return [document.cookie, ...keys(localStorage), ...keys(sessionStorage)].filter((k) => /ph_|posthog/i.test(k));
});

async function newCareer(page) {
  await page.fill('[data-nrl-clubname]', 'Analytics Test FC');
  await page.click('[data-nrl-start]');
  await page.click('[data-expansion-work]');
  await page.waitForSelector('.nrl-dock');
  const skip = page.locator('.nrl-tutorial-skip');
  if (await skip.count()) await skip.first().click();
}

async function main() {
  await build();
  const browser = WEBKIT
    ? await webkit.launch()
    : await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  console.log(`browser: ${WEBKIT ? 'WebKit' : 'Chromium'} ${browser.version()}`);
  try {
    console.log('1–3. title, then a new career');
    {
      const { ctx, page, seen } = await open(browser);
      await page.goto(ROOT);
      await page.waitForSelector('[data-nrl-start]');
      // Genuine uncaught error and rejected promise on the title: queue only.
      await page.evaluate(() => {
        const url = document.querySelector('script[type=module]').src;
        const error = new TypeError('analytics-548-probe Coach Leon me@example.com phc_private');
        error.stack = `TypeError: private\n    at privateName (${url}?coach=Leon#private:123:10)`;
        setTimeout(() => { throw error; }, 0);
        const rejection = new RangeError('analytics-548-probe save blob');
        rejection.stack = `RangeError: private\n    at privateName (${url}?email=me@example.com#private:123:11)`;
        void Promise.reject(rejection);
      });
      await wait(4000); // longer than the idle wait: nothing may start on the title
      if (seen.posthog.length) fail(`requests to PostHog on the title: ${seen.posthog.join(', ')}`); else ok('no request to PostHog on the title');
      if (seen.chunk) fail('the SDK chunk was fetched on the title'); else ok('SDK chunk not fetched on the title');
      const early = await phStorage(page);
      if (early.length) fail(`PostHog storage on the title: ${early}`); else ok('no PostHog cookie or storage on the title');

      await newCareer(page);
      await page.click('.nrl-nav [data-screen="squad"]');
      for (let i = 0; i < 40 && !(seen.events.some((e) => e.event === 'tab_viewed') && seen.events.some((e) => e.event === 'career_started')); i++) await wait(500);
      if (seen.chunk !== 1) fail(`SDK chunk fetched ${seen.chunk} times after the title`); else ok('SDK chunk fetched once, after the title');
      const names = seen.events.map((e) => e.event);
      for (const want of ['career_started', 'tab_viewed']) {
        if (names.includes(want)) ok(`${want} sent to ${EU}`); else fail(`${want} not sent (saw: ${names.join(', ') || 'nothing'})`);
      }
      const extra = names.filter((n) => !['career_started', 'tab_viewed', '$exception'].includes(n));
      if (extra.length) fail(`events that are not on the list: ${extra.join(', ')}`); else ok('no events beyond curated events and $exception');
      const exceptions = seen.events.filter((e) => e.event === '$exception');
      if (exceptions.length !== 2) fail(`expected 2 queued exceptions, saw ${exceptions.length}`);
      else ok('uncaught error and unhandled rejection queued on title, sent after start');
      for (const e of exceptions) {
        const p = e.properties ?? {};
        if (!p.app_build || p.platform !== 'web') fail('exception missing build/platform');
        if (!p.$exception_list?.[0]?.stacktrace?.frames?.length) fail('exception missing stack frames');
        if (p.$lib !== 'web' || p.$exception_list?.[0]?.stacktrace?.frames?.some((f) => f.platform !== 'web:javascript')) fail('exception missing SDK/platform metadata');
        if (p.$exception_list?.[0]?.mechanism?.handled !== false) fail('exception not marked unhandled');
        if (/Coach|Leon|@|[?#]|private|blob/.test(JSON.stringify(p))) fail('exception contains private data');
      }
      for (const e of seen.events) {
        const p = e.properties ?? {};
        const own = Object.keys(p).filter((k) => !k.startsWith('$') && k !== 'token' && k !== 'distinct_id');
        const bad = own.filter((k) => !ALLOWED_OWN.has(k));
        if (bad.length) fail(`${e.event} carries ${bad.join(', ')}`);
        if (p.$process_person_profile !== false) fail(`${e.event}: $process_person_profile is ${p.$process_person_profile}`);
        if (p.$cookieless_mode !== true) fail(`${e.event}: not marked cookieless ($cookieless_mode ${p.$cookieless_mode})`);
        if (e.$set || p.$set || p.$set_once) fail(`${e.event} sets person properties`);
        if (typeof p.$current_url === 'string' && /[?#]/.test(p.$current_url)) fail(`${e.event}: address keeps its query: ${p.$current_url}`);
        if (p.token !== FAKE_TOKEN) fail(`${e.event}: unexpected token`);
      }
      const tab = seen.events.find((e) => e.event === 'tab_viewed');
      if (tab && tab.properties.tab !== 'squad') fail(`tab_viewed says ${tab.properties.tab}`);
      if (!failures.length) ok(`events cookieless, no person profile, only agreed properties (${seen.events[0]?.properties?.distinct_id ?? '?'})`);
      if (argv.includes('--dump')) console.log(JSON.stringify(seen.events, null, 1));
      const after = await phStorage(page);
      if (after.length) fail(`PostHog storage after sending: ${after}`); else ok('no PostHog cookie, localStorage or sessionStorage key after sending');
      if (seen.errors.length) fail(seen.errors.join('; '));
      await ctx.close();
    }

    console.log('DNT. no events, including errors');
    {
      const { ctx, page, seen } = await open(browser);
      await ctx.addInitScript(() => Object.defineProperty(Navigator.prototype, 'doNotTrack', { get: () => '1' }));
      await page.goto(ROOT);
      await page.waitForSelector('[data-nrl-start]');
      await newCareer(page);
      await page.evaluate(() => { void Promise.reject(new Error('analytics-548-probe DNT')); });
      await wait(5000);
      if (seen.posthog.length) fail('DNT sent requests'); else ok('DNT sends no curated events or exceptions');
      if ((await phStorage(page)).length) fail('DNT left PostHog storage');
      await ctx.close();
    }

    console.log('4. fail-open');
    for (const [label, opts] of [['PostHog unreachable', { blockHost: true }], ['SDK chunk fails to load', { blockChunk: true }]]) {
      const { ctx, page, seen } = await open(browser, opts);
      await page.goto(ROOT);
      await page.waitForSelector('[data-nrl-start]');
      await newCareer(page);
      await wait(5000);
      await page.click('.nrl-nav [data-screen="squad"]');
      await page.waitForSelector('.nrl-screen-region, [data-screen-key]', { timeout: 5000 }).catch(() => null);
      const dock = await page.locator('.nrl-dock').count();
      if (!dock || seen.errors.length) fail(`${label}: game affected (${seen.errors.join('; ') || 'no dock'})`); else ok(`${label}: the game plays on, no page error`);
      await ctx.close();
    }

    console.log('5. off');
    for (const [label, url] of [['match lab', `${ROOT}#lab`], ['Labs', `${ROOT}?labs=1`], ['?e2e', `${ROOT}?e2e`]]) {
      const { ctx, page, seen } = await open(browser);
      await page.goto(url);
      if (label === 'match lab') await wait(6000);
      else {
        await page.waitForSelector('[data-nrl-start]');
        await newCareer(page);
        await wait(6000);
      }
      if (seen.posthog.length || seen.chunk) fail(`${label}: analytics ran (${seen.posthog.length} requests, chunk ${seen.chunk})`); else ok(`${label}: nothing sent, SDK not fetched`);
      await ctx.close();
    }
  } finally {
    await browser.close();
    stop();
  }
  console.log(failures.length ? `\n${failures.length} failure(s)` : '\nall analytics checks passed');
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => { console.error(e); stop(); process.exit(1); });
