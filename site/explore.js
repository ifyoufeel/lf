/* lastfomo — explore: walk the house.
   A first-person walk through the house and its wings in the spirit of PolyFauna: few words, a signal to follow, a score
   for each world. site/main.js owns the routes: #/explore is the house, #/explore/<wing> a wing. Walking into an arch
   changes the route and the route changes the world, so the header trail, the title and the Back button follow along.
   three.js r128 loads only when the walk first opens (the build says from where). Colours come from the tokens; the
   score is generated live with Web Audio and plays only once the visitor chooses it. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const view = $('#view-explore');
  if (!view) return;
  const root = document.documentElement;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COARSE = matchMedia('(pointer: coarse)').matches;
  const Q = COARSE ? 0.55 : 1; // phones get fewer blades, trees and fireflies
  const MOTION = COARSE && typeof window.DeviceOrientationEvent !== 'undefined';
  const WINGS = ['hortus', 'machina', 'arca'];
  const NAMES = { hub: 'The house', hortus: 'Hortus', machina: 'Machina', arca: 'Arca' };
  const LINES = { hub: 'Walk the house.', hortus: 'What grows.', machina: 'What thinks.', arca: 'What lasts.' };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // The build names where three.js r128 comes from: the site's own copy on the web, cdnjs with its hash in the Artifact.
  let MEDIA = {};
  try { MEDIA = JSON.parse(($('#lf-media') || {}).textContent || '{}'); } catch (_) { MEDIA = {}; }
  const THREE_SRC = typeof MEDIA.three === 'string' && MEDIA.three ? MEDIA.three : 'vendor/three.min.js';
  const THREE_SRI = typeof MEDIA.threeIntegrity === 'string' ? MEDIA.threeIntegrity : '';
  // The Arca objects ride in a <template>, so the build fingerprints them (web) or inlines them (Artifact) like any image.
  const PICS = {};
  const tpl = $('#xp-media');
  if (tpl) tpl.content.querySelectorAll('img[data-k]').forEach((im) => { PICS[im.dataset.k] = { src: im.getAttribute('src'), alt: im.getAttribute('alt') || '' }; });

  const el = {
    c: $('#xp-c'), grain: $('#xp-grain'), hud: $('#xp-hud'), dots: $('#xp-dots'), count: $('#xp-count'), toast: $('#xp-toast'),
    prompt: $('#xp-prompt'), promptT: $('#xp-prompt-t'), walk: $('#xp-walk'), walkL: $('#xp-walk-l'),
    panel: $('#xp-panel'), timer: $('#xp-p-timer'), pCode: $('#xp-p-code'), pTitle: $('#xp-p-title'), pPic: $('#xp-p-pic'), pImg: $('#xp-p-img'),
    pBody: $('#xp-p-body'), pStats: $('#xp-p-stats'), pClose: $('#xp-p-close'),
    start: $('#xp-start'), word: $('#xp-start-t'), line: $('#xp-start-line'), goS: $('#xp-go-sound'), goQ: $('#xp-go-quiet'), home: $('#xp-home'), note: $('#xp-note'),
    fin: $('#xp-final'), finN: $('#xp-final-n'), finX: $('#xp-final-x'),
    menu: $('#xp-menu'), set: $('#xp-set'), setX: $('#xp-set-x'), keys: $('#xp-keys'), gyroOpt: $('#xp-opt-gyro'),
    curtain: $('.curtain'),
    sf: $('#xp-sf'), sfField: $('#xp-sf-field'), sfScenes: $('#xp-sf-scenes'), sfJam: $('#xp-sf-jam'), sfBpm: $('#xp-sf-bpm'), sfBpmV: $('#xp-sf-bpm-v'),
    sfX: $('#xp-sf-x'), sfNote: $('#xp-sf-note'), sfLive: $('#xp-sf-live'), sfSec: $('#xp-sf-sec'), sfGo: $('#xp-sf-go'),
  };
  el.timerBar = el.timer && el.timer.firstElementChild;

  /* =============================== what the signals say =============================== */
  // Facts trace to brand/ledger.json. Each list runs in the order the auto walk visits it.
  const SIGNALS = {
    hortus: [
      { id: 'med', title: 'Medical plants', code: 'HRT — Medical plants', body: 'Cultivation and study of medical plants under controlled conditions, from the first leaf to the harvest.', stats: [['Controlled', 'conditions'], ['Leaf', 'to harvest']] },
      { id: 'lab', title: 'The root lab', code: 'HRT — Plant science', body: 'Germination and root studies. A seed is filmed as it grows, and the root map traces every new root as it spreads through the soil.', stats: [['Seed', 'to root map'], ['Glass', 'soil chamber']] },
      { id: 'node', title: 'Seed to sensor', code: 'HRT — Hortus', body: 'Five disciplines under one roof, from the seed to the feeding line. One research house, one method across every field.', stats: [['5', 'disciplines'], ['1', 'research house']] },
      { id: 'field', title: 'The field', code: 'HRT — Farm analysis · Crop optimisation', body: 'Greenhouse and field analysis, then optimisation for yield and quality: two disciplines that share one plot and one set of measurements.', stats: [['2', 'disciplines'], ['Yield', 'and quality']] },
      { id: 'feed', title: 'The feeding rig', code: 'HRT — Feeding systems & hardware', body: 'Dosing, sensors and control. Five channels deliver nutrients line by line, on hardware machined, wired and assembled in-house.', stats: [['5', 'dosing channels'], ['In-house', 'hardware']] },
    ],
    machina: [
      { id: 'gpus', title: 'Eight GPUs', code: 'MCH — Compute', body: 'Three classes in one chassis: 4× RTX 3090, 2× RTX 4090 and 2× RTX 5060 Ti. Enough memory to run large models locally.', stats: [['8', 'GPUs'], ['176 GB', 'VRAM']] },
      { id: 'cpu', title: 'The processor', code: 'MCH — Compute', body: 'An AMD EPYC 7702 keeps the eight cards fed and the whole system responsive.', stats: [['64', 'CPU cores'], ['EPYC', '7702']] },
      { id: 'mem', title: 'Memory', code: 'MCH — Memory & storage', body: 'Sixteen 16 GB modules of DDR4, with SSD and NVMe flash for models and records.', stats: [['256 GB', 'system memory'], ['7 TB', 'flash storage']] },
      { id: 'power', title: 'Power', code: 'MCH — Power', body: 'Two supplies, 1500 W and 1600 W, share the load of eight GPUs running at once.', stats: [['3.1 kW', 'power budget'], ['2', 'supplies']] },
      { id: 'net', title: 'The network', code: 'MCH — Network', body: 'A 50 Gbit network keeps the traffic inside the building. The server answers the clinic, not the internet.', stats: [['50 Gbit', 'network'], ['Local', 'by default']] },
      { id: 'core', title: 'Case N° 0001', code: 'MCH — Machina · The room', body: 'Local AI for a medical practice. Patient records are analysed inside the clinic and never sent out: private by architecture, not by policy.', stats: [['0 bytes', 'leave the room'], ['On-premise', 'in the clinic']] },
    ],
    arca: [
      { id: 'necklace', img: 'necklace', title: 'Collana di San Gennaro', code: 'ARC — Gem hunters', body: 'Begun by the goldsmith Michele Dato in Naples in 1679, then enriched with jewels given by sovereigns over about 250 years.', stats: [['1679', 'begun in Naples'], ['About 250', 'years of additions']] },
      { id: 'helmet', img: 'helmet', title: 'Sutton Hoo helmet', code: 'ARC — What lasts', body: 'Early 7th century, found in 1939 in an Anglo-Saxon ship burial in Suffolk. Now in the British Museum.', stats: [['1939', 'found'], ['7th c.', 'made']] },
      { id: 'gauntlet', img: 'gauntlet', title: 'Parade gauntlet', code: 'ARC — Made to be seen', body: 'Renaissance parade armour: embossed and gilt steel, made for display rather than battle.', stats: [['Gilt', 'embossed steel'], ['Parade', 'not battle']] },
      { id: 'painting', img: 'frazetta', title: 'Man Ape, Frank Frazetta', code: 'ARC — Direct to the artist', body: 'The 1966 cover painting, sold in 2025 for $13.5M, consigned by the artist’s family.', stats: [['$13.5M', 'sold in 2025'], ['1966', 'painted']] },
      { id: 'chest', title: 'The hunt', code: 'ARC — Gem hunters', body: 'Off-market sourcing: objects found before they are ever listed. Hunted, not listed.', stats: [['Off-market', 'sourcing'], ['Hunted', 'not listed']] },
      { id: 'vault', title: 'The vault', code: 'ARC — Vaults', body: 'Storage and custody for what should outlast its owner. The door opens by invitation.', stats: [['Custody', 'and storage'], ['Private', 'by invitation']] },
    ],
  };
  const COUNT = Object.fromEntries(WINGS.map((w) => [w, SIGNALS[w].length]));
  const TOTAL = WINGS.reduce((n, w) => n + COUNT[w], 0);
  SIGNALS.hub = [{ id: 'house', counts: false, title: 'lastfomo', code: 'LF — The house · Research house', body: 'A research house with three wings: nature, intelligence, and the objects worth keeping. Walk into an arch to enter a wing. Each wing hides signals; find them all to explore it.', stats: [[String(WINGS.length), 'wings to explore'], [String(TOTAL), 'signals to find']] },
    // the stone circle round the column: it opens the sound field instead of a panel, once all three wings are explored
    { id: 'field', counts: false, title: 'The sound field', code: 'LF — The house · Sound field', body: '', stats: [] }];
  const signal = (w, id) => { const i = SIGNALS[w].findIndex((s) => s.id === id); return Object.assign({ order: i }, SIGNALS[w][i]); };
  const progress = { hub: new Set(), hortus: new Set(), machina: new Set(), arca: new Set() };
  const done = { hortus: false, machina: false, arca: false };
  const allDone = () => WINGS.every((w) => done[w]);

  /* =============================== the visitor's settings =============================== */
  // Auto walk leads on phones by default; this browser remembers the choice (per-viewer convenience only).
  const PREF = 'lf-walk';
  const prefs = { auto: COARSE, gyro: COARSE };
  try { const p = JSON.parse(localStorage.getItem(PREF) || '{}'); if (typeof p.auto === 'boolean') prefs.auto = p.auto; if (typeof p.gyro === 'boolean') prefs.gyro = p.gyro; } catch (_) { /* storage blocked: the defaults stand */ }
  const savePrefs = () => { try { localStorage.setItem(PREF, JSON.stringify(prefs)); } catch (_) { /* per-viewer convenience only */ } };

  /* =============================== colours come from the tokens =============================== */
  const TOK = {};
  const readTokens = () => { const cs = getComputedStyle(root); ['void', 'ink', 'graphite', 'iron', 'ash', 'paper', 'mist', 'sealed', 'machina', 'hortus', 'arca'].forEach((k) => { TOK[k] = cs.getPropertyValue('--' + k).trim(); }); };
  const col = (k) => new THREE.Color(TOK[k]);
  const mix = (a, b, t) => col(a).lerp(col(b), t);
  const shade = (w, t) => mix('void', w, t); // a wing colour deep in the dark: fog, sky, grass, idle LEDs
  const hex = (c) => '#' + c.getHexString();
  const rgbOf = (k) => { const c = col(k); return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)]; };

  /* =============================== state =============================== */
  let HORSE = null; // site/main.js's exact Path2D horse (brand/marks/horse.svg)
  let active = false; // the walk is the open route
  let ready = false; // three.js is in and the first world is built
  let started = false; // the visitor came through the start screen in this visit
  let loading = null;
  let wantWorld = 'hub';
  let renderer = null, camera = null, U = null, T0 = 0;
  const state = { world: null, worlds: {}, pos: null, vel: null, yaw: 0, pitch: 0, lookYaw: 0, lookPitch: 0, lookAt: 0, focus: null, panel: null, busy: false, cool: 0, stepT: 0, walk: 0, hold: false, finalShown: false };
  const keys = new Set();
  let fwd, right, want, ray, ndc;
  const canMove = () => active && started && !state.busy && !state.panel && !el.set.open && !el.sf.open && el.fin.hidden;

  /* =============================== textures and helpers =============================== */
  let GLOW, DOT, RING, HIT, FRAME, loader, LUX, LOCK, VOIDRGB;
  const makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function texFrom(cv, opt) {
    opt = opt || {};
    const t = new THREE.CanvasTexture(cv);
    t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
    if (opt.nearest) t.magFilter = THREE.NearestFilter;
    if (opt.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opt.repeat[0], opt.repeat[1]); }
    return t;
  }
  // A soft round light, white, tinted by whatever uses it.
  function glowTexture() {
    const n = 128, cv = makeCanvas(n, n), x = cv.getContext('2d'), img = x.createImageData(n, n), d = img.data;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const r = Math.hypot(i + 0.5 - n / 2, j + 0.5 - n / 2) / (n / 2);
      const a = r < 0.22 ? 1 - (r / 0.22) * 0.45 : Math.max(0, 0.55 * (1 - (r - 0.22) / 0.78));
      const q = (j * n + i) * 4; d[q] = d[q + 1] = d[q + 2] = 255; d[q + 3] = Math.round(a * 255);
    }
    x.putImageData(img, 0, 0);
    return texFrom(cv);
  }
  function glow(color, size, opacity) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, opacity: opacity == null ? 0.6 : opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.set(size, size, 1); return s;
  }
  const std = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0.05, flatShading: true }, o || {}));
  const basic = (color, o) => new THREE.MeshBasicMaterial(Object.assign({ color }, o || {}));
  function neon(mesh, color, op) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color, transparent: true, opacity: op == null ? 0.7 : op })); e.position.copy(mesh.position); e.rotation.copy(mesh.rotation); e.scale.copy(mesh.scale); return e; }
  function beam(color, h, op) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, h, 8, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })); b.position.y = h / 2 + 2.6; return b; }
  function textPlane(items, pw, cw, ch) {
    const cv = makeCanvas(cw, ch), x = cv.getContext('2d');
    items.forEach((it) => {
      x.font = it.font; x.fillStyle = it.color; x.globalAlpha = it.alpha == null ? 1 : it.alpha; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
      const w = x.measureText(it.t).width, s = w > cw - 24 ? (cw - 24) / w : 1; // long words shrink to fit, never clip
      x.save(); x.translate(cw / 2, it.y); x.scale(s, 1); x.fillText(it.t, 0, 0); x.restore();
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(pw, pw * ch / cw), new THREE.MeshBasicMaterial({ map: texFrom(cv), transparent: true, depthWrite: false }));
  }
  function archShape(w, h) {
    const r = w / 2, s = new THREE.Shape();
    s.moveTo(-r, 0); s.lineTo(-r, h - r); s.absarc(0, h - r, r, Math.PI, 0, true); s.lineTo(r, 0); s.lineTo(-r, 0);
    return s;
  }
  function archGeo(w, h) {
    const g = new THREE.ShapeGeometry(archShape(w, h), 24), p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, p.getY(i) / h);
    uv.needsUpdate = true; return g;
  }
  function archBandGeo(w, h, t, d) {
    const r = w / 2, R = r + t, s = new THREE.Shape();
    s.moveTo(-R, 0); s.lineTo(-R, h - r); s.absarc(0, h - r, R, Math.PI, 0, true); s.lineTo(R, 0); s.lineTo(r, 0);
    s.lineTo(r, h - r); s.absarc(0, h - r, r, 0, Math.PI, false); s.lineTo(-r, 0); s.lineTo(-R, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 24 }); g.translate(0, 0, -d / 2); return g;
  }
  // The horse is always whole: main.js's exact vector, scaled, never cropped.
  function horseInto(x, cx, cy, width, color) { const s = width / 420; x.save(); x.translate(cx - 210 * s, cy - 60 * s); x.scale(s, s); x.fillStyle = color; x.fill(HORSE, 'evenodd'); x.restore(); }
  // The brand glyphs (brand/marks/glyphs.svg) as the page's sprite holds them.
  function glyph(id) {
    return Array.from(document.querySelectorAll('#' + id + ' path')).map((p) => {
      const m = /translate\(\s*([-\d.]+)[\s,]+([-\d.]+)\s*\)/.exec(p.getAttribute('transform') || '');
      return { d: new Path2D(p.getAttribute('d')), rule: p.getAttribute('fill-rule') === 'evenodd' ? 'evenodd' : 'nonzero', tx: m ? +m[1] : 0, ty: m ? +m[2] : 0 };
    });
  }
  function glyphInto(x, g, cx, cy, size, color) {
    const s = size / 24; x.save(); x.translate(cx - size / 2, cy - size / 2); x.scale(s, s); x.fillStyle = color;
    g.forEach((p) => { x.save(); x.translate(p.tx, p.ty); x.fill(p.d, p.rule); x.restore(); });
    x.restore();
  }
  function wordInto(x, text, cx, y, size, maxW, color) {
    x.font = '400 ' + size + 'px "Jacquard 24"'; x.fillStyle = color; x.textAlign = 'center';
    const w = x.measureText(text).width, s = w > maxW ? maxW / w : 1;
    x.save(); x.translate(cx, y); x.scale(s, s); x.fillText(text, 0, 0); x.restore();
  }

  /* the brand nave: a stipple field with the whole horse, alive */
  class Stipple {
    constructor(rgb, gw, gh, seed) {
      this.rgb = rgb; this.gw = gw; this.gh = gh;
      this.cv = makeCanvas(gw, gh); this.x = this.cv.getContext('2d'); this.img = this.x.createImageData(gw, gh);
      const n = gw * gh, r = rng(seed);
      this.lit = new Float32Array(n); this.lum = new Float32Array(n);
      for (let i = 0; i < n; i++) { this.lit[i] = r(); this.lum[i] = r(); }
      const S = 4, W = gw * S, H = gh * S, off = makeCanvas(W, H), o = off.getContext('2d');
      horseInto(o, W / 2, H * 0.6, Math.min(0.8 * W, 0.6 * H * 3.5), TOK.paper);
      const d = o.getImageData(0, 0, W, H).data;
      this.mask = new Float32Array(n); this.holes = new Uint8Array(n);
      const hs = Math.min(0.8 * W, 0.6 * H * 3.5) / 420, P = Math.max(3, Math.round(hs * 3.2)), h2 = (P / 2) | 0;
      for (let y = 0; y < gh; y++) for (let xx = 0; xx < gw; xx++) {
        let s = 0;
        for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) s += d[((y * S + j) * W + (xx * S + i)) * 4 + 3];
        this.mask[y * gw + xx] = s / (S * S * 255);
        this.holes[y * gw + xx] = (xx % P === h2 && y % P === h2) ? 1 : 0;
      }
      this.tex = texFrom(this.cv, { nearest: true });
      this.draw(0);
    }
    draw(boost) {
      const { gw, gh, lit, lum, mask, holes } = this, data = this.img.data, n = gw * gh, [cr, cg, cb] = this.rgb, [br, bg, bb] = VOIDRGB;
      if (!RM) for (let k = 0, m = (n * 0.05) | 0; k < m; k++) { const i = (Math.random() * n) | 0; lit[i] = Math.random(); lum[i] = Math.random(); }
      const thr = 0.46 + 0.22 * (boost || 0);
      for (let i = 0; i < n; i++) {
        let v = lit[i] < thr ? 0.14 + 0.62 * Math.pow(lum[i], 1.4) : 0;
        if (mask[i] + (lit[i] - 0.5) * 0.85 > 0.5) v = holes[i] ? 0.1 : 0.97;
        const q = i * 4; data[q] = br + (cr - br) * v; data[q + 1] = bg + (cg - bg) * v; data[q + 2] = bb + (cb - bb) * v; data[q + 3] = 255;
      }
      this.x.putImageData(this.img, 0, 0); this.tex.needsUpdate = true;
    }
  }
  function skyTex(stops) {
    const cv = makeCanvas(4, 256), x = cv.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); x.fillStyle = g; x.fillRect(0, 0, 4, 256); return texFrom(cv);
  }
  function dust(W, n, R, H, color, op, size, cx, cz) {
    const g = new THREE.BufferGeometry(), p = new Float32Array(n * 3), r = rng(n + 5);
    for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R; p[i * 3] = (cx || 0) + Math.cos(a) * d; p[i * 3 + 1] = 0.2 + r() * H; p[i * 3 + 2] = (cz || 0) + Math.sin(a) * d; }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color, size: size || 0.06, map: GLOW, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false; W.scene.add(pts);
    W.ticks.push((t, dt) => { if (!RM) { pts.position.y = Math.sin(t * 0.25) * 0.18; pts.rotation.y += dt * 0.008; } });
    return pts;
  }
  // Sealed until you look: grey, then colour behind a sweep line in the wing colour.
  function sweepMat(tex) {
    return new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, uP: { value: 0 }, uE: { value: col('arca') } }, side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform sampler2D map; uniform float uP; uniform vec3 uE; varying vec2 vUv; void main(){ vec3 c = texture2D(map, vUv).rgb; float l = dot(c, vec3(.2126, .7152, .0722)); vec3 g = vec3(.05 + .36 * pow(max(l, 0.0), 1.1)); vec3 col = mix(g, c, step(vUv.x, uP)); float e = (1.0 - smoothstep(0.0, .014, abs(vUv.x - uP))) * step(.001, uP) * step(uP, .999); col = mix(col, uE, e); gl_FragColor = vec4(col, 1.0); }',
    });
  }
  // A picture plane that takes its photo's own proportions once the photo arrives.
  function picture(key, box, mat) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    m.scale.set(box, box, 1);
    const pic = PICS[key];
    if (pic) mat.uniforms.map.value = loader.load(pic.src, (t) => { const a = t.image.width / t.image.height; m.scale.set(a >= 1 ? box : box * a, a >= 1 ? box / a : box, 1); });
    return m;
  }

  /* =============================== worlds =============================== */
  function World(name, o) {
    return Object.assign({ name, scene: new THREE.Scene(), objects: [], portals: [], colliders: [], ticks: [], spawn: { x: 0, z: 8, yaw: 0 }, heightAt: null, clampPos: null, bounds: null, total: 0 }, o);
  }
  const ground = (W, x, z) => (W.heightAt ? W.heightAt(x, z) : 0);
  // A signal: a dot that bobs over the object, a ring on the ground, and what the panel says (SIGNALS).
  // stand and look are where the auto walk stops and what it turns to.
  function addObject(W, id, o) {
    Object.assign(o, signal(W.name, id));
    const color = o.color || col(W.name === 'hub' ? 'paper' : W.name), gy = ground(W, o.x, o.z);
    const ring = new THREE.Mesh(RING, basic(color.clone(), { transparent: true, opacity: 0.35, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(o.x, gy + 0.03, o.z); ring.scale.setScalar(o.ringScale || 1);
    const marker = new THREE.Group(); marker.add(new THREE.Mesh(DOT, basic(color.clone())), glow(color.clone(), 0.9, 0.6));
    marker.position.set(o.x, gy + o.y, o.z);
    const hh = o.hh || 2.2, hit = new THREE.Mesh(new THREE.BoxGeometry(o.hw || 1.6, hh, o.hw || 1.6), HIT);
    hit.position.set(o.x, gy + hh / 2, o.z);
    W.scene.add(ring, marker, hit);
    const obj = Object.assign(o, { ring, marker, hit, gy, color, found: progress[W.name].has(id), range: o.range || 3.6, phase: Math.random() * 6, focus: 0 });
    hit.userData.obj = obj; W.objects.push(obj);
    if (o.counts !== false) W.total++;
    if (obj.found && obj.onFound) obj.onFound(); // a find kept from before a republish opens as you arrive
    return obj;
  }
  function addPortal(W, p) {
    const g = new THREE.Group(), gy = ground(W, p.x, p.z);
    g.position.set(p.x, gy, p.z); g.rotation.y = p.ry;
    g.add(new THREE.Mesh(archBandGeo(p.w, p.h, 0.24, 0.32), FRAME));
    const st = new Stipple(rgbOf(p.key), 64, 104, p.seed || 7);
    g.add(new THREE.Mesh(archGeo(p.w, p.h), new THREE.MeshBasicMaterial({ map: st.tex, side: THREE.DoubleSide })));
    // Jacquard sets only the brand names; Wing 04 stays in mono and stays sealed.
    const label = p.sealed
      ? textPlane([{ t: 'WING 04', font: '500 84px "Geist Mono"', color: TOK.sealed, y: 140 }, { t: p.line, font: '300 46px "Geist"', color: TOK.paper, alpha: 0.6, y: 222 }], 3.6, 1024, 256)
      : textPlane([{ t: p.label, font: '150px "Jacquard 24"', color: TOK.paper, y: 150 }, { t: p.line, font: '300 46px "Geist"', color: TOK.paper, alpha: 0.72, y: 232 }], 3.6, 1024, 256);
    label.position.set(0, p.h + 1.05, 0); g.add(label);
    let tag = null;
    if (!p.sealed && p.key !== 'paper') {
      tag = textPlane([{ t: 'EXPLORED', font: '500 44px "Geist Mono"', color: TOK[p.key], y: 64 }], 1.5, 512, 96);
      tag.position.set(0, p.h + 0.34, 0.02); tag.visible = false; g.add(tag);
    }
    if (p.sealed) {
      const lc = makeCanvas(128, 128); glyphInto(lc.getContext('2d'), LOCK, 64, 64, 96, TOK.paper);
      const lock = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ map: texFrom(lc), transparent: true }));
      lock.position.set(0, 1.0, 0.05); g.add(lock);
    }
    if (p.light) { const L = new THREE.PointLight(col(p.key), 1.3, 10, 2); L.position.set(0, 1.4, 1.4); g.add(L); }
    W.scene.add(g);
    const nx = Math.sin(p.ry), nz = Math.cos(p.ry), tx = Math.cos(p.ry), tz = -Math.sin(p.ry), leg = p.w / 2 + 0.12;
    W.colliders.push({ x: p.x + tx * leg, z: p.z + tz * leg, r: 0.3 }, { x: p.x - tx * leg, z: p.z - tz * leg, r: 0.3 });
    const portal = { x: p.x, z: p.z, nx, nz, w: p.w, to: p.to, sealed: !!p.sealed, st, tag, key: p.key, msgAt: 0 };
    W.portals.push(portal);
    return portal;
  }
  // The naves develop as you come close.
  function portalTick(W) {
    let acc = 0;
    W.ticks.push((t, dt) => {
      acc += dt; if (acc < 0.1) return; acc = 0;
      W.portals.forEach((p) => { const d = Math.hypot(state.pos.x - p.x, state.pos.z - p.z); p.st.draw(clamp(1 - (d - 2) / 7, 0, 1)); });
    });
  }
  const exitPortal = (W, x, z, ry) => addPortal(W, { to: 'hub', x, z, ry, w: 2.6, h: 4.3, key: 'paper', label: 'lastfomo', line: 'Back to the house', seed: 41 });

  /* ---------------- THE HOUSE ---------------- */
  function buildHub() {
    const W = World('hub', { spawn: { x: 0, z: 10, yaw: 0 } });
    const S = W.scene;
    S.background = col('void'); S.fog = new THREE.FogExp2(col('void'), 0.042);
    S.add(new THREE.HemisphereLight(col('paper'), col('ink'), 0.55));
    const dl = new THREE.DirectionalLight(col('paper'), 0.35); dl.position.set(4, 10, 6); S.add(dl);
    const fc = makeCanvas(256, 256), fx = fc.getContext('2d'), r = rng(7);
    fx.fillStyle = TOK.void; fx.fillRect(0, 0, 256, 256); fx.fillStyle = TOK.paper;
    for (let i = 0; i < 1500; i++) { fx.globalAlpha = 0.05 + r() * 0.24; fx.fillRect(((r() * 128) | 0) * 2, ((r() * 128) | 0) * 2, 2, 2); }
    fx.globalAlpha = 1;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(48, 72), new THREE.MeshBasicMaterial({ map: texFrom(fc, { nearest: true, repeat: [26, 26] }) }));
    floor.rotation.x = -Math.PI / 2; S.add(floor);
    const ringF = new THREE.Mesh(new THREE.RingGeometry(9.8, 9.86, 128), basic(col('paper'), { transparent: true, opacity: 0.18 }));
    ringF.rotation.x = -Math.PI / 2; ringF.position.set(0, 0.01, -1); S.add(ringF);
    dust(W, Math.round(520 * Q), 24, 9, col('paper'), 0.45, 0.07);
    const sp = W.spawn;
    // The house trio runs hortus, machina, arca, left to right; Wing 04 stands aside, sealed.
    [{ to: 'hortus', x: -8, z: -4.5, key: 'hortus', label: 'hortus', line: 'What grows.' },
     { to: 'machina', x: 0, z: -8.5, key: 'machina', label: 'machina', line: 'What thinks.' },
     { to: 'arca', x: 8, z: -4.5, key: 'arca', label: 'arca', line: 'What lasts.' },
     { to: 'sealed', x: 14, z: 4, key: 'sealed', label: '', line: 'In the works.', sealed: true },
    ].forEach((d, i) => { const p = addPortal(W, Object.assign(d, { ry: Math.atan2(sp.x - d.x, sp.z - d.z), w: 3.2, h: 5.2, seed: 11 + i, light: !d.sealed })); if (p.tag && done[p.to]) p.tag.visible = true; });
    // the Lux above the centre arch
    const lc = makeCanvas(128, 128); glyphInto(lc.getContext('2d'), LUX, 64, 64, 120, TOK.paper);
    const lux = new THREE.Sprite(new THREE.SpriteMaterial({ map: texFrom(lc), transparent: true, depthWrite: false }));
    lux.scale.set(0.9, 0.9, 1); lux.position.set(0, 8.1, -8.5);
    const halo = glow(col('paper'), 3.2, 0.25); halo.position.set(0, 8.1, -8.5);
    S.add(lux, halo);
    // the house monolith
    const mc = makeCanvas(512, 1024), mx = mc.getContext('2d');
    mx.fillStyle = TOK.graphite; mx.fillRect(0, 0, 512, 1024);
    horseInto(mx, 256, 360, 400, TOK.paper);
    wordInto(mx, 'lastfomo', 256, 600, 120, 340, TOK.paper);
    mx.font = '500 26px "Geist Mono"'; mx.fillStyle = TOK.ash; mx.textAlign = 'center'; mx.fillText('RESEARCH HOUSE', 256, 680);
    const face = std(col('paper'), { map: texFrom(mc), flatShading: false, roughness: 0.6 }), side = std(col('graphite'));
    const mono = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, 0.22), [side, side, side, side, face, side]);
    mono.position.set(-4, 0.9 + 0.35, 4.2); mono.rotation.y = Math.atan2(sp.x + 4, sp.z - 4.2);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.6), std(col('graphite'))); base.position.set(-4, 0.175, 4.2); base.rotation.y = mono.rotation.y;
    S.add(mono, base); W.colliders.push({ x: -4, z: 4.2, r: 0.7 });
    addObject(W, 'house', { x: -4, z: 4.2, y: 2.6, stand: [-2.75, 6.0], look: [-4, 1.3, 4.2] });
    W.ring = buildRing(W);
    W.bounds = { x: 0, z: 0, r: 21 };
    portalTick(W);
    W.ticks.push((t) => { lux.material.rotation = RM ? 0 : t * 0.25; });
    return W;
  }
  // The sound field's stones: round the house column, asleep under the floor until all three wings are explored. Each
  // carries its rune, lit by its layer of the jam and pulsing on its hits; Hortus, Machina and Arca face the way in, in
  // the house order from left to right.
  function stoneShape(d, s) {
    const sh = new THREE.Shape(), n = d.match(/[A-Za-z]|-?[\d.]+/g);
    let i = 0;
    const P = () => { const x = (+n[i++] - 30) * s, y = (88 - +n[i++]) * s; return [x, y]; };
    while (i < n.length) {
      const c = n[i++];
      if (c === 'M') sh.moveTo(...P()); else if (c === 'L') sh.lineTo(...P());
      else if (c === 'Q') { const [ax, ay] = P(), [bx, by] = P(); sh.quadraticCurveTo(ax, ay, bx, by); }
    }
    return sh;
  }
  function runeTexture(d) {
    const cv = makeCanvas(120, 184), x = cv.getContext('2d'), p = new Path2D(d);
    x.scale(2, 2); x.strokeStyle = TOK.paper; x.lineCap = x.lineJoin = 'round';
    x.shadowColor = TOK.paper; x.shadowBlur = 12; x.lineWidth = 3.6; x.stroke(p);
    x.shadowBlur = 0; x.lineWidth = 3; x.stroke(p);
    return texFrom(cv);
  }
  function buildRing(W) {
    const cx = -4, cz = 4.2, R = 3.1, H = 1.6, s = 0.75 / 46, sp = W.spawn, a0 = Math.atan2(sp.x - cx, sp.z - cz);
    const order = ['drone', 'doom', 'hortus', 'machina', 'arca', 'drums', 'bass'], body = std(col('graphite')), ash = col('ash');
    const stones = order.map((k, i) => {
      const a = a0 + (i - 3) * Math.PI * 2 / order.length, x = cx + Math.sin(a) * R, z = cz + Math.cos(a) * R, c = col(LAYER[k].c);
      const g = new THREE.Group(); g.position.set(x, -H, z); g.rotation.y = a; g.visible = false;
      const geo = new THREE.ExtrudeGeometry(stoneShape(STONE[i % 3], s), { depth: 0.3, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 1, curveSegments: 5 });
      geo.translate(0, 0, -0.15);
      const rune = new THREE.Mesh(new THREE.PlaneGeometry(60 * s, 92 * s), new THREE.MeshBasicMaterial({ map: runeTexture(LAYER[k].rune), color: c.clone(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      rune.position.set(0, 42 * s, 0.196);
      const halo = glow(c.clone(), 1.5, 0); halo.position.set(0, 42 * s, 0.45);
      g.add(new THREE.Mesh(geo, body), rune, halo); W.scene.add(g);
      return { k, g, x, z, c, rune, halo, d: i * 0.1 };
    });
    // Its signal: a ring on the ground through the stones, no dot. Close to the column it opens the field, not the panel.
    const field = addObject(W, 'field', { x: cx, z: cz, y: 3.4, range: 6.4, hw: 2 * R + 0.6, hh: 2.6, prio: 0.8, verb: 'Play', always: true, linger: true, live: false, dot: false,
      stand: [cx + Math.sin(a0) * 6, cz + Math.cos(a0) * 6], look: [cx, 0.8, cz], open: () => openMixer() }); // the auto walk stops where the whole circle shows
    field.ring.geometry = new THREE.RingGeometry(R - 0.025, R + 0.025, 120); // a fine line through the stones' feet
    const ring = { up: false, t0: 0, stones, field };
    ring.rise = (instant) => {
      if (ring.up) return;
      ring.up = true; ring.t0 = instant || RM ? -99 : U.time.value; field.live = true;
      stones.forEach((st) => { st.g.visible = true; W.colliders.push({ x: st.x, z: st.z, r: 0.5 }); });
      if (AW.on) AW.reset(); // the auto walk goes to them next
    };
    W.ticks.push((t) => {
      if (!ring.up) return;
      const now = A.ctx ? A.ctx.currentTime : 0;
      stones.forEach((st) => {
        const u = clamp((t - ring.t0 - st.d) / 1.5, 0, 1);
        st.g.position.y = -H * Math.pow(1 - u, 3);
        const lv = J.on ? levelOf(st.k) : 0, rest = J.on && lv === 0, f = J.flash[st.k];
        const ago = J.on && f != null ? now - f : 9, p = RM || ago < 0 ? 0 : Math.exp(-ago / 0.16);
        st.rune.material.color.copy(rest ? ash : st.c);
        st.rune.material.opacity = !J.on ? 0.5 : rest ? 0.28 : Math.min(1, 0.5 + 0.5 * lv + 0.3 * p);
        st.halo.material.opacity = !J.on ? 0.05 : rest ? 0 : Math.min(0.85, 0.08 + 0.32 * lv + 0.4 * p);
      });
    });
    if (allDone()) { ring.rise(true); SF.up = true; } // a republished page keeps its finds: the stones are already up
    return ring;
  }

  /* ---------------- HORTUS: a night meadow ---------------- */
  function buildHortus() {
    const W = World('hortus', { spawn: { x: 0, z: 8.5, yaw: 0 } });
    const S = W.scene, r = rng(3), sh = (t) => shade('hortus', t), green = col('hortus');
    S.background = skyTex([TOK.void, hex(sh(0.03)), hex(sh(0.07)), hex(sh(0.13))]); S.fog = new THREE.FogExp2(sh(0.04), 0.032);
    S.add(new THREE.HemisphereLight(mix('hortus', 'paper', 0.3), col('void'), 0.3), new THREE.AmbientLight(col('paper'), 0.06));
    const sun = new THREE.DirectionalLight(mix('paper', 'hortus', 0.3), 0.3); sun.position.set(-25, 30, -15); S.add(sun);
    const H = (x, z) => { const d = Math.hypot(x, z), f = smooth(15, 40, d); return f * (1.4 + 1.5 * Math.sin(x * 0.07) * Math.cos(z * 0.06) + 0.9 * Math.sin(x * 0.13 + z * 0.09)) + 0.08 * Math.sin(x * 0.45) * Math.cos(z * 0.38); };
    W.heightAt = H;
    const tg = new THREE.PlaneGeometry(170, 170, 90, 90); tg.rotateX(-Math.PI / 2);
    const pos = tg.attributes.position, cols = new Float32Array(pos.count * 3), cA = sh(0.1), cB = sh(0.18), cC = sh(0.26), tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), y = H(x, z); pos.setY(i, y); tmp.copy(cA).lerp(cB, r()).lerp(cC, clamp(y / 4, 0, 1) * 0.6); cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b; }
    tg.setAttribute('color', new THREE.BufferAttribute(cols, 3)); tg.computeVertexNormals();
    S.add(new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 })));
    const hg = new THREE.GridHelper(90, 90, green, sh(0.2)); hg.material.transparent = true; hg.material.opacity = 0.14; hg.position.y = 0.02; S.add(hg);
    const ST = { lab: [-7, -4], field: [7.5, -6], med: [-9, 4.5], feed: [9, 4], node: [0, -12] };
    const avoid = Object.values(ST).map((v) => ({ x: v[0], z: v[1], r: 2.4 })).concat([{ x: 0, z: 12.5, r: 2.4 }]);
    const clear = (x, z) => !avoid.some((v) => Math.hypot(x - v.x, z - v.z) < v.r);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), c = new THREE.Color();
    // grass that sways
    const gN = Math.round(3800 * Q), gGeo = new THREE.ConeGeometry(0.035, 0.55, 3, 1, true); gGeo.translate(0, 0.275, 0);
    const gMat = new THREE.MeshStandardMaterial({ color: col('paper'), roughness: 1, side: THREE.DoubleSide, emissive: sh(0.1) });
    gMat.onBeforeCompile = (shd) => {
      shd.uniforms.uT = U.time;
      shd.vertexShader = 'uniform float uT;\n' + shd.vertexShader.replace('#include <begin_vertex>', ['#include <begin_vertex>', '#ifdef USE_INSTANCING', 'float sw = sin(uT * 1.7 + instanceMatrix[3][0] * .35 + instanceMatrix[3][2] * .27) * .12 * position.y;', 'transformed.x += sw; transformed.z += sw * .6;', '#endif'].join('\n'));
    };
    const grass = new THREE.InstancedMesh(gGeo, gMat, gN); grass.frustumCulled = false;
    const gA = sh(0.1), gB = sh(0.42);
    let k = 0;
    for (let i = 0; k < gN && i < gN * 3; i++) {
      const a = r() * Math.PI * 2, d = 1 + Math.sqrt(r()) * 44, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (!clear(x, z)) continue;
      e.set((r() - 0.5) * 0.3, r() * Math.PI, (r() - 0.5) * 0.3); q.setFromEuler(e); const sc = 0.6 + r() * 0.9;
      s3.set(sc, sc * (0.7 + r() * 0.8), sc); p3.set(x, H(x, z), z); m4.compose(p3, q, s3); grass.setMatrixAt(k, m4);
      grass.setColorAt(k, c.copy(gA).lerp(gB, r())); k++;
    }
    grass.count = k; grass.instanceMatrix.needsUpdate = true; if (grass.instanceColor) grass.instanceColor.needsUpdate = true; S.add(grass);
    // trees
    const nT = Math.round(120 * Q), trunks = new THREE.InstancedMesh((() => { const g = new THREE.CylinderGeometry(0.1, 0.17, 2.2, 6); g.translate(0, 1.1, 0); return g; })(), std(col('ink')), nT);
    const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.3, 0), std(col('paper')), nT); trunks.frustumCulled = crowns.frustumCulled = false;
    const tA = sh(0.05), tB = sh(0.16);
    let tN = 0;
    for (let i = 0; tN < nT && i < nT * 6; i++) {
      const a = r() * Math.PI * 2, d = 14 + r() * 46, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (!clear(x, z) || (Math.abs(x) < 3.5 && z > 6)) continue;
      const y = H(x, z), sc = 0.8 + r() * 0.9;
      m4.compose(p3.set(x, y, z), q.identity(), s3.set(sc, sc, sc)); trunks.setMatrixAt(tN, m4);
      e.set(r() * 0.5, r() * Math.PI, r() * 0.5); q.setFromEuler(e); m4.compose(p3.set(x, y + 2.2 * sc + 0.7 * sc, z), q, s3.set(sc * 1.1, sc * (1 + r() * 0.5), sc * 1.1)); crowns.setMatrixAt(tN, m4);
      crowns.setColorAt(tN, c.copy(tA).lerp(tB, r()));
      if (d < 26) W.colliders.push({ x, z, r: 0.4 * sc });
      tN++;
    }
    trunks.count = crowns.count = tN; S.add(trunks, crowns);
    // night flowers and stones
    const fN = Math.round(320 * Q), flowers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 6, 4), basic(col('paper')), fN); flowers.frustumCulled = false;
    const petals = [col('paper'), col('mist'), col('sealed'), green];
    let fk = 0;
    for (let i = 0; fk < fN && i < fN * 3; i++) { const a = r() * Math.PI * 2, d = 2 + Math.sqrt(r()) * 30, x = Math.cos(a) * d, z = Math.sin(a) * d; if (!clear(x, z)) continue; m4.compose(p3.set(x, H(x, z) + 0.22 + r() * 0.2, z), q.identity(), s3.setScalar(0.6 + r() * 0.8)); flowers.setMatrixAt(fk, m4); flowers.setColorAt(fk, petals[(r() * 4) | 0]); fk++; }
    flowers.count = fk; S.add(flowers);
    const stone = mix('iron', 'ash', 0.3);
    for (let i = 0; i < 16; i++) { const a = r() * Math.PI * 2, d = 6 + r() * 22, x = Math.cos(a) * d, z = Math.sin(a) * d; if (!clear(x, z)) continue; const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + r() * 0.5, 0), std(stone)); rk.position.set(x, H(x, z) + 0.1, z); rk.rotation.set(r() * 3, r() * 3, r() * 3); S.add(rk); }
    // fireflies
    const ffN = Math.round(380 * Q), fg = new THREE.BufferGeometry(), fp = new Float32Array(ffN * 3), home = [];
    for (let i = 0; i < ffN; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 22, x = Math.cos(a) * d, z = Math.sin(a) * d, y = H(x, z) + 0.3 + r() * 2.2; home.push([x, y, z, r() * 6]); fp.set([x, y, z], i * 3); }
    fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    const ff = new THREE.Points(fg, new THREE.PointsMaterial({ color: green, size: 0.15, map: GLOW, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); ff.frustumCulled = false; S.add(ff);
    W.ticks.push((t) => { if (RM) return; const a = fg.attributes.position.array; for (let i = 0; i < ffN; i++) { const b = home[i]; a[i * 3] = b[0] + Math.sin(t * 0.4 + b[3]) * 0.6; a[i * 3 + 1] = b[1] + Math.sin(t * 0.9 + b[3] * 2) * 0.25; a[i * 3 + 2] = b[2] + Math.cos(t * 0.35 + b[3]) * 0.6; } fg.attributes.position.needsUpdate = true; ff.material.opacity = 0.65 + 0.3 * Math.sin(t * 1.3); });

    const at = (x, z) => { const g = new THREE.Group(); g.position.set(x, H(x, z), z); S.add(g); return g; };
    const glass = (o) => new THREE.MeshStandardMaterial(Object.assign({ color: mix('paper', 'hortus', 0.15), transparent: true, opacity: 0.15, roughness: 0.05, metalness: 0.1, depthWrite: false }, o || {}));
    const leafy = mix('hortus', 'ash', 0.4);
    // the root lab
    { const [x, z] = ST.lab, g = at(x, z);
      const pl = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), std(col('iron'))); pl.position.y = 0.5;
      const soil = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.62, 0.84), std(col('graphite'))); soil.position.y = 1.32;
      const gl = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.95, 0.92), glass()); gl.position.y = 1.48;
      const segs = [], rr = rng(21);
      const grow = (px, py, pz, dx, dy, dz, len, depth) => { for (let i = 0; i < 5; i++) { const nx = px + dx * len, ny = py + dy * len, nz = pz + dz * len; if (ny < 1.04 || Math.abs(nx) > 0.4 || Math.abs(nz) > 0.4) return; segs.push(px, py, pz, nx, ny, nz); px = nx; py = ny; pz = nz; dx += (rr() - 0.5) * 0.6; dz += (rr() - 0.5) * 0.6; dy = Math.min(-0.35, dy + (rr() - 0.5) * 0.2); const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l; if (depth > 0 && rr() < 0.5) grow(px, py, pz, dx + (rr() - 0.5), dy * 0.6, dz + (rr() - 0.5), len * 0.8, depth - 1); } };
      for (let i = 0; i < 3; i++) grow(0, 1.62, 0, (rr() - 0.5) * 0.4, -1, (rr() - 0.5) * 0.4, 0.07, 3);
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3));
      const roots = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: green, transparent: true, opacity: 0.95, depthTest: false })); roots.renderOrder = 3;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.26, 5), std(leafy)); stem.position.y = 1.76;
      const lg = new THREE.SphereGeometry(0.06, 6, 4); lg.scale(1.6, 0.35, 1);
      const l1 = new THREE.Mesh(lg, std(leafy)); l1.position.set(0.07, 1.88, 0); l1.rotation.z = 0.4; const l2 = l1.clone(); l2.position.x = -0.07; l2.rotation.z = -0.4;
      g.add(pl, soil, gl, roots, stem, l1, l2, neon(pl, green, 0.6), neon(gl, green, 0.95), beam(green, 9, 0.14)); W.colliders.push({ x, z, r: 0.8 });
      W.ticks.push((t) => { roots.material.opacity = 0.6 + 0.4 * Math.abs(Math.sin(t * 1.4)); });
      addObject(W, 'lab', { x, z, y: 2.5, stand: [-5.0, -2.86], look: [x, 1.4, z] });
    }
    // the field
    { const [x, z] = ST.field, g = at(x, z);
      const plot = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.4), std(col('graphite'))); plot.rotation.x = -Math.PI / 2; plot.position.y = 0.03;
      const cg = new THREE.ConeGeometry(0.13, 0.5, 5); cg.translate(0, 0.25, 0);
      const crops = new THREE.InstancedMesh(cg, std(col('paper')), 54); crops.frustumCulled = false; let n = 0;
      const cropA = sh(0.35), cropB = mix('hortus', 'paper', 0.1);
      for (let a = 0; a < 6; a++) for (let b = 0; b < 9; b++) { m4.compose(p3.set(-1.9 + b * 0.47, 0.03, -1.3 + a * 0.52), q.identity(), s3.setScalar(0.8 + r() * 0.5)); crops.setMatrixAt(n, m4); crops.setColorAt(n, c.copy(cropA).lerp(cropB, r() * 0.5)); n++; }
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), std(col('iron'))); post.position.set(0, 0.6, 1.9);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), basic(green)); led.position.set(0, 1.22, 1.9);
      g.add(plot, crops, post, led, neon(plot, green, 0.85), beam(green, 9, 0.14));
      W.ticks.push((t) => { led.visible = Math.sin(t * 3) > 0; });
      addObject(W, 'field', { x, z, y: 1.9, hw: 4.2, range: 4.4, ringScale: 1.6, stand: [4.85, -3.9], look: [x, 0.4, z] });
    }
    // the medical plant
    { const [x, z] = ST.med, g = at(x, z);
      const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.9, 12), std(mix('iron', 'ash', 0.3))); pl.position.y = 0.45;
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.26, 10), std(col('iron'))); pot.position.y = 1.03;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.5, 5), std(leafy)); stem.position.y = 1.4;
      g.add(pl, pot, stem, neon(pl, green, 0.6), beam(green, 9, 0.14));
      const leaf = new THREE.Shape(); leaf.moveTo(0, 0); leaf.quadraticCurveTo(0.09, 0.12, 0, 0.32); leaf.quadraticCurveTo(-0.09, 0.12, 0, 0);
      const lgeo = new THREE.ShapeGeometry(leaf, 6), lmat = std(mix('hortus', 'ash', 0.5), { side: THREE.DoubleSide });
      for (let i = 0; i < 9; i++) { const lf = new THREE.Mesh(lgeo, lmat); lf.position.y = 1.18 + (i % 3) * 0.1; lf.rotation.set(-0.9 + (i % 3) * 0.2, i * 2.4, 0); g.add(lf); }
      [[0.05, 1.68, 0], [-0.06, 1.62, 0.04], [0, 1.6, -0.06]].forEach((p) => { const fl = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), basic(col('paper'))); fl.position.set(p[0], p[1], p[2]); g.add(fl); });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass({ opacity: 0.13, side: THREE.DoubleSide })); dome.position.y = 0.9;
      g.add(dome); W.colliders.push({ x, z, r: 0.75 });
      addObject(W, 'med', { x, z, y: 2.3, stand: [-6.99, 5.39], look: [x, 1.2, z] });
    }
    // the feeding rig
    { const [x, z] = ST.feed, g = at(x, z); g.rotation.y = Math.atan2(0 - x, 8.5 - z);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1, 0.07), std(mix('ash', 'mist', 0.7), { flatShading: false, roughness: 0.6 })); panel.position.y = 1.35;
      const legA = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.85, 0.06), std(col('iron'))); legA.position.set(-0.75, 0.42, 0); const legB = legA.clone(); legB.position.x = 0.75;
      const trough = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, 0.42), std(col('graphite'))); trough.position.set(0, 0.12, 0.55);
      g.add(panel, legA, legB, trough, neon(panel, green, 0.8), neon(trough, green, 0.5), beam(green, 9, 0.14));
      const leds = [], tubeMat = new THREE.MeshStandardMaterial({ color: mix('paper', 'hortus', 0.15), transparent: true, opacity: 0.7, roughness: 0.2 });
      for (let i = 0; i < 5; i++) {
        const px = -0.6 + i * 0.3;
        const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.09, 16), std(col('iron'), { flatShading: false })); pump.rotation.x = Math.PI / 2; pump.position.set(px, 1.45, 0.08);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 24), basic(green)); ring.position.set(px, 1.45, 0.13);
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), basic(green)); led.position.set(px, 1.15, 0.05); leds.push(led);
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(px, 1.36, 0.1), new THREE.Vector3(px, 0.9, 0.3), new THREE.Vector3(px * 0.9, 0.35, 0.55)]);
        g.add(pump, ring, led, new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.014, 6, false), tubeMat));
      }
      W.colliders.push({ x, z, r: 1.0 });
      W.ticks.push((t) => { leds.forEach((l, i) => { l.visible = Math.sin(t * 4 + i * 1.3) > -0.2; }); });
      addObject(W, 'feed', { x, z, y: 2.4, stand: [6.85, 5.07], look: [x, 1.3, z] });
    }
    // the sensor node
    { const [x, z] = ST.node, g = at(x, z);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 1.6, 8), std(col('graphite'))); post.position.y = 0.8;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.2), std(col('graphite'))); head.position.y = 1.7;
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.5, 4), std(col('ash'))); ant.position.set(0.1, 2.05, 0);
      const solar = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.02, 0.32), std(col('ink'), { roughness: 0.3, metalness: 0.5 })); solar.position.set(0, 1.86, -0.05); solar.rotation.x = -0.5;
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), basic(green)); led.position.set(0, 1.7, 0.11);
      const halo = glow(green, 0.5, 0.8); halo.position.copy(led.position);
      g.add(post, head, ant, solar, led, halo, neon(head, green, 0.85), beam(green, 9, 0.14)); W.colliders.push({ x, z, r: 0.35 });
      W.ticks.push((t) => { const on = (t % 1.6) < 0.25; led.visible = on; halo.visible = on; });
      addObject(W, 'node', { x, z, y: 2.5, stand: [0, -9.7], look: [x, 1.6, z] });
    }
    exitPortal(W, 0, 12.5, Math.PI);
    W.bounds = { x: 0, z: 0, r: 30 };
    portalTick(W);
    return W;
  }

  /* ---------------- MACHINA: a server corridor ---------------- */
  function rainTexture() {
    const cv = makeCanvas(256, 256), x = cv.getContext('2d'); x.fillStyle = TOK.void; x.fillRect(0, 0, 256, 256);
    const cols = 16, drops = Array.from({ length: cols }, () => Math.random() * 256), chars = '01ΛΣΞΠ#*+<>=:{}[]';
    const tex = texFrom(cv, { repeat: [6, 1] }); let acc = 0;
    return { tex, tick(t, dt) {
      acc += dt; if (acc < 0.06) return; acc = 0;
      x.globalAlpha = 0.16; x.fillStyle = TOK.void; x.fillRect(0, 0, 256, 256); x.globalAlpha = 1; x.font = '14px "Geist Mono", monospace';
      for (let i = 0; i < cols; i++) { x.fillStyle = Math.random() < 0.08 ? TOK.paper : TOK.machina; x.fillText(chars[(Math.random() * chars.length) | 0], i * 16 + 2, drops[i]); drops[i] += 16; if (drops[i] > 256 && Math.random() > 0.9) drops[i] = 0; }
      tex.needsUpdate = true;
    } };
  }
  function buildMachina() {
    const W = World('machina', { spawn: { x: 0, z: 2, yaw: 0 } });
    const S = W.scene, r = rng(9), lime = col('machina'), dim = shade('machina', 0.1);
    S.background = col('void'); S.fog = new THREE.FogExp2(col('void'), 0.042);
    S.add(new THREE.HemisphereLight(lime, col('void'), 0.3), new THREE.AmbientLight(col('paper'), 0.12));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), std(col('void'), { roughness: 0.35, metalness: 0.6, flatShading: false })); floor.rotation.x = -Math.PI / 2; S.add(floor);
    const grid = new THREE.GridHelper(140, 140, lime, shade('machina', 0.16)); grid.material.transparent = true; grid.material.opacity = 0.24; grid.position.y = 0.003; S.add(grid);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(1, 1, 1), p3 = new THREE.Vector3();
    const racks = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 2.8, 1.1), new THREE.MeshStandardMaterial({ color: mix('void', 'ink', 0.5), roughness: 0.45, metalness: 0.7 }), 16);
    const LN = 16 * 30, leds = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.028, 0.07), basic(col('paper')), LN);
    racks.frustumCulled = leds.frustumCulled = false;
    let ri = 0, li = 0;
    [-1, 1].forEach((side) => { for (let k = 0; k < 8; k++) {
      const zc = -6 - k * 4.6; m4.compose(p3.set(side * 3.4, 1.4, zc), q, s3); racks.setMatrixAt(ri++, m4);
      W.colliders.push({ x0: side * 3.4 - 0.7, x1: side * 3.4 + 0.7, z0: zc - 0.55, z1: zc + 0.55 });
      for (let cc = 0; cc < 3; cc++) for (let rr = 0; rr < 10; rr++) { m4.compose(p3.set(side * (3.4 - 0.71), 0.4 + rr * 0.22, zc - 0.32 + cc * 0.32), q, s3); leds.setMatrixAt(li, m4); leds.setColorAt(li, r() < 0.6 ? lime : dim); li++; }
    } });
    leds.instanceMatrix.needsUpdate = true; S.add(racks, leds);
    W.ticks.push(() => { for (let i = 0; i < 14; i++) leds.setColorAt((Math.random() * LN) | 0, Math.random() < 0.6 ? lime : dim); leds.instanceColor.needsUpdate = true; });
    [-2.45, 2.45].forEach((xs) => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 50), basic(lime)); s.position.set(xs, 0.01, -20); S.add(s); });
    const PN = 46, pulses = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.012, 0.5), basic(lime), PN); pulses.frustumCulled = false;
    const lanes = [-2.45, -1.2, 0, 1.2, 2.45], pd = Array.from({ length: PN }, () => ({ x: lanes[(Math.random() * 5) | 0], z: 6 - Math.random() * 50, v: 5 + Math.random() * 9 }));
    S.add(pulses);
    W.ticks.push((t, dt) => { pd.forEach((p, i) => { p.z -= p.v * dt * (RM ? 0.2 : 1); if (p.z < -44) p.z = 6; m4.compose(p3.set(p.x, 0.012, p.z), q, s3); pulses.setMatrixAt(i, m4); }); pulses.instanceMatrix.needsUpdate = true; });
    const rain = rainTexture();
    const rainMat = new THREE.MeshBasicMaterial({ map: rain.tex, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
    [-1, 1].forEach((side) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(52, 10), rainMat); w.position.set(side * 5.6, 5, -20); w.rotation.y = -side * Math.PI / 2; S.add(w); });
    const endW = new THREE.Mesh(new THREE.PlaneGeometry(26, 12), rainMat); endW.position.set(0, 6, -56); S.add(endW);
    W.ticks.push(rain.tick);
    // the core
    const core = new THREE.Group(); core.position.set(0, 0, -47); S.add(core);
    const cbase = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2, 0.35, 40), std(mix('void', 'ink', 0.5), { metalness: 0.7, roughness: 0.4, flatShading: false })); cbase.position.y = 0.175;
    const cring = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.02, 6, 96), basic(lime)); cring.rotation.x = Math.PI / 2; cring.position.y = 0.36;
    const ico = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.5, 1)), new THREE.LineBasicMaterial({ color: lime, transparent: true, opacity: 0.8 })); ico.position.y = 2.6;
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), basic(lime)); inner.position.y = 2.6;
    const halo = glow(lime, 4.5, 0.5); halo.position.y = 2.6;
    const rings = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(2.1 + i * 0.28, 0.012, 6, 120), basic(lime, { transparent: true, opacity: 0.5 })); m.position.y = 2.6; return m; });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 30, 16, 1, true), basic(lime, { transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false })); shaft.position.y = 15;
    const cl = new THREE.PointLight(lime, 1.6, 18, 2); cl.position.y = 2.6;
    core.add(cbase, cring, ico, inner, halo, shaft, cl); rings.forEach((m) => core.add(m));
    let coreBoost = 0;
    W.ticks.push((t, dt) => { const sp = RM ? 0.2 : 1; ico.rotation.y += dt * 0.25 * sp; ico.rotation.x += dt * 0.1 * sp; rings[0].rotation.x = t * 0.3 * sp; rings[1].rotation.y = t * 0.22 * sp; rings[1].rotation.x = 1.1; rings[2].rotation.z = t * 0.18 * sp; rings[2].rotation.x = 0.5; const s = 1 + 0.06 * Math.sin(t * 2) + coreBoost * 0.2; inner.scale.setScalar(s); halo.material.opacity = 0.45 + coreBoost * 0.35; cl.intensity = 1.6 + coreBoost * 1.6; });
    W.colliders.push({ x: 0, z: -47, r: 2.2 });
    // the stations, alternating down the corridor
    const plinthMat = new THREE.MeshStandardMaterial({ color: mix('void', 'ink', 0.3), roughness: 0.4, metalness: 0.7 });
    const plinth = (x, z) => { const g = new THREE.Group(); g.position.set(x, 0, z); const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.85, 0.7), plinthMat); b.position.y = 0.425; const ed = new THREE.LineSegments(new THREE.EdgesGeometry(b.geometry), new THREE.LineBasicMaterial({ color: lime, transparent: true, opacity: 0.55 })); ed.position.copy(b.position); g.add(b, ed); S.add(g); W.colliders.push({ x, z, r: 0.62 }); return g; };
    const edge = (mesh, op) => { const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: lime, transparent: true, opacity: op || 0.8 })); e.position.copy(mesh.position); e.rotation.copy(mesh.rotation); return e; };
    const stop = (x, z, y) => ({ stand: [0, z + 1.6], look: [x, y || 1.0, z] });
    { const g = plinth(-1.75, -9); for (let i = 0; i < 8; i++) { const card = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.6), std(col('ink'))); card.position.set(-0.35 + i * 0.1, 0.96, 0); g.add(card, edge(card, 0.7)); }
      addObject(W, 'gpus', Object.assign({ x: -1.75, z: -9, y: 1.75 }, stop(-1.75, -9))); }
    { const g = plinth(1.75, -15); const chip = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.045, 0.42), std(mix('iron', 'ash', 0.5), { metalness: 0.8, roughness: 0.3, flatShading: false })); chip.position.y = 0.875; const ihs = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.3), std(col('sealed'), { metalness: 0.9, roughness: 0.25, flatShading: false })); ihs.position.y = 0.905; g.add(chip, ihs, edge(chip, 0.9));
      addObject(W, 'cpu', Object.assign({ x: 1.75, z: -15, y: 1.75 }, stop(1.75, -15))); }
    { const g = plinth(-1.75, -21); for (let i = 0; i < 16; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.14, 0.5), std(col('graphite'))); s.position.set(-0.32 + i * 0.043, 0.92, 0); const l = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.01, 0.46), basic(lime)); l.position.set(s.position.x, 0.995, 0); g.add(s, l); }
      addObject(W, 'mem', Object.assign({ x: -1.75, z: -21, y: 1.75 }, stop(-1.75, -21))); }
    { const g = plinth(1.75, -27); [-0.2, 0.2].forEach((zz, i) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.24, 0.36), std(col('ink'), { metalness: 0.6, roughness: 0.4 })); b.position.set(0, 0.97, zz); g.add(b, edge(b, 0.6)); const tp = textPlane([{ t: i ? '1600 W' : '1500 W', font: '500 60px "Geist Mono"', color: TOK.machina, y: 80 }], 0.34, 512, 128); tp.position.set(-0.2, 0.97, zz); tp.rotation.y = -Math.PI / 2; g.add(tp); });
      addObject(W, 'power', Object.assign({ x: 1.75, z: -27, y: 1.8 }, stop(1.75, -27, 1.05))); }
    { const g = plinth(-1.75, -33); const sw = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.4), std(col('ink'), { metalness: 0.6 })); sw.position.y = 0.89; g.add(sw, edge(sw, 0.9));
      const fm = basic(lime, { transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
      for (let i = 0; i < 6; i++) { const x0 = -0.3 + i * 0.12, cv = new THREE.CatmullRomCurve3([new THREE.Vector3(x0, 0.93, 0), new THREE.Vector3(x0 * 1.6, 2.2, 0.4), new THREE.Vector3(x0 * 3, 5.5, 1.6)]); g.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 24, 0.008, 4, false), fm)); }
      addObject(W, 'net', Object.assign({ x: -1.75, z: -33, y: 1.75 }, stop(-1.75, -33, 1.2))); }
    addObject(W, 'core', { x: 0, z: -47, y: 5.2, hw: 4, hh: 5, range: 5.4, ringScale: 2.6, stand: [0, -42.2], look: [0, 2.6, -47], onFound: () => { coreBoost = 1; } });
    exitPortal(W, 0, 6, Math.PI);
    W.clampPos = (p) => { if (p.z > -40) { p.x = clamp(p.x, -2.3, 2.3); p.z = Math.min(p.z, 6.6); } else { const dz = p.z + 47, d = Math.hypot(p.x, dz); if (d > 7.6) { p.x = p.x / d * 7.6; p.z = -47 + dz / d * 7.6; } } };
    portalTick(W);
    return W;
  }

  /* ---------------- ARCA: a dark castle in magenta ---------------- */
  function stoneCanvas() {
    const cv = makeCanvas(256, 256), x = cv.getContext('2d'), r = rng(31);
    x.fillStyle = TOK.void; x.fillRect(0, 0, 256, 256);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { x.fillStyle = hex(mix('void', 'iron', 0.45 + r() * 0.5)); x.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); }
    x.fillStyle = TOK.paper;
    for (let k = 0; k < 900; k++) { x.globalAlpha = r() * 0.05; x.fillRect((r() * 256) | 0, (r() * 256) | 0, 2, 2); }
    x.globalAlpha = 1;
    return cv;
  }
  function bannerTex() {
    const cv = makeCanvas(256, 512), x = cv.getContext('2d'), r = rng(51);
    x.fillStyle = TOK.arca; x.fillRect(0, 0, 256, 512);
    x.fillStyle = TOK.void;
    for (let k = 0; k < 2600; k++) { x.globalAlpha = r() * 0.35; x.fillRect(((r() * 128) | 0) * 2, ((r() * 256) | 0) * 2, 2, 2); }
    x.globalAlpha = 1;
    horseInto(x, 128, 230, 210, TOK.paper);
    wordInto(x, 'arca', 128, 420, 96, 200, TOK.paper);
    return texFrom(cv);
  }
  function buildArca() {
    const W = World('arca', { spawn: { x: 0, z: 4, yaw: 0 } });
    const S = W.scene, pink = col('arca'), soft = mix('arca', 'paper', 0.3);
    S.background = col('void'); S.fog = new THREE.FogExp2(col('void'), 0.038);
    S.add(new THREE.HemisphereLight(soft, col('void'), 0.24), new THREE.AmbientLight(col('paper'), 0.05));
    const sc = stoneCanvas();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 62), new THREE.MeshStandardMaterial({ map: texFrom(sc, { repeat: [4, 11] }), roughness: 0.9 })); floor.rotation.x = -Math.PI / 2; floor.position.z = -21; S.add(floor);
    const wallMat = new THREE.MeshStandardMaterial({ map: texFrom(sc, { repeat: [12, 3] }), color: mix('iron', 'ash', 0.4), roughness: 1 });
    [-1, 1].forEach((side) => { const w = new THREE.Mesh(new THREE.BoxGeometry(1, 13, 62), wallMat); w.position.set(side * 11, 6.5, -21); S.add(w); });
    const endW = new THREE.Mesh(new THREE.BoxGeometry(22, 13, 1), wallMat); endW.position.set(0, 6.5, -51.5); const backW = endW.clone(); backW.position.z = 8.5; S.add(endW, backW);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(22, 62), std(col('void'))); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 13, -21); S.add(ceil);
    const colMat = std(col('iron'), { flatShading: false, roughness: 0.8 }), ban = bannerTex();
    [-1, 1].forEach((side) => { for (let k = 0; k < 7; k++) {
      const z = 1 - k * 7.5;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 11, 14), colMat); c.position.set(side * 6.2, 5.5, z);
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 1.3), colMat); b.position.set(side * 6.2, 0.25, z);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.4, 1.3), colMat); cap.position.set(side * 6.2, 11.2, z);
      S.add(c, b, cap); [0.52, 10.98].forEach((ry) => { const nr = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.016, 6, 40), basic(pink)); nr.rotation.x = Math.PI / 2; nr.position.set(side * 6.2, ry, z); S.add(nr); }); W.colliders.push({ x: side * 6.2, z, r: 0.75 });
      if (k % 2 === 0) { const bn = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 3.4), new THREE.MeshBasicMaterial({ map: ban, side: THREE.DoubleSide })); bn.position.set(side * 5.6, 7.2, z); bn.rotation.y = -side * Math.PI / 2; S.add(bn); }
      if (k < 6) {
        const win = new THREE.Mesh(archGeo(1.8, 4.6), basic(pink, { transparent: true, opacity: 0.22 })); win.position.set(side * 10.45, 3.2, z - 3.75); win.rotation.y = -side * Math.PI / 2; S.add(win); const wf = new THREE.Mesh(archBandGeo(1.8, 4.6, 0.06, 0.02), basic(pink)); wf.position.set(side * 10.42, 3.2, z - 3.75); wf.rotation.y = -side * Math.PI / 2; S.add(wf);
        const shaft = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 15), basic(soft, { transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        shaft.position.set(side * 7.4, 4.2, z - 3.75); shaft.rotation.set(0, -side * Math.PI / 2, side * 0.62); S.add(shaft);
      }
    } });
    dust(W, Math.round(420 * Q), 9, 10, soft, 0.5, 0.05, 0, -20); [-2.6, 2.6].forEach((xs) => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 57), basic(pink)); s.position.set(xs, 0.012, -21.5); S.add(s); });
    const flames = [], brass = std(mix('iron', 'ash', 0.4), { metalness: 0.7, roughness: 0.4 }), wax = std(col('mist'));
    const candle = (x, z) => { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 1.3, 6), brass); st.position.set(x, 0.65, z); const wx = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 8), wax); wx.position.set(x, 1.38, z); const f = glow(soft, 0.55, 0.9); f.position.set(x, 1.52, z); S.add(st, wx, f); flames.push(f); };
    const L1 = new THREE.PointLight(pink, 1.0, 16, 2); L1.position.set(0, 3, -12); const L2 = new THREE.PointLight(pink, 0.9, 16, 2); L2.position.set(0, 3, -32); const L3 = new THREE.PointLight(pink, 1.3, 14, 2); L3.position.set(0, 3.2, -47);
    S.add(L1, L2, L3);
    W.ticks.push((t) => { const fl = RM ? 0 : 1; L1.intensity = 1.05 + 0.15 * Math.sin(t * 7.3) * fl; L2.intensity = 0.95 + 0.15 * Math.sin(t * 6.1 + 1) * fl; flames.forEach((f, i) => { const s = 0.5 + 0.08 * Math.sin(t * 9 + i * 1.7) * fl; f.scale.set(s, s * 1.2, 1); }); });
    // the objects: sealed in grey until you inspect them
    const silver = std(mix('ash', 'paper', 0.25), { metalness: 0.8, roughness: 0.35 });
    const vitrine = (x, z, ry, key) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
      const pl = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), std(col('iron'))); pl.position.y = 0.5;
      const trim = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.06, 1.06), silver); trim.position.y = 1.0;
      const gl = new THREE.Mesh(new THREE.BoxGeometry(0.94, 1.0, 0.94), new THREE.MeshStandardMaterial({ color: col('mist'), transparent: true, opacity: 0.12, roughness: 0.05, depthWrite: false })); gl.position.y = 1.52;
      const m = sweepMat(null), pic = picture(key, 0.8, m); pic.position.set(0, 1.52, 0);
      g.add(pl, trim, gl, pic, neon(pl, pink, 0.5), neon(gl, pink, 0.85)); S.add(g); W.colliders.push({ x, z, r: 0.8 }); candle(x + (x < 0 ? -1.0 : 1.0), z + 1.1);
      return m;
    };
    const open = (m) => () => { if (RM) { m.uniforms.uP.value = 1; return; } const t0 = performance.now(); const step = () => { const u = Math.min(1, (performance.now() - t0) / 1400); m.uniforms.uP.value = 1 - Math.pow(1 - u, 3); if (u < 1) requestAnimationFrame(step); }; step(); };
    const mN = vitrine(-3.6, -6.5, Math.PI / 2, 'necklace');
    addObject(W, 'necklace', { x: -3.6, z: -6.5, y: 2.55, stand: [-1.3, -6.5], look: [-3.6, 1.5, -6.5], onFound: open(mN) });
    const mH = vitrine(3.6, -14, -Math.PI / 2, 'helmet');
    addObject(W, 'helmet', { x: 3.6, z: -14, y: 2.55, stand: [1.3, -14], look: [3.6, 1.5, -14], onFound: open(mH) });
    const mG = vitrine(-3.6, -21.5, Math.PI / 2, 'gauntlet');
    addObject(W, 'gauntlet', { x: -3.6, z: -21.5, y: 2.55, stand: [-1.3, -21.5], look: [-3.6, 1.5, -21.5], onFound: open(mG) });
    // the painting
    { const g = new THREE.Group(); g.position.set(3.6, 0, -29); g.rotation.y = -Math.PI / 2;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.1, 0.2), std(col('graphite'))); panel.position.y = 1.95;
      [[0, 3.08, 1.86, 0.1], [0, 0.92, 1.86, 0.1], [-0.88, 2.0, 0.1, 2.26], [0.88, 2.0, 0.1, 2.26]].forEach((f) => { const b = new THREE.Mesh(new THREE.BoxGeometry(f[2], f[3], 0.08), silver); b.position.set(f[0], f[1], 0.12); g.add(b); });
      const m = sweepMat(null), pic = picture('frazetta', 2.07, m); pic.position.set(0, 2.0, 0.11);
      g.add(panel, pic, neon(panel, pink, 0.7)); S.add(g); W.colliders.push({ x: 3.6, z: -29, r: 1.3 }); candle(4.9, -27.4);
      addObject(W, 'painting', { x: 3.6, z: -29, y: 3.7, hw: 2.4, hh: 3.4, range: 4.2, stand: [1.0, -29], look: [3.6, 2.0, -29], onFound: open(m) }); }
    // the chest
    { const g = new THREE.Group(); g.position.set(-3.6, 0, -36.5); g.rotation.y = Math.PI / 2;
      const wood = std(col('graphite'));
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.65), wood); body.position.y = 0.25;
      const band = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.06, 0.67), silver); band.position.y = 0.45;
      const pivot = new THREE.Group(); pivot.position.set(0, 0.5, -0.325);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 0.65), wood); lid.position.set(0, 0.06, 0.325); pivot.add(lid);
      const GN = 46, gems = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.045, 0), new THREE.MeshStandardMaterial({ color: col('paper'), metalness: 0.3, roughness: 0.15, flatShading: true, emissive: shade('arca', 0.12) }), GN); gems.frustumCulled = false;
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), rr = rng(77), gd = [];
      const stones = [pink, col('paper'), soft, col('mist'), pink, col('ash')];
      for (let i = 0; i < GN; i++) { const d = { x: (rr() - 0.5) * 0.8, y: 0.47 + rr() * 0.06, z: (rr() - 0.5) * 0.5, s: 0.7 + rr() * 0.8, p: rr() * 6 }; gd.push(d); m4.compose(p3.set(d.x, d.y, d.z), q, s3.setScalar(d.s)); gems.setMatrixAt(i, m4); gems.setColorAt(i, stones[i % stones.length]); }
      g.add(body, band, pivot, gems, neon(body, pink, 0.7)); S.add(g); W.colliders.push({ x: -3.6, z: -36.5, r: 0.8 }); candle(-4.9, -35.2);
      let openT = -1;
      W.ticks.push((t) => { if (openT >= 0) { const u = Math.min(1, (t - openT) / 1.2); pivot.rotation.x = -1.15 * (1 - Math.pow(1 - u, 3)); } if (!RM && pivot.rotation.x < -0.2) { for (let k = 0; k < 6; k++) { const i = (Math.random() * GN) | 0, d = gd[i]; m4.compose(p3.set(d.x, d.y, d.z), q, s3.setScalar(d.s * (0.8 + 0.5 * Math.abs(Math.sin(t * 4 + d.p))))); gems.setMatrixAt(i, m4); } gems.instanceMatrix.needsUpdate = true; } });
      addObject(W, 'chest', { x: -3.6, z: -36.5, y: 1.6, stand: [-1.4, -36.5], look: [-3.6, 0.5, -36.5], onFound: () => { openT = U.time.value; } }); }
    // the vault
    { const g = new THREE.Group(); g.position.set(0, 3.1, -50.9);
      const steel = std(col('iron'), { metalness: 0.85, roughness: 0.35, flatShading: false });
      const door = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.45, 56), steel); door.rotation.x = Math.PI / 2;
      const frame = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.18, 12, 72), std(col('graphite'), { metalness: 0.8, roughness: 0.4, flatShading: false }));
      const seam = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.025, 6, 96), basic(pink, { transparent: true, opacity: 0.5 })); seam.position.z = 0.24;
      const wheel = new THREE.Group(); wheel.position.z = 0.32;
      wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 8, 48), steel));
      for (let i = 0; i < 3; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.06), steel); sp.rotation.z = i * Math.PI / 3; wheel.add(sp); }
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 10), steel); b.rotation.x = Math.PI / 2; b.position.set(Math.cos(a) * 2.18, Math.sin(a) * 2.18, 0.25); g.add(b); }
      g.add(door, frame, seam, wheel); S.add(g);
      let spinT = -1;
      W.ticks.push((t) => { if (spinT >= 0) { const u = Math.min(1, (t - spinT) / 2.4); wheel.rotation.z = -Math.PI * 4 * (1 - Math.pow(1 - u, 3)); seam.material.opacity = 0.5 + 0.45 * u; } });
      addObject(W, 'vault', { x: 0, z: -49.6, y: 6.2, hw: 5, hh: 6, range: 5, ringScale: 1.8, stand: [0, -45.6], look: [0, 3.1, -50.9], onFound: () => { spinT = U.time.value; } }); }
    exitPortal(W, 0, 7.4, Math.PI);
    W.bounds = { rect: [-10.1, 10.1, -50.4, 7.6] };
    portalTick(W);
    return W;
  }
  const BUILD = { hub: buildHub, hortus: buildHortus, machina: buildMachina, arca: buildArca };
  function getWorld(name) {
    if (!state.worlds[name]) {
      const W = BUILD[name]();
      W.objects.sort((a, b) => a.order - b.order); // the route the auto walk takes
      state.worlds[name] = W;
    }
    return state.worlds[name];
  }

  /* =============================== sound: the score of each world, generated live =============================== */
  // Music is each world's ambience; sounds are the steps, signals and arches. Either can be on alone.
  const A = { ctx: null, out: null, verb: null, noiseBuf: null, amb: null, ambName: '', music: false, sounds: false, sleepT: 0 };
  const liveAudio = () => active && started && !document.hidden;
  A.ensure = function () {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { this.ctx = new AC(); } catch (_) { return false; }
    // Once the visitor chose sound, let it play through the iPhone's silent switch, as a film would.
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (_) { /* not offered */ }
    const c = this.ctx;
    this.out = c.createGain(); this.out.gain.value = 0;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
    this.out.connect(comp); comp.connect(c.destination);
    this.verb = c.createConvolver(); this.verb.buffer = impulse(3.4, 2.4);
    const wet = c.createGain(); wet.gain.value = 0.9; this.verb.connect(wet); wet.connect(this.out);
    this.noiseBuf = noiseBuffer(2.5);
    return true;
  };
  A.update = function () {
    const live = liveAudio(), on = live && (this.music || this.sounds);
    if (on && !this.ensure()) { this.music = this.sounds = false; syncOpts(); toast('Sound is not available in this browser.'); return; }
    if (!this.ctx) return;
    clearTimeout(this.sleepT);
    if (on && this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    const g = this.out.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(on ? 0.9 : 0, t + 0.5);
    const name = live && this.music && state.world ? state.world.name : '';
    if (name !== this.ambName) { if (this.amb) this.amb.stop(); this.amb = name && AMB[name] ? AMB[name]() : null; this.ambName = name; if (J.on) J.apply(); }
    if (!on) this.sleepT = setTimeout(() => { if (this.ctx && !(liveAudio() && (this.music || this.sounds))) this.ctx.suspend().catch(() => {}); }, 1700);
  };
  function impulse(sec, decay) { const c = A.ctx, n = (c.sampleRate * sec) | 0, b = c.createBuffer(2, n, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); } return b; }
  function noiseBuffer(sec) { const c = A.ctx, n = (c.sampleRate * sec) | 0, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); let last = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = w * 0.45 + last * 3; } return b; }
  function bus(level, send) {
    const c = A.ctx, g = c.createGain(), s = c.createGain();
    g.gain.setValueAtTime(0, c.currentTime); g.gain.linearRampToValueAtTime(level, c.currentTime + 2.5);
    g.connect(A.out); s.gain.value = send; g.connect(s); s.connect(A.verb);
    const b = { in: g, nodes: [], timers: [], dead: false };
    b.stop = (fast) => { if (b.dead) return; b.dead = true; const t = c.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + (fast ? 0.1 : 1.4)); b.timers.forEach((x) => clearTimeout(x.id)); setTimeout(() => { b.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* already stopped */ } }); try { g.disconnect(); s.disconnect(); } catch (e) { /* gone */ } }, fast ? 200 : 1600); };
    return b;
  }
  function every(b, fn, min, max) { const tm = { id: 0 }; const run = () => { if (b.dead) return; try { fn(); } catch (e) { /* keep going */ } tm.id = setTimeout(run, min + Math.random() * (max - min)); }; tm.id = setTimeout(run, 300 + Math.random() * min); b.timers.push(tm); }
  function osc(b, type, f, g, dest) { const c = A.ctx, o = c.createOscillator(), gn = c.createGain(); o.type = type; o.frequency.value = f; gn.gain.value = g; o.connect(gn); gn.connect(dest || b.in); o.start(); b.nodes.push(o); return { o, g: gn }; }
  function noiseNode(b) { const n = A.ctx.createBufferSource(); n.buffer = A.noiseBuf; n.loop = true; n.start(0, Math.random() * 2); b.nodes.push(n); return n; }
  function filt(type, f, q) { const x = A.ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; if (q) x.Q.value = q; return x; }
  function lfo(b, rate, depth, param) { const o = A.ctx.createOscillator(), g = A.ctx.createGain(); o.frequency.value = rate; g.gain.value = depth; o.connect(g); g.connect(param); o.start(); b.nodes.push(o); }
  function panTo(dest, p) { const c = A.ctx; if (c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = p; pn.connect(dest); return pn; } return dest; }
  function note(b, o) {
    const c = A.ctx, t = c.currentTime + (o.at || 0), x = c.createOscillator(), gn = c.createGain(), a = o.a || 0.005, d = o.d || 0.4;
    x.type = o.type || 'sine'; x.frequency.setValueAtTime(o.f, t); if (o.f2) x.frequency.exponentialRampToValueAtTime(o.f2, t + (o.glide || 0.1));
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(o.g || 0.05, t + a); gn.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    x.connect(gn); let node = gn;
    if (o.hp) { const h = filt('highpass', o.hp); gn.connect(h); node = h; }
    node.connect(panTo(o.dest || b.in, o.pan || 0));
    x.start(t); x.stop(t + a + d + 0.05);
  }
  function bell(b, f, g, at) {
    const c = A.ctx, t = c.currentTime + (at || 0), car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), amp = c.createGain();
    car.frequency.value = f; mod.frequency.value = f * 3.5;
    mg.gain.setValueAtTime(f * 2.2, t); mg.gain.exponentialRampToValueAtTime(1, t + 2.5); mod.connect(mg); mg.connect(car.frequency);
    amp.gain.setValueAtTime(0.0001, t); amp.gain.exponentialRampToValueAtTime(g, t + 0.01); amp.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);
    car.connect(amp); amp.connect(b.in); car.start(t); mod.start(t); car.stop(t + 4.6); mod.stop(t + 4.6);
  }
  const AMB = {
    hub() { const b = bus(1, 0.5), lp = filt('lowpass', 650); lp.connect(b.in); b.lp = lp; // the drone stone rides this filter and level
      [[110, 'sine', 0.05], [164.81, 'triangle', 0.03], [220, 'sine', 0.025], [277.18, 'triangle', 0.012]].forEach((v, i) => { const o = osc(b, v[1], v[0], v[2], lp); o.o.detune.value = (i - 1.5) * 5; });
      lfo(b, 0.05, 260, lp.frequency);
      every(b, () => bell(b, [880, 1174.66, 1318.51, 1760][(Math.random() * 4) | 0], 0.045), 6500, 12000); return b; },
    hortus() { const b = bus(1, 0.3), c = A.ctx;
      const w = noiseNode(b), wl = filt('lowpass', 480), wg = c.createGain(); wg.gain.value = 0.09; w.connect(wl); wl.connect(wg); wg.connect(b.in); lfo(b, 0.07, 0.05, wg.gain);
      const st = noiseNode(b), sb = filt('bandpass', 2400, 0.7), sg = c.createGain(); sg.gain.value = 0.02; st.connect(sb); sb.connect(sg); sg.connect(b.in);
      every(b, () => { const n = 2 + ((Math.random() * 3) | 0), f = 2200 + Math.random() * 2000, p = Math.random() * 1.6 - 0.8; for (let i = 0; i < n; i++) note(b, { f: f * (1 + i * 0.05), f2: f * 1.35, glide: 0.07, a: 0.004, d: 0.1, g: 0.03, pan: p, at: i * 0.11 }); }, 900, 3400);
      const pent = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
      every(b, () => { const f = pent[(Math.random() * pent.length) | 0]; note(b, { f, a: 0.004, d: 1.4, g: 0.045, pan: Math.random() * 0.8 - 0.4 }); note(b, { f: f * 2, a: 0.004, d: 0.5, g: 0.012 }); }, 1600, 4200); return b; },
    machina() { const b = bus(1, 0.25), c = A.ctx;
      osc(b, 'sine', 55, 0.06); osc(b, 'sine', 110, 0.03); osc(b, 'sine', 165, 0.012);
      const f = noiseNode(b), fb = filt('bandpass', 650, 0.9), fg = c.createGain(); fg.gain.value = 0.035; f.connect(fb); fb.connect(fg); fg.connect(b.in);
      const lp = filt('lowpass', 900, 6); lp.connect(b.in); lfo(b, 0.09, 700, lp.frequency);
      const seq = [55, 0, 110, 0, 82.41, 0, 110, 55, 0, 110, 0, 73.42, 0, 110, 0, 98]; let k = 0; const tm = { id: 0 }; b.timers.push(tm);
      const tick = () => { if (b.dead) return; const f0 = seq[k++ % 16]; if (f0) note(b, { type: 'sawtooth', f: f0 * 2, a: 0.003, d: 0.16, g: 0.05, dest: lp }); tm.id = setTimeout(tick, 125); }; tick();
      every(b, () => note(b, { type: 'square', f: [1760, 2093, 2637, 3136, 3520][(Math.random() * 5) | 0], a: 0.002, d: 0.05, g: 0.012, pan: Math.random() * 1.6 - 0.8, hp: 900 }), 160, 700); return b; },
    arca() { const b = bus(1, 0.65), c = A.ctx, lp = filt('lowpass', 380); lp.connect(b.in);
      const d1 = osc(b, 'sawtooth', 73.42, 0.045, lp); d1.o.detune.value = -6; const d2 = osc(b, 'sawtooth', 110, 0.03, lp); d2.o.detune.value = 5; lfo(b, 0.03, 90, lp.frequency);
      const w = noiseNode(b), wb = filt('bandpass', 520, 1.3), wg = c.createGain(); wg.gain.value = 0.022; w.connect(wb); wb.connect(wg); wg.connect(b.in); lfo(b, 0.05, 260, wb.frequency);
      const arp = [293.66, 349.23, 440, 587.33, 698.46, 880, 587.33, 440];
      every(b, () => { const n = 5 + ((Math.random() * 4) | 0), s = (Math.random() * 3) | 0; for (let i = 0; i < n; i++) note(b, { type: 'sawtooth', f: arp[(s + i) % arp.length], a: 0.002, d: 0.35, g: 0.022, hp: 400, at: i * 0.19, pan: i % 2 ? 0.25 : -0.25 }); }, 4200, 8200);
      every(b, () => bell(b, [220, 293.66][(Math.random() * 2) | 0], 0.035), 12000, 20000); return b; },
  };
  const STEPS = { hub: ['bandpass', 1800, 1, 0.05, 0.05], hortus: ['highpass', 2600, 0.7, 0.07, 0.09], machina: ['bandpass', 2800, 5, 0.06, 0.06], arca: ['bandpass', 750, 1.2, 0.09, 0.08] };
  const sfxOn = () => A.sounds && A.ctx && liveAudio();
  const SFX = {
    ok() { if (!sfxOn()) return; const b = { in: A.out }; note(b, { f: 1318.51, d: 0.5, g: 0.035 }); note(b, { f: 1760, d: 0.7, g: 0.025, at: 0.09 }); },
    found() { if (!sfxOn()) return; const b = { in: A.out }; [880, 1174.66, 1760].forEach((f, i) => note(b, { f, d: 0.9, g: 0.04, at: i * 0.11 })); bell({ in: A.verb }, 1318.51, 0.05, 0.3); },
    whoosh() { if (!sfxOn()) return; const c = A.ctx, n = c.createBufferSource(), f = filt('lowpass', 200, 2), g = c.createGain(), t = c.currentTime; n.buffer = A.noiseBuf; f.frequency.setValueAtTime(200, t); f.frequency.exponentialRampToValueAtTime(3200, t + 0.5); f.frequency.exponentialRampToValueAtTime(300, t + 1.1); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2); n.connect(f); f.connect(g); g.connect(A.out); n.start(t); n.stop(t + 1.3); },
    step(name) { if (!sfxOn()) return; const k = STEPS[name] || STEPS.hub, c = A.ctx, t = c.currentTime, n = c.createBufferSource(), f = filt(k[0], k[1], k[2]), g = c.createGain(); n.buffer = A.noiseBuf; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(k[3], t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + k[4]); n.connect(f); f.connect(g); g.connect(A.out); n.start(t, Math.random() * 2); n.stop(t + k[4] + 0.05); },
    // the stones rising: a low rumble of ground
    rise() { if (!sfxOn()) return; const c = A.ctx, n = c.createBufferSource(), f = filt('lowpass', 90, 1.4), g = c.createGain(), t = c.currentTime; n.buffer = A.noiseBuf; n.loop = true; f.frequency.setValueAtTime(90, t); f.frequency.linearRampToValueAtTime(240, t + 1.6); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4); n.connect(f); f.connect(g); g.connect(A.out); n.start(t, Math.random() * 2); n.stop(t + 2.5); },
  };
  // A suspended score wakes on the visitor's next touch or key, where a browser asks for a gesture to resume it.
  const nudgeAudio = () => { if (A.ctx && A.ctx.state !== 'running' && liveAudio() && (A.music || A.sounds)) A.ctx.resume().catch(() => {}); };
  view.addEventListener('pointerdown', nudgeAudio, true);
  addEventListener('keydown', () => { if (active) nudgeAudio(); }, true);

  /* =============================== the sound field: the jam in the house =============================== */
  // Once all three wings are explored, stones rise round the house column, and each one is a layer of a single endless
  // jam in A minor: up is louder, right is brighter, and below the dashed line a layer rests. A tap changes a stone's
  // loop; a scene loads a whole mix. One clock, one key, one progression, every pitch from the chord or the A minor
  // scales, so any mix stays musical. Generated live like the score. The drone stone rides the house's own ambience.
  const LAYERS = [
    { k: 'drone', name: 'Drone', c: 'paper', x: 0.34, y: 0.3, rune: 'M30 20 L30 70 M19 33 L41 33 M21 57 L39 57' },
    { k: 'drums', name: 'Drums', c: 'mist', x: 0.56, y: 0.42, rune: 'M17 28 L43 28 L17 64 L43 64' },
    { k: 'bass', name: 'Bass', c: 'ash', x: 0.23, y: 0.58, rune: 'M30 20 L30 70 M30 45 L43 32 M30 45 L43 58' },
    { k: 'doom', name: 'Doom', c: 'paper', x: 0.72, y: 0.6, rune: 'M18 24 L30 70 L42 24 M22 42 L38 42' },
    { k: 'hortus', name: 'Hortus', c: 'hortus', x: 0.1, y: 0.78, rune: 'M30 70 L30 28 M30 46 L17 33 M30 39 L43 26' },
    { k: 'machina', name: 'Machina', c: 'machina', x: 0.86, y: 0.9, rune: 'M17 28 L30 46 L43 28 M17 64 L30 46 L43 64' },
    { k: 'arca', name: 'Arca', c: 'arca', x: 0.5, y: 0.9, rune: 'M30 22 L45 47 L30 72 L15 47 Z' }];
  const LAYER = Object.fromEntries(LAYERS.map((l) => [l.k, l]));
  // Three stone outlines, used in turn; the runes sit in the same box.
  const STONE = ['M12 88 L7 34 Q9 10 30 5 Q51 9 53 32 L47 88 Z', 'M10 88 L12 26 Q18 6 34 6 Q50 12 50 30 L52 88 Z', 'M14 88 L9 40 Q8 14 28 6 Q48 4 51 26 L46 88 Z'];
  const STYLES = { drums: ['Doom', 'War drums', 'Pulse'], bass: ['Riff', 'Drone', 'Octaves'], doom: ['Fuzz riff', 'Swells'], hortus: ['Kalimba', 'Mycelium', 'Rain garden'], machina: ['Arpeggio', 'Acid', 'Night drive'], arca: ['Harpsichord', 'Dungeon synth', 'Music box'] };
  // A scene sets every loop, every stone and the tempo; a stone at y 0.9 rests.
  const SCENES = [
    { name: 'Stoner doom', bpm: 70, sty: { drums: 0, bass: 0, doom: 0, hortus: 0, machina: 0, arca: 0 }, mix: { drone: [0.34, 0.3], drums: [0.56, 0.42], bass: [0.23, 0.58], doom: [0.72, 0.6], hortus: [0.1, 0.78], machina: [0.86, 0.9], arca: [0.5, 0.9] } },
    { name: 'Dungeon synth', bpm: 62, sty: { drums: 1, bass: 1, doom: 1, hortus: 1, machina: 0, arca: 1 }, mix: { drone: [0.18, 0.28], drums: [0.48, 0.64], bass: [0.32, 0.5], doom: [0.68, 0.9], hortus: [0.68, 0.46], machina: [0.88, 0.9], arca: [0.55, 0.2] } },
    { name: 'Night machine', bpm: 88, sty: { drums: 2, bass: 2, doom: 0, hortus: 2, machina: 1, arca: 2 }, mix: { drone: [0.24, 0.68], drums: [0.78, 0.38], bass: [0.42, 0.46], doom: [0.6, 0.9], hortus: [0.15, 0.9], machina: [0.58, 0.2], arca: [0.88, 0.66] } },
    { name: 'Night drive', bpm: 84, sty: { drums: 2, bass: 2, doom: 1, hortus: 0, machina: 2, arca: 2 }, mix: { drone: [0.22, 0.5], drums: [0.6, 0.44], bass: [0.4, 0.36], doom: [0.44, 0.72], hortus: [0.12, 0.9], machina: [0.78, 0.24], arca: [0.88, 0.66] } },
    { name: 'Garden', bpm: 66, sty: { drums: 1, bass: 1, doom: 1, hortus: 2, machina: 0, arca: 2 }, mix: { drone: [0.5, 0.32], drums: [0.3, 0.9], bass: [0.2, 0.66], doom: [0.6, 0.9], hortus: [0.66, 0.24], machina: [0.86, 0.9], arca: [0.38, 0.56] } }];
  const REST = 0.86; // the dashed line: at or below it a layer rests
  const MIX = {}, STY = {};
  LAYERS.forEach((l) => { MIX[l.k] = { x: l.x, y: l.y }; });
  Object.keys(STYLES).forEach((k) => { STY[k] = 0; });
  let BPM = 70;
  const SF = { up: false, built: false, st: {}, scene: 0, glide: 0, want: false, told: false, dragEnd: 0, keyRow: false, sayT: 0, frame: 0 };
  // The mix is a per-viewer convenience, kept in this browser; every value is checked on its way back in.
  const SFK = 'lf-sound-field';
  try {
    const s = JSON.parse(localStorage.getItem(SFK) || 'null');
    if (s && typeof s === 'object') {
      if (s.mix && typeof s.mix === 'object') LAYERS.forEach((l) => { const m = s.mix[l.k]; if (m && Number.isFinite(+m.x) && Number.isFinite(+m.y)) MIX[l.k] = { x: clamp(+m.x, 0, 1), y: clamp(+m.y, 0.04, 0.91) }; });
      if (Number.isFinite(+s.bpm) && +s.bpm > 0) BPM = Math.round(clamp(+s.bpm, 56, 96));
      if (s.sty && typeof s.sty === 'object') Object.keys(STY).forEach((k) => { const v = s.sty[k] | 0; if (v >= 0 && v < STYLES[k].length) STY[k] = v; });
      SF.scene = Number.isInteger(s.scene) && s.scene >= -1 && s.scene < SCENES.length ? s.scene : -1;
    }
  } catch (_) { /* storage blocked: the default mix stands */ }
  const saveMix = () => { try { localStorage.setItem(SFK, JSON.stringify({ mix: MIX, bpm: BPM, sty: STY, scene: SF.scene })); } catch (_) { /* per-viewer convenience only */ } };
  const levelOf = (k) => { const y = MIX[k].y; return y >= REST ? 0 : Math.pow(clamp((REST - y) / 0.78, 0, 1), 1.6); };
  const toneOf = (k) => clamp(MIX[k].x, 0, 1);
  const AEOL = [0, 2, 3, 5, 7, 8, 10];
  const aeol = (deg, sharp) => { const o = Math.floor(deg / 7), d = ((deg % 7) + 7) % 7; return Math.pow(2, (AEOL[d] + 12 * o + (sharp && d === 6 ? 1 : 0)) / 12); };

  // The jam: one sixteenth-note clock, booked ahead on the audio clock so it keeps time when frames come slowly.
  const J = { on: false, wasOn: false, built: false, step: 0, next: 0, last: 0, ahead: 0.14, timer: 0, L: {}, flash: {}, acidPrev: 0 };
  const fuzzCurve = (k) => { const n = 2048, cv = new Float32Array(n), m = Math.tanh(k); for (let i = 0; i < n; i++) cv[i] = Math.tanh(k * (i * 2 / n - 1)) / m; return cv; };
  // A bus per layer: voices into pre, the stone's x drives the filter, its height the out level; Doom runs through a fuzz.
  J.build = function () {
    if (J.built) return true;
    if (!A.ensure()) return false;
    const c = A.ctx;
    const chain = (type, f, q, send) => {
      const pre = c.createGain(), flt = c.createBiquadFilter(), out = c.createGain();
      flt.type = type; flt.frequency.value = f; flt.Q.value = q; out.gain.value = 0;
      pre.connect(flt); flt.connect(out); out.connect(A.out);
      if (send) { const s = c.createGain(); s.gain.value = send; out.connect(s); s.connect(A.verb); }
      return { pre, flt, out };
    };
    J.L.drums = chain('lowpass', 9000, 0.6, 0.1);
    J.L.bass = chain('lowpass', 700, 1.2, 0.04);
    J.L.machina = chain('lowpass', 1600, 7, 0.22);
    J.L.hortus = chain('lowpass', 5200, 0.7, 0.5);
    J.L.arca = chain('highpass', 260, 0.7, 0.55);
    const pre = c.createGain(), sh = c.createWaveShaper(), hp = c.createBiquadFilter(), pk = c.createBiquadFilter(), cab = c.createBiquadFilter(), out = c.createGain(), ds = c.createGain();
    sh.curve = fuzzCurve(26); sh.oversample = '2x';
    hp.type = 'highpass'; hp.frequency.value = 90; pk.type = 'peaking'; pk.frequency.value = 850; pk.Q.value = 0.9; pk.gain.value = 4;
    cab.type = 'lowpass'; cab.frequency.value = 3200; cab.Q.value = 0.8; out.gain.value = 0; ds.gain.value = 0.16;
    pre.connect(sh); sh.connect(hp); hp.connect(pk); pk.connect(cab); cab.connect(out); out.connect(A.out); out.connect(ds); ds.connect(A.verb);
    J.L.doom = { pre, flt: cab, out };
    J.built = true;
    return true;
  };
  const MAXG = { drums: 0.9, bass: 0.55, doom: 0.42, machina: 0.3, hortus: 0.4, arca: 0.34 };
  const TONE = { drums: [1200, 3.6], bass: [180, 3.2], doom: [1400, 2.2], machina: [300, 4.6], hortus: [900, 3.2], arca: [120, 3] };
  // The whole mix onto the audio graph; quick while a stone is dragged. With the jam off the house's ambience is itself again.
  J.apply = function (fast) {
    if (!J.built) return;
    const t = A.ctx.currentTime, tc = fast ? 0.03 : 0.12;
    Object.keys(J.L).forEach((k) => {
      J.L[k].out.gain.setTargetAtTime(J.on ? levelOf(k) * MAXG[k] : 0, t, tc);
      J.L[k].flt.frequency.setTargetAtTime(TONE[k][0] * Math.pow(2, toneOf(k) * TONE[k][1]), t, tc);
    });
    const amb = A.amb;
    if (amb && amb.lp && !amb.dead && A.ambName === 'hub') {
      const g = amb.in.gain, f = amb.lp.frequency;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); f.cancelScheduledValues(t); f.setValueAtTime(f.value, t);
      if (J.on) { g.setTargetAtTime(levelOf('drone') * 1.15, t, tc); f.setTargetAtTime(260 * Math.pow(2, toneOf('drone') * 3), t, tc); }
      else { g.setTargetAtTime(1, t, 0.3); f.setTargetAtTime(650, t, 0.3); }
    }
  };
  // Four bars: Am | Am C | G | F E. E major brings the G sharp that pulls back to A.
  const ROOT = (s) => { const bar = s >> 4, beat = (s & 15) >> 2; if (bar === 0) return 55; if (bar === 1) return beat < 2 ? 55 : 65.41; if (bar === 2) return 49; return beat < 2 ? 43.65 : 41.2; };
  const TRI = (r) => (r === 55 ? [1, 1.2, 1.5] : [1, 1.26, 1.5]);
  // The voices: every note is a few short-lived nodes, booked at an exact time and stopped after its release.
  function vTone(t, type, f, peak, a, dec, dest, f2) {
    const c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dec);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + a + dec + 0.05);
  }
  function vHold(t, type, f, peak, len, rel, dest, detune) {
    const c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = f; if (detune) o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.008); g.gain.setValueAtTime(peak, t + Math.max(0.01, len - 0.02)); g.gain.exponentialRampToValueAtTime(0.0001, t + len + rel);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + len + rel + 0.05);
  }
  function vNoise(t, type, f, q, peak, dec, dest) {
    const c = A.ctx, n = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    n.buffer = A.noiseBuf; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    n.connect(fl); fl.connect(g); g.connect(dest); n.start(t, Math.random() * 2); n.stop(t + dec + 0.05);
  }
  // Every kick ducks the bass and lets it back in, a built-in pump.
  function kick(t) {
    vTone(t, 'sine', 150, 1, 0.004, 0.5, J.L.drums.pre, 42);
    vNoise(t, 'highpass', 2500, 0.7, 0.12, 0.02, J.L.drums.pre);
    const g = J.L.bass.pre.gain; g.cancelScheduledValues(t); g.setValueAtTime(0.55, t); g.linearRampToValueAtTime(1, t + 0.24);
  }
  function snare(t) { vNoise(t, 'bandpass', 1900, 0.8, 0.55, 0.26, J.L.drums.pre); vTone(t, 'triangle', 200, 0.3, 0.003, 0.13, J.L.drums.pre, 150); }
  function vSwell(t, type, f, peak, att, len, rel, dest, detune) {
    const c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = f; if (detune) o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + att); g.gain.setValueAtTime(peak, t + Math.max(att, len - 0.02)); g.gain.exponentialRampToValueAtTime(0.0001, t + len + rel);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + len + rel + 0.05);
  }
  function vBell(t, f, peak, dec, dest, ratio, index) {
    const c = A.ctx, car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain();
    car.frequency.value = f; mod.frequency.value = f * ratio;
    mg.gain.setValueAtTime(f * index, t); mg.gain.exponentialRampToValueAtTime(1, t + dec); mod.connect(mg); mg.connect(car.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    car.connect(g); g.connect(dest); car.start(t); mod.start(t); car.stop(t + dec + 0.05); mod.stop(t + dec + 0.05);
  }
  function vAcid(t, f, from, len, accent, base, dest) {
    const c = A.ctx, o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain(), pk = accent ? 0.34 : 0.22;
    o.type = 'sawtooth';
    if (from) { o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06); } else o.frequency.setValueAtTime(f, t);
    fl.type = 'lowpass'; fl.Q.value = 13; fl.frequency.setValueAtTime(base * (accent ? 7 : 4), t); fl.frequency.exponentialRampToValueAtTime(base, t + (accent ? 0.22 : 0.14));
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(pk, t + 0.004); g.gain.setValueAtTime(pk, t + len * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(fl); fl.connect(g); g.connect(dest); o.start(t); o.stop(t + len + 0.05);
  }
  function vOrgan(t, f, len, dest) {
    const lp = A.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2000; lp.connect(dest);
    vSwell(t, 'square', f, 0.05, 0.06, len, 0.45, lp, -6); vSwell(t, 'square', f, 0.05, 0.06, len, 0.45, lp, 6); vSwell(t, 'sine', f / 2, 0.08, 0.06, len, 0.45, lp);
  }
  // The sequencer: one step of every audible layer. A resting layer is skipped and costs nothing.
  J.play = function (s, t) {
    const sx = 60 / BPM / 4, bar = s >> 4, i = s & 15, root = ROOT(s), tri = TRI(root), on = (k) => levelOf(k) > 0.001;
    const segLen = bar % 2 === 1 ? 8 : 16, segStart = i % segLen === 0, pent = [1, 1.2, 1.335, 1.5, 1.782];
    if (on('drums')) {
      const d = J.L.drums.pre;
      if (STY.drums === 0) {
        if (i === 0 || i === 10 || (i === 7 && bar % 2 === 1)) kick(t);
        if (i === 8 || (bar === 3 && i >= 12)) snare(t);
        if (i % 2 === 0) vNoise(t, 'highpass', 7600, 0.7, i % 4 === 0 ? 0.15 : 0.08, i === 14 && bar % 2 ? 0.3 : 0.05, d);
        if (s === 0) vNoise(t, 'highpass', 3800, 0.5, 0.13, 1.8, d);
      } else if (STY.drums === 1) {
        if (i === 0 || i === 8) vTone(t, 'sine', 95, 0.9, 0.004, 0.7, d, 48);
        if (i === 4 || i === 12) vNoise(t, 'lowpass', 420, 0.8, 0.5, 0.22, d);
        if (i === 10 && bar % 2 === 0) vTone(t, 'sine', 80, 0.6, 0.004, 0.5, d, 44);
        if (bar === 3 && i >= 12) vTone(t, 'sine', 120 - (i - 12) * 10, 0.7, 0.004, 0.4, d, 60);
      } else {
        if (i % 4 === 0) kick(t);
        if (i === 4 || i === 12) { vNoise(t, 'bandpass', 1500, 0.9, 0.45, 0.16, d); vNoise(t + 0.018, 'bandpass', 1500, 0.9, 0.35, 0.14, d); }
        vNoise(t, 'highpass', 8000, 0.7, i % 4 === 2 ? 0.12 : 0.05, i % 4 === 2 ? 0.16 : 0.03, d);
      }
      J.flash.drums = t;
    }
    if (on('bass')) {
      const b = J.L.bass.pre;
      if (STY.bass === 0 && (i === 0 || i === 6 || i === 8 || i === 14)) {
        const len = (i === 6 || i === 14 ? 2 : 6) * sx;
        vHold(t, 'sawtooth', root, 0.45, len, 0.08, b); vHold(t, 'sine', root, 0.55, len, 0.1, b); J.flash.bass = t;
      } else if (STY.bass === 1 && segStart) {
        vSwell(t, 'sawtooth', root, 0.3, 0.25, segLen * sx, 0.3, b); vSwell(t, 'sine', root, 0.5, 0.2, segLen * sx, 0.3, b); J.flash.bass = t;
      } else if (STY.bass === 2 && i % 2 === 0) {
        vHold(t, 'sawtooth', i % 4 === 0 ? root : root * 2, 0.4, sx * 1.6, 0.04, b); J.flash.bass = t;
      }
    }
    if (on('doom')) {
      const g = J.L.doom.pre;
      if (STY.doom === 0) {
        const hit = (len) => { [1, 1.5, 2].forEach((r) => [-8, 8].forEach((dt) => vHold(t, 'sawtooth', root * 2 * r, 0.07, len, 0.35, g, dt))); J.flash.doom = t; };
        if (bar % 2 === 0) {
          if (i === 0) hit(6 * sx);
          else if (i === 6 || i === 7) [1, 1.5].forEach((r) => vHold(t, 'sawtooth', root * 2 * r, 0.06, sx * 0.5, 0.04, g, 6));
          else if (i === 8) hit(8 * sx);
        } else if (i === 0 || i === 8) hit(8 * sx);
      } else if (segStart) {
        [1, 1.5].forEach((r) => [-6, 6].forEach((dt) => vSwell(t, 'sawtooth', root * 2 * r, 0.06, Math.min(1.2, segLen * sx * 0.5), segLen * sx, 0.8, g, dt))); J.flash.doom = t;
      }
    }
    if (on('machina')) {
      const m = J.L.machina.pre;
      if (STY.machina === 0) {
        const pat = [0, 2, 1, 2, 0, 3, 2, 1], tones = [tri[0], tri[1], tri[2], 2];
        vTone(t, 'square', root * 4 * tones[pat[s % 8]] * (i >= 8 ? 2 : 1), 0.16, 0.003, sx * 0.9, m); J.flash.machina = t;
      } else if (STY.machina === 1) {
        const SEQ = [0, 0, 12, 0, 3, 0, 15, 7, 0, 10, 0, 12, 5, 0, 3, 7], ACC = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0], SLD = [0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1];
        const f = root * 2 * Math.pow(2, SEQ[i] / 12);
        vAcid(t, f, SLD[i] && J.acidPrev ? J.acidPrev : 0, sx * (SLD[(i + 1) % 16] ? 1.05 : 0.7), !!ACC[i], 220 * Math.pow(2, toneOf('machina') * 3), m);
        J.acidPrev = f; J.flash.machina = t;
      } else {
        if (i % 4 === 2) { tri.forEach((r) => vTone(t, 'sawtooth', root * 4 * r, 0.07, 0.004, sx * 1.4, m)); J.flash.machina = t; }
        vTone(t, 'square', root * 8 * tri[[0, 1, 2, 1][i % 4]], 0.035, 0.002, sx * 0.6, m);
      }
    }
    if (on('hortus')) {
      // nature shouldn't loop: the garden draws its notes by chance
      const h = J.L.hortus.pre;
      if (STY.hortus === 0) {
        if (i % 2 === 0 && Math.random() < 0.38) {
          const f = 440 * pent[(Math.random() * 5) | 0] * (Math.random() < 0.3 ? 2 : 1);
          vTone(t, 'triangle', f, 0.22, 0.004, 1.1, h); vTone(t, 'sine', f * 2, 0.06, 0.004, 0.5, h); J.flash.hortus = t;
        }
        if (i === 4 && Math.random() < 0.25) { const f0 = 2600 + Math.random() * 1600; for (let k = 0; k < 3; k++) vTone(t + k * 0.1, 'sine', f0, 0.05, 0.004, 0.09, h, f0 * 1.35); }
      } else if (STY.hortus === 1) {
        if (i % 4 === 0 && Math.random() < 0.65) { vBell(t, 220 * pent[(Math.random() * 5) | 0] * (Math.random() < 0.4 ? 2 : 1), 0.18, 2.6, h, 1.41, 1.6); J.flash.hortus = t; }
        if (i === 8 && Math.random() < 0.5) vTone(t, 'triangle', 110 * pent[(Math.random() * 5) | 0], 0.18, 0.01, 1.2, h);
      } else {
        vNoise(t, 'bandpass', 3800, 0.6, 0.05, 0.22, h);
        if (Math.random() < 0.5) vTone(t + Math.random() * sx, 'sine', 1500 + Math.random() * 2200, 0.05, 0.002, 0.05, h);
        if (i % 2 === 0 && Math.random() < 0.3) { vSwell(t, 'sine', 880 * pent[(Math.random() * 5) | 0], 0.09, 0.08, sx * 2.5, 0.4, h); J.flash.hortus = t; }
      }
    }
    if (on('arca')) {
      const a = J.L.arca.pre;
      if (STY.arca === 0 && i % 2 === 0) {
        const arp = [0, 1, 2, 1, 2, 0, 2, 1];
        vTone(t, 'sawtooth', root * 4 * tri[arp[(i >> 1) % 8]] * (bar % 2 ? 2 : 1), 0.09, 0.002, 0.34, a); J.flash.arca = t;
      } else if (STY.arca === 1) {
        const MEL = [[0, 2, 4, 3], [2, 0, -3, -1], [-1, 1, 3, 1], [0, -2, -3, -1]];
        if (i % 4 === 0) { vOrgan(t, 440 * aeol(MEL[bar][i >> 2], bar === 3 && i === 12), sx * 3.8, a); J.flash.arca = t; }
        if (segStart) tri.forEach((r) => vSwell(t, 'triangle', root * 4 * r, 0.05, 0.5, segLen * sx, 0.6, a));
      } else if (STY.arca === 2 && i % 2 === 0 && i % 8 !== 6) {
        vBell(t, root * 8 * tri[[2, 1, 0, 1][(i >> 1) % 4]], 0.12, 1.3, a, 4.0, 0.6); J.flash.arca = t;
      }
    }
  };
  // A light swing: even sixteenths a little long, odd ones a little short. Notes are booked 140 ms ahead; when a busy
  // frame holds the clock back, the walk books further ahead so the beat holds, then eases back.
  J.tick = function () {
    if (!A.ctx) return;
    const now = A.ctx.currentTime, gap = J.last ? now - J.last : 0;
    J.last = now; J.ahead = Math.min(0.5, Math.max(0.14, gap * 1.5, (J.ahead || 0.14) * 0.98));
    if (J.next < now - 0.2) J.next = now + 0.05; // after a stall, pick the beat up rather than rush to catch it
    while (J.next < now + J.ahead) { J.play(J.step, J.next); J.next += (60 / BPM / 4) * (J.step % 2 === 0 ? 1.08 : 0.92); J.step = (J.step + 1) % 64; }
  };
  // The jam is music: starting it turns music on if the visitor had it off.
  J.start = function () {
    J.wasOn = false;
    if (!A.music) { A.music = true; A.update(); syncOpts(); }
    if (!A.music || !J.build()) { syncJam(); return false; }
    if (!J.on) { J.on = true; J.step = 0; J.next = A.ctx.currentTime + 0.1; J.last = 0; J.acidPrev = 0; clearInterval(J.timer); J.timer = setInterval(J.tick, 25); }
    J.apply(); syncJam();
    return true;
  };
  // J.stop(true) pauses and remembers (a wing has its own score, or the visitor left the walk); J.stop() stops.
  J.stop = function (keep) {
    if (!J.on) { if (!keep) J.wasOn = false; return; }
    J.on = false; J.wasOn = !!keep; clearInterval(J.timer); J.timer = 0; J.apply(); syncJam();
  };

  /* =============================== HUD, panel, toasts =============================== */
  // One message at a time: a new one waits its turn, an answer to the visitor's own action (now) goes first, and a new
  // world clears whatever the last one was still saying.
  let toastT = 0;
  const toasts = [];
  function toast(msg, ms, now) {
    if (now) hush();
    else if (toasts.some((t) => t[0] === msg) || (toastT && el.toast.textContent === msg)) return;
    toasts.push([msg, ms || 3400]);
    if (!toastT) nextToast();
  }
  function nextToast() {
    const t = toasts.shift();
    if (!t) { toastT = 0; return; }
    el.toast.textContent = t[0]; el.toast.classList.add('on');
    toastT = setTimeout(() => { el.toast.classList.remove('on'); toastT = setTimeout(nextToast, toasts.length ? 280 : 0); }, t[1]);
  }
  function hush() { toasts.length = 0; clearTimeout(toastT); toastT = 0; el.toast.classList.remove('on'); }
  function hud() {
    const W = state.world;
    if (!W) return;
    el.dots.replaceChildren();
    if (W.name === 'hub') {
      WINGS.forEach((w) => { const b = document.createElement('b'); b.dataset.wing = w; if (done[w]) b.className = 'on'; el.dots.append(b); });
      el.count.textContent = WINGS.filter((w) => done[w]).length + '/' + WINGS.length + ' wings';
    } else {
      W.objects.forEach((o) => { if (o.counts === false) return; const b = document.createElement('b'); if (o.found) b.className = 'on'; el.dots.append(b); });
      el.count.textContent = progress[W.name].size + '/' + COUNT[W.name] + ' signals';
    }
    el.hud.hidden = !started;
    syncWings();
  }
  const PT = { on: false, t: 0, dur: 0, held: false }; // the auto walk's reading time for an open panel
  function openPanel(o, auto) {
    if (!o || state.panel) return;
    if (o.open) { o.open(); return; } // the stone circle opens the sound field
    state.panel = o; keys.clear(); release();
    el.pCode.textContent = o.code; el.pTitle.textContent = o.title; el.pBody.textContent = o.body;
    const pic = o.img && PICS[o.img];
    if (pic) { el.pImg.src = pic.src; el.pImg.alt = pic.alt; el.pPic.hidden = false; } else { el.pPic.hidden = true; el.pImg.removeAttribute('src'); el.pImg.alt = ''; }
    el.pStats.replaceChildren(...(o.stats || []).map((s) => { const d = document.createElement('div'), b = document.createElement('b'), sp = document.createElement('span'); b.textContent = s[0]; sp.textContent = s[1]; d.append(b, sp); return d; }));
    el.panel.classList.add('on'); el.panel.scrollTop = 0; el.prompt.classList.remove('on');
    PT.on = !!auto; PT.t = 0; PT.held = false; PT.dur = clamp(2.6 + (o.title.length + o.body.length) * 0.04, 5, 9);
    el.timer.hidden = !auto; el.timer.classList.remove('held'); if (el.timerBar) el.timerBar.style.transform = 'scaleX(1)';
    if (!auto) setTimeout(() => { if (state.panel === o) el.pClose.focus({ preventScroll: true }); }, 60);
    if (!o.found) found(o); else SFX.ok();
  }
  function closePanel() {
    if (!state.panel) return;
    state.panel = null; PT.on = false;
    el.panel.classList.remove('on');
    if (el.panel.contains(document.activeElement)) el.c.focus({ preventScroll: true });
  }
  function readTick(dt) {
    if (!state.panel || !PT.on || PT.held || el.set.open) return;
    PT.t += dt;
    const f = clamp(PT.t / PT.dur, 0, 1);
    if (el.timerBar) el.timerBar.style.transform = 'scaleX(' + (1 - f).toFixed(3) + ')';
    if (f >= 1) closePanel();
  }
  // A visitor who touches the open panel is reading: the auto walk waits for Close.
  el.panel.addEventListener('pointerdown', () => { if (PT.on) { PT.held = true; el.timer.classList.add('held'); } });
  el.panel.addEventListener('focusin', (e) => { if (PT.on && e.target !== el.pClose) { PT.held = true; el.timer.classList.add('held'); } });
  function found(o) {
    const W = state.world;
    o.found = true; progress[W.name].add(o.id); SFX.found(); if (o.onFound) o.onFound();
    hud();
    if (o.counts === false || !(W.name in done)) return;
    if (progress[W.name].size >= COUNT[W.name] && !done[W.name]) {
      done[W.name] = true;
      const hub = state.worlds.hub, hp = hub && hub.portals.find((p) => p.to === W.name);
      if (hp && hp.tag) hp.tag.visible = true;
      setTimeout(() => toast(NAMES[W.name] + ' explored. All ' + COUNT[W.name] + ' signals found.' + (AW.on ? '' : ' Walk back through the arch to the house.'), 5200), 900);
      if (WINGS.every((w) => done[w]) && !state.finalShown) { state.finalShown = true; setTimeout(showFinal, 4200); }
      syncWings();
    }
  }
  function showFinal() {
    if (!active) { state.finalShown = false; return; }
    closePanel();
    el.finN.textContent = TOTAL + ' of ' + TOTAL + ' signals';
    el.fin.hidden = false; keys.clear(); release();
    setTimeout(() => el.finX.focus({ preventScroll: true }), 50);
  }
  el.finX.addEventListener('click', () => { el.fin.hidden = true; el.c.focus({ preventScroll: true }); });
  el.pClose.addEventListener('click', closePanel);
  el.prompt.addEventListener('click', () => openPanel(state.focus));

  /* =============================== settings: the hamburger in the header =============================== */
  const OPTS = {
    auto: { get: () => AW.on, set: (v) => setAuto(v) },
    music: { get: () => A.music, set: (v) => { A.music = v; A.update(); if (!v) J.stop(); } }, // music off stops the jam too
    sounds: { get: () => A.sounds, set: (v) => { A.sounds = v; A.update(); } },
    gyro: { get: () => G.on, set: (v) => setGyro(v) },
  };
  function syncOpts() {
    el.set.querySelectorAll('[data-opt]').forEach((b) => b.setAttribute('aria-checked', OPTS[b.dataset.opt].get() ? 'true' : 'false'));
    syncWalk();
  }
  function syncWings() {
    el.set.querySelectorAll('[data-to]').forEach((a) => {
      const w = a.dataset.to, n = a.querySelector('[data-n]');
      if (n) n.textContent = w === 'hub' ? WINGS.filter((x) => done[x]).length + '/' + WINGS.length + ' wings' : (done[w] ? 'Explored' : progress[w].size + '/' + COUNT[w]);
      if (state.world && state.world.name === w) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  const KEYS = COARSE
    ? [['Round button', 'Hold to walk where you look'], ['Drag', 'Look around']].concat(MOTION ? [['Your phone', 'Turn it to look around']] : [], [['Tap a signal', 'Inspect it'], ['Arches', 'Walk in to change worlds']])
    : [['W A S D', 'Walk (Shift to hurry)'], ['Drag', 'Look around'], ['Arrow keys', 'Walk and turn'], ['E', 'Inspect a signal, close it again'], ['M', 'Music on or off'], ['Esc', 'Close a signal or the settings']];
  KEYS.forEach((k) => { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = k[0]; dd.textContent = k[1]; el.keys.append(dt, dd); });
  if (el.gyroOpt) el.gyroOpt.hidden = !MOTION;
  let setOpener = null;
  function openSettings() {
    if (!active || el.set.open) return;
    syncOpts(); syncWings(); syncField();
    setOpener = document.activeElement; keys.clear(); release();
    if (typeof el.set.showModal === 'function') el.set.showModal(); else el.set.setAttribute('open', '');
    el.menu.setAttribute('aria-expanded', 'true');
  }
  function closeSettings() { if (!el.set.open) return; if (typeof el.set.close === 'function') el.set.close(); else { el.set.removeAttribute('open'); el.set.dispatchEvent(new Event('close')); } }
  el.menu.addEventListener('click', () => (el.set.open ? closeSettings() : openSettings()));
  el.setX.addEventListener('click', closeSettings);
  el.set.addEventListener('close', () => { el.menu.setAttribute('aria-expanded', 'false'); if (setOpener && setOpener.isConnected && active) setOpener.focus({ preventScroll: true }); setOpener = null; });
  el.set.addEventListener('click', (e) => {
    if (e.target === el.set) { closeSettings(); return; }
    const b = e.target.closest('[data-opt]');
    if (b) { OPTS[b.dataset.opt].set(b.getAttribute('aria-checked') !== 'true'); syncOpts(); return; }
    if (e.target.closest('a[href^="#"]')) closeSettings(); // a place in the house, or Start a project: leave the dialog first
  });

  /* =============================== the sound field: the mixer =============================== */
  // A glass card over the walk. Each stone sits where the mix puts it, through custom properties: --x is brightness,
  // --y loudness (below the dashed line it rests), --lv lights its rune and --p pulses it on the layer's hits.
  const HINT = COARSE ? 'Drag to mix, tap to change a loop.' : 'Drag a stone: up is louder, right is brighter. Click it to change its loop.';
  function syncJam() {
    if (!el.sfJam) return;
    el.sfJam.setAttribute('aria-pressed', J.on ? 'true' : 'false');
    el.sfJam.lastElementChild.textContent = J.on ? 'Jam on' : 'Jam off';
    el.sfField.classList.toggle('off', !J.on);
  }
  function syncTempo() { el.sfBpm.value = String(BPM); el.sfBpmV.textContent = BPM + ' BPM'; }
  // Once the stones can wake, the settings offer the field, and on a keyboard F opens it.
  function syncField() {
    el.sfSec.hidden = !allDone();
    if (allDone() && !COARSE && !SF.keyRow) { SF.keyRow = true; const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = 'F'; dd.textContent = 'Open the sound field'; el.keys.append(dt, dd); }
  }
  // The jam belongs to the house: a wing pauses it for its own score, and the house picks it up again.
  function jamWorld(name) {
    if (name !== 'hub') { J.stop(true); closeMixer(); return; }
    const waking = allDone() && !SF.up;
    if (waking) riseStones(SF.want ? 300 : 700);
    if (J.wasOn && A.music) J.start();
    if (SF.want) {
      SF.want = false;
      const tryOpen = () => { if (!active || !state.world || state.world.name !== 'hub') return; if (state.busy) { setTimeout(tryOpen, 150); return; } openMixer(); };
      setTimeout(tryOpen, waking && !RM ? 2600 : 650);
    }
  }
  function riseStones(delay) {
    const W = state.worlds.hub;
    if (!W || !W.ring || SF.up) return;
    SF.up = true; syncField();
    setTimeout(() => {
      if (state.world !== W || !active) { SF.up = false; return; } // gone before they woke: they wake on the way back
      W.ring.rise(false); SFX.rise();
      toast(AW.on ? 'The stones woke around the column.' : COARSE ? 'The stones woke around the column. Walk up to them to play.' : 'The stones woke around the column. Walk up to them, or press F, to play.', 6000);
    }, delay);
  }
  function buildField() {
    if (SF.built) return;
    SF.built = true;
    const NS = 'http://www.w3.org/2000/svg';
    LAYERS.forEach((l, i) => {
      const b = document.createElement('button'), svg = document.createElementNS(NS, 'svg'), name = document.createElement('b'), loop = document.createElement('span');
      b.type = 'button'; b.className = 'sf-st'; b.dataset.k = l.k; b.setAttribute('aria-describedby', 'xp-sf-how');
      b.style.setProperty('--c', 'var(--' + l.c + ')'); b.style.setProperty('--ct', 'var(--' + (WINGS.indexOf(l.k) >= 0 ? l.k + '-t' : l.c) + ')');
      svg.setAttribute('viewBox', '0 0 60 92'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
      [['sh', STONE[i % 3]], ['gl', l.rune], ['ru', l.rune]].forEach(([c, d]) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('class', c); p.setAttribute('d', d); svg.append(p); });
      name.textContent = l.name;
      b.append(svg, name, loop); el.sfField.append(b); SF.st[l.k] = b;
    });
    SCENES.forEach((sc, n) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = sc.name; b.dataset.n = String(n); b.setAttribute('aria-pressed', 'false'); el.sfScenes.append(b); });
  }
  const LEVEL = (lv) => (lv < 0.15 ? 'quiet' : lv < 0.45 ? 'soft' : lv < 0.8 ? 'loud' : 'full');
  const BRIGHT = (x) => (x < 0.34 ? 'dark' : x < 0.67 ? 'warm' : 'bright');
  function placeStone(k) {
    const b = SF.st[k];
    if (!b) return;
    const m = MIX[k], lv = levelOf(k), loop = STYLES[k] ? STYLES[k][STY[k]] : '';
    b.style.setProperty('--x', m.x.toFixed(4)); b.style.setProperty('--y', m.y.toFixed(4)); b.style.setProperty('--lv', lv.toFixed(3));
    b.classList.toggle('rest', lv === 0);
    b.lastElementChild.textContent = loop;
    b.setAttribute('aria-label', LAYER[k].name + ': ' + (loop ? loop + ' loop, ' : '') + (lv === 0 ? 'resting below the line' : LEVEL(lv) + ', ' + BRIGHT(m.x)));
  }
  const placeAll = () => LAYERS.forEach((l) => placeStone(l.k));
  function markScene(n) {
    SF.scene = n;
    el.sfScenes.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', +b.dataset.n === n ? 'true' : 'false'));
  }
  const custom = () => { if (SF.scene !== -1) markScene(-1); }; // a change by hand makes the mix the visitor's own
  const stopGlide = () => { if (SF.glide) { cancelAnimationFrame(SF.glide); SF.glide = 0; } };
  function say(msg) {
    clearTimeout(SF.sayT);
    el.sfNote.textContent = msg; el.sfLive.textContent = msg;
    SF.sayT = setTimeout(() => { el.sfNote.textContent = HINT; }, 4200);
  }
  function cycleStyle(k) {
    const l = LAYER[k];
    if (!STYLES[k]) { say('The drone holds the hum of the house. Drag it to shape it.'); return; }
    STY[k] = (STY[k] + 1) % STYLES[k].length;
    if (k === 'machina') J.acidPrev = 0;
    custom(); placeStone(k); saveMix();
    const loop = STYLES[k][STY[k]];
    say(levelOf(k) > 0 ? l.name + ': ' + loop + '.' : l.name + ' rests below the line. Drag it up to hear ' + loop + '.');
  }
  // A scene glides every stone to its place while the mix follows; a scene is a wish to hear it, so it starts the jam.
  function loadScene(n) {
    const S = SCENES[n];
    if (!S) return;
    stopGlide(); J.acidPrev = 0;
    Object.keys(STY).forEach((k) => { STY[k] = S.sty[k]; });
    BPM = S.bpm; syncTempo(); markScene(n);
    const from = {}, to = {};
    LAYERS.forEach((l) => { from[l.k] = MIX[l.k]; to[l.k] = { x: S.mix[l.k][0], y: S.mix[l.k][1] }; });
    if (!J.on) J.start();
    say(S.name + ', ' + S.bpm + ' BPM.');
    if (RM) { Object.assign(MIX, to); placeAll(); J.apply(); saveMix(); return; }
    const t0 = performance.now();
    const step = () => {
      const u = Math.min(1, (performance.now() - t0) / 700), e = 1 - Math.pow(1 - u, 3);
      LAYERS.forEach((l) => { const a = from[l.k], b = to[l.k]; MIX[l.k] = { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e }; });
      placeAll(); J.apply(true);
      if (u < 1) SF.glide = requestAnimationFrame(step); else { SF.glide = 0; J.apply(); saveMix(); }
    };
    step();
  }
  // Drag a stone to mix it. A press that moves less than 5 px is a tap, and a tap changes the loop.
  let drag = null;
  el.sfField.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.sf-st');
    if (!b || drag || e.button > 0) return;
    const f = el.sfField, fr = f.getBoundingClientRect(), br = b.getBoundingClientRect();
    drag = { k: b.dataset.k, b, id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false, ox: e.clientX - br.left, oy: e.clientY - br.top,
      L: fr.left + f.clientLeft, T: fr.top + f.clientTop, W: f.clientWidth, H: f.clientHeight, w: b.offsetWidth, h: b.offsetHeight, px: parseFloat(getComputedStyle(f).getPropertyValue('--px')) || 24 };
    try { b.setPointerCapture(e.pointerId); } catch (_) { /* not captured: still fine */ }
    stopGlide();
  });
  el.sfField.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved) { if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return; drag.moved = true; drag.b.classList.add('drag'); }
    const d = drag, left = e.clientX - d.L - d.ox, top = e.clientY - d.T - d.oy;
    MIX[d.k] = { x: clamp((left - d.px) / Math.max(1, d.W - d.w - 2 * d.px), 0, 1), y: clamp(0.04 + (top - 8) / Math.max(1, d.H - d.h - 16) * 0.87, 0.04, 0.91) };
    custom(); placeStone(d.k); J.apply(true);
  });
  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const d = drag;
    drag = null; d.b.classList.remove('drag');
    if (d.moved) { SF.dragEnd = performance.now(); J.apply(); saveMix(); }
  }
  el.sfField.addEventListener('pointerup', endDrag); el.sfField.addEventListener('pointercancel', endDrag); el.sfField.addEventListener('lostpointercapture', endDrag);
  el.sfField.addEventListener('click', (e) => { const b = e.target.closest('.sf-st'); if (b && performance.now() - SF.dragEnd > 400) cycleStyle(b.dataset.k); });
  // On a keyboard: the arrow keys move a stone, Shift moves it further, Enter or Space changes its loop.
  el.sfField.addEventListener('keydown', (e) => {
    const b = e.target.closest && e.target.closest('.sf-st'), v = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
    if (!b || !v) return;
    e.preventDefault(); stopGlide();
    const k = b.dataset.k, s = e.shiftKey ? 0.1 : 0.03, m = MIX[k];
    MIX[k] = { x: clamp(m.x + v[0] * s, 0, 1), y: clamp(m.y + v[1] * s, 0.04, 0.91) };
    custom(); placeStone(k); J.apply(); saveMix();
  });
  el.sfScenes.addEventListener('click', (e) => { const b = e.target.closest('button[data-n]'); if (b) loadScene(+b.dataset.n); });
  el.sfBpm.addEventListener('input', () => { BPM = Math.round(clamp(+el.sfBpm.value || 70, 56, 96)); syncTempo(); custom(); saveMix(); });
  el.sfJam.addEventListener('click', () => { if (J.on) J.stop(); else if (!J.start()) say('Sound is not available in this browser.'); });
  function openMixer() {
    if (!active || !started || !ready || !allDone() || el.sf.open) return;
    if (!state.world || state.world.name !== 'hub') {
      // The field is in the house: walk there first, and turn music on now, while the visitor's tap still counts.
      if (!A.music) { A.music = true; A.update(); syncOpts(); }
      SF.want = true; navigate('hub'); return;
    }
    closePanel(); closeSettings(); keys.clear(); release(); hush();
    const W = state.world;
    if (W.ring) W.ring.field.found = true;
    buildField(); placeAll(); syncTempo(); markScene(SF.scene);
    const ok = J.start(); // inside the tap or key, so the browser lets the audio start
    if (typeof el.sf.showModal === 'function') el.sf.showModal(); else el.sf.setAttribute('open', '');
    clearTimeout(SF.sayT); el.sfNote.textContent = HINT;
    if (!ok) say('Sound is not available in this browser.');
    SF.st.drone.focus({ preventScroll: true });
  }
  function closeMixer() { if (!el.sf.open) return; if (typeof el.sf.close === 'function') el.sf.close(); else { el.sf.removeAttribute('open'); el.sf.dispatchEvent(new Event('close')); } }
  el.sfX.addEventListener('click', closeMixer);
  el.sf.addEventListener('click', (e) => { if (e.target === el.sf && performance.now() - SF.dragEnd > 400) closeMixer(); });
  el.sf.addEventListener('close', () => {
    stopGlide(); endDrag();
    if (!active) return;
    el.c.focus({ preventScroll: true });
    if (J.on && !SF.told) { SF.told = true; toast('The jam plays on while you walk the house.', 4200); }
  });
  el.sfGo.addEventListener('click', () => { closeSettings(); openMixer(); });
  // Each frame while the field is open: pulse the runes on their layers' hits.
  function sfTick() {
    const now = A.ctx ? A.ctx.currentTime : 0;
    LAYERS.forEach((l) => {
      const b = SF.st[l.k], f = J.flash[l.k];
      if (!b) return;
      const ago = J.on && f != null ? now - f : 9, p = RM || ago < 0 ? 0 : Math.exp(-ago / 0.16), v = p > 0.02 ? p.toFixed(2) : '0';
      if (b.lfP !== v) { b.lfP = v; b.style.setProperty('--p', v); }
    });
  }

  /* =============================== auto walk: the house walks you through it =============================== */
  // It visits every signal of a wing in turn, reads each one out on its panel, walks back through the arch and on to
  // the next wing, in the house order. Looking around stays with the visitor; any step of their own takes over.
  const AW = { on: prefs.auto, goal: null, phase: 'walk', t: 0, lastD: 1e9, stuck: 0, wait: 0, detour: null, roam: 0, told: false };
  AW.reset = () => { AW.goal = null; AW.phase = 'walk'; AW.t = 0; AW.lastD = 1e9; AW.stuck = 0; AW.detour = null; };
  function setAuto(v, tookOver) {
    if (AW.on === v) return;
    AW.on = v; prefs.auto = v; savePrefs();
    AW.reset();
    if (v) { AW.wait = 0.6; keys.clear(); release(); if (started) toast(COARSE ? 'Auto walk is on. Press the round button to walk yourself.' : 'Auto walk is on. Press W or an arrow key to walk yourself.', 0, true); }
    else {
      // fold the looks into the heading, so the view stays put
      state.yaw = wrapA(state.yaw + state.lookYaw); state.lookYaw = 0;
      if (!G.live()) { state.pitch = clamp(state.pitch + state.lookPitch, -1.15, 1.15); state.lookPitch = 0; }
      if (tookOver && !AW.told) { AW.told = true; toast('Auto walk is off. Turn it on again in the settings.', 0, true); }
    }
    syncOpts(); wake();
  }
  const stand = (o) => ({ kind: 'signal', o, x: o.stand[0], z: o.stand[1] });
  function nextGoal(W) {
    if (W.name === 'hub') {
      const house = W.objects[0], field = W.ring && W.ring.field;
      if (house && !house.found && !(field && field.live)) return stand(house);
      const next = WINGS.find((w) => !done[w]);
      if (next) { const p = W.portals.find((x) => x.to === next); return { kind: 'portal', p, x: p.x + p.nx * 3.2, z: p.z + p.nz * 3.2 }; }
      if (field && field.live && !field.found) return stand(field); // the stones woke: show them once
      AW.roam = (AW.roam + 1) % 8; // all three explored: an easy loop of the house, clear of the stones
      const a = AW.roam / 8 * Math.PI * 2;
      return { kind: 'roam', x: 2.5 + Math.cos(a) * 3.8, z: -0.5 + Math.sin(a) * 3.8 };
    }
    const o = W.objects.find((x) => x.counts !== false && !x.found);
    if (o) return stand(o);
    const p = W.portals.find((x) => x.to === 'hub');
    return { kind: 'portal', p, x: p.x + p.nx * 3.0, z: p.z + p.nz * 3.0 };
  }
  // The straight line to the goal, bent around the first round obstacle in the way.
  function steer(W, g) {
    const now = performance.now();
    if (AW.detour && now < AW.detour.until && Math.hypot(AW.detour.x - state.pos.x, AW.detour.z - state.pos.z) > 0.5) return AW.detour;
    AW.detour = null;
    const fx = state.pos.x, fz = state.pos.z, dx = g.x - fx, dz = g.z - fz, L = Math.hypot(dx, dz);
    if (L < 0.5) return g;
    const ux = dx / L, uz = dz / L;
    let hit = null;
    for (const c of W.colliders) {
      if (c.r === undefined) continue;
      const px = c.x - fx, pz = c.z - fz, along = px * ux + pz * uz;
      if (along <= 0 || along >= L) continue;
      const side = px * -uz + pz * ux, R = c.r + 0.6;
      if (Math.abs(side) < R && (!hit || along < hit.along)) hit = { c, along, side, R };
    }
    if (!hit) return g;
    const s = hit.side >= 0 ? 1 : -1; // pass on the far side of the obstacle
    return { x: hit.c.x + uz * s * (hit.R + 0.3), z: hit.c.z - ux * s * (hit.R + 0.3) };
  }
  function walkTo(W, dt, tx, tz, dist, speed) {
    const yawT = Math.atan2(-(tx - state.pos.x), -(tz - state.pos.z)), diff = wrapA(yawT - state.yaw);
    state.yaw += clamp(diff, -1.8 * dt, 1.8 * dt);
    state.pitch += (0 - state.pitch) * Math.min(1, dt * 2);
    const v = speed * Math.max(0.15, Math.cos(clamp(diff, -1.5, 1.5))) * Math.min(1, dist / 1.6 + 0.35);
    fwd.set(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
    want.copy(fwd).multiplyScalar(v);
    stride(W, dt);
  }
  function autoStep(W, dt) {
    if (AW.wait > 0) { AW.wait -= dt; want.set(0, 0, 0); stride(W, dt); return; }
    if (AW.phase === 'read') { if (!state.panel) { AW.reset(); AW.wait = 0.35; } return; }
    // At the stones the walk waits a while with Play in reach, then walks on; it never opens the field by itself.
    if (AW.phase === 'linger') {
      want.set(0, 0, 0); stride(W, dt);
      if ((AW.t += dt) > 9 || AW.goal.o.found) { AW.goal.o.found = true; AW.reset(); AW.wait = 0.4; }
      return;
    }
    if (!AW.goal) AW.goal = nextGoal(W);
    const g = AW.goal, d = Math.hypot(g.x - state.pos.x, g.z - state.pos.z);
    if (g.kind === 'signal' && g.o.found && AW.phase !== 'face') { AW.reset(); return; } // found by hand on the way
    if (AW.phase === 'walk') {
      if (d < (g.kind === 'roam' ? 0.9 : 0.35)) {
        if (g.kind === 'signal') { AW.phase = 'face'; AW.t = 0; } else if (g.kind === 'portal') AW.phase = 'enter'; else AW.goal = null;
        want.set(0, 0, 0); stride(W, dt); return;
      }
      const tgt = steer(W, g), far = g.kind === 'portal' && d > 12;
      walkTo(W, dt, tgt.x, tgt.z, d, g.kind === 'roam' ? 1.7 : far ? 5 : 2.8); // briskly back to an arch, easy among the signals
      // no headway for a while: read the signal from here if it is in reach, else sidestep
      if (d < AW.lastD - 0.02) { AW.lastD = d; AW.stuck = 0; } else if ((AW.stuck += dt) > 2.2) {
        AW.stuck = 0; AW.lastD = d;
        if (g.kind === 'signal' && Math.hypot(g.o.x - state.pos.x, g.o.z - state.pos.z) < g.o.range + 1) { AW.phase = 'face'; AW.t = 0; }
        else { const s = Math.random() < 0.5 ? 1 : -1; AW.detour = { x: state.pos.x + Math.cos(state.yaw) * 2 * s, z: state.pos.z - Math.sin(state.yaw) * 2 * s, until: performance.now() + 1400 }; }
      }
    } else if (AW.phase === 'face') {
      AW.t += dt;
      const [lx, ly, lz] = g.o.look, eye = ground(W, state.pos.x, state.pos.z) + 1.62;
      const yawT = Math.atan2(-(lx - state.pos.x), -(lz - state.pos.z)), pitchT = clamp(Math.atan2(ly - eye, Math.hypot(lx - state.pos.x, lz - state.pos.z)), -0.6, 0.6);
      const k = Math.min(1, dt * 4.2), diff = wrapA(yawT - state.yaw);
      state.yaw += diff * k; state.pitch += (pitchT - state.pitch) * k;
      want.set(0, 0, 0); stride(W, dt);
      if (AW.t > 1.1 || (AW.t > 0.45 && Math.abs(diff) < 0.04)) {
        if (g.o.linger) { AW.phase = 'linger'; AW.t = 0; toast(COARSE ? 'The sound field. Tap Play to mix the stones.' : 'The sound field. Press E to play.', 6000, true); }
        else { AW.phase = 'read'; if (!state.panel) openPanel(g.o, true); }
      }
    } else if (AW.phase === 'enter') {
      const p = g.p;
      walkTo(W, dt, p.x - p.nx * 1.4, p.z - p.nz * 1.4, 2, 2.2); // straight through the arch; the arch changes the route
    }
  }

  /* =============================== looking around: drag, and the phone itself =============================== */
  // With motion on, the phone's turn adds to the heading (calibrated to the way it faced when the world opened) and its
  // tilt sets the pitch. Inside an Artifact the sensors never answer, so the walk says so and keeps drag-to-look.
  const G = { on: false, heard: false, raw: null, cal: null, tYaw: 0, tPitch: 0, yaw: 0, pitch: 0, check: 0 };
  let GQ = null;
  G.live = () => G.on && G.heard;
  G.recenter = () => { G.cal = G.raw; G.tYaw = G.yaw = 0; };
  function onOrient(e) {
    if (e.alpha == null || e.beta == null || !GQ) return;
    const D = Math.PI / 180, so = ((screen.orientation && screen.orientation.angle) || window.orientation || 0) * D;
    GQ.e.set(e.beta * D, e.alpha * D, -e.gamma * D, 'YXZ');
    GQ.q.setFromEuler(GQ.e); GQ.q.multiply(GQ.q1); GQ.q.multiply(GQ.q0.setFromAxisAngle(GQ.z, -so));
    GQ.o.setFromQuaternion(GQ.q, 'YXZ');
    G.raw = GQ.o.y; if (G.cal === null) G.cal = G.raw;
    G.tYaw = wrapA(G.raw - G.cal); G.tPitch = clamp(GQ.o.x, -1.2, 1.2);
    if (!G.heard) { G.heard = true; G.yaw = G.tYaw; G.pitch = G.tPitch; state.lookPitch = 0; }
  }
  function listenMotion(on) { if (on) addEventListener('deviceorientation', onOrient); else removeEventListener('deviceorientation', onOrient); }
  // After motion is turned on, the phone must answer; inside an Artifact it never does.
  function askMotion() {
    clearTimeout(G.check);
    G.check = setTimeout(() => { if (G.on && !G.heard && active) { setGyro(false); toast('Your phone did not share its motion here. Drag to look around.', 4600); } }, 1800);
  }
  function setGyro(v) {
    if (!MOTION) return;
    clearTimeout(G.check);
    if (!v) {
      if (G.live()) { state.yaw = wrapA(state.yaw + G.yaw); state.pitch = G.pitch; }
      G.on = false; G.heard = false; G.yaw = 0; listenMotion(false);
      prefs.gyro = false; savePrefs(); syncOpts(); return;
    }
    prefs.gyro = true; savePrefs();
    const begin = () => { G.on = true; G.heard = false; G.cal = null; listenMotion(active); syncOpts(); askMotion(); };
    const DOE = window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === 'function') {
      // iOS asks once, and only from a tap: this call must stay inside the click that turned motion on.
      DOE.requestPermission().then((r) => { if (r === 'granted') begin(); else { prefs.gyro = false; savePrefs(); syncOpts(); toast('Motion is off for this page. Drag to look around.'); } })
        .catch(() => { prefs.gyro = false; savePrefs(); syncOpts(); toast('Motion is off for this page. Drag to look around.'); });
    } else begin();
  }
  const camYaw = () => state.yaw + state.lookYaw + (G.live() ? G.yaw : 0);
  function lookTick(dt) {
    if (G.live()) { const k = Math.min(1, dt * 14); G.yaw += wrapA(G.tYaw - G.yaw) * k; G.pitch += (G.tPitch - G.pitch) * k; }
    // After a drag the auto walk's view drifts back to the way it walks.
    if (look || performance.now() - state.lookAt < 900) return;
    const k = Math.min(1, dt * 1.6);
    if (AW.on) state.lookYaw += (0 - state.lookYaw) * k;
    if (AW.on || G.live()) state.lookPitch += (0 - state.lookPitch) * k;
  }

  /* =============================== input =============================== */
  const MOVE_KEYS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'];
  addEventListener('keydown', (e) => {
    if (!active || !started || el.set.open || el.sf.open || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = (e.key || '').toLowerCase();
    if (state.panel) { if (k === 'escape' || k === 'e') { closePanel(); e.preventDefault(); } return; }
    if (!el.fin.hidden || (e.target && e.target.closest && e.target.closest('input,textarea,select,dialog'))) return;
    if (MOVE_KEYS.indexOf(k) >= 0) {
      if (AW.on && k !== 'shift' && !state.busy) setAuto(false, true);
      keys.add(k); if (k.indexOf('arrow') === 0) e.preventDefault();
    } else if (k === 'e' || (k === 'enter' && (e.target === el.c || e.target === view || e.target === document.body))) { if (state.focus) { openPanel(state.focus); e.preventDefault(); } }
    else if (k === 'm') { OPTS.music.set(!A.music); syncOpts(); toast(A.music ? 'Music on.' : 'Music off.', 1600, true); }
    else if (k === 'f' || e.code === 'KeyF') { e.preventDefault(); if (allDone()) openMixer(); else toast('The stones wake once all three wings are explored.', 0, true); }
    else if (k === 'h' || k === '?') openSettings();
  });
  addEventListener('keyup', (e) => keys.delete((e.key || '').toLowerCase()));
  addEventListener('blur', () => { keys.clear(); release(); });
  let look = null;
  el.c.addEventListener('pointerdown', (e) => {
    if (!started || state.busy) return;
    if (state.panel) { closePanel(); return; }
    try { el.c.setPointerCapture(e.pointerId); } catch (_) { /* not captured: still fine */ }
    if (!look) look = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
  });
  el.c.addEventListener('pointermove', (e) => {
    if (!look || e.pointerId !== look.id) return;
    const dx = e.clientX - look.x, dy = e.clientY - look.y, s = e.pointerType === 'touch' ? 0.0052 : 0.0036;
    look.x = e.clientX; look.y = e.clientY; look.moved += Math.abs(dx) + Math.abs(dy);
    // The auto walk keeps its heading: a drag only looks away from it. A walker of their own turns with the drag.
    if (AW.on) state.lookYaw -= dx * s; else state.yaw -= dx * s;
    if (AW.on || G.live()) state.lookPitch = clamp(state.lookPitch - dy * s, -1.15, 1.15); else state.pitch = clamp(state.pitch - dy * s, -1.15, 1.15);
    state.lookAt = performance.now();
  });
  function endPointer(e) {
    if (!look || e.pointerId !== look.id) return;
    if (look.moved < 8 && e.type === 'pointerup' && state.world) {
      const r = el.c.getBoundingClientRect();
      ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(state.world.objects.filter((o) => o.live !== false).map((o) => o.hit), false);
      if (hits.length && hits[0].distance < 9) openPanel(hits[0].object.userData.obj);
    }
    look = null; state.lookAt = performance.now();
  }
  el.c.addEventListener('pointerup', endPointer); el.c.addEventListener('pointercancel', endPointer);
  el.c.addEventListener('contextmenu', (e) => e.preventDefault());
  // The round button: hold to walk where you look. Pressed while the auto walk leads, it takes over.
  function hold(e) {
    if (!started || state.busy || state.panel) return;
    if (e) { e.preventDefault(); try { el.walk.setPointerCapture(e.pointerId); } catch (_) { /* fine */ } }
    if (AW.on) setAuto(false, true);
    state.hold = true; el.walk.classList.add('on');
  }
  function release() { state.hold = false; el.walk.classList.remove('on'); }
  el.walk.addEventListener('pointerdown', hold);
  el.walk.addEventListener('pointerup', release); el.walk.addEventListener('pointercancel', release); el.walk.addEventListener('lostpointercapture', release);
  el.walk.addEventListener('contextmenu', (e) => e.preventDefault());
  el.walk.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); hold(null); } });
  el.walk.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') release(); });
  el.walk.addEventListener('blur', release);
  function syncWalk() {
    el.walk.hidden = !(COARSE && started);
    el.walk.classList.toggle('auto', AW.on);
    el.walk.setAttribute('aria-label', AW.on ? 'Auto walk is on. Press to walk yourself' : 'Hold to walk');
  }

  /* =============================== movement, focus, arches =============================== */
  function collide(W, p) {
    const R = 0.35;
    for (const c of W.colliders) {
      if (c.r !== undefined) { const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + R; if (d < m && d > 1e-5) { p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; } }
      else if (p.x > c.x0 - R && p.x < c.x1 + R && p.z > c.z0 - R && p.z < c.z1 + R) {
        const pen = [p.x - (c.x0 - R), (c.x1 + R) - p.x, p.z - (c.z0 - R), (c.z1 + R) - p.z], i = pen.indexOf(Math.min.apply(null, pen));
        if (i === 0) p.x = c.x0 - R; else if (i === 1) p.x = c.x1 + R; else if (i === 2) p.z = c.z0 - R; else p.z = c.z1 + R;
      }
    }
    if (W.clampPos) W.clampPos(p);
    else if (W.bounds && W.bounds.rect) { const b = W.bounds.rect; p.x = clamp(p.x, b[0], b[1]); p.z = clamp(p.z, b[2], b[3]); }
    else if (W.bounds) { const dx = p.x - W.bounds.x, dz = p.z - W.bounds.z, d = Math.hypot(dx, dz); if (d > W.bounds.r) { p.x = W.bounds.x + dx / d * W.bounds.r; p.z = W.bounds.z + dz / d * W.bounds.r; } }
  }
  function placeCamera(W) {
    const gy = W.heightAt ? W.heightAt(state.pos.x, state.pos.z) : 0;
    const bob = RM ? 0 : Math.sin(state.walk) * 0.035 * Math.min(1, state.vel.length() / 3);
    camera.position.set(state.pos.x, gy + 1.62 + bob, state.pos.z);
    camera.rotation.set(clamp((G.live() ? G.pitch : state.pitch) + state.lookPitch, -1.25, 1.25), camYaw(), 0);
  }
  function stride(W, dt) {
    state.vel.lerp(want, Math.min(1, dt * 9));
    state.pos.addScaledVector(state.vel, dt); collide(W, state.pos);
    const sp = state.vel.length();
    if (sp > 0.4) { state.walk += dt * sp * 2.6; state.stepT += dt * sp; if (state.stepT > 1.55) { state.stepT = 0; SFX.step(W.name); } }
  }
  function move(W, dt) {
    let mx = 0, mz = 0;
    if (keys.has('w') || keys.has('arrowup')) mz += 1;
    if (keys.has('s') || keys.has('arrowdown')) mz -= 1;
    if (keys.has('d')) mx += 1;
    if (keys.has('a')) mx -= 1;
    if (keys.has('arrowleft')) state.yaw += 1.9 * dt;
    if (keys.has('arrowright')) state.yaw -= 1.9 * dt;
    if (state.hold) mz += 1;
    const len = Math.hypot(mx, mz); if (len > 1) { mx /= len; mz /= len; }
    const speed = keys.has('shift') ? 5.4 : 3.1, h = camYaw();
    fwd.set(-Math.sin(h), 0, -Math.cos(h)); right.set(Math.cos(h), 0, -Math.sin(h));
    want.copy(right).multiplyScalar(mx * speed).addScaledVector(fwd, mz * speed);
    stride(W, dt);
  }
  function pickFocus(W) {
    const h = camYaw(); fwd.set(-Math.sin(h), 0, -Math.cos(h));
    let best = null, bs = 1e9;
    W.objects.forEach((o) => { if (o.live === false) return; const dx = o.x - state.pos.x, dz = o.z - state.pos.z, d = Math.hypot(dx, dz); if (d > o.range) return; const dot = d > 0.01 ? (fwd.x * dx + fwd.z * dz) / d : 1; if (dot < 0.35 && d > 1.6) return; const s = d - dot * 1.2 - (o.prio || 0); if (s < bs) { bs = s; best = o; } });
    // The stone circle names its action on phones too, and stays in reach while the auto walk leads.
    if (best !== state.focus) { state.focus = best; if (best) el.promptT.textContent = (best.verb ? best.verb + ' · ' : COARSE ? '' : 'Inspect · ') + best.title; }
    el.prompt.classList.toggle('on', !!state.focus && (!AW.on || !!state.focus.always));
  }
  let C_PAPER = null;
  function markers(W, t) {
    W.objects.forEach((o) => {
      if (o.live === false) { o.ring.visible = o.marker.visible = false; return; } // the stone circle, still asleep
      o.ring.visible = true; o.marker.visible = o.dot !== false;
      o.focus += ((o === state.focus ? 1 : 0) - o.focus) * 0.15;
      o.marker.position.y = o.gy + o.y + (RM ? 0 : Math.sin(t * 2 + o.phase) * 0.09);
      o.marker.scale.setScalar(o.found ? 0.6 : 1 + o.focus * 0.5);
      o.ring.material.opacity = o.found ? 0.12 : 0.3 + o.focus * 0.55 + (RM ? 0 : 0.08 * Math.sin(t * 3 + o.phase));
      // found signals turn paper-white and dim
      o.ring.material.color.copy(o.found ? C_PAPER : o.color);
      o.marker.children[0].material.color.copy(o.found ? C_PAPER : o.color);
      o.marker.children[1].material.opacity = o.found ? 0.15 : 0.55 + o.focus * 0.3;
    });
  }
  function checkPortals(W, now) {
    if (now < state.cool) return;
    for (const p of W.portals) {
      const dx = state.pos.x - p.x, dz = state.pos.z - p.z, s = dx * p.nx + dz * p.nz, l = Math.abs(dx * p.nz - dz * p.nx);
      if (l < p.w * 0.42 && s < 0.45 && s > -0.9) {
        if (p.sealed) { if (now > p.msgAt) { p.msgAt = now + 4000; toast('Wing 04 is still sealed. It is in the works.', 0, true); state.pos.x += p.nx * 0.9; state.pos.z += p.nz * 0.9; } }
        else navigate(p.to);
        return;
      }
    }
  }
  // Walking into an arch changes the route; main.js answers with enter(), which changes the world.
  function navigate(to) {
    state.cool = performance.now() + 1500;
    const hash = to === 'hub' ? '#/explore' : '#/explore/' + to;
    if (location.hash === hash) enter(to); else location.hash = hash;
  }

  /* =============================== worlds and transitions =============================== */
  function setWorld(name, from) {
    const W = getWorld(name);
    state.world = W; state.focus = null; state.vel.set(0, 0, 0); keys.clear(); release();
    let sp = W.spawn;
    if (name === 'hub' && from && from !== 'hub') { const p = W.portals.find((x) => x.to === from); if (p) sp = { x: p.x + p.nx * 3.4, z: p.z + p.nz * 3.4, yaw: Math.atan2(-p.nx, -p.nz) }; }
    state.pos.set(sp.x, 0, sp.z); state.yaw = sp.yaw; state.pitch = 0; state.lookYaw = 0; state.lookPitch = 0;
    G.recenter(); AW.reset(); if (AW.on) AW.wait = 0.8;
    document.body.dataset.wing = name === 'hub' ? '' : name;
    hud(); el.prompt.classList.remove('on');
    A.update(); jamWorld(name);
    if (!started) { el.word.textContent = name === 'hub' ? 'lastfomo' : name; el.line.textContent = LINES[name]; }
    else if (name !== 'hub' && !done[name]) setTimeout(() => { if (state.world === W) toast(NAMES[name] + '. ' + COUNT[name] + ' signals to find. Follow the lights.'); }, 700);
  }
  let curT = [];
  function go(name, from) {
    curT.forEach(clearTimeout); curT = [];
    state.busy = true; closePanel(); hush(); SFX.whoosh();
    if (RM || !el.curtain) { setWorld(name, from); state.busy = false; state.cool = performance.now() + 1500; return; }
    const c = el.curtain;
    c.classList.remove('on'); void c.offsetWidth; c.classList.add('on');
    curT.push(setTimeout(() => { setWorld(name, from); curT.push(setTimeout(() => { state.busy = false; state.cool = performance.now() + 1500; }, 300)); }, 380));
    curT.push(setTimeout(() => c.classList.remove('on'), 950));
  }

  /* =============================== the loop =============================== */
  let raf = 0, last = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    // Steps stay small for steady movement; the reading time runs on the clock, even when frames come slowly.
    const real = Math.min(0.25, Math.max(0, (now - last) / 1000)), dt = Math.min(0.05, real); last = now;
    const t = (now - T0) / 1000; U.time.value = t;
    const W = state.world;
    if (!W) return;
    if (!started) { state.yaw = (W.spawn.yaw || 0) + (RM ? 0 : Math.sin(t * 0.05) * 0.35); state.pitch = 0.05; }
    else if (canMove()) { if (AW.on) autoStep(W, dt); else move(W, dt); }
    lookTick(dt);
    W.ticks.forEach((f) => f(t, dt));
    markers(W, t);
    if (started && !state.busy && !state.panel && !el.sf.open) { pickFocus(W); checkPortals(W, now); }
    if (el.sf.open) sfTick();
    readTick(real);
    placeCamera(W);
    // Behind the open sound field the house is a backdrop: a quarter of the frames on a desktop, none on a phone,
    // where the card covers it. The jam keeps the main thread to itself.
    if (!el.sf.open || (!COARSE && (SF.frame = (SF.frame + 1) % 4) === 0)) renderer.render(W.scene, camera);
  }
  const startLoop = () => { if (!raf && ready && active && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const stopLoop = () => { cancelAnimationFrame(raf); raf = 0; };
  function size() {
    const w = el.c.clientWidth, h = el.c.clientHeight;
    if (!renderer || !w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  // Film grain over the stage: a tile of fine specks, mostly clear and a few faintly light, laid once per size into a canvas
  // at the scene's own pixel ratio, so no image URL is needed (the site's CSP has none). A little grain, not a haze.
  let tile = null;
  function grain() {
    const cv = el.grain, r = Math.min(devicePixelRatio || 1, COARSE ? 1.5 : 2);
    const w = Math.ceil((view.clientWidth + 80) * r), h = Math.ceil((view.clientHeight + 80) * r);
    if (!w || !h || (cv.width === w && cv.height === h)) return;
    if (!tile) {
      tile = document.createElement('canvas'); tile.width = tile.height = 256;
      const t = tile.getContext('2d'), img = t.createImageData(256, 256), d = img.data;
      for (let i = 0; i < d.length; i += 4) { d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = (Math.random() ** 3 * 255) | 0; }
      t.putImageData(img, 0, 0);
    }
    cv.width = w; cv.height = h;
    const x = cv.getContext('2d');
    x.fillStyle = x.createPattern(tile, 'repeat'); x.fillRect(0, 0, w, h);
  }
  let rz = 0;
  addEventListener('resize', () => { if (!active) return; clearTimeout(rz); rz = setTimeout(() => { size(); grain(); }, 120); size(); });
  document.addEventListener('visibilitychange', () => {
    if (!active) return;
    if (document.hidden) { stopLoop(); keys.clear(); release(); } else startLoop();
    A.update(); wake();
  });
  // A guided walk on a phone keeps the screen awake, where the browser allows it.
  let lock = null;
  function wake() {
    const on = active && started && AW.on && !document.hidden;
    if (on && !lock && navigator.wakeLock) navigator.wakeLock.request('screen').then((l) => { lock = l; l.addEventListener('release', () => { if (lock === l) lock = null; }); if (!(active && started && AW.on)) unlock(); }).catch(() => {});
    else if (!on) unlock();
  }
  function unlock() { if (lock) { const l = lock; lock = null; l.release().catch(() => {}); } }

  /* =============================== loading and the start screen =============================== */
  function loadThree() {
    if (window.THREE) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = THREE_SRC; s.async = true;
      if (THREE_SRI) { s.integrity = THREE_SRI; s.crossOrigin = 'anonymous'; }
      s.onload = () => (window.THREE ? res() : rej(new Error('no-three')));
      s.onerror = () => rej(new Error('no-three'));
      document.head.append(s);
    });
  }
  function init3D() {
    readTokens();
    VOIDRGB = rgbOf('void'); C_PAPER = col('paper');
    try { renderer = new THREE.WebGLRenderer({ canvas: el.c, antialias: !COARSE, powerPreference: 'high-performance' }); } catch (_) { renderer = null; }
    if (!renderer) throw new Error('no-webgl');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, COARSE ? 1.5 : 2));
    camera = new THREE.PerspectiveCamera(COARSE ? 74 : 66, 1, 0.05, 260); camera.rotation.order = 'YXZ';
    size();
    U = { time: { value: 0 } }; T0 = performance.now();
    state.pos = new THREE.Vector3(0, 0, 10); state.vel = new THREE.Vector3();
    fwd = new THREE.Vector3(); right = new THREE.Vector3(); want = new THREE.Vector3(); ray = new THREE.Raycaster(); ndc = new THREE.Vector2();
    GLOW = glowTexture(); DOT = new THREE.SphereGeometry(0.075, 16, 12); RING = new THREE.RingGeometry(0.95, 1.02, 56); HIT = new THREE.MeshBasicMaterial({ visible: false });
    FRAME = new THREE.MeshStandardMaterial({ color: col('graphite'), roughness: 0.5, metalness: 0.45 });
    loader = new THREE.TextureLoader(); LUX = glyph('g-lux'); LOCK = glyph('g-lock');
    GQ = { e: new THREE.Euler(), o: new THREE.Euler(), q: new THREE.Quaternion(), q0: new THREE.Quaternion(), q1: new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)), z: new THREE.Vector3(0, 0, 1) };
  }
  const fontsReady = () => (document.fonts && document.fonts.load
    ? Promise.race([Promise.all(['150px "Jacquard 24"', '300 46px "Geist"', '500 44px "Geist Mono"'].map((f) => document.fonts.load(f).catch(() => null))), new Promise((r) => setTimeout(r, 2500))])
    : Promise.resolve());
  const NOTE = COARSE
    ? 'Best with headphones. Hold the round button to walk' + (MOTION ? ', turn your phone to look.' : ', drag to look.')
    : 'Best with headphones. W A S D to walk, drag to look, E to inspect.';
  function boot() {
    if (loading) return loading;
    el.goS.disabled = el.goQ.disabled = true; el.note.textContent = 'Building the house…';
    loading = Promise.all([loadThree(), fontsReady()]).then(() => {
      init3D();
      setWorld(wantWorld);
      ready = true;
      grain(); startLoop();
      el.goS.disabled = el.goQ.disabled = false; el.note.textContent = NOTE;
      if (active && !started) el.goS.focus({ preventScroll: true });
    }).catch((err) => {
      el.goS.hidden = el.goQ.hidden = true; el.home.hidden = false;
      el.note.textContent = err && err.message === 'no-webgl' ? 'This browser cannot show 3D. Try a recent Chrome, Safari or Firefox.' : 'The 3D engine could not load. Check your connection and reload the page.';
    });
    return loading;
  }
  function begin(withSound) {
    if (started || !ready) return;
    if (prefs.gyro && MOTION) setGyro(true); // first, inside the click: iOS asks for motion only from a tap
    started = true;
    A.music = A.sounds = withSound; A.update();
    el.start.classList.add('fade'); setTimeout(() => { el.start.hidden = true; }, 700);
    hud(); syncOpts(); syncField(); wake();
    el.c.focus({ preventScroll: true });
    const W = state.world, how = AW.on
      ? (COARSE ? 'Auto walk is on. Press the round button to walk yourself.' : 'Auto walk is on. Press W or an arrow key to walk yourself.')
      : (COARSE ? 'Hold the round button to walk. Walk into an arch.' : 'W A S D to walk, drag to look. Walk into an arch.');
    setTimeout(() => { if (W.name !== 'hub' && !done[W.name]) toast(NAMES[W.name] + '. ' + COUNT[W.name] + ' signals to find. Follow the lights.'); toast(how, 4200); }, 600);
  }
  el.goS.addEventListener('click', () => begin(true));
  el.goQ.addEventListener('click', () => begin(false));

  /* =============================== the route: main.js calls these =============================== */
  function enter(wing) {
    const name = WINGS.indexOf(wing) >= 0 ? wing : 'hub';
    wantWorld = name;
    if (!active) {
      // The view just opened under main.js's curtain: place the visitor at once, no second curtain.
      active = true;
      document.body.dataset.wing = name === 'hub' ? '' : name;
      if (!started) { el.word.textContent = name === 'hub' ? 'lastfomo' : name; el.line.textContent = LINES[name]; }
      if (G.on) { listenMotion(true); if (!G.heard) askMotion(); }
      if (!ready) { boot(); return; }
      setWorld(name);
      size(); grain(); startLoop(); A.update(); wake(); syncWalk();
      return;
    }
    if (!ready) return; // boot() places the visitor in wantWorld
    if (state.world.name !== name) go(name, state.world.name);
  }
  function leave() {
    if (!active) return;
    active = false;
    stopLoop(); keys.clear(); release(); look = null;
    closePanel(); closeSettings(); closeMixer(); J.stop(true); SF.want = false; // the jam waits for the visitor's return
    curT.forEach(clearTimeout); curT = []; state.busy = false;
    listenMotion(false); unlock(); A.update(); hush();
  }
  window.lfExplore = {
    init(o) { if (o && o.horse) HORSE = o.horse; },
    enter, leave,
    // An open Artifact keeps the walk's finds when the page is republished; main.js hands them over (window.claude.hot).
    save() { return { found: Object.fromEntries(Object.entries(progress).map(([k, v]) => [k, Array.from(v)])) }; },
    load(o) {
      const f = o && o.found;
      if (!f || typeof f !== 'object' || ready) return; // finds are read only before the worlds are built
      Object.keys(progress).forEach((k) => { if (Array.isArray(f[k])) f[k].forEach((id) => { if (SIGNALS[k].some((x) => x.id === id)) progress[k].add(id); }); });
      WINGS.forEach((w) => { done[w] = progress[w].size >= COUNT[w]; });
      state.finalShown = WINGS.every((w) => done[w]);
    },
    // For the QA tools: where the visitor stands and what the walk has found. A copy: changing it changes nothing.
    peek() {
      return {
        active, ready, started, world: state.world ? state.world.name : '', busy: state.busy,
        pos: state.pos ? [+state.pos.x.toFixed(2), +state.pos.z.toFixed(2)] : null, yaw: +camYaw().toFixed(3),
        auto: AW.on, phase: AW.phase, gyro: G.live(), motion: { on: G.on, heard: G.heard, yaw: +G.yaw.toFixed(3) }, look: +state.lookYaw.toFixed(3), hold: state.hold, panel: state.panel ? state.panel.id : '',
        found: Object.fromEntries(Object.entries(progress).map(([k, v]) => [k, Array.from(v)])), done: Object.assign({}, done),
        music: A.music, sounds: A.sounds, audio: A.ctx ? A.ctx.state : 'none', settings: el.set.open,
        field: { awake: allDone(), up: SF.up, open: !!el.sf.open, jam: J.on, paused: J.wasOn, scene: SF.scene, bpm: BPM, loops: Object.assign({}, STY), mix: JSON.parse(JSON.stringify(MIX)) },
      };
    },
  };
})();
