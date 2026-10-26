#!/usr/bin/env node
// Interaction smoke test, desktop 1440x900, dark scheme: routes and curtain,
// case links, film player, the walk (#/explore), brief form, copy, theme switch,
// focus rings, and console errors throughout. Writes out/qa/smoke.json.
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
let embeds = true;
await step('film: Play opens dialog#reel', async () => {
  await go('#/', homeView);
  check(await page.locator('dialog#reel').count(), 'dialog#reel is missing');
  // Play controls are links to the film (site/media.json → films). The web build plays them in place;
  // an Artifact (manifest "embed": false) lets the link open YouTube in a new tab instead.
  embeds = await page.evaluate(() => { try { return JSON.parse(document.querySelector('#lf-media').textContent).embed !== false; } catch { return true; } });
  const btn = page.locator(`main.view[data-view="${homeView}"] [data-play]`, { hasText: /play the film/i }).first();
  check(await btn.count(), 'no "Play the film" control on #/');
  const href = await btn.getAttribute('href');
  check(/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(href || ''), `"Play the film" links to ${href}, not a YouTube film`);
  check(await btn.getAttribute('target') === '_blank', '"Play the film" does not open a new tab');
  if (!embeds) return `links out to ${href} (Artifact build, no embed)`;
  await bringIntoView(btn);
  await btn.click();
  await page.waitForFunction(() => document.querySelector('dialog#reel').open, null, { timeout: 3000 })
    .catch(() => { throw new Error('dialog#reel did not open'); });
  reelOpened = true;
  const src = await page.evaluate(() => (document.querySelector('#reel-frame iframe') || {}).src || '');
  const id = href.split('v=')[1];
  check(src.startsWith('https://www.youtube-nocookie.com/embed/' + id), `the player loads ${src || 'nothing'}, not film ${id}`);
  return `open, plays ${id} in place`;
});

await step('film: Close shuts dialog#reel', async () => {
  if (!embeds) throw new Skip('Artifact build links out; there is no in-page player');
  check(reelOpened, 'dialog#reel was not open');
  const close = page.locator('dialog#reel button', { hasText: /close/i }).first();
  check(await close.count(), 'no Close button in dialog#reel');
  await close.click();
  await page.waitForFunction(() => !document.querySelector('dialog#reel').open, null, { timeout: 3000 })
    .catch(() => { throw new Error('dialog#reel stayed open'); });
  const left = await page.evaluate(() => document.querySelectorAll('#reel-frame iframe').length);
  check(left === 0, 'the player was not removed, so the film keeps playing');
  return 'closed, player removed';
});

// "Watch the films" opens the three films to choose from, inside the same dialog.
await step('film: Watch the films opens the picker; Escape closes', async () => {
  await go('#/', homeView);
  await page.evaluate(() => { const v = document.querySelector('main.view:not([hidden])'); v.style.scrollBehavior = 'auto'; v.scrollTop = 0; });
  await page.waitForTimeout(600);
  const btn = page.locator(`main.view[data-view="${homeView}"] [data-reels]`, { hasText: /watch the films/i }).first();
  check(await btn.count(), 'no "Watch the films" control on #/');
  await btn.focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('dialog#reel').open, null, { timeout: 3000 })
    .catch(() => { throw new Error('dialog#reel did not open from the keyboard'); });
  const st = await page.evaluate(() => ({
    focus: document.activeElement && (document.activeElement.id || document.activeElement.tagName),
    picker: !document.querySelector('#reel-pick').hidden,
    films: [...document.querySelectorAll('#reel-pick a.film[data-play]')].map((a) => a.dataset.play).join(),
    frames: document.querySelectorAll('#reel-frame > *').length,
  }));
  check(st.focus === 'reel-x', `focus opened on ${st.focus}, not the Close button`);
  check(st.picker, 'the film picker is hidden');
  check(st.films === 'hortus,machina,arca', `the picker offers ${st.films || 'no films'}, not hortus, machina, arca`);
  check(st.frames === 0, 'a film started before one was chosen');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog#reel').open, null, { timeout: 3000 })
    .catch(() => { throw new Error('Escape did not close dialog#reel'); });
  const back = await page.evaluate(() => document.activeElement && document.activeElement.matches('[data-reels]'));
  check(back, 'focus did not return to "Watch the films"');
  return 'three films, focus on Close, Escape closes, focus returns';
});

await step('film: a film chosen in the picker plays in place', async () => {
  if (!embeds) throw new Skip('Artifact build links out; there is no in-page player');
  await go('#/', homeView);
  await page.locator(`main.view[data-view="${homeView}"] [data-reels]`).first().click();
  await page.waitForFunction(() => document.querySelector('dialog#reel').open, null, { timeout: 3000 })
    .catch(() => { throw new Error('dialog#reel did not open'); });
  const card = page.locator('#reel-pick a.film[data-play="arca"]');
  const href = await card.getAttribute('href');
  await card.click();
  await page.waitForTimeout(300);
  const st = await page.evaluate(() => ({
    picker: !document.querySelector('#reel-pick').hidden,
    src: (document.querySelector('#reel-frame iframe') || {}).src || '',
  }));
  const id = (href || '').split('v=')[1];
  check(!st.picker, 'the picker stayed up over the film');
  check(st.src.startsWith('https://www.youtube-nocookie.com/embed/' + id), `the player loads ${st.src || 'nothing'}, not film ${id}`);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog#reel').open, null, { timeout: 3000 })
    .catch(() => { throw new Error('Escape did not close dialog#reel'); });
  return `plays ${id}`;
});

// The header names where you are inside a page, like a directory; the house itself shows no trail.
await step('header: the trail names the page', async () => {
  const trail = () => page.evaluate(() => { const n = document.querySelector('#crumbs'); return n && !n.hidden ? [...n.querySelectorAll('li')].map((li) => li.textContent.trim()).join(' / ') : ''; });
  await go('#/', homeView);
  const home = await trail();
  check(home === '', `the house shows a trail: ${home}`);
  const seen = [];
  for (const [hash, view, want] of [['#/machina', 'machina', /^home \/ machina$/i], ['#/hortus', 'hortus', /^home \/ hortus$/i], ['#/arca', 'arca', /^home \/ arca$/i], ['#/start', 'start', /^home \/ start a project$/i]]) {
    await go(hash, view);
    const t = await trail();
    check(want.test(t), `${hash} shows "${t || 'no trail'}"`);
    seen.push(t);
  }
  await page.locator('#crumbs a', { hasText: /^home$/i }).click();
  await waitView(homeView);
  return seen.join(' · ');
});

// The case cover footage (site/media.json → covers) loops for as long as the cover is on screen. It has no pause control,
// by the owner's choice.
await step('case: the cover footage loops, with no pause control', async () => {
  await go('#/machina', 'machina');
  const playable = await page.evaluate(() => {
    let c = {};
    try { c = (JSON.parse(document.querySelector('#lf-media').textContent).covers || {}).machina || {}; } catch { /* reported below */ }
    const v = document.createElement('video');
    return (c.av1 && v.canPlayType('video/mp4; codecs="av01.0.12M.10"')) || (c.mp4 && v.canPlayType('video/mp4; codecs="avc1.640028"')) ? Object.keys(c).join(' + ') : '';
  });
  check(!(await page.locator('[data-footage]').count()), 'a footage control is back on the page');
  if (!playable) {
    throw new Skip('this browser decodes neither copy of the footage (the Artifact carries H.264 only); the poster stands');
  }
  const read = () => page.evaluate(() => {
    const v = document.querySelector('#view-machina .case-cover video.cover-v');
    return v ? { src: (v.currentSrc || '').split('/').pop().split('?')[0], t: +v.currentTime.toFixed(2), paused: v.paused, loop: v.loop,
      backdrop: v.closest('.cover-bg').getAttribute('aria-hidden') } : null;
  });
  await page.waitForTimeout(1500);
  let st = await read();
  check(st, 'no footage in the Machina cover');
  check(st.src && !st.paused, `the Machina footage is not playing (src ${st.src || 'none'}, paused ${st.paused})`);
  check(st.loop, 'the Machina footage does not loop');
  check(st.backdrop === 'true', 'the cover backdrop is not aria-hidden');
  const file = st.src;
  // The footage runs 10 s; still playing 11.5 s after the cover opened means it went round.
  await page.waitForTimeout(10000);
  st = await read();
  check(!st.paused, `the footage stopped at ${st.t} s instead of looping`);
  const looped = st.t;
  // While a film plays over the cover, the footage rests; closing the film brings it back.
  if (embeds) {
    await page.locator('#view-machina .case-cover [data-play]').click();
    await page.waitForFunction(() => document.querySelector('dialog#reel').open, null, { timeout: 3000 })
      .catch(() => { throw new Error('"Play the film" on the cover did not open dialog#reel'); });
    await page.waitForTimeout(300);
    st = await read();
    check(st.paused, 'the footage kept playing behind the film');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog#reel').open, null, { timeout: 3000 });
    await page.waitForTimeout(300);
    st = await read();
    check(!st.paused, 'the footage did not come back after the film closed');
  }
  // Off its screen the footage rests.
  await page.evaluate(() => { const v = document.querySelector('#view-machina'); v.style.scrollBehavior = 'auto'; v.scrollTop = v.querySelectorAll('.screen')[1].offsetTop; });
  await page.waitForTimeout(800);
  st = await read();
  check(st.paused, 'the footage kept playing after its cover scrolled away');
  await page.evaluate(() => { const v = document.querySelector('#view-machina'); v.scrollTop = 0; });
  return `${file} (${playable}), looped (t ${looped} s at 11.5 s), rests off screen`;
});

// The walk (site/explore.js): the hero's Explore opens it at the house, a case cover opens its own wing. While it is open
// the header keeps its trail (Home / Explore / wing), trades Start a project for the settings, and the page is dark.
const crumbTrail = () => page.evaluate(() => { const n = document.querySelector('#crumbs'); return n && !n.hidden ? [...n.querySelectorAll('li')].map((li) => li.textContent.trim()).join(' / ') : ''; });
let themeBeforeWalk = null;
await step('explore: Explore opens the walk at the house', async () => {
  await go('#/', homeView);
  themeBeforeWalk = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await page.evaluate(() => { const v = document.querySelector('main.view:not([hidden])'); v.style.scrollBehavior = 'auto'; v.scrollTop = 0; });
  const cta = page.locator(`main.view[data-view="${homeView}"] .hero a[href="#/explore"]`);
  check(await cta.count(), 'no Explore link in the hero');
  await cta.first().click();
  await waitView('explore');
  const st = await page.evaluate(() => {
    const shown = (s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0; };
    return { hash: location.hash, menu: shown('#xp-menu'), cta: shown('header .links a.btn'), theme: document.documentElement.getAttribute('data-theme') };
  });
  const trail = await crumbTrail();
  check(st.hash === '#/explore', `hash is ${st.hash}`);
  check(/^home \/ explore$/i.test(trail), `the trail reads "${trail || 'nothing'}"`);
  check(st.menu && !st.cta, `the header shows ${st.menu ? 'the settings' : 'no settings'} and ${st.cta ? 'still Start a project' : 'no Start a project'}`);
  check(st.theme === 'dark', `the walk is not dark (data-theme ${st.theme})`);
  await page.waitForFunction(() => !document.querySelector('#xp-go-quiet').disabled || !document.querySelector('#xp-home').hidden, null, { timeout: 30000 })
    .catch(() => { throw new Error('the walk did not finish loading in 30 s'); });
  const failed = await page.evaluate(() => (!document.querySelector('#xp-home').hidden ? document.querySelector('#xp-note').textContent : ''));
  check(!failed, `the walk could not start: ${failed}`);
  await page.locator('#xp-go-quiet').click();
  await page.waitForTimeout(800);
  const p = await page.evaluate(() => window.lfExplore.peek());
  check(p.started && p.world === 'hub', `after Enter in silence: started ${p.started}, world ${p.world || 'none'}`);
  return `the house, trail ${trail}, settings in the header, dark`;
});

await step('explore: a case cover opens its wing in the walk', async () => {
  await go('#/arca', 'arca');
  const link = page.locator('#view-arca .case-cover a[href="#/explore/arca"]');
  check(await link.count(), 'no Explore link on the Arca cover');
  await link.click();
  await waitView('explore');
  await page.waitForFunction(() => window.lfExplore.peek().world === 'arca', null, { timeout: 15000 }).catch(() => { throw new Error('the walk did not open Arca'); });
  const trail = await crumbTrail(), title = await page.title();
  check(/^home \/ explore \/ arca$/i.test(trail), `the trail reads "${trail}"`);
  check(/arca/i.test(title), `the title is "${title}"`);
  return `${trail}, "${title}"`;
});

await step('explore: the settings open from the header and close on Escape', async () => {
  await page.locator('#xp-menu').click();
  await page.waitForFunction(() => document.querySelector('#xp-set').open, null, { timeout: 2000 }).catch(() => { throw new Error('the settings did not open'); });
  const sw = page.locator('#xp-set [data-opt="auto"]');
  const before = await sw.getAttribute('aria-checked');
  await sw.click();
  const after = await sw.getAttribute('aria-checked'), auto = await page.evaluate(() => window.lfExplore.peek().auto);
  check(before !== after, `Auto walk stayed ${after}`);
  check(String(auto) === after, `the switch reads ${after} but the walk says ${auto}`);
  await sw.click(); // back as it was
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#xp-set').open, null, { timeout: 2000 }).catch(() => { throw new Error('Escape did not close the settings'); });
  // The dialog's close event, which resets the menu, arrives a task after the dialog shuts.
  await page.waitForFunction(() => document.querySelector('#xp-menu').getAttribute('aria-expanded') === 'false', null, { timeout: 1000 }).catch(() => {});
  const expanded = await page.locator('#xp-menu').getAttribute('aria-expanded');
  check(expanded === 'false', `the menu still says aria-expanded ${expanded}`);
  return 'opens, Auto walk switches both ways, Escape closes';
});

await step('explore: leaving gives the header and the theme back', async () => {
  await page.locator('#crumbs a', { hasText: /^home$/i }).click();
  await waitView(homeView);
  const st = await page.evaluate(() => ({
    cta: getComputedStyle(document.querySelector('header .links a.btn')).display !== 'none',
    menu: getComputedStyle(document.querySelector('#xp-menu')).display,
    walking: window.lfExplore.peek().active,
    theme: document.documentElement.getAttribute('data-theme'),
  }));
  check(st.cta && st.menu === 'none', `the header shows Start a project ${st.cta ? 'yes' : 'no'}, the settings ${st.menu}`);
  check(!st.walking, 'the walk still runs behind the house');
  check(st.theme === themeBeforeWalk, `data-theme is ${st.theme}, was ${themeBeforeWalk} before the walk`);
  return 'Start a project back, the walk at rest, the theme as it was';
});

await step('nav: Skip to content moves focus into the view', async () => {
  await go('#/machina', 'machina');
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('a.skip').focus());
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => ({ hash: location.hash, focus: document.activeElement && document.activeElement.id }));
  check(r.hash === '#/machina', `the skip link changed the route to ${r.hash}`);
  check(r.focus === 'view-machina', `focus went to ${r.focus || 'nothing'}`);
  return 'focus on #view-machina, route kept';
});

await step('motion: plates and the wing loops come to rest', async () => {
  await go('#/', homeView);
  await page.evaluate(() => { const v = document.querySelector('main.view:not([hidden])'); v.style.scrollBehavior = 'auto'; v.scrollTop = 0; });
  await page.mouse.move(5, 5);
  await page.waitForTimeout(6500);
  const hash = () => page.evaluate(() => [...document.querySelectorAll('.hero canvas.plate')].map((c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) | 0; return h; }).join());
  const a = await hash(); await page.waitForTimeout(600); const b = await hash();
  check(a === b, 'the hero plates still change 6 s after the pointer stopped');
  // Each wing loop plays once when its screen becomes active, then rests on media.json's hold frame (3.6 s).
  const rests = [];
  for (const wing of ['hortus', 'machina', 'arca']) {
    const loop = await page.evaluate(async (w) => {
      const v = document.querySelector('#view-home'); const s = document.getElementById(w);
      if (!s) return null;
      v.scrollTop = s.offsetTop;
      await new Promise((r) => setTimeout(r, 6500));
      const el = document.querySelector(`video[data-loop="${w}"]`);
      return el ? { paused: el.paused, t: +el.currentTime.toFixed(2), src: !!el.currentSrc } : null;
    }, wing);
    if (loop && loop.src) check(loop.paused && loop.t > 3 && loop.t < 4.5, `the ${wing} loop did not rest on its hold frame (paused ${loop.paused}, t ${loop.t})`);
    rests.push(`${wing} ${loop && loop.src ? 'rests at ' + loop.t + ' s' : 'not loaded'}`);
  }
  return `plates still; ${rests.join(', ')}`;
});

const brief = {
  name: 'Smoke Test',
  email: 'qa@example.com',
  text: 'A private inference server for a small clinic. Smoke test.',
  timeline: '',
};
let briefSent = false;
// The brief endpoint is mocked: nothing is emailed. "sent" answers {ok:true} when the post passes the server's
// 3 s fill-time rule (api/brief.mjs, MIN_FILL); "refused" answers {ok:false}. Both use a 200, so the fallback is
// exercised without an HTTP error landing in the console check.
const endpoint = { mode: 'sent', posts: [] };
const briefUrl = await page.evaluate(() => { try { return JSON.parse(document.getElementById('lf-media').textContent).brief || ''; } catch (_) { return ''; } });
if (briefUrl) {
  await page.route('**' + briefUrl, async (route) => {
    const post = route.request().postDataJSON();
    endpoint.posts.push(post);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: endpoint.mode === 'sent' && post.elapsed >= 3000 }) });
  });
}
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
  const title = (await page.locator('#sent-title').textContent()).trim();
  check(title === (briefUrl ? 'Brief sent.' : 'Brief ready.'), `#sent-title reads "${title}"`);
  return `"${title}", timeline "${brief.timeline}"`;
});

await step('brief: the endpoint receives the brief', async () => {
  if (!briefUrl) throw new Skip('no endpoint in this page (the Artifact keeps copy and mailto)');
  check(briefSent, 'the brief was not sent');
  check(endpoint.posts.length === 1, `${endpoint.posts.length} posts to ${briefUrl}`);
  const p = endpoint.posts[0];
  const bad = Object.entries({ wing: /machina/i.test(p.wing), name: p.name === brief.name, email: p.email === brief.email,
    timeline: p.timeline === brief.timeline, brief: p.brief === brief.text, website: p.website === '', elapsed: Number.isFinite(p.elapsed) && p.elapsed >= 0 })
    .filter(([, ok]) => !ok).map(([k]) => k);
  check(!bad.length, `wrong fields: ${bad.join(', ')} in ${JSON.stringify(p).slice(0, 200)}`);
  return `posted ${Object.keys(p).length} fields`;
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

await step('brief: a refused send falls back to copy and mailto', async () => {
  if (!briefUrl) throw new Skip('no endpoint in this page');
  check(briefSent, 'the brief was not sent');
  endpoint.mode = 'refused';
  await page.locator('#brief-again').click();
  await page.locator('form#brief').waitFor({ state: 'visible', timeout: 3000 });
  await page.locator('form#brief [type="submit"]').first().click();
  await page.locator('#sent').waitFor({ state: 'visible', timeout: 4000 });
  const title = (await page.locator('#sent-title').textContent()).trim();
  const lead = (await page.locator('#sent-lead').textContent()).trim();
  check(title === 'Brief ready.', `#sent-title reads "${title}"`);
  check(/copy the brief/i.test(lead), `the lead does not offer the copy: "${lead}"`);
  check(endpoint.posts.length === 2, `${endpoint.posts.length} posts`);
  return `"${title}"`;
});

// The Hortus hardware shop: in the Artifact and dist/preview; absent from dist/web while site/shop.json is not live.
const SHOP = await page.evaluate(() => { try { return JSON.parse(document.getElementById('lf-shop').textContent); } catch (_) { return null; } });
const noShop = () => new Skip('no shop in this page (site/shop.json is not live; run with --dir dist/preview)');
const money = (n) => SHOP.symbol + n.toLocaleString('en-GB');
const basketState = () => page.evaluate(() => ({
  open: !!document.querySelector('dialog#basket[open]'),
  lines: document.querySelectorAll('#basket-lines li').length,
  total: (document.getElementById('basket-total') || {}).textContent || '',
  badge: (() => { const b = document.getElementById('basket-count'); return b && !b.hidden ? b.textContent : ''; })(),
  qty: [...document.querySelectorAll('#basket-lines .qv')].map((q) => q.textContent).join(','),
  focus: document.activeElement ? (document.activeElement.id || document.activeElement.className || document.activeElement.tagName) : '',
  stored: (() => { try { return localStorage.getItem('lf-basket'); } catch (_) { return 'blocked'; } })(),
}));

await step('shop: Hortus case to the hardware to a product', async () => {
  if (!SHOP) throw noShop();
  await go('#/hortus', 'hortus');
  const link = page.locator('main.view[data-view="hortus"] a[href="#/hardware"]').first();
  check(await link.count(), 'no link to #/hardware on the Hortus case');
  await bringIntoView(link);
  await link.click();
  await waitView('hardware');
  const card = page.locator('main.view[data-view="hardware"] .good .gn a').first();
  check(await card.count(), 'no product cards on #/hardware');
  const href = await card.getAttribute('href');
  await bringIntoView(card);
  await card.click();
  await waitView('hw-' + href.replace('#/hardware/', ''));
  const title = await page.title();
  check(!/^lastfomo research house$/.test(title), `the product page kept the house title "${title}"`);
  return `${href}, “${title}”`;
});

await step('shop: add, change the quantity, keep the focus, remove', async () => {
  if (!SHOP) throw noShop();
  const p = SHOP.products[0];
  // A clean basket: storage cleared, then the page loaded fresh on the product.
  await page.evaluate(() => { try { localStorage.removeItem('lf-basket'); } catch (_) { /* nothing to clear */ } });
  await page.goto('about:blank');
  await page.goto(base + '#/hardware/' + p.slug, { waitUntil: 'load', timeout: 60000 });
  await waitView('hw-' + p.slug);
  const add = page.locator(`main.view[data-view="hw-${p.slug}"] button[data-add="${p.slug}"]`).first();
  check(await add.count(), `no Add to basket button for ${p.slug}`);
  await add.click();
  await page.locator('dialog#basket[open]').waitFor({ timeout: 3000 }).catch(() => { throw new Error('the basket did not open'); });
  let s = await basketState();
  check(s.lines === 1 && s.total.trim() === money(p.price) && s.badge === '1', `after one add: ${JSON.stringify(s)}`);
  await page.locator(`#basket-lines button[data-slug="${p.slug}"][data-q="1"]`).click();
  s = await basketState();
  check(s.qty === '2' && s.total.trim() === money(p.price * 2) && s.badge === '2', `after one more: ${JSON.stringify(s)}`);
  check(/\bq\b/.test(s.focus), `focus left the stepper (on ${s.focus})`);
  await page.locator(`#basket-lines button[data-slug="${p.slug}"][data-q="-1"]`).click();
  s = await basketState();
  check(s.qty === '1' && JSON.parse(s.stored || '{}')[p.slug] === 1, `after one fewer: ${JSON.stringify(s)}`);
  await page.keyboard.press('Escape');
  s = await basketState();
  const back = await page.evaluate(() => (document.activeElement && document.activeElement.dataset.add) || '');
  check(!s.open && back === p.slug, `Escape: open ${s.open}, focus on ${back || s.focus}`);
  // Remove empties the basket and leaves the empty note.
  await add.click();
  await page.locator(`#basket-lines button[data-rm="${p.slug}"]`).click();
  s = await basketState();
  const empty = await page.locator('#basket-empty').isVisible();
  check(s.lines === 0 && !s.badge && empty, `after remove: ${JSON.stringify(s)}`);
  await page.keyboard.press('Escape');
  return `${p.name}: 1, 2, 1, removed; Escape returns focus to Add to basket`;
});

let orderText = '';
await step('shop: the basket survives a reload and composes the order', async () => {
  if (!SHOP) throw noShop();
  const [a, b] = SHOP.products;
  await go('#/hardware/' + a.slug, 'hw-' + a.slug);
  await page.locator(`main.view[data-view="hw-${a.slug}"] button[data-add="${a.slug}"]`).first().click();
  await page.keyboard.press('Escape');
  await go('#/hardware/' + b.slug, 'hw-' + b.slug);
  await page.locator(`main.view[data-view="hw-${b.slug}"] button[data-add="${b.slug}"]`).first().click();
  await page.keyboard.press('Escape');
  await page.reload({ waitUntil: 'load' });
  await waitView('hw-' + b.slug);
  await page.locator('header .basket-link').click();
  await page.locator('dialog#basket[open]').waitFor({ timeout: 3000 });
  const s = await basketState();
  check(s.lines === 2 && s.badge === '2' && s.total.trim() === money(a.price + b.price), `after reload: ${JSON.stringify(s)}`);
  const f = page.locator('form#order');
  await f.locator('[name="name"]').fill('Smoke Test');
  await f.locator('[name="email"]').fill('qa@example.com');
  await f.locator('[name="place"]').fill('Tbilisi, Georgia');
  await f.locator('[type="submit"]').click();
  await page.locator('#order-sent').waitFor({ state: 'visible', timeout: 3000 }).catch(() => { throw new Error('#order-sent did not show'); });
  orderText = await page.locator('#order-text').textContent();
  const want = ['1 × ' + a.name, '1 × ' + b.name, 'Subtotal: ' + money(a.price + b.price), 'Smoke Test', 'qa@example.com', 'Tbilisi, Georgia'];
  const missing = want.filter((w) => !orderText.includes(w));
  check(!missing.length, `the order lacks: ${missing.join('; ')}`);
  await page.keyboard.press('Escape');
  return `${orderText.split('\n').length} lines, subtotal ${money(a.price + b.price)}`;
});

// The Machina and Arca previews: a machine chosen in the price study tells its story, the Arca tabs swap gold for art,
// and the gold chart reads out a month under the pointer.
await step('previews: the Machina study and the Arca tabs answer in words', async () => {
  if (!(await page.locator('#machina-build').count())) throw new Skip('no previews in this page (they ride the shop; run with --dir dist/preview)');
  await go('#/machina', 'machina');
  const study = page.locator('#machina-build');
  await bringIntoView(study);
  const live = () => study.locator('.live').textContent();
  const outlook = await live();
  const row = study.locator('li .db-r').nth(2);
  await row.click();
  const told = await live();
  check(told !== outlook && told === (await row.getAttribute('data-story')) && (await row.getAttribute('aria-pressed')) === 'true', `the chosen machine said "${told}"`);
  await row.click();
  check((await live()) === outlook, 'choosing the machine again did not bring the outlook back');
  await go('#/arca', 'arca');
  const vault = page.locator('#arca-vault');
  await bringIntoView(vault);
  const plot = vault.locator('.gl-plot');
  const box = await plot.boundingBox();
  await page.mouse.move(box.x + box.width * 0.12, box.y + box.height / 2);
  const tip = await vault.locator('.gl-tip').evaluate((t) => (t.hidden ? '' : t.textContent));
  check(/\$\d/.test(tip), `the gold chart's tooltip reads "${tip}"`);
  await vault.locator('[role="tab"]').nth(1).click();
  const st = await vault.evaluate((v) => ({ gold: v.querySelector('#arca-gold').hidden, art: v.querySelector('#arca-art').hidden, live: v.querySelector('.live').textContent, sel: v.querySelector('[role="tab"][aria-selected="true"]').textContent }));
  check(st.gold && !st.art && /billion/.test(st.live), `after the Art tab: ${JSON.stringify(st)}`);
  await page.keyboard.press('ArrowLeft');
  const back = await vault.evaluate((v) => !v.querySelector('#arca-gold').hidden && document.activeElement.getAttribute('role') === 'tab');
  check(back, 'the left arrow did not bring the Gold tab back');
  return `story "${told.slice(0, 40)}…", tooltip "${tip}", tabs swap`;
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
