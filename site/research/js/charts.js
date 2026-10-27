/* Hortus charts: small SVG chart kit drawn at the container's real width (text stays legible on phones),
   coloured only through CSS classes that read the brand tokens. One focus series in the wing colour,
   context in greys; every chart has a tooltip layer and an optional table twin. */
(function (g) {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const txt = (parent, x, y, s, cls, anchor, extra) => {
    const t = el("text", Object.assign({ x, y, class: "t " + (cls || ""), "text-anchor": anchor || "start" }, extra || {}), parent);
    t.textContent = s;
    return t;
  };
  const scale = (d0, d1, r0, r1) => {
    const f = (v) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);
    f.inv = (p) => d0 + ((p - r0) / (r1 - r0 || 1)) * (d1 - d0);
    return f;
  };
  const nice = (min, max, n) => {
    const span = max - min || 1;
    const step0 = span / Math.max(1, n || 5);
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const err = step0 / mag;
    const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
    const out = [];
    for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  };
  const fmt = (v, d) => (v === null || v === undefined || !isFinite(v) ? "—" : (v < 0 ? "−" : "") + Math.abs(v).toFixed(d === undefined ? 1 : d));
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dfmt = (v, withDay, withYear) => { const t = new Date(v); return (withDay === false ? "" : t.getUTCDate() + " ") + MONTHS[t.getUTCMonth()] + (withYear === false ? "" : " " + t.getUTCFullYear()); };
  const sfmt = (v, d) => (v === null || v === undefined || !isFinite(v) ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(d === undefined ? 1 : d));

  function tipFor(host) {
    let t = host.querySelector(":scope > .tip");
    if (!t) { t = document.createElement("div"); t.className = "tip"; t.setAttribute("role", "status"); host.appendChild(t); }
    return {
      show(html, x, y) {
        t.innerHTML = html;
        const hw = host.clientWidth, tw = t.offsetWidth || 180, th = t.offsetHeight || 60;
        let left = x + 14, top = y - th - 10;
        if (left + tw > hw) left = Math.max(0, x - tw - 14);
        if (top < 0) top = y + 14;
        t.style.left = left + "px"; t.style.top = top + "px"; t.classList.add("on");
      },
      hide() { t.classList.remove("on"); }
    };
  }

  // Render on size: every chart redraws at its container width.
  // Hosts with a fit class get their height from CSS (a share of the screen); the chart fills it instead of choosing one.
  // Cut a label to the room it has (Geist at about 0.53 em a character), with an ellipsis.
  const fitLabel = (s, room, px) => { const n = Math.floor(room / (px * 0.53)); return s.length > n ? s.slice(0, Math.max(1, n - 1)) + "…" : s; };
  const fitted = (host) => /\bfit(-[a-z]+)?\b/.test(host.className);
  function responsive(host, draw) {
    host.classList.add("chart");
    let w0 = 0, h0 = 0;
    const run = () => {
      const w = Math.round(host.clientWidth), h = fitted(host) ? Math.round(host.clientHeight) : 0;
      if (!w || (fitted(host) && !h) || (w === w0 && h === h0)) return;
      w0 = w; h0 = h;
      const old = host.querySelector(":scope > svg");
      if (old) old.remove();
      const fs = parseFloat(getComputedStyle(host).getPropertyValue("--fs")) || 1;
      draw(w, fs, h || 0);
    };
    run();
    // A host drawn again (a new selection) keeps one observer: the newest drawing.
    if (host._ro) host._ro.disconnect();
    if (g.ResizeObserver) { host._ro = new ResizeObserver(run); host._ro.observe(host); }
    return { redraw() { w0 = 0; run(); } };
  }

  /* ---------------- line chart ---------------- */
  function line(host, o) {
    return responsive(host, (W, fs, HF) => {
      const H = HF || (o.height ? o.height * fs : Math.max(220, Math.min(380, W * 0.5)));
      const m = Object.assign({ t: 16 * fs, r: (o.endLabels ? 96 : 16) * fs, b: 30 * fs, l: 44 * fs }, o.margin || {});
      const xs = o.series.flatMap((s) => s.values.map((p) => p.x));
      const ys = o.series.flatMap((s) => s.values.map((p) => p.y)).filter((v) => v !== null && isFinite(v));
      const x0 = o.x && o.x.min !== undefined ? o.x.min : Math.min(...xs), x1 = o.x && o.x.max !== undefined ? o.x.max : Math.max(...xs);
      let y0 = o.y && o.y.min !== undefined ? o.y.min : Math.min(...ys), y1 = o.y && o.y.max !== undefined ? o.y.max : Math.max(...ys);
      if (o.y && o.y.pad) { const p = (y1 - y0) * o.y.pad; y0 -= p; y1 += p; }
      const X = scale(x0, x1, m.l, W - m.r), Y = scale(y0, y1, H - m.b, m.t);
      const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": o.label || "" }, host);
      const gG = el("g", { class: "grid" }, svg);
      const yt = (o.y && o.y.ticks) || nice(y0, y1, H < 260 ? 4 : 5);
      yt.forEach((v) => { if (v < y0 - 1e-9 || v > y1 + 1e-9) return; el("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }, gG); txt(svg, m.l - 8 * fs, Y(v) + 4 * fs, (o.y && o.y.fmt ? o.y.fmt(v) : fmt(v, 1)), "", "end"); });
      (o.bands || []).forEach((b) => {
        const a = Math.max(x0, b.x0), z = Math.min(x1, b.x1);
        if (z <= a) return;
        el("rect", { x: X(a), y: m.t, width: Math.max(1, X(z) - X(a)), height: H - m.b - m.t, class: "ev-band" }, svg);
        if (b.label && X(z) - X(a) > 18 * fs) txt(svg, (X(a) + X(z)) / 2, m.t + 11 * fs, b.label, "", "middle");
      });
      if (o.zero !== false && y0 < 0 && y1 > 0) el("line", { x1: m.l, x2: W - m.r, y1: Y(0), y2: Y(0), class: "zero" }, svg);
      (o.hlines || []).forEach((h) => { el("line", { x1: m.l, x2: W - m.r, y1: Y(h.y), y2: Y(h.y), class: "hl", "stroke-dasharray": "4 4" }, svg); if (h.label) txt(svg, m.l + 4 * fs, Y(h.y) - 5 * fs, h.label, "", "start"); });
      el("line", { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: "base" }, svg);
      const xt = (o.x && o.x.ticks) ? o.x.ticks(W) : nice(x0, x1, Math.max(3, Math.floor(W / 110)));
      xt.forEach((v) => { if (v < x0 || v > x1) return; txt(svg, X(v), H - m.b + 18 * fs, o.x && o.x.fmt ? o.x.fmt(v) : String(v), "", "middle"); });
      o.series.forEach((s) => {
        if (s.band) {
          const pts = s.values.filter((p) => isFinite(p.lo) && isFinite(p.hi));
          if (pts.length > 1) el("path", { d: "M" + pts.map((p) => `${X(p.x)},${Y(p.hi)}`).join("L") + "L" + pts.slice().reverse().map((p) => `${X(p.x)},${Y(p.lo)}`).join("L") + "Z", class: "area" }, svg);
        }
        let d = "", pen = false;
        s.values.forEach((p) => {
          if (p.y === null || !isFinite(p.y)) { pen = false; return; }
          d += (pen ? "L" : "M") + X(p.x).toFixed(1) + "," + Y(p.y).toFixed(1); pen = true;
        });
        el("path", { d, class: "ln " + (s.cls || "ctx") + (s.dash ? " dash" : "") }, svg);
        if (s.dots) s.values.forEach((p) => { if (isFinite(p.y)) el("circle", { cx: X(p.x), cy: Y(p.y), r: 3.5 * fs, class: "dot " + (s.cls === "focus" ? "" : "ctx") }, svg); });
        const last = [...s.values].reverse().find((p) => p.y !== null && isFinite(p.y));
        if (last && s.end !== false && (o.endLabels || s.endDot)) {
          el("circle", { cx: X(last.x), cy: Y(last.y), r: 4.5 * fs, class: "dot " + (s.cls === "focus" ? "" : "ctx") }, svg);
          if (o.endLabels) txt(svg, X(last.x) + 9 * fs, Y(last.y) + 4 * fs + (s.dy || 0) * fs, s.name, s.cls === "focus" ? "fg lab" : "lab");
        }
      });
      (o.marks || []).forEach((mk) => {
        el("circle", { cx: X(mk.x), cy: Y(mk.y), r: 5 * fs, class: "dot" }, svg);
        if (mk.label) txt(svg, X(mk.x) + (mk.dx || -10) * fs, Y(mk.y) + (mk.dy || -10) * fs, mk.label, "fg lab", mk.anchor || "end");
      });
      // hover: nearest x across series
      const tip = tipFor(host);
      const hl = el("line", { y1: m.t, y2: H - m.b, class: "hl", visibility: "hidden" }, svg);
      const hit = el("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, class: "hit", tabindex: 0, "aria-label": "Chart values, use arrow keys" }, svg);
      const allx = [...new Set(xs)].sort((a, b) => a - b);
      let cur = allx.length - 1;
      const showAt = (xv, px, py) => {
        hl.setAttribute("x1", X(xv)); hl.setAttribute("x2", X(xv)); hl.setAttribute("visibility", "visible");
        const rows = o.series.map((s) => { const p = s.values.find((q) => q.x === xv); return p && isFinite(p.y) ? `<div class="v">${s.name}: <b style="display:inline;color:inherit;font:inherit;letter-spacing:0;text-transform:none">${o.y && o.y.tip ? o.y.tip(p.y, p) : fmt(p.y, 2)}</b></div>` : ""; }).join("");
        tip.show(`<b>${o.x && o.x.tip ? o.x.tip(xv) : xv}</b>${rows}`, px, py);
      };
      const move = (ev) => {
        const r = svg.getBoundingClientRect();
        const px = (ev.clientX - r.left) * (W / r.width);
        const xv = X.inv(px);
        let best = allx[0];
        for (const v of allx) if (Math.abs(v - xv) < Math.abs(best - xv)) best = v;
        cur = allx.indexOf(best);
        showAt(best, ev.clientX - host.getBoundingClientRect().left, ev.clientY - host.getBoundingClientRect().top);
      };
      hit.addEventListener("pointermove", move);
      hit.addEventListener("pointerdown", move);
      hit.addEventListener("pointerleave", () => { tip.hide(); hl.setAttribute("visibility", "hidden"); });
      hit.addEventListener("blur", () => { tip.hide(); hl.setAttribute("visibility", "hidden"); });
      hit.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        cur = Math.max(0, Math.min(allx.length - 1, cur + (e.key === "ArrowRight" ? 1 : -1)));
        showAt(allx[cur], X(allx[cur]) * (host.clientWidth / W), m.t + 20);
      });
    });
  }

  /* ---------------- forest / interval chart (rows with estimate and interval) ---------------- */
  function forest(host, o) {
    return responsive(host, (W, fs, HF) => {
      const narrow = W < 560;
      const hasSub = !narrow && o.rows.some((r) => r.sub);
      let rowH = (o.rowH || (hasSub ? 38 : 30)) * fs;
      if (HF) rowH = Math.max(15 * fs, Math.min((hasSub ? 40 : 34) * fs, (HF - 52 * fs) / o.rows.length));
      const showSub = hasSub && rowH >= 32 * fs;
      const labW = narrow ? Math.min(172, W * 0.48) : (o.labelWidth || 230) * fs;
      const valW = narrow ? 0 : (o.valueWidth || 120) * fs;
      const m = { t: 22 * fs, r: 12 * fs + valW, b: 30 * fs, l: labW };
      const H = m.t + m.b + o.rows.length * rowH;
      const lo = o.x.min, hi = o.x.max;
      const X = scale(lo, hi, m.l, W - m.r);
      const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": o.label || "" }, host);
      const gG = el("g", { class: "grid" }, svg);
      (o.x.ticks || nice(lo, hi, Math.max(2, Math.min(7, Math.floor((W - m.l - m.r) / (64 * fs)))))).forEach((v) => { el("line", { x1: X(v), x2: X(v), y1: m.t - 6 * fs, y2: H - m.b }, gG); txt(svg, X(v), H - m.b + 18 * fs, o.x.fmt ? o.x.fmt(v) : fmt(v, 0), "", "middle"); });
      if (lo < 0 && hi > 0) el("line", { x1: X(0), x2: X(0), y1: m.t - 6 * fs, y2: H - m.b, class: "zero" }, svg);
      if (o.x.label) txt(svg, W - m.r, m.t - 9 * fs, o.x.label, "", "end");
      if (!narrow && o.valueHead) txt(svg, W - 4, m.t - 9 * fs, o.valueHead, "", "end");
      const tip = tipFor(host);
      o.rows.forEach((r, i) => {
        const cy = m.t + i * rowH + rowH / 2;
        const g2 = el("g", { tabindex: 0, role: "listitem", "aria-label": `${r.label} ${r.sub || ""}: ${sfmt(r.v, 1)} (${sfmt(r.lo, 1)} to ${sfmt(r.hi, 1)})` }, svg);
        if (i % 2 === 0) el("rect", { x: 0, y: cy - rowH / 2, width: W, height: rowH, class: "band", opacity: 0.45 }, g2);
        const lab = fitLabel(r.short && (narrow || r.label.length * 13 * fs * 0.53 > labW - 8) ? r.short : r.label, labW - 8, 13 * fs);
        txt(g2, 4, cy + (r.sub && showSub ? -3 * fs : 4 * fs), lab, "fg", "start", { style: `font-family:var(--sans);font-size:${13 * fs}px;letter-spacing:0;text-transform:none` });
        if (r.sub && showSub) txt(g2, 4, cy + 12 * fs, r.sub, "", "start", { style: `font-size:${10 * fs}px` });
        const a = Math.max(lo, r.lo), b = Math.min(hi, r.hi);
        if (isFinite(r.lo) && isFinite(r.hi)) el("line", { x1: X(a), x2: X(b), y1: cy, y2: cy, class: "ci " + (r.focus ? "focus" : "") }, g2);
        if (r.lo < lo) txt(g2, X(lo) + 2, cy - 6 * fs, "‹", "", "start");
        if (r.hi > hi) txt(g2, X(hi) - 2, cy - 6 * fs, "›", "", "end");
        if (isFinite(r.v)) el("circle", { cx: X(Math.max(lo, Math.min(hi, r.v))), cy, r: (r.hollow ? 5 : 5.5) * fs, class: "dot " + (r.hollow ? "hollow " : "") + (r.focus ? "" : "ctx") }, g2);
        if (!narrow) txt(g2, W - 4, cy + 4 * fs, r.right !== undefined ? r.right : sfmt(r.v, 1), r.focus ? "fg" : "", "end");
        const show = (ev) => {
          const hb = host.getBoundingClientRect();
          const px = ev && ev.clientX ? ev.clientX - hb.left : X(r.v) * (host.clientWidth / W);
          tip.show(`<b>${r.label}${r.sub ? " · " + r.sub : ""}</b><div class="v">${o.tipValue ? o.tipValue(r) : sfmt(r.v, 1) + " (" + sfmt(r.lo, 1) + " to " + sfmt(r.hi, 1) + ")"}</div>${r.note ? `<div class="v" style="color:var(--fg2)">${r.note}</div>` : ""}`, px, cy * (host.clientWidth / W));
        };
        g2.addEventListener("pointerenter", show); g2.addEventListener("pointermove", show); g2.addEventListener("focus", () => show());
        g2.addEventListener("pointerleave", () => tip.hide()); g2.addEventListener("blur", () => tip.hide());
        if (o.onClick) { g2.style.cursor = "pointer"; g2.addEventListener("click", () => o.onClick(r)); g2.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); o.onClick(r); } }); }
      });
      svg.setAttribute("role", "list");
    });
  }

  /* ---------------- scatter with fitted line, one highlighted point ---------------- */
  function scatter(host, o) {
    return responsive(host, (W, fs, HF) => {
      const H = HF || (o.height ? o.height * fs : Math.max(220, Math.min(320, W * 0.62)));
      const m = { t: 16 * fs, r: 18 * fs, b: 36 * fs, l: 46 * fs };
      const pts = o.points.filter((p) => isFinite(p.x) && isFinite(p.y));
      const xsv = pts.map((p) => p.x).concat(o.extraX || []), ysv = pts.map((p) => p.y).concat(o.extraY || []);
      let x0 = o.x && o.x.min !== undefined ? o.x.min : Math.min(...xsv), x1 = o.x && o.x.max !== undefined ? o.x.max : Math.max(...xsv);
      let y0 = Math.min(...ysv), y1 = Math.max(...ysv); const py = (y1 - y0) * 0.12; y0 -= py; y1 += py;
      const X = scale(x0, x1, m.l, W - m.r), Y = scale(y0, y1, H - m.b, m.t);
      const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": o.label || "" }, host);
      const gG = el("g", { class: "grid" }, svg);
      nice(y0, y1, 4).forEach((v) => { el("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }, gG); txt(svg, m.l - 8 * fs, Y(v) + 4 * fs, o.y && o.y.fmt ? o.y.fmt(v) : fmt(v, 0), "", "end"); });
      nice(x0, x1, 5).forEach((v) => txt(svg, X(v), H - m.b + 18 * fs, o.x && o.x.fmt ? o.x.fmt(v) : fmt(v, 1), "", "middle"));
      if (y0 < 0 && y1 > 0) el("line", { x1: m.l, x2: W - m.r, y1: Y(0), y2: Y(0), class: "zero" }, svg);
      if (x0 < 0 && x1 > 0) el("line", { x1: X(0), x2: X(0), y1: m.t, y2: H - m.b, class: "zero" }, svg);
      el("line", { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: "base" }, svg);
      if (o.x && o.x.label) txt(svg, W - m.r, H - 4 * fs, o.x.label, "", "end");
      if (o.y && o.y.label) txt(svg, m.l, m.t - 4 * fs, o.y.label, "", "start");
      if (o.fit) { const a = o.fit.b0, b = o.fit.b1; el("line", { x1: X(x0), x2: X(x1), y1: Y(a + b * x0), y2: Y(a + b * x1), class: "ln ctx dash" }, svg); }
      const tip = tipFor(host);
      pts.forEach((p) => {
        const c = el("circle", { cx: X(p.x), cy: Y(p.y), r: (p.focus ? 6 : 4) * fs, class: p.focus ? "dot" : p.hot ? "dot hollow" : "dot ctx", tabindex: 0 }, svg);
        const show = () => tip.show(`<b>${p.label}</b><div class="v">${o.tip ? o.tip(p) : fmt(p.x, 2) + ", " + fmt(p.y, 1)}</div>`, X(p.x) * (host.clientWidth / W), Y(p.y) * (host.clientWidth / W));
        c.addEventListener("pointerenter", show); c.addEventListener("focus", show);
        c.addEventListener("pointerleave", () => tip.hide()); c.addEventListener("blur", () => tip.hide());
        if (p.tag) { const right = X(p.x) + 9 * fs + p.tag.length * 7.5 * fs > W; txt(svg, X(p.x) + (right ? -9 : 9) * fs, Y(p.y) + 4 * fs, p.tag, p.focus ? "fg lab" : "lab", right ? "end" : "start"); }
      });
    });
  }

  /* ---------------- horizontal bars ---------------- */
  function bars(host, o) {
    return responsive(host, (W, fs, HF) => {
      // Narrow: labels above the bars, unless a fitted height cannot hold them; then short labels at the side.
      const narrow = W < 520, stacked = narrow && !(HF && o.rows.length * 38 * fs + 12 * fs > HF);
      let rowH = (o.rowH || (stacked ? 44 : 34)) * fs;
      if (HF) rowH = Math.max((stacked ? 38 : 20) * fs, Math.min((stacked ? 46 : 36) * fs, (HF - 12 * fs) / o.rows.length));
      const labW = stacked ? 0 : Math.min(W * (narrow ? 0.4 : 0.45), (o.labelWidth || 240) * fs);
      const m = { t: 6 * fs, r: 64 * fs, b: 6 * fs, l: labW };
      const H = m.t + m.b + o.rows.length * rowH;
      const max = o.max || Math.max(...o.rows.map((r) => r.v));
      const X = scale(0, max, m.l, W - m.r);
      const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": o.label || "" }, host);
      o.rows.forEach((r, i) => {
        const y = m.t + i * rowH;
        const h = 12 * fs, by = stacked ? y + rowH - h - 8 * fs : y + (rowH - h) / 2;
        txt(svg, 0, stacked ? y + 15 * fs : y + rowH / 2 + 4 * fs, stacked ? r.label : fitLabel(r.short && (narrow || r.label.length * 13 * fs * 0.53 > labW - 8) ? r.short : r.label, labW - 8, 13 * fs), "fg", "start", { style: `font-family:var(--sans);font-size:${13 * fs}px;letter-spacing:0;text-transform:none` });
        const w = Math.max(2, X(r.v) - m.l);
        el("path", { d: w > 6 ? `M${m.l},${by}h${w - 4}a4,4 0 0 1 4,4v${h - 8}a4,4 0 0 1 -4,4h${-(w - 4)}z` : `M${m.l},${by}h${w}v${h}h${-w}z`, class: "bar " + (r.focus ? "" : "ctx") }, svg);
        txt(svg, m.l + w + 6 * fs, by + h / 2 + 4 * fs, r.text !== undefined ? r.text : o.fmt ? o.fmt(r.v) : fmt(r.v, 1), "fg", "start");
      });
    });
  }

  /* ---------------- world map with crop-belt boxes ---------------- */
  function worldMap(host, o) {
    return responsive(host, (W, fs, HF) => {
      if (HF && W * 0.46 > HF) W = Math.round(HF / 0.46);
      const H = Math.round(W * 0.46);
      const lat0 = -48, lat1 = 56;
      const X = (lon) => ((lon + 180) / 360) * W, Y = (lat) => ((lat1 - lat) / (lat1 - lat0)) * H;
      const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": o.label || "Map", style: "overflow:hidden" }, host);
      const land = el("g", {}, svg);
      (o.land || []).forEach((ring) => {
        let d = "";
        ring.forEach(([lo, la], i) => { d += (i ? "L" : "M") + X(lo).toFixed(1) + "," + Y(la).toFixed(1); });
        el("path", { d: d + "Z", fill: "var(--line2)", stroke: "var(--line)", "stroke-width": 0.6 }, land);
      });
      if (o.nino) el("rect", { x: X(-170), y: Y(5), width: X(-120) - X(-170), height: Y(-5) - Y(5), fill: "none", stroke: "var(--viz)", "stroke-width": 1.5 * fs, "stroke-dasharray": "4 3" }, svg), txt(svg, X(-145), Y(5) - 6 * fs, "Niño-3.4", "fg lab", "middle");
      const tip = tipFor(host);
      (o.boxes || []).forEach((b) => {
        const x = X(b.lon[0]), y = Y(b.lat[1]), w = X(b.lon[1]) - X(b.lon[0]), h = Y(b.lat[0]) - Y(b.lat[1]);
        const strength = Math.min(1, Math.abs(b.v || 0) / (o.vmax || 40));
        const g2 = el("g", { tabindex: 0, role: "button", "aria-label": `${b.label}: ${sfmt(b.v, 0)}% rainfall per °C` }, svg);
        el("rect", { x: x - 3, y: y - 3, width: w + 6, height: h + 6, fill: "transparent" }, g2);
        el("rect", { x, y, width: w, height: h, fill: b.v < 0 ? "var(--viz)" : "none", "fill-opacity": b.v < 0 ? (0.25 + 0.65 * strength).toFixed(2) : 0, stroke: b.v < 0 ? "var(--viz)" : "var(--fg)", "stroke-width": b.selected ? 2.5 : 1.2, "stroke-dasharray": b.v >= 0 ? "3 2" : null }, g2);
        if (b.short && W > 640) txt(g2, x + w / 2, y - 5 * fs, b.short, "lab", "middle");
        const show = () => { const sb = svg.getBoundingClientRect(), hb = host.getBoundingClientRect(), sc = sb.width / W; tip.show(`<b>${b.label}</b><div class="v">${o.tip ? o.tip(b) : sfmt(b.v, 0)}</div>`, sb.left - hb.left + (x + w / 2) * sc, sb.top - hb.top + y * sc); };
        g2.addEventListener("pointerenter", show); g2.addEventListener("focus", show);
        g2.addEventListener("pointerleave", () => tip.hide()); g2.addEventListener("blur", () => tip.hide());
        if (o.onClick) { g2.style.cursor = "pointer"; g2.addEventListener("click", () => o.onClick(b)); g2.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); o.onClick(b); } }); }
      });
    });
  }

  /* ---------------- stipple raster (dot-matrix NDVI) on canvas ---------------- */
  const imgCache = new Map();
  function decodePNG(src) {
    if (imgCache.has(src)) return imgCache.get(src);
    // A data: URI is decoded from its bytes, a path is fetched; either way createImageBitmap reads it, with no <img>
    // and no fetch of a data: URL, so the strict web CSP (img-src and connect-src 'self') holds.
    const bytes = () => { const bin = atob(src.slice(src.indexOf(",") + 1)), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: "image/png" }); };
    const p = (src.startsWith("data:") ? Promise.resolve(bytes()) : fetch(src).then((r) => r.blob())).then((b) => createImageBitmap(b)).then((im) => {
      const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
      const cx = c.getContext("2d"); cx.drawImage(im, 0, 0);
      const d = cx.getImageData(0, 0, im.width, im.height).data;
      const v = new Uint8Array(im.width * im.height);
      for (let i = 0; i < v.length; i++) v[i] = d[i * 4];
      return { w: im.width, h: im.height, v };
    });
    imgCache.set(src, p);
    return p;
  }
  function css(name, scope) { return getComputedStyle(scope || document.documentElement).getPropertyValue(name).trim(); }
  async function stipple(canvas, src, o) {
    o = o || {};
    const r = await decodePNG(src);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = canvas.clientWidth || 600, H = canvas.clientHeight || W;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const cx = canvas.getContext("2d");
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.fillStyle = css("--void"); cx.fillRect(0, 0, W, H);
    const col = o.color || css("--hortus");
    const cell = Math.max(W / r.w, H / r.h), ox = (W - cell * r.w) / 2, oy = (H - cell * r.h) / 2;
    const mask = o.mask ? await decodePNG(o.mask) : null;
    const lab = o.labels ? await decodePNG(o.labels) : null;
    for (let j = 0; j < r.h; j++) for (let i = 0; i < r.w; i++) {
      const k = j * r.w + i;
      let v = r.v[k] / 255;
      if (lab && o.labelPick !== undefined && lab.v[k] !== o.labelPick) { v = Math.min(v, 0.08); }
      if (mask && mask.v[k] < 128 && o.maskDim) v *= 0.25;
      const rad = Math.max(0.35, cell * 0.44 * Math.pow(v, 0.9));
      cx.globalAlpha = 0.18 + 0.82 * v;
      cx.fillStyle = v < (o.threshold || 0.35) ? (o.low || css("--sealed")) : col;
      if (v < 0.04) continue;
      const px = ox + i * cell + cell / 2, py = oy + j * cell + cell / 2;
      if (px < -cell || py < -cell || px > W + cell || py > H + cell) continue;
      cx.beginPath(); cx.arc(px, py, rad, 0, 6.2832); cx.fill();
    }
    cx.globalAlpha = 1;
    return r;
  }

  /* ---------------- table twin ---------------- */
  function table(host, cols, rows, summary) {
    const d = document.createElement("details"); d.className = "table";
    d.innerHTML = `<summary>${summary || "Show the numbers"}</summary>`;
    const wrap = document.createElement("div"); wrap.className = "scroll-x";
    const t = document.createElement("table"); t.className = "tbl";
    t.innerHTML = "<thead><tr>" + cols.map((c) => `<th class="${c.r ? "r" : ""}">${c.h}</th>`).join("") + "</tr></thead><tbody>" +
      rows.map((r) => "<tr>" + cols.map((c) => `<td class="${c.r ? "r" : ""}">${typeof c.f === "function" ? c.f(r) : r[c.k]}</td>`).join("") + "</tr>").join("") + "</tbody>";
    wrap.appendChild(t); d.appendChild(wrap); host.appendChild(d);
    return d;
  }

  g.HC = { line, forest, scatter, bars, worldMap, stipple, decodePNG, table, nice, fmt, sfmt, css, MONTHS, dfmt };
})(window);
