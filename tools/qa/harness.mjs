// Shared plumbing for the visual QA tools (shoot.mjs, smoke.mjs).
// No npm dependencies: Playwright is loaded from the global install.
//
// - startServer(): a tiny static server on a free port (Range support for video)
// - createFontRouter(): Google Fonts served from a local cache in out/.fontcache
// - attachCollectors(): console errors, page errors, failed requests
// - parseArgs(), resolveTarget(): the shared command line

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { readFile, writeFile, rename, mkdir, stat, rm } from 'node:fs/promises';
import { dirname, resolve, join, extname, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFile, execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT = join(REPO, 'out');
export const QA_OUT = join(OUT, 'qa');
export const FONT_CACHE = join(OUT, '.fontcache');
export const DEFAULT_DIR = join(REPO, 'dist', 'web');

export const ROUTES = ['#/', '#/machina', '#/hortus', '#/arca', '#/start'];
export const VIEWPORTS = {
  desktop: { width: 1440, height: 900, isMobile: false, hasTouch: false },
  phone: { width: 390, height: 844, isMobile: true, hasTouch: true },
};
export const SCHEMES = ['dark', 'light'];

// A current desktop Chrome UA, so Google Fonts answers with woff2.
export const CHROME_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

/* ------------------------------------------------------------------ playwright */

export function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const tried = [];
  const attempt = (id) => {
    tried.push(id);
    try { return require(id); } catch { return null; }
  };
  const fixed = [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/node22/lib/node_modules/playwright'];
  for (const id of fixed.filter(Boolean)) {
    const pw = attempt(id);
    if (pw) return pw;
  }
  try {
    const root = execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const pw = attempt(join(root, 'playwright'));
    if (pw) return pw;
  } catch { /* npm not on PATH */ }
  throw new Error(`Playwright not found (tried ${tried.join(', ')}). Set PLAYWRIGHT_MODULE to its folder.`);
}

/* ------------------------------------------------------------------ arguments */

// parseArgs(argv, { string: [...], boolean: [...] }) -> { name: value }
export function parseArgs(argv, spec) {
  const strings = new Set(spec.string || []);
  const booleans = new Set(spec.boolean || []);
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) throw new Error(`Unexpected argument: ${a}`);
    let [name, value] = a.slice(2).split(/=(.*)/s, 2);
    if (booleans.has(name)) { out[name] = value === undefined ? true : value !== 'false'; continue; }
    if (!strings.has(name)) throw new Error(`Unknown option: --${name}`);
    if (value === undefined) {
      value = argv[++i];
      if (value === undefined) throw new Error(`--${name} needs a value`);
    }
    out[name] = value;
  }
  return out;
}

export function splitList(v) {
  return String(v).split(',').map((s) => s.trim()).filter(Boolean);
}

// "#/", "/", "", "home" -> "#/"; "machina", "/machina", "#/machina" -> "#/machina"
export function normaliseRoute(r) {
  let s = String(r).trim().replace(/^#/, '').replace(/^\//, '');
  if (s === 'home') s = '';
  return '#/' + s;
}

export function routeSlug(route) {
  const s = normaliseRoute(route).slice(2).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  return s || 'home';
}

// --html <file> serves the file's folder and opens that file;
// otherwise --dir <path> (default dist/web) and its index.html.
export function resolveTarget(args) {
  if (args.html) {
    const file = resolve(String(args.html));
    if (!existsSync(file) || !statSync(file).isFile()) throw new Error(`No such file: ${file}`);
    return { dir: dirname(file), page: basename(file), file };
  }
  const dir = resolve(String(args.dir || DEFAULT_DIR));
  const file = join(dir, 'index.html');
  if (!existsSync(file)) {
    throw new Error(`${file} not found. Run node tools/build.mjs first, or pass --dir <path> or --html <file>.`);
  }
  return { dir, page: 'index.html', file };
}

/* ------------------------------------------------------------------ static server */

const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.xml': 'application/xml',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.vtt': 'text/vtt', '.wasm': 'application/wasm', '.pdf': 'application/pdf',
};

// startServer(root, { '/__qa/': '/abs/dir' }) -> { url, port, close() }
export function startServer(root, mounts = {}) {
  const base = resolve(root);
  const table = Object.entries(mounts).map(([prefix, dir]) => [prefix, resolve(dir)]);
  const server = createServer(async (req, res) => {
    try {
      let pathname;
      try { pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname); }
      catch { res.writeHead(400); res.end('Bad request'); return; }
      let dir = base;
      for (const [prefix, mdir] of table) {
        if (pathname.startsWith(prefix)) { dir = mdir; pathname = '/' + pathname.slice(prefix.length); break; }
      }
      let file = resolve(dir, '.' + pathname);
      if (file !== dir && !file.startsWith(dir + sep)) { res.writeHead(403); res.end('Forbidden'); return; }
      let st = await stat(file).catch(() => null);
      if (st && st.isDirectory()) { file = join(file, 'index.html'); st = await stat(file).catch(() => null); }
      if (!st || !st.isFile()) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
        res.end('Not found');
        return;
      }
      const headers = {
        'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
        'cache-control': 'no-store',
        'accept-ranges': 'bytes',
      };
      const m = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (m && (m[1] !== '' || m[2] !== '')) {
        let start, end;
        if (m[1] === '') { start = Math.max(0, st.size - Number(m[2])); end = st.size - 1; }
        else { start = Number(m[1]); end = m[2] === '' ? st.size - 1 : Math.min(Number(m[2]), st.size - 1); }
        if (start > end || start >= st.size) {
          res.writeHead(416, { 'content-range': `bytes */${st.size}` });
          res.end();
          return;
        }
        res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${st.size}`, 'content-length': end - start + 1 });
        if (req.method === 'HEAD') { res.end(); return; }
        createReadStream(file, { start, end }).on('error', () => res.destroy()).pipe(res);
        return;
      }
      res.writeHead(200, { ...headers, 'content-length': st.size });
      if (req.method === 'HEAD') { res.end(); return; }
      createReadStream(file).on('error', () => res.destroy()).pipe(res);
    } catch (e) {
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(String(e && e.message || e));
    }
  });
  return new Promise((ok, ko) => {
    server.once('error', ko);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      ok({
        url: `http://127.0.0.1:${port}`,
        port,
        close: () => new Promise((done) => {
          if (server.closeAllConnections) server.closeAllConnections();
          server.close(() => done());
        }),
      });
    });
  });
}

/* ------------------------------------------------------------------ fonts */

export const FONT_HOSTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

function guessType(url) {
  if (/fonts\.googleapis\.com\/css/.test(url)) return 'text/css; charset=utf-8';
  const ext = extname(new URL(url).pathname).toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

function curlTo(url, dest) {
  return new Promise((ok, ko) => {
    execFile(
      'curl',
      ['-sS', '-L', '--fail', '--max-time', '40', '-A', CHROME_UA, '-o', dest, '-w', '%{content_type}', url],
      { timeout: 45000 },
      (err, stdout, stderr) => (err ? ko(new Error(String(stderr || err.message).trim())) : ok(String(stdout).trim())),
    );
  });
}

async function fetchTo(url, dest) {
  const r = await fetch(url, { headers: { 'user-agent': CHROME_UA }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  await writeFile(dest, Buffer.from(await r.arrayBuffer()));
  return r.headers.get('content-type') || '';
}

// Fetch once, keep forever. curl first (it honours HTTPS_PROXY and the system
// CA store), Node fetch second (fine where no proxy sits in between).
async function download(url, dest) {
  try {
    return await curlTo(url, dest);
  } catch (e1) {
    try {
      return await fetchTo(url, dest);
    } catch (e2) {
      await rm(dest, { force: true });
      throw new Error(`curl: ${e1.message}; fetch: ${e2.message}`);
    }
  }
}

// Routes Google Fonts requests through a local cache, so headless Chromium never
// needs its own TLS to Google (it fails behind an intercepting proxy).
export function createFontRouter({ cacheDir = FONT_CACHE } = {}) {
  const stats = { fromCache: 0, downloaded: 0, failed: [] };
  const inflight = new Map();

  async function getAsset(url) {
    const key = createHash('sha256').update(url).digest('hex').slice(0, 32);
    const bin = join(cacheDir, key + '.bin');
    const meta = join(cacheDir, key + '.json');
    try {
      const m = JSON.parse(await readFile(meta, 'utf8'));
      const body = await readFile(bin);
      stats.fromCache++;
      return { body, contentType: m.contentType };
    } catch { /* not cached yet */ }
    if (!inflight.has(key)) {
      inflight.set(key, (async () => {
        await mkdir(cacheDir, { recursive: true });
        const tmp = `${bin}.${process.pid}.${Date.now()}.tmp`;
        let contentType = await download(url, tmp);
        if (!contentType || /octet-stream/.test(contentType)) contentType = guessType(url);
        await rename(tmp, bin);
        await writeFile(meta, JSON.stringify({ url, contentType, fetchedAt: new Date().toISOString() }, null, 2) + '\n');
        stats.downloaded++;
        return { body: await readFile(bin), contentType };
      })().finally(() => inflight.delete(key)));
    }
    return inflight.get(key);
  }

  async function handler(route) {
    const url = route.request().url();
    let asset;
    try {
      asset = await getAsset(url);
    } catch (e) {
      stats.failed.push({ url, error: String(e.message || e).slice(0, 300) });
      try { await route.continue(); } catch { /* page gone */ }
      return;
    }
    try {
      await route.fulfill({
        status: 200,
        body: asset.body,
        headers: {
          'content-type': asset.contentType,
          'access-control-allow-origin': '*',
          'timing-allow-origin': '*',
          'cache-control': 'public, max-age=31536000',
        },
      });
    } catch { /* page closed mid-request */ }
  }

  return { stats, handler, install: (context) => context.route(FONT_HOSTS, handler) };
}

/* ------------------------------------------------------------------ collectors */

// Videos that are not uploaded yet (the original page points at dead /_blob/ URLs,
// the source marks them null in media.json). Their misses are expected.
export function isExpectedMissing(url, resourceType) {
  return resourceType === 'media'
    || /\/_blob\//.test(url)
    || /\.(mp4|m4v|webm|mov|ogv|m3u8)(?:[?#]|$)/i.test(url);
}

const short = (u) => (u && u.length > 200 ? u.slice(0, 197) + '...' : u);

// Pushes into sink.consoleErrors, sink.pageErrors, sink.failedRequests and
// sink.expectedMissing. Set sink.closing = true before closing the page.
export function attachCollectors(page, sink) {
  sink.consoleErrors ||= [];
  sink.pageErrors ||= [];
  sink.failedRequests ||= [];
  sink.expectedMissing ||= [];
  const expected = (url, how) => {
    const hit = sink.expectedMissing.find((x) => x.url === short(url));
    if (hit) { hit.count++; if (!hit.how.includes(how)) hit.how.push(how); }
    else sink.expectedMissing.push({ url: short(url), how: [how], count: 1 });
  };
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const loc = msg.location() || {};
    const text = msg.text();
    if (/^Failed to load resource/.test(text) && loc.url && isExpectedMissing(loc.url)) { expected(loc.url, 'console'); return; }
    sink.consoleErrors.push({ text: text.slice(0, 500), url: short(loc.url || ''), line: loc.lineNumber ?? null });
  });
  page.on('pageerror', (err) => {
    sink.pageErrors.push({
      message: String(err.message || err).slice(0, 500),
      stack: String(err.stack || '').split('\n').slice(0, 5).join('\n'),
    });
  });
  page.on('requestfailed', (req) => {
    if (sink.closing) return;
    const url = req.url();
    const type = req.resourceType();
    const error = (req.failure() && req.failure().errorText) || 'failed';
    if (isExpectedMissing(url, type)) { expected(url, error); return; }
    sink.failedRequests.push({ url: short(url), method: req.method(), type, error });
  });
  page.on('response', (res) => {
    if (res.status() < 400) return;
    const req = res.request();
    const url = res.url();
    if (isExpectedMissing(url, req.resourceType())) { expected(url, 'HTTP ' + res.status()); return; }
    sink.failedRequests.push({ url: short(url), method: req.method(), type: req.resourceType(), status: res.status() });
  });
}

/* ------------------------------------------------------------------ small things */

export const pad2 = (n) => String(n).padStart(2, '0');

export async function pool(items, size, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const k = next++;
      out[k] = await fn(items[k], k);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(size, items.length)) }, worker));
  return out;
}

// The family names the page should load, with the weights it sets them in.
// The first weight is the one that must load.
export const BRAND_FONTS = [
  { family: 'Geist', weights: ['400', '300'], fallback: 'sans-serif' },
  { family: 'Geist Mono', weights: ['500', '400'], fallback: 'monospace' },
  { family: 'Jacquard 24', weights: ['400'], fallback: 'monospace' },
];

// Runs in the page: did each brand font actually load where the page uses it?
// Returns { [family]: { used, loaded, check, faces, loadedOnDemand, renderDelta } }.
export async function probeFonts(page, { forceLoad = true } = {}) {
  return page.evaluate(async ({ fonts, forceLoad }) => {
    await document.fonts.ready;
    const clean = (s) => String(s || '').trim().replace(/^["']|["']$/g, '');
    const used = {};
    for (const el of document.querySelectorAll('body *')) {
      let hasText = false;
      for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) { hasText = true; break; }
      if (!hasText || !el.getClientRects().length) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden') continue;
      const fam = clean(cs.fontFamily.split(',')[0]);
      (used[fam] ||= new Set()).add(cs.fontWeight);
    }
    const ctx = document.createElement('canvas').getContext('2d');
    const width = (font) => { ctx.font = font; return ctx.measureText('lastfomo machina hortus arca 0123').width; };
    const result = {};
    for (const { family, weights, fallback } of fonts) {
      const faces = () => [...document.fonts].filter((f) => clean(f.family) === family);
      const status = {};
      for (const f of faces()) status[f.status] = (status[f.status] || 0) + 1;
      const check = {};
      for (const w of weights) check[w] = document.fonts.check(`${w} 16px "${family}"`);
      const loaded = faces().some((f) => f.status === 'loaded') && check[weights[0]];
      let loadedOnDemand = null;
      if (!loaded && forceLoad) {
        try {
          await Promise.race([document.fonts.load(`${weights[0]} 16px "${family}"`), new Promise((r) => setTimeout(r, 6000))]);
        } catch { /* reported below */ }
        loadedOnDemand = faces().some((f) => f.status === 'loaded') && document.fonts.check(`${weights[0]} 16px "${family}"`);
      }
      const renderDelta = Math.round((width(`${weights[0]} 40px "${family}", ${fallback}`) - width(`${weights[0]} 40px ${fallback}`)) * 10) / 10;
      result[family] = {
        used: used[family] ? [...used[family]].sort() : [],
        loaded,
        check,
        faces: status,
        loadedOnDemand,
        renderDelta,
      };
    }
    return result;
  }, { fonts: BRAND_FONTS, forceLoad });
}

// The single main.view that is showing, by data-view (or id).
export const VISIBLE_VIEWS_FN = () =>
  [...document.querySelectorAll('main.view')]
    .filter((v) => !v.hidden && getComputedStyle(v).display !== 'none')
    .map((v) => v.dataset.view || v.id || '?');
