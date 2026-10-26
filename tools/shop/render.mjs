// Renders the shop from site/shop.json into the page, at six markers in site/index.html:
//   <!-- shop:bar -->       the basket button in the header
//   <!-- shop:hardware -->  the Hardware screen on the Hortus case
//   <!-- shop:machina -->   the Machina preview on its case: build and source (tools/shop/previews.mjs)
//   <!-- shop:arca -->      the Arca preview on its case: vault and artists (tools/shop/previews.mjs)
//   <!-- shop:views -->     the hardware view (#/hardware) and one view per product (#/hardware/<slug>)
//   <!-- shop:basket -->    the basket dialog with the order form, and the product data main.js reads
// Used by tools/build.mjs (every target) and tools/brandcheck.mjs (the source check), so the shop is checked
// like any hand-written screen. Each marker becomes one line of markup, so line numbers in site/index.html hold.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { esc, num, ne, keep, tile, steps } from './html.mjs';
import { machinaScreen, arcaScreen, checkPreviews } from './previews.mjs';

export const MARKERS = ['bar', 'hardware', 'machina', 'arca', 'views', 'basket'];
const marker = (k) => `<!-- shop:${k} -->`;

/** site/shop.json, or null when the site has no shop. Throws on a file that is not valid JSON or misses a field. */
export function loadShop(siteDir) {
  const file = join(siteDir, 'shop.json');
  if (!existsSync(file)) return null;
  const shop = JSON.parse(readFileSync(file, 'utf8'));
  for (const k of ['code', 'symbol', 'name']) if (!shop.currency?.[k]) throw new Error(`site/shop.json: currency has no ${k}`);
  const slugs = new Set();
  for (const p of shop.products || []) {
    for (const k of ['slug', 'name', 'kind', 'line', 'lead', 'price', 'image', 'alt']) if (p[k] == null || p[k] === '') throw new Error(`site/shop.json: product ${p.slug || '?'} has no ${k}`);
    if (!/^[a-z0-9-]+$/.test(p.slug)) throw new Error(`site/shop.json: slug "${p.slug}" must be lowercase letters, digits and hyphens`);
    if (!Number.isInteger(p.price) || p.price <= 0) throw new Error(`site/shop.json: ${p.slug} price must be a whole number of ${shop.currency?.code || 'units'}`);
    for (const k of p.keys || []) if (!(p.specs || []).some(([n]) => n === k)) throw new Error(`site/shop.json: ${p.slug} keys name "${k}", which is not in its specs`);
    if (slugs.has(p.slug)) throw new Error(`site/shop.json: slug "${p.slug}" appears twice`);
    slugs.add(p.slug);
  }
  for (const g of shop.index?.groups || []) for (const s of g.products) if (!slugs.has(s)) throw new Error(`site/shop.json: group ${g.id} lists ${s}, which is not a product`);
  checkPreviews(shop);
  return shop;
}

const money = (shop, n) => esc(shop.currency.symbol) + num(n);
const CODE = 'HRT — Hortus · ';

// The specs a product's card shows, named in its "keys".
const keyList = (p) => (p.keys || []).map((k) => `<div><dt>${esc(k)}</dt><dd>${esc(p.specs.find(([n]) => n === k)[1])}</dd></div>`).join('');

// A product card: photo, kind, name, line, two specs and price; a shelf card ("mini") keeps photo, name, kind and price,
// the price on the card's floor so a row of them lines up. The name is the link, and its hit area covers the card, so the
// rest reads as plain text.
function card(shop, p, mini = false) {
  const kind = `<p class="gk">${keep(p.kind)}</p>`, name = `<h3 class="gn"><a href="#/hardware/${p.slug}">${keep(p.name)}</a></h3>`;
  const keys = mini ? '' : keyList(p);
  return `<li class="good${mini ? ' mini' : ''}">${tile(p.image, p.alt)}<div class="gt">${mini ? name + kind : kind + name + `<p class="gs">${esc(p.line)}</p>`}`
    + (keys ? `<dl class="gd">${keys}</dl>` : '') + `<p class="gp">${money(shop, p.price)}</p></div></li>`;
}

// A shelf: one row of shelf cards (on phones it scrolls sideways).
const shelf = (shop, ps, d) => `<ul class="shelf" data-fade style="--n:${ps.length};--d:${d}">${ps.map((p) => card(shop, p, true)).join('')}</ul>`;

// The Hardware screen on the Hortus case: the way in, and every product on a shelf.
function hardwareScreen(shop) {
  const h = shop.hardware;
  return `<section class="screen cat" id="hortus-hardware" data-title="Hardware" data-wing="hortus"><div class="wrap">`
    + `<div class="cat-head"><div class="stack"><p class="code" data-fade style="--d:.1s">${esc(h.code)}</p>`
    + `<h2 class="h2" data-rise style="--d:.2s"><span>${esc(h.title)}</span></h2></div>`
    + `<div class="stack"><p class="lead" data-fade style="--d:.35s">${esc(h.lead)}</p>`
    + `<div class="row" data-fade style="--d:.45s"><a class="btn solid" href="#/hardware">${esc(h.cta)}</a></div></div></div>`
    + shelf(shop, shop.products, '.55s') + `</div></section>`;
}

function indexView(shop) {
  const x = shop.index;
  const bySlug = Object.fromEntries(shop.products.map((p) => [p.slug, p]));
  let out = `<main class="view shop-v" id="view-hardware" data-view="hardware" data-wing="hortus" data-crumb="Hardware" data-crumb-parent="hortus" data-page-title="Hardware, Hortus — lastfomo" tabindex="-1" hidden>`
    + `<section class="screen tall cat" data-title="Hardware" data-wing="hortus"><div class="wrap">`
    + `<div class="cat-head"><div class="stack"><p class="code" data-fade style="--d:.1s">${esc(shop.hardware.code)}</p>`
    + `<h1 class="h1" data-rise style="--d:.2s"><span>${esc(x.title)}</span></h1></div>`
    + `<p class="lead" data-fade style="--d:.4s">${esc(x.lead)}</p></div>`;
  x.groups.forEach((g, i) => {
    out += `<div class="cat-g" id="hw-${g.id}" data-fade style="--d:${(0.5 + i * 0.15).toFixed(2)}s"><h2 class="cat-t">${esc(g.title)}</h2>`
      + `<ul class="goods-grid">${g.products.map((s) => card(shop, bySlug[s])).join('')}</ul></div>`;
  });
  out += `</div></section>`
    + `<section class="screen" data-title="Order" data-wing="hortus"><div class="wrap">`
    + `<h2 class="h2" data-rise><span>How ordering works.</span></h2>`
    + steps(x.steps)
    + `<div class="next" data-fade style="--d:.5s"><button class="btn solid" type="button" data-basket>Open the basket</button><a class="big" href="#/hortus">Hortus${ne}</a></div>`
    + `</div></section></main>`;
  return out;
}

// A product page reads like a shop's: the photo in a square card beside the name, price and basket; then what it does
// in cards, the specification, and the order with the rest of the hardware on a shelf, starting from the next product.
function productView(shop, p, others) {
  const m = shop.maker;
  const does = p.does.map((d) => `<li><span class="n">HRT</span><span class="t">${esc(d.t)}</span><span class="s">${esc(d.s)}</span></li>`).join('');
  const specs = p.specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
  const box = p.box.map(esc).join('<i>·</i>');
  const buy = (d) => `<div class="row" data-fade style="--d:${d}"><button class="btn solid" type="button" data-add="${p.slug}">Add to basket</button><button class="btn" type="button" data-basket>Open the basket</button></div>`;
  const keys = keyList(p);
  return `<main class="view shop-v" id="view-hw-${p.slug}" data-view="hw-${p.slug}" data-wing="hortus" data-crumb="${esc(p.name)}" data-crumb-parent="hardware" data-page-title="${esc(p.name)}, Hortus hardware — lastfomo" tabindex="-1" hidden>`
    + `<section class="screen tall pdp" data-title="${esc(p.name)}" data-wing="hortus"><div class="wrap pdp-in">`
    + `<div class="pdp-pic" data-fade style="--d:.1s">${tile(p.image, p.alt, false)}</div>`
    + `<div class="stack pdp-info"><p class="code" data-fade style="--d:.1s">${CODE}${esc(p.kind)}</p>`
    + `<h1 class="h1" data-rise style="--d:.2s"><span>${esc(p.name)}</span></h1>`
    + `<p class="h2 sub" data-rise style="--d:.3s"><span>${esc(p.line)}</span></p>`
    + `<p class="pdp-price" data-fade style="--d:.4s">${money(shop, p.price)}</p>`
    + buy('.5s')
    + `<p class="pdp-note" data-fade style="--d:.6s">Price in ${esc(shop.currency.name)}, with the maker’s 1-year warranty. Made by ${esc(m.name)}, ${esc(m.country)}.</p>`
    + (keys ? `<dl class="gd pdp-keys" data-fade style="--d:.7s">${keys}</dl>` : '')
    + `</div></div></section>`
    + `<section class="screen" data-title="What it does" data-wing="hortus"><div class="wrap">`
    + `<h2 class="h2" data-rise><span>What it does.</span></h2>`
    + `<p class="lead gap" data-fade style="--d:.2s">${esc(p.lead)}</p>`
    + `<ul class="does" data-fade style="--d:.3s">${does}</ul></div></section>`
    + `<section class="screen" data-title="Specification" data-wing="hortus"><div class="wrap">`
    + `<h2 class="h2" data-rise><span>Specification.</span></h2>`
    + `<dl class="spec" data-fade style="--d:.3s">${specs}</dl>`
    + `<p class="strip inbox" data-fade style="--d:.5s"><b>In the box</b>${box}</p></div></section>`
    + `<section class="screen" data-title="Order" data-wing="hortus"><div class="wrap">`
    + `<div class="buy"><div class="stack"><p class="code" data-fade style="--d:.1s">${CODE}Order</p>`
    + `<h2 class="h2" data-rise style="--d:.2s"><span>${esc(p.name)}, ${money(shop, p.price)}.</span></h2>`
    + `<p class="pdp-note" data-fade style="--d:.3s">We confirm stock, delivery and payment by email before anything ships.</p></div>${buy('.4s')}</div>`
    + `<div class="cat-g"><h2 class="cat-t" data-fade style="--d:.5s">Next in hardware</h2>${shelf(shop, others, '.55s')}</div>`
    + `</div></section></main>`;
}

function basket(shop) {
  const data = { symbol: shop.currency.symbol, code: shop.currency.code, contact: shop.contact, maker: shop.maker.name,
    products: shop.products.map((p) => ({ slug: p.slug, name: p.name, kind: p.kind, price: p.price })) };
  return `<dialog class="basket" id="basket" data-wing="hortus" aria-labelledby="basket-title"><div class="basket-in">`
    + `<div class="basket-head"><p class="code">${CODE}Basket</p><button class="btn x" type="button" id="basket-x">Close</button></div>`
    + `<p class="sr" id="basket-status" role="status"></p>`
    + `<div id="basket-main"><h2 class="h2" id="basket-title" tabindex="-1">The basket.</h2>`
    + `<p class="lead" id="basket-empty">Nothing in it yet. <a href="#/hardware">See the hardware</a>.</p>`
    + `<ul class="lines" id="basket-lines" aria-label="In the basket"></ul>`
    + `<div class="total" id="basket-sum" hidden><span>Subtotal</span><b id="basket-total"></b></div>`
    + `<p class="note" id="basket-note" hidden>Prices in ${esc(shop.currency.name)}. Nothing is charged here: we reply by email with stock, delivery and payment.</p>`
    + `<form class="form" id="order" hidden><div class="fields">`
    + `<label><span>Your name</span><input name="name" autocomplete="name" maxlength="120" required></label>`
    + `<label><span>Email</span><input name="email" type="email" autocomplete="email" maxlength="200" required></label>`
    + `<label><span>Organisation (optional)</span><input name="org" autocomplete="organization" maxlength="160"></label>`
    + `<label><span>Deliver to</span><input name="place" autocomplete="address-level2" maxlength="200" required placeholder="City and country"></label>`
    + `<label class="full"><span>Anything we should know (optional)</span><textarea name="note" rows="3" maxlength="2000"></textarea></label>`
    + `</div><label class="hp" aria-hidden="true">Leave this empty <input name="website" tabindex="-1" autocomplete="off"></label>`
    + `<div class="row"><button class="btn solid" type="submit">Send the order</button></div></form></div>`
    + `<div class="sent" id="order-sent" tabindex="-1" hidden><h2 class="h2">Order ready.</h2>`
    + `<p class="lead">Your email app may open with the order filled in. If it does not, copy the order and send it to <b>${esc(shop.contact)}</b>.</p>`
    + `<pre class="brief-out" id="order-text"></pre>`
    + `<div class="row"><button class="btn solid" type="button" id="copy-order">Copy the order</button><button class="btn" type="button" id="order-again">Back to the basket</button></div></div>`
    + `</div></dialog>`
    + `<script type="application/json" id="lf-shop">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

/** The markup for each marker. */
export function renderShop(shop) {
  const ps = shop.products;
  return {
    bar: `<button class="basket-link empty" type="button" data-basket aria-label="Basket"><span>Basket</span><b id="basket-count" hidden></b></button>`,
    hardware: hardwareScreen(shop),
    machina: shop.machina ? machinaScreen(shop) : '',
    arca: shop.arca ? arcaScreen(shop) : '',
    views: indexView(shop) + ps.map((p, i) => productView(shop, p, [...ps.slice(i + 1), ...ps.slice(0, i)])).join(''),
    basket: basket(shop),
  };
}

/**
 * The page with the shop in place (include = true) or without it (false: the markers are removed, nothing else
 * changes). Without a shop the page is returned as it is. A missing marker is an error: the shop would vanish quietly.
 */
export function withShop(html, shop, include) {
  if (!shop) return html;
  const parts = include ? renderShop(shop) : null;
  let out = html;
  for (const k of MARKERS) {
    const n = out.split(marker(k)).length - 1;
    if (n !== 1) throw new Error(`site/index.html must hold ${marker(k)} exactly once (found ${n})`);
    out = out.replace(marker(k), () => (parts ? parts[k] : ''));
  }
  return out;
}
