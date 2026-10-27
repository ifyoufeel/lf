/* Hortus stages (three.js r128): dark neon night-meadow looks in the brand's wing colour.
   - meadow: a stippled dot-matrix tree in fog over a phosphor ground grid (hub cover)
   - globe: a dot globe of October 2026 sea-surface temperature anomalies, the Niño-3.4 box and arcs to crop belts
   - scan: a point-cloud plant read by a sweeping scan plane, with stress points flagged (plant vision cover)
   Each stage pauses off screen and in hidden tabs, caps pixel ratio, and renders one still frame for reduced motion. */
(function (g) {
  "use strict";
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const reduce = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touch = () => window.matchMedia && matchMedia("(pointer: coarse)").matches;

  function base(canvas, opts) {
    const THREE = g.THREE;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: !!(opts && opts.preserve) });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch() ? 1.5 : 2));
    const scene = new THREE.Scene();
    const voidC = new THREE.Color(css("--void"));
    scene.background = voidC;
    const camera = new THREE.PerspectiveCamera(opts.fov || 45, 1, 0.1, 400);
    const size = () => {
      const w = canvas.clientWidth || canvas.parentNode.clientWidth, h = canvas.clientHeight || canvas.parentNode.clientHeight;
      renderer.setSize(w, h, false); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
    };
    size();
    let visible = true, running = false, raf = 0, t0 = performance.now();
    const state = { renderer, scene, camera, THREE, tick: null, pointer: { x: 0, y: 0 } };
    const loop = (now) => {
      raf = 0;
      if (!visible || document.hidden) { running = false; return; }
      state.tick && state.tick((now - t0) / 1000);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    state.start = () => {
      if (reduce()) { state.tick && state.tick(6); renderer.render(scene, camera); return; }
      if (!running) { running = true; raf = requestAnimationFrame(loop); }
    };
    if (g.ResizeObserver) new ResizeObserver(() => { size(); if (reduce() || !running) renderer.render(scene, camera); }).observe(canvas);
    if (g.IntersectionObserver) new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) state.start(); }, { threshold: 0.01 }).observe(canvas);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) state.start(); });
    canvas.addEventListener("pointermove", (e) => { const r = canvas.getBoundingClientRect(); state.pointer.x = (e.clientX - r.left) / r.width * 2 - 1; state.pointer.y = (e.clientY - r.top) / r.height * 2 - 1; });
    return state;
  }

  function pointsMaterial(THREE, size, opacity) {
    return new THREE.PointsMaterial({ size, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: opacity === undefined ? 1 : opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: true });
  }

  function groundGrid(THREE, scene, color, radius, step, y) {
    const pts = [];
    for (let x = -radius; x <= radius; x += step) for (let z = -radius; z <= radius; z += step) {
      const d = Math.hypot(x, z); if (d > radius) continue;
      pts.push(x, y, z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const col = new Float32Array(pts.length);
    for (let i = 0; i < pts.length; i += 3) { const d = Math.hypot(pts[i], pts[i + 2]) / radius; const a = 0.55 * (1 - d) + 0.08; col[i] = color.r * a; col[i + 1] = color.g * a; col[i + 2] = color.b * a; }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const p = new THREE.Points(geo, pointsMaterial(THREE, 0.06, 1));
    scene.add(p);
    return p;
  }

  /* ---------------- meadow: the stippled tree ---------------- */
  function meadow(canvas) {
    const s = base(canvas, { fov: 42 }); const THREE = s.THREE;
    const green = new THREE.Color(css("--hortus")), paper = new THREE.Color(css("--paper")), ash = new THREE.Color(css("--ash"));
    s.scene.fog = new THREE.FogExp2(s.scene.background.getHex(), 0.055);
    // seeded random for a stable tree
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const pos = [], col = [], kind = [];
    const branch = (x, y, z, dx, dy, dz, len, depth) => {
      const n = Math.max(6, Math.floor(len * 70));
      for (let i = 0; i < n; i++) {
        const t = i / n, w = 0.05 * Math.pow(0.68, 6 - depth) * (1 - t * 0.5);
        pos.push(x + dx * len * t + (rnd() - 0.5) * w, y + dy * len * t + (rnd() - 0.5) * w, z + dz * len * t + (rnd() - 0.5) * w);
        kind.push(0);
      }
      if (depth <= 0) return;
      const ex = x + dx * len, ey = y + dy * len, ez = z + dz * len;
      const kids = depth > 3 ? 2 : 3;
      for (let k = 0; k < kids; k++) {
        const a = rnd() * Math.PI * 2, spread = 0.45 + rnd() * 0.5;
        let nx = dx + Math.cos(a) * spread, ny = dy * 0.9 + 0.35, nz = dz + Math.sin(a) * spread;
        const L = Math.hypot(nx, ny, nz); nx /= L; ny /= L; nz /= L;
        branch(ex, ey, ez, nx, ny, nz, len * (0.62 + rnd() * 0.18), depth - 1);
      }
    };
    branch(0, -2.2, 0, 0, 1, 0, 1.9, 6);
    // crown stipple: a loose dot-matrix volume aligned to a grid, like a pixel overlay on the tree
    const step = 0.13;
    for (let x = -2.8; x <= 2.8; x += step) for (let y = -0.6; y <= 3.6; y += step) {
      const nx = x / 2.8, ny = (y - 1.6) / 2.1;
      const r2 = nx * nx + ny * ny * 1.05 + 0.25 * Math.sin(x * 2.1) * Math.cos(y * 1.7);
      if (r2 > 1 || rnd() > 0.62) continue;
      pos.push(x, y, (rnd() - 0.5) * 0.25 * (1 - r2) + Math.sin(y * 0.8) * 0.1);
      kind.push(1);
    }
    const n = pos.length / 3;
    for (let i = 0; i < n; i++) {
      const k = kind[i];
      const c = k === 0 ? ash.clone().multiplyScalar(0.55) : (rnd() < 0.12 ? green.clone() : paper.clone().multiplyScalar(0.32 + rnd() * 0.25));
      col.push(c.r, c.g, c.b);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    const colors = new THREE.Float32BufferAttribute(col, 3); geo.setAttribute("color", colors);
    const tree = new THREE.Points(geo, pointsMaterial(THREE, 0.055, 1));
    s.scene.add(tree);
    groundGrid(THREE, s.scene, green, 9, 0.32, -2.25);
    // fireflies
    const ff = []; for (let i = 0; i < 140; i++) ff.push((rnd() - 0.5) * 12, -2 + rnd() * 5, (rnd() - 0.5) * 8);
    const fg = new THREE.BufferGeometry(); fg.setAttribute("position", new THREE.Float32BufferAttribute(ff, 3));
    const fc = new Float32Array(ff.length); for (let i = 0; i < fc.length; i += 3) { fc[i] = green.r * 0.8; fc[i + 1] = green.g * 0.8; fc[i + 2] = green.b * 0.8; }
    fg.setAttribute("color", new THREE.BufferAttribute(fc, 3));
    const flies = new THREE.Points(fg, pointsMaterial(THREE, 0.08, 0.9)); s.scene.add(flies);
    s.camera.position.set(0, 0.9, 8.6);
    const base0 = Float32Array.from(col); let last = 0;
    s.tick = (t) => {
      const px = s.pointer.x, py = s.pointer.y;
      s.camera.position.x = Math.sin(t * 0.07) * 1.6 + px * 0.6;
      s.camera.position.y = 0.9 + py * -0.3;
      s.camera.lookAt(0, 0.8, 0);
      // re-randomise about 5% of crown cells about 10 times a second
      if (t - last > 0.1) {
        last = t; const a = colors.array;
        for (let k = 0; k < n * 0.05; k++) {
          const i = Math.floor(Math.random() * n); if (kind[i] !== 1) continue;
          const on = Math.random() < 0.14; const c = on ? green : paper; const m = on ? 1 : 0.28 + Math.random() * 0.3;
          a[i * 3] = c.r * m; a[i * 3 + 1] = c.g * m; a[i * 3 + 2] = c.b * m;
        }
        colors.needsUpdate = true;
      }
      const fp = fg.attributes.position.array;
      for (let i = 0; i < fp.length; i += 3) { fp[i + 1] += Math.sin(t * 0.8 + i) * 0.002; }
      fg.attributes.position.needsUpdate = true;
    };
    s.start();
    return s;
  }

  /* ---------------- globe: SST anomalies and teleconnections ---------------- */
  function globe(canvas, data) {
    const s = base(canvas, { fov: 38 }); const THREE = s.THREE;
    const green = new THREE.Color(css("--hortus")), paper = new THREE.Color(css("--paper")), ash = new THREE.Color(css("--ash"));
    s.scene.fog = new THREE.FogExp2(s.scene.background.getHex(), 0.035);
    const R = 3;
    const v3 = (lat, lon, r) => { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return new THREE.Vector3(r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo)); };
    const pos = [], col = [];
    const sst = data.sst;
    // land mask by point-in-polygon on the 2-degree grid
    const rings = data.land || [];
    const inside = (lon, lat, ring) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi + 1e-12) + xi)) c = !c; } return c; };
    const bbox = rings.map((r) => { let a = 999, b = -999, c = 999, d = -999; r.forEach(([x, y]) => { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y); }); return [a, b, c, d]; });
    const isLand = (lon, lat) => { for (let k = 0; k < rings.length; k++) { const b = bbox[k]; if (lon < b[0] || lon > b[1] || lat < b[2] || lat > b[3]) continue; if (inside(lon, lat, rings[k])) return true; } return false; };
    for (let i = 0; i < sst.lat.length; i++) for (let j = 0; j < sst.lon.length; j++) {
      const lat = sst.lat[i]; let lon = sst.lon[j]; if (lon > 180) lon -= 360;
      const a = sst.anom[i][j];
      const p = v3(lat, lon, R);
      if (a === null) {
        if (Math.abs(lat) > 80) continue;
        if (!isLand(lon, lat)) continue;
        pos.push(p.x, p.y, p.z); const m = 0.22; col.push(ash.r * m, ash.g * m, ash.b * m);
      } else {
        pos.push(p.x, p.y, p.z);
        if (a > 0.5) { const m = Math.min(1, 0.25 + a / 3.2); col.push(green.r * m, green.g * m, green.b * m); }
        else if (a < -0.5) { const m = 0.06; col.push(paper.r * m, paper.g * m, paper.b * m); }
        else { const m = 0.14; col.push(paper.r * m, paper.g * m, paper.b * m); }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    const world = new THREE.Group(); s.scene.add(world);
    world.add(new THREE.Points(geo, pointsMaterial(THREE, 0.06, 1)));
    // Niño-3.4 box outline
    const box = [];
    const edge = (a, b) => { for (let t = 0; t <= 1.0001; t += 0.02) box.push(v3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, R + 0.03)); };
    edge([5, -170], [5, -120]); edge([5, -120], [-5, -120]); edge([-5, -120], [-5, -170]); edge([-5, -170], [5, -170]);
    const bl = new THREE.Line(new THREE.BufferGeometry().setFromPoints(box), new THREE.LineBasicMaterial({ color: green, transparent: true, opacity: 0.95 }));
    world.add(bl);
    // arcs to crop belts
    const src = v3(0, -145, R);
    const pulses = [];
    (data.regions || []).forEach((r, k) => {
      const lat = (r.lat[0] + r.lat[1]) / 2, lon = (r.lon[0] + r.lon[1]) / 2;
      const dst = v3(lat, lon, R);
      const mid = src.clone().add(dst).multiplyScalar(0.5); const lift = 1 + src.distanceTo(dst) / (R * 2.2); mid.setLength(R * lift);
      const curve = new THREE.QuadraticBezierCurve3(src, mid, dst);
      const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(60)), new THREE.LineBasicMaterial({ color: r.sign < 0 ? green : paper, transparent: true, opacity: r.sign < 0 ? 0.45 : 0.22 }));
      world.add(ln);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.075, 24), new THREE.MeshBasicMaterial({ color: r.sign < 0 ? green : paper, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
      ring.position.copy(v3(lat, lon, R + 0.02)); ring.lookAt(new THREE.Vector3(0, 0, 0)); world.add(ring);
      const pg = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), new THREE.MeshBasicMaterial({ color: green }));
      world.add(pg); pulses.push({ curve, mesh: pg, off: k / 15 });
    });
    s.camera.position.set(0, 1.2, 9.5); s.camera.lookAt(0, 0, 0);
    world.rotation.y = -0.6;
    let drag = null, vel = 0.0015;
    canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, r: world.rotation.y }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener("pointermove", (e) => { if (drag) world.rotation.y = drag.r + (e.clientX - drag.x) * 0.008; });
    canvas.addEventListener("pointerup", () => { drag = null; });
    s.tick = (t) => {
      if (!drag) world.rotation.y += vel;
      world.rotation.x = 0.18 + s.pointer.y * 0.05;
      pulses.forEach((p) => { const u = ((t * 0.22 + p.off) % 1); p.mesh.position.copy(p.curve.getPoint(u)); p.mesh.scale.setScalar(0.6 + Math.sin(u * Math.PI) * 0.8); });
      bl.material.opacity = 0.6 + 0.35 * Math.sin(t * 2);
    };
    s.start();
    return s;
  }

  /* ---------------- scan: plant point cloud read by a scan plane ---------------- */
  function scan(canvas) {
    const s = base(canvas, { fov: 40 }); const THREE = s.THREE;
    const green = new THREE.Color(css("--hortus")), paper = new THREE.Color(css("--paper")), ash = new THREE.Color(css("--ash"));
    s.scene.fog = new THREE.FogExp2(s.scene.background.getHex(), 0.05);
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const pos = [], stress = [];
    // stem
    for (let i = 0; i < 900; i++) { const t = i / 900; pos.push(Math.sin(t * 3) * 0.08 + (rnd() - 0.5) * 0.04, -2 + t * 4.2, Math.cos(t * 2) * 0.05 + (rnd() - 0.5) * 0.04); stress.push(0); }
    // leaves: ellipses on alternating sides with a midrib curve
    const leaves = 13;
    for (let k = 0; k < leaves; k++) {
      const y0 = -1.6 + k * 0.3, side = k % 2 ? 1 : -1, ang = (k * 137.5) * Math.PI / 180;
      const L = 1.15 - Math.abs(k - 6) * 0.05, Wd = 0.42;
      const sick = k === 3 || k === 8; // two leaves carry a lesion patch
      for (let i = 0; i < 1500; i++) {
        const u = rnd(), v = (rnd() - 0.5) * 2;
        if (v * v > 1 - Math.pow(2 * u - 1, 2)) continue;
        const along = u * L, across = v * Wd * Math.sin(u * Math.PI);
        const droop = -0.35 * along * along;
        const lx = along, ly = droop + across * 0.15, lz = across;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        pos.push(lx * ca - lz * sa, y0 + ly + 0.2 * side * 0, lx * sa + lz * ca);
        const lesion = sick && Math.hypot(u - 0.6, v * 0.5) < 0.18;
        stress.push(lesion ? 1 : 0);
      }
    }
    const n = pos.length / 3;
    const col = new Float32Array(n * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    const cA = new THREE.BufferAttribute(col, 3); geo.setAttribute("color", cA);
    const plant = new THREE.Points(geo, pointsMaterial(THREE, 0.045, 1)); s.scene.add(plant);
    // scan plane
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshBasicMaterial({ color: green, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }));
    plane.rotation.x = -Math.PI / 2; s.scene.add(plane);
    const rim = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, 2.1, 2.1).getPoints(90).map((p) => new THREE.Vector3(p.x, 0, p.y))), new THREE.LineBasicMaterial({ color: green, transparent: true, opacity: 0.8 }));
    s.scene.add(rim);
    // tier rings on the ground
    for (let t = 0; t < 5; t++) {
      const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, 1 + t * 0.7, 1 + t * 0.7).getPoints(120).map((p) => new THREE.Vector3(p.x, -2.05, p.y))), new THREE.LineBasicMaterial({ color: t === 0 ? green : ash, transparent: true, opacity: t === 0 ? 0.7 : 0.22 }));
      s.scene.add(ring);
    }
    groundGrid(THREE, s.scene, green, 6, 0.35, -2.06);
    // flags for stressed points
    const flags = [];
    const sp = []; for (let i = 0; i < n; i++) if (stress[i]) sp.push(i);
    for (let k = 0; k < 2; k++) {
      const idx = sp[Math.floor(sp.length * (k ? 0.75 : 0.25))];
      const m = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.15, 32), new THREE.MeshBasicMaterial({ color: green, transparent: true, opacity: 0, side: THREE.DoubleSide }));
      m.position.set(pos[idx * 3], pos[idx * 3 + 1], pos[idx * 3 + 2]); s.scene.add(m); flags.push(m);
    }
    s.camera.position.set(0, 0.6, 7.4);
    s.tick = (t) => {
      const yScan = -2.1 + ((Math.sin(t * 0.45) + 1) / 2) * 4.6;
      plane.position.y = yScan; rim.position.y = yScan;
      for (let i = 0; i < n; i++) {
        const y = pos[i * 3 + 1];
        const seen = y < yScan;
        let c, m;
        if (stress[i] && seen) { c = paper; m = 0.95; }
        else if (seen) { c = green; m = 0.5 + 0.35 * Math.max(0, 1 - Math.abs(y - yScan) * 2.2); }
        else { c = ash; m = 0.22; }
        col[i * 3] = c.r * m; col[i * 3 + 1] = c.g * m; col[i * 3 + 2] = c.b * m;
      }
      cA.needsUpdate = true;
      flags.forEach((f) => { f.material.opacity = f.position.y < yScan ? 0.9 : 0; f.lookAt(s.camera.position); f.scale.setScalar(1 + 0.15 * Math.sin(t * 4)); });
      plant.rotation.y = t * 0.18;
      flags.forEach((f, k) => { const i = sp[Math.floor(sp.length * (k ? 0.75 : 0.25))]; const v = new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).applyAxisAngle(new THREE.Vector3(0, 1, 0), plant.rotation.y); f.position.copy(v); });
      s.camera.position.x = Math.sin(t * 0.1) * 0.8 + s.pointer.x * 0.4;
      s.camera.lookAt(0, 0, 0);
    };
    s.start();
    return s;
  }

  g.HortusScenes = { meadow, globe, scan };
})(window);
