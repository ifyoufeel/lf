#!/usr/bin/env node
// Interaction smoke test, desktop 1440x900, dark scheme: routes and curtain,
// case links, film player, brief form, copy, theme switch, focus rings, and
// console errors throughout. Writes out/qa/smoke.json.
//
//   node tools/qa/smoke.mjs                      # dist/web/index.html
//   node tools/qa/smoke.mjs --html page.html     # one self-contained page
//
// Prints PASS, FAIL or SKIP per step. Exits 1 if any step fails.
// Optional elements that are absent (button#theme) are SKIP, not FAIL.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import {
  REPO, QA_OUT, VIEWPORTS,
  loadPlaywright, parseArgs, resolveTarget, startServer, createFontRouter, attachCollectors, probeFonts, VISIBLE_VIEWS_FN,
} from './harness.mjs';

const USAGE = `Usage: node tools/qa/smoke.mjs [options]

  --dir <path>      folder to serve (default dist/web), opens its index.html
  --html <file>     serve this file's folder and open this file
  --out <dir>       output folder (default out/qa)
  --headed          show the browser
  --help`;

let args;
try {
  args = parseArgs(process.argv.slice(2), { string: ['dir', 'html', 'out'], boolean: ['help', 'headed'] });
} catch (e) {
  console.error(e.message + '\n\n' + USAGE);
  process.exit(1);
}
if (args.help) { console.log(USAGE); process.exit(0); }

let target;
try { target = resolveTarget(args); } catch (e) { console.error(e.message); process.exit(1); }
const outDir = resolve(args.out || QA_OUT);
const rel = (p) => { const r = relative(REPO, p); return !r ? '.' : r.startsWith('..') ? p : r; };

let pw;
try { pw = loadPlaywright(); } catch (e) { console.error(e.message); process.exit(1); }

/* ------------------------------------------------------------------ step runner */

class Skip extends Error {}
const steps = [];
function check(cond, msg) { if (!cond) throw new Error(msg); }

async function step(name, fn) {
  const t0 = Date.now();
  let status = 'PASS', detail = '';
  try {
    detail = (await fn()) || '';
  } catch (e) {
    status = e instanceof Skip ? 'SKIP' : 'FAIL';
    detail = String(e.message || e).split('\n')[0];
  }
  const ms = Date.now() - t0;
  steps.push({ name, status, detail, ms });
  console.log(`${status.padEnd(4)}  ${name}${detail ? `  ·  ${detail}` : ''}`);
  return status;
}

/* ------------------------------------------------------------------ browser */

const startedAt = new Date();
const server = await startServer(target.dir);
const fonts = createFontRouter();
let browser;
try {
  browser = await pw.chromium.launch({ headless: !args.headed });
} catch (e) {
  console.error('Could not launch Chromium: ' + e.message.split('\n')[0]);
  await server.close();
  process.exit(1);
}
const vp = VIEWPORTS.desktop;
const context = await browser.newContext({
  viewport: { width: vp.width, height: vp.height },
  colorScheme: 'dark',
  reducedMotion: 'no-preference',
});
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: server.url }).catch(() => {});
await fonts.install(context);
const page = await context.newPage();
const sink = {};
attachCollectors(page, sink);
await page.emulateMedia({ colorScheme: 'dark' });
const base = `${server.url}/${encodeURIComponent(target.page)}`;
let homeView = 'home';

/* ------------------------------------------------------------------ helpers */

const visibleViews = () => page.evaluate(VISIBLE_VIEWS_FN);

// Wait until exactly this view shows and the curtain (if any) has lifted.
async function waitView(name, timeout = 6000) {
  await page.waitForFunction((k) => {
    const vs = [...document.querySelectorAll('main.view')].filter((v) => !v.hidden && getComputedStyle(v).display !== 'none');
    return vs.length === 1 && (vs[0].dataset.view || vs[0].id) === k;
  }, name, { timeout }).catch(async () => {
    throw new Error(`view "${name}" did not show (visible: ${(await visibleViews()).join(', ') || 'none'}, hash ${await page.evaluate(() => location.hash)})`);
  });
  await page.waitForFunction(() => !document.querySelector('.curtain.on'), null, { timeout: 4000 }).catch(() => {
    throw new Error('the curtain did not lift');
  });
}

async function go(hash, name) {
  const now = await page.evaluate(() => location.hash);
  const views = await visibleViews();
  if (now === hash && views.length === 1 && views[0] === name) return;
  if (now !== hash) await page.evaluate((h) => { location.hash = h; }, hash);
  await waitView(name);
}

// Put the screen holding this element at the top of its view, then let it reveal.
async function bringIntoView(locator, settle = 1000) {
  await locator.evaluate((el) => {
    const view = el.closest('main.view');
    const screen = el.closest('section.screen');
    if (!view || !screen) return;
    const prev = view.style.scrollBehavior;
    view.style.scrollBehavior = 'auto';
    view.scrollTop = screen.offsetTop;
    view.style.scrollBehavior = prev;
  });
  await page.waitForTimeout(settle);
}

const describe = (handle) => handle.evaluate((el) => {
  const t = (el.getAttribute('aria-label') || el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  return el.tagName.toLowerCase() + (el.id ? '#' + el.id : el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '') + (t ? ` "${t}"` : '');
});

/* ------------------------------------------------------------------ steps */

await step('load #/', async () => {
  await page.goto(base + '#/', { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready.then(() => true));
  const views = await visibleViews();
  check(views.length === 1, `expected one visible view, found ${views.length}`);
  homeView = views[0];
  return `view ${homeView}`;
});

await step('header: Start a project', async () => {
  await go('#/', homeView);
  const link = page.locator('header a', { hasText: /start a project/i }).first();
  check(await link.count(), 'no "Start a project" link in the header');
  await page.evaluate(() => {
    window.__curtainSeen = false;
    const c = document.querySelector('.curtain');
    if (!c) return;
    new MutationObserver(() => { if (c.classList.contains('on')) window.__curtainSeen = true; })
      .observe(c, { attributes: true, attributeFilter: ['class'] });
  });
  await link.click();
  await waitView('start');
  const hash = await page.evaluate(() => location.hash);
  check(hash === '#/start', `hash is ${hash}`);
  const curtain = await page.evaluate(() => window.__curtainSeen);
  return `view start, curtain ${curtain ? 'played' : 'not seen'}`;
});

{
  let links = [];
  try {
    await go('#/', homeView);
    const loc = page.locator(`main.view[data-view="${homeView}"] a`, { hasText: /open the case/i });
    links = await loc.evaluateAll((els) => els.map((a) => a.getAttribute('href')));
  } catch { /* reported below */ }
  if (!links.length) {
    await step('open the case', async () => { throw new Error('no "Open the case" links on #/'); });
  }
  for (const href of links) {
    const k = String(href).replace(/^#\/?/, '');
    await step(`open the case: ${k}`, async () => {
      await go('#/', homeView);
      const link = page.locator(`main.view[data-view="${homeView}"] a[href="${href}"]`, { hasText: /open the case/i }).first();
      await bringIntoView(link);
      await link.click();
      await waitView(k);
      const hash = await page.evaluate(() => location.hash);
      check(hash === href, `hash is ${hash}, expected ${href}`);
      return `view ${k}`;
    });
  }
}

let reelOpened = false;
await step('film: Play opens dialog#reel', async () => {
  await go('#/', homeView);
  check(await page.locator('dialog#reel').count(), 'dialog#reel is missing');
  const btn = page.locator(`main.view[data-view="${homeView}"] button`, { hasText: /play the film/i }).first();
  check(await btn.count(), 'no "Play the film" button on #/');
  await bringIntoView(btn);
  await btn.click();
  await page.waitForFunction(() => document.querySelector('dialog#reel').open, null, { timeout: 3000 })
    .catch(() => { throw new Error('dialog#reel did not open'); });
  reelOpened = true;
  const note = await page.evaluate(() => (document.querySelector('#reel-note') || {}).textContent || '');
  return note ? `open, note "${note.trim()}"` : 'open';
});

await step('film: Close shuts dialog#reel', async () => {
  check(reelOpened, 'dialog#reel was not open');
  const close = page.locator('dialog#reel button', { hasText: /close/i }).first();
  check(await close.count(), 'no Close button in dialog#reel');
  await close.click();
  await page.waitForFunction(() => !document.querySelector('dialog#reel').open, null, { timeout: 3000 })
    .catch(() => { throw new Error('dialog#reel stayed open'); });
  return 'closed';
});

const brief = {
  name: 'Smoke Test',
  email: 'qa@example.com',
  text: 'A private inference server for a small clinic. Smoke test.',
  timeline: '',
};
let briefSent = false;
await step('brief: fill and send', async () => {
  await go('#/start', 'start');
  const form = page.locator('form#brief');
  check(await form.count(), 'form#brief is missing');
  await bringIntoView(form, 600);
  const pill = form.locator('label', { hasText: /machina/i }).first();
  check(await pill.count(), 'no Machina choice in the form');
  await pill.click();
  const checked = await form.evaluate((f) => [...f.querySelectorAll('input[type=radio]:checked')].map((i) => i.value + ' ' + (i.closest('label') || {}).textContent));
  check(checked.some((v) => /machina/i.test(v)), `Machina not selected (checked: ${checked.join('; ') || 'none'})`);
  await form.locator('[name="name"]').fill(brief.name);
  await form.locator('[name="email"]').fill(brief.email);
  const timeline = form.locator('[name="timeline"]');
  if (await timeline.count()) {
    const tag = await timeline.evaluate((el) => el.tagName);
    if (tag === 'SELECT') {
      await timeline.selectOption({ index: 1 });
      brief.timeline = await timeline.evaluate((el) => el.options[el.selectedIndex].text);
    } else {
      brief.timeline = 'In the next three months';
      await timeline.fill(brief.timeline);
    }
  }
  const text = form.locator('textarea').first();
  check(await text.count(), 'no textarea in the form');
  await text.fill(brief.text);
  await form.locator('[type="submit"]').first().click();
  await page.locator('#sent').waitFor({ state: 'visible', timeout: 4000 })
    .catch(() => { throw new Error('#sent did not become visible'); });
  briefSent = true;
  return `sent, timeline "${brief.timeline}"`;
});

await step('brief: #brief-text holds the inputs', async () => {
  check(briefSent, 'the brief was not sent');
  const out = await page.locator('#brief-text').textContent();
  const want = { wing: /machina/i, name: brief.name, email: brief.email, timeline: brief.timeline, text: brief.text };
  const missing = Object.entries(want).filter(([, v]) => v && !(v instanceof RegExp ? v.test(out) : out.includes(v))).map(([k]) => k);
  check(!missing.length, `missing: ${missing.join(', ')}`);
  return `${out.split('\n').length} lines`;
});

await step('brief: #copy-brief', async () => {
  check(briefSent, 'the brief was not sent');
  const btn = page.locator('#copy-brief');
  check(await btn.count(), '#copy-brief is missing');
  const before = (await btn.textContent()).trim();
  await btn.click();
  await page.waitForTimeout(300);
  const after = (await btn.textContent()).trim();
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => null));
  const out = await page.locator('#brief-text').textContent();
  const copied = clip !== null && clip.trim() === out.trim();
  check(copied || after !== before, `nothing happened (label "${after}")`);
  return `${copied ? 'clipboard holds the brief' : 'clipboard not readable'}, label "${after}"`;
});

await step('theme: button#theme cycles dark, light, auto', async () => {
  const btn = page.locator('button#theme');
  if (!(await btn.count())) throw new Skip('button#theme not present');
  await go('#/', homeView);
  const attr = () => page.evaluate(() => document.documentElement.getAttribute('data-theme') ?? 'none');
  const start = await attr();
  const seq = [];
  for (let i = 0; i < 3; i++) {
    await btn.click();
    await page.waitForTimeout(150);
    seq.push(await attr());
  }
  const want = ['dark', 'light', 'none'];
  check(seq.join() === want.join(), `from ${start} got ${seq.join(', ')}, expected ${want.join(', ')}`);
  return `from ${start}: ${seq.join(', ')}`;
});

await step('focus: Tab shows a visible outline', async () => {
  await page.goto('about:blank');
  await page.goto(base + '#/', { waitUntil: 'load', timeout: 60000 });
  await waitView(homeView);
  const seen = [];
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    const h = await page.evaluateHandle(() => document.activeElement);
    const info = await h.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        body: el === document.body || el.matches('main.view'),
        style: cs.outlineStyle,
        width: parseFloat(cs.outlineWidth) || 0,
        color: cs.outlineColor,
        focusVisible: el.matches(':focus-visible'),
      };
    });
    const who = await describe(h);
    await h.dispose();
    seen.push({ who, ...info });
  }
  const bad = seen.filter((s) => s.body || s.style === 'none' || s.width <= 0 || /rgba\(.*,\s*0\)$|transparent/.test(s.color));
  check(!bad.length, bad.map((s) => `${s.who}: ${s.body ? 'nothing focused' : `outline ${s.style} ${s.width}px ${s.color}`}`).join('; '));
  return seen.map((s) => `${s.who} ${s.style} ${s.width}px`).join('; ');
});

let fontInfo = null;
await step('fonts: Geist, Geist Mono, Jacquard 24', async () => {
  fontInfo = await probeFonts(page);
  const bad = Object.entries(fontInfo).filter(([, f]) => f.used.length && !f.loaded).map(([k]) => k);
  check(!bad.length, `not loaded: ${bad.join(', ')}`);
  return Object.entries(fontInfo).map(([k, f]) => `${k} ${f.loaded ? 'loaded' : 'unused'}`).join(', ');
});

await step('console: no errors', async () => {
  const c = sink.consoleErrors.length, p = sink.pageErrors.length;
  const first = (sink.pageErrors[0] && sink.pageErrors[0].message) || (sink.consoleErrors[0] && sink.consoleErrors[0].text) || '';
  check(!c && !p, `${c} console errors, ${p} page errors${first ? `: ${first}` : ''}`);
  return `0 console, 0 page errors${sink.expectedMissing.length ? `, ${sink.expectedMissing.length} missing videos ignored` : ''}`;
});

sink.closing = true;
await context.close().catch(() => {});
await browser.close().catch(() => {});
await server.close();

/* ------------------------------------------------------------------ report */

const failed = steps.filter((s) => s.status === 'FAIL').length;
const report = {
  tool: 'tools/qa/smoke.mjs',
  startedAt: startedAt.toISOString(),
  durationMs: Date.now() - startedAt.getTime(),
  target: { page: rel(target.file), dir: rel(target.dir) },
  viewport: 'desktop 1440x900',
  scheme: 'dark',
  result: failed ? 'FAIL' : 'PASS',
  counts: {
    pass: steps.filter((s) => s.status === 'PASS').length,
    fail: failed,
    skip: steps.filter((s) => s.status === 'SKIP').length,
  },
  steps,
  fonts: fontInfo,
  fontCache: fonts.stats,
  consoleErrors: sink.consoleErrors,
  pageErrors: sink.pageErrors,
  failedRequests: sink.failedRequests,
  expectedMissing: sink.expectedMissing,
};
mkdirSync(outDir, { recursive: true });
const file = join(outDir, 'smoke.json');
writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
console.log(`\n${report.result}  ${report.counts.pass} pass, ${report.counts.fail} fail, ${report.counts.skip} skip  ·  ${sink.failedRequests.length} failed requests  ·  ${rel(file)}`);
process.exit(failed ? 1 : 0);
