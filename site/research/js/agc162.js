/* agc162, AI vision for fruit farms: Hortus research, study 03 (the owner's pitch page, ported to the research pages).
   - machine views: the owner's photos, half photograph and half characters, behind a sweep line in the wing colour
   - How it works: a compare slider; Capture: photo, video and live modes
   - Field guide: a 3D mango (three.js r128 from /vendor) with six problems to find
   - three demo app screens (orchard map, scan, spray plan) and a pack line drawn in characters
   Colours come from the tokens. Each piece runs only while its screen is in view and the tab is visible; reduced motion
   keeps still frames. The demo screens say so on their face: their numbers are demo data, not results. */
(function (g) {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  // The owner's photos, graded to the brand, beside the page in img/; keys as the pitch named them.
  const PHOTOS = { hero: "orchard", calypso: "calypso-row", calypso_crop: "calypso-tree", leaf: "guava-leaf", guava: "guava-harvest" };

  // Demo boxes, in fractions of each photo (from the pitch page).
  const CAL = [[0.037, 0.496, 0.0596, 0.0659, "L"], [0.0962, 0.4949, 0.0225, 0.0523, "S"], [0.1581, 0.6837, 0.0676, 0.0882, "L"], [0.2831, 0.4307, 0.0647, 0.1192, "XL"], [0.3353, 0.4307, 0.0647, 0.1192, "L"], [0.4459, 0.7062, 0.1206, 0.154, "XL"], [0.4647, 0.336, 0.0407, 0.0475, "M"], [0.483, 0.6371, 0.0697, 0.1008, "L"], [0.4893, 0.4247, 0.053, 0.0678, "L"], [0.5022, 0.3578, 0.0349, 0.0484, "M"], [0.5397, 0.7431, 0.053, 0.063, "M"], [0.5679, 0.4373, 0.0458, 0.0504, "M"], [0.5856, 0.5112, 0.0327, 0.0455, "M"], [0.5916, 0.632, 0.0552, 0.0649, "L"], [0.6112, 0.7498, 0.0283, 0.0426, "S"], [0.6461, 0.508, 0.0312, 0.0465, "S"], [0.6517, 0.6198, 0.0392, 0.0543, "M"], [0.658, 0.3376, 0.0291, 0.0397, "S"], [0.6594, 0.5954, 0.045, 0.0475, "M"], [0.7193, 0.4463, 0.0436, 0.0378, "M"], [0.8206, 0.4872, 0.0378, 0.0358, "S"]];
  const box = (a, label, more) => Object.assign({ x: a[0], y: a[1], w: a[2], h: a[3], c: a[4], label: label || "" }, more || {});
  const pad2 = (n) => String(n).padStart(2, "0");
  const DATA = {
    heroBoxes: [{ x: 0, y: 0.29, w: 0.3, h: 0.29, label: "Row 2 · tree 11" }, { x: 0.74, y: 0.37, w: 0.26, h: 0.25, label: "Row 3 · tree 09 · check", flag: true, ret: true }, { x: 0.42, y: 0.46, w: 0.15, h: 0.085, label: "Row 2 · 40 m" }],
    leafBoxes: [{ x: 0.12, y: 0.17, w: 0.16, h: 0.21, label: "Holes", flag: true }, { x: 0.77, y: 0.27, w: 0.17, h: 0.22, label: "Spots" }, { x: 0.36, y: 0.07, w: 0.3, h: 0.45, label: "Reddening", ret: true }],
    calBoxes: CAL.map((a, i) => box(a, [0, 2, 3, 4, 5, 7].includes(i) ? a[4] + " · " + pad2(i + 1) : "")),
    calVideo: CAL.map((a, i) => box(a, i % 3 === 0 ? "Fruit " + pad2(i + 1) : "")),
    cropBoxes: [[0.0959, 0.2514, 0.1672, 0.1733, "XL"], [0.2308, 0.2514, 0.1672, 0.1733, "L"], [0.5168, 0.6522, 0.3119, 0.224, "XL"], [0.5656, 0.1138, 0.1052, 0.069, "M"], [0.6128, 0.5517, 0.1804, 0.1465, "L"], [0.6292, 0.2427, 0.1372, 0.0986, "L"], [0.6625, 0.1455, 0.0902, 0.0705, "M"], [0.7595, 0.7059, 0.1372, 0.0916, "M"], [0.8325, 0.2611, 0.1184, 0.0733, "M"], [0.8782, 0.3686, 0.0845, 0.0662, "M", 1], [0.8938, 0.5443, 0.1428, 0.0944, "L"], [0.9444, 0.7156, 0.0733, 0.062, "S", 1]].map((a) => box(a, a[5] ? "Inspect" : "", a[5] ? { flag: true } : null))
  };

  // Six problems agc162 is built to flag on mango, placed on the fruit by u (around) and v (top to bottom).
  const DIS = [
    { short: "Anthracnose", latin: "Colletotrichum spp.", u: 0.3, v: 0.6,
      looks: "Dark, sunken spots on fruit, often in tear-stain streaks. Black flecks on flowers.",
      when: "Infects at flowering in warm, wet weather, then hides until the fruit ripens.",
      todo: "Protect flowers before wet spells, prune for airflow, then hot-water or registered post-harvest treatment.",
      watch: "Flowering stage, hours of leaf wetness, first lesions on panicles.",
      src: "Nelson 2008, CTAHR PD-48 · Dodd et al. 1991" },
    { short: "Stem-end rot", latin: "Lasiodiplodia, Neofusicoccum spp.", u: 0.3, v: 0.1,
      looks: "A dark rot spreading from the stalk end as the fruit ripens.",
      when: "Enters through the stalk and wounds; worse after stress and rough handling.",
      todo: "Remove dead wood. Pick with care, trim the stalk and de-sap stem-end down. Post-harvest treatment as registered.",
      watch: "Dead twigs in the canopy; stalk-end darkening on the line.",
      src: "Acta Horticulturae 291 · FAO TCP/RAS/3502" },
    { short: "Black spot", latin: "Xanthomonas citri pv. mangiferaeindicae", u: 0.58, v: 0.46,
      looks: "Raised black spots with greasy edges that crack and ooze. Angular leaf spots.",
      when: "Warm, humid weather with wind-driven rain; spreads on wind, rain and tools.",
      todo: "Windbreaks. Copper sprays as registered, with mancozeb instead during flowering.",
      watch: "New leaf spots after storms; raised spots on fruit.",
      src: "Pitkethley 2006, NT Agnote I24 · Pacific Pests 213" },
    { short: "Powdery mildew", latin: "Pseudoidium anacardii (syn. Oidium mangiferae)", u: 0.12, v: 0.26,
      looks: "White powder on flowers, stalks and young fruit; flowers drop before fruit sets.",
      when: "Flowering, with cool nights, 10–31 °C and 60–90% humidity.",
      todo: "First protective sulphur spray as panicles reach 8–10 cm; prune out infected panicles.",
      watch: "Panicle length and white growth, panicle by panicle.",
      src: "Nelson 2008, CTAHR PD-46 · ICAR–CISH" },
    { short: "Sooty mould", latin: "Capnodium, Meliola spp.", u: 0.86, v: 0.52,
      looks: "A black film that rubs off leaves and fruit.",
      when: "Grows on honeydew from scale insects, mealybugs and hoppers.",
      todo: "Control the sap-sucking insects that feed it.",
      watch: "Black film on leaves and the insects making honeydew.",
      src: "National Horticulture Board, India" },
    { short: "Fruit fly", latin: "Bactrocera spp.", u: 0.45, v: 0.78,
      looks: "Small puncture marks, sometimes weeping sap; larvae inside the flesh.",
      when: "As fruit matures and colours.",
      todo: "Monitor with traps and follow your region’s programme. Export fruit may need disinfestation, such as hot water.",
      watch: "Sting marks on fruit; trap counts against threshold.",
      src: "Ocitti et al. 2021, African Entomology" }
  ];

  // The demo orchard: six blocks, their state and what to do next.
  const STL = { ok: "Healthy", watch: "Watch", act: "Act" };
  const BLOCKS = [
    { id: "A", pts: "14,14 158,6 164,92 22,98", cx: 88, cy: 52, cv: "Calypso", ha: 3.1, trees: 310, st: "ok", stage: "Fruit set", wet: 6, conf: "High", issue: "No problems found on the last pass.", next: "Next scan Monday.", scans: ["Mon · 310 trees · clean", "Last week · 310 trees · clean"], treat: "No treatment needed this week.", sched: ["Mon · walk-scan rows 1–8"] },
    { id: "B", pts: "180,6 326,16 320,92 186,98", cx: 253, cy: 52, cv: "Kensington Pride", ha: 2.4, trees: 240, st: "watch", stage: "Flowering 40%", wet: 11, conf: "Medium", issue: "Powdery mildew on 6 panicles, rows 2–3.", next: "Sulphur once most panicles reach 8–10 cm.", scans: ["Mon · 240 trees · 6 panicles flagged", "Thu · 240 trees · 2 panicles flagged"], treat: "Protective sulphur at 8–10 cm panicle length; prune out infected panicles.", sched: ["Wed · re-scan rows 2–3", "Thu · sulphur if panicles ≥ 8 cm"] },
    { id: "C", pts: "22,112 164,106 170,192 28,198", cx: 96, cy: 150, cv: "Calypso", ha: 4.2, trees: 420, st: "act", stage: "Flowering 70%", wet: 19, conf: "High", issue: "Anthracnose lesions on panicles of 3 trees; rain due Thursday.", next: "Protect panicles before Thursday’s wet spell.", scans: ["Mon · 420 trees · 3 trees with lesions", "Last week · 420 trees · clean"], treat: "Protectant before the wet spell. Pick a product registered for mango anthracnose; follow label rate and withholding period.", sched: ["Wed 06:00 · spray block C", "Fri · re-scan panicles"] },
    { id: "D", pts: "186,108 320,104 326,188 192,194", cx: 256, cy: 148, cv: "R2E2", ha: 3.6, trees: 360, st: "ok", stage: "Fruit set", wet: 7, conf: "High", issue: "No problems found on the last pass.", next: "Next scan Monday.", scans: ["Mon · 360 trees · clean"], treat: "No treatment needed this week.", sched: ["Mon · drone pass"] },
    { id: "E", pts: "28,212 170,206 174,290 34,294", cx: 100, cy: 250, cv: "Keitt", ha: 2.0, trees: 200, st: "watch", stage: "Fruit fill", wet: 8, conf: "Medium", issue: "Fruit fly: 2 traps over threshold.", next: "Check traps and follow the area programme.", scans: ["Mon · 200 trees · 9 fruit with stings", "Trap check · 2 of 4 over threshold"], treat: "Follow your region’s fruit-fly programme; bait or traps as registered.", sched: ["Tue · trap check", "Fri · re-scan fruit"] },
    { id: "F", pts: "192,206 326,200 330,284 196,292", cx: 262, cy: 246, cv: "Honey Gold", ha: 1.8, trees: 180, st: "ok", stage: "Flowering 20%", wet: 9, conf: "High", issue: "No problems found on the last pass.", next: "Watch panicle growth.", scans: ["Mon · 180 trees · clean"], treat: "No treatment needed this week.", sched: ["Thu · panicle scan"] }
  ];

  function init(view, o) {
    o = o || {};
    const base = o.base || "/research/", toast = o.toast || (() => {}), jump = o.jump || (() => {});
    const mq = g.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : null;
    let RM = !!(mq && mq.matches);
    if (mq && mq.addEventListener) mq.addEventListener("change", (e) => { RM = e.matches; });
    const COARSE = !!(g.matchMedia && matchMedia("(pointer: coarse)").matches);
    const DPR = Math.min(g.devicePixelRatio || 1, COARSE ? 1.5 : 2);
    // Night colours: every canvas here is a dark plate in both themes.
    const T = { void: css("--void"), paper: css("--paper"), ash: css("--ash"), sig: css("--hortus"), iron: css("--iron"), graphite: css("--graphite") };
    const MONOF = css("--mono") || "monospace";
    const MONO = (px) => "500 " + Math.round(px) + "px " + MONOF;
    const fontsReady = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 1800))]);

    /* ---------- one animation loop; only what is on screen runs ---------- */
    const running = new Set();
    let raf = 0;
    const frame = (now) => { raf = 0; running.forEach((v) => { try { v.tick(now); } catch (e) { console.error(e); running.delete(v); } }); if (running.size && !document.hidden) raf = requestAnimationFrame(frame); };
    const play = (v) => { if (RM && !v.always) { v.tick(performance.now()); return; } running.add(v); if (!raf) raf = requestAnimationFrame(frame); };
    const pause = (v) => running.delete(v);
    document.addEventListener("visibilitychange", () => { if (!document.hidden && running.size && !raf) raf = requestAnimationFrame(frame); });
    const viewComp = (v) => ({ start() { play(v); }, stop() { pause(v); } });

    // A piece starts when its screen is at least half in view and stops when it leaves (or the study is closed).
    const comps = new Map();
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      const c = comps.get(e.target); if (!c) return;
      const on = e.isIntersecting && e.intersectionRatio >= 0.5;
      if (on !== c.on) { c.on = on; c.list.forEach((x) => (on ? x.start() : x.stop())); }
    }), { root: view, threshold: [0, 0.5, 0.8] });
    const onScreen = (el, comp) => {
      const sec = el.closest(".screen");
      if (!comps.has(sec)) { comps.set(sec, { on: false, list: [] }); io.observe(sec); }
      comps.get(sec).list.push(comp);
    };

    /* ---------- photos ---------- */
    const imgCache = {};
    const loadImg = (k) => imgCache[k] || (imgCache[k] = new Promise((res, rej) => { const im = new Image(); im.decoding = "async"; im.onload = () => res(im); im.onerror = rej; im.src = base + "img/agc162-" + PHOTOS[k] + ".webp"; }));

    /* ---------- the machine view: characters from luminance, over the photograph ---------- */
    const RAMP = " .,:-=+*#%@";
    const atlasCache = new Map();
    // Glyph rows: 0 dim (ash), 1 flagged (the wing colour), 2 bright (paper).
    function atlas(cw, ch) {
      const k = cw + "x" + ch; if (atlasCache.has(k)) return atlasCache.get(k);
      const c = document.createElement("canvas"); c.width = cw * RAMP.length; c.height = ch * 3; const x = c.getContext("2d");
      x.textAlign = "center"; x.textBaseline = "middle"; x.font = MONO(ch * 0.86);
      [[T.ash, 0.8], [T.sig, 1], [T.paper, 0.86]].forEach(([col, a], r) => { x.globalAlpha = a; x.fillStyle = col; for (let i = 1; i < RAMP.length; i++) x.fillText(RAMP[i], i * cw + cw / 2, r * ch + ch / 2 + ch * 0.04); });
      x.globalAlpha = 1; atlasCache.set(k, c); return c;
    }
    function corners(x, r, d, flag) {
      const k = Math.min(12 * d, r.w * 0.3, r.h * 0.3); x.beginPath();
      x.moveTo(r.x, r.y + k); x.lineTo(r.x, r.y); x.lineTo(r.x + k, r.y);
      x.moveTo(r.x + r.w - k, r.y); x.lineTo(r.x + r.w, r.y); x.lineTo(r.x + r.w, r.y + k);
      x.moveTo(r.x + r.w, r.y + r.h - k); x.lineTo(r.x + r.w, r.y + r.h); x.lineTo(r.x + r.w - k, r.y + r.h);
      x.moveTo(r.x + k, r.y + r.h); x.lineTo(r.x, r.y + r.h); x.lineTo(r.x, r.y + r.h - k); x.stroke();
      if (flag) { x.save(); x.setLineDash([3 * d, 3 * d]); x.globalAlpha = 0.6; x.strokeRect(r.x, r.y, r.w, r.h); x.restore(); }
    }
    function chipText(x, t, px, py, d, W, col) {
      const tw = x.measureText(t).width + 10 * d, th = 18 * d; px = clamp(px, 2 * d, W - tw - 2 * d);
      x.save(); x.globalAlpha = 0.8; x.fillStyle = T.void; x.fillRect(px, py, tw, th); x.restore();
      x.fillStyle = col; x.fillText(t, px + 5 * d, py + th / 2 + 0.5 * d);
    }
    function hudTop(x, W, text, now) {
      const d = DPR; x.font = MONO(11 * d); x.textBaseline = "middle";
      const tw = x.measureText(text).width, y = 22 * d;
      x.save(); x.globalAlpha = 0.62; x.fillStyle = T.void; x.fillRect(W / 2 - tw / 2 - 18 * d, y - 11 * d, tw + 34 * d, 22 * d); x.restore();
      x.save(); x.globalAlpha = RM ? 1 : Math.sin(now / 280) > -0.3 ? 1 : 0.25; x.fillStyle = T.sig; x.beginPath(); x.arc(W / 2 - tw / 2 - 7 * d, y, 3 * d, 0, 6.283); x.fill(); x.restore();
      x.save(); x.globalAlpha = 0.9; x.fillStyle = T.paper; x.fillText(text, W / 2 - tw / 2 + 3 * d, y + 0.5 * d); x.restore();
    }
    const views = [];
    const VD = { cell: 8, reveal: "loop", axis: "x", first: "photo", boxSide: "first", boxes: [], hud: true, hudTop: "Demo feed", hudBL: "", line: true, flicker: true, sweep: 5200, hold: 2200, band: 0.18, split: 0.5, rmSplit: 0.56, pan: false, panMs: 24000, focus: null, zoom: 1 };
    class AsciiView {
      constructor(el, opts) {
        this.el = el; this.cv = $("canvas", el); this.g = this.cv.getContext("2d"); this.o = Object.assign({}, VD, opts || {}); this.split = this.o.split;
        this.t0 = performance.now(); this.lf = 0; this.ll = 0; this.img = null; this.ready = false; views.push(this);
        if (g.ResizeObserver) new ResizeObserver(() => this.resize()).observe(el); else addEventListener("resize", () => this.resize());
      }
      async use(key, opts) {
        if (opts) this.o = Object.assign({}, VD, opts);
        this.split = this.o.split; this.t0 = performance.now(); this.key = key;
        let im; try { im = await loadImg(key); } catch (e) { return; }
        if (this.key !== key) return;
        this.img = im; this.resize(true);
      }
      resize(force) {
        const r = this.el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
        const W = Math.round(r.width * DPR), H = Math.round(r.height * DPR); if (!force && W === this.W && H === this.H) return;
        this.W = W; this.H = H; this.cv.width = W; this.cv.height = H; this.cw = Math.max(5, Math.round(this.o.cell * DPR)); this.ch = Math.round(this.cw * 1.32);
        this.cols = Math.ceil(W / this.cw); this.rows = Math.ceil(H / this.ch); this.at = atlas(this.cw, this.ch); if (this.img) this.build();
      }
      src(p) {
        const iw = this.img.naturalWidth, ih = this.img.naturalHeight, z = this.o.pan ? 1.25 : this.o.zoom || 1, s = Math.max(this.W / iw, this.H / ih) * z, sw = this.W / s, sh = this.H / s;
        let fx = this.o.focus ? this.o.focus[0] : 0.5; const fy = this.o.focus ? this.o.focus[1] : 0.5; if (this.o.pan) fx = 0.2 + 0.6 * p;
        return { sx: clamp(fx * iw - sw / 2, 0, iw - sw), sy: clamp(fy * ih - sh / 2, 0, ih - sh), sw, sh, s };
      }
      build() {
        if (!this.photo) { this.photo = document.createElement("canvas"); this.asc = document.createElement("canvas"); this.smp = document.createElement("canvas"); }
        this.sr = this.src(this.pt || 0); this.photo.width = this.asc.width = this.W; this.photo.height = this.asc.height = this.H;
        const p = this.photo.getContext("2d"); p.drawImage(this.img, this.sr.sx, this.sr.sy, this.sr.sw, this.sr.sh, 0, 0, this.W, this.H);
        const v = p.createRadialGradient(this.W / 2, this.H * 0.45, this.H * 0.22, this.W / 2, this.H * 0.5, this.H * 0.86); v.addColorStop(0, "transparent"); v.addColorStop(1, T.void);
        p.globalAlpha = 0.5; p.fillStyle = v; p.fillRect(0, 0, this.W, this.H); p.globalAlpha = 1;
        this.lum(); this.paint(); this.ready = true; this.draw(performance.now());
      }
      lum() {
        const { cols, rows, sr } = this, c = this.smp; c.width = cols; c.height = rows; const x = c.getContext("2d", { willReadFrequently: true });
        x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high"; x.drawImage(this.img, sr.sx, sr.sy, sr.sw, sr.sh, 0, 0, cols, rows);
        let d; try { d = x.getImageData(0, 0, cols, rows).data; } catch (e) { d = new Uint8ClampedArray(cols * rows * 4).fill(120); }
        const n = cols * rows, L = new Float32Array(n), lv = RAMP.length - 1; let mn = 1, mx = 0;
        for (let i = 0; i < n; i++) { const l = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255; L[i] = l; if (l < mn) mn = l; if (l > mx) mx = l; }
        const sp = Math.max(0.12, mx - mn); this.ch8 = new Uint8Array(n);
        for (let i = 0; i < n; i++) { L[i] = Math.pow((L[i] - mn) / sp, 0.85); this.ch8[i] = Math.min(lv, Math.round(L[i] * lv)); }
        this.L = L; this.hl = new Uint8Array(n);
        for (const b of this.o.boxes) {
          const r = this.box(b), c0 = Math.floor(r.x / this.cw), c1 = Math.ceil((r.x + r.w) / this.cw), r0 = Math.floor(r.y / this.ch), r1 = Math.ceil((r.y + r.h) / this.ch);
          for (let y = Math.max(0, r0); y < Math.min(rows, r1); y++) for (let q = Math.max(0, c0); q < Math.min(cols, c1); q++) this.hl[y * cols + q] = 1;
        }
      }
      box(b) { const iw = this.img.naturalWidth, ih = this.img.naturalHeight, sr = this.sr; return { x: (b.x * iw - sr.sx) * sr.s, y: (b.y * ih - sr.sy) * sr.s, w: b.w * iw * sr.s, h: b.h * ih * sr.s }; }
      paint() { const x = this.asc.getContext("2d"); x.fillStyle = T.void; x.fillRect(0, 0, this.W, this.H); for (let y = 0; y < this.rows; y++) for (let q = 0; q < this.cols; q++) this.cell(x, q, y, false); }
      cell(x, q, y, clr) {
        const i = y * this.cols + q, c = this.ch8[i], cw = this.cw, ch = this.ch;
        if (clr) { x.fillStyle = T.void; x.fillRect(q * cw, y * ch, cw, ch); }
        if (!c) return;
        x.drawImage(this.at, c * cw, (this.hl[i] ? 1 : c >= 8 ? 2 : 0) * ch, cw, ch, q * cw, y * ch, cw, ch);
      }
      flick() { const x = this.asc.getContext("2d"), n = this.L.length, k = Math.round(n * 0.035), lv = RAMP.length - 1; for (let j = 0; j < k; j++) { const i = (Math.random() * n) | 0; this.ch8[i] = clamp(Math.round(this.L[i] * lv) + ((Math.random() * 3) | 0) - 1, 0, lv); this.cell(x, i % this.cols, (i / this.cols) | 0, true); } }
      splitAt(now) {
        const o = this.o;
        if (o.reveal === "loop") { if (RM) return o.rmSplit; const cyc = o.sweep * 2 + o.hold * 2, t = (now - this.t0) % cyc; if (t < o.sweep) return ease(t / o.sweep); if (t < o.sweep + o.hold) return 1; if (t < o.sweep * 2 + o.hold) return 1 - ease((t - o.sweep - o.hold) / o.sweep); return 0; }
        if (o.reveal === "band") return RM ? 0.62 : ((now - this.t0) % o.sweep) / o.sweep;
        return this.split;
      }
      tick(now) {
        if (!this.ready) return; const o = this.o;
        if (o.pan && !RM) { this.pt = 0.5 - 0.5 * Math.cos((now - this.t0) / o.panMs * 6.283); this.sr = this.src(this.pt); if (now - this.ll > 140) { this.ll = now; this.lum(); this.paint(); } }
        if (o.flicker && !RM && now - this.lf > 100) { this.lf = now; this.flick(); }
        this.draw(now);
      }
      layer(w, q, y, ww, hh) {
        if (ww <= 0 || hh <= 0) return; const x = this.g; x.save(); x.beginPath(); x.rect(q, y, ww, hh); x.clip();
        if (w === "asc") x.drawImage(this.asc, 0, 0); else if (this.o.pan) x.drawImage(this.img, this.sr.sx, this.sr.sy, this.sr.sw, this.sr.sh, 0, 0, this.W, this.H); else x.drawImage(this.photo, 0, 0);
        x.restore();
      }
      draw(now) {
        if (!this.ready || !this.W) return;
        const x = this.g, W = this.W, H = this.H, o = this.o, d = DPR, X = o.axis === "x";
        const split = clamp(this.splitAt(now), 0, 1), sp = (X ? W : H) * split;
        x.fillStyle = T.void; x.fillRect(0, 0, W, H);
        const A = o.first === "ascii" ? "asc" : "pho", B = A === "asc" ? "pho" : "asc";
        if (o.reveal === "band") { this.layer("pho", 0, 0, W, H); const b0 = Math.max(0, sp - (X ? W : H) * o.band); if (X) this.layer("asc", b0, 0, sp - b0, H); else this.layer("asc", 0, b0, W, sp - b0); }
        else if (X) { this.layer(A, 0, 0, sp, H); this.layer(B, sp, 0, W - sp, H); }
        else { this.layer(A, 0, 0, W, sp); this.layer(B, 0, sp, W, H - sp); }
        if (o.line && split > 0.001 && split < 0.999) { x.save(); x.fillStyle = T.sig; x.shadowColor = T.sig; x.shadowBlur = 16 * d; if (X) x.fillRect(sp - d, 0, 2 * d, H); else x.fillRect(0, sp - d, W, 2 * d); x.restore(); }
        if (o.boxes.length && o.boxSide !== "none") {
          x.save(); x.beginPath();
          if (o.boxSide === "first") { if (X) x.rect(0, 0, sp, H); else x.rect(0, 0, W, sp); }
          else if (o.boxSide === "second") { if (X) x.rect(sp, 0, W - sp, H); else x.rect(0, sp, W, H - sp); }
          else x.rect(0, 0, W, H);
          x.clip(); x.lineWidth = 1.5 * d; x.font = MONO(11 * d); x.textBaseline = "middle";
          o.boxes.forEach((b) => {
            const r = this.box(b); if (r.x + r.w < 0 || r.x > W || r.y + r.h < 0 || r.y > H) return;
            x.strokeStyle = b.flag ? T.paper : T.sig; corners(x, r, d, b.flag);
            if (b.ret) {
              const cx = r.x + r.w / 2, cy = r.y + r.h / 2, t = RM ? 1 : clamp(((now - this.t0) % 3200) / 900, 0, 1), off = (1 - easeOut(t)) * 26 * d + Math.max(r.w, r.h) * 0.58;
              x.strokeStyle = T.sig;
              [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, c]) => { const px = cx + a * off, py = cy + c * off; x.beginPath(); x.moveTo(px - 5 * d, py); x.lineTo(px + 5 * d, py); x.moveTo(px, py - 5 * d); x.lineTo(px, py + 5 * d); x.stroke(); });
            }
            if (b.label && r.w > 16 * d) { const ly = r.y - 21 * d < 2 * d ? r.y + 3 * d : r.y - 21 * d; chipText(x, b.label.toUpperCase(), r.x, ly, d, W, b.flag ? T.paper : T.sig); }
          });
          x.restore();
        }
        if (o.hud) {
          x.save(); hudTop(x, W, o.hudTop.toUpperCase(), now); x.font = MONO(11 * d); x.textBaseline = "middle"; x.globalAlpha = 0.75; x.fillStyle = T.paper;
          if (o.hudBL) x.fillText(o.hudBL.toUpperCase(), 16 * d, H - 20 * d);
          const tm = new Date(), clk = [tm.getHours(), tm.getMinutes(), tm.getSeconds()].map(pad2).join(":");
          x.fillText(clk, W - 16 * d - x.measureText(clk).width, H - 20 * d); x.restore();
        }
      }
    }
    fontsReady.then(() => { atlasCache.clear(); views.forEach((v) => v.resize(true)); });

    /* ---------- the cover, the leaf and the harvest ---------- */
    const hold = (k) => $(`[data-ascii="${k}"]`, view);
    const heroV = new AsciiView(hold("hero"));
    heroV.use("hero", { cell: 8, boxes: DATA.heroBoxes, hudTop: "Demo feed · cam 03", hudBL: "Block C · row 3", sweep: 5600, hold: 2600, focus: [0.5, 0.48] });
    onScreen(hold("hero"), viewComp(heroV));
    const leafV = new AsciiView(hold("leaf"));
    leafV.use("leaf", { cell: 7, boxes: DATA.leafBoxes, hudTop: "Scan · guava leaf", hudBL: "Photo · demo", focus: [0.5, 0.5] });
    onScreen(hold("leaf"), viewComp(leafV));
    const guavaV = new AsciiView(hold("guava"));
    guavaV.use("guava", { cell: 7, hudTop: "Harvest · block F", hudBL: "Guava · demo", sweep: 6000 });
    onScreen(hold("guava"), viewComp(guavaV));

    /* ---------- how it works: compare the photo with agc162's view ---------- */
    (function () {
      const el = hold("compare"), range = $("input", el), knob = $(".ag-knob", el), v = new AsciiView(el);
      v.use("calypso", { cell: 6, reveal: "manual", boxSide: "second", boxes: DATA.calBoxes, hud: false, split: 0.5, focus: [0.5, 0.62] });
      let drag = false, hinted = false;
      const setS = (s) => { v.split = clamp(s, 0, 1); range.value = Math.round(v.split * 100); range.setAttribute("aria-valuetext", Math.round(v.split * 100) + "% photo"); knob.style.left = v.split * 100 + "%"; v.draw(performance.now()); };
      const at = (e) => { const r = el.getBoundingClientRect(); return (e.clientX - r.left) / r.width; };
      el.addEventListener("pointerdown", (e) => { drag = true; try { el.setPointerCapture(e.pointerId); } catch (_) { /* older browsers */ } setS(at(e)); });
      el.addEventListener("pointermove", (e) => { if (drag) setS(at(e)); });
      ["pointerup", "pointercancel"].forEach((t) => el.addEventListener(t, () => { drag = false; }));
      range.addEventListener("input", () => setS(range.value / 100));
      setS(0.5);
      onScreen(el, { start() { play(v); if (!hinted && !RM) { hinted = true; const t0 = performance.now(); const st = (now) => { const p = clamp((now - t0) / 1600, 0, 1); if (!drag) setS(0.5 + Math.sin(p * Math.PI) * 0.2); if (p < 1) requestAnimationFrame(st); }; requestAnimationFrame(st); } }, stop() { pause(v); } });
    })();

    /* ---------- capture: photo, video, live ---------- */
    const selectTab = (tabs, el) => tabs.forEach((x) => { const on = x === el; x.setAttribute("aria-selected", String(on)); x.tabIndex = on ? 0 : -1; });
    (function () {
      const el = hold("mode"), v = new AsciiView(el), sec = el.closest(".screen"), tabs = $$("[data-mode]", sec), panel = $("#agc-mode-panel", sec);
      const txt = $("[data-mode-text]", sec), strip = $("[data-mode-strip]", sec), cap = $("[data-mode-cap]", sec);
      const M = {
        photo: ["leaf", { cell: 7, boxes: DATA.leafBoxes, hudTop: "Photo · guava leaf", hudBL: "Phone · demo", focus: [0.5, 0.5] }, "A phone photo of a leaf, a flower panicle or a fruit. agc162 answers in the field, tree by tree.", "Phone / leaf · panicle · fruit / offline first", "Photo mode: a guava leaf scanned by phone."],
        video: ["calypso", { cell: 7, pan: true, boxes: DATA.calVideo, hudTop: "Video · row 3", hudBL: "Walk · demo", sweep: 3000, hold: 900 }, "Walk a row with a phone or fly a drone. Every tree in frame is found, counted and filed to its block.", "Phone · drone / row by row / GPS-tagged", "Video mode: a mango row panning past, each fruit counted."],
        live: ["calypso_crop", { cell: 7, reveal: "band", axis: "y", boxSide: "all", boxes: DATA.cropBoxes, hudTop: "Live · cam 07", hudBL: "Canopy · demo", sweep: 3800, band: 0.22, flicker: false }, "Fixed cameras on the canopy or the pack line watch quality and pests around the clock.", "Fixed cameras / canopy · pack line / alerts", "Live mode: a fixed camera watching fruit on the tree."]
      };
      const setMode = (m, tab) => { const c = M[m]; v.use(c[0], c[1]); txt.textContent = c[2]; strip.textContent = c[3]; cap.textContent = c[4]; selectTab(tabs, tab); panel.setAttribute("aria-labelledby", tab.id); };
      tabs.forEach((t) => t.addEventListener("click", () => setMode(t.dataset.mode, t)));
      setMode("photo", tabs[0]);
      onScreen(el, viewComp(v));
    })();

    /* ---------- field guide: a mango to turn, six problems to find ---------- */
    // The lesion map is data, not colour: red marks darkening, green marks the white of mildew (1024 × 512, additive).
    function paintLesions() {
      const W = 1024, H = 512, R = new Float32Array(W * H), G = new Float32Array(W * H), rnd = mulberry(162);
      const blob = (A, x, y, r, a) => {
        const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(W - 1, Math.ceil(x + r)), y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(H - 1, Math.ceil(y + r));
        for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) { const q = Math.hypot(i + 0.5 - x, j + 0.5 - y) / r; if (q < 1) A[j * W + i] += q < 0.7 ? a * (1 - 0.2 * q / 0.7) : a * 0.8 * (1 - (q - 0.7) / 0.3); }
      };
      for (let x = 0; x < W; x += 4) {
        const h = H * (0.085 + 0.025 * Math.sin(x / 37) + 0.02 * rnd());
        for (let j = 0; j < Math.min(H, Math.ceil(h)); j++) { const t = (j + 0.5) / h; if (t >= 1) break; const a = t < 0.6 ? 1 - 0.2 * t / 0.6 : 0.8 * (1 - (t - 0.6) / 0.4); for (let i = x; i < x + 4; i++) R[j * W + i] += a; }
      }
      const ax = 0.3 * W, ay = 0.6 * H;
      [[0, 0, 22], [26, -10, 15], [-20, 14, 17], [12, 24, 12], [-30, -16, 10], [34, 16, 9]].forEach(([dx, dy, r]) => blob(R, ax + dx, ay + dy, r, 0.95));
      // tear-stain streaks: four strokes running down from the lesions
      for (let k = 0; k < 4; k++) {
        const lw = 3 + rnd() * 3, pts = [[ax - 20 + k * 14, ay + 18]];
        let x = pts[0][0], y = pts[0][1];
        for (let s = 0; s < 8; s++) { x += (rnd() - 0.5) * 6; y += 10 + rnd() * 6; pts.push([x, y]); }
        const minx = Math.max(0, Math.floor(Math.min(...pts.map((p) => p[0])) - lw)), maxx = Math.min(W - 1, Math.ceil(Math.max(...pts.map((p) => p[0])) + lw));
        const miny = Math.max(0, Math.floor(Math.min(...pts.map((p) => p[1])) - lw)), maxy = Math.min(H - 1, Math.ceil(Math.max(...pts.map((p) => p[1])) + lw));
        for (let j = miny; j <= maxy; j++) for (let i = minx; i <= maxx; i++) {
          let best = Infinity;
          for (let s = 1; s < pts.length; s++) { const [x1, y1] = pts[s - 1], [x2, y2] = pts[s], vx = x2 - x1, vy = y2 - y1, t = clamp(((i + 0.5 - x1) * vx + (j + 0.5 - y1) * vy) / (vx * vx + vy * vy), 0, 1); best = Math.min(best, Math.hypot(i + 0.5 - x1 - vx * t, j + 0.5 - y1 - vy * t)); }
          if (best <= lw / 2) R[j * W + i] += 0.7;
        }
      }
      const bx = 0.58 * W, by = 0.46 * H; for (let k = 0; k < 16; k++) { const a = rnd() * 6.283, dd = rnd() * 42; blob(R, bx + Math.cos(a) * dd, by + Math.sin(a) * dd * 0.8, 3 + rnd() * 4.5, 1); }
      const sx = 0.86 * W, sy = 0.52 * H; for (let k = 0; k < 26; k++) { const a = rnd() * 6.283, dd = rnd() * 60; blob(R, sx + Math.cos(a) * dd, sy + Math.sin(a) * dd * 0.7, 18 + rnd() * 26, 0.16); }
      const px = 0.12 * W, py = 0.26 * H; for (let k = 0; k < 60; k++) { const a = rnd() * 6.283, dd = Math.sqrt(rnd()) * 50; blob(G, px + Math.cos(a) * dd, py + Math.sin(a) * dd * 0.8, 4 + rnd() * 9, 0.55); }
      const fx = 0.45 * W, fy = 0.78 * H; [[0, 0], [18, 6], [-14, 10], [6, -14]].forEach(([dx, dy]) => { blob(R, fx + dx, fy + dy, 9, 0.25); blob(R, fx + dx, fy + dy, 3.2, 1); });
      const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"), im = x.createImageData(W, H), o8 = im.data;
      for (let i = 0; i < W * H; i++) { o8[i * 4] = Math.min(255, R[i] * 255); o8[i * 4 + 1] = Math.min(255, G[i] * 255); o8[i * 4 + 3] = 255; }
      x.putImageData(im, 0, 0); return c;
    }
    function initMango() {
      const stage = $("[data-mango]", view), sec = stage.closest(".screen"), cv = $("canvas.gl", stage), hotsEl = $(".ag-hots", stage), chipsEl = $("[data-chips]", sec), panel = $("[data-panel]", sec);
      let sel = -1; const api = { select() {} };
      const chips = DIS.map((d, i) => { const b = document.createElement("button"); b.type = "button"; b.className = "ag-chip"; b.setAttribute("aria-pressed", "false"); b.innerHTML = '<i aria-hidden="true"></i>' + d.short; b.addEventListener("click", () => select(sel === i ? -1 : i)); chipsEl.appendChild(b); return b; });
      function renderPanel() {
        if (sel < 0) { panel.innerHTML = '<p class="lead">Six problems agc162 is built to flag on mango. Drag to turn the fruit, then tap a signal or a name.</p><p class="note">Treatments are general guidance. Use only products registered for mango where you farm, at label rates.</p>'; return; }
        const d = DIS[sel];
        panel.innerHTML = '<div class="ag-pn-h"><h3 class="h3">' + d.short + '</h3><p class="ag-latin">' + d.latin + '</p></div><dl class="ag-pn"><div><dt>Looks like</dt><dd>' + d.looks + "</dd></div><div><dt>When</dt><dd>" + d.when + "</dd></div><div><dt>Do</dt><dd>" + d.todo + '</dd></div><div class="w"><dt>agc162 watches</dt><dd>' + d.watch + '</dd></div></dl><p class="src">' + d.src + " · check your local label</p>";
      }
      function select(i) { sel = i; chips.forEach((c, k) => c.setAttribute("aria-pressed", String(k === i))); renderPanel(); api.select(i); }
      renderPanel();
      const fail = () => { $(".ag-fallback", stage).hidden = false; $(".ag-hint", stage).hidden = true; return { start() {}, stop() {} }; };
      const THREE = g.THREE;
      if (!THREE) return fail();
      let R; try { R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: "low-power" }); } catch (e) { return fail(); }
      R.setPixelRatio(DPR); R.setClearColor(new THREE.Color(T.void), 1);
      const V3 = THREE.Vector3, BEAK = new V3(0.78, -0.62, 0).normalize();
      // A mango from a sphere: wider at the shoulders, a curved back, the beak low on one side.
      const shape = (p) => { const t = p.y, wx = 0.74 * (1 + 0.1 * t - 0.12 * t * t), wz = 0.6 * (1 + 0.05 * t - 0.14 * t * t); let X = p.x * wx + 0.17 * t * t - 0.057, Y = p.y; const Z = p.z * wz; const b = Math.pow(Math.max(0, p.dot(BEAK)), 14) * 0.09; X += BEAK.x * b; Y += BEAK.y * b; if (t > 0.92) { const q = (t - 0.92) / 0.08; Y -= 0.045 * q * q; } return new V3(X, Y, Z); };
      const normalAt = (p) => { const e = 1e-3, up = Math.abs(p.y) < 0.99 ? new V3(0, 1, 0) : new V3(1, 0, 0), t1 = new V3().crossVectors(p, up).normalize(), t2 = new V3().crossVectors(p, t1).normalize(); const a = shape(p.clone().addScaledVector(t1, e).normalize()).sub(shape(p.clone().addScaledVector(t1, -e).normalize())); const b = shape(p.clone().addScaledVector(t2, e).normalize()).sub(shape(p.clone().addScaledVector(t2, -e).normalize())); const n = new V3().crossVectors(a, b).normalize(); if (n.dot(shape(p)) < 0) n.negate(); return n; };
      const dirUV = (u, v) => { const ph = u * 6.2832, th = v * Math.PI; return new V3(-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th)); };
      const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(0, 0.15, 6.4); cam.lookAt(0, -0.06, 0);
      const fruit = new THREE.Group(); scene.add(fruit);
      const geo = new THREE.SphereGeometry(1, 128, 96), P = geo.attributes.position, N = P.count, dirs = new Float32Array(N * 3), nors = new Float32Array(N * 3), tv = new V3();
      for (let i = 0; i < N; i++) { tv.fromBufferAttribute(P, i).normalize(); dirs.set([tv.x, tv.y, tv.z], i * 3); const s = shape(tv), nn = normalAt(tv); P.setXYZ(i, s.x, s.y, s.z); nors.set([nn.x, nn.y, nn.z], i * 3); }
      geo.setAttribute("aDir", new THREE.BufferAttribute(dirs, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(nors, 3)); P.needsUpdate = true; geo.computeBoundingSphere();
      // Stippled skin: dot size follows the light, lesions darken it, mildew whitens it; the chosen problem glows in the wing colour.
      const U = { uMap: { value: new THREE.CanvasTexture(paintLesions()) }, uLight: { value: new V3(-0.55, 0.65, 0.55).normalize() }, uCell: { value: 5 * DPR }, uSig: { value: new THREE.Color(T.sig) }, uDot: { value: new THREE.Color(T.paper) }, uBody: { value: new THREE.Color(T.graphite) }, uSel: { value: new V3(0, 0, 1) }, uSelOn: { value: 0 }, uSelR: { value: 0.34 } };
      const mat = new THREE.ShaderMaterial({ uniforms: U,
        vertexShader: "attribute vec3 aDir;varying vec3 vN;varying vec3 vD;varying vec2 vUv;varying vec3 vV;void main(){vUv=uv;vD=aDir;vec4 mv=modelViewMatrix*vec4(position,1.0);vV=-mv.xyz;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*mv;}",
        fragmentShader: "uniform sampler2D uMap;uniform vec3 uLight;uniform float uCell;uniform vec3 uSig;uniform vec3 uDot;uniform vec3 uBody;uniform vec3 uSel;uniform float uSelOn;uniform float uSelR;varying vec3 vN;varying vec3 vD;varying vec2 vUv;varying vec3 vV;void main(){vec3 n=normalize(vN);vec3 v=normalize(vV);float df=max(dot(n,normalize(uLight)),0.0);float rim=pow(1.0-max(dot(n,v),0.0),2.4);vec4 m=texture2D(uMap,vUv);float lum=0.1+0.9*df;lum*=1.0-0.88*m.r;lum=mix(lum,1.0,m.g*0.75);vec2 f=fract(gl_FragCoord.xy/uCell)-0.5;float r=sqrt(clamp(lum,0.0,1.0))*0.57;float dm=1.0-smoothstep(r-0.09,r+0.09,length(f));vec3 dc=mix(uDot*0.9,uDot,m.g);float a=acos(clamp(dot(normalize(vD),uSel),-1.0,1.0));float s=uSelOn*(1.0-smoothstep(uSelR*0.55,uSelR,a));dc=mix(dc,uSig,s*0.9);vec3 body=uBody*(0.68+0.32*df);vec3 col=mix(body,dc,dm);col+=uSig*rim*0.42;gl_FragColor=vec4(col,1.0);}" });
      fruit.add(new THREE.Mesh(geo, mat));
      const top = shape(new V3(0, 1, 0)), stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.28, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(T.iron) })); stem.position.set(top.x, top.y + 0.11, 0); stem.rotation.z = -0.25; fruit.add(stem);
      [[0.72, 0.55], [0.98, 0.22]].forEach(([r, op]) => { const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.014, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(T.sig), transparent: true, opacity: op, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = -1.22; scene.add(ring); });
      const HS = DIS.map((d, i) => {
        const dir = dirUV(d.u, d.v), nrm = normalAt(dir), anchor = shape(dir).addScaledVector(nrm, 0.03), b = document.createElement("button");
        b.type = "button"; b.className = "ag-hs"; b.setAttribute("aria-label", d.short + ": show details"); b.innerHTML = '<i aria-hidden="true"></i><span aria-hidden="true">' + d.short + "</span>";
        b.addEventListener("click", (e) => { e.stopPropagation(); select(sel === i ? -1 : i); }); b.addEventListener("pointerdown", (e) => e.stopPropagation());
        hotsEl.appendChild(b); return { dir, nrm, anchor, b, vis: null };
      });
      let yaw = -0.35, pitch = 0.06, vy = 0, vp = 0, drag = false, lx = 0, ly = 0, tgt = null, idle = 0, on = false, w = 1, h = 1;
      const E = new THREE.Euler(), tA = new V3(), tN = new V3(), tC = new V3();
      cv.tabIndex = 0;
      cv.addEventListener("pointerdown", (e) => { drag = true; lx = e.clientX; ly = e.clientY; vy = vp = 0; tgt = null; try { cv.setPointerCapture(e.pointerId); } catch (_) { /* older browsers */ } stage.classList.add("drag"); });
      cv.addEventListener("pointermove", (e) => { if (!drag) return; const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; vy = dx * 0.009; vp = dy * 0.009; yaw += vy; pitch = clamp(pitch + vp, -0.85, 0.85); idle = performance.now(); if (!on) tick(performance.now()); });
      const end = () => { drag = false; stage.classList.remove("drag"); idle = performance.now(); }; cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
      cv.addEventListener("keydown", (e) => { const k = e.key; if (k === "ArrowLeft") yaw -= 0.2; else if (k === "ArrowRight") yaw += 0.2; else if (k === "ArrowUp") pitch = clamp(pitch - 0.15, -0.85, 0.85); else if (k === "ArrowDown") pitch = clamp(pitch + 0.15, -0.85, 0.85); else return; e.preventDefault(); tgt = null; idle = performance.now(); if (!on) tick(performance.now()); });
      function size() { w = stage.clientWidth || 1; h = stage.clientHeight || 1; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); U.uCell.value = 5 * R.getPixelRatio(); tick(performance.now()); }
      function tick(now) {
        if (tgt) { const dy = Math.atan2(Math.sin(tgt.y - yaw), Math.cos(tgt.y - yaw)), k = RM ? 1 : 0.12; yaw += dy * k; pitch += (tgt.p - pitch) * k; if (Math.abs(dy) < 0.002 && Math.abs(tgt.p - pitch) < 0.002) tgt = null; }
        else if (!drag) { if (Math.abs(vy) > 1e-4 || Math.abs(vp) > 1e-4) { yaw += vy; pitch = clamp(pitch + vp, -0.85, 0.85); vy *= 0.92; vp *= 0.92; } else if (!RM && sel < 0 && now - idle > 2500) yaw += 0.0028; }
        fruit.quaternion.setFromEuler(E.set(pitch, yaw, 0, "XYZ")); fruit.updateMatrixWorld();
        HS.forEach((q, i) => {
          tA.copy(q.anchor).applyMatrix4(fruit.matrixWorld);
          const face = tN.copy(q.nrm).applyQuaternion(fruit.quaternion).dot(tC.copy(cam.position).sub(tA).normalize());
          tA.project(cam); q.b.style.transform = "translate(" + ((tA.x * 0.5 + 0.5) * w).toFixed(1) + "px," + ((-tA.y * 0.5 + 0.5) * h).toFixed(1) + "px)";
          q.b.classList.toggle("l", tA.x > 0.1); // labels on the right half read leftwards, so they stay inside the card
          const vis = face > 0.12; if (vis !== q.vis) { q.vis = vis; q.b.classList.toggle("off", !vis); q.b.tabIndex = vis ? 0 : -1; }
          q.b.classList.toggle("sel", i === sel);
        });
        U.uSelOn.value += ((sel >= 0 ? 1 : 0) - U.uSelOn.value) * (RM ? 1 : 0.1);
        R.render(scene, cam);
      }
      api.select = (i) => {
        if (i >= 0) { const n = HS[i].nrm; tgt = { y: Math.atan2(-n.x, n.z), p: clamp(Math.atan2(n.y, Math.hypot(n.x, n.z)), -0.85, 0.85) }; U.uSel.value.copy(HS[i].dir); vy = vp = 0; }
        if (!on) { const t0 = performance.now(); const step = (now) => { tick(now); if ((tgt || Math.abs(U.uSelOn.value - (sel >= 0 ? 1 : 0)) > 0.01) && now - t0 < 2500 && !on) requestAnimationFrame(step); }; requestAnimationFrame(step); }
      };
      if (g.ResizeObserver) new ResizeObserver(size).observe(stage); size();
      const v = { always: true, tick };
      return { start() { on = true; play(v); }, stop() { on = false; pause(v); } };
    }
    const mango = initMango();
    onScreen($("[data-mango]", view), mango);

    /* ---------- app: the orchard map ---------- */
    (function () {
      const ph = $('[data-app="map"]', view), svg = $("svg.ap-map", ph), body = $(".ap-body", ph), tabs = $$("[data-tab]", ph), NS = "http://www.w3.org/2000/svg";
      let cur = "C", tab = "overview";
      BLOCKS.forEach((b) => {
        const p = document.createElementNS(NS, "polygon"); p.setAttribute("points", b.pts); p.setAttribute("class", "ap-blk " + b.st); p.setAttribute("fill", b.st === "act" ? "url(#agc-dots)" : "url(#agc-hatch)"); p.setAttribute("tabindex", "0"); p.setAttribute("role", "button"); p.setAttribute("aria-label", "Block " + b.id + ", " + b.cv + ", " + STL[b.st]); p.dataset.id = b.id;
        p.addEventListener("click", () => pick(b.id)); p.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(b.id); } }); svg.appendChild(p);
        const t = document.createElementNS(NS, "text"); t.setAttribute("x", b.cx); t.setAttribute("y", b.cy); t.setAttribute("text-anchor", "middle"); t.textContent = b.id; svg.appendChild(t);
        const s = document.createElementNS(NS, "text"); s.setAttribute("x", b.cx); s.setAttribute("y", b.cy + 15); s.setAttribute("text-anchor", "middle"); s.setAttribute("class", "s"); s.textContent = STL[b.st].toUpperCase(); svg.appendChild(s);
      });
      [[60, 236, 1], [138, 268, 1], [52, 128, 0], [300, 30, 0], [290, 230, 0]].forEach(([x, y, hot]) => { const c = document.createElementNS(NS, "circle"); c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", 4.5); c.setAttribute("class", "ap-trap" + (hot ? " hot" : "")); svg.appendChild(c); });
      function render() {
        const b = BLOCKS.find((x) => x.id === cur);
        let h = '<div class="ap-h"><div><b>Block ' + b.id + " · " + b.cv + '</b><span class="ap-mono">' + b.ha.toFixed(1) + " ha · " + b.trees + ' trees</span></div><span class="ap-st ' + b.st + '">' + STL[b.st] + "</span></div>";
        if (tab === "overview") h += '<div class="ap-kv"><div><span class="ap-mono">Stage</span><b>' + b.stage + '</b></div><div><span class="ap-mono">Wet, 24 h</span><b>' + b.wet + ' h</b></div><div><span class="ap-mono">Confidence</span><b>' + b.conf + '</b></div></div><p class="ap-issue">' + b.issue + '</p><div class="ap-next"><span class="ap-mono">Next</span><p>' + b.next + "</p></div>" + (b.st === "act" ? '<button class="ap-btn primary" type="button" data-openplan>Open plan</button>' : "");
        else if (tab === "scans") h += '<ul class="ap-list">' + b.scans.map((x) => "<li>" + x + "</li>").join("") + "</ul>";
        else if (tab === "treat") h += '<p class="ap-issue">' + b.treat + '</p><p class="ap-mono ap-dim">Check the label: product, rate, withholding period</p>';
        else h += '<ul class="ap-list">' + b.sched.map((x, i) => '<li><input type="checkbox" id="agc-sc-' + b.id + i + '"><label for="agc-sc-' + b.id + i + '">' + x + "</label></li>").join("") + "</ul>";
        body.innerHTML = h;
        const op = $("[data-openplan]", body); if (op) op.addEventListener("click", () => jump("agc-plan"));
      }
      function pick(id) { cur = id; $$(".ap-blk", svg).forEach((p) => p.classList.toggle("sel", p.dataset.id === id)); render(); }
      tabs.forEach((t) => t.addEventListener("click", () => { tab = t.dataset.tab; selectTab(tabs, t); body.setAttribute("aria-labelledby", t.id); render(); }));
      pick("C");
    })();

    /* ---------- app: scan a leaf or a tree ---------- */
    const press = (btns, el) => btns.forEach((b) => b.setAttribute("aria-pressed", String(b === el)));
    (function () {
      const ph = $('[data-app="scan"]', view), v = new AsciiView($(".ap-vf", ph)), res = $(".ap-result", ph), hint = $(".ap-hint", ph), btns = $$("[data-target]", ph);
      let tgt = "leaf", busy = false;
      const O = { leaf: ["leaf", { cell: 5, reveal: "manual", boxSide: "none", boxes: DATA.leafBoxes, hud: false, split: 1, flicker: false, focus: [0.45, 0.5] }], fruit: ["calypso_crop", { cell: 5, reveal: "manual", boxSide: "none", boxes: DATA.cropBoxes, hud: false, split: 1, flicker: false }] };
      const hide = () => { res.classList.remove("on"); res.setAttribute("aria-hidden", "true"); res.inert = true; };
      const load = (t) => { tgt = t; hide(); v.use(O[t][0], O[t][1]); hint.textContent = "Tap to scan"; };
      function result() {
        let h;
        if (tgt === "leaf") h = '<div class="ap-rh"><b>Leaf reddening with spots</b><span class="ap-mono">Guava · 3 leaves · demo</span></div><p class="ap-mono ap-dim">Could be</p><ul class="ap-prob"><li><span>Phosphorus deficiency</span><i style="--p:.56"></i><em>56%</em></li><li><span>Cold stress</span><i style="--p:.24"></i><em>24%</em></li><li><span>Spider mites</span><i style="--p:.12"></i><em>12%</em></li><li><span>Fungal leaf spot</span><i style="--p:.08"></i><em>8%</em></li></ul><p class="ap-mono ap-dim">Check before you act</p><ul class="ap-checks"><li>Look under the leaves for mites</li><li>Note any recent cold nights</li><li>Send a leaf sample for tissue analysis</li></ul>';
        else { const bx = DATA.cropBoxes, c = { S: 0, M: 0, L: 0, XL: 0 }; bx.forEach((b) => c[b.c]++); h = '<div class="ap-rh"><b>' + bx.length + ' fruit found</b><span class="ap-mono">Calypso · tree C-12 · demo</span></div><div class="ap-sizes">' + ["S", "M", "L", "XL"].map((k) => '<div><span class="ap-mono ap-dim">' + k + "</span><b>" + c[k] + "</b></div>").join("") + '</div><p class="ap-mono ap-dim">Marked to inspect</p><ul class="ap-checks"><li>' + bx.filter((b) => b.flag).length + " fruit for a closer look</li><li>Added to the block C fruit count</li></ul>"; }
        res.innerHTML = h + '<div class="ap-ra"><button class="ap-btn primary" type="button" data-add>Add to plan</button><button class="ap-btn" type="button" data-retake>Retake</button></div>';
        res.classList.add("on"); res.removeAttribute("aria-hidden"); res.inert = false;
        $("[data-retake]", res).addEventListener("click", () => load(tgt));
        $("[data-add]", res).addEventListener("click", (e) => { e.currentTarget.textContent = "Added to plan"; toast("Added to the plan for block C. Demo."); });
      }
      function scan() {
        if (busy || !v.ready) return; busy = true; hint.textContent = "Scanning"; hide(); v.o.first = "ascii"; v.o.boxSide = "first";
        const t0 = performance.now(), dur = RM ? 1 : 1500;
        const st = (now) => { const p = clamp((now - t0) / dur, 0, 1); v.split = ease(p); if (!RM && now - v.lf > 90) { v.lf = now; v.flick(); } v.draw(now); if (p < 1) requestAnimationFrame(st); else setTimeout(() => { v.o.first = "photo"; v.o.boxSide = "all"; v.split = 1; v.draw(performance.now()); hint.textContent = "Done"; result(); busy = false; }, RM ? 0 : 320); };
        requestAnimationFrame(st);
      }
      $(".ap-shutter", ph).addEventListener("click", scan);
      btns.forEach((b) => b.addEventListener("click", () => { press(btns, b); load(b.dataset.target); }));
      load("leaf");
    })();

    /* ---------- app: the spray plan for block C ---------- */
    (function () {
      const ph = $('[data-app="plan"]', view), daysEl = $(".ap-days", ph), card = $(".ap-plan", ph), btns = $$("[data-plan]", ph);
      let mode = "agc", added = false;
      const D = [["Mon", 0, 27], ["Tue", 0, 28], ["Wed", 1, 27], ["Thu", 2, 26], ["Fri", 2, 26], ["Sat", 0, 28], ["Sun", 1, 27]], WN = ["Dry", "Showers", "Rain"], WH = [4, 12, 20];
      const ICO = ['<svg class="wx" viewBox="0 0 22 16" aria-hidden="true"><circle cx="11" cy="8" r="4"/></svg>', '<svg class="wx" viewBox="0 0 22 16" aria-hidden="true"><path d="M8 3l-2 5M14 3l-2 5M11 9l-2 5"/></svg>', '<svg class="wx" viewBox="0 0 22 16" aria-hidden="true"><path d="M5 2l-2 5M10 2l-2 5M15 2l-2 5M20 2l-2 5M7 9l-2 5M12 9l-2 5M17 9l-2 5"/></svg>'];
      // Demo risk: a logistic on wet hours (half at 14 h) times a bell on temperature (best near 27.5 °C).
      const risk = (hh, t) => (1 / (1 + Math.exp(-0.38 * (hh - 14)))) * Math.exp(-Math.pow((t - 27.5) / 6, 2));
      function render() {
        const r = D.map((x) => risk(WH[x[1]], x[2])), lv = r.map((x) => (x >= 0.6 ? 2 : x >= 0.3 ? 1 : 0)), agc = D.map(() => false), cal = D.map((_, i) => i === 0);
        lv.forEach((l, i) => { if (l === 2 && (i === 0 || lv[i - 1] !== 2)) agc[Math.max(0, i - 1)] = true; });
        const sp = mode === "agc" ? agc : cal, hi = lv.indexOf(2);
        daysEl.innerHTML = D.map((x, i) => '<button type="button" class="ap-day" data-i="' + i + '" aria-label="' + x[0] + ": " + WN[x[1]] + ", " + WH[x[1]] + " hours wet, " + ["low", "moderate", "high"][lv[i]] + " risk" + (sp[i] ? ", spray" : "") + '. Tap to change the weather.">' + ICO[x[1]] + '<span class="col"><i class="wet" style="height:' + (WH[x[1]] / 24 * 100).toFixed(1) + '%"></i><i class="rk ' + ["", "w", "h"][lv[i]] + '" style="height:' + Math.max(6, r[i] * 100).toFixed(1) + '%"></i></span><i class="sp' + (sp[i] ? " on" : "") + '"></i><b>' + x[0] + "</b></button>").join("");
        let h;
        if (mode === "agc") {
          if (hi < 0) h = "<b>No spray needed this week</b><p>Risk stays low. agc162 keeps scanning the panicles.</p>";
          else { const s = Math.max(0, hi - 1); h = '<span class="ap-mono ap-dim">Suggested window</span><b>Spray ' + D[s][0] + ", 06:00–10:00</b><p>Why: " + WH[D[hi][1]] + " h of leaf wetness forecast " + D[hi][0] + " at " + D[hi][2] + " °C, during flowering.</p><p>Before you spray: check the label for product, rate and withholding period.</p><button class=\"ap-btn primary\" type=\"button\" data-addp>" + (added ? "Added to schedule" : "Add to schedule") + "</button>"; }
        } else h = '<span class="ap-mono ap-dim">Calendar plan</span><b>Spray every Monday</b><p>' + (hi < 0 ? "No high-risk day this week, and the calendar sprays anyway." : "The wet spell starts " + D[hi][0] + ", " + hi + " days after the spray.") + "</p><p>Tap a day to change its weather and compare.</p>";
        card.innerHTML = h;
        const a = $("[data-addp]", card); if (a) a.addEventListener("click", () => { added = !added; render(); if (added) toast("Added to the block C schedule. Demo."); });
      }
      daysEl.addEventListener("click", (e) => { const b = e.target.closest(".ap-day"); if (!b) return; const i = +b.dataset.i; D[i][1] = (D[i][1] + 1) % 3; added = false; render(); const n = $('[data-i="' + i + '"]', daysEl); if (n) n.focus(); });
      btns.forEach((b) => b.addEventListener("click", () => { mode = b.dataset.plan; press(btns, b); render(); }));
      render();
    })();

    /* ---------- packhouse: every fruit sized and graded as it crosses the line ---------- */
    class Pack {
      constructor(el) { this.el = el; this.cv = $("canvas", el); this.g = this.cv.getContext("2d"); this.fr = []; this.last = performance.now(); this.next = 0; this.lane = 0; this.tal = { 1: 0, 2: 0, 3: 0 }; this.rnd = mulberry(7); this.out = { 1: $('[data-t="1"]', el), 2: $('[data-t="2"]', el), 3: $('[data-t="3"]', el) }; if (g.ResizeObserver) new ResizeObserver(() => this.resize()).observe(el); this.resize(); }
      resize() { const r = this.el.getBoundingClientRect(); if (r.width < 2) return; this.W = Math.round(r.width * DPR); this.H = Math.round(r.height * DPR); this.cv.width = this.W; this.cv.height = this.H; this.cw = Math.round(7 * DPR); this.ch = Math.round(this.cw * 1.32); this.at = atlas(this.cw, this.ch); this.ly = this.H * 0.5; if (!this.fr.length) for (let k = 0; k < 6; k++) this.spawn(this.H * (k / 5.5) - this.H * 0.08); this.draw(performance.now()); }
      spawn(y) {
        const q = this.rnd, d = DPR, lane = this.lane++ % 2, rx = (34 + q() * 10) * d, p = q(), gr = p < 0.7 ? 1 : p < 0.92 ? 2 : 3, kind = gr === 1 ? "" : gr === 2 ? (q() < 0.5 ? "SAP BURN" : "BLEMISH") : "ROT", def = [];
        if (gr === 2) def.push({ u: (q() - 0.5) * 0.7, v: (q() - 0.3) * 0.7, r: 0.2, s: kind === "SAP BURN" });
        if (gr === 3) def.push({ u: (q() - 0.5) * 0.4, v: (q() - 0.5) * 0.5, r: 0.42 });
        this.fr.push({ x: this.W * (lane ? 0.67 : 0.33) + (q() - 0.5) * this.W * 0.05, y: y === undefined ? -rx * 1.6 : y, rx, ry: rx * (1.3 + q() * 0.1), gr, kind, wg: Math.round((300 + q() * 260) / 5) * 5, def, f: q() < 0.5 ? -1 : 1, done: y !== undefined && y > this.ly });
      }
      tick(now) {
        const dt = Math.min(60, now - this.last); this.last = now;
        if (!RM) {
          this.fr.forEach((f) => { f.y += 0.07 * DPR * dt; });
          if (now > this.next) { this.spawn(); this.next = now + 900 + this.rnd() * 500; }
          this.fr = this.fr.filter((f) => f.y < this.H + f.ry * 2);
          this.fr.forEach((f) => { if (!f.done && f.y > this.ly) { f.done = true; this.tal[f.gr]++; this.out[f.gr].textContent = this.tal[f.gr]; } });
        }
        this.draw(now);
      }
      fruit(f) {
        const x = this.g, cw = this.cw, ch = this.ch, lv = RAMP.length - 1, sc = f.y > this.ly;
        for (let cy = Math.floor((f.y - f.ry * 1.15) / ch); cy <= Math.ceil((f.y + f.ry * 1.15) / ch); cy++) for (let cx = Math.floor((f.x - f.rx * 1.25) / cw); cx <= Math.ceil((f.x + f.rx * 1.25) / cw); cx++) {
          const u0 = ((cx + 0.5) * cw - f.x) / f.rx, v = ((cy + 0.5) * ch - f.y) / f.ry, u = u0 * f.f, ub = u - 0.16 * v * v + 0.05;
          let ins = ub * ub + v * v; ins -= Math.max(0, 1 - Math.hypot(u - 0.72, v - 0.55) / 0.28) * 0.35; if (ins > 1) continue;
          const nz = Math.sqrt(Math.max(0, 1 - Math.min(1, ins))), lum = clamp(0.2 + 0.8 * Math.max(0, -0.45 * u0 - 0.55 * v + 0.7 * nz), 0, 1);
          let ci = Math.max(1, Math.round(lum * lv)), row = sc ? 2 : lum > 0.62 ? 2 : 0;
          for (const d of f.def) { const du = u - d.u, dv = v - d.v; if (d.s ? Math.abs(du) < 0.1 && dv > -0.15 && dv < 0.5 : Math.hypot(du, dv) < d.r) { ci = lv; row = sc ? 1 : 0; } }
          x.drawImage(this.at, ci * cw, row * ch, cw, ch, cx * cw, cy * ch, cw, ch);
        }
      }
      draw(now) {
        const x = this.g, W = this.W, H = this.H, d = DPR; if (!W) return;
        x.fillStyle = T.void; x.fillRect(0, 0, W, H);
        x.save(); x.strokeStyle = T.paper; x.lineWidth = d; x.globalAlpha = 0.07; [0.16, 0.5, 0.84].forEach((t) => { x.beginPath(); x.moveTo(W * t, 0); x.lineTo(W * t, H); x.stroke(); });
        const off = RM ? 0 : (now * 0.07 * d) % (26 * d); x.globalAlpha = 0.045; for (let y = -26 * d + off; y < H; y += 26 * d) { x.beginPath(); x.moveTo(W * 0.16, y); x.lineTo(W * 0.84, y); x.stroke(); }
        x.restore();
        this.fr.forEach((f) => this.fruit(f));
        x.save(); x.fillStyle = T.sig; x.shadowColor = T.sig; x.shadowBlur = 16 * d; x.fillRect(W * 0.08, this.ly - d, W * 0.84, 2 * d); x.restore();
        x.font = MONO(11 * d); x.textBaseline = "middle"; x.lineWidth = 1.4 * d;
        this.fr.forEach((f) => { if (f.y < this.ly) return; const r = { x: f.x - f.rx * 1.2, y: f.y - f.ry * 1.12, w: f.rx * 2.4, h: f.ry * 2.24 }, col = f.gr === 1 ? T.sig : T.paper; x.strokeStyle = col; corners(x, r, d, f.gr === 3); chipText(x, f.gr === 1 ? "CLASS I · " + f.wg + " G" : f.gr === 2 ? "CLASS II · " + f.kind : "REJECT · ROT", r.x, r.y + r.h + 3 * d, d, W, col); });
        hudTop(x, W, "DEMO FEED · LINE 1", now);
      }
    }
    const packEl = $("[data-pack]", view), pack = new Pack(packEl);
    onScreen(packEl, { start() { play(pack); }, stop() { pause(pack); } });

    /* ---------- phones: a 320 × 660 device scaled into the room its screen leaves ---------- */
    const PW = 320, PH = 660;
    function fitPhones() {
      const stacked = innerWidth <= 900, H = view.clientHeight;
      $$(".ag-phone-fit", view).forEach((f) => {
        const ph = f.firstElementChild, sec = f.closest(".screen"), cs = getComputedStyle(sec), inner = H - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        let avail = inner - 8;
        if (stacked) { const t = $(".top", sec), r = $(".rest", sec); avail = inner - (t ? t.offsetHeight : 0) - (r ? r.offsetHeight : 0) - 40; }
        const s = clamp(Math.min(avail / PH, (f.clientWidth || PW) / PW, 1.04), 0.62, 1.04);
        ph.style.transform = "scale(" + s.toFixed(3) + ")"; f.style.height = Math.round(PH * s) + "px";
      });
    }
    // Refit when the window changes and when the study is shown again (its view grows from nothing).
    let fitT = 0; const refit = () => { clearTimeout(fitT); fitT = setTimeout(fitPhones, 120); };
    if (g.ResizeObserver) new ResizeObserver(refit).observe(view); else addEventListener("resize", refit);
    fitPhones(); fontsReady.then(fitPhones);

    /* ---------- tabs move with the arrow keys; the sources open in a side sheet ---------- */
    $$("[role=tablist]", view).forEach((tl) => tl.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const tabs = $$("[role=tab]", tl), i = tabs.indexOf(document.activeElement); if (i < 0) return;
      e.preventDefault(); const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]; n.focus(); n.click();
    }));
    const sheet = $("[data-agc-sheet]");
    $$("[data-agc-sources]", view).forEach((b) => b.addEventListener("click", () => (sheet.showModal ? sheet.showModal() : sheet.setAttribute("open", ""))));

    // Leaving the study stops everything; the screens start again when they are next in view.
    return { stop() { comps.forEach((c) => { if (c.on) { c.on = false; c.list.forEach((x) => x.stop()); } }); } };
  }

  g.HortusAgc = { init };
})(window);
