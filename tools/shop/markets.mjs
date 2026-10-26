// The Machina compute and the Arca market, rendered from site/shop.json ("machina", "arca") by tools/shop/render.mjs.
// Every price, size and date on them is a fact in brand/ledger.json (machina.market.*, arca.market.*); the art waits on
// named placeholders until the owner lists real works. Charts are built here as markup, so they need no script to draw
// and every value they show is also written out as text beside them.
import { esc, num, usd, ne, keep, steps } from './html.mjs';

const MCH = 'MCH — Machina · ';
const ARC = 'ARC — Arca · ';

/** Throws on a market that misses a field the pages need. */
export function checkMarkets(shop) {
  const m = shop.machina, a = shop.arca;
  if (m) {
    const slugs = new Set();
    for (const t of m.tiers || []) for (const it of t.items || []) {
      for (const k of ['slug', 'name', 'kind', 'mem', 'price', 'supply']) if (it[k] == null) throw new Error(`site/shop.json: machina item ${it.slug || '?'} has no ${k}`);
      if (!m.supply?.[it.supply]) throw new Error(`site/shop.json: machina item ${it.slug} has supply "${it.supply}", which machina.supply does not name`);
      if (!Array.isArray(it.price) || it.price.length !== 2 || !(it.price[0] > 0) || it.price[1] < it.price[0]) throw new Error(`site/shop.json: machina item ${it.slug} price must be [low, high]`);
      slugs.add(it.slug);
    }
    for (const s of [...(m.shelf || []), ...(m.calc?.builds || []).map((b) => b.item)]) if (!slugs.has(s)) throw new Error(`site/shop.json: machina names ${s}, which is not an item`);
  }
  if (a) {
    for (const c of a.coins || []) for (const k of ['slug', 'name', 'kind', 'gold', 'melt', 'price']) if (c[k] == null) throw new Error(`site/shop.json: arca coin ${c.slug || '?'} has no ${k}`);
    if (!a.gold?.closes?.length || !a.gold.now) throw new Error('site/shop.json: arca.gold needs closes and now');
  }
}

/* ---------------------------------------------- Machina: compute ---------------------------------------------- */

const items = (m) => m.tiers.flatMap((t) => t.items.map((it) => ({ ...it, tier: t.id })));
const range = (it) => (it.price[0] === it.price[1] ? (it.from ? 'from ' : '') + usd(it.price[0]) : usd(it.price[0]) + '–' + num(it.price[1]));
// Ordered, not on a shelf: drawn in outline on the chart.
const held = (it) => it.supply === 'allocation' || it.supply === 'order';
// The chart's price axis runs from $1,000 to $100,000 on a log scale.
const at = (v) => Math.max(0, Math.min(100, ((Math.log10(v) - 3) / 2) * 100)).toFixed(1) + '%';
// The memory a card holds, set large in the tile where a product photo would stand.
const spec = (it) => `<span class="tile mem" aria-hidden="true"><b>${it.mem}</b><i>GB</i></span>`;

function miniCompute(m, it) {
  return `<li class="good mini">${spec(it)}<div class="gt"><h3 class="gn"><a href="#/compute">${keep(it.name)}</a></h3>`
    + `<p class="gk">${it.mem} GB · ${esc(m.supply[it.supply])}</p><p class="gp">${range(it)}</p></div></li>`;
}

// The Compute screen on the Machina case: the way in, and a shelf from each tier.
export function machinaScreen(shop) {
  const m = shop.machina, h = m.screen, by = Object.fromEntries(items(m).map((it) => [it.slug, it]));
  const shelf = m.shelf.map((s) => by[s]);
  return `<section class="screen cat" id="machina-compute" data-title="Compute" data-wing="machina"><div class="wrap">`
    + `<div class="cat-head"><div class="stack"><p class="code" data-fade style="--d:.1s">${esc(h.code)}</p>`
    + `<h2 class="h2" data-rise style="--d:.2s"><span>${esc(h.title)}</span></h2></div>`
    + `<div class="stack"><p class="lead" data-fade style="--d:.35s">${esc(h.lead)}</p>`
    + `<div class="row" data-fade style="--d:.45s"><a class="btn solid" href="#/compute">${esc(h.cta)}</a></div></div></div>`
    + `<ul class="shelf" data-fade style="--n:${shelf.length};--d:.55s">${shelf.map((it) => miniCompute(m, it)).join('')}</ul>`
    + `</div></section>`;
}

// Price and supply by tier: one row per accelerator, its price range on a log axis, its supply in words. Solid bars
// are on the market now; outlined ones are ordered or allocated.
function rangeChart(m) {
  const axis = `<div class="rg-r rg-axis" aria-hidden="true"><span></span><span class="rg-p"><i style="--x:0%">$1K</i><i style="--x:50%">$10K</i><i style="--x:100%">$100K</i></span><span></span><span></span></div>`;
  const rows = m.tiers.map((t) => `<div class="rg-g"><p class="rg-t">${esc(t.label)}</p><ul>`
    + t.items.map((it) => `<li class="rg-r"><span class="rg-n"><b>${keep(it.name)}</b> <i>${it.mem} GB</i></span>`
      + `<span class="rg-p" aria-hidden="true"><i class="rg-b${held(it) ? ' hold' : ''}" style="--a:${at(it.price[0])};--b:${at(it.price[1])}"></i></span>`
      + `<span class="rg-v">${range(it)}</span><span class="rg-s">${esc(m.supply[it.supply])}</span></li>`).join('')
    + `</ul></div>`).join('');
  return `<figure class="rg" data-fade style="--d:.4s">${axis}${rows}`
    + `<figcaption class="rg-cap"><span class="rg-k"><i class="rg-b"></i>On the market now</span><span class="rg-k"><i class="rg-b hold"></i>Ordered or allocated</span>`
    + `<span>Price per unit in US dollars, log scale. Market reports to ${esc(m.view.asOf)}.</span></figcaption></figure>`;
}

function computeCard(m, it) {
  const q = { key: 'src-' + it.slug, name: 'Sourcing: ' + it.name, kind: 'Machina · hardware sourcing', href: '#/compute', wing: 'machina', note: it.mem + ' GB · ' + range(it) + ' · ' + m.supply[it.supply] };
  return `<li class="good cmp">${spec(it)}<div class="gt"><p class="gk">${keep(it.kind)}</p><h3 class="gn">${keep(it.name)}</h3>`
    + `<dl class="gd"><div><dt>Memory</dt><dd>${it.mem} GB</dd></div><div><dt>Supply</dt><dd>${esc(m.supply[it.supply])}</dd></div></dl>`
    + `<p class="gp">${range(it)}</p><button class="btn sm" type="button" data-quote="${esc(JSON.stringify(q))}" aria-label="Ask us to source the ${esc(it.name)}">Ask to source</button></div></li>`;
}

function calculator(m) {
  const c = m.calc;
  // The calculator wears the brief's form: an underlined select, and pills for every choice.
  const opt = (o) => `<option value="${esc(o.id)}">${esc(o.label)}</option>`;
  const pill = (type, name, o, on, hint) => `<label class="pill"><input type="${type}" name="${name}" value="${esc(o.id)}"${on ? ' checked' : ''}><span>${esc(o.label)}${hint ? `<i>${esc(hint)}</i>` : ''}</span></label>`;
  return `<section class="screen calc-s" data-title="Calculator" data-wing="machina"><div class="wrap calc-w">`
    + `<div class="calc-in"><p class="code" data-fade style="--d:.1s">${MCH}Calculator</p>`
    + `<h2 class="h2" data-rise style="--d:.2s"><span>Size a private AI.</span></h2>`
    + `<p class="lead" data-fade style="--d:.3s">Four questions. The estimate follows your answers: the cards it takes, the memory they hold, and what they cost today.</p>`
    + `<form class="form calc" id="calc" data-fade style="--d:.4s" novalidate>`
    + `<label class="sel"><span>Who is it for</span><select name="use">${c.uses.map(opt).join('')}</select><svg class="chev" aria-hidden="true"><use href="#g-arrows"/></svg></label>`
    + `<fieldset><legend>What should it do</legend><div class="pills">${c.tasks.map((o) => pill('checkbox', 'task', o, c.uses[0].tasks.includes(o.id))).join('')}</div></fieldset>`
    + `<fieldset><legend>How many people use it</legend><div class="pills">${c.teams.map((o, i) => pill('radio', 'team', o, i === 1)).join('')}</div></fieldset>`
    + `<fieldset><legend>How deep the answers</legend><div class="pills">${c.depth.map((o, i) => pill('radio', 'depth', o, i === 1, o.hint)).join('')}</div></fieldset>`
    + `</form></div>`
    + `<div class="calc-out" id="calc-out" aria-live="polite" data-fade style="--d:.5s"></div>`
    + `</div></section>`;
}

// The Machina compute (#/compute): the market at a glance, the cards by tier, the calculator, and how a request goes.
export function computeView(shop) {
  const m = shop.machina, v = m.view;
  return `<main class="view shop-v" id="view-compute" data-view="compute" data-wing="machina" data-crumb="Compute" data-crumb-parent="machina" data-page-title="Compute, Machina — lastfomo" tabindex="-1" hidden>`
    + `<section class="screen tall cat" data-title="Compute" data-wing="machina"><div class="wrap">`
    + `<div class="cat-head"><div class="stack"><p class="code" data-fade style="--d:.1s">${esc(m.screen.code)}</p>`
    + `<h1 class="h1" data-rise style="--d:.2s"><span>${esc(v.title)}</span></h1></div>`
    + `<p class="lead" data-fade style="--d:.3s">${esc(v.lead)}</p></div>`
    + rangeChart(m)
    + `<p class="src" data-fade style="--d:.5s">${esc(v.sources)}</p>`
    + `</div></section>`
    + `<section class="screen tall cat" data-title="The market" data-wing="machina"><div class="wrap">`
    + `<h2 class="h2" data-rise><span>The market, by tier.</span></h2>`
    + m.tiers.map((t, i) => `<div class="cat-g" id="cmp-${t.id}" data-fade style="--d:${(0.2 + i * 0.1).toFixed(1)}s"><h3 class="cat-t">${esc(t.label)} · ${esc(t.title)}</h3>`
      + `<ul class="goods-grid">${t.items.map((it) => computeCard(m, it)).join('')}</ul></div>`).join('')
    + `</div></section>`
    + calculator(m)
    + `<section class="screen" data-title="Order" data-wing="machina"><div class="wrap">`
    + `<h2 class="h2" data-rise><span>How a request works.</span></h2>`
    + steps(v.steps)
    + `<div class="next" data-fade style="--d:.5s"><button class="btn solid" type="button" data-basket>Open the basket</button><a class="big" href="#/machina">Machina${ne}</a></div>`
    + `</div></section></main>`;
}

/** What the calculator reads: every item by slug, the supply words and the method. */
export function computeData(shop) {
  const m = shop.machina;
  if (!m) return null;
  return {
    items: Object.fromEntries(items(m).map((it) => [it.slug, { name: it.name, mem: it.mem, price: it.price, tier: it.tier, supply: m.supply[it.supply] }])),
    tiers: Object.fromEntries(m.tiers.map((t) => [t.id, t.label])),
    calc: m.calc,
  };
}

/* ------------------------------------------------- Arca: market ------------------------------------------------- */

// A coin drawn as a ring in the tile, with the gold it holds; a work of art as an empty frame until the owner lists it.
const coin = (c) => `<span class="tile coin" aria-hidden="true"><b>${esc(c.gold.split(' of ')[0])}</b></span>`;
const frame = '<span class="tile frame" aria-hidden="true"></span>';

function miniCoin(c) {
  return `<li class="good mini">${coin(c)}<div class="gt"><h3 class="gn"><a href="#/market">${keep(c.name)}</a></h3>`
    + `<p class="gk">${keep(c.kind.split(' · ')[0])}</p><p class="gp">${esc(c.melt.t)} in gold</p></div></li>`;
}
function miniArt(w) {
  return `<li class="good mini">${frame}<div class="gt"><h3 class="gn"><a href="#/market">${esc(w.title)}</a></h3>`
    + `<p class="gk">${esc(w.artist)}</p><p class="gp">Price on request</p></div></li>`;
}

// The Market screen on the Arca case: the way in, and the coins and the art on a shelf.
export function arcaScreen(shop) {
  const a = shop.arca, h = a.screen, shelf = [...a.coins.map(miniCoin), ...a.art.map(miniArt)];
  return `<section class="screen cat" id="arca-market" data-title="Market" data-wing="arca"><div class="wrap">`
    + `<div class="cat-head"><div class="stack"><p class="code" data-fade style="--d:.1s">${esc(h.code)}</p>`
    + `<h2 class="h2" data-rise style="--d:.2s"><span>${esc(h.title)}</span></h2></div>`
    + `<div class="stack"><p class="lead" data-fade style="--d:.35s">${esc(h.lead)}</p>`
    + `<div class="row" data-fade style="--d:.45s"><a class="btn solid" href="#/market">${esc(h.cta)}</a></div></div></div>`
    + `<ul class="shelf" data-fade style="--n:${shelf.length};--d:.55s">${shelf.join('')}</ul>`
    + `</div></section>`;
}

// Gold in 2026: the month-end closes and today, a line on a dollar axis from $3,800 to $5,400. The points ride in
// data-points for the crosshair; the same values sit in a table for anyone who does not see the line.
const DOY = { Jan: 31, Feb: 59, Mar: 90, Apr: 120, May: 151, Jun: 181, Jul: 212, Aug: 243, Sep: 273 };
const MONTH = { Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June', Jul: 'July', Aug: 'August', Sep: 'September' };
function goldChart(g) {
  const lo = 3800, hi = 5400, first = DOY.Jan, last = 298; // 25 October is day 298 of 2026
  const pts = [...g.closes.map(([mo, v]) => ({ d: DOY[mo], v, label: MONTH[mo] + ' close' })), { d: last, v: g.now.price, label: g.now.label }];
  const x = (d) => ((d - first) / (last - first)) * 100, y = (v) => ((hi - v) / (hi - lo)) * 100;
  const P = pts.map((p) => [x(p.d), y(p.v)]);
  const line = P.map(([px, py], i) => `${i ? 'L' : 'M'}${(px * 10).toFixed(1)} ${(py * 3).toFixed(1)}`).join(' ');
  const area = `${line} L1000 300 L0 300 Z`;
  const ticks = [4000, 4500, 5000].map((v) => `<i style="--y:${y(v).toFixed(1)}%"><b>${usd(v)}</b></i>`).join('');
  const months = g.closes.map(([mo]) => `<i style="--x:${x(DOY[mo]).toFixed(1)}%">${mo}</i>`).join('') + `<i class="now" style="--x:100%">${esc(g.now.label)}</i>`;
  const data = pts.map((p, i) => [+P[i][0].toFixed(2), +P[i][1].toFixed(2), p.label, usd(p.v)]);
  const end = P[P.length - 1], peak = pts.reduce((b, p, i) => (p.v > pts[b].v ? i : b), 0);
  return `<figure class="gl" data-fade style="--d:.4s"><div class="gl-plot" tabindex="0" role="img" aria-label="Gold in 2026, month-end closes and ${esc(g.now.label)}: from ${usd(pts[0].v)} in January to ${usd(g.now.price)} today, after ${usd(pts[peak].v)} at the end of ${esc(MONTH[(g.closes[peak] || [])[0]] || 'the year')}." data-points="${esc(JSON.stringify(data))}">`
    + `<span class="gl-y" aria-hidden="true">${ticks}</span>`
    + `<svg viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true"><path class="gl-area" d="${area}"/><path class="gl-line" d="${line}"/></svg>`
    + `<span class="gl-dot" style="--x:${end[0].toFixed(1)}%;--y:${end[1].toFixed(1)}%" aria-hidden="true"></span>`
    + `<span class="gl-lab" style="--x:${end[0].toFixed(1)}%;--y:${end[1].toFixed(1)}%" aria-hidden="true">${usd(g.now.price)}</span>`
    + `<span class="gl-dot pk" style="--x:${P[peak][0].toFixed(1)}%;--y:${P[peak][1].toFixed(1)}%" aria-hidden="true"></span>`
    + `<span class="gl-lab pk" style="--x:${P[peak][0].toFixed(1)}%;--y:${P[peak][1].toFixed(1)}%" aria-hidden="true">${usd(pts[peak].v)}</span>`
    + `<span class="gl-cross" hidden></span><span class="gl-tip" hidden><b></b><span></span></span>`
    + `<span class="gl-x" aria-hidden="true">${months}</span></div>`
    + `<figcaption class="rg-cap"><span>Gold in ${esc(g.unit)}: month-end closes in 2026, and ${esc(g.now.label)}.</span></figcaption>`
    + `<table class="sr"><caption>Gold in 2026, ${esc(g.unit)}</caption><tbody>${pts.map((p) => `<tr><th scope="row">${esc(p.label)}</th><td>${usd(p.v)}</td></tr>`).join('')}</tbody></table></figure>`;
}

// What a coin sells for against the gold inside it: the gold as a solid bar, the price as an outlined stretch beyond
// it, on one scale for every coin (up to 1.8 times the gold), so the premiums compare at a glance.
function premium(c) {
  const k = (v) => ((v / c.melt.v / 1.8) * 100).toFixed(1) + '%';
  const priced = c.price.lo && c.price.hi;
  return `<div class="prem" aria-hidden="true"><i class="prem-g" style="--b:${k(c.melt.v)}"></i>${priced ? `<i class="prem-p" style="--a:${k(c.price.lo)};--b:${k(c.price.hi)}"></i>` : ''}</div>`;
}

function coinCard(c) {
  return `<li class="good coin-c">${coin(c)}<div class="gt"><p class="gk">${keep(c.kind)}</p><h3 class="gn">${keep(c.name)}</h3><p class="gs">${esc(c.gold)}</p>`
    + `<dl class="gd"><div><dt>Gold inside</dt><dd>${esc(c.melt.t)}</dd></div><div><dt>${esc(c.price.k)}</dt><dd>${esc(c.price.t)}</dd></div></dl>`
    + premium(c)
    + `<button class="btn sm" type="button" data-add="coin-${esc(c.slug)}">Add to basket</button></div></li>`;
}

function artCard(w) {
  return `<li class="good art-c">${frame}<div class="gt"><p class="gk">${esc(w.artist)}</p><h3 class="gn">${esc(w.title)}</h3>`
    + `<p class="gs">${esc(w.medium)}</p><p class="gp">Price on request</p></div></li>`;
}

// The Arca market (#/market): gold today, the coins against it, the art, and how a request goes.
export function marketView(shop) {
  const a = shop.arca, v = a.view, g = a.gold;
  const stat = (val, k, x) => `<div class="stat"><span class="v">${val}</span><span class="k">${k}</span><span class="x">${x}</span></div>`;
  return `<main class="view shop-v" id="view-market" data-view="market" data-wing="arca" data-crumb="Market" data-crumb-parent="arca" data-page-title="Market, Arca — lastfomo" tabindex="-1" hidden>`
    + `<section class="screen tall cat" data-title="Market" data-wing="arca"><div class="wrap">`
    + `<div class="cat-head"><div class="stack"><p class="code" data-fade style="--d:.1s">${esc(a.screen.code)}</p>`
    + `<h1 class="h1" data-rise style="--d:.2s"><span>${esc(v.title)}</span></h1></div>`
    + `<p class="lead" data-fade style="--d:.3s">${esc(v.lead)}</p></div>`
    + goldChart(g)
    + `<div class="stats gold-s" data-fade style="--d:.5s">`
    + stat(usd(g.now.price), 'Gold, an ounce', esc(g.now.source))
    + stat(num(g.rub.price) + '\u00a0₽', 'Gold, a gram', esc(g.rub.source) + ', ' + esc(g.rub.label))
    + stat(usd(g.high.price), 'The 2026 record', esc(g.high.source) + ', ' + esc(g.high.label))
    + `</div><p class="src" data-fade style="--d:.6s">${esc(g.sources)}</p></div></section>`
    + `<section class="screen tall cat" data-title="Gold coins" data-wing="arca"><div class="wrap">`
    + `<h2 class="h2" data-rise><span>Gold coins, against the gold inside.</span></h2>`
    + `<ul class="goods-grid" data-fade style="--d:.3s">${a.coins.map(coinCard).join('')}</ul>`
    + `<p class="src" data-fade style="--d:.4s"><span class="prem-k"><i class="prem-g"></i>The gold inside</span><span class="prem-k"><i class="prem-p"></i>What it sells for</span> Coins are priced on the day of sale; we confirm by email.</p>`
    + `</div></section>`
    + `<section class="screen tall cat" data-title="Art" data-wing="arca"><div class="wrap">`
    + `<div class="cat-head"><h2 class="h2" data-rise><span>Art, by invitation.</span></h2>`
    + `<div class="stack"><p class="lead" data-fade style="--d:.2s">Works from artists we follow, shown to the people who ask. Auctions and more artists are on the way.</p>`
    + `<div class="row" data-fade style="--d:.3s"><button class="btn solid" type="button" data-add="art-enquiry">Ask about the art</button></div></div></div>`
    + `<ul class="goods-grid" data-fade style="--d:.4s">${a.art.map(artCard).join('')}</ul>`
    + `</div></section>`
    + `<section class="screen" data-title="Order" data-wing="arca"><div class="wrap">`
    + `<h2 class="h2" data-rise><span>How a request works.</span></h2>`
    + steps(v.steps)
    + `<div class="next" data-fade style="--d:.5s"><button class="btn solid" type="button" data-basket>Open the basket</button><a class="big" href="#/arca">Arca${ne}</a></div>`
    + `</div></section></main>`;
}

/** The Arca lines the basket knows: each coin and an art enquiry, priced on the day. */
export function marketItems(shop) {
  const a = shop.arca;
  if (!a) return [];
  return [
    ...a.coins.map((c) => ({ slug: 'coin-' + c.slug, name: c.name, kind: 'Arca · gold coin, priced on the day', price: null, wing: 'arca', href: '#/market' })),
    { slug: 'art-enquiry', name: 'Art enquiry', kind: 'Arca · by invitation', price: null, wing: 'arca', href: '#/market' },
  ];
}
