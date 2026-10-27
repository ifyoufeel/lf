/* Plant photo analysis in the browser. Colour indices only: Excess Green (ExG, Woebbecke et al. 1995) separates
   green tissue from background with an Otsu (1979) threshold; VARI (Gitelson et al. 2002) measures greenness inside
   the plant; yellowing and browning are hue/saturation rules applied only near green tissue. These are screening
   signals, not a diagnosis: a photo cannot tell nitrogen shortage from a virus. */
(function (g) {
  "use strict";
  const MAX = 640;

  function toCanvas(src) {
    const w0 = src.naturalWidth || src.videoWidth || src.width, h0 = src.naturalHeight || src.videoHeight || src.height;
    const k = Math.min(1, MAX / Math.max(w0, h0));
    const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w0 * k)); c.height = Math.max(1, Math.round(h0 * k));
    c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
    return c;
  }

  function otsu(values, lo, hi, bins) {
    bins = bins || 128;
    const h = new Float64Array(bins); let n = 0;
    for (const v of values) { const b = Math.max(0, Math.min(bins - 1, Math.floor((v - lo) / (hi - lo) * bins))); h[b]++; n++; }
    let sum = 0; for (let i = 0; i < bins; i++) sum += i * h[i];
    let sumB = 0, wB = 0, best = 0, th = 0;
    for (let i = 0; i < bins; i++) {
      wB += h[i]; if (!wB) continue; const wF = n - wB; if (!wF) break;
      sumB += i * h[i]; const mB = sumB / wB, mF = (sum - sumB) / wF;
      const between = wB * wF * (mB - mF) * (mB - mF);
      if (between > best) { best = between; th = i; }
    }
    return lo + (th + 0.5) / bins * (hi - lo);
  }

  function hsv(r, g2, b) {
    const mx = Math.max(r, g2, b), mn = Math.min(r, g2, b), d = mx - mn;
    let h = 0;
    if (d > 1e-6) { if (mx === r) h = ((g2 - b) / d) % 6; else if (mx === g2) h = (b - r) / d + 2; else h = (r - g2) / d + 4; h *= 60; if (h < 0) h += 360; }
    return [h, mx ? d / mx : 0, mx];
  }

  function dilate(mask, w, h, r) {
    // separable box dilation
    const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) { let run = 0; const row = y * w; const pref = new Int32Array(w + 1); for (let x = 0; x < w; x++) pref[x + 1] = pref[x] + mask[row + x]; for (let x = 0; x < w; x++) { const a = Math.max(0, x - r), b = Math.min(w, x + r + 1); tmp[row + x] = pref[b] - pref[a] > 0 ? 1 : 0; } }
    for (let x = 0; x < w; x++) { const pref = new Int32Array(h + 1); for (let y = 0; y < h; y++) pref[y + 1] = pref[y] + tmp[y * w + x]; for (let y = 0; y < h; y++) { const a = Math.max(0, y - r), b = Math.min(h, y + r + 1); out[y * w + x] = pref[b] - pref[a] > 0 ? 1 : 0; } }
    return out;
  }

  // closing (dilate, then erode) fills notches at leaf margins without spreading onto the soil around them
  function close(mask, w, h, r) {
    const d = dilate(mask, w, h, r), inv = new Uint8Array(w * h);
    for (let i = 0; i < inv.length; i++) inv[i] = d[i] ? 0 : 1;
    const e = dilate(inv, w, h, r);
    for (let i = 0; i < inv.length; i++) inv[i] = e[i] ? 0 : 1;
    return inv;
  }

  // Non-plant pixels the plant encloses: lesions and holes that do not reach the image edge. Enclosed regions larger
  // than 2% of the frame are more likely background seen between leaves, so they are left out.
  function enclosed(green, w, h) {
    const N = w * h, seen = new Uint8Array(N), list = new Int32Array(N), out = new Uint8Array(N);
    let tail = 0;
    const take = (i) => { if (!seen[i] && !green[i]) { seen[i] = 1; list[tail++] = i; } };
    const grow = (head) => { while (head < tail) { const i = list[head++], x = i % w; if (x > 0) take(i - 1); if (x < w - 1) take(i + 1); if (i >= w) take(i - w); if (i < N - w) take(i + w); } };
    for (let x = 0; x < w; x++) { take(x); take(N - w + x); }
    for (let y = 0; y < h; y++) { take(y * w); take(y * w + w - 1); }
    grow(0);
    for (let s0 = 0; s0 < N; s0++) {
      if (seen[s0] || green[s0]) continue;
      tail = 0; take(s0); grow(0);
      if (tail <= N * 0.02) for (let k = 0; k < tail; k++) out[list[k]] = 1;
    }
    return out;
  }

  function analyse(src) {
    const c = toCanvas(src); const w = c.width, h = c.height;
    const img = c.getContext("2d").getImageData(0, 0, w, h); const d = img.data; const N = w * h;
    const exg = new Float32Array(N), vari = new Float32Array(N), hue = new Float32Array(N), sat = new Float32Array(N), val = new Float32Array(N);
    const sample = [];
    for (let i = 0; i < N; i++) {
      const r = d[i * 4] / 255, gg = d[i * 4 + 1] / 255, b = d[i * 4 + 2] / 255, s = r + gg + b + 1e-6;
      exg[i] = 2 * gg / s - r / s - b / s;
      const den = gg + r - b; vari[i] = Math.abs(den) < 1e-3 ? 0 : Math.max(-1, Math.min(1, (gg - r) / den));
      const [hh, ss, vv] = hsv(r, gg, b); hue[i] = hh; sat[i] = ss; val[i] = vv;
      if (i % 3 === 0) sample.push(exg[i]);
    }
    let T = otsu(sample, -0.5, 1.0, 160); T = Math.max(0.03, Math.min(0.2, T));
    const green = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (exg[i] > T && val[i] > 0.12) green[i] = 1;
    const inside = enclosed(green, w, h), notch = close(green, w, h, Math.max(2, Math.round(Math.max(w, h) * 0.008)));
    for (let i = 0; i < N; i++) if (notch[i] && !green[i]) inside[i] = 1;
    const cls = new Uint8Array(N); // 0 background, 1 healthy green, 2 yellowing, 3 browning
    let nH = 0, nY = 0, nB = 0, sV = 0, sV2 = 0, sE = 0;
    const hist = new Float32Array(36);
    for (let i = 0; i < N; i++) {
      if (green[i]) {
        // pale green-yellow tissue still above the ExG threshold counts as yellowing when its hue drifts below 75 degrees
        if (hue[i] < 75 && hue[i] >= 40 && sat[i] > 0.35) { cls[i] = 2; nY++; } else { cls[i] = 1; nH++; }
      } else if (inside[i] && val[i] > 0.12 && sat[i] > 0.22) {
        if (hue[i] >= 38 && hue[i] < 75 && val[i] > 0.35) { cls[i] = 2; nY++; }
        else if (hue[i] >= 8 && hue[i] < 38 && val[i] < 0.75) { cls[i] = 3; nB++; }
      }
      if (cls[i]) { sV += vari[i]; sV2 += vari[i] * vari[i]; sE += exg[i]; hist[Math.min(35, Math.floor(hue[i] / 10))]++; }
    }
    const plant = Math.max(1, nH + nY + nB);
    const meanV = sV / plant, sdV = Math.sqrt(Math.max(0, sV2 / plant - meanV * meanV));
    const metrics = {
      cover: 100 * plant / N,
      healthy: 100 * nH / plant,
      yellowing: 100 * nY / plant,
      browning: 100 * nB / plant,
      vari: meanV,
      variSd: sdV,
      exg: sE / plant,
      threshold: T,
      size: [w, h]
    };
    // Screening index 0-100: healthy share, penalised by browning more than yellowing, and by very low greenness
    const greennessBonus = Math.max(0, Math.min(1, (meanV + 0.05) / 0.35));
    metrics.index = Math.round(Math.max(0, Math.min(100, metrics.healthy - 0.6 * metrics.browning + 10 * (greennessBonus - 0.5))));
    return { w, h, src: c, img, cls, vari, metrics, hueHist: Array.from(hist) };
  }

  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function hex(h) { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map((x) => x + x).join(""); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

  // layer: "photo" | "mask" | "vari" | "stress"
  function render(res, layer, canvas) {
    const { w, h } = res; canvas.width = w; canvas.height = h;
    const cx = canvas.getContext("2d");
    if (layer === "photo") { cx.drawImage(res.src, 0, 0); return; }
    const out = cx.createImageData(w, h); const o = out.data; const s = res.img.data;
    const G = hex(css("--hortus")), P = hex(css("--paper")), V = hex(css("--void")), A = hex(css("--sealed"));
    for (let i = 0; i < w * h; i++) {
      const k = res.cls[i]; let c, a = 1;
      const lum = (s[i * 4] * 0.3 + s[i * 4 + 1] * 0.59 + s[i * 4 + 2] * 0.11) / 255;
      if (layer === "mask") {
        if (k) { c = G; a = 0.35 + 0.65 * lum; } else { c = V.map((v, j) => v + lum * 40); }
      } else if (layer === "vari") {
        if (k) { const t = Math.max(0, Math.min(1, (res.vari[i] + 0.1) / 0.5)); c = [V[0] + (G[0] - V[0]) * t, V[1] + (G[1] - V[1]) * t, V[2] + (G[2] - V[2]) * t]; }
        else { c = V.map((v) => v + lum * 26); }
      } else {
        if (k === 2) c = P; else if (k === 3) c = A; else if (k === 1) { c = G; a = 0.28; } else { c = V.map((v) => v + lum * 26); }
      }
      o[i * 4] = c[0] * a + V[0] * (1 - a); o[i * 4 + 1] = c[1] * a + V[1] * (1 - a); o[i * 4 + 2] = c[2] * a + V[2] * (1 - a); o[i * 4 + 3] = 255;
    }
    cx.putImageData(out, 0, 0);
  }

  /* Synthetic samples so the tool opens working: three drawn leaves, stored as lossless pictures beside the page
     (img/sample-*.webp) and labelled as synthetic everywhere they appear. Returns a canvas, like a photo after toCanvas. */
  const BASE = ((document.currentScript && document.currentScript.src) || location.href).replace(/js\/vision\.js(?:[?#].*)?$/, "");
  const samples = {};
  function sample(kind) {
    if (!samples[kind]) samples[kind] = fetch(BASE + "img/sample-" + kind + ".webp").then((r) => { if (!r.ok) throw new Error("sample " + kind + " " + r.status); return r.blob(); })
      .then((b) => createImageBitmap(b)).then((bmp) => { const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height; c.getContext("2d").drawImage(bmp, 0, 0); return c; });
    return samples[kind];
  }

  g.HortusVision = { analyse, render, sample, toCanvas };
})(window);
