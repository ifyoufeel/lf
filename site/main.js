(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;

  /* ---------------- media manifest: loops and films, null until uploaded ---------------- */
  let MEDIA = {};
  try { MEDIA = JSON.parse(($('#lf-media') || {}).textContent || '{}'); } catch (_) { MEDIA = {}; }
  const LOOPS = MEDIA.loops || {};
  const REELS = MEDIA.films || {};
  const has = (map, k) => typeof map[k] === 'string' && map[k].length > 0;

  // The exact Figma horse (Logo/Mark 9:3). brand/marks/horse.svg is the source; the brand check keeps them identical.
  const HORSE = new Path2D("M322.101 1.53716C320.348 2.91274 319.256 3.04607 312.945 2.65567C306.632 2.26447 305.449 2.40897 302.994 3.87317C301.461 4.7865 298.595 6.29781 296.625 7.23109C294.655 8.16358 292.505 9.19666 291.848 9.52479C291.074 9.91279 290.742 11.001 290.904 12.6153C291.159 15.1556 290.591 15.5205 286.943 15.1612C284.536 14.9249 284.411 16.8258 286.713 18.666C290.052 21.3366 280.896 33.3256 275.917 32.8019C273.957 32.5959 273.62 32.8657 273.397 34.8129C273.13 37.1482 272.314 37.3813 267.256 36.5693C264.172 36.0743 264.506 37.8116 267.86 39.7013C273.171 42.6952 282.031 40.4111 290.636 33.8286C293.788 31.4175 294.967 31.7648 298.904 36.262C302.231 40.0614 302.251 40.0198 295.63 43.1319C288.638 46.4187 278.291 46.7133 268.85 43.8959C265.955 43.0313 260.899 41.813 257.615 41.1871C254.331 40.5619 246.542 38.7489 240.305 37.1593C225.232 33.3168 216.24 33.201 199.61 36.6372C182.405 40.1923 180.226 40.3208 172.533 38.2395C156.02 33.7711 141.289 40.8885 116.24 65.4365C87.5356 93.5685 68.5251 101.841 56.5125 91.428C52.7374 88.1556 53.2039 86.7983 58.717 85.022C80.3809 78.0411 90.8641 63.0255 78.5458 56.6202C73.0988 53.7884 64.3853 55.8075 56.7132 61.681C54.7253 63.2027 50.6619 65.2457 47.6828 66.2205C34.6862 70.4742 21.2796 80.3204 12.5439 92.0276C9.49555 96.1128 5.29683 100.96 3.21419 102.798C-1.1318 106.634 -1.06413 107.74 3.37819 105.457C7.05386 103.567 11.6968 99.05 15.0047 94.1457C19.9446 86.8199 21.9651 85.3956 21.9651 89.2365C21.9651 92.0771 23.4721 96.5408 24.4315 96.5408C24.8263 96.5408 25.1496 96.1703 25.1496 95.7168C25.1496 92.6551 27.5952 89.1288 28.6835 90.6201C29.7495 92.0803 29.943 91.9949 32.9252 88.7567C36.4082 84.9757 36.2108 85.0244 43.1641 86.2387C47.8205 87.0514 48.4288 87.4123 51.7892 91.357C65.964 107.996 89.8013 99.9841 126.35 66.298C144.675 49.4078 150.883 46.2439 165.696 46.2439C177.439 46.2439 179.814 47.5213 176.76 52.1949C175.232 54.5341 175.133 58.6361 176.445 65.284C177.247 69.3445 177.247 70.475 176.448 70.9708C173.76 72.6362 159.196 73.3443 151.642 72.1763C147.518 71.5384 145.366 73.3132 145.36 77.3585C145.353 82.2221 128.895 99.7885 122.892 101.34C115.95 103.134 114.366 103.879 110.799 107.027C104.039 112.994 106.86 114.569 117.671 110.863C128.5 107.149 128.909 106.867 140.188 95.3265C153.829 81.3703 153.741 81.4118 163.559 84.3019C175.953 87.9496 190.66 86.487 201.83 80.4961C206.816 77.8216 207.396 77.7665 213.559 79.376C216.081 80.0346 219.725 80.5735 221.657 80.5735C225.947 80.5735 225.565 81.2337 218.093 86.7361C211.051 91.9214 211.307 92.822 220.409 94.9009C224.466 95.8278 229.699 97.4756 232.039 98.563C234.379 99.6504 239.024 101.242 242.363 102.099C251.276 104.389 252.174 106.287 247.664 113.306C241.691 122.603 248.317 121.646 260.386 111.47C267.603 105.385 262.642 98.6636 248.212 94.9784C231.949 90.8245 230.512 89.4593 238.845 86.075C245.772 83.2608 252.218 76.6942 254.693 69.9289C255.537 67.6208 256.984 68.7673 258.109 72.6378C261.071 82.8265 269.803 87.2215 287.868 87.6175C299.163 87.8642 301.227 88.1068 302.596 89.3483C303.472 90.1419 307.548 92.8244 311.656 95.3089C326.608 104.354 327.287 105.407 320.555 109.115C313.554 112.971 304.892 112.971 301.877 109.115C300.087 106.826 299.661 106.638 298.252 107.515C296.911 108.351 295.939 108.192 292.163 106.517C286.892 104.18 285.267 104.053 283.484 105.841C279.964 109.371 300.701 121.934 306.438 119.746C307.665 119.278 310.264 118.895 312.211 118.895C314.159 118.895 318.337 118.176 321.498 117.298C324.658 116.42 328.505 115.676 330.046 115.646C334.342 115.559 335.709 114.697 336.982 111.269C339.197 105.304 339.164 105.053 335.921 103.327C329.752 100.042 325.115 93.9221 323.406 86.8095C322.712 83.9202 324.007 83.3103 325.615 85.7701C327.394 88.4933 346.535 88.7376 356.334 86.162C359.618 85.299 363.737 84.5845 365.489 84.5741C367.24 84.5637 369.7 84.0184 370.953 83.363C372.208 82.7067 373.669 82.1702 374.2 82.1702C376.474 82.1702 399.232 93.5285 402.423 96.2557C405.397 98.7985 416.519 103.726 419.284 103.726C420.49 103.726 420.122 101.104 418.556 98.5367C417.437 96.702 413.841 94.5153 403.198 89.1958C395.554 85.3756 386.849 80.4362 383.854 78.2183C377.31 73.3746 372.212 72.7751 364.84 75.9829C359.614 78.2574 346.865 78.6055 344.796 76.5314C342.695 74.4237 342.461 57.5423 344.463 52.4496C349.497 39.643 361.461 34.8225 361.496 45.5868C361.512 50.4066 363.672 53.3557 368.324 54.9053C370.267 55.5528 373.291 56.9356 375.042 57.9782C376.794 59.0209 379.458 60.4324 380.962 61.115C382.468 61.7984 384.83 63.2227 386.213 64.2797C392.676 69.224 399.272 63.6115 393.913 57.7267C387.154 50.3068 385.115 46.3876 384.558 39.7548C384.366 37.4675 383.451 34.025 382.524 32.1041C381.179 29.3178 380.94 27.7714 381.34 24.4542C382.308 16.4155 374.85 9.54474 373.726 17.4406C373.414 19.6281 372.39 20.2093 370.718 19.149C369.766 18.5463 369.739 17.8884 370.55 15.1724C371.759 11.1271 370.633 6.22275 367.858 3.43966C364.402 -0.0260346 362.312 1.35194 364.693 5.52738C367.205 9.93435 365.952 10.5443 362.421 6.63392C358.956 2.79539 358.956 2.79538 352.271 2.62613C342.432 2.37704 334.807 1.68645 331.66 0.758755C327.501 -0.466732 324.323 -0.208058 322.101 1.53716ZM332.511 6.26428C334.573 8.33124 334.839 9.15195 334.839 13.4495C334.839 18.6988 333.952 19.569 332.135 16.1057C331.501 14.8986 329.164 12.1274 326.939 9.94871C321.859 4.96932 321.79 3.93066 326.541 3.93066C329.506 3.93066 330.617 4.36497 332.511 6.26428ZM302.886 24.7424C306.421 26.7582 308.426 29.3657 309.114 32.8402C309.633 35.466 309.633 35.466 306.112 32.5807C300.89 28.3007 297.288 26.2912 294.834 26.288C292.475 26.2848 292.082 25.5711 293.6 24.0494C295.075 22.57 299.679 22.9133 302.886 24.7424ZM76.9942 59.0696C80.931 61.1829 79.8522 66.8888 75.2101 68.5118C70.2272 70.2539 60.5918 69.0092 59.6309 66.5C57.9097 61.9996 71.5655 56.1564 76.9942 59.0696Z");
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(pointer: fine)').matches;
  const views = { home: $('#view-home'), machina: $('#view-machina'), hortus: $('#view-hortus'), arca: $('#view-arca'), start: $('#view-start') };
  const TITLES = { home: 'lastfomo research house', machina: 'Machina, Case N° 0001 — lastfomo', hortus: 'Hortus, nature research — lastfomo', arca: 'Arca, art & collections — lastfomo', start: 'Start a project — lastfomo' };
  let cur = null;
  let pendingAnchor = null;

  /* ---------------- colours come from the tokens, never from here ---------------- */
  const css = getComputedStyle(root);
  const rgb = (name) => {
    const h = css.getPropertyValue(name).trim().replace('#', '');
    const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(f.slice(0, 6), 16);
    return isNaN(n) ? [255, 255, 255] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const BASE = rgb('--void');
  const COLORS = { machina: rgb('--machina'), hortus: rgb('--hortus'), arca: rgb('--arca'), paper: rgb('--paper') };

  /* ---------------- live stipple plates: the brand naves, alive ---------------- */
  class Plate {
    constructor(cv) {
      this.cv = cv;
      this.ctx = cv.getContext('2d');
      this.col = COLORS[cv.dataset.plate] || COLORS.paper;
      this.dev = RM ? 1 : 0;
      this.hor = RM ? 1 : 0;
      this.started = false;
      this.visible = false;
      this.px = -999; this.py = -999;
      this.build();
    }
    build() {
      const r = this.cv.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) { this.ready = false; return; }
      const cell = 3;
      const gw = Math.max(16, Math.round(r.width / cell)), gh = Math.max(16, Math.round(r.height / cell));
      this.gw = gw; this.gh = gh;
      this.cv.width = gw; this.cv.height = gh;
      this.img = this.ctx.createImageData(gw, gh);
      const n = gw * gh;
      this.lit = new Float32Array(n); this.lum = new Float32Array(n);
      for (let i = 0; i < n; i++) { this.lit[i] = Math.random(); this.lum[i] = Math.random(); }
      // The horse is always whole: at most 80% of the width, centred, with clear margins on every side.
      const S = 4, W = gw * S, H = gh * S;
      const off = document.createElement('canvas'); off.width = W; off.height = H;
      const o = off.getContext('2d');
      const hs = Math.min(0.8 * W / 420, 0.6 * H / 120);
      o.translate((W - 420 * hs) / 2, H * 0.6 - 60 * hs); o.scale(hs, hs);
      o.fillStyle = css.getPropertyValue('--paper').trim(); o.fill(HORSE, 'evenodd');
      const d = o.getImageData(0, 0, W, H).data;
      this.mask = new Float32Array(n);
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
        let s = 0;
        for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) s += d[(((y * S + j) * W) + (x * S + i)) * 4 + 3];
        this.mask[y * gw + x] = s / (S * S * 255);
      }
      const P = Math.max(3, Math.round(hs * 3.2)), h2 = (P / 2) | 0;
      this.holes = new Uint8Array(n);
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) this.holes[y * gw + x] = (x % P === h2 && y % P === h2) ? 1 : 0;
      this.ready = true;
      this.draw();
    }
    start() {
      if (this.started || RM) return;
      this.started = true;
      const t0 = performance.now();
      const step = () => {
        const n = performance.now(), u = Math.min(1, Math.max(0, (n - t0) / 900)), h = Math.min(1, Math.max(0, (n - t0 - 450) / 800));
        this.dev = 1 - Math.pow(1 - u, 3); this.hor = 1 - Math.pow(1 - h, 3);
        if (u < 1 || h < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    draw() {
      if (!this.ready) return;
      const { gw, gh, lit, lum, mask, holes } = this, data = this.img.data, n = gw * gh;
      if (!RM) for (let k = 0, m = (n * 0.05) | 0; k < m; k++) { const i = (Math.random() * n) | 0; lit[i] = Math.random(); lum[i] = Math.random(); }
      const [cr, cg, cb] = this.col, [br, bg, bb] = BASE, px = this.px, py = this.py, rad2 = Math.pow(gw * 0.24, 2);
      const dev = this.dev, hor = this.hor;
      for (let y = 0, i = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++, i++) {
          const dx = x - px, dy = y - py, near = dx * dx + dy * dy < rad2;
          let v = 0;
          if (lit[i] < 0.46 * dev + (near ? 0.28 : 0)) v = 0.14 + 0.62 * Math.pow(lum[i], 1.4) + (near ? 0.18 : 0);
          if (mask[i] * hor + (lit[i] - 0.5) * 0.85 > 0.5) v = holes[i] ? 0.1 : 0.97;
          const q = i * 4;
          data[q] = br + (cr - br) * v; data[q + 1] = bg + (cg - bg) * v; data[q + 2] = bb + (cb - bb) * v; data[q + 3] = 255;
        }
      }
      this.ctx.putImageData(this.img, 0, 0);
    }
  }
  const plates = $$('canvas.plate').map((cv) => new Plate(cv));
  const pio = new IntersectionObserver((es) => es.forEach((e) => {
    const p = plates.find((x) => x.cv === e.target);
    if (!p) return;
    p.visible = e.isIntersecting;
    if (e.isIntersecting) { if (!p.ready) p.build(); p.start(); }
  }), { threshold: 0.2 });
  plates.forEach((p) => pio.observe(p.cv));
  let last = 0;
  const loop = (t) => {
    if (t - last > 90) { last = t; plates.forEach((p) => { if (p.visible && !document.hidden) p.draw(); }); }
    requestAnimationFrame(loop);
  };
  if (!RM) requestAnimationFrame(loop);
  addEventListener('pointermove', (e) => {
    plates.forEach((p) => {
      if (!p.visible || !p.ready) return;
      const r = p.cv.getBoundingClientRect();
      p.px = (e.clientX - r.left) / r.width * p.gw;
      p.py = (e.clientY - r.top) / r.height * p.gh;
    });
  }, { passive: true });
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => plates.forEach((p) => p.build()), 200); });

  /* ---------------- films that are not uploaded yet show their poster, without dead controls ---------------- */
  const posterFor = (k) => { const v = $('video.cv[data-reel="' + k + '"]'); return v ? v.getAttribute('poster') || '' : ''; };
  $$('video.cv').forEach((v) => { if (!has(REELS, v.dataset.reel)) v.removeAttribute('controls'); });

  /* ---------------- screens: reveal, wing colour, previews, counters ---------------- */
  const dotsNav = $('#dots'), prog = $('#prog');
  function count(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const to = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || '0', 10);
    const pre = el.dataset.prefix || '', suf = el.dataset.suffix || '', plain = el.dataset.plain === '1';
    if (RM || isNaN(to)) return;
    const from = plain ? Math.max(0, to - 60) : 0, t0 = performance.now();
    const step = () => {
      const u = Math.min(1, Math.max(0, (performance.now() - t0) / 1300)), e = 1 - Math.pow(1 - u, 3), v = from + (to - from) * e;
      el.textContent = pre + v.toFixed(dec) + suf;
      if (u < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function activate(view, secs, i) {
    const s = secs[i];
    if (!s) return;
    s.classList.add('in');
    document.body.dataset.wing = s.dataset.wing || view.dataset.wing || '';
    $$('button', dotsNav).forEach((b, j) => b.setAttribute('aria-current', j === i ? 'true' : 'false'));
    prog.style.width = (secs.length > 1 ? (i / (secs.length - 1)) * 100 : 100) + '%';
    $$('video.lp', view).forEach((v) => {
      if (s.contains(v) && !RM && has(LOOPS, v.dataset.loop)) {
        if (!v.src) v.src = LOOPS[v.dataset.loop];
        v.play().catch(() => {});
      } else { v.pause(); }
    });
    $$('video.cv', view).forEach((v) => {
      if (s.contains(v)) { if (!v.src && has(REELS, v.dataset.reel)) v.src = REELS[v.dataset.reel]; }
      else if (!v.paused) v.pause();
    });
    $$('[data-count]', s).forEach(count);
  }
  function setup(view) {
    const secs = $$('.screen', view);
    dotsNav.innerHTML = '';
    secs.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Go to ' + (s.dataset.title || 'section ' + (i + 1)));
      const sp = document.createElement('span'); sp.textContent = String(i + 1).padStart(2, '0') + ' ' + (s.dataset.title || '');
      b.append(sp, document.createElement('i'));
      b.addEventListener('click', () => s.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }));
      dotsNav.append(b);
    });
    if (!view._io) {
      // A screen counts as active once it fills half the view, so tall screens (the brief) still reveal.
      view._io = new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting && (e.intersectionRatio >= 0.55 || e.intersectionRect.height >= view.clientHeight * 0.5)) activate(view, secs, secs.indexOf(e.target));
      }), { root: view, threshold: [0, 0.25, 0.55, 0.8] });
      secs.forEach((s) => view._io.observe(s));
    }
    activate(view, secs, 0);
  }

  /* ---------------- routing between the house and the cases ---------------- */
  function scrollToId(id) {
    const el = document.getElementById(id);
    if (el && views.home.contains(el)) el.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
  }
  function swap(k) {
    Object.entries(views).forEach(([n, v]) => { v.hidden = n !== k; });
    $$('video').forEach((v) => { if (!v.paused) v.pause(); });
    cur = k;
    document.title = TITLES[k];
    const v = views[k];
    if (!pendingAnchor) v.scrollTop = 0;
    setup(v);
    plates.forEach((p) => { if (v.contains(p.cv) && !p.ready) p.build(); });
    v.focus({ preventScroll: true });
    if (pendingAnchor) { const a = pendingAnchor; pendingAnchor = null; requestAnimationFrame(() => scrollToId(a)); }
  }
  function show(k) {
    if (k === cur) { if (pendingAnchor) { const a = pendingAnchor; pendingAnchor = null; scrollToId(a); } return; }
    if (cur === null || RM) { swap(k); return; }
    const c = $('.curtain');
    c.classList.remove('on'); void c.offsetWidth; c.classList.add('on');
    setTimeout(() => swap(k), 380);
    setTimeout(() => c.classList.remove('on'), 950);
  }
  function route() {
    // "#/machina" inside the page; plain "#machina" also works, because an Artifact link only passes plain anchors.
    const m = location.hash.match(/^#\/?(machina|hortus|arca|start)\b/);
    show(m ? m[1] : 'home');
  }
  document.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (go) {
      e.preventDefault();
      pendingAnchor = go.dataset.go;
      if (cur !== 'home') { if (location.hash === '#/' || location.hash === '') show('home'); else location.hash = '#/'; }
      else show('home');
      return;
    }
    const sc = e.target.closest('[data-scroll]');
    if (sc) { e.preventDefault(); const t = document.getElementById(sc.dataset.scroll); if (t) t.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }); return; }
    const pl = e.target.closest('[data-play]');
    if (pl) { e.preventDefault(); openReel(pl.dataset.play); }
  });
  addEventListener('hashchange', route);

  /* ---------------- film player ---------------- */
  const dlg = $('#reel'), rv = $('#reel-v'), note = $('#reel-note');
  function openReel(k) {
    note.textContent = '';
    if (has(REELS, k)) { rv.src = REELS[k]; rv.removeAttribute('poster'); rv.controls = true; }
    else { rv.removeAttribute('src'); rv.poster = posterFor(k); rv.controls = false; note.textContent = 'This film is still being uploaded.'; }
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    if (has(REELS, k)) rv.play().catch(() => {});
  }
  function closeReel() { rv.pause(); rv.removeAttribute('src'); rv.load(); if (dlg.open) dlg.close(); else dlg.removeAttribute('open'); }
  $('#reel-x').addEventListener('click', closeReel);
  dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.classList.contains('reel-in')) closeReel(); });
  dlg.addEventListener('close', () => { rv.pause(); });

  /* ---------------- the plus cursor ---------------- */
  if (FINE && !RM) {
    const c = $('.cur');
    let x = -100, y = -100, tx = -100, ty = -100;
    addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY; c.style.opacity = '1';
      c.classList.toggle('hot', !!e.target.closest('a,button,[data-play],[data-go]'));
    }, { passive: true });
    document.addEventListener('pointerleave', () => { c.style.opacity = '0'; });
    const follow = () => { x += (tx - x) * 0.22; y += (ty - y) * 0.22; c.style.transform = 'translate(' + x + 'px,' + y + 'px)'; requestAnimationFrame(follow); };
    requestAnimationFrame(follow);
  }

  /* ---------------- theme: follow the viewer, or Night / Day by choice ---------------- */
  const themeBtn = $('#theme');
  if (themeBtn) {
    const ORDER = ['auto', 'dark', 'light'];
    const LABEL = { auto: 'Theme · Auto', dark: 'Theme · Night', light: 'Theme · Day' };
    const hostTheme = root.getAttribute('data-host-theme') || '';
    let pref = 'auto';
    try { const t = localStorage.getItem('lf-theme'); if (t === 'dark' || t === 'light') pref = t; } catch (_) { /* storage blocked: stay on auto */ }
    const apply = () => {
      if (pref === 'auto') { if (hostTheme) root.setAttribute('data-theme', hostTheme); else root.removeAttribute('data-theme'); }
      else root.setAttribute('data-theme', pref);
      themeBtn.textContent = LABEL[pref];
    };
    themeBtn.addEventListener('click', () => {
      pref = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
      try { if (pref === 'auto') localStorage.removeItem('lf-theme'); else localStorage.setItem('lf-theme', pref); } catch (_) { /* per-viewer convenience only */ }
      apply();
    });
    apply();
  }

  /* ---------------- start a project: compose the brief ---------------- */
  const CONTACT = '[YOUR EMAIL]';
  const live = CONTACT.indexOf('@') > 0;
  const form = $('#brief'), sent = $('#sent'), out = $('#brief-text'), copyBtn = $('#copy-brief');
  if (form && sent) {
    $('#contact-mail').textContent = CONTACT;
    if (live) $('#sent-lead').firstChild.textContent = 'Your email app may open with the brief filled in. If it does not, copy the brief and send it to ';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const f = new FormData(form);
      const wing = String(f.get('wing') || 'Not sure yet'), name = String(f.get('name') || '').trim();
      const body = ['Wing: ' + wing, 'Name: ' + name, 'Email: ' + f.get('email'), 'Organisation: ' + (String(f.get('org') || '').trim() || 'not given'),
        'Timeline: ' + f.get('timeline'), '', String(f.get('brief') || '').trim()].join('\n');
      out.textContent = body;
      copyBtn.textContent = 'Copy the brief';
      form.hidden = true; sent.hidden = false; sent.focus({ preventScroll: true });
      if (live) {
        location.href = 'mailto:' + CONTACT + '?subject=' + encodeURIComponent('Project brief: ' + wing + ', ' + name) + '&body=' + encodeURIComponent(body);
      }
    });
    copyBtn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(out.textContent); copyBtn.textContent = 'Copied'; }
      catch (_) { const r = document.createRange(); r.selectNodeContents(out); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); copyBtn.textContent = 'Selected, press copy'; }
    });
    $('#brief-again').addEventListener('click', () => { sent.hidden = true; form.hidden = false; form.querySelector('input[name="name"]').focus(); });
  }

  route();
})();
