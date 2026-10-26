#!/usr/bin/env node
// Visual QA: a screenshot of every screen of every route, desktop and phone,
// dark and light, plus contact sheets and a JSON report in out/qa/.
//
//   node tools/qa/shoot.mjs                      # dist/web/index.html
//   node tools/qa/shoot.mjs --dir site           # any folder with an index.html
//   node tools/qa/shoot.mjs --html page.html     # one self-contained page
//   node tools/qa/shoot.mjs --routes "#/,#/start" --viewports phone --schemes dark
//
// Exits 0 when the run completes; the findings live in out/qa/report.json.

import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import {
  REPO, QA_OUT, FONT_CACHE, ROUTES, VIEWPORTS, SCHEMES,
  loadPlaywright, parseArgs, splitList, normaliseRoute, routeSlug, resolveTarget,
  startServer, createFontRouter, attachCollectors, probeFonts, pool, pad2, VISIBLE_VIEWS_FN,
} from './harness.mjs';

const USAGE = `Usage: node tools/qa/shoot.mjs [options]

  --dir <path>          folder to serve (default dist/web), opens its index.html
  --html <file>         serve this file's folder and open this file
  --routes <list>       comma list (default "${ROUTES.join(',')}")
  --viewports <list>    desktop,phone (default both)
  --schemes <list>      dark,light (default both)
  --out <dir>           output folder (default out/qa)
  --settle <ms>         wait after each scroll for reveals (default 1400)
  --rate <n>            CSS animation playback rate via CDP (default 2)
  --concurrency <n>     parallel browser contexts (default 4)
  --dpr <n>             device scale factor (default 1)
  --help`;

let args;
try {
  args = parseArgs(process.argv.slice(2), {
    string: ['dir', 'html', 'routes', 'viewports', 'schemes', 'out', 'settle', 'rate', 'concurrency', 'dpr'],
    boolean: ['help'],
  });
} catch (e) {
  console.error(e.message + '\n\n' + USAGE);
  process.exit(1);
}
if (args.help) { console.log(USAGE); process.exit(0); }

let target;
try { target = resolveTarget(args); } catch (e) { console.error(e.message); process.exit(1); }

const routes = (args.routes ? splitList(args.routes) : ROUTES).map(normaliseRoute);
const viewports = args.viewports ? splitList(args.viewports) : Object.keys(VIEWPORTS);
const schemes = args.schemes ? splitList(args.schemes) : SCHEMES;
for (const v of viewports) if (!VIEWPORTS[v]) { console.error(`Unknown viewport: ${v} (use ${Object.keys(VIEWPORTS).join(', ')})`); process.exit(1); }
for (const s of schemes) if (!SCHEMES.includes(s)) { console.error(`Unknown scheme: ${s} (use ${SCHEMES.join(', ')})`); process.exit(1); }
const outDir = resolve(args.out || QA_OUT);
const settle = Number(args.settle ?? 1400);
const rate = Number(args.rate ?? 2);
const concurrency = Number(args.concurrency ?? 4);
const dpr = Number(args.dpr ?? 1);
for (const [k, v, min] of [['settle', settle, 0], ['rate', rate, 0.01], ['concurrency', concurrency, 1], ['dpr', dpr, 0.5]]) {
  if (!Number.isFinite(v) || v < min) { console.error(`--${k} must be a number of at least ${min}`); process.exit(1); }
}
const rel = (p) => { const r = relative(REPO, p); return !r ? '.' : r.startsWith('..') ? p : r; };

// Wing colours for the contact-sheet captions, from the brand tokens when present.
const WING = { machina: '#d4f70d', hortus: '#46ed08', arca: '#ff0a96' };
try {
  const tokens = JSON.parse(readFileSync(join(REPO, 'brand', 'tokens.json'), 'utf8'));
  for (const k of Object.keys(WING)) if (tokens.color && tokens.color[k]) WING[k] = tokens.color[k];
} catch { /* defaults stand */ }

/* ------------------------------------------------------------------ in-page functions */

// Screens of the visible view, with their labels.
const SCREENS_FN = () => {
  const view = [...document.querySelectorAll('main.view')].find((v) => !v.hidden && getComputedStyle(v).display !== 'none');
  if (!view) return null;
  return {
    view: view.dataset.view || view.id || '?',
    screens: [...view.querySelectorAll('section.screen')].map((s) => ({
      id: s.id || null,
      title: s.dataset.title || null,
      wing: s.dataset.wing || view.dataset.wing || null,
    })),
  };
};

// Scroll the view so screen i sits at its top, without the smooth behaviour.
const SCROLL_FN = (i) => {
  const view = [...document.querySelectorAll('main.view')].find((v) => !v.hidden && getComputedStyle(v).display !== 'none');
  const s = view && view.querySelectorAll('section.screen')[i];
  if (!s) return { error: 'screen not found' };
  const prev = view.style.scrollBehavior;
  view.style.scrollBehavior = 'auto';
  view.scrollTop = s.offsetTop;
  const got = view.scrollTop;
  view.style.scrollBehavior = prev;
  return { offsetTop: s.offsetTop, scrollTop: got, clamped: Math.abs(got - s.offsetTop) > 1 };
};

// Horizontal overflow and clipped text for screen i.
const MEASURE_FN = ({ i, vw }) => {
  const TOL = 1;
  const view = [...document.querySelectorAll('main.view')].find((v) => !v.hidden && getComputedStyle(v).display !== 'none');
  const screen = view.querySelectorAll('section.screen')[i];
  const sel = (el) => {
    const parts = [];
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      let p = e.tagName.toLowerCase();
      if (e.id) p += '#' + e.id;
      else if (e.classList.length) p += '.' + [...e.classList].slice(0, 2).join('.');
      parts.unshift(p);
      if (e === screen || e.id || parts.length >= 4) break;
    }
    return parts.join(' > ');
  };
  const round = (n) => Math.round(n);
  const hiddenish = (cs) => cs.display === 'none' || cs.visibility === 'hidden' || (cs.clip && cs.clip !== 'auto');
  // Text inside a visually hidden box (.sr: clipped to nothing, for screen readers) is hidden too, however deep it sits.
  const insideHidden = (el) => { for (let a = el.parentElement; a && a !== screen; a = a.parentElement) if (hiddenish(getComputedStyle(a))) return true; return false; };

  // 1. Elements past the right (or left) edge of the viewport.
  const elements = [];
  const scrollers = [];
  const reported = new Set();
  for (const el of screen.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (hiddenish(cs)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.right <= vw + TOL && r.left >= -TOL) continue;
    // Skip it when a horizontal carousel holds it (items sit past the edge by
    // design) or when a clipping box that itself fits the viewport cuts it off.
    let skip = false;
    for (let a = el.parentElement; a && a !== screen; a = a.parentElement) {
      if (reported.has(a)) { skip = true; break; }
      const ac = getComputedStyle(a);
      if (ac.overflowX === 'visible') continue;
      if (ac.overflowX === 'auto' || ac.overflowX === 'scroll') {
        if (!scrollers.some((s) => s.el === sel(a))) scrollers.push({ el: sel(a), scrollWidth: a.scrollWidth, clientWidth: a.clientWidth });
        skip = true;
        break;
      }
      const ar = a.getBoundingClientRect();
      if (ar.right <= vw + TOL && ar.left >= -TOL) { skip = true; break; }
    }
    if (skip) continue;
    reported.add(el);
    if (elements.length < 25) {
      elements.push({ el: sel(el), left: round(r.left), right: round(r.right), width: round(r.width), past: round(Math.max(r.right - vw, -r.left)) });
    }
  }
  const de = document.documentElement;
  const overflow = {
    view: { scrollWidth: view.scrollWidth, clientWidth: view.clientWidth, overflows: view.scrollWidth > view.clientWidth },
    document: { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, overflows: de.scrollWidth > de.clientWidth },
    innerWidth: window.innerWidth,
    elements,
    scrollers,
  };
  overflow.found = overflow.view.overflows || overflow.document.overflows || elements.length > 0 || window.innerWidth > vw + TOL;

  // Fixed chrome that sits over the screen: boxes with a background (the bar)
  // and any visible text (the section dots' current label).
  const opacityOf = (el) => {
    let o = 1;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      o *= parseFloat(getComputedStyle(e).opacity);
      if (o < 0.05) return 0;
    }
    return o;
  };
  const vh = window.innerHeight;
  const onScreen = (r) => r.width >= 1 && r.height >= 1 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
  const covers = [];
  const cr = document.createRange();
  for (const el of document.querySelectorAll('body *')) {
    if (screen.contains(el) || el.contains(screen) || el.closest('dialog')) continue;
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
    if (hiddenish(cs) || cs.clipPath !== 'none') continue;
    if (opacityOf(el) < 0.05) continue;
    const r = el.getBoundingClientRect();
    if (!onScreen(r)) continue;
    const bg = cs.backgroundColor;
    const solid = bg && bg !== 'transparent' && !/,\s*0\)$/.test(bg);
    if (solid && r.width * r.height < 0.4 * vw * vh) covers.push({ by: sel(el), rect: r });
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeValue.trim() ? 1 : 2) });
    for (let t = tw.nextNode(); t; t = tw.nextNode()) {
      const pe = t.parentElement;
      if (!pe || hiddenish(getComputedStyle(pe)) || opacityOf(pe) < 0.05) continue;
      cr.selectNodeContents(t);
      for (const tr of cr.getClientRects()) if (onScreen(tr)) covers.push({ by: sel(pe), rect: tr });
    }
  }
  const covered = [];

  // 2. Text cut off by the screen or by any clipping box inside it.
  const clipped = [];
  const walker = document.createTreeWalker(screen, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const range = document.createRange();
  const seen = new Set();
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const el = t.parentElement;
    if (!el || el.closest('svg,script,style,noscript,template,option,select,textarea')) continue;
    if (seen.has(el)) continue;
    const cs = getComputedStyle(el);
    if (hiddenish(cs) || insideHidden(el)) continue;
    range.selectNodeContents(t);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    if (!rects.length) continue;
    const box = {
      top: Math.min(...rects.map((r) => r.top)), bottom: Math.max(...rects.map((r) => r.bottom)),
      left: Math.min(...rects.map((r) => r.left)), right: Math.max(...rects.map((r) => r.right)),
    };
    const fs = parseFloat(cs.fontSize) || 16;
    // 3. Text under fixed chrome (overlap of at least 3px each way).
    if (covers.length && covered.length < 25 && opacityOf(el) >= 0.05) {
      let hit = null;
      for (const r of rects) {
        for (const c of covers) {
          const w = Math.min(r.right, c.rect.right) - Math.max(r.left, c.rect.left);
          const h = Math.min(r.bottom, c.rect.bottom) - Math.max(r.top, c.rect.top);
          if (w >= 3 && h >= 3) { hit = c; break; }
        }
        if (hit) break;
      }
      if (hit) covered.push({ text: t.nodeValue.trim().replace(/\s+/g, ' ').slice(0, 70), el: sel(el), by: hit.by });
    }
    // Walk out to the screen. A scroll container keeps its text reachable on
    // its scrolling axis, so boxes further out no longer clip on that axis.
    let reachX = false, reachY = false;
    for (let a = el; a; a = a.parentElement) {
      const ac = getComputedStyle(a);
      const cx = ac.overflowX !== 'visible', cy = ac.overflowY !== 'visible';
      if (cx || cy) {
        const scrollX = ac.overflowX === 'auto' || ac.overflowX === 'scroll';
        const scrollY = ac.overflowY === 'auto' || ac.overflowY === 'scroll';
        const ar = a.getBoundingClientRect();
        const l = ar.left + a.clientLeft, tp = ar.top + a.clientTop;
        const clip = { left: l, top: tp, right: l + a.clientWidth, bottom: tp + a.clientHeight };
        // Glyph boxes run a little past tight line boxes; allow for it inside the screen.
        const tolY = a === screen ? TOL : Math.max(2, fs * 0.2);
        const tolX = a === screen ? TOL : Math.max(2, fs * 0.1);
        const checkY = cy && !scrollY && !reachY, checkX = cx && !scrollX && !reachX;
        const sides = {};
        if (checkY && box.top < clip.top - tolY) sides.top = round(clip.top - box.top);
        if (checkY && box.bottom > clip.bottom + tolY) sides.bottom = round(box.bottom - clip.bottom);
        if (checkX && box.left < clip.left - tolX) sides.left = round(clip.left - box.left);
        if (checkX && box.right > clip.right + tolX) sides.right = round(box.right - clip.right);
        if (Object.keys(sides).length) {
          seen.add(el);
          if (clipped.length < 25) clipped.push({ text: t.nodeValue.trim().replace(/\s+/g, ' ').slice(0, 70), el: sel(el), by: sel(a), sides });
          break;
        }
        if (scrollX) reachX = true;
        if (scrollY) reachY = true;
      }
      if (a === screen) break;
    }
  }
  return { overflow, clipped, covered };
};

/* ------------------------------------------------------------------ run */

const startedAt = new Date();
let pw;
try { pw = loadPlaywright(); } catch (e) { console.error(e.message); process.exit(1); }

const server = await startServer(target.dir, { '/__qa/': outDir });
const fonts = createFontRouter();
let browser;
try {
  browser = await pw.chromium.launch();
} catch (e) {
  console.error('Could not launch Chromium: ' + e.message.split('\n')[0]);
  await server.close();
  process.exit(1);
}
const pageUrl = `${server.url}/${encodeURIComponent(target.page)}`;

// Fresh folders for the routes being shot; other routes keep their last run.
mkdirSync(outDir, { recursive: true });
for (const r of routes) rmSync(join(outDir, routeSlug(r)), { recursive: true, force: true });

console.log(`lastfomo visual QA`);
console.log(`  page    ${rel(target.file)}`);
console.log(`  routes  ${routes.join(' ')}  ·  ${viewports.join(', ')}  ·  ${schemes.join(', ')}`);

const jobs = [];
for (const route of routes) for (const viewport of viewports) for (const scheme of schemes) jobs.push({ route, viewport, scheme });

async function shoot({ route, viewport, scheme }) {
  const vp = VIEWPORTS[viewport];
  const slug = routeSlug(route);
  const dir = join(outDir, slug);
  mkdirSync(dir, { recursive: true });
  const run = {
    route, slug, viewport, scheme, size: `${vp.width}x${vp.height}`, url: pageUrl + route,
    view: null, screens: [], fonts: null, sheet: null,
    consoleErrors: [], pageErrors: [], failedRequests: [], expectedMissing: [], errors: [],
  };
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: dpr,
    isMobile: vp.isMobile,
    hasTouch: vp.hasTouch,
    colorScheme: scheme,
    reducedMotion: 'no-preference',
  });
  try {
    await fonts.install(context);
    const page = await context.newPage();
    attachCollectors(page, run);
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(run.url, { waitUntil: 'load', timeout: 60000 });
    if (rate && rate !== 1) {
      try {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Animation.enable');
        await cdp.send('Animation.setPlaybackRate', { playbackRate: rate });
      } catch (e) { run.errors.push('Animation.setPlaybackRate: ' + e.message.split('\n')[0]); }
    }
    await page.evaluate(() => document.fonts.ready.then(() => true));
    const info = await page.evaluate(SCREENS_FN);
    if (!info) throw new Error('no visible main.view');
    run.view = info.view;
    const views = await page.evaluate(VISIBLE_VIEWS_FN);
    if (views.length !== 1) run.errors.push(`expected one visible view, found ${views.length}: ${views.join(', ')}`);
    if (!info.screens.length) run.errors.push('the visible view has no section.screen');
    for (let i = 0; i < info.screens.length; i++) {
      const pos = await page.evaluate(SCROLL_FN, i);
      await page.waitForTimeout(settle);
      const file = join(dir, `${viewport}-${scheme}-${pad2(i + 1)}.png`);
      await page.screenshot({ path: file, caret: 'hide' });
      const m = await page.evaluate(MEASURE_FN, { i, vw: vp.width });
      run.screens.push({ n: i + 1, ...info.screens[i], file: rel(file), ...pos, ...m });
    }
    run.fonts = await probeFonts(page);
  } catch (e) {
    run.errors.push(String(e.message || e).split('\n')[0]);
  } finally {
    run.closing = true;
    await context.close().catch(() => {});
    delete run.closing;
  }
  try { run.sheet = await contactSheet(run); } catch (e) { run.errors.push('contact sheet: ' + String(e.message || e).split('\n')[0]); }
  const flags = run.screens.filter((s) => s.overflow.found || s.clipped.length || s.covered.length).length;
  const errs = run.consoleErrors.length + run.pageErrors.length + run.failedRequests.length + run.errors.length;
  console.log(`  ${errs ? 'warn' : 'ok  '}  ${route.padEnd(10)} ${viewport.padEnd(7)} ${scheme.padEnd(5)} ${pad2(run.screens.length)} screens${flags ? `, ${flags} flagged` : ''}${errs ? `, ${errs} errors` : ''}`);
  return run;
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// One JPG per route + viewport + scheme: thumbnails in order, numbered.
async function contactSheet(run) {
  if (!run.screens.length) return null;
  const vp = VIEWPORTS[run.viewport];
  const phone = run.viewport === 'phone';
  const n = run.screens.length;
  const cols = Math.min(phone ? 5 : 3, n);
  const tw = phone ? 234 : 456;
  const th = Math.round((tw * vp.height) / vp.width);
  const gap = 18, padding = 32;
  const width = padding * 2 + cols * tw + (cols - 1) * gap;
  const cells = run.screens.map((s) => {
    const flags = [];
    if (s.overflow.found) flags.push('overflow');
    if (s.clipped.length) flags.push(`clipped ${s.clipped.length}`);
    if (s.covered.length) flags.push(`covered ${s.covered.length}`);
    const dot = s.wing && WING[s.wing] ? `<i style="background:${WING[s.wing]}"></i>` : '<i class="house"></i>';
    const src = `${server.url}/__qa/${run.slug}/${s.file.split('/').pop()}`;
    return `<figure${flags.length ? ' class="flag"' : ''}><img src="${esc(src)}" width="${tw}" height="${th}" alt=""><figcaption>${dot}<b>${pad2(s.n)}</b><span>${esc(s.title || s.id || '')}</span>${flags.length ? `<em>${esc(flags.join(' · '))}</em>` : ''}</figcaption></figure>`;
  }).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@500&family=Jacquard+24&display=block">
<style>
*{box-sizing:border-box}
html,body{margin:0;background:#080808}
body{padding:${padding}px;width:${width}px;color:#8c8c8c;font:500 12px/1.3 "Geist Mono",ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase}
header{display:flex;align-items:baseline;gap:18px;margin:0 0 22px;color:#fff}
header .word{font:400 40px/.8 "Jacquard 24","Geist Mono",monospace;letter-spacing:0;text-transform:none}
header span{color:#8c8c8c}
.grid{display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:${gap + 6}px ${gap}px}
figure{margin:0}
img{display:block;width:${tw}px;height:${th}px;outline:1px solid #2a2a2a;background:#111}
figcaption{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;margin-top:9px;white-space:nowrap}
figure.flag img{outline:2px solid #ff8a80}
figcaption i{flex:none;width:8px;height:8px;border-radius:50%}
figcaption i.house{border:1px solid #8c8c8c}
figcaption b{color:#fff;font-weight:500}
figcaption span{overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1}
figcaption em{flex-basis:100%;font-style:normal;color:#ff8a80;padding-left:16px}
</style></head><body>
<header><span class="word">lastfomo</span><b>QA</b><span>${esc(run.route)} · ${esc(run.viewport)} ${vp.width}×${vp.height} · ${esc(run.scheme)} · ${n} screens</span></header>
<div class="grid">${cells}</div>
</body></html>`;
  const context = await browser.newContext({ viewport: { width, height: 400 }, deviceScaleFactor: 1, colorScheme: 'dark' });
  try {
    await fonts.install(context);
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 60000 });
    await page.evaluate(() => document.fonts.ready.then(() => true));
    const file = join(outDir, run.slug, `${run.viewport}-${run.scheme}-contact.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 84, fullPage: true });
    return rel(file);
  } finally {
    await context.close().catch(() => {});
  }
}

const runs = await pool(jobs, concurrency, shoot);
await browser.close().catch(() => {});
await server.close();

/* ------------------------------------------------------------------ report */

const fontSummary = {};
for (const run of runs) {
  for (const [family, f] of Object.entries(run.fonts || {})) {
    const s = (fontSummary[family] ||= { ok: true, loadedRuns: 0, usedRuns: 0, runs: 0, notLoaded: [], loadableOnDemand: null });
    s.runs++;
    if (f.loaded) s.loadedRuns++;
    if (f.used.length) {
      s.usedRuns++;
      if (!f.loaded) { s.ok = false; s.notLoaded.push(`${run.route} ${run.viewport} ${run.scheme}`); }
    }
    if (f.loadedOnDemand !== null) s.loadableOnDemand = (s.loadableOnDemand ?? true) && f.loadedOnDemand;
  }
}
for (const s of Object.values(fontSummary)) {
  if (!s.loadedRuns && !s.usedRuns) s.ok = !!s.loadableOnDemand;
  if (!s.loadedRuns && s.usedRuns) s.ok = false;
}
const fontsMissingRuns = runs.filter((r) => !r.fonts).length;

const all = (k) => runs.flatMap((r) => r[k].map((x) => ({ route: r.route, viewport: r.viewport, scheme: r.scheme, ...(typeof x === 'string' ? { message: x } : x) })));
const dedupe = (list, key) => {
  const map = new Map();
  for (const x of list) {
    const k = key(x);
    if (map.has(k)) map.get(k).runs++;
    else map.set(k, { ...x, runs: 1 });
  }
  return [...map.values()];
};
const flagged = runs.flatMap((r) => r.screens
  .filter((s) => s.overflow.found || s.clipped.length || s.covered.length)
  .map((s) => ({ route: r.route, viewport: r.viewport, scheme: r.scheme, n: s.n, title: s.title, file: s.file, overflow: s.overflow.found, clipped: s.clipped.length, covered: s.covered.length })));

const expectedMissing = dedupe(all('expectedMissing'), (x) => x.url).map(({ url, how, runs }) => ({ url, how, runs }));
const summary = {
  runs: runs.length,
  screenshots: runs.reduce((n, r) => n + r.screens.length, 0),
  contactSheets: runs.filter((r) => r.sheet).length,
  fontsLoaded: Object.keys(fontSummary).length === 3 && Object.values(fontSummary).every((s) => s.ok) && !fontsMissingRuns,
  consoleErrors: all('consoleErrors').length,
  pageErrors: all('pageErrors').length,
  failedRequests: all('failedRequests').length,
  expectedMissingIgnored: expectedMissing.length,
  overflowScreens: flagged.filter((f) => f.overflow).length,
  clippedTextScreens: flagged.filter((f) => f.clipped).length,
  coveredTextScreens: flagged.filter((f) => f.covered).length,
  runErrors: all('errors').length,
};

const report = {
  tool: 'tools/qa/shoot.mjs',
  startedAt: startedAt.toISOString(),
  durationMs: Date.now() - startedAt.getTime(),
  target: { page: rel(target.file), dir: rel(target.dir) },
  options: { routes, viewports, schemes, settleMs: settle, playbackRate: rate, concurrency, deviceScaleFactor: dpr },
  summary,
  fonts: fontSummary,
  fontCache: { dir: rel(FONT_CACHE), ...fonts.stats },
  consoleErrors: dedupe(all('consoleErrors'), (x) => x.text),
  pageErrors: dedupe(all('pageErrors'), (x) => x.message),
  failedRequests: dedupe(all('failedRequests'), (x) => x.url + (x.status || x.error)),
  expectedMissing,
  flagged,
  runs,
};
mkdirSync(outDir, { recursive: true });
const reportFile = join(outDir, 'report.json');
writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');

const fontLine = Object.entries(fontSummary).map(([f, s]) => `${f} ${s.ok ? 'ok' : 'MISSING'}`).join(' · ') || 'not probed';
console.log('');
console.log(`  shots   ${summary.screenshots} screenshots, ${summary.contactSheets} contact sheets in ${rel(outDir)}/`);
console.log(`  fonts   ${fontLine}`);
if (fonts.stats.failed.length) console.log(`          ${fonts.stats.failed.length} font downloads failed, see fontCache in the report`);
console.log(`  errors  ${summary.consoleErrors} console, ${summary.pageErrors} page, ${summary.failedRequests} failed requests${expectedMissing.length ? ` (${expectedMissing.length} missing videos ignored)` : ''}`);
console.log(`  layout  overflow on ${summary.overflowScreens} screens, clipped text on ${summary.clippedTextScreens}, text under fixed chrome on ${summary.coveredTextScreens}`);
for (const f of flagged.slice(0, 12)) {
  const what = [f.overflow && 'overflow', f.clipped && `${f.clipped} clipped`, f.covered && `${f.covered} covered`].filter(Boolean).join(', ');
  console.log(`          ${f.route} ${f.viewport} ${f.scheme} ${pad2(f.n)} ${f.title || ''}: ${what}`);
}
if (flagged.length > 12) console.log(`          and ${flagged.length - 12} more in the report`);
if (summary.runErrors) for (const e of all('errors').slice(0, 6)) console.log(`  run     ${e.route} ${e.viewport} ${e.scheme}: ${e.message}`);
console.log(`  report  ${rel(reportFile)}  (${Math.round(report.durationMs / 1000)} s)`);
process.exit(0);
