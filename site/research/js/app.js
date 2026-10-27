/* Hortus research: an index and one page per study. Each page is a run of full screens, read one at a time.
   Studies come from one registry, so a new study is one more view and one more entry. Runtime capabilities
   (downloads, Claude) light up when the viewer grants them; the page works without them. */
(async function () {
  "use strict";
  // Where the page's own files live: beside this script's folder (js/), in the Artifact and under /research/ on the web.
  const BASE = ((document.currentScript && document.currentScript.src) || location.href).replace(/js\/app\.js(?:[?#].*)?$/, "");
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const HC = window.HC, HD = window.HortusDeck, HV = window.HortusVision, HN = window.HortusNeeds, HR = window.HortusReport, HS = window.HortusScenes;
  document.documentElement.classList.add("js");
  const reduce = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const toastEl = $("[data-toast]");
  let toastT = 0;
  const toast = (msg) => { toastEl.textContent = msg; toastEl.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("on"), 3200); };
  const f0 = (v) => HC.sfmt(v, 0), f1 = (v) => HC.sfmt(v, 1);
  const esc = (s) => String(s === null || s === undefined ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const pval = (p) => (p < 0.001 ? "<0.001" : p.toFixed(3));
  const ARROW = '<svg aria-hidden="true"><use href="#g-e"/></svg>';
  const stat = (v, u, k, x, cls) => `<div class="stat"><span class="v ${cls || ""}">${v}<small>${u}</small></span><span class="k">${k}</span>${x ? `<span class="x">${x}</span>` : ""}</div>`;

  /* ---------- the registry: one entry per study, oldest first ---------- */
  const STUDIES = [
    { id: "el-nino-2026", n: "01", key: "r1", title: "The 2026–27 El Niño", sub: "Climate and crops", date: "October 2026", paper: "hortus-study-01-el-nino-2026-27-paper.pdf", deck: "hortus-study-01-el-nino-2026-27-deck.pdf" },
    { id: "plant-vision", n: "02", key: "r2", title: "Seeing what plants need", sub: "Plant vision and automation", date: "October 2026", paper: "hortus-study-02-plant-vision-paper.pdf", deck: "hortus-study-02-plant-vision-deck.pdf" }
  ];
  const byKey = (k) => STUDIES.find((s) => s.key === k);
  const ALIAS = { hub: "research", elnino: "el-nino-2026", vision: "plant-vision" }; // links from the first version

  /* ---------- theme: follows the system (the site's own setting lives on its home screen) ---------- */
  if (window.matchMedia) { const mq = matchMedia("(prefers-color-scheme: dark)"); if (mq.addEventListener) mq.addEventListener("change", () => redrawAll()); }
  $$("[data-horse]").forEach((a) => (a.innerHTML = window.HortusBrand.horse("", "")));

  /* ---------- data ---------- */
  const getJSON = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u + " " + r.status); return r.json(); });
  const D = {};
  try {
    [D.r1, D.sst, D.land, D.r2] = await Promise.all(["r1", "sst-oct2026", "land", "r2-fields"].map((n) => getJSON(BASE + "data/" + n + ".json")));
  } catch (e) {
    console.error(e); toast("The study data did not load. Reload the page to try again.");
  }
  window.__HORTUS_DATA = D;
  const r1 = D.r1, r2 = D.r2;

  /* ---------- capabilities: inside a claude.ai Artifact the viewer grants them; on the web the browser saves files ---------- */
  const caps = { sample: null, images: false, downloads: null };
  const inArtifact = !!(window.claude && typeof window.claude.use === "function");
  const useCap = (n) => (inArtifact ? window.claude.use(n).catch(() => null) : Promise.resolve(null));
  const browserSave = { save: async ({ filename, data }) => {
    const url = URL.createObjectURL(data), a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return { status: "downloading" };
  } };
  const dlReady = (inArtifact ? useCap("downloads") : Promise.resolve(browserSave)).then((d) => { caps.downloads = d; syncDownloads(); return d; });
  const aiReady = useCap("sample").then(async (s) => {
    caps.sample = s;
    if (s && s.limits) { try { const l = await s.limits(); caps.images = !!(l && l.images); } catch (e) { caps.images = false; } }
    syncAI(); return s;
  });
  function syncDownloads() {
    const ok = !!caps.downloads;
    $$("[data-dl-row]").forEach((r) => (r.hidden = !ok));
    $$("[data-reader-pdf],[data-deck-pdf]").forEach((b) => (b.hidden = !ok));
    $$("[data-export]").forEach((b) => (b.disabled = !ok));
    $$("[data-dl-note]").forEach((n) => (n.hidden = ok));
  }
  function syncAI() {
    $$("[data-ask]").forEach((a) => (a.hidden = !caps.sample));
    const on = !!(caps.sample && caps.images);
    $$("[data-claude],[data-claude-hint]").forEach((b) => (b.hidden = !on));
  }
  syncDownloads(); syncAI();
  async function save(filename, data) {
    const dl = caps.downloads || (await dlReady);
    if (!dl) { toast("Saving files is not available in this view."); return; }
    try { const r = await dl.save({ filename, data }); if (!r || r.status === "saved") toast("Saved " + filename); else if (r.status === "downloading") toast("Downloading " + filename); }
    catch (e) {
      const c = e && e.code;
      if (c === "declined") return;
      if (c === "unavailable") { caps.downloads = null; syncDownloads(); toast("Saving files is not available in this view."); return; }
      toast(c === "rate_limited" ? "A save is already waiting for you. Try again in a moment." : "The file could not be saved here.");
    }
  }
  async function savePdf(key) {
    const [k, kind] = key.split("-"), s = byKey(k), file = s && s[kind];
    if (!file) return;
    try { const b = await (await fetch(BASE + "pdf/" + file)).blob(); await save(file, b); }
    catch (e) { toast("The PDF could not be loaded."); }
  }
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-pdf]"); if (b) savePdf(b.dataset.pdf); });

  /* ---------- views and screens ---------- */
  const views = Object.fromEntries($$("[data-view]").map((v) => [v.dataset.view, v]));
  const dotsEl = $("[data-dots]"), prog = $("[data-prog]"), curtain = $(".curtain"), bar = $("header.bar");
  const SC = {}, INIT = {}, inited = {}, started = {}, players = [];
  let cur = null, swapping = false;

  // Count-ups: the number written in the page is the final value; it starts from zero when its screen arrives.
  const countText = (el, v) => (el.dataset.prefix || "") + v.toFixed(+el.dataset.dec || 0) + (el.dataset.suffix || "");
  const countUp = (el) => {
    if (el.dataset.counted) return; el.dataset.counted = "1";
    const to = +el.dataset.count, end = el.dataset.final || el.textContent;
    if (reduce() || !isFinite(to)) { el.textContent = end; return; }
    const t0 = performance.now(), dur = 1300;
    const step = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = k < 1 ? countText(el, to * (1 - Math.pow(1 - k, 3))) : end; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  function screensOf(id) {
    if (SC[id]) return SC[id];
    const v = views[id], s = (SC[id] = { v, list: $$(":scope > .screen", v), active: -1 });
    s.list.forEach((sc) => $$("[data-count]", sc).forEach((el) => { el.dataset.final = el.textContent; if (!reduce()) el.textContent = countText(el, 0); }));
    let ticking = false;
    v.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; track(id); }); } }, { passive: true });
    return s;
  }
  // The active screen is the one under the middle of the view. It reveals once, lights its dot and moves the progress line.
  function track(id) {
    const s = SC[id]; if (!s || cur !== id) return;
    const v = s.v, mid = v.scrollTop + v.clientHeight * 0.5, max = v.scrollHeight - v.clientHeight;
    prog.style.width = (max > 0 ? Math.min(1, v.scrollTop / max) * 100 : 0) + "%";
    let i = s.list.findIndex((sc) => sc.offsetTop <= mid && sc.offsetTop + sc.offsetHeight > mid);
    if (i < 0) i = v.scrollTop <= 0 ? 0 : s.list.length - 1;
    if (i === s.active) return;
    s.active = i;
    const sc = s.list[i];
    if (!sc.classList.contains("in")) { sc.classList.add("in"); $$("[data-count]", sc).forEach(countUp); const fs = sc._in || []; sc._in = null; fs.forEach((f) => f()); }
    $$("button", dotsEl).forEach((b, j) => b.setAttribute("aria-current", String(j === i)));
    dotsEl.classList.toggle("on-plate", sc.classList.contains("plate"));
    bar.classList.toggle("plate", sc.classList.contains("plate"));
  }
  const onIn = (el, f) => { const sc = el.closest(".screen"); if (!sc || sc.classList.contains("in")) f(); else (sc._in = sc._in || []).push(f); };
  function buildDots(id) {
    const s = screensOf(id);
    dotsEl.innerHTML = s.list.map((sc, i) => `<button type="button" data-dot="${i}" aria-current="false"><span>${esc(sc.dataset.title)}</span><i></i></button>`).join("");
    s.active = -1; track(id);
  }
  const scrollToScreen = (sc, instant) => sc.closest(".view").scrollTo({ top: sc.offsetTop, behavior: instant || reduce() ? "instant" : "smooth" });
  function jump(target) {
    const v = views[cur]; if (!v) return;
    const el = typeof target === "string" ? v.querySelector("#" + CSS.escape(target)) : target;
    if (el) scrollToScreen(el.closest(".screen") || el);
  }
  dotsEl.addEventListener("click", (e) => { const b = e.target.closest("[data-dot]"), s = SC[cur]; if (b && s && s.list[+b.dataset.dot]) scrollToScreen(s.list[+b.dataset.dot]); });

  /* ---------- router: bare hash tokens, one view at a time, a curtain between them ---------- */
  function resolve(h) {
    h = (h || "").replace(/^#\/?/, "");
    try { h = decodeURIComponent(h); } catch (e) { /* keep as typed */ }
    if (ALIAS[h]) h = ALIAS[h];
    if (views[h]) return { id: h };
    const el = h && document.getElementById(h), v = el && el.closest("[data-view]");
    return v ? { id: v.dataset.view, el } : { id: "research" };
  }
  function show(id, opts) {
    opts = opts || {};
    if (!views[id]) id = "research";
    if (id === cur) { jump(opts.el || views[id].querySelector(".screen")); return; }
    const swap = () => {
      players.forEach((p) => p.stop());
      Object.entries(views).forEach(([k, v]) => (v.hidden = k !== id));
      cur = id;
      const v = views[id], s = STUDIES.find((x) => x.id === id), cs = $("[data-crumb-study]");
      cs.hidden = !s; if (s) $("span", cs).textContent = `${s.n} · ${s.title}`;
      const ci = $("[data-crumb-index] a"); if (ci) (s ? ci.removeAttribute("aria-current") : ci.setAttribute("aria-current", "page"));
      if (!inArtifact) document.title = s ? `${s.title}, Hortus research — lastfomo` : "Research, Hortus — lastfomo";
      if (!inited[id]) { inited[id] = true; try { (INIT[id] || (() => {}))(); } catch (e) { console.error(e); } }
      v.scrollTo({ top: opts.el ? (opts.el.closest(".screen") || opts.el).offsetTop : 0, behavior: "instant" });
      buildDots(id); stage(v);
      v.focus({ preventScroll: true });
      if (!opts.fromHash && location.hash.slice(1) !== id) { try { history.replaceState(null, "", "#" + id); } catch (e) { /* sandboxed frame */ } }
    };
    if (cur === null || reduce()) { swap(); return; }
    if (swapping) return;
    swapping = true;
    curtain.classList.remove("on"); void curtain.offsetWidth; curtain.classList.add("on");
    setTimeout(swap, 380);
    setTimeout(() => { curtain.classList.remove("on"); swapping = false; }, 920);
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-go]"); if (a) { e.preventDefault(); show(a.dataset.go); return; }
    const j = e.target.closest("[data-jump]"); if (j) { e.preventDefault(); jump(j.dataset.jump); return; }
    if (e.target.closest("[data-top]")) { jump(views[cur].querySelector(".screen")); return; }
    if (e.target.closest("[data-skip]")) { e.preventDefault(); views[cur].focus(); }
  });
  addEventListener("hashchange", () => { const r = resolve(location.hash); show(r.id, { fromHash: true, el: r.el }); });

  /* ---------- stages (three.js), started once, on first view ---------- */
  function stage(v) {
    const cv = $("canvas[data-scene]", v);
    if (!window.THREE || !HS || !cv || started[cv.dataset.scene]) return;
    const key = cv.dataset.scene; started[key] = true;
    try {
      if (key === "meadow") HS.meadow(cv);
      else if (key === "globe") HS.globe(cv, { sst: D.sst, land: D.land, regions: r1 ? r1.regions : [] });
      else if (key === "scan") HS.scan(cv);
    } catch (e) { console.warn("stage", e); }
  }

  /* ---------- outlined schemas: a two-column snake that reads left to right, then down ---------- */
  const SNAKE = [[10, 10], [190, 10], [190, 124], [10, 124], [10, 238], [190, 238]];
  const snake = (items, label) => HD.schema(items.map((n, i) => Object.assign({ x: SNAKE[i][0], y: SNAKE[i][1], w: 160, h: 84 }, n)), items.slice(1).map((n, i) => [items[i].id, n.id]), [360, 332], { label });
  const SCHEMAS = {
    enso: () => snake([
      { id: "a", t: "Ocean", s: ["Warm water", "spreads east"], wing: true }, { id: "b", t: "Atmosphere", s: ["Rising air", "follows it"] },
      { id: "c", t: "Rain belts", s: ["Some dry,", "some flood"] }, { id: "d", t: "Crop stage", s: ["Timing decides", "the damage"], wing: true },
      { id: "e", t: "Harvest", s: ["Yields fall in", "the dry belts"] }, { id: "f", t: "Food", s: ["Imports and the", "lean season"] }
    ], "How El Niño reaches a field: ocean, atmosphere, rain belts, crop stage, harvest, food"),
    method: () => snake([
      { id: "a", t: "Data", s: ["Public", "measurements"] }, { id: "b", t: "Index", s: ["What the data", "says now"] },
      { id: "c", t: "Model", s: ["What usually", "follows"], wing: true }, { id: "d", t: "Decision", s: ["What to do,", "and how sure"] },
      { id: "e", t: "Hardware", s: ["Repeated decisions,", "automated"], wing: true }
    ], "Data, index, model, decision, hardware")
  };
  // Draw a schema into its holder and play the outline once its screen arrives; returns a redraw.
  function schemaInto(host, build) {
    const draw = () => {
      host.innerHTML = build();
      const s = $(".schema", host);
      if (s) onIn(host, () => requestAnimationFrame(() => requestAnimationFrame(() => s.classList.add("in"))));
    };
    draw();
    return draw;
  }

  /* ---------- the numbers behind every chart, in a side sheet ---------- */
  const TABLES = {}, tsheet = $("[data-tablesheet]");
  function tableBtn(key, spec) {
    TABLES[key] = spec;
    const host = $(`[data-c="${key}"]`), fig = host && host.closest("figure");
    if (!fig || $(`[data-tbl="${key}"]`, fig)) return;
    const b = `<button class="tlink" type="button" data-tbl="${key}">Table</button>`;
    const cap = $("figcaption", fig), leg = $(".legend", fig);
    if (cap) cap.insertAdjacentHTML("beforeend", " " + b);
    else if (leg) leg.insertAdjacentHTML("beforeend", `<li>${b}</li>`);
    else fig.insertAdjacentHTML("beforeend", `<p class="cap">${b}</p>`);
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-tbl]"); if (!b || !TABLES[b.dataset.tbl]) return;
    const t = TABLES[b.dataset.tbl](), body = $("[data-table-body]");
    $("[data-table-head]").textContent = t.title; body.innerHTML = "";
    HC.table(body, t.cols, t.rows, t.title).open = true;
    if (t.note) body.insertAdjacentHTML("beforeend", `<p class="note">${t.note}</p>`);
    tsheet.showModal ? tsheet.showModal() : (tsheet.open = true);
  });

  /* ---------- date axes: one tick on the first of every n-th month ---------- */
  function dateAxis(values, every) {
    const xs = values.map((p) => p.x), lo = Math.min(...xs), hi = Math.max(...xs);
    const t = new Date(lo); t.setUTCDate(1); t.setUTCHours(0, 0, 0, 0); if (t.getTime() < lo) t.setUTCMonth(t.getUTCMonth() + 1);
    const ticks = [];
    while (t.getTime() <= hi) { ticks.push(t.getTime()); t.setUTCMonth(t.getUTCMonth() + (every || 1)); }
    return { min: lo, max: hi, ticks: (W) => (W < 420 ? ticks.filter((_, i) => i % 2 === 0) : ticks), fmt: (v) => HC.dfmt(v, false, false), tip: (v) => HC.dfmt(v) };
  }

  /* ---------- canvases repaint on theme change; SVG charts follow the tokens by themselves ---------- */
  const redrawers = [];
  function redrawAll() { setTimeout(() => redrawers.forEach((f) => { try { f(); } catch (e) { /* keep going */ } }), 30); }

  /* ---------- facts written into the copy ---------- */
  (function facts() {
    if (!r1 || !r2) return;
    const set = (k, v) => $$(`[data-fact="${k}"]`).forEach((e) => (e.textContent = v));
    const oct = r1.facts.oct["2026"];
    set("r1-oct-big", `${HC.sfmt(oct.rel, 2)} °C`);
    set("r1-oct-inline", `${HC.sfmt(oct.rel, 2)} °C`);
    set("r1-prev", `${HC.sfmt(r1.facts.max_rel_before, 2)} °C in November 2015`);
    const zam = r1.regions.find((x) => x.id === "saf_zambezi");
    set("zam-im", `${f0(zam.hist.find((h) => h.y === 2023).rain)}% against normal`);
    const big = $('[data-count="52"]'); if (big) { const d = Math.round(zam.agree.d2023); big.dataset.count = d; big.textContent = "+" + d; }
    const sl = r1.global.map((x) => x.slope), pmin = Math.min(...r1.global.map((x) => x.p));
    set("global-line", `Every world slope for maize, wheat, rice and soybean lies between ${f1(Math.min(...sl))}% and ${f1(Math.max(...sl))}% per °C, in the onset year and the year after, and none is significant (smallest p = ${pmin.toFixed(2)}). The losses are regional.`);
    set("jv-cap25", `10 August 2025. ${Math.round(r2.java.green_share_2025 * 100)}% of the window reached NDVI 0.5 in July–September; ${Math.round(r2.java.rain_jas_2025)} mm of rain fell from 1 July to 14 September.`);
    set("jv-cap26", `13 August 2026. ${Math.round(r2.java.green_share_2026 * 100)}% reached NDVI 0.5; ${Math.round(r2.java.rain_jas_2026)} mm of rain fell over the same weeks.`);
  })();

  // The last screen of every study points to the next one in the registry.
  function renderNext(id) {
    const s = STUDIES.find((x) => x.id === id), i = STUDIES.indexOf(s), nx = STUDIES[(i + 1) % STUDIES.length], host = $("[data-next]", views[id]);
    if (!host) return;
    host.innerHTML = (nx && nx !== s ? `<p class="code" data-fade>HRT — Next study</p><div class="next" data-up><a class="big" href="#${nx.id}" data-go="${nx.id}">${nx.title}${ARROW}</a><span class="label">Study ${nx.n} · ${nx.sub}</span></div>` : "")
      + `<div class="row" data-fade><a class="btn" href="#research" data-go="research">All studies</a><button class="btn" type="button" data-top>Back to the top</button></div>`;
  }

  /* ======================= RESEARCH INDEX ======================= */
  INIT.research = () => {
    $("[data-studies]").innerHTML = STUDIES.map((s) => `<li><a href="#${s.id}" data-go="${s.id}"><span class="n">${s.n}</span><span class="t">${s.title}</span><span class="s">${s.sub} · ${s.date}</span><span class="ar" aria-hidden="true"><svg><use href="#g-e"/></svg></span></a></li>`).join("");
    const last = STUDIES[STUDIES.length - 1], a = $("[data-latest]");
    a.href = "#" + last.id; a.dataset.go = last.id;
    schemaInto($('[data-schema="method"]'), SCHEMAS.method);
  };

  /* ======================= STUDY 01 · EL NIÑO ======================= */
  INIT["el-nino-2026"] = () => {
    renderNext("el-nino-2026");
    if (!r1) return;
    const ML = HC.MONTHS, LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    // shorter names for narrow charts
    const BELT = { saf_highveld: "Highveld", saf_zambezi: "Zambezi belt", eth_highlands: "Ethiopian highlands", eth_northeast: "N and E Ethiopia", ind_core: "India monsoon", idn_java: "Java", tha_central: "Thailand rice", aus_east: "E Australia wheat", cam_dry: "Dry Corridor", waf_cocoa: "Cocoa belt", bra_northeast: "NE Brazil", arg_pampas: "Pampas", bra_south: "S Brazil", ken_bimodal: "Kenya short rains", usa_cornbelt: "US Corn Belt" };
    const CROP = (c) => ({ Soybeans: "soy", "Cocoa beans": "cocoa" }[c] || c.toLowerCase());
    const mx = (m) => +m.slice(0, 4) + (+m.slice(5, 7) - 0.5) / 12;
    const monthName = (x) => { const y = Math.floor(x), m = Math.round((x - y) * 12 + 0.5); return ML[m - 1] + " " + y; };

    // the event
    const relPts = r1.enso.filter((e) => e.rel !== null).map((e) => ({ x: mx(e.m), y: e.rel }));
    const bands = r1.events.map((e) => ({ x0: +e.start.slice(0, 4) + (+e.start.slice(5, 7) - 1) / 12, x1: +e.end.slice(0, 4) + +e.end.slice(5, 7) / 12 + (e.ongoing ? 1 / 12 : 0) }));
    const last = relPts[relPts.length - 1];
    HC.line($('[data-c="enso"]'), { label: "Relative Niño-3.4, monthly, 1982 to October 2026", series: [{ name: "Relative Niño-3.4", cls: "focus", values: relPts }], bands, x: { min: 1982, max: 2027, fmt: (v) => String(Math.round(v)), tip: monthName }, y: { fmt: f0, tip: (v) => HC.sfmt(v, 2) + " °C" }, hlines: [{ y: 2, label: "+2 °C" }], marks: [{ x: last.x, y: last.y, label: "Oct 2026" }] });
    tableBtn("enso", () => ({ title: "El Niño events since 1982", cols: [{ h: "Event", f: (e) => `${e.start} to ${e.ongoing ? "now" : e.end}` }, { h: "Peak, 3-month", r: 1, f: (e) => HC.sfmt(e.peak, 2) + " °C" }, { h: "Peak season", f: (e) => e.peak_month }, { h: "Class", f: (e) => e.class }], rows: r1.events, note: "Relative Niño-3.4, NOAA OISST v2.1, CPC relative method. October 2026 is preliminary (1–24 October)." }));

    // past events
    const YRS = ["1982", "1997", "2015", "2023", "2026"];
    HC.line($('[data-c="ana"]'), { label: "Strong El Niño events compared: relative Niño-3.4 by month", endLabels: true, series: YRS.map((y) => ({ name: y, cls: y === "2026" ? "focus" : "ctx", values: r1.analogues[y].map((v, i) => ({ x: i, y: v })) })), x: { min: 0, max: 17, ticks: (W) => (W < 520 ? [0, 6, 12] : [0, 3, 6, 9, 12, 15]), fmt: (v) => ML[v % 12] + (v >= 12 ? " +1" : ""), tip: (v) => ML[v % 12] + (v >= 12 ? " of the following year" : " of the onset year") }, y: { fmt: f1, tip: (v) => HC.sfmt(v, 2) + " °C" } });
    tableBtn("ana", () => ({ title: "Relative Niño-3.4 by month, °C", cols: [{ h: "Month", k: "m" }].concat(YRS.map((y) => ({ h: y, r: 1, f: (r) => (r[y] === null || r[y] === undefined ? "—" : HC.sfmt(r[y], 2)) }))), rows: Array.from({ length: 18 }, (_, i) => Object.assign({ m: ML[i % 12] + (i >= 12 ? ", next year" : "") }, Object.fromEntries(YRS.map((y) => [y, r1.analogues[y][i]])))) }));

    // at a glance
    const za = r1.yields.find((y) => y.code === "ZAF" && y.crop === "Maize"), zm = r1.models.find((m) => m.code === "ZAF");
    $('[data-stats="r1"]').innerHTML = [
      [HC.sfmt(r1.facts.oct["2026"].rel, 2), "°C", "Relative Niño-3.4", "October 2026, 1–24 Oct, preliminary", "w"],
      [HC.sfmt(r1.facts.oct["2026"].abs, 2), "°C", "Niño-3.4 vs 1991–2020", "The raw anomaly, before removing tropical warming"],
      [HC.sfmt(za.slope, 1), "%", "South Africa maize per °C", `95% CI ${HC.sfmt(za.lo, 1)} to ${HC.sfmt(za.hi, 1)}, 1982–2018`],
      [String(Math.round(zm.preds[1].p_loss10 * 100)), "%", "Chance of a >10% maize loss", "South Africa, 2027 harvest, at a 2.5 °C season"]
    ].map((a) => stat(a[0], a[1], a[2], a[3], a[4])).join("");
    schemaInto($('[data-schema="enso"]'), SCHEMAS.enso);

    // rain: the map, the fifteen belts and every season of one belt
    let sel = "saf_highveld";
    const regSel = $("[data-region-select]");
    r1.regions.forEach((x) => regSel.add(new Option(x.name, x.id)));
    regSel.value = sel;
    regSel.addEventListener("change", () => pick(regSel.value));
    const drawMap = () => { const host = $('[data-c="map"]'); host.innerHTML = ""; HC.worldMap(host, { land: D.land, nino: true, vmax: 40, label: "Crop belts and their rainfall response to El Niño", boxes: r1.regions.map((x) => ({ id: x.id, lat: x.lat, lon: x.lon, v: x.im.slope, label: x.name, short: HD.SHORT[x.id] || "", selected: x.id === sel })), tip: (b) => `${HC.sfmt(b.v, 0)}% of seasonal rain per °C`, onClick: (b) => { pick(b.id); jump("seasons"); } }); };
    const pick = (id) => { sel = id; regSel.value = id; drawMap(); panel(); };
    const panel = () => {
      const x = r1.regions.find((q) => q.id === sel);
      const MS = LONG[x.season[0] - 1] + "–" + LONG[x.season[x.season.length - 1] - 1];
      $('[data-rp="line"]').textContent = `${x.crop}. ${MS} rain ${x.im.slope < 0 ? "falls" : "rises"} by about ${Math.abs(x.im.slope).toFixed(0)}% for each °C of the index${x.im.p < 0.05 ? "" : ", not significant at 5%"}.`;
      const host = $('[data-c="region"]'); host.innerHTML = "";
      const pts = x.hist.filter((h) => h.y >= 2001 && h.rain !== null && h.enso !== null).map((h) => ({ x: h.enso, y: h.rain, label: String(h.y), tag: [1997, 2015, 2023].includes(h.y) ? String(h.y) : "" }));
      if (x.now.rain !== null && x.now.enso !== null) pts.push({ x: x.now.enso, y: x.now.rain, label: "2026 so far", tag: "2026", focus: true });
      const ok = pts.filter((p) => !p.focus), mxv = ok.reduce((a, p) => a + p.x, 0) / ok.length, myv = ok.reduce((a, p) => a + p.y, 0) / ok.length;
      HC.scatter(host, { label: `${x.name}: seasonal rain against the El Niño index`, points: pts, fit: { b0: myv - x.im.slope * mxv, b1: x.im.slope }, x: { label: "index, °C", fmt: f1 }, y: { label: "rain, % vs normal", fmt: f0 }, tip: (p) => `index ${HC.sfmt(p.x, 2)} °C · rain ${HC.sfmt(p.y, 0)}%` });
      $('[data-rp="kv"]').innerHTML = [["Response", `${HC.sfmt(x.im.slope, 1)}% per °C`], ["95% interval", `${HC.sfmt(x.im.lo, 0)} to ${HC.sfmt(x.im.hi, 0)}%`], ["2026 so far", x.now.rain === null ? "No season data yet" : `${HC.sfmt(x.now.rain, 0)}% rain, ${HC.sfmt(x.now.tmax, 1)} °C hotter`], ["Data agreement", `r = ${x.agree.r.toFixed(2)}, MERRA-2 vs IMERG`]].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
    };
    drawMap(); panel(); redrawers.push(drawMap);
    tableBtn("region", () => { const x = r1.regions.find((q) => q.id === sel); return { title: `${x.name}: every season`, cols: [{ h: "Season", f: (h) => String(h.y) }, { h: "Index, °C", r: 1, f: (h) => HC.sfmt(h.enso, 2) }, { h: "Rain, IMERG", r: 1, f: (h) => (h.rain === null ? "—" : HC.sfmt(h.rain, 0) + "%") }, { h: "Rain, MERRA-2", r: 1, f: (h) => (h.m2 === null || h.m2 === undefined ? "—" : HC.sfmt(h.m2, 0) + "%") }, { h: "Max temp.", r: 1, f: (h) => (h.tmax === null || h.tmax === undefined ? "—" : HC.sfmt(h.tmax, 1) + " °C") }], rows: x.hist.filter((h) => h.y >= 2001), note: "Rain as % of the 2001–2020 normal for the crop season; temperature as the departure of the seasonal mean maximum." }; });
    HC.forest($('[data-c="rain"]'), { label: "Rainfall response by crop belt", x: { min: -100, max: 50, fmt: (v) => f0(v) + "%", label: "% per °C" }, rows: r1.regions.slice().sort((a, b) => a.im.slope - b.im.slope).map((x) => ({ id: x.id, label: x.name, short: BELT[x.id], sub: x.crop, v: x.im.slope, lo: x.im.lo, hi: x.im.hi, focus: x.im.p < 0.05, right: f0(x.im.slope) + "%", note: `p = ${pval(x.im.p)}, n = ${x.im.n} seasons` })), onClick: (r) => { pick(r.id); jump("seasons"); } });
    tableBtn("rain", () => ({ title: "Rainfall response by crop belt", cols: [{ h: "Belt", k: "name" }, { h: "Season", f: (x) => x.season.map((m) => ML[m - 1]).join("–") }, { h: "% per °C", r: 1, f: (x) => HC.sfmt(x.im.slope, 1) }, { h: "95% CI", r: 1, f: (x) => `${f0(x.im.lo)} to ${f0(x.im.hi)}` }, { h: "p", r: 1, f: (x) => pval(x.im.p) }, { h: "MERRA-2, % per °C", r: 1, f: (x) => HC.sfmt(x.m2.slope, 1) }], rows: r1.regions.slice().sort((a, b) => a.im.slope - b.im.slope) }));

    // a data check
    HC.bars($('[data-c="agree"]'), { label: "Agreement between rainfall datasets", max: 1, fmt: (v) => v.toFixed(2), rows: r1.regions.map((x) => ({ label: x.name, short: BELT[x.id], v: Math.max(0, x.agree.r), text: x.agree.r.toFixed(2).replace("-", "−"), focus: x.agree.r < 0.5 })).sort((a, b) => a.v - b.v) });
    tableBtn("agree", () => ({ title: "MERRA-2 against IMERG, seasonal rain", cols: [{ h: "Belt", k: "name" }, { h: "Correlation", r: 1, f: (x) => x.agree.r.toFixed(2).replace("-", "−") }, { h: "Gap in 2023, points", r: 1, f: (x) => (x.agree.d2023 === null || x.agree.d2023 === undefined ? "—" : HC.sfmt(x.agree.d2023, 0)) }], rows: r1.regions.slice().sort((a, b) => a.agree.r - b.agree.r) }));

    // 2026 so far: rain or heat
    const nowHost = $('[data-c="now"]'), nowCap = $("[data-now-cap]");
    const nowRows = r1.regions.filter((x) => x.now.rain !== null && x.id !== "bra_northeast");
    let nowM = "rain";
    const drawNow = () => {
      nowHost.innerHTML = "";
      if (nowM === "rain") HC.forest(nowHost, { label: "Rain in the 2026 season so far", x: { min: -100, max: 40, fmt: (v) => f0(v) + "%" }, rows: nowRows.slice().sort((a, b) => a.now.rain - b.now.rain).map((x) => ({ label: x.name, short: BELT[x.id], sub: x.now.months.split(",").map((m) => ML[m - 1]).join(" "), v: x.now.rain, lo: x.now.rain, hi: x.now.rain, focus: x.now.rain < -10, right: f0(x.now.rain) + "%" })), valueWidth: 70 });
      else HC.bars(nowHost, { label: "Heat in the 2026 season so far", fmt: (v) => "+" + v.toFixed(1) + " °C", rows: nowRows.filter((x) => x.now.tmax !== null).sort((a, b) => b.now.tmax - a.now.tmax).map((x) => ({ label: x.name, short: BELT[x.id], v: Math.max(0, x.now.tmax), focus: x.now.tmax >= 2 })) });
      nowCap.firstChild.textContent = nowM === "rain" ? "Rain to the end of September, % of the 2001–2020 normal for the same months (IMERG)." : "Mean daily maximum to the end of September, °C above the 2001–2020 normal (MERRA-2).";
    };
    $$('input[name="now-m"]').forEach((r) => r.addEventListener("change", () => { nowM = r.value; drawNow(); }));
    drawNow();
    tableBtn("now", () => ({ title: "The 2026 season so far", cols: [{ h: "Belt", k: "name" }, { h: "Months", f: (x) => x.now.months.split(",").map((m) => ML[m - 1]).join(" ") }, { h: "Rain", r: 1, f: (x) => f0(x.now.rain) + "%" }, { h: "Max temp.", r: 1, f: (x) => (x.now.tmax === null ? "—" : HC.sfmt(x.now.tmax, 1) + " °C") }], rows: nowRows.slice().sort((a, b) => a.now.rain - b.now.rain) }));

    // yields and the record of one crop
    const ys = r1.yields.filter((y) => y.code !== "OWID_WRL" && y.crop !== "Beans").sort((a, b) => a.slope - b.slope);
    const yid = (y) => y.code + "|" + y.crop, yname = (y) => `${y.country} · ${y.crop.toLowerCase()}`;
    const yselEl = $("[data-ysel]");
    ys.slice().sort((a, b) => a.country.localeCompare(b.country)).forEach((y) => yselEl.add(new Option(yname(y), yid(y))));
    let ysel = ys.find((y) => y.code === "ZAF");
    const yseries = () => {
      yselEl.value = yid(ysel);
      $("[data-yline]").textContent = `${HC.sfmt(ysel.slope, 1)}% of trend per °C of the index (95% CI ${HC.sfmt(ysel.lo, 1)} to ${HC.sfmt(ysel.hi, 1)}, p ${ysel.p < 0.001 ? "< 0.001" : "= " + ysel.p.toFixed(3)}). After the very strong events: ${ysel.vs.map((v) => f0(v) + "%").join(", ")}.`;
      const host = $('[data-c="yseries"]'); host.innerHTML = "";
      const harvests = ysel.vs_years.map((y) => y + ysel.lag);
      HC.line(host, { label: `${ysel.country} ${ysel.crop.toLowerCase()} yield against trend, 1980–2018`, series: [{ name: "Yield vs trend", cls: "ctx", values: ysel.series.filter((p) => p.y >= 1980).map((p) => ({ x: p.y, y: p.v })) }], x: { min: 1980, max: 2018, fmt: (v) => String(v) }, y: { fmt: (v) => f0(v) + "%", tip: (v) => HC.sfmt(v, 1) + "%" }, marks: ysel.series.filter((p) => harvests.includes(p.y)).map((p) => ({ x: p.y, y: p.v, label: String(p.y), dx: 8, dy: p.v < 0 ? 16 : -8, anchor: "start" })) });
    };
    yselEl.addEventListener("change", () => { ysel = ys.find((y) => yid(y) === yselEl.value); yseries(); });
    yseries();
    tableBtn("yseries", () => ({ title: `${yname(ysel)}: yield against trend`, cols: [{ h: "Harvest", f: (p) => String(p.y) }, { h: "% of trend", r: 1, f: (p) => HC.sfmt(p.v, 1) }], rows: ysel.series.filter((p) => p.y >= 1980), note: "FAO yields via Our World in Data, detrended with a local trend. Very strong events: 1982, 1991, 1997, 2015." }));
    HC.forest($('[data-c="ys"]'), { label: "Yield response to El Niño by crop and country", x: { min: -25, max: 12, fmt: (v) => f0(v) + "%", label: "% per °C" }, rows: ys.filter((y) => y.p < 0.15).map((y) => ({ code: y.code, crop: y.crop, label: `${y.country} · ${CROP(y.crop)}`, sub: `Harvest ${y.lag ? "after" : "in"} the onset year`, v: y.slope, lo: y.lo, hi: y.hi, focus: y.p < 0.05 && y.slope < 0, right: f1(y.slope) + "%", note: `p = ${pval(y.p)}; very strong events: ${y.vs.map((v) => f0(v) + "%").join(", ")}` })), onClick: (r) => { ysel = ys.find((y) => y.code === r.code && y.crop === r.crop); yseries(); jump("record"); } });
    tableBtn("ys", () => ({ title: "Yield response by crop and country, all pairs", cols: [{ h: "Country", k: "country" }, { h: "Crop", k: "crop" }, { h: "% per °C", r: 1, f: (y) => HC.sfmt(y.slope, 1) }, { h: "95% CI", r: 1, f: (y) => `${HC.sfmt(y.lo, 1)} to ${HC.sfmt(y.hi, 1)}` }, { h: "p", r: 1, f: (y) => pval(y.p) }, { h: "After very strong events", f: (y) => y.vs.map((v) => f0(v)).join(" / ") }], rows: ys, note: "Percent of trend in the harvests that followed the 1982, 1991, 1997 and 2015 events." }));

    // world totals
    HC.forest($('[data-c="glob"]'), { label: "World yield response to El Niño, onset year and the year after", x: { min: -4, max: 4, fmt: (v) => f0(v) + "%", label: "% per °C" }, rows: r1.global.map((x) => ({ label: `${x.crop}, ${x.lag ? "year after" : "onset year"}`, v: x.slope, lo: x.lo, hi: x.hi, focus: false, right: f1(x.slope) + "%", note: `p = ${x.p.toFixed(2)}` })) });
    tableBtn("glob", () => ({ title: "World yield response", cols: [{ h: "Crop", k: "crop" }, { h: "Year", f: (x) => (x.lag ? "After onset" : "Onset") }, { h: "% per °C", r: 1, f: (x) => HC.sfmt(x.slope, 2) }, { h: "95% CI", r: 1, f: (x) => `${HC.sfmt(x.lo, 1)} to ${HC.sfmt(x.hi, 1)}` }, { h: "p", r: 1, f: (x) => x.p.toFixed(2) }], rows: r1.global }));

    // outlook
    const slider = $("#enso-slider"), outHost = $('[data-c="out"]'), extrap = $("[data-extrap]");
    const tq = (df) => { const z = 1.2815516; return z + (z * z * z + z) / (4 * df) + (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df * df); };
    const lgam = (z) => { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = z, tmp = z + 5.5; tmp -= (z + 0.5) * Math.log(tmp); let ser = 1.000000000190015; for (const cc of c) ser += cc / ++y; return -tmp + Math.log(2.5066282746310005 * ser / z); };
    const betacf = (a, b, x) => { const qab = a + b, qap = a + 1, qam = a - 1; let c = 1, d = 1 / (1 - qab * x / qap), h = d; for (let m = 1; m <= 200; m++) { const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 / (1 + aa * d); c = 1 + aa / c; h *= d * c; aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 / (1 + aa * d); c = 1 + aa / c; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-10) break; } return h; };
    const tcdf = (t, df) => { // Student t distribution through the regularised incomplete beta
      const x = df / (df + t * t), a = df / 2, b = 0.5, bt = Math.exp(lgam(a + b) - lgam(a) - lgam(b) + a * Math.log(x) + b * Math.log(1 - x));
      const ib = x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
      return t > 0 ? 1 - ib / 2 : ib / 2;
    };
    const predict = (m, x) => { const mean = m.b0 + m.b1 * x, df = m.n - 2, se = m.s * Math.sqrt(1 + 1 / m.n + (x - m.xbar) ** 2 / m.sxx), q = tq(df); return { mean, lo: mean - q * se, hi: mean + q * se, p: tcdf((-10 - mean) / se, df) }; };
    let rows = [], shown = [], outM = "ahead";
    const outlook = () => {
      const x = +slider.value;
      $("#enso-val").textContent = HC.sfmt(x, 1) + " °C";
      rows = r1.models.filter((m) => m.crop !== "Beans").map((m) => {
        const xi = m.basis === "scenarios" ? x : m.enso_obs, p = predict(m, xi);
        return { code: m.code, crop: m.crop, country: m.country, harvest: m.harvest_year, x: xi, fixed: m.basis !== "scenarios", beyond: xi > m.xmax, mean: p.mean, lo: p.lo, hi: p.hi, p: p.p };
      }).sort((a, b) => a.mean - b.mean);
      const ahead = rows.filter((r) => !r.fixed), under = rows.filter((r) => r.fixed);
      shown = outM === "ahead" ? ahead : under;
      slider.disabled = outM !== "ahead";
      const nb = shown.filter((r) => r.beyond).length, at = HC.sfmt(x, 1) + " °C";
      $("[data-beyond]").textContent = `${nb}/${shown.length}`;
      $("[data-beyond-of]").textContent = outM === "ahead" ? `rows beyond the record at ${at}` : "seasons under way beyond the record";
      extrap.textContent = outM === "ahead"
        ? `The model is fitted on 1982–2018 national yields. ${nb ? `At ${at}, ${nb === shown.length ? "every row for the seasons ahead sits" : nb + " of the " + shown.length + " rows for the seasons ahead sit"} beyond the strongest season in its record, so the model extrapolates. Read these rows as direction and rough size, not as a forecast.` : `At ${at}, every row for the seasons ahead stays inside its record.`}`
        : `Seasons under way use the index measured so far, so the slider does not move them. ${nb ? nb + " of the " + shown.length + " sit" : "None sits"} beyond the strongest season in its 1982–2018 record.`;
      outHost.innerHTML = "";
      HC.forest(outHost, { label: "Expected yield change by crop and country", x: { min: -90, max: 45, fmt: (v) => f0(v) + "%", label: "yield vs trend" }, valueHead: "P(loss >10%)", rows: shown.map((r) => ({ label: `${r.country} · ${CROP(r.crop)}${r.beyond ? " *" : ""}`, sub: `${r.harvest} harvest`, v: r.mean, lo: r.lo, hi: r.hi, focus: r.p >= 0.5, hollow: r.fixed, right: Math.round(r.p * 100) + "%", note: `${f1(r.mean)}% (80%: ${f0(r.lo)} to ${f0(r.hi)}%) at an index of ${HC.sfmt(r.x, 2)} °C` })) });
    };
    slider.addEventListener("input", outlook);
    $$('input[name="out-s"]').forEach((r) => r.addEventListener("change", () => { outM = r.value; outlook(); }));
    outlook();
    tableBtn("out", () => ({ title: outM === "ahead" ? `Outlook at ${HC.sfmt(+slider.value, 1)} °C, seasons ahead` : "Outlook, seasons under way", cols: [{ h: "Crop · country", f: (r) => `${r.crop} · ${r.country}` }, { h: "Harvest", k: "harvest" }, { h: "Index", r: 1, f: (r) => HC.sfmt(r.x, 2) }, { h: "Mean", r: 1, f: (r) => f1(r.mean) + "%" }, { h: "80% range", r: 1, f: (r) => `${f0(r.lo)} to ${f0(r.hi)}%` }, { h: "P(loss >10%)", r: 1, f: (r) => Math.round(r.p * 100) + "%" }], rows: shown, note: "Regression on 1982–2018 national yields; 80% prediction intervals. Rows beyond the record extrapolate." }));
    $('[data-export="outlook"]').addEventListener("click", async (e) => {
      const b = e.currentTarget, t = b.textContent; b.disabled = true; b.textContent = "Preparing…";
      try { const blob = await HR.outlookReport({ enso: +slider.value, rows: rows.map((r) => ({ crop: r.crop, country: r.country, mean: r.mean, lo: r.lo, hi: r.hi, p: r.p, focus: r.p >= 0.5 })) }); await save(`hortus-el-nino-outlook-${(+slider.value).toFixed(1)}C.pdf`, blob); }
      catch (err) { console.error(err); toast("The outlook could not be prepared."); }
      finally { b.disabled = !caps.downloads; b.textContent = t; }
    });
  };

  /* ======================= STUDY 02 · PLANT VISION ======================= */
  INIT["plant-vision"] = () => {
    renderNext("plant-vision");
    if (!r2) return;

    // ---------- analyser ----------
    const cv = $('[data-v="canvas"]'), seal = $('[data-v="seal"]'), tag = $('[data-v="tag"]');
    const cropSel = $("#v-crop"), setSel = $("#v-setting");
    Object.entries(HN.CROPS).forEach(([k, c]) => { cropSel.add(new Option(c.name, k)); $("#n-crop").add(new Option(c.name, k)); });
    cropSel.value = "tomatoes";
    const V = { res: null, layer: "stress", sample: true, blob: null, claude: null };
    const paintLayer = () => { if (V.res) HV.render(V.res, V.layer, cv); };
    const showMetrics = () => {
      const m = V.res.metrics;
      $('[data-v="stats"]').innerHTML = [[m.cover.toFixed(0), "%", "Plant in frame"], [m.healthy.toFixed(0), "%", "Healthy green"], [(m.yellowing + m.browning).toFixed(0), "%", "Yellow or brown"]].map(([v, u, k]) => stat(v, u, k)).join("");
      $('[data-v="index"]').textContent = m.index; $('[data-v="bar"]').style.width = m.index + "%";
      $('[data-v="kv"]').innerHTML = [["Yellowing", m.yellowing.toFixed(1) + "% of tissue"], ["Browning", m.browning.toFixed(1) + "% of tissue"], ["Greenness (VARI)", m.vari.toFixed(3)], ["Plant threshold (ExG)", m.threshold.toFixed(3)]].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
    };
    const reveal = () => { seal.classList.remove("open"); void seal.offsetWidth; if (reduce()) seal.classList.add("open"); else setTimeout(() => seal.classList.add("open"), 60); };
    const analyseSource = (src, opts) => {
      V.res = HV.analyse(src); V.sample = !!opts.sample; V.blob = opts.blob || null; V.claude = null;
      tag.textContent = opts.sample ? "Synthetic sample" : "Your photo";
      paintLayer(); showMetrics(); onIn(cv, reveal);
      $("[data-claude-out]").hidden = true; $("[data-claude-note]").hidden = true;
    };
    const loadSample = (kind) => HV.sample(kind).then((c) => analyseSource(c, { sample: true })).catch((e) => { console.error(e); toast("The sample did not load. Reload the page to try again."); });
    $$("[data-sample]").forEach((b) => b.addEventListener("click", () => loadSample(b.dataset.sample)));
    $$('input[name="layer"]').forEach((r) => r.addEventListener("change", () => { V.layer = r.value; paintLayer(); }));
    const fromFile = async (file) => {
      if (!file || !/^image\//.test(file.type)) { toast("That file is not an image. Choose a JPEG, PNG or WebP."); return; }
      try { const bmp = await createImageBitmap(file); analyseSource(bmp, { sample: false, blob: file }); jump("analyse"); }
      catch (e) { toast("This image could not be read. Try another file."); }
    };
    $("#photo-in").addEventListener("change", (e) => fromFile(e.target.files[0]));
    const drop = $('[data-v="drop"]');
    ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("on"); }));
    ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("on"); }));
    drop.addEventListener("drop", (e) => fromFile(e.dataTransfer.files[0]));
    document.addEventListener("paste", (e) => { if (cur !== "plant-vision") return; const it = Array.from(e.clipboardData ? e.clipboardData.items : []).find((i) => i.type.startsWith("image/")); if (it) fromFile(it.getAsFile()); });
    loadSample("yellowing");
    redrawers.push(paintLayer);

    // ---------- Claude, a second opinion on the photo ----------
    let ctl = null;
    const claudeBtn = $("[data-claude]"), stopBtn = $("[data-claude-stop]"), note = $("[data-claude-note]"), outBox = $("[data-claude-out]"), body = $("[data-claude-body]");
    stopBtn.addEventListener("click", () => ctl && ctl.abort());
    const renderClaude = (j) => {
      const list = (a) => (Array.isArray(a) && a.length ? `<ul>${a.map((x) => `<li>${esc(typeof x === "string" ? x : x.cause ? `${x.cause} (${x.likelihood || "?"}): ${x.evidence || ""}` : JSON.stringify(x))}</li>`).join("")}</ul>` : "<p>None given.</p>");
      body.innerHTML = `<p>${esc(j.summary)}</p><h4>What I see</h4>${list(j.what_i_see)}<h4>Possible causes</h4>${list(j.possible_causes)}<h4>Check next</h4>${list(j.checks)}<h4>Do now</h4>${list(j.actions_now)}<p class="note">Confidence: ${esc(j.confidence || "not stated")}. ${esc(j.caveats || "")}</p>`;
      V.claude = [j.summary, "Seen: " + (j.what_i_see || []).join("; "), "Possible causes: " + (j.possible_causes || []).map((c) => (c.cause ? `${c.cause} (${c.likelihood})` : c)).join("; "), "Check next: " + (j.checks || []).join("; "), "Do now: " + (j.actions_now || []).join("; "), `Confidence: ${j.confidence || "not stated"}. ${j.caveats || ""}`].join("\n");
    };
    claudeBtn.addEventListener("click", async () => {
      const sample = caps.sample || (await aiReady); if (!sample || !V.res) return;
      ctl = new AbortController(); claudeBtn.disabled = true; stopBtn.hidden = false; outBox.hidden = false; note.hidden = true;
      body.innerHTML = `<span class="thinking"><i></i>Thinking…</span>`;
      const m = V.res.metrics;
      const blob = V.blob || (await new Promise((res) => V.res.src.toBlob(res, "image/jpeg", 0.9)));
      const prompt = `You are a careful plant-health adviser for growers. Look at the attached photo of ${HN.CROPS[cropSel.value].name.toLowerCase()} grown ${setSel.value === "outdoor" ? "outdoors" : setSel.value === "greenhouse" ? "in a greenhouse" : "indoors under lights"}.${V.sample ? " The image is a synthetic illustration made for a demo, not a real photo: say so and describe what such symptoms would usually mean." : ""}
Colour screening already measured: plant cover ${m.cover.toFixed(1)}% of the frame; healthy green ${m.healthy.toFixed(1)}%, yellowing ${m.yellowing.toFixed(1)}%, browning ${m.browning.toFixed(1)}% of plant tissue; mean VARI ${m.vari.toFixed(3)}.
Rules: describe only what is visible; give causes as possibilities with likelihood, never as a diagnosis; prefer checks a grower can do (look at leaf undersides, roots, the pattern on old versus new leaves, a soil or feed test) before treatments; do not name pesticide products or rates; use British spelling; no exclamation marks.
Reply with only a JSON object: {"summary": string (two sentences), "what_i_see": [string], "possible_causes": [{"cause": string, "likelihood": "low"|"medium"|"high", "evidence": string}], "checks": [string], "actions_now": [string], "confidence": "low"|"medium"|"high", "caveats": string}`;
      try {
        renderClaude((await sample.json(prompt, { images: [blob], signal: ctl.signal, modelTier: "default" })) || {});
      } catch (e) {
        const c = e && e.code;
        if (c === "cancelled") body.innerHTML = "<p>Stopped.</p>";
        else if (["not_granted", "sampling_disabled", "capability_disabled", "capability_removed", "not_declared", "images_unavailable"].includes(c)) { outBox.hidden = true; claudeBtn.hidden = true; $("[data-claude-hint]").hidden = true; note.hidden = false; note.textContent = "Claude is not available for photos in this view. The colour screening still stands."; }
        else if (c === "rate_limited") body.innerHTML = "<p>Too many requests just now. Try again in a minute.</p>";
        else if (c === "image_rejected") body.innerHTML = "<p>Claude could not read this image. Try a smaller JPEG or PNG.</p>";
        else if (c === "refused") body.innerHTML = "<p>Claude declined this image. Try a clearer photo of the plant.</p>";
        else body.innerHTML = `<p>The answer did not come through${c ? " (" + esc(c) + ")" : ""}. Try again.</p>`;
      } finally { claudeBtn.disabled = false; stopBtn.hidden = true; ctl = null; }
    });

    // ---------- needs: four choices on the screen, the readings in a side sheet ----------
    const form = $("[data-needs-form]"), sheet = $("[data-readings]");
    Object.entries(HN.PRESETS).forEach(([k, p]) => $("#n-preset").add(new Option(p.name, k)));
    Object.entries(HN.STAGES).forEach(([k, s]) => $("#n-stage").add(new Option(s, k)));
    const fields = () => Object.fromEntries($$("[data-need]").map((i) => [i.dataset.need, i.value]));
    const toggleSetting = () => { const ind = $("#n-setting").value === "indoor"; $$("[data-indoor]", form).forEach((e) => (e.hidden = !ind)); $$("[data-outdoor]", form).forEach((e) => (e.hidden = ind)); };
    const applyPreset = (k) => {
      const p = HN.PRESETS[k];
      ["tmax", "tmin", "rh", "u2", "rs", "ppfd", "hours", "raw"].forEach((f) => { const i = $(`[data-need="${f}"]`, form); if (i) i.value = p[f] !== undefined ? p[f] : ""; });
      $("#n-setting").value = p.setting; $("[data-need-note]").textContent = p.note + ".";
      if (p.crop) { $("#n-crop").value = p.crop; $("#n-area").value = HN.CROPS[p.crop].area; }
      toggleSetting();
    };
    const LEVEL = { high: "Act", low: "Low", watch: "Watch", dry: "Dry air", humid: "Humid" };
    let lastNeeds = null;
    const strip = (i) => {
      const parts = [`${i.tmax} / ${i.tmin} °C`, `RH ${i.rh}%`, i.setting === "indoor" ? `PPFD ${i.ppfd} for ${i.hours} h` : `Sun ${i.rs} MJ/m²`, `Wind ${i.u2} m/s`];
      if (i.moisture) parts.push(`Soil ${i.moisture}%`);
      if (i.ph) parts.push(`pH ${i.ph}`);
      if (i.ec) parts.push(`EC ${i.ec}${i.ecTarget ? " of " + i.ecTarget : ""}`);
      if (i.co2 && i.setting !== "outdoor") parts.push(`CO₂ ${i.co2}`);
      $("[data-need-strip]").innerHTML = parts.map(esc).join("<i>·</i>");
    };
    const needs = () => {
      const i = fields(), P = HN.PRESETS[i.preset] || HN.PRESETS.greenhouse;
      i.doy = P.doy; i.lat = P.lat; i.elev = P.elev;
      if (!i.area) { i.area = HN.CROPS[i.crop].area; $("#n-area").value = i.area; }
      const o = HN.predict(i); lastNeeds = { i, o };
      const often = o.interval < 1, perDay = Math.max(1, Math.round(1 / o.interval));
      const runs = Math.ceil(o.minutes / 60), runMin = o.minutes / runs, mins = Math.max(1, Math.round(o.minutes));
      const when = often ? `Water ${perDay} times a day` : `Water every ${o.interval.toFixed(1)} days`;
      const timer = i.setting === "outdoor" ? `each run about ${mins} min at ${(+i.flow).toFixed(1)} L/h` : runs > 1 ? `in ${runs} runs of about ${Math.round(runMin)} min, as HortusRoom S runs up to 60 min at a time` : `about ${mins} min a run, started by the moisture trigger`;
      const flagged = [], fine = [];
      const add = (name, low, value, text, level) => (level && level !== "ok" ? flagged : fine).push({ name, low, value, text, level });
      if (o.moisture) add("Soil", "soil", `${i.moisture}%`, o.moisture.text, o.moisture.level);
      add("Light", "light", `${o.dli.toFixed(1)} mol m⁻² d⁻¹`, o.light.text, o.light.ok ? "ok" : "low");
      add("Air", "air", `${o.vpd.toFixed(2)} kPa VPD`, o.air.text, o.air.level);
      add("Heat", "heat", o.gdd !== undefined ? `${o.gdd.toFixed(1)} degree-days` : "", o.heat.text, o.heat.level);
      if (o.blight) add("Blight", "late blight", "", o.blight.text, o.blight.level);
      if (o.ph) add("Feed pH", "feed pH", "", o.ph.text, o.ph.level);
      if (o.ec) add("Feed EC", "feed EC", "", o.ec.text, o.ec.level);
      if (o.co2) add("CO₂", "CO₂", "", o.co2.text, o.co2.level);
      $("[data-needs-stats]").innerHTML = stat(o.etc.toFixed(1), "mm/day", "Water use", `ET₀ ${o.et0.toFixed(1)} × Kc ${o.kc.toFixed(2)}, FAO-56`, "w") + stat(o.litres.toFixed(o.litres < 1 ? 2 : 1), "L", "Per plant per day", `At ${(+i.area).toFixed(2)} m² per plant`) + stat(often ? perDay : o.interval.toFixed(1), often ? "a day" : "days", often ? "Waterings" : "Between waterings", `${o.perEvent.toFixed(o.perEvent < 1 ? 2 : 1)} L per plant each time`);
      $("[data-needs-water]").textContent = `${when}, ${timer}.`;
      $("[data-needs-checks]").innerHTML = `<ul class="rows needs">${flagged.length ? flagged.map((f) => `<li><span class="n">${f.name}</span><span class="t">${f.value ? `<b>${f.value}.</b> ` : ""}${f.text}</span><span class="e ev"><b>${LEVEL[f.level] || f.level}</b></span></li>`).join("") : `<li><span class="n">All clear</span><span class="t">Nothing is flagged at these readings.</span><span class="e"></span></li>`}</ul>`
        + (fine.length ? `<p class="note">In range: ${fine.map((f) => f.low + (f.value ? " " + f.value : "")).join(", ")}. Basis: FAO-56 Penman–Monteith, DLI targets from MSU Extension, Hutton criteria (AHDB).</p>` : "");
      strip(i);
    };
    $("#n-preset").addEventListener("change", () => { applyPreset($("#n-preset").value); needs(); });
    $("#n-setting").addEventListener("change", () => { toggleSetting(); needs(); });
    $("#n-crop").addEventListener("change", () => { $("#n-area").value = HN.CROPS[$("#n-crop").value].area; needs(); });
    $("#n-stage").addEventListener("change", needs);
    form.addEventListener("input", needs);
    form.addEventListener("submit", (e) => e.preventDefault());
    $("[data-readings-open]").addEventListener("click", () => (sheet.showModal ? sheet.showModal() : (sheet.open = true)));
    $("#n-crop").value = "tomatoes"; $("#n-stage").value = "mid"; $("#n-preset").value = "greenhouse"; applyPreset("greenhouse");
    $("#n-area").value = HN.CROPS.tomatoes.area; $("#n-ph").value = "6.8"; $("#n-tminy").value = "11"; $("#n-hum").value = "7"; $("#n-humy").value = "4"; $("#n-ec").value = "2.1"; $("#n-ect").value = "2.5";
    needs();
    cropSel.addEventListener("change", () => { $("#n-crop").value = cropSel.value; $("#n-area").value = HN.CROPS[cropSel.value].area; needs(); });
    setSel.addEventListener("change", () => { $("#n-setting").value = setSel.value; toggleSetting(); needs(); });

    $('[data-export="plant"]').addEventListener("click", async (e) => {
      if (!V.res) return;
      const b = e.currentTarget, t = b.textContent; b.disabled = true; b.textContent = "Preparing…";
      try {
        const photo = document.createElement("canvas"); HV.render(V.res, "photo", photo);
        const ov = document.createElement("canvas"); HV.render(V.res, "stress", ov);
        const n = lastNeeds;
        const rws = n ? [["Water", `${n.o.etc.toFixed(1)} mm/day (${n.o.litres.toFixed(2)} L per plant); ${n.o.interval < 1 ? `water ${Math.max(1, Math.round(1 / n.o.interval))} times a day` : `water every ${n.o.interval.toFixed(1)} days`}, ${n.o.perEvent.toFixed(n.o.perEvent < 1 ? 2 : 1)} L per plant each time`], ["Light", `${n.o.dli.toFixed(1)} mol m⁻² d⁻¹. ${n.o.light.text}`], ["Air", `VPD ${n.o.vpd.toFixed(2)} kPa. ${n.o.air.text}`], ["Heat", n.o.heat.text]].concat(n.o.blight ? [["Late blight", n.o.blight.text]] : []).concat(n.o.ph ? [["Feed pH", n.o.ph.text]] : []).concat(n.o.ec ? [["Feed EC", n.o.ec.text]] : []) : [];
        const blob = await HR.plantReport({ title: `${HN.CROPS[cropSel.value].name}, ${setSel.options[setSel.selectedIndex].text.toLowerCase()}`, photo: photo.toDataURL("image/jpeg", 0.88), overlay: ov.toDataURL("image/png"), size: [V.res.w, V.res.h], metrics: V.res.metrics, sample: V.sample, claude: V.claude, needs: n ? { title: `${n.o.crop.name}, ${HN.STAGES[n.i.stage].toLowerCase()}, ${HN.PRESETS[$("#n-preset").value].name}`, rows: rws } : null });
        await save(`hortus-plant-report-${new Date().toISOString().slice(0, 10)}.pdf`, blob);
      } catch (err) { console.error(err); toast("The report could not be prepared."); }
      finally { b.disabled = !caps.downloads; b.textContent = t; }
    });

    // ---------- tiers: five cards, then one tier at a time ----------
    const tiersEl = $("[data-tiers]"), tnav = $("[data-tier-nav]");
    let tierSel = 1, redrawTier = null;
    tiersEl.innerHTML = HN.TIERS.map((t) => `<button class="tier" type="button" data-tier="${t.id}" aria-pressed="${t.id === tierSel}"><span class="label">Tier ${t.id}</span><span class="t">${t.name}</span><span class="s">${t.short}</span></button>`).join("");
    tnav.setAttribute("role", "radiogroup"); tnav.setAttribute("aria-label", "Tier");
    tnav.innerHTML = HN.TIERS.map((t) => `<label class="pill"><input type="radio" name="tier-nav" value="${t.id}"${t.id === tierSel ? " checked" : ""}><span>${t.id} · ${t.name}</span></label>`).join("");
    const tierDetail = () => {
      const t = HN.TIERS[tierSel], li = (a) => `<ul class="list">${a.map((x) => `<li>${x}</li>`).join("")}</ul>`;
      $$("[data-tier]", tiersEl).forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.tier === tierSel)));
      $$("input", tnav).forEach((r) => (r.checked = +r.value === tierSel));
      $("[data-tier-code]").textContent = `HRT — 05 · Tier ${t.id}`;
      $("[data-tier-title]").textContent = t.name + ".";
      $("[data-tier-detail]").innerHTML = `<dl class="kv tier-kv"><div><dt>Senses</dt><dd>${li(t.senses)}</dd></div><div><dt>Decides</dt><dd>${li(t.decides)}</dd></div><div><dt>Does</dt><dd>${li(t.acts)}</dd></div><div><dt>Runs on</dt><dd>${li(t.hw)}</dd></div></dl><p class="note"><span class="ev"><b>${t.ev}</b> evidence</span> ${t.evx}</p>`;
      if (redrawTier) redrawTier();
    };
    tiersEl.addEventListener("click", (e) => { const b = e.target.closest("[data-tier]"); if (b) { tierSel = +b.dataset.tier; tierDetail(); jump("tier"); } });
    tnav.addEventListener("change", (e) => { tierSel = +e.target.value; tierDetail(); });
    const tierSchema = () => {
      const lit = (n) => n <= tierSel;
      return snake([
        { id: "p", t: "Plant", s: ["Leaves, roots,", "fruit"], wing: true },
        { id: "s", t: "Sensors", s: lit(1) ? ["Moisture, air,", "feed"] : ["Added at", "tier 1"] },
        { id: "c", t: "Controllers", s: lit(2) ? ["Dose, water,", "vent"] : ["Added at", "tier 2"] },
        { id: "m", t: "Models", s: lit(3) ? ["Weather, satellite,", "ET₀ × Kc"] : ["Added at", "tier 3"], wing: lit(3) },
        { id: "y", t: "You", s: tierSel >= 4 ? ["Audit the", "system"] : ["Decide", "and act"] }
      ], `Tier ${tierSel}: what the system connects`);
    };
    redrawTier = schemaInto($('[data-schema="tier"]'), tierSchema);
    tierDetail();

    // ---------- fields read from orbit ----------
    const k = r2.kansas, mz = k.classes.find((c) => c.name === "Irrigated maize"), mk = r2.mkushi;
    const tx = (d) => new Date(d).getTime(), fmtD = (d) => HC.dfmt(d);
    const doyDate = (v) => HC.dfmt(Date.UTC(2026, 0, v), true, false);
    function fieldViewer(root, frames, opts) {
      const map = $('[data-f="map"]', root), time = $('[data-f="time"]', root), play = $('[data-f="play"]', root), ftag = $('[data-f="tag"]', root);
      let idx = Math.max(0, frames.findIndex((f) => f.d >= opts.start)), timer = 0;
      time.max = frames.length - 1; time.value = idx;
      const paint = () => { const f = frames[idx]; if (!f) return; HC.stipple(map, f.img, opts.stipple || {}); ftag.textContent = `NDVI · ${fmtD(f.d)}`; time.setAttribute("aria-valuetext", fmtD(f.d)); };
      const stop = () => { clearInterval(timer); timer = 0; play.setAttribute("aria-pressed", "false"); };
      time.addEventListener("input", () => { stop(); idx = +time.value; paint(); });
      play.addEventListener("click", () => { if (timer) return stop(); play.setAttribute("aria-pressed", "true"); timer = setInterval(() => { idx = (idx + 1) % frames.length; time.value = idx; paint(); }, reduce() ? 1200 : 420); });
      if (window.ResizeObserver) new ResizeObserver(paint).observe(map);
      redrawers.push(paint); paint();
      return { stop };
    }
    players.push(fieldViewer($('[data-field="kansas"]'), k.frames, { start: "2026-07-25" }));
    players.push(fieldViewer($('[data-field="mkushi"]'), mk.frames, { start: "2026-07-01", stipple: { mask: mk.mask, maskDim: true } }));

    HC.line($('[data-c="kcurves"]'), { label: "NDVI curves by crop class, Kansas 2026", series: k.classes.map((c) => ({ name: c.name, cls: c.name === "Irrigated maize" ? "focus" : "ctx", values: k.grid_doy.map((d, i) => ({ x: d, y: c.curve[i] })) })), x: { min: 70, max: 280, ticks: () => [91, 152, 213, 274], fmt: (v) => ({ 91: "Apr", 152: "Jun", 213: "Aug", 274: "Oct" }[v]), tip: doyDate }, y: { min: 0, max: 1, fmt: (v) => v.toFixed(1), tip: (v) => v.toFixed(2) } });
    $('[data-f="kleg"]').innerHTML = `<li><i class="focus"></i>Irrigated maize, ${Math.round(mz.share * 100)}% of the window</li><li><i></i>Wheat, double crop, late-sown crop, fallow</li>`;
    $('[data-f="knote"]').textContent = `A 6 × 6 km window near ${k.site.lat.toFixed(2)}° N, ${Math.abs(k.site.lon).toFixed(2)}° W, Sentinel-2 tile ${k.site.tile}. Bright dots are high NDVI; grey dots are bare or senescent ground.`;
    tableBtn("kcurves", () => ({ title: "NDVI by crop class, Kansas 2026", cols: [{ h: "Date", f: (r) => doyDate(r.d) }].concat(k.classes.map((c, j) => ({ h: c.name, r: 1, f: (r) => (r.v[j] === null || r.v[j] === undefined ? "—" : r.v[j].toFixed(2)) }))), rows: k.grid_doy.map((d, i) => ({ d, v: k.classes.map((c) => c.curve[i]) })), note: "Class means on a 10-day grid, cloud-masked Sentinel-2 L2A scenes." }));

    $("[data-kstats]").innerHTML = [
      [`${Math.round(mz.water.etc_hs)}–${Math.round(mz.water.etc)}`, "mm", "Maize water use", `${fmtD(mz.water.start)} to ${fmtD(mz.water.end)}`, "rg"],
      [Math.round(mz.water.rain), "mm", "Rain", "IMERG, same window"],
      [`${Math.round(mz.water.net_irrigation_hs)}–${Math.round(mz.water.net_irrigation)}`, "mm", "Irrigation need", "Hargreaves to Penman–Monteith", "rg"],
      [f1(k.climate.jja_tmax - k.climate.jja_tmax_normal), "°C", "Summer heat", `June–August mean max ${k.climate.jja_tmax.toFixed(1)} °C, as hot as 2012`, "w"]
    ].map((a) => stat(a[0], a[1], a[2], a[3], a[4])).join("");
    const cum = (daily) => { let ce = 0, cr = 0; return daily.map((d) => { ce += d.etc || 0; cr += d.rain || 0; return { x: tx(d.d), e: ce, r: cr }; }); };
    const kd = cum(k.maize_daily);
    HC.line($('[data-c="kwater"]'), { endLabels: true, label: "Cumulative maize water use and rain, Kansas 2026", series: [{ name: "Use", cls: "focus", values: kd.map((p) => ({ x: p.x, y: p.e })) }, { name: "Rain", cls: "ctx", values: kd.map((p) => ({ x: p.x, y: p.r })) }], x: dateAxis(kd, 1), y: { min: 0, fmt: (v) => Math.round(v), tip: (v) => Math.round(v) + " mm" } });
    const weekly = (d) => d.filter((_, i) => i % 7 === 0 || i === d.length - 1);
    tableBtn("kwater", () => ({ title: "Maize water budget, Kansas 2026, mm", cols: [{ h: "Date", f: (p) => fmtD(p.x) }, { h: "Water use, to date", r: 1, f: (p) => Math.round(p.e) }, { h: "Rain, to date", r: 1, f: (p) => Math.round(p.r) }], rows: weekly(kd), note: "Crop water use is FAO-56 Penman–Monteith reference evapotranspiration × the crop coefficient; weekly steps." }));

    const mv = mk.dates.map((d) => ({ x: tx(d) }));
    HC.line($('[data-c="mk"]'), { endLabels: true, label: "NDVI of pivots and other land, Mkushi 2026", series: [{ name: "Pivots", cls: "focus", values: mk.dates.map((d, i) => ({ x: tx(d), y: mk.irrigated_series[i] })) }, { name: "Other land", cls: "ctx", values: mk.dates.map((d, i) => ({ x: tx(d), y: mk.other_series[i] })) }], x: dateAxis(mv, 1), y: { min: 0, max: 0.9, fmt: (v) => v.toFixed(1), tip: (v) => v.toFixed(2) } });
    $("[data-mstats]").innerHTML = stat(`${Math.round(mk.water.net_irrigation_hs)}–${Math.round(mk.water.net_irrigation)}`, "mm", "Wheat irrigation need", `${fmtD(mk.water.start)} to ${fmtD(mk.water.end)}`, "rg") + stat(mk.water.rain.toFixed(1), "mm", "Rain in the season", "IMERG, same window", "w");
    tableBtn("mk", () => ({ title: "NDVI, Mkushi 2026", cols: [{ h: "Date", f: (r) => fmtD(r.d) }, { h: "Pivots", r: 1, f: (r) => (r.a === null ? "—" : r.a.toFixed(2)) }, { h: "Other land", r: 1, f: (r) => (r.b === null ? "—" : r.b.toFixed(2)) }], rows: mk.dates.map((d, i) => ({ d, a: mk.irrigated_series[i], b: mk.other_series[i] })), note: `Pivots are ${Math.round(mk.irrigated_share * 100)}% of the 6 × 6 km window, Sentinel-2 tile ${mk.site.tile}.` }));

    const jseal = $("[data-java-compare] [data-seal]");
    onIn(jseal, () => setTimeout(() => jseal.classList.add("open"), reduce() ? 0 : 500));
  };

  /* ---------- questions to Claude about a study ---------- */
  const CONTEXT = {
    r1: () => `Study 01 (Hortus, October 2026): "The 2026-27 El Niño, read from open data." Key results: relative Niño-3.4 (OISST, CPC relative method) reached +${r1.facts.oct["2026"].rel} °C in October 2026 (1–24 Oct, preliminary), above every month since 1982 (previous high +${r1.facts.max_rel_before} °C, Nov 2015). Rainfall response per °C (IMERG 2001–2025): ${r1.regions.map((x) => `${x.name} ${x.im.slope.toFixed(0)}% (p ${x.im.p.toFixed(3)})`).join("; ")}. Season 2026 so far: ${r1.regions.filter((x) => x.now.rain !== null).map((x) => `${x.name} ${x.now.rain.toFixed(0)}% rain, ${x.now.tmax.toFixed(1)} °C hotter`).join("; ")}. Yield response per °C (FAO 1982–2018): ${r1.yields.filter((y) => y.code !== "OWID_WRL").map((y) => `${y.country} ${y.crop} ${y.slope.toFixed(1)}% (p ${y.p.toFixed(3)})`).join("; ")}. World yields show no significant response. Outlook at 2.5 °C season index: ${r1.models.map((m) => { const p = m.basis === "scenarios" ? m.preds[1] : m.preds[0]; return `${m.country} ${m.crop} ${p.mean.toFixed(0)}% (P loss>10% ${(p.p_loss10 * 100).toFixed(0)}%)`; }).join("; ")}. Caveats: extrapolation beyond 1982–2018 range, national yields, yield is not production, MERRA-2 rainfall unreliable over Africa so IMERG is used. Sources: NOAA OISST v2.1, NASA POWER (IMERG, MERRA-2), FAO via Our World in Data, World Bank WDI, NOAA CPC 8 Oct 2026 discussion, FEWS NET Oct 2026 report, IMD 2026 monsoon (−12.6%).`,
    r2: () => { const k = r2.kansas, mz = k.classes.find((c) => c.name === "Irrigated maize"); return `Study 02 (Hortus, October 2026): "Seeing what plants need: AI vision and tiered automation." Evidence: PlantVillage CNN 99.35% in the lab vs 31.4% on other photos (Mohanty 2016); 8 background pixels give 49% (Noyan 2022); GPT-4o zero-shot 56.9% apple leaves vs 98.1% fine-tuned (Roumeliotis 2025); first Autonomous Greenhouse Challenge: one AI team beat the manual reference (Hemming 2019). In-browser analyser: Excess Green with Otsu threshold for the plant mask, VARI for greenness, hue rules for yellowing and browning near tissue; screening, not diagnosis. Tiers: 0 Look (phone + AI), 1 Sense (HortusRoom S moisture-triggered watering 10 seconds to 60 minutes, pause 1 minute to 10 hours; HortusRoom A two channels 1,500 W), 2 Control (HortusPilot N EC 0.1–5.0 mS, pH 3–14, tanks 10–2,000 L; HortusPilot F 15 sensors, 26 alarms, RS-485; HortusPilot pH PI control 3.0–12.0; HortusRoom C CO2 300–5,000 ppm, threshold 400–2,000), 3 Predict (FAO-56 ET0×Kc, DLI = PPFD×h×0.0036 with MSU minimums 12 leafy / 15 fruiting, Hutton blight criteria), 4 Autonomy (MPC, limited evidence). Field data 2026 (Sentinel-2): Kansas 36 km² pivots: ${k.classes.map((c) => `${c.name} ${(c.share * 100).toFixed(0)}%`).join(", ")}; maize water use ${Math.round(mz.water.etc_hs)}–${Math.round(mz.water.etc)} mm, rain ${Math.round(mz.water.rain)} mm, irrigation need ${Math.round(mz.water.net_irrigation_hs)}–${Math.round(mz.water.net_irrigation)} mm; June–August mean max ${k.climate.jja_tmax.toFixed(1)} °C (+2.9 °C vs normal). Mkushi, Zambia: pivots ${(r2.mkushi.irrigated_share * 100).toFixed(0)}% of window; wheat irrigation need ${Math.round(r2.mkushi.water.net_irrigation_hs)}–${Math.round(r2.mkushi.water.net_irrigation)} mm with ${r2.mkushi.water.rain.toFixed(1)} mm rain. West Java: dry-season green share ${(r2.java.green_share_2025 * 100).toFixed(0)}% (2025) vs ${(r2.java.green_share_2026 * 100).toFixed(0)}% (2026); rain 1 Jul–14 Sep ${Math.round(r2.java.rain_jas_2025)} vs ${Math.round(r2.java.rain_jas_2026)} mm.`; }
  };
  $$("[data-ask-btn]").forEach((btn) => {
    const k = btn.dataset.askBtn, ta = $("#ask-" + k), outB = $(`[data-ask-out="${k}"]`), stopB = $(`[data-ask-stop="${k}"]`);
    let c = null;
    stopB.addEventListener("click", () => c && c.abort());
    btn.addEventListener("click", async () => {
      const q = ta.value.trim(); if (!q) { ta.focus(); toast("Type a question first."); return; }
      const sample = caps.sample || (await aiReady); if (!sample || !D[k]) return;
      c = new AbortController(); btn.disabled = true; stopB.hidden = false; outB.hidden = false;
      const p = $("p", outB); p.innerHTML = `<span class="thinking"><i></i>Thinking…</span>`;
      const prompt = `Answer a reader’s question about a research study. Use only the study facts below. If they do not cover the question, say what the study does not cover, then give general context marked as such. British spelling, plain sentences, no exclamation marks, under 170 words.\n\nSTUDY FACTS\n${CONTEXT[k]()}\n\nQUESTION\n${q}`;
      try { await sample(prompt, { signal: c.signal, cache: false, onText: ({ text }) => { p.textContent = text; } }); }
      catch (e) {
        p.textContent = e && e.text ? e.text : "";
        if (!e || e.code !== "cancelled") {
          if (e && ["not_granted", "sampling_disabled", "capability_disabled", "capability_removed", "not_declared"].includes(e.code)) $(`[data-ask="${k}"]`).hidden = true;
          else p.textContent += (p.textContent ? " " : "") + (e && e.code === "rate_limited" ? "Too many questions just now. Try again in a minute." : "The answer did not come through. Try again.");
        }
      } finally { btn.disabled = false; stopB.hidden = true; c = null; }
    });
  });

  /* ---------- reader ---------- */
  const reader = $("[data-reader]"), readerBody = $("[data-reader-body]");
  let readerKey = "r1";
  const openReader = async (k) => {
    readerKey = k; $("#reader-title").textContent = `HRT — Study ${byKey(k).n} · Paper`;
    readerBody.innerHTML = `<p class="thinking"><i></i>Loading the paper…</p>`;
    reader.showModal ? reader.showModal() : (reader.open = true);
    try {
      readerBody.innerHTML = await (await fetch(`${BASE}content/${k}-paper.txt`)).text();
      if (window.HortusFigs) window.HortusFigs.render(readerBody, D);
    } catch (e) { readerBody.innerHTML = "<p>The paper could not be loaded.</p>"; }
  };
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-read]"); if (b) openReader(b.dataset.read); });
  $("[data-reader-pdf]").addEventListener("click", () => savePdf(readerKey + "-paper"));

  /* ---------- deck viewer ---------- */
  const dv = $("[data-deckview]"), frameEl = $("[data-deck-frame]"), count = $("[data-deck-count]");
  let deck = [], di = 0, deckKey = "r1";
  const fit = () => { const s = frameEl.querySelector(".slide"); if (s) s.style.transform = `scale(${frameEl.clientWidth / 1920})`; };
  const showSlide = (i) => {
    di = Math.max(0, Math.min(deck.length - 1, i));
    frameEl.innerHTML = ""; const el = HD.build(deck[di], di + 1, deck.length); frameEl.appendChild(el); fit(); HD.hydrate(deck[di], el);
    count.textContent = `${di + 1} / ${deck.length}`; frameEl.setAttribute("aria-label", `Slide ${di + 1} of ${deck.length}`);
  };
  const openDeck = (k) => {
    if (!D[k]) return;
    deckKey = k; deck = k === "r1" ? HD.r1(D) : HD.r2(D);
    $("#deck-title").textContent = `HRT — Study ${byKey(k).n} · Deck`;
    dv.showModal ? dv.showModal() : (dv.open = true);
    requestAnimationFrame(() => { showSlide(0); frameEl.focus(); });
  };
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-deck]"); if (b) openDeck(b.dataset.deck); });
  $("[data-deck-prev]").addEventListener("click", () => showSlide(di - 1));
  $("[data-deck-next]").addEventListener("click", () => showSlide(di + 1));
  dv.addEventListener("keydown", (e) => { if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); showSlide(di + 1); } else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); showSlide(di - 1); } else if (e.key === "Home") showSlide(0); else if (e.key === "End") showSlide(deck.length - 1); });
  let sx = null; frameEl.addEventListener("pointerdown", (e) => (sx = e.clientX)); frameEl.addEventListener("pointerup", (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 40) showSlide(di + (e.clientX < sx ? 1 : -1)); sx = null; });
  if (window.ResizeObserver) new ResizeObserver(fit).observe(frameEl);
  $("[data-deck-pdf]").addEventListener("click", () => savePdf(deckKey + "-deck"));
  $$("dialog [data-close]").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));

  /* ---------- start ---------- */
  window.__HORTUS = { show, jump, STUDIES };
  const r0 = resolve(location.hash);
  show(r0.id, { fromHash: true, el: r0.el });
})();
