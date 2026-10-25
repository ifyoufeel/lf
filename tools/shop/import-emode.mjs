#!/usr/bin/env node
// Imports the Hortus wing's automation hardware from its maker, e-mode.pro, into shop/source/.
// Runs wherever e-mode.pro is reachable: GitHub Actions (.github/workflows/shop-import.yml) or any machine online.
// Zero dependencies, Node 22. Resizes photos with ImageMagick when `convert` is on the PATH (it is on GitHub's runners).
//
//   node tools/shop/import-emode.mjs [--only <slug>] [--out <dir>]
//
// Reads shop/emode-products.json (our slug → the maker's product page) and writes
//   shop/source/emode.json     the maker's own words in Russian, price, currency, stock and photos, as published
//   shop/source/img/<slug>-<n>.jpg
// It never writes copy for the page: site/shop.json holds the English, written by hand from this source.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const OUT = resolve(opt('--out') || join(ROOT, 'shop/source'));
const ONLY = opt('--only');
const ORIGIN = 'https://e-mode.pro';
const UA = 'Mozilla/5.0 (compatible; lastfomo-shop-import/1.0; +https://lastfomo.vercel.app)';
const MAX_IMAGES = 3;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«', raquo: '»', mdash: '—', ndash: '–', hellip: '…', deg: '°', micro: 'µ', times: '×', bull: '•' };
const decode = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
const textOf = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// The description tab as lines: paragraphs and list items, in order, tags stripped.
function lines(html) {
  const flat = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d|tr)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ');
  return decode(flat.replace(/<[^>]+>/g, ''))
    .split('\n')
    .map((l) => l.replace(/[ \t ]+/g, ' ').trim())
    .filter(Boolean);
}

function parse(html, url) {
  const pick = (re) => (html.match(re) || [])[1];
  const name = textOf(pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || '');
  const price = Number(pick(/itemprop="price"\s+content="([\d.]+)"/i));
  const currency = pick(/itemprop="priceCurrency"\s+content="([A-Z]{3})"/i) || null;
  const availability = (pick(/itemprop="availability"\s+href="[^"]*schema\.org\/(\w+)"/i) || null);
  const canBuy = pick(/'CAN_BUY':(true|false)/);
  const maxQuantity = pick(/'MAX_QUANTITY':'(\d+)'/);
  const category = decode(pick(/'CATEGORY':'([^']*)'/) || '') || null;
  const id = pick(/'PRODUCT':\{'ID':'(\d+)'/) || pick(/id="bx_\d+_(\d+)_price"/);
  const slider = pick(/'SLIDER':\[([\s\S]*?)\]/) || '';
  const images = [...slider.matchAll(/'SRC':'([^']+)','WIDTH':'(\d+)','HEIGHT':'(\d+)'/g)]
    .map((m) => ({ src: new URL(m[1], ORIGIN).href, width: +m[2], height: +m[3] }));
  // The description panel, not its tab button (both carry data-value="description").
  const panel = /<div[^>]*data-entity="tab-container"[^>]*data-value="description"[^>]*>/i.exec(html);
  let description = [];
  if (panel) {
    const start = panel.index + panel[0].length;
    const next = html.indexOf('data-entity="tab-container"', start);
    description = lines(html.slice(start, next > 0 ? html.lastIndexOf('<div', next) : start + 20000));
  }
  const dl = html.indexOf('Скачать руководство');
  const manual = dl > 0 ? ([...html.slice(Math.max(0, dl - 600), dl).matchAll(/href="([^"#][^"]*)"/g)].pop() || [])[1] : null;
  return {
    url, id: id || null, name, category,
    price: Number.isFinite(price) && price > 0 ? price : null, currency,
    availability, canBuy: canBuy == null ? null : canBuy === 'true', stock: maxQuantity == null ? null : +maxQuantity,
    addToBasket: id ? `${url}?action=ADD2BASKET&id=${id}` : null,
    manual: manual ? new URL(decode(manual), ORIGIN).href : null,
    description, images,
  };
}

async function get(url, as = 'text') {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA, accept: as === 'text' ? 'text/html' : 'image/*' }, signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return as === 'text' ? await res.text() : Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (attempt >= 3) throw new Error(`${url}: ${err.message}`);
      await sleep(2000 * attempt);
    }
  }
}

// ImageMagick 7 ships `magick`, 6 ships `convert`; without either the photos are kept as published.
const IM = ['magick', 'convert'].find((bin) => { try { execFileSync(bin, ['-version'], { stdio: 'ignore' }); return true; } catch { return false; } });
if (!IM) console.warn('import-emode: ImageMagick not found; photos are kept at full size and in their own format');

const config = JSON.parse(readFileSync(join(ROOT, 'shop/emode-products.json'), 'utf8'));
const list = config.products.filter((p) => !ONLY || p.slug === ONLY);
if (!list.length) { console.error(`import-emode: no product ${ONLY}`); process.exit(2); }
mkdirSync(join(OUT, 'img'), { recursive: true });

const previous = existsSync(join(OUT, 'emode.json')) ? JSON.parse(readFileSync(join(OUT, 'emode.json'), 'utf8')) : { products: [] };
const products = [];
let failed = 0;
for (const p of list) {
  try {
    const item = parse(await get(p.url), p.url);
    if (!item.name || item.price == null) throw new Error('no name or price on the page; the markup may have changed');
    item.images = item.images.slice(0, MAX_IMAGES);
    for (const [n, img] of item.images.entries()) {
      const file = `img/${p.slug}-${n + 1}.jpg`;
      const raw = await get(img.src, 'binary');
      const target = join(OUT, file);
      if (IM) {
        // Every photo becomes a JPEG at most 1000 px on its long side; transparent PNGs are laid on white, as the maker shows them.
        const tmp = target + '.src';
        writeFileSync(tmp, raw);
        execFileSync(IM, [tmp + '[0]', '-auto-orient', '-background', 'white', '-alpha', 'remove', '-alpha', 'off', '-resize', '1000x1000>', '-strip', '-interlace', 'JPEG', '-quality', '82', 'jpeg:' + target]);
        rmSync(tmp);
      } else {
        writeFileSync(target, raw);
      }
      img.file = file;
      await sleep(400);
    }
    products.push({ slug: p.slug, ...item });
    console.log(`ok    ${p.slug}: ${item.name.slice(0, 60)} · ${item.price} ${item.currency} · ${item.availability} · ${item.images.length} photos · ${item.description.length} lines`);
  } catch (err) {
    failed++;
    console.error(`FAIL  ${p.slug}: ${err.message}`);
    const old = previous.products.find((x) => x.slug === p.slug);
    if (old) products.push(old); // keep the last good import rather than dropping the product
  }
  await sleep(1000);
}

const merged = ONLY ? [...previous.products.filter((x) => x.slug !== ONLY), ...products] : products;
const order = config.products.map((p) => p.slug);
merged.sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
writeFileSync(join(OUT, 'emode.json'), JSON.stringify({
  $note: 'Imported by tools/shop/import-emode.mjs from the maker’s pages, in the maker’s own words. Do not edit by hand; re-run the import.',
  source: ORIGIN, imported: new Date().toISOString().slice(0, 10), products: merged,
}, null, 2) + '\n');
console.log(`import-emode: ${products.length - failed} imported, ${failed} failed → ${OUT}`);
process.exit(failed ? 1 : 0);
