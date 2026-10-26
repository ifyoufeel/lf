(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;

  /* ---------------- media manifest (site/media.json, filled in by the build) ---------------- */
  let MEDIA = {};
  try { MEDIA = JSON.parse(($('#lf-media') || {}).textContent || '{}'); } catch (_) { MEDIA = {}; }
  const LOOPS = MEDIA.loops || {};
  const COVERS = MEDIA.covers || {};
  const FILMS = MEDIA.films || {};
  // The web build plays films in place; an Artifact cannot embed other sites, so there the links open YouTube.
  const EMBED = MEDIA.embed !== false;
  const BRIEF_URL = typeof MEDIA.brief === 'string' ? MEDIA.brief : ''; // the web build posts the brief here; the Artifact has none
  // A loop is { mp4, webm } (or one path); pick what this browser decodes. Some builds ship without H.264.
  const probe = document.createElement('video');
  const loopSrc = (k) => {
    const l = LOOPS[k];
    if (!l) return '';
    if (typeof l === 'string') return l;
    return (l.mp4 && probe.canPlayType('video/mp4; codecs="avc1.640028"')) ? l.mp4 : (l.webm && probe.canPlayType('video/webm; codecs="vp9"')) ? l.webm : (l.mp4 || '');
  };
  // Case cover footage is { av1, mp4 }: the owner's 2560×1440 AV1 file where it decodes, else the 1280×720 H.264 copy.
  // Phones take the H.264 copy first, since every phone decodes it in hardware. The Artifact carries only the copy.
  const narrow = matchMedia('(max-width: 900px)');
  const coverSrc = (k) => {
    const c = COVERS[k];
    if (!c) return '';
    const av1 = c.av1 && probe.canPlayType('video/mp4; codecs="av01.0.12M.10"') ? c.av1 : '';
    const avc = c.mp4 && probe.canPlayType('video/mp4; codecs="avc1.640028"') ? c.mp4 : '';
    return narrow.matches ? avc || av1 : av1 || avc; // neither: the poster stands
  };
  const filmId = (k) => (FILMS[k] && /^[\w-]{11}$/.test(FILMS[k].youtube || '') ? FILMS[k].youtube : '');
  // Inside an Artifact a film plays from the page's own asset store (set by the build); otherwise from YouTube.
  const filmSrc = (k) => (FILMS[k] && typeof FILMS[k].src === 'string' ? FILMS[k].src : '');
  const inPage = (k) => (EMBED && filmId(k)) || (!EMBED && filmSrc(k));
  const NAMES = { machina: 'Machina', hortus: 'Hortus', arca: 'Arca' };

  // The exact Figma horse (Logo/Mark 9:3). brand/marks/horse.svg is the source; the brand check keeps them identical.
  const HORSE = new Path2D("M322.101 1.53716C320.348 2.91274 319.256 3.04607 312.945 2.65567C306.632 2.26447 305.449 2.40897 302.994 3.87317C301.461 4.7865 298.595 6.29781 296.625 7.23109C294.655 8.16358 292.505 9.19666 291.848 9.52479C291.074 9.91279 290.742 11.001 290.904 12.6153C291.159 15.1556 290.591 15.5205 286.943 15.1612C284.536 14.9249 284.411 16.8258 286.713 18.666C290.052 21.3366 280.896 33.3256 275.917 32.8019C273.957 32.5959 273.62 32.8657 273.397 34.8129C273.13 37.1482 272.314 37.3813 267.256 36.5693C264.172 36.0743 264.506 37.8116 267.86 39.7013C273.171 42.6952 282.031 40.4111 290.636 33.8286C293.788 31.4175 294.967 31.7648 298.904 36.262C302.231 40.0614 302.251 40.0198 295.63 43.1319C288.638 46.4187 278.291 46.7133 268.85 43.8959C265.955 43.0313 260.899 41.813 257.615 41.1871C254.331 40.5619 246.542 38.7489 240.305 37.1593C225.232 33.3168 216.24 33.201 199.61 36.6372C182.405 40.1923 180.226 40.3208 172.533 38.2395C156.02 33.7711 141.289 40.8885 116.24 65.4365C87.5356 93.5685 68.5251 101.841 56.5125 91.428C52.7374 88.1556 53.2039 86.7983 58.717 85.022C80.3809 78.0411 90.8641 63.0255 78.5458 56.6202C73.0988 53.7884 64.3853 55.8075 56.7132 61.681C54.7253 63.2027 50.6619 65.2457 47.6828 66.2205C34.6862 70.4742 21.2796 80.3204 12.5439 92.0276C9.49555 96.1128 5.29683 100.96 3.21419 102.798C-1.1318 106.634 -1.06413 107.74 3.37819 105.457C7.05386 103.567 11.6968 99.05 15.0047 94.1457C19.9446 86.8199 21.9651 85.3956 21.9651 89.2365C21.9651 92.0771 23.4721 96.5408 24.4315 96.5408C24.8263 96.5408 25.1496 96.1703 25.1496 95.7168C25.1496 92.6551 27.5952 89.1288 28.6835 90.6201C29.7495 92.0803 29.943 91.9949 32.9252 88.7567C36.4082 84.9757 36.2108 85.0244 43.1641 86.2387C47.8205 87.0514 48.4288 87.4123 51.7892 91.357C65.964 107.996 89.8013 99.9841 126.35 66.298C144.675 49.4078 150.883 46.2439 165.696 46.2439C177.439 46.2439 179.814 47.5213 176.76 52.1949C175.232 54.5341 175.133 58.6361 176.445 65.284C177.247 69.3445 177.247 70.475 176.448 70.9708C173.76 72.6362 159.196 73.3443 151.642 72.1763C147.518 71.5384 145.366 73.3132 145.36 77.3585C145.353 82.2221 128.895 99.7885 122.892 101.34C115.95 103.134 114.366 103.879 110.799 107.027C104.039 112.994 106.86 114.569 117.671 110.863C128.5 107.149 128.909 106.867 140.188 95.3265C153.829 81.3703 153.741 81.4118 163.559 84.3019C175.953 87.9496 190.66 86.487 201.83 80.4961C206.816 77.8216 207.396 77.7665 213.559 79.376C216.081 80.0346 219.725 80.5735 221.657 80.5735C225.947 80.5735 225.565 81.2337 218.093 86.7361C211.051 91.9214 211.307 92.822 220.409 94.9009C224.466 95.8278 229.699 97.4756 232.039 98.563C234.379 99.6504 239.024 101.242 242.363 102.099C251.276 104.389 252.174 106.287 247.664 113.306C241.691 122.603 248.317 121.646 260.386 111.47C267.603 105.385 262.642 98.6636 248.212 94.9784C231.949 90.8245 230.512 89.4593 238.845 86.075C245.772 83.2608 252.218 76.6942 254.693 69.9289C255.537 67.6208 256.984 68.7673 258.109 72.6378C261.071 82.8265 269.803 87.2215 287.868 87.6175C299.163 87.8642 301.227 88.1068 302.596 89.3483C303.472 90.1419 307.548 92.8244 311.656 95.3089C326.608 104.354 327.287 105.407 320.555 109.115C313.554 112.971 304.892 112.971 301.877 109.115C300.087 106.826 299.661 106.638 298.252 107.515C296.911 108.351 295.939 108.192 292.163 106.517C286.892 104.18 285.267 104.053 283.484 105.841C279.964 109.371 300.701 121.934 306.438 119.746C307.665 119.278 310.264 118.895 312.211 118.895C314.159 118.895 318.337 118.176 321.498 117.298C324.658 116.42 328.505 115.676 330.046 115.646C334.342 115.559 335.709 114.697 336.982 111.269C339.197 105.304 339.164 105.053 335.921 103.327C329.752 100.042 325.115 93.9221 323.406 86.8095C322.712 83.9202 324.007 83.3103 325.615 85.7701C327.394 88.4933 346.535 88.7376 356.334 86.162C359.618 85.299 363.737 84.5845 365.489 84.5741C367.24 84.5637 369.7 84.0184 370.953 83.363C372.208 82.7067 373.669 82.1702 374.2 82.1702C376.474 82.1702 399.232 93.5285 402.423 96.2557C405.397 98.7985 416.519 103.726 419.284 103.726C420.49 103.726 420.122 101.104 418.556 98.5367C417.437 96.702 413.841 94.5153 403.198 89.1958C395.554 85.3756 386.849 80.4362 383.854 78.2183C377.31 73.3746 372.212 72.7751 364.84 75.9829C359.614 78.2574 346.865 78.6055 344.796 76.5314C342.695 74.4237 342.461 57.5423 344.463 52.4496C349.497 39.643 361.461 34.8225 361.496 45.5868C361.512 50.4066 363.672 53.3557 368.324 54.9053C370.267 55.5528 373.291 56.9356 375.042 57.9782C376.794 59.0209 379.458 60.4324 380.962 61.115C382.468 61.7984 384.83 63.2227 386.213 64.2797C392.676 69.224 399.272 63.6115 393.913 57.7267C387.154 50.3068 385.115 46.3876 384.558 39.7548C384.366 37.4675 383.451 34.025 382.524 32.1041C381.179 29.3178 380.94 27.7714 381.34 24.4542C382.308 16.4155 374.85 9.54474 373.726 17.4406C373.414 19.6281 372.39 20.2093 370.718 19.149C369.766 18.5463 369.739 17.8884 370.55 15.1724C371.759 11.1271 370.633 6.22275 367.858 3.43966C364.402 -0.0260346 362.312 1.35194 364.693 5.52738C367.205 9.93435 365.952 10.5443 362.421 6.63392C358.956 2.79539 358.956 2.79538 352.271 2.62613C342.432 2.37704 334.807 1.68645 331.66 0.758755C327.501 -0.466732 324.323 -0.208058 322.101 1.53716ZM332.511 6.26428C334.573 8.33124 334.839 9.15195 334.839 13.4495C334.839 18.6988 333.952 19.569 332.135 16.1057C331.501 14.8986 329.164 12.1274 326.939 9.94871C321.859 4.96932 321.79 3.93066 326.541 3.93066C329.506 3.93066 330.617 4.36497 332.511 6.26428ZM302.886 24.7424C306.421 26.7582 308.426 29.3657 309.114 32.8402C309.633 35.466 309.633 35.466 306.112 32.5807C300.89 28.3007 297.288 26.2912 294.834 26.288C292.475 26.2848 292.082 25.5711 293.6 24.0494C295.075 22.57 299.679 22.9133 302.886 24.7424ZM76.9942 59.0696C80.931 61.1829 79.8522 66.8888 75.2101 68.5118C70.2272 70.2539 60.5918 69.0092 59.6309 66.5C57.9097 61.9996 71.5655 56.1564 76.9942 59.0696Z");
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(pointer: fine)').matches;
  // Every main.view is a route. The Hortus hardware views come from site/shop.json and carry their own page titles.
  const views = Object.fromEntries($$('main.view[data-view]').map((v) => [v.dataset.view, v]));
  const TITLES = { home: 'lastfomo research house', machina: 'Machina, Case N° 0001 — lastfomo', hortus: 'Hortus, nature research — lastfomo', arca: 'Arca, art & artifacts — lastfomo', start: 'Start a project — lastfomo', explore: 'Explore — lastfomo' };
  let cur = null;
  let pendingAnchor = null;
  // The walk (site/explore.js) opens at #/explore, the house, and at #/explore/<wing>. It borrows the exact horse.
  const XP = window.lfExplore || null;
  if (XP) XP.init({ horse: HORSE });
  let xpWing = '';
  const titleOf = (k) => (k === 'explore' && xpWing ? 'Explore ' + NAMES[xpWing] + ' — lastfomo' : TITLES[k] || (views[k] && views[k].dataset.pageTitle) || TITLES.home);
  let stage = () => {}; // the theme section below fills it in

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
  // They twinkle for 5 s after they appear or the pointer moves, then hold still (WCAG 2.2.2), and wake under the cursor.
  let liveUntil = 0;
  const twinkling = () => !RM && performance.now() < liveUntil;
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
      if (twinkling()) for (let k = 0, m = (n * 0.05) | 0; k < m; k++) { const i = (Math.random() * n) | 0; lit[i] = Math.random(); lum[i] = Math.random(); }
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
    if (e.isIntersecting) { if (!p.ready) p.build(); p.start(); wake(); }
  }), { threshold: 0.2 });
  plates.forEach((p) => pio.observe(p.cv));
  // The draw loop runs only while a plate is visible and awake, so an idle page does no work.
  let last = 0, looping = false;
  const loop = (t) => {
    const vis = plates.filter((p) => p.visible && p.ready);
    if (!vis.length || document.hidden || performance.now() > liveUntil + 200) { looping = false; return; }
    if (t - last > 90) { last = t; vis.forEach((p) => p.draw()); }
    requestAnimationFrame(loop);
  };
  function wake() {
    if (RM) return;
    liveUntil = performance.now() + 5000;
    if (!looping) { looping = true; requestAnimationFrame(loop); }
  }
  addEventListener('pointermove', (e) => {
    let near = false;
    plates.forEach((p) => {
      if (!p.visible || !p.ready) return;
      const r = p.cv.getBoundingClientRect();
      p.px = (e.clientX - r.left) / r.width * p.gw;
      p.py = (e.clientY - r.top) / r.height * p.gh;
      near = true;
    });
    if (near) wake();
  }, { passive: true });
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => plates.forEach((p) => p.build()), 200); });

  /* ---------------- films: real links, played in place where the page may embed ---------------- */
  const embedSrc = (k) => 'https://www.youtube-nocookie.com/embed/' + filmId(k) + '?autoplay=1&rel=0&playsinline=1';
  const filmFrame = (k) => {
    if (!EMBED && filmSrc(k)) {
      const v = document.createElement('video');
      v.src = filmSrc(k); v.controls = true; v.autoplay = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('aria-label', (NAMES[k] || 'lastfomo') + ' film');
      return v;
    }
    const f = document.createElement('iframe');
    f.src = embedSrc(k);
    f.title = (NAMES[k] || 'lastfomo') + ' film';
    f.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
    f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    return f;
  };
  $$('a[data-play]').forEach((a) => {
    // Three "Play the film" buttons share one visible label; the name says which film, and where it opens.
    const label = a.getAttribute('aria-label') || a.textContent.trim() + ', ' + (NAMES[a.dataset.play] || '');
    const here = inPage(a.dataset.play);
    a.setAttribute('aria-label', here ? label : label + ' (opens YouTube in a new tab)');
    if (here) return;
    const ne = '<svg aria-hidden="true"><use href="#g-ne"/></svg>';
    if (a.classList.contains('btn')) a.insertAdjacentHTML('beforeend', ne);
    else a.querySelector('.pl')?.insertAdjacentHTML('beforeend', ne);
  });

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
  // A loop plays once each time its screen becomes active and holds on media.json's "hold" frame (or its last).
  $$('video.lp').forEach((v) => {
    v.loop = false;
    const hold = Number((LOOPS[v.dataset.loop] || {}).hold) || 0;
    if (!hold) return;
    const check = () => { if (v.currentTime >= hold) v.pause(); else if (!v.paused && v.requestVideoFrameCallback) v.requestVideoFrameCallback(check); };
    v.addEventListener('play', check);
    v.addEventListener('timeupdate', check);
  });
  // Case cover footage loops for as long as its cover is the active screen of the open page, the tab is in view and no
  // film is open; anywhere else it pauses, and it loads only once its cover is first active. It has no pause control, by
  // the owner's choice; reduced motion keeps the poster.
  function runCover(v) {
    const view = v.closest('main.view'), src = coverSrc(v.dataset.cover);
    const on = src && !RM && !document.hidden && !$('#reel[open]') && view && !view.hidden && view._active === v.closest('.screen');
    if (on) {
      if (!v.src) { v.loop = true; v.src = src; }
      v.play().catch(() => {});
    } else if (!v.paused) v.pause();
  }
  const runCovers = () => $$('video.cover-v').forEach(runCover);
  document.addEventListener('visibilitychange', runCovers);
  function activate(view, secs, i) {
    const s = secs[i];
    if (!s) return;
    const fresh = view._active !== s;
    view._active = s;
    runCovers();
    s.classList.add('in');
    document.body.dataset.wing = s.dataset.wing || view.dataset.wing || '';
    $$('button', dotsNav).forEach((b, j) => b.setAttribute('aria-current', j === i ? 'true' : 'false'));
    prog.style.width = (secs.length > 1 ? (i / (secs.length - 1)) * 100 : 100) + '%';
    $$('video.lp', view).forEach((v) => {
      if (s.contains(v) && !RM && loopSrc(v.dataset.loop)) {
        if (!v.src) v.src = loopSrc(v.dataset.loop);
        if (fresh) { v.currentTime = 0; v.play().catch(() => {}); }
      } else { v.pause(); }
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
  // The header’s directory trail: Home, then each parent page, then this one. The house itself shows none.
  const crumbNav = $('#crumbs');
  const hrefOf = (key) => '#/' + (key.startsWith('hw-') ? 'hardware/' + key.slice(3) : key);
  function crumbs(view) {
    if (!crumbNav) return;
    const ol = crumbNav.querySelector('ol');
    while (ol.children.length > 1) ol.lastElementChild.remove();
    const trail = [];
    for (let n = view; n && n.dataset.crumb; n = views[n.dataset.crumbParent]) trail.unshift({ href: hrefOf(n.dataset.view), label: n.dataset.crumb, icon: n.dataset.crumbIcon });
    // Inside the walk the wing joins the trail, and the walk itself shows as its glyph: Home / Explore / Hortus.
    if (view === views.explore && xpWing) trail.push({ label: NAMES[xpWing] });
    trail.forEach((c, i) => {
      const li = document.createElement('li');
      const box = i === trail.length - 1 ? li : document.createElement('a');
      if (c.icon) {
        box.insertAdjacentHTML('beforeend', '<svg aria-hidden="true"><use href="#g-' + c.icon + '"/></svg>');
        const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = c.label; box.append(sr);
      } else box.textContent = c.label;
      if (box === li) li.setAttribute('aria-current', 'page');
      else { box.href = c.href; li.append(box); }
      ol.append(li);
    });
    crumbNav.hidden = trail.length === 0;
  }
  let want = null, swapT = 0, offT = 0;
  function swap(k) {
    const was = cur;
    if (views[cur]) views[cur]._y = views[cur].scrollTop;
    if (dlg.open) closeReel();
    if (XP && was === 'explore' && k !== 'explore') XP.leave();
    Object.entries(views).forEach(([n, v]) => { v.hidden = n !== k; });
    $$('video').forEach((v) => { if (!v.paused) v.pause(); });
    const bk = $('#basket');
    if (bk && bk.open) bk.close();
    cur = k;
    const v = views[k];
    // The walk is a dark stage: the header trades Start a project for the walk's settings and takes the night tokens.
    document.body.classList.toggle('xp-on', k === 'explore');
    stage(k === 'explore');
    document.title = titleOf(k);
    crumbs(v);
    // Back to the house returns to the screen the visitor left; a case always opens at its cover.
    if (!pendingAnchor) v.scrollTop = (k === 'home' && v._y) || 0;
    setup(v);
    plates.forEach((p) => { if (v.contains(p.cv) && !p.ready) p.build(); });
    v.focus({ preventScroll: true });
    if (pendingAnchor) { const a = pendingAnchor; pendingAnchor = null; requestAnimationFrame(() => scrollToId(a)); }
    if (XP && k === 'explore') XP.enter(xpWing);
  }
  function show(k) {
    // One route can be pending under the curtain; a newer one replaces it, so the URL and the view never part.
    if (k === (want ?? cur)) { if (want === null && pendingAnchor) { const a = pendingAnchor; pendingAnchor = null; scrollToId(a); } return; }
    clearTimeout(swapT); clearTimeout(offT);
    if (cur === null || RM) { want = null; swap(k); return; }
    want = k;
    const c = $('.curtain');
    c.classList.remove('on'); void c.offsetWidth; c.classList.add('on');
    swapT = setTimeout(() => { want = null; swap(k); }, 380);
    offT = setTimeout(() => c.classList.remove('on'), 950);
  }
  function route() {
    // "#/machina" inside the page; plain "#machina" also works, because an Artifact link only passes plain anchors.
    // "#/hardware" and "#/hardware/<product>" open the Hortus hardware; a page built without it opens the Hortus case.
    const hw = location.hash.match(/^#\/?hardware(?:\/([a-z0-9-]+))?\/?$/);
    if (hw) { show(views['hw-' + hw[1]] ? 'hw-' + hw[1] : views.hardware ? 'hardware' : 'hortus'); return; }
    // "#/compute" is the Machina compute and "#/market" the Arca market; a page built without them opens the wing.
    const mk = location.hash.match(/^#\/?(compute|market)\/?$/);
    if (mk) { show(views[mk[1]] ? mk[1] : mk[1] === 'compute' ? 'machina' : 'arca'); return; }
    // "#/explore" walks the house; "#/explore/<wing>" (or "#explore-hortus", from an Artifact link) opens a wing.
    const xp = views.explore && location.hash.match(/^#\/?explore(?:[\/-](hortus|machina|arca))?\/?$/);
    if (xp) {
      xpWing = xp[1] || '';
      // Already walking: the walk changes worlds under its own curtain, and the trail and title follow.
      if (cur === 'explore' && want === null) { document.title = titleOf('explore'); crumbs(views.explore); if (XP) XP.enter(xpWing); return; }
      show('explore');
      return;
    }
    const m = location.hash.match(/^#\/?(machina|hortus|arca|start)\b/);
    show(m ? m[1] : 'home');
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('.skip')) { e.preventDefault(); views[cur].focus({ preventScroll: true }); return; }
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
    if (e.target.closest('[data-reels]')) { e.preventDefault(); openPicker(); return; }
    const pl = e.target.closest('[data-play]');
    if (pl && inPage(pl.dataset.play)) { e.preventDefault(); openReel(pl.dataset.play); }
  });
  addEventListener('hashchange', route);

  /* ---------------- film player ---------------- */
  const dlg = $('#reel'), slot = $('#reel-frame'), pick = $('#reel-pick');
  let opener = null;
  const openDialog = () => {
    if (dlg.open) return;
    opener = document.activeElement;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    runCovers();
  };
  // Watch the films: the three films to choose from, in the same dialog that plays them.
  function openPicker() {
    slot.replaceChildren(); pick.hidden = false;
    dlg.setAttribute('aria-label', 'The films');
    openDialog();
    $('#reel-x').focus();
  }
  // A film chosen in the picker plays in its place; focus still returns to the control that opened the dialog.
  function openReel(k) {
    pick.hidden = true;
    slot.replaceChildren(filmFrame(k));
    dlg.setAttribute('aria-label', (NAMES[k] || 'lastfomo') + ' film');
    openDialog();
    // Start on Close, not inside the cross-origin player, so Escape (handled by the page) closes the dialog.
    $('#reel-x').focus();
  }
  // Remove the player first, so the film stops at once; Escape reaches the same cleanup through the close event.
  function closeReel() { slot.replaceChildren(); if (dlg.open) dlg.close(); else { dlg.removeAttribute('open'); dlg.dispatchEvent(new Event('close')); } }
  $('#reel-x').addEventListener('click', closeReel);
  dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.classList.contains('reel-in')) closeReel(); });
  // Closing removes the player, which stops the film; focus returns to the control that opened it.
  dlg.addEventListener('close', () => { slot.replaceChildren(); pick.hidden = true; if (opener && opener.focus) opener.focus({ preventScroll: true }); opener = null; runCovers(); });

  /* ---------------- the plus cursor ---------------- */
  if (FINE && !RM) {
    const c = $('.cur');
    let x = -100, y = -100, tx = -100, ty = -100, following = false;
    // Eases toward the pointer and stops once it arrives, so a still pointer costs nothing.
    const follow = () => {
      x += (tx - x) * 0.22; y += (ty - y) * 0.22;
      c.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      if (Math.abs(tx - x) + Math.abs(ty - y) > 0.3) requestAnimationFrame(follow); else following = false;
    };
    addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY; c.style.opacity = '1';
      c.classList.toggle('hot', !!e.target.closest('a,button,[data-play],[data-go]'));
      if (!following) { following = true; requestAnimationFrame(follow); }
    }, { passive: true });
    document.addEventListener('pointerleave', () => { c.style.opacity = '0'; });
  }

  /* ---------------- theme: follow the viewer, or Night / Day by choice ---------------- */
  const themeBtn = $('#theme');
  {
    const ORDER = ['auto', 'dark', 'light'];
    const LABEL = { auto: 'Theme · Auto', dark: 'Theme · Night', light: 'Theme · Day' };
    const hostTheme = root.getAttribute('data-host-theme') || '';
    let pref = 'auto';
    try { const t = localStorage.getItem('lf-theme'); if (t === 'dark' || t === 'light') pref = t; } catch (_) { /* storage blocked: stay on auto */ }
    const apply = () => {
      if (pref === 'auto') { if (hostTheme) root.setAttribute('data-theme', hostTheme); else root.removeAttribute('data-theme'); }
      else root.setAttribute('data-theme', pref);
      if (themeBtn) themeBtn.textContent = LABEL[pref];
    };
    if (themeBtn) themeBtn.addEventListener('click', () => {
      pref = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
      try { if (pref === 'auto') localStorage.removeItem('lf-theme'); else localStorage.setItem('lf-theme', pref); } catch (_) { /* per-viewer convenience only */ }
      apply();
    });
    // The walk is a dark stage: night tokens while it is open, the viewer's own theme again after.
    stage = (on) => { if (on) root.setAttribute('data-theme', 'dark'); else apply(); };
    apply();
  }

  /* ---------------- start a project: compose the brief ---------------- */
  const CONTACT = 'lastfomo@gmail.com';
  const live = CONTACT.indexOf('@') > 0;
  const form = $('#brief'), sent = $('#sent'), out = $('#brief-text'), copyBtn = $('#copy-brief');
  if (form && sent) {
    const title = $('#sent-title'), lead = $('#sent-lead'), submit = form.querySelector('button[type="submit"]');
    const leadText = live ? 'Your email app may open with the brief filled in. If it does not, copy the brief and send it to ' : lead.firstChild.textContent;
    const shownAt = Date.now(); // the server refuses briefs filled faster than a person types; edits keep the time already spent
    $('#contact-mail').textContent = CONTACT;
    const show = (wasSent) => {
      title.textContent = wasSent ? 'Brief sent.' : 'Brief ready.';
      lead.firstChild.textContent = wasSent ? 'It is on its way to ' : leadText;
      copyBtn.textContent = 'Copy the brief';
      form.hidden = true; sent.hidden = false; sent.focus({ preventScroll: true });
    };
    // Posts the brief to the house inbox; resolves true only when the server says it was sent.
    const post = async (f) => {
      if (!BRIEF_URL) return false;
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 15000);
      try {
        const res = await fetch(BRIEF_URL, {
          method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctl.signal,
          body: JSON.stringify({ wing: f.get('wing'), name: f.get('name'), email: f.get('email'), org: f.get('org'),
            timeline: f.get('timeline'), brief: f.get('brief'), website: f.get('website'), elapsed: Date.now() - shownAt }),
        });
        return res.ok && (await res.json()).ok === true;
      } catch (_) { return false; } finally { clearTimeout(timer); }
    };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submit.disabled || !form.reportValidity()) return;
      const f = new FormData(form);
      const wing = String(f.get('wing') || 'Not sure yet'), name = String(f.get('name') || '').trim();
      const body = ['Wing: ' + wing, 'Name: ' + name, 'Email: ' + f.get('email'), 'Organisation: ' + (String(f.get('org') || '').trim() || 'not given'),
        'Timeline: ' + f.get('timeline'), '', String(f.get('brief') || '').trim()].join('\n');
      out.textContent = body;
      const label = submit.textContent;
      submit.disabled = true; submit.textContent = 'Sending…'; form.setAttribute('aria-busy', 'true');
      const ok = await post(f);
      submit.disabled = false; submit.textContent = label; form.removeAttribute('aria-busy');
      show(ok);
      if (!ok && live) {
        location.href = 'mailto:' + CONTACT + '?subject=' + encodeURIComponent('Project brief: ' + wing + ', ' + name) + '&body=' + encodeURIComponent(body);
      }
    });
    copyBtn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(out.textContent); copyBtn.textContent = 'Copied'; }
      catch (_) { const r = document.createRange(); r.selectNodeContents(out); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); copyBtn.textContent = 'Selected, press copy'; }
    });
    $('#brief-again').addEventListener('click', () => { sent.hidden = true; form.hidden = false; form.querySelector('input[name="name"]').focus(); });
  }

  /* ---------------- the basket and the order (site/shop.json, rendered by the build) ---------------- */
  // Hortus hardware at its prices, and the lines the other wings price by email: Arca coins and art, Machina builds and
  // sourcing. Nothing is charged on the page: the order goes to the house inbox as an email.
  let SHOP = null;
  try { SHOP = JSON.parse(($('#lf-shop') || {}).textContent || 'null'); } catch (_) { SHOP = null; }
  const bk = $('#basket');
  if (SHOP && bk) {
    const BY = Object.fromEntries(SHOP.products.map((p) => [p.slug, p]));
    const MAX = 99;
    const money = (n) => SHOP.symbol + n.toLocaleString('en-GB');
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const lines = $('#basket-lines'), badge = $('#basket-count'), main = $('#basket-main'), order = $('#order'), done = $('#order-sent');
    const title = $('#basket-title'), status = $('#basket-status'), copyOrder = $('#copy-order');
    // A line is a product the page lists, or a request a page composed (a Machina build or sourcing), kept with its words.
    // Both stay in this browser, so a visitor can come back to them; with storage blocked they last the visit.
    let items = {}, asks = {};
    const WINGS = ['hortus', 'machina', 'arca'];
    const askOk = (k, a) => /^[a-z0-9-]{1,80}$/.test(k) && !BY[k] && a && typeof a.name === 'string' && typeof a.kind === 'string' && WINGS.includes(a.wing)
      && (a.href == null || /^#\/[a-z0-9/-]*$/.test(a.href)) && (a.note == null || typeof a.note === 'string');
    const tidy = (a) => ({ name: a.name.slice(0, 140), kind: a.kind.slice(0, 140), wing: a.wing, href: a.href || '', note: (a.note || '').slice(0, 500), price: null });
    const info = (k) => BY[k] || asks[k];
    try {
      const saved = JSON.parse(localStorage.getItem('lf-asks') || '{}');
      for (const [k, a] of Object.entries(saved || {})) if (askOk(k, a)) asks[k] = tidy(a);
      const got = JSON.parse(localStorage.getItem('lf-basket') || '{}');
      for (const [k, q] of Object.entries(got || {})) if (info(k) && Number.isInteger(q) && q > 0) items[k] = Math.min(q, MAX);
    } catch (_) { items = {}; asks = {}; }
    const save = () => {
      for (const k of Object.keys(asks)) if (!items[k]) delete asks[k];
      try { localStorage.setItem('lf-basket', JSON.stringify(items)); localStorage.setItem('lf-asks', JSON.stringify(asks)); } catch (_) { /* per-viewer convenience only */ }
    };
    const priced = (k) => typeof info(k).price === 'number';
    const count = () => Object.values(items).reduce((a, q) => a + q, 0);
    const total = () => Object.entries(items).reduce((a, [k, q]) => a + (priced(k) ? info(k).price * q : 0), 0);
    const line = (k, q) => {
      const p = info(k), li = el('li', 'line');
      const box = el('div', 'li');
      const name = el('a', 'ln', p.name); name.href = p.href || '#/';
      box.append(name, el('span', 'lk', p.kind + (priced(k) ? ' · ' + money(p.price) : '')));
      if (p.note) box.append(el('span', 'lk ln-note', p.note));
      const step = el('div', 'qty');
      const btn = (d, label, text) => { const b = el('button', 'q', text); b.type = 'button'; b.dataset.slug = k; b.dataset.q = d; b.setAttribute('aria-label', label + p.name); return b; };
      const less = btn('-1', 'One fewer ', '−'), more = btn('1', 'One more ', '+');
      less.disabled = q <= 1; more.disabled = q >= MAX;
      const val = el('span', 'qv', String(q)); val.setAttribute('aria-label', 'Quantity ' + q);
      step.append(less, val, more);
      const rm = el('button', 'rm', 'Remove'); rm.type = 'button'; rm.dataset.rm = k; rm.setAttribute('aria-label', 'Remove ' + p.name);
      li.append(box, step, el('b', 'lt', priced(k) ? money(p.price * q) : 'By email'), rm);
      return li;
    };
    const render = () => {
      const n = count(), anyPriced = Object.keys(items).some(priced);
      badge.hidden = n === 0; badge.textContent = String(n);
      $$('.basket-link').forEach((b) => { b.classList.toggle('empty', !n); b.setAttribute('aria-label', n ? 'Basket, ' + n + (n === 1 ? ' item' : ' items') : 'Basket, empty'); });
      lines.replaceChildren(...Object.entries(items).map(([k, q]) => line(k, q)));
      $('#basket-empty').hidden = n > 0;
      $('#basket-sum').hidden = !anyPriced;
      $('#basket-note').hidden = order.hidden = n === 0;
      $('#basket-total').textContent = money(total());
    };
    const set = (k, q) => { if (q > 0) items[k] = Math.min(q, MAX); else delete items[k]; save(); render(); };
    let opener = null;
    const open = (said) => {
      if (!bk.open) {
        opener = document.activeElement;
        if (typeof bk.showModal === 'function') bk.showModal(); else bk.setAttribute('open', '');
      }
      done.hidden = true; main.hidden = false;
      render();
      title.focus();
      status.textContent = said || '';
    };
    const close = () => {
      if (!bk.open) return;
      if (typeof bk.close === 'function') bk.close(); else { bk.removeAttribute('open'); bk.dispatchEvent(new Event('close')); }
    };
    // Focus goes back to the control that opened the basket, if it is still on the page.
    bk.addEventListener('close', () => { if (opener && opener.focus && opener.isConnected) opener.focus({ preventScroll: true }); opener = null; status.textContent = ''; });
    $('#basket-x').addEventListener('click', close);
    bk.addEventListener('click', (e) => { if (e.target === bk) close(); });
    document.addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      if (add && BY[add.dataset.add]) { const s = add.dataset.add; set(s, (items[s] || 0) + 1); open(BY[s].name + ' added to the basket.'); return; }
      // A request a page composed: its words ride in data-quote. A build replaces its earlier self; the rest add up.
      const ask = e.target.closest('[data-quote]');
      if (ask) {
        let a = null;
        try { a = JSON.parse(ask.dataset.quote); } catch (_) { a = null; }
        if (!a || !askOk(a.key, a)) return;
        asks[a.key] = tidy(a);
        set(a.key, a.one ? 1 : (items[a.key] || 0) + 1);
        open(a.name + ' added to the basket.');
        return;
      }
      if (e.target.closest('[data-basket]')) { open(); return; }
      // A link inside the basket leaves it: close first, then follow the link.
      if (bk.contains(e.target) && e.target.closest('a[href^="#"]')) close();
    });
    lines.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.rm) { const p = info(b.dataset.rm); set(b.dataset.rm, 0); title.focus(); status.textContent = p.name + ' removed.'; return; }
      const s = b.dataset.slug;
      set(s, (items[s] || 0) + Number(b.dataset.q));
      // Rendering replaced the buttons: keep focus on the same control, or its twin when this one is now disabled.
      const same = lines.querySelector('button[data-slug="' + s + '"][data-q="' + b.dataset.q + '"]');
      (same && !same.disabled ? same : lines.querySelector('button.q[data-slug="' + s + '"]:not([disabled])') || title).focus();
      status.textContent = info(s).name + ', quantity ' + items[s] + (Object.keys(items).some(priced) ? '. Subtotal ' + money(total()) + '.' : '.');
    });
    // The order goes to the house inbox as an email, grouped by wing: no payment is taken on the page.
    order.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!count() || !order.reportValidity()) return;
      const f = new FormData(order);
      const v = (k) => String(f.get(k) || '').trim();
      const rows = [];
      for (const w of WINGS) {
        const mine = Object.entries(items).filter(([k]) => info(k).wing === w);
        if (!mine.length) continue;
        rows.push((SHOP.wings && SHOP.wings[w]) || w);
        for (const [k, q] of mine) {
          const p = info(k);
          rows.push(q + ' × ' + p.name + ', ' + (priced(k) ? money(p.price) + (q > 1 ? ' each, ' + money(p.price * q) : '') : 'priced by email'));
          if (p.note) rows.push('    ' + p.note);
        }
        rows.push('');
      }
      const quotes = Object.keys(items).filter((k) => !priced(k)).length;
      const sums = [...(Object.keys(items).some(priced) ? ['Subtotal: ' + money(total()) + ' (' + SHOP.code + ')'] : []), ...(quotes ? ['Priced by email: ' + quotes + (quotes === 1 ? ' line' : ' lines')] : [])];
      const text = ['Order for lastfomo', '', ...rows, ...sums, '',
        'Name: ' + v('name'), 'Email: ' + v('email'), 'Organisation: ' + (v('org') || 'not given'), 'Deliver to: ' + v('place'), ...(v('note') ? ['', v('note')] : [])].join('\n');
      $('#order-text').textContent = text;
      copyOrder.textContent = 'Copy the order';
      main.hidden = true; done.hidden = false; done.focus({ preventScroll: true });
      location.href = 'mailto:' + SHOP.contact + '?subject=' + encodeURIComponent('Order: lastfomo, ' + v('name')) + '&body=' + encodeURIComponent(text);
    });
    copyOrder.addEventListener('click', async () => {
      const pre = $('#order-text');
      try { await navigator.clipboard.writeText(pre.textContent); copyOrder.textContent = 'Copied'; }
      catch (_) { const r = document.createRange(); r.selectNodeContents(pre); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); copyOrder.textContent = 'Selected, press copy'; }
    });
    $('#order-again').addEventListener('click', () => { done.hidden = true; main.hidden = false; title.focus(); });
    render();

    /* ---- Machina: the calculator. An estimate; its method is in site/shop.json → machina.calc. ---- */
    const CMP = SHOP.compute, calc = $('#calc'), calcOut = $('#calc-out');
    if (CMP && calc && calcOut) {
      const C = CMP.calc, IT = CMP.items;
      const pick = (name) => { const b = calc.querySelector('input[name="' + name + '"]:checked'); return b ? b.value : ''; };
      const dollars = (n) => '$' + n.toLocaleString('en-GB');
      const span = (lo, hi) => (lo === hi ? dollars(lo) : dollars(lo) + '–' + hi.toLocaleString('en-GB'));
      const need = () => {
        const use = C.uses.find((u) => u.id === calc.elements.use.value) || C.uses[0];
        const tasks = $$('input[name="task"]:checked', calc).map((b) => C.tasks.find((t) => t.id === b.value)).filter(Boolean);
        const team = C.teams.find((t) => t.id === pick('team')) || C.teams[0];
        const depth = C.depth.find((d) => d.id === pick('depth')) || C.depth[0];
        // The tasks set a floor under the model: agents want a large one, answers from documents a middling one.
        const model = Math.max(depth.model, ...tasks.map((t) => t.min || 0));
        const M = C.models[String(model)];
        const extra = tasks.reduce((a, t) => a + (t.extra || 0), 0);
        return { use, tasks, team, depth, model, gb: Math.ceil((M.weights + M.kv * team.active + extra) * C.overhead) };
      };
      const size = () => {
        const n = need();
        // In each tier, the cheapest build that holds the model and serves the people at once.
        const sols = ['home', 'business', 'top'].map((tier) => {
          let best = null;
          for (const b of C.builds.filter((x) => x.tier === tier)) {
            const it = IT[b.item], k = Math.ceil(n.gb / it.mem);
            if (k > b.max || n.team.active > b.serves) continue;
            const cost = [it.price[0] * k, it.price[1] * k];
            if (!best || cost[0] < best.cost[0]) best = { tier, b, it, k, cost };
          }
          return best;
        }).filter(Boolean);
        const want = n.use.tier || 'business';
        const order3 = ['home', 'business', 'top'];
        const pickSol = sols.find((x) => x.tier === want) || sols.find((x) => order3.indexOf(x.tier) > order3.indexOf(want)) || sols[0];
        const tasks = n.tasks.map((t) => t.label.toLowerCase()).join(', ') || 'no tasks chosen';
        const sum = n.use.label + ' · ' + tasks + ' · ' + n.team.label.toLowerCase() + ' · ' + n.depth.label.toLowerCase() + ' · about ' + n.gb + ' GB';
        const head = el('p', 'calc-need');
        head.append(el('b', null, 'About ' + n.gb + ' GB'), document.createTextNode('of fast memory: a ' + n.model + 'B-class model, answering about ' + n.team.active + (n.team.active === 1 ? ' person' : ' people') + ' at once' + (n.tasks.some((t) => t.extra) ? ', with the speech and image models beside it.' : '.')));
        const list = el('ul', 'sols');
        for (const x of sols) {
          const li = el('li', 'sol' + (x === pickSol ? ' pick' : ''));
          const what = x.k + ' × ' + x.it.name;
          li.append(el('p', 'gk', CMP.tiers[x.tier] + (x === pickSol ? ' · suggested' : '')), el('h4', null, what),
            el('p', 'sol-m', x.k * x.it.mem + ' GB · ' + x.it.supply), el('p', 'gp', span(x.cost[0], x.cost[1])));
          const row = el('div', 'row');
          const b1 = el('button', 'btn solid sm', 'Add to basket'); b1.type = 'button';
          b1.dataset.quote = JSON.stringify({ key: 'mch-build-' + x.b.item + '-' + x.k, name: 'Local AI build: ' + what, kind: 'Machina · local AI build', wing: 'machina', href: '#/compute', note: sum + ' · cards ' + span(x.cost[0], x.cost[1]), one: true });
          b1.setAttribute('aria-label', 'Add a local AI build with ' + what + ' to the basket');
          const b2 = el('button', 'btn sm', 'Sourcing only'); b2.type = 'button';
          b2.dataset.quote = JSON.stringify({ key: 'mch-src-' + x.b.item + '-' + x.k, name: 'Sourcing: ' + what, kind: 'Machina · hardware sourcing', wing: 'machina', href: '#/compute', note: sum + ' · cards ' + span(x.cost[0], x.cost[1]), one: true });
          b2.setAttribute('aria-label', 'Ask us to source ' + what);
          row.append(b1, b2); li.append(row); list.append(li);
        }
        if (!sols.length) {
          const li = el('li', 'sol pick');
          li.append(el('h4', null, 'Larger than these builds'), el('p', 'sol-x', 'A cluster sized with you, from the top tier up.'));
          const b = el('button', 'btn solid sm', 'Ask us to size it'); b.type = 'button';
          b.dataset.quote = JSON.stringify({ key: 'mch-build-custom', name: 'Local AI build, sized with us', kind: 'Machina · local AI build', wing: 'machina', href: '#/compute', note: sum, one: true });
          li.append(b); list.append(li);
        }
        calcOut.replaceChildren(head, list, el('p', 'sol-x', 'The cards only, at today’s market prices. The machine, install and support are quoted.'));
      };
      // Who it is for ticks the tasks such a place usually starts with; the visitor can change them after.
      calc.elements.use.addEventListener('change', () => {
        const u = C.uses.find((x) => x.id === calc.elements.use.value);
        if (u) $$('input[name="task"]', calc).forEach((b) => { b.checked = u.tasks.includes(b.value); });
        size();
      });
      calc.addEventListener('change', (e) => { if (e.target.name !== 'use') size(); });
      calc.addEventListener('submit', (e) => e.preventDefault());
      size();
    }
  }

  /* ---------------- Arca: the gold chart's crosshair ---------------- */
  // The pointer finds the nearest month and the tooltip reads it out; with the keyboard, focus the chart and step with
  // the arrow keys. The same values sit in a table beside it for screen readers.
  $$('.gl-plot[data-points]').forEach((plot) => {
    let pts = [];
    try { pts = JSON.parse(plot.dataset.points); } catch (_) { return; }
    if (!pts.length) return;
    const cross = $('.gl-cross', plot), tip = $('.gl-tip', plot);
    let at = pts.length - 1;
    const showAt = (i) => {
      at = i;
      const [x, y, label, value] = pts[i];
      cross.style.setProperty('--x', x + '%');
      tip.style.setProperty('--x', x + '%'); tip.style.setProperty('--y', y + '%');
      tip.dataset.side = x < 14 ? 'start' : x > 86 ? 'end' : '';
      tip.querySelector('b').textContent = value; tip.querySelector('span').textContent = label;
      cross.hidden = tip.hidden = false;
    };
    const hide = () => { cross.hidden = tip.hidden = true; };
    plot.addEventListener('pointermove', (e) => {
      const r = plot.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * 100;
      let best = 0;
      pts.forEach((p, i) => { if (Math.abs(p[0] - px) < Math.abs(pts[best][0] - px)) best = i; });
      showAt(best);
    });
    plot.addEventListener('pointerleave', () => { if (document.activeElement !== plot) hide(); });
    plot.addEventListener('focus', () => showAt(at));
    plot.addEventListener('blur', hide);
    plot.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      showAt(Math.max(0, Math.min(pts.length - 1, at + (e.key === 'ArrowRight' ? 1 : -1))));
    });
  });

  /* ---------------- an open Artifact keeps its place when the page is republished ---------------- */
  // The claude.ai viewer reloads open pages to a new version at a quiet moment. The route and the walk's finds come
  // back with them; anywhere else (the web build) there is no window.claude and the page starts as it always did.
  const hot = window.claude && window.claude.hot;
  if (hot && typeof hot.snapshot === 'function') hot.snapshot(() => ({ hash: location.hash, walk: XP ? XP.save() : null }));
  let booted = false;
  const start = (data) => {
    if (booted) return;
    booted = true;
    if (data && data.walk && XP) XP.load(data.walk);
    if (data && typeof data.hash === 'string' && /^#\/?[\w/-]*$/.test(data.hash) && !location.hash) {
      try { history.replaceState(null, '', data.hash); } catch (_) { /* the page keeps its own address */ }
    }
    route();
  };
  if (hot && typeof hot.ready === 'function') { hot.ready(start); setTimeout(() => start({}), 1500); }
  else start((hot && hot.data) || {});
})();
