/* Figures and tables for the two papers. The same renderer fills the in-page reader and the A4 print pages,
   so the PDF and the screen show identical numbers. Placeholders: <figure data-fig="…"> and <div data-table="…">. */
(function (g) {
  "use strict";
  // Pictures live beside the page: in the Artifact and under /research/ on the web.
  const IMG = ((document.currentScript && document.currentScript.src) || location.href).replace(/js\/figs\.js(?:[?#].*)?$/, "") + "img/";
  const HC = g.HC, HD = g.HortusDeck, HV = g.HortusVision, HN = g.HortusNeeds;
  const ML = HC.MONTHS;
  const pv = (p) => (p < 0.001 ? "<0.001" : p.toFixed(3));
  const box = (fig) => { const d = document.createElement("div"); d.className = "chart"; fig.insertBefore(d, fig.querySelector("figcaption")); return d; };
  const tableHTML = (head, rows, right, cls) => `<div class="scroll-x"><table class="tbl ${cls || ""}"><thead><tr>${head.map((h, i) => `<th class="${right.includes(i) ? "r" : ""}">${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${right.includes(i) ? "r" : ""}">${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const season = (s) => ML[s[0] - 1] + "–" + ML[s[s.length - 1] - 1];
  const s1 = (v) => HC.sfmt(v, 1), s0 = (v) => HC.sfmt(v, 0);

  function tierSchema(sel) {
    const lit = (n) => n <= sel;
    return HD.schema([
      { id: "p", x: 10, y: 110, w: 170, h: 90, t: "Plant", s: ["Leaves, roots,", "fruit"], wing: true },
      { id: "s", x: 220, y: 20, w: 170, h: 90, t: "Sensors", s: lit(1) ? ["Moisture, air,", "feed"] : ["Added at tier 1"] },
      { id: "c", x: 220, y: 200, w: 170, h: 90, t: "Controllers", s: lit(2) ? ["Dose, water,", "vent"] : ["Added at tier 2"] },
      { id: "m", x: 430, y: 110, w: 170, h: 90, t: "Models", s: lit(3) ? ["Weather, satellite,", "ET₀ × Kc"] : ["Added at tier 3"], wing: lit(3) },
      { id: "y", x: 620, y: 110, w: 170, h: 90, t: "You", s: sel >= 4 ? ["Audit the", "system"] : ["Decide", "and act"] }
    ], [["p", "s"], ["p", "c"], ["s", "m"], ["c", "m"], ["m", "y"]], [800, 300], { label: `Tier ${sel}: what the system connects` });
  }

  const FIGS = {
    /* ---------- Study 01 ---------- */
    "enso-flow": (f) => { const d = document.createElement("div"); d.innerHTML = HD.ENSO_FLOW(); f.insertBefore(d, f.querySelector("figcaption")); },
    enso: (f, D) => {
      const r = D.r1, pts = r.enso.filter((e) => e.rel !== null).map((e) => ({ x: +e.m.slice(0, 4) + (+e.m.slice(5, 7) - 0.5) / 12, y: e.rel }));
      const bands = r.events.map((e) => ({ x0: +e.start.slice(0, 4) + (+e.start.slice(5, 7) - 1) / 12, x1: +e.end.slice(0, 4) + (+e.end.slice(5, 7)) / 12 + (e.ongoing ? 1 / 12 : 0) }));
      HC.line(box(f), { height: 250, label: "Relative Niño-3.4, monthly, 1982–2026", series: [{ name: "Relative Niño-3.4", cls: "focus", values: pts }], bands, x: { min: 1982, max: 2027, fmt: (v) => String(Math.round(v)) }, y: { fmt: (v) => HC.sfmt(v, 0) }, hlines: [{ y: 2, label: "+2 °C" }], marks: [{ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y, label: "Oct 2026" }] });
    },
    map: (f, D) => HC.worldMap(box(f), { land: D.land, nino: true, vmax: 40, label: "Crop belts and their rainfall response", boxes: D.r1.regions.map((x) => ({ lat: x.lat, lon: x.lon, v: x.im.slope, label: x.name, short: HD.SHORT[x.id] || "" })) }),
    agree: (f, D) => HC.bars(box(f), { label: "Agreement between MERRA-2 and IMERG", max: 1, rows: D.r1.regions.map((x) => ({ label: x.name, v: Math.max(0, x.agree.r), text: x.agree.r.toFixed(2).replace("-", "−"), focus: x.agree.r < 0.5 })).sort((a, b) => a.v - b.v) }),
    now: (f, D) => HC.forest(box(f), { label: "Rain in the 2026 season so far", x: { min: -100, max: 40, fmt: (v) => s0(v) + "%" }, valueWidth: 70, rows: D.r1.regions.filter((x) => x.now.rain !== null && x.id !== "bra_northeast").sort((a, b) => a.now.rain - b.now.rain).map((x) => ({ label: x.name, sub: x.now.months.split(",").map((m) => ML[m - 1]).join(" "), v: x.now.rain, lo: x.now.rain, hi: x.now.rain, focus: x.now.rain < -10, right: s0(x.now.rain) + "%" })) }),
    ys: (f, D) => HC.forest(box(f), { label: "Yield response by crop and country", x: { min: -25, max: 12, fmt: (v) => s0(v) + "%", label: "% per °C" }, rows: D.r1.yields.filter((y) => y.code !== "OWID_WRL" && y.crop !== "Beans").sort((a, b) => a.slope - b.slope).map((y) => ({ label: `${y.country} · ${y.crop.toLowerCase()}`, v: y.slope, lo: y.lo, hi: y.hi, focus: y.p < 0.05 && y.slope < 0, right: s1(y.slope) + "%" })), rowH: 22 }),
    zaf: (f, D) => {
      const y = D.r1.yields.find((q) => q.code === "ZAF" && q.crop === "Maize"), hv = y.vs_years.map((v) => v + y.lag);
      HC.line(box(f), { height: 220, label: "South Africa maize yield vs trend", series: [{ name: "Yield vs trend", cls: "ctx", values: y.series.filter((p) => p.y >= 1980).map((p) => ({ x: p.y, y: p.v })) }], x: { min: 1980, max: 2018, fmt: (v) => String(v) }, y: { fmt: (v) => s0(v) + "%" }, marks: y.series.filter((p) => hv.includes(p.y)).map((p) => ({ x: p.y, y: p.v, label: String(p.y), dx: 8, dy: p.v < 0 ? 16 : -8, anchor: "start" })) });
    },
    out: (f, D) => HC.forest(box(f), { label: "Outlook by crop and country", x: { min: -90, max: 45, fmt: (v) => s0(v) + "%", label: "yield vs trend" }, valueHead: "P(loss >10%)", rowH: 22, rows: D.r1.models.filter((m) => m.crop !== "Beans").map((m) => { const p = m.basis === "scenarios" ? m.preds[1] : m.preds[0]; return { label: `${m.country} · ${m.crop.toLowerCase()}`, v: p.mean, lo: p.lo80, hi: p.hi80, hollow: m.basis !== "scenarios", focus: p.p_loss10 >= 0.5, right: Math.round(p.p_loss10 * 100) + "%" }; }).sort((a, b) => a.v - b.v) }),
    /* ---------- Study 02 ---------- */
    vflow: (f) => { const d = document.createElement("div"); d.innerHTML = HD.VISION_FLOW(); f.insertBefore(d, f.querySelector("figcaption")); },
    samples: async (f) => {
      const grid = document.createElement("div"); grid.className = "p-grid three";
      f.insertBefore(grid, f.querySelector("figcaption"));
      for (const k of ["healthy", "spots", "yellowing"]) {
        const res = HV.analyse(await HV.sample(k)), m = res.metrics;
        const cell = document.createElement("div"); cell.className = "p-cell";
        const a = document.createElement("canvas"), b = document.createElement("canvas");
        HV.render(res, "photo", a); HV.render(res, "stress", b);
        const lab = document.createElement("p"); lab.className = "cap";
        lab.textContent = `${k === "spots" ? "Leaf spots" : k[0].toUpperCase() + k.slice(1)}: ${m.healthy.toFixed(1)}% healthy, ${m.yellowing.toFixed(1)}% yellowing, ${m.browning.toFixed(1)}% browning; index ${m.index}`;
        cell.append(a, b, lab); grid.appendChild(cell);
      }
    },
    tiers: (f) => { const d = document.createElement("div"); d.innerHTML = tierSchema(3); f.insertBefore(d, f.querySelector("figcaption")); },
    kmap: (f, D) => {
      const fr = D.r2.kansas.frames.find((q) => q.d === "2026-07-30") || D.r2.kansas.frames.reduce((a, b) => (b.mean > a.mean ? b : a));
      const w = document.createElement("div"); w.className = "p-map"; const c = document.createElement("canvas"); w.appendChild(c);
      f.insertBefore(w, f.querySelector("figcaption")); return HC.stipple(c, fr.img);
    },
    kcurves: (f, D) => { const k = D.r2.kansas; HC.line(box(f), { height: 230, endLabels: false, label: "NDVI curves by class", series: k.classes.map((c) => ({ name: c.name, cls: c.name === "Irrigated maize" ? "focus" : "ctx", values: k.grid_doy.map((d, i) => ({ x: d, y: c.curve[i] })) })), x: { min: 70, max: 280, ticks: () => [91, 121, 152, 182, 213, 244, 274], fmt: (v) => ({ 91: "Apr", 121: "May", 152: "Jun", 182: "Jul", 213: "Aug", 244: "Sep", 274: "Oct" }[v]) }, y: { min: 0, max: 1, fmt: (v) => v.toFixed(1) } }); },
    kwater: (f, D) => {
      let ce = 0, cr = 0; const dl = D.r2.kansas.maize_daily.map((d) => { ce += d.etc || 0; cr += d.rain || 0; return { x: Date.parse(d.d), e: ce, r: cr }; });
      const ticks = []; for (let m = 5; m <= 9; m++) ticks.push(Date.UTC(2026, m, 1));
      HC.line(box(f), { height: 210, endLabels: true, label: "Cumulative maize water use and rain", series: [{ name: "Use", cls: "focus", values: dl.map((p) => ({ x: p.x, y: p.e })) }, { name: "Rain", cls: "ctx", values: dl.map((p) => ({ x: p.x, y: p.r })) }], x: { ticks: () => ticks, fmt: (v) => HC.dfmt(v, false, false) }, y: { min: 0, fmt: (v) => Math.round(v) + "" } });
    },
    mk: (f, D) => { const m = D.r2.mkushi; const ticks = []; for (let mo = 4; mo <= 9; mo++) ticks.push(Date.UTC(2026, mo, 1)); HC.line(box(f), { height: 210, endLabels: true, label: "NDVI of pivots and other land, Mkushi", series: [{ name: "Pivots", cls: "focus", values: m.dates.map((d, i) => ({ x: Date.parse(d), y: m.irrigated_series[i] })) }, { name: "Other land", cls: "ctx", values: m.dates.map((d, i) => ({ x: Date.parse(d), y: m.other_series[i] })) }], x: { ticks: () => ticks, fmt: (v) => HC.dfmt(v, false, false) }, y: { min: 0, max: 0.9, fmt: (v) => v.toFixed(1) } }); },
    java: (f) => { const d = document.createElement("div"); d.className = "p-grid two"; d.innerHTML = `<img src="${IMG}java-2025-08-10.jpg" alt="West Java rice land, 10 August 2025, mostly green"><img src="${IMG}java-2026-08-13.jpg" alt="The same land, 13 August 2026, with large dry patches">`; f.insertBefore(d, f.querySelector("figcaption")); }
  };

  const TABLES = {
    belts: (D) => tableHTML(["Belt", "Crop", "Season", "Rain, % per °C (95% CI)", "p", "MERRA-2", "Heat, °C per °C"],
      D.r1.regions.map((x) => [x.name, x.crop, season(x.season), `${s1(x.im.slope)} (${s0(x.im.lo)} to ${s0(x.im.hi)})`, pv(x.im.p), s1(x.m2.slope), HC.sfmt(x.tmax.slope, 2)]), [3, 4, 5, 6], "nw3"),
    yields: (D) => {
      const R = D.r1.robust;
      return tableHTML(["Country · crop", "Harvest", "n", "Slope (95% CI)", "p", "Fits", "Without VS"],
        D.r1.yields.filter((y) => y.code !== "OWID_WRL" && y.crop !== "Beans").sort((a, b) => a.slope - b.slope).map((y) => {
          const rr = R.filter((q) => q.pair === `${y.code} ${y.crop}`);
          const fits = rr.length ? `${rr.filter((q) => q.p < 0.05).length}/6` : "—";
          const nv = rr.length ? `${s1(Math.min(...rr.map((q) => q.slope_noVS)))} to ${s1(Math.max(...rr.map((q) => q.slope_noVS)))}` : "—";
          return [`${y.country} · ${y.crop.toLowerCase()}`, y.lag ? "next year" : "same year", y.n, `${s1(y.slope)} (${s1(y.lo)} to ${s1(y.hi)})`, pv(y.p), fits, nv];
        }), [2, 3, 4, 5, 6]);
    },
    outlook: (D) => tableHTML(["Crop · country", "Harvest", "Index, °C", "Mean, %", "80% interval, %", "P"],
      D.r1.models.filter((m) => m.crop !== "Beans").map((m) => ({ m, p: m.basis === "scenarios" ? m.preds[1] : m.preds[0] })).sort((a, b) => b.p.p_loss10 - a.p.p_loss10).map(({ m, p }) => [`${m.crop} · ${m.country}`, m.harvest_year, (m.basis === "scenarios" ? "2.50" : p.enso.toFixed(2)) + (p.enso > m.xmax ? "*" : ""), s0(p.mean), `${s0(p.lo80)} to ${s0(p.hi80)}`, Math.round(p.p_loss10 * 100) + "%"]), [2, 3, 4, 5]) + `<p class="cap">* Beyond the strongest crop-season index in the 1982–2018 record for that pair.</p>`,
    "vision-evidence": () => tableHTML(["Study", "Images and task", "Lab result", "Elsewhere"], [
      ["Mohanty et al. (2016)", "PlantVillage, 14 crops, 26 diseases; deep CNN", "99.35% on held-out images", "31.4% on photos from other sources (chance 2.6%)"],
      ["Noyan (2022)", "PlantVillage, background pixels only", "49.0% from 8 background pixels", "Shows label leakage, not plant features"],
      ["Singh et al. (2020)", "PlantDoc, 2,598 non-lab images, 13 species", "—", "Training on non-lab images: up to +31% accuracy"],
      ["Roumeliotis et al. (2025)", "PlantVillage apple and maize; GPT-4o and ResNet-50", "98.12% (GPT-4o fine-tuned, apple)", "Zero-shot GPT-4o: 56.87% apple, 69.37% maize"]
    ], []),
    tiers: () => tableHTML(["Tier", "Senses", "Decides", "Does", "Runs on", "Evidence"], HN.TIERS.map((t) => [`${t.id} · ${t.name}`, t.senses.join("; "), t.decides.join("; "), t.acts.join("; "), t.hw.join("; "), t.ev]), []),
    fields: (D) => {
      const k = D.r2.kansas, m = D.r2.mkushi, j = D.r2.java, mz = k.classes.find((c) => c.name === "Irrigated maize");
      return tableHTML(["Window", "Scenes used", "Main result", "Water or rain"], [
        [`Kansas, USA · 14SLH · 2026`, `${D.r2.series.kansas.length} (${k.frames.length} near cloud-free)`, `Five crop calendars; irrigated maize ${Math.round(mz.share * 100)}% of the window`, `Maize use ${Math.round(mz.water.etc_hs)}–${Math.round(mz.water.etc)} mm; rain ${Math.round(mz.water.rain)} mm; irrigation ${Math.round(mz.water.net_irrigation_hs)}–${Math.round(mz.water.net_irrigation)} mm`],
        [`Mkushi, Zambia · 35LQE · 2026`, `${D.r2.series.mkushi.length} (${m.frames.length} near cloud-free)`, `Pivots ${Math.round(m.irrigated_share * 100)}% of the window`, `Wheat use ${Math.round(m.water.etc_hs)}–${Math.round(m.water.etc)} mm; rain ${m.water.rain.toFixed(1)} mm`],
        [`West Java, Indonesia · 48MZT · 2025–26`, `${D.r2.series.java.length} (${j.dates_2025.length} + ${j.dates_2026.length} in Jul–Sep)`, `Green in the dry season: ${Math.round(j.green_share_2025 * 100)}% (2025), ${Math.round(j.green_share_2026 * 100)}% (2026)`, `Rain 1 Jul–14 Sep: ${Math.round(j.rain_jas_2025)} mm (2025), ${Math.round(j.rain_jas_2026)} mm (2026)`]
      ], []);
    }
  };

  async function render(root, D) {
    const jobs = [];
    root.querySelectorAll("[data-fig]").forEach((f) => {
      const fn = FIGS[f.dataset.fig]; if (!fn || f.dataset.done) return; f.dataset.done = "1";
      try { const r = fn(f, D); if (r && r.then) jobs.push(r); } catch (e) { console.error("figure", f.dataset.fig, e); }
      f.querySelectorAll(".schema").forEach((s) => s.classList.add("in"));
    });
    root.querySelectorAll("[data-table]").forEach((t) => {
      const fn = TABLES[t.dataset.table]; if (!fn || t.dataset.done) return; t.dataset.done = "1";
      try { t.insertAdjacentHTML("beforeend", fn(D)); } catch (e) { console.error("table", t.dataset.table, e); }
    });
    await Promise.all(jobs);
  }

  g.HortusFigs = { render, tierSchema };
})(window);
