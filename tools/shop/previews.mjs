// The Machina and Arca previews: one screen each on their cases, rendered from site/shop.json ("machina", "arca") by
// tools/shop/render.mjs. Machina says what it does (it builds private AI on site and sources the hardware) beside a study
// of what that hardware costs now against its launch price. Arca says the vault and the artists open later, beside the
// two markets it watches: gold this year and art by year. Every number on them is a dated, sourced fact in
// brand/ledger.json (machina.study.*, arca.study.*). The charts are built here as markup, and every value they draw is
// also written out in text.
import { esc, usd } from './html.mjs';

/** Throws on a preview that misses a field its screen needs. */
export function checkPreviews(shop) {
  const m = shop.machina, a = shop.arca;
  if (m) {
    for (const k of ['code', 'title', 'lead', 'outlook', 'note', 'cta']) if (!m.screen?.[k]) throw new Error(`site/shop.json: machina.screen has no ${k}`);
    for (const r of m.study || []) if (!r.name || !r.story || !(r.points?.length >= 2)) throw new Error(`site/shop.json: machina.study ${r.name || '?'} needs a name, a story and two points or more`);
  }
  if (a) {
    for (const k of ['code', 'title', 'lead', 'cta']) if (!a.screen?.[k]) throw new Error(`site/shop.json: arca.screen has no ${k}`);
    if (!a.gold?.closes?.length || !a.gold.now || !a.art?.years?.length) throw new Error('site/shop.json: arca needs gold closes, gold now and art years');
  }
}

// The words of a preview: label, title, lead, the line the chart answers into, and one way in.
const words = (s, live, extra = '') => `<div class="pv-t"><p class="code" data-fade style="--d:.1s">${esc(s.code)}</p>`
  + `<h2 class="h2" data-rise style="--d:.2s"><span>${esc(s.title)}</span></h2>`
  + `<p class="lead" data-fade style="--d:.3s">${esc(s.lead)}</p>`
  + `<p class="live" aria-live="polite" data-fade style="--d:.4s">${esc(live)}</p>${extra}`
  + `<div class="row" data-fade style="--d:.5s"><a class="btn solid" href="#/start">${esc(s.cta)}</a></div></div>`;

/* ---------------------------------------------- Machina: build and source ---------------------------------------------- */

// Launch price to latest, on a log axis from $700 to $20,000, so the length of a line is how many times dearer it got.
const LO = Math.log10(700), HI = Math.log10(20000);
const at = (v) => (((Math.log10(v) - LO) / (HI - LO)) * 100).toFixed(1) + '%';

function study(m) {
  const axis = `<div class="db-r db-axis" aria-hidden="true"><span></span><span class="db-p">${[1000, 2000, 5000, 10000, 20000].map((v) => `<i style="--x:${at(v)}">$${v / 1000}K</i>`).join('')}</span><span></span></div>`;
  const rows = m.study.map((r) => {
    const p = r.points, first = p[0], last = p[p.length - 1];
    const dots = p.map((v, i) => `<i class="db-d${i === 0 ? ' from' : i === p.length - 1 ? '' : ' mid'}" style="--x:${at(v)}"></i>`).join('');
    return `<li><button class="db-r" type="button" aria-pressed="false" data-story="${esc(r.story)}">`
      + `<span class="db-n"><b>${esc(r.name)}</b><i>${esc(r.kind)}</i></span>`
      + `<span class="db-p" aria-hidden="true"><i class="db-b" style="--a:${at(first)};--b:${at(last)}"></i>${dots}</span>`
      + `<span class="db-v">${usd(first)} → ${usd(last)}</span></button></li>`;
  }).join('');
  return `<figure class="db" data-fade style="--d:.3s">${axis}<ul>${rows}</ul>`
    + `<figcaption class="pv-cap"><span class="db-k"><i class="db-d from"></i>At launch</span><span class="db-k"><i class="db-d"></i>Latest</span><span>${esc(m.screen.note)}</span></figcaption></figure>`;
}

export function machinaScreen(shop) {
  const m = shop.machina;
  return `<section class="screen pv" id="machina-build" data-title="Build and source" data-wing="machina"><div class="wrap">`
    + words(m.screen, m.screen.outlook) + study(m) + `</div></section>`;
}

/* ---------------------------------------------- Arca: vault and artists ---------------------------------------------- */

// Gold in 2026: the month-end closes and the latest price, a line on a dollar axis from $3,800 to $5,400. The points ride
// in data-points for the crosshair; the same values sit in a table for anyone who does not see the line.
const DOY = { Jan: 31, Feb: 59, Mar: 90, Apr: 120, May: 151, Jun: 181, Jul: 212, Aug: 243, Sep: 273 };
const MONTH = { Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June', Jul: 'July', Aug: 'August', Sep: 'September' };
function goldChart(g) {
  const lo = 3800, hi = 5400, first = DOY.Jan, last = 298; // 25 October is day 298 of 2026
  const pts = [...g.closes.map(([mo, v]) => ({ d: DOY[mo], v, label: MONTH[mo] + ' close' })), { d: last, v: g.now.price, label: g.now.label }];
  const x = (d) => ((d - first) / (last - first)) * 100, y = (v) => ((hi - v) / (hi - lo)) * 100;
  const P = pts.map((p) => [x(p.d), y(p.v)]);
  const line = P.map(([px, py], i) => `${i ? 'L' : 'M'}${(px * 10).toFixed(1)} ${(py * 3).toFixed(1)}`).join(' ');
  const ticks = [4000, 4500, 5000].map((v) => `<i style="--y:${y(v).toFixed(1)}%"><b>${usd(v)}</b></i>`).join('');
  // A month too close to the latest point gives its label up to it.
  const months = g.closes.filter(([mo]) => x(DOY[mo]) < 88).map(([mo]) => `<i style="--x:${x(DOY[mo]).toFixed(1)}%">${mo}</i>`).join('') + `<i class="now" style="--x:100%">${esc(g.now.label)}</i>`;
  const data = pts.map((p, i) => [+P[i][0].toFixed(2), +P[i][1].toFixed(2), p.label, usd(p.v)]);
  const end = P[P.length - 1], peak = pts.reduce((b, p, i) => (p.v > pts[b].v ? i : b), 0);
  const where = (q) => `--x:${q[0].toFixed(1)}%;--y:${q[1].toFixed(1)}%`;
  return `<div class="gl-plot" tabindex="0" role="img" aria-label="Gold in 2026, month-end closes and ${esc(g.now.label)}: ${usd(pts[0].v)} in January, ${usd(pts[peak].v)} at the end of ${esc(MONTH[(g.closes[peak] || [])[0]] || 'the year')}, ${usd(g.now.price)} on ${esc(g.now.label)}." data-points="${esc(JSON.stringify(data))}">`
    + `<span class="gl-y" aria-hidden="true">${ticks}</span>`
    + `<svg viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true"><path class="gl-area" d="${line} L1000 300 L0 300 Z"/><path class="gl-line" d="${line}"/></svg>`
    + `<span class="gl-dot" style="${where(end)}" aria-hidden="true"></span><span class="gl-lab" style="${where(end)}" aria-hidden="true">${usd(g.now.price)}</span>`
    + `<span class="gl-dot pk" style="${where(P[peak])}" aria-hidden="true"></span><span class="gl-lab pk" style="${where(P[peak])}" aria-hidden="true">${usd(pts[peak].v)}</span>`
    + `<span class="gl-cross" hidden></span><span class="gl-tip" hidden><b></b><span></span></span>`
    + `<span class="gl-x" aria-hidden="true">${months}</span></div>`
    + `<p class="pv-cap">Gold in ${esc(g.unit)}: month-end closes in 2026, and ${esc(g.now.label)}.</p>`
    + `<table class="sr"><caption>Gold in 2026, ${esc(g.unit)}</caption><tbody>${pts.map((p) => `<tr><th scope="row">${esc(p.label)}</th><td>${usd(p.v)}</td></tr>`).join('')}</tbody></table>`;
}

// Art by year: one column a year from zero to $70 billion, the latest in the wing colour and the rest in grey; the
// latest and the peak carry their value, every column shows its own on hover or focus.
function artChart(a) {
  const max = 70, ys = a.years, peak = ys.reduce((b, y, i) => (y[1] > ys[b][1] ? i : b), 0);
  const ticks = [20, 40, 60].map((v) => `<i style="--y:${(100 - (v / max) * 100).toFixed(1)}%"><b>$${v}B</b></i>`).join('');
  const cols = ys.map(([yr, v], i) => {
    const last = i === ys.length - 1;
    return `<span class="ac-c${last ? ' on' : ''}${last || i === peak ? ' lab' : ''}" style="--h:${((v / max) * 100).toFixed(1)}%" tabindex="0" aria-label="${esc(yr)}: $${v.toFixed(1)} billion"><b aria-hidden="true">$${v.toFixed(1)}B</b><i aria-hidden="true">${esc(yr)}</i></span>`;
  }).join('');
  return `<div class="ac" role="group" aria-label="Global art sales by year">`
    + `<span class="gl-y" aria-hidden="true">${ticks}</span>${cols}</div>`
    + `<p class="pv-cap">${esc(a.note)}</p>`
    + `<table class="sr"><caption>Global art sales, ${esc(a.unit)}</caption><tbody>${ys.map(([yr, v]) => `<tr><th scope="row">${esc(yr)}</th><td>$${v.toFixed(1)} billion</td></tr>`).join('')}</tbody></table>`;
}

export function arcaScreen(shop) {
  const a = shop.arca, s = a.screen, first = a.tabs[0];
  const notes = `<dl class="pv-notes" data-fade style="--d:.45s">${s.notes.map((n) => `<div><dt>${esc(n.t)}</dt><dd>${esc(n.s)}</dd></div>`).join('')}</dl>`;
  const tabs = `<div class="tabs" role="tablist" aria-label="Markets we watch">${a.tabs.map((t, i) => `<button type="button" role="tab" id="arca-tab-${esc(t.id)}" aria-controls="arca-${esc(t.id)}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''} data-text="${esc(t.text)}">${esc(t.label)}</button>`).join('')}</div>`;
  const panel = (id, body, i) => `<div class="pv-panel" role="tabpanel" id="arca-${id}" aria-labelledby="arca-tab-${id}"${i ? ' hidden' : ''}>${body}</div>`;
  return `<section class="screen pv" id="arca-vault" data-title="Vault and artists" data-wing="arca"><div class="wrap">`
    + words(s, first.text, notes)
    + `<figure class="pv-fig" data-fade style="--d:.3s">${tabs}${panel('gold', goldChart(a.gold), 0)}${panel('art', artChart(a.art), 1)}</figure>`
    + `</div></section>`;
}
