// Renders the Hortus hardware shop from site/shop.json into the page, at four markers in site/index.html:
//   <!-- shop:bar -->       the basket button in the header
//   <!-- shop:hardware -->  the Hardware screen on the Hortus case
//   <!-- shop:views -->     the hardware view (#/hardware) and one view per product (#/hardware/<slug>)
//   <!-- shop:basket -->    the basket dialog with the order form, and the product data main.js reads
// Used by tools/build.mjs (every target) and tools/brandcheck.mjs (the source check), so the shop is checked
// like any hand-written screen. Each marker becomes one line of markup, so line numbers in site/index.html hold.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const MARKERS = ['bar', 'hardware', 'views', 'basket'];
const marker = (k) => `<!-- shop:${k} -->`;

/** site/shop.json, or null when the site has no shop. Throws on a file that is not valid JSON or misses a field. */
export function loadShop(siteDir) {
  const file = join(siteDir, 'shop.json');
  if (!existsSync(file)) return null;
  const shop = JSON.parse(readFileSync(file, 'utf8'));
  const slugs = new Set();
  for (const p of shop.products || []) {
    for (const k of ['slug', 'name', 'kind', 'line', 'lead', 'price', 'image', 'alt']) if (p[k] == null || p[k] === '') throw new Error(`site/shop.json: product ${p.slug || '?'} has no ${k}`);
    if (!/^[a-z0-9-]+$/.test(p.slug)) throw new Error(`site/shop.json: slug "${p.slug}" must be lowercase letters, digits and hyphens`);
    if (!Number.isInteger(p.price) || p.price <= 0) throw new Error(`site/shop.json: ${p.slug} price must be a whole number of ${shop.currency?.code || 'units'}`);
    if (slugs.has(p.slug)) throw new Error(`site/shop.json: slug "${p.slug}" appears twice`);
    slugs.add(p.slug);
  }
  for (const g of shop.index?.groups || []) for (const s of g.products) if (!slugs.has(s)) throw new Error(`site/shop.json: group ${g.id} lists ${s}, which is not a product`);
  return shop;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (shop, n) => esc(shop.currency.symbol) + n.toLocaleString('en-GB');
const ne = '<svg aria-hidden="true"><use href="#g-ne"/></svg>';
const CODE = 'HRT — Hortus · ';

// A product photo in the arch holder, on paper, sealed in grey until its screen is active (rule 9).
const goods = (file, alt, lazy = true) => `<span class="arch goods"><img${lazy ? ' loading="lazy"' : ''} decoding="async" src="media/${esc(file)}" alt="${esc(alt)}"><i class="seal" aria-hidden="true"></i></span>`;

function hardwareScreen(shop) {
  const h = shop.hardware;
  const cover = shop.products.find((p) => p.image === h.image);
  return `<section class="screen shop-cover" id="hortus-hardware" data-title="Hardware" data-wing="hortus"><div class="wrap split"><div class="stack">`
    + `<p class="code" data-fade style="--d:.1s">${esc(h.code)}</p>`
    + `<h2 class="h2" data-rise style="--d:.2s"><span>${esc(h.title)}</span></h2>`
    + `<p class="lead" data-fade style="--d:.5s">${esc(h.lead)}</p>`
    + `<div class="row" data-fade style="--d:.7s"><a class="btn solid" href="#/hardware">${esc(h.cta)}</a></div>`
    + `</div><div class="media" data-fade style="--d:.2s">${goods(h.image, cover ? cover.alt : '')}</div></div></section>`;
}

// The link is named by its product, kind and price; the photo keeps the ledger's alt text for anyone who meets it alone.
function card(shop, p) {
  return `<li><a class="good" href="#/hardware/${p.slug}" aria-label="${esc(p.name)}, ${esc(p.kind)}, ${money(shop, p.price)}">${goods(p.image, p.alt)}`
    + `<span class="gl"><b>${esc(p.name)}</b><span>${esc(p.kind)}</span></span><span class="gp">${money(shop, p.price)}</span></a></li>`;
}

function indexView(shop) {
  const x = shop.index;
  const bySlug = Object.fromEntries(shop.products.map((p) => [p.slug, p]));
  const cover = shop.products.find((p) => p.image === x.image);
  let out = `<main class="view" id="view-hardware" data-view="hardware" data-wing="hortus" data-crumb="Hardware" data-crumb-parent="hortus" data-page-title="Hardware, Hortus — lastfomo" tabindex="-1" hidden>`
    + `<section class="screen shop-cover" data-title="Hardware" data-wing="hortus"><div class="wrap split"><div class="stack">`
    + `<p class="code" data-fade style="--d:.1s">${esc(shop.hardware.code)}</p>`
    + `<h1 class="h1" data-rise style="--d:.2s"><span>${esc(x.title)}</span></h1>`
    + `<p class="lead" data-fade style="--d:.5s">${esc(x.lead)}</p>`
    + `<div class="row" data-fade style="--d:.7s"><a class="btn solid" href="#/hardware" data-scroll="hw-${x.groups[0].id}">See the range</a><a class="btn" href="#/hortus">Back to Hortus</a></div>`
    + `</div><div class="media" data-fade style="--d:.2s">${goods(x.image, cover ? cover.alt : '', false)}</div></div></section>`;
  for (const g of x.groups) {
    out += `<section class="screen" id="hw-${g.id}" data-title="${esc(g.label)}" data-wing="hortus"><div class="wrap">`
      + `<h2 class="h2" data-rise><span>${esc(g.title)}</span></h2>`
      + `<ul class="goods-row" data-fade style="--d:.3s">${g.products.map((s) => card(shop, bySlug[s])).join('')}</ul></div></section>`;
  }
  out += `<section class="screen" data-title="Order" data-wing="hortus"><div class="wrap">`
    + `<h2 class="h2" data-rise><span>How ordering works.</span></h2>`
    + `<ol class="steps" data-fade style="--d:.3s">${x.steps.map((s, i) => `<li><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="t">${esc(s.t)}</span><span class="s">${esc(s.s)}</span></li>`).join('')}</ol>`
    + `<div class="next" data-fade style="--d:.5s"><button class="btn solid" type="button" data-basket>Open the basket</button><a class="big" href="#/hortus">Hortus${ne}</a></div>`
    + `</div></section></main>`;
  return out;
}

function productView(shop, p, next) {
  const m = shop.maker;
  const does = p.does.map((d) => `<li><span class="n">HRT</span><span class="t">${esc(d.t)}</span><span class="s">${esc(d.s)}</span></li>`).join('');
  const specs = p.specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
  const box = p.box.map(esc).join('<i>·</i>');
  return `<main class="view" id="view-hw-${p.slug}" data-view="hw-${p.slug}" data-wing="hortus" data-crumb="${esc(p.name)}" data-crumb-parent="hardware" data-page-title="${esc(p.name)}, Hortus hardware — lastfomo" tabindex="-1" hidden>`
    + `<section class="screen shop-cover" data-title="${esc(p.name)}" data-wing="hortus"><div class="wrap split"><div class="stack">`
    + `<p class="code" data-fade style="--d:.1s">${CODE}${esc(p.kind)}</p>`
    + `<h1 class="h1" data-rise style="--d:.2s"><span>${esc(p.name)}</span></h1>`
    + `<p class="h2 sub" data-rise style="--d:.35s"><span>${esc(p.line)}</span></p>`
    + `<p class="strip" data-fade style="--d:.55s"><b class="price">${money(shop, p.price)}</b><i>/</i>Made by ${esc(m.name)}, ${esc(m.country)}</p>`
    + `<div class="row" data-fade style="--d:.7s"><button class="btn solid" type="button" data-add="${p.slug}">Add to basket</button><a class="btn" href="#/hardware">All hardware</a></div>`
    + `</div><div class="media" data-fade style="--d:.2s">${goods(p.image, p.alt, false)}</div></div></section>`
    + `<section class="screen" data-title="What it does" data-wing="hortus"><div class="wrap">`
    + `<h2 class="h2" data-rise><span>What it does.</span></h2>`
    + `<p class="lead gap" data-fade style="--d:.2s">${esc(p.lead)}</p>`
    + `<ul class="rows" data-fade style="--d:.3s">${does}</ul></div></section>`
    + `<section class="screen" data-title="Specification" data-wing="hortus"><div class="wrap">`
    + `<h2 class="h2" data-rise><span>Specification.</span></h2>`
    + `<dl class="spec" data-fade style="--d:.3s">${specs}</dl>`
    + `<p class="strip inbox" data-fade style="--d:.5s"><b>In the box</b>${box}</p></div></section>`
    + `<section class="screen" data-title="Order" data-wing="hortus"><div class="wrap"><div class="stack order">`
    + `<p class="code" data-fade style="--d:.1s">${CODE}Order</p>`
    + `<h2 class="h2" data-rise style="--d:.2s"><span>${esc(p.name)}, ${money(shop, p.price)}.</span></h2>`
    + `<p class="lead" data-fade style="--d:.4s">Price in roubles, as listed by the maker, with the maker’s 1-year warranty. We confirm stock, delivery and payment by email before anything ships.</p>`
    + `<div class="row" data-fade style="--d:.6s"><button class="btn solid" type="button" data-add="${p.slug}">Add to basket</button><button class="btn" type="button" data-basket>Open the basket</button></div></div>`
    + `<div class="next" data-fade style="--d:.7s"><span class="code" style="color:var(--fg2)">Next in hardware</span><a class="big" href="#/hardware/${next.slug}">${esc(next.name)}${ne}</a></div>`
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
    + `<p class="note" id="basket-note" hidden>Prices in roubles, as listed by the maker. Nothing is charged here: we reply by email with stock, delivery and payment.</p>`
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
    views: indexView(shop) + ps.map((p, i) => productView(shop, p, ps[(i + 1) % ps.length])).join(''),
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
