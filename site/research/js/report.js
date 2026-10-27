/* PDF reports made in the browser with jsPDF, set in Geist (OFL), handed to the viewer through the downloads
   capability. Two reports: a plant report (photo analysis + needs) and an El Niño outlook at a chosen strength. */
(function (g) {
  "use strict";
  const C = { ink: [17, 17, 17], fg2: [85, 85, 85], line: [216, 216, 216], mist: [244, 244, 244], wingT: [28, 106, 0], wing: [70, 237, 8], void: [8, 8, 8] };
  const BASE = ((document.currentScript && document.currentScript.src) || location.href).replace(/js\/report\.js(?:[?#].*)?$/, "");
  let fontsB64 = null;
  async function b64(url) {
    const buf = await (await fetch(url)).arrayBuffer();
    let s = ""; const bytes = new Uint8Array(buf); const step = 0x8000;
    for (let i = 0; i < bytes.length; i += step) s += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
    return btoa(s);
  }
  async function fonts() {
    if (!fontsB64) fontsB64 = Promise.all(["fonts/Geist-Regular.ttf", "fonts/Geist-Light.ttf", "fonts/GeistMono-Medium.ttf"].map((f) => b64(BASE + f)));
    return fontsB64;
  }
  // The horse, whole, from the exact path in brand.js (viewBox 420 × 120), drawn at twice its size in one colour.
  function horsePNG(color) {
    const c = document.createElement("canvas"); c.width = 840; c.height = 240;
    const x = c.getContext("2d"); x.scale(2, 2); x.fillStyle = color; x.fill(new Path2D(g.HortusBrand.HORSE_D), "evenodd");
    return c.toDataURL("image/png");
  }
  async function doc() {
    const { jsPDF } = g.jspdf;
    const d = new jsPDF({ unit: "mm", format: "a4", compress: true });
    const [reg, light, mono] = await fonts();
    d.addFileToVFS("Geist-Regular.ttf", reg); d.addFont("Geist-Regular.ttf", "Geist", "normal");
    d.addFileToVFS("Geist-Light.ttf", light); d.addFont("Geist-Light.ttf", "GeistLight", "normal");
    d.addFileToVFS("GeistMono-Medium.ttf", mono); d.addFont("GeistMono-Medium.ttf", "GeistMono", "normal");
    return d;
  }
  const M = 16, W = 210, H = 297;
  // Geist lacks some super- and subscript glyphs and jsPDF has no font fallback: spell those units out.
  const plain = (s) => String(s).replace(/ ?m⁻² d⁻¹/g, "/m²/day").replace(/ ?m⁻² s⁻¹/g, "/m²/s").replace(/ ?m s⁻¹/g, " m/s").replace(/ ?mS cm⁻¹/g, " mS/cm").replace(/ ?d⁻¹/g, "/day").replace(/⁻/g, "-").replace(/₀/g, "0").replace(/₂/g, "2");
  function label(d, s, x, y, col) { s = plain(s); d.setFont("GeistMono", "normal"); d.setFontSize(7.5); d.setTextColor(...(col || C.fg2)); d.setCharSpace(0.35); d.text(s.toUpperCase(), x, y); d.setCharSpace(0); }
  function body(d, s, x, y, w, size) { s = plain(s); d.setFont("Geist", "normal"); d.setFontSize(size || 9.5); d.setTextColor(...C.ink); const lines = d.splitTextToSize(s, w); d.text(lines, x, y); return y + lines.length * (size || 9.5) * 0.42; }
  function rule(d, y, col) { d.setDrawColor(...(col || C.line)); d.setLineWidth(0.2); d.line(M, y, W - M, y); }
  async function header(d, code, title, sub) {
    d.setFillColor(...C.void); d.rect(0, 0, W, 38, "F");
    try { d.addImage(horsePNG(getComputedStyle(document.documentElement).getPropertyValue("--paper").trim()), "PNG", M, 9, 28, 8); } catch (e) { /* the mark is decoration here */ }
    d.setFont("GeistMono", "normal"); d.setFontSize(7.5); d.setTextColor(...C.wing); d.setCharSpace(0.35); d.text(code.toUpperCase(), M, 25); d.setCharSpace(0);
    d.setFont("GeistLight", "normal"); d.setFontSize(17); d.setTextColor(255, 255, 255); d.text(title, M, 33);
    d.setFont("GeistMono", "normal"); d.setFontSize(7); d.setTextColor(140, 140, 140); d.text(sub.toUpperCase(), W - M, 25, { align: "right" });
  }
  function footer(d, note) {
    const n = d.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      d.setPage(i); rule(d, H - 14);
      d.setFont("GeistMono", "normal"); d.setFontSize(6.8); d.setTextColor(...C.fg2); d.setCharSpace(0.25);
      d.text("LASTFOMO — HORTUS · " + note.toUpperCase(), M, H - 9); d.text(`${i} / ${n}`, W - M, H - 9, { align: "right" }); d.setCharSpace(0);
    }
  }
  const today = () => g.HC.dfmt(Date.now());
  const sgn = (v, d) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(d === undefined ? 1 : d);

  async function plantReport(a) {
    const d = await doc();
    await header(d, "HRT — Hortus · Plant report", a.title || "Plant photo analysis", today());
    let y = 48;
    const imW = (W - 2 * M - 6) / 2;
    const ar = a.size ? a.size[1] / a.size[0] : 1;
    const imH = Math.min(imW * ar, 78);
    if (a.photo) d.addImage(a.photo, "JPEG", M, y, imW, imH);
    if (a.overlay) d.addImage(a.overlay, "PNG", M + imW + 6, y, imW, imH);
    y += imH + 5;
    label(d, a.sample ? "Photo · synthetic sample" : "Photo", M, y); label(d, "Stress map · yellow white, brown grey", M + imW + 6, y);
    y += 9; rule(d, y - 4);
    label(d, "Colour screening", M, y); y += 6;
    const m = a.metrics;
    const rows = [["Screening index", `${m.index} / 100`], ["Plant cover in frame", `${m.cover.toFixed(1)}%`], ["Healthy green tissue", `${m.healthy.toFixed(1)}%`], ["Yellowing tissue", `${m.yellowing.toFixed(1)}%`], ["Browning tissue", `${m.browning.toFixed(1)}%`], ["Mean VARI (greenness)", m.vari.toFixed(3)], ["ExG threshold (Otsu)", m.threshold.toFixed(3)]];
    rows.forEach(([k, v], i) => { const x = M + (i % 2) * ((W - 2 * M) / 2), yy = y + Math.floor(i / 2) * 9; label(d, k, x, yy); d.setFont("Geist", "normal"); d.setFontSize(11); d.setTextColor(...C.ink); d.text(v, x, yy + 4.6); });
    y += Math.ceil(rows.length / 2) * 9 + 4; rule(d, y - 3);
    if (a.claude) {
      label(d, "Second opinion · Claude, from the photo", M, y + 2, C.wingT); y += 7;
      y = body(d, a.claude, M, y, W - 2 * M, 9.2) + 3; rule(d, y - 2);
    }
    if (a.needs) {
      if (y > H - 70) { d.addPage(); y = 20; }
      label(d, "What it needs today · " + a.needs.title, M, y + 2, C.wingT); y += 8;
      a.needs.rows.forEach(([k, v]) => { if (y > H - 24) { d.addPage(); y = 20; } label(d, k, M, y); y = body(d, v, M + 46, y, W - 2 * M - 46, 9.2) + 2.2; });
      y += 2; rule(d, y - 2);
    }
    if (y > H - 50) { d.addPage(); y = 20; }
    label(d, "How to read this", M, y + 2); y += 7;
    y = body(d, "The screening index and the shares come from colour alone (Excess Green with an Otsu threshold; VARI). They flag where to look; they do not identify a cause. Yellowing can be nutrient shortage, water stress, ageing or disease. Water demand uses FAO-56 Penman–Monteith with a single crop coefficient; treat it as a starting point and calibrate with a weighing test or a soil probe.", M, y, W - 2 * M, 8.6);
    footer(d, "Screening, not a diagnosis");
    return d.output("blob");
  }

  async function outlookReport(o) {
    const d = await doc();
    await header(d, "HRT — Hortus · Study 01 · Outlook", "El Niño 2026–27: yield outlook", today());
    let y = 48;
    y = body(d, `Expected change in yield against trend, by crop and country, if the relative Niño-3.4 index averages ${o.enso.toFixed(1)} °C over each crop’s sensitive season. Seasons already under way use the index observed so far. Bars show 80% prediction intervals from regressions on 1982–2018 FAO yields.`, M, y, W - 2 * M, 9.4) + 4;
    const rows = o.rows; const x0 = M + 58, x1 = W - M - 30, lo = -80, hi = 40;
    const X = (v) => x0 + (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * (x1 - x0);
    label(d, "Crop · country", M, y); label(d, "Yield vs trend, %", x0, y); d.setFont("GeistMono", "normal"); d.setFontSize(7.5); d.text("P(LOSS >10%)", W - M, y, { align: "right" });
    y += 4;
    d.setDrawColor(...C.line); d.setLineWidth(0.2);
    [-80, -60, -40, -20, 0, 20, 40].forEach((t) => { d.line(X(t), y, X(t), y + rows.length * 7.2 + 2); d.setFont("GeistMono", "normal"); d.setFontSize(6.5); d.setTextColor(...C.fg2); d.text(String(t).replace("-", "−"), X(t), y + rows.length * 7.2 + 6, { align: "center" }); });
    d.setDrawColor(...C.fg2); d.line(X(0), y, X(0), y + rows.length * 7.2 + 2);
    rows.forEach((r, i) => {
      const yy = y + 4 + i * 7.2;
      d.setFont("Geist", "normal"); d.setFontSize(8.6); d.setTextColor(...C.ink); d.text(`${r.crop} · ${r.country}`, M, yy + 1);
      d.setDrawColor(...(r.focus ? C.wingT : C.fg2)); d.setLineWidth(1.1); d.line(X(r.lo), yy, X(r.hi), yy);
      d.setFillColor(...(r.focus ? C.wingT : C.ink)); d.circle(X(r.mean), yy, 1.25, "F");
      d.setFont("GeistMono", "normal"); d.setFontSize(7.5); d.setTextColor(...C.ink); d.text(sgn(r.mean), X(hi) + 3, yy + 1);
      d.text(`${Math.round(r.p * 100)}%`, W - M, yy + 1, { align: "right" });
    });
    y += rows.length * 7.2 + 14; rule(d, y - 4);
    label(d, "Method and limits", M, y); y += 5;
    y = body(d, "ENSO index: Niño-3.4 sea-surface temperature from NOAA OISST v2.1 minus the 20°S–20°N tropical mean, rescaled (the CPC relative index method, official from 1 February 2026). Rainfall: NASA IMERG via NASA POWER. Yields: FAO data via Our World in Data, detrended with robust LOWESS. Scenarios above about 2.1–2.3 °C lie beyond the strongest seasons in the record, so those predictions extrapolate. National yields mix many regions; production also depends on area planted, prices and policy.", M, y, W - 2 * M, 8.6) + 3;
    label(d, "Read the paper and the deck at lastfomo.com/research", M, y + 2, C.wingT);
    footer(d, "Statistical outlook, not a forecast of record");
    return d.output("blob");
  }

  g.HortusReport = { plantReport, outlookReport };
})(window);
