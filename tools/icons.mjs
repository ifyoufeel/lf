// The site's icons, written by tools/build.mjs into the web build: favicon.svg, favicon.ico (16, 32 and 48 pixels) and
// apple-touch-icon.png (180 pixels). Each is the horse from brand/marks/horse.svg, whole and centred at 80% of the
// width, in paper on a void square, the colours read from brand/tokens.json (docs/publishing.md → “Icons”). The
// pixels are drawn here from the same path, so the build needs no image library: the outline is flattened to
// polygons and filled even-odd with 64 samples a pixel, then written as PNG (and PNGs inside an ICO).
import { readFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const FRAC = 0.8; // the horse's share of the square's width: never cropped, never touching the edge

export function readMark(file) {
  const svg = readFileSync(file, 'utf8');
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const d = svg.match(/ d="([^"]+)"/);
  if (!vb || !d || (svg.match(/<path\b/g) || []).length !== 1) throw new Error(`${file}: expected one path and a viewBox from 0 0`);
  return { w: +vb[1], h: +vb[2], d: d[1] };
}

// The square in the mark's own units, the horse centred in it.
function frame(m) {
  const s = m.w / FRAC;
  return { s, x: (s - m.w) / 2, y: (s - m.h) / 2 };
}
const short = (n) => String(+n.toFixed(2));

export function faviconSvg(m, bg, fg) {
  const f = frame(m), s = short(f.s);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}"><rect width="${s}" height="${s}" fill="${bg}"/>`
    + `<path fill="${fg}" fill-rule="evenodd" transform="translate(${short(f.x)} ${short(f.y)})" d="${m.d}"/></svg>\n`;
}

// The outline as closed polygons. The mark uses absolute M, C and Z only (Figma's export); any other command is
// refused rather than drawn wrong.
function polygons(d) {
  const tokens = d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || [];
  const polys = [];
  let pts = null, cx = 0, cy = 0, i = 0, cmd = '';
  const n = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++];
    if (cmd === 'M') {
      if (pts && pts.length > 2) polys.push(pts);
      cx = n(); cy = n(); pts = [[cx, cy]];
      cmd = 'L';
    } else if (cmd === 'C') {
      const x1 = n(), y1 = n(), x2 = n(), y2 = n(), x = n(), y = n();
      for (let k = 1; k <= 16; k++) {
        const t = k / 16, u = 1 - t;
        pts.push([u * u * u * cx + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x,
          u * u * u * cy + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y]);
      }
      cx = x; cy = y;
    } else if (cmd === 'L') {
      cx = n(); cy = n(); pts.push([cx, cy]);
    } else if (cmd === 'Z' || cmd === 'z') {
      if (pts && pts.length > 2) polys.push(pts);
      pts = null;
    } else {
      throw new Error(`brand/marks/horse.svg: path command ${cmd} is not drawn by tools/icons.mjs`);
    }
  }
  if (pts && pts.length > 2) polys.push(pts);
  return polys;
}

const rgbOf = (hex) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));

// size × size RGB pixels: the horse filled even-odd over the background, 8 × 8 samples a pixel.
function draw(m, size, bg, fg) {
  const f = frame(m), k = size / f.s, SS = 8;
  const edges = [];
  for (const p of polygons(m.d)) {
    for (let j = 0; j < p.length; j++) {
      const a = p[j], b = p[(j + 1) % p.length];
      const ax = (a[0] + f.x) * k, ay = (a[1] + f.y) * k, bx = (b[0] + f.x) * k, by = (b[1] + f.y) * k;
      if (ay !== by) edges.push(ay < by ? [ax, ay, bx, by] : [bx, by, ax, ay]);
    }
  }
  const cover = new Float64Array(size * size);
  for (let sy = 0; sy < size * SS; sy++) {
    const y = (sy + 0.5) / SS, xs = [];
    for (const [x0, y0, x1, y1] of edges) if (y >= y0 && y < y1) xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
    xs.sort((a, b) => a - b);
    const row = Math.floor(sy / SS) * size;
    for (let j = 0; j + 1 < xs.length; j += 2) {
      const from = Math.max(0, Math.ceil(xs[j] * SS - 0.5)), to = Math.min(size * SS - 1, Math.ceil(xs[j + 1] * SS - 0.5) - 1);
      for (let sx = from; sx <= to; sx++) cover[row + Math.floor(sx / SS)] += 1 / (SS * SS);
    }
  }
  const c0 = rgbOf(bg), c1 = rgbOf(fg), out = Buffer.alloc(size * size * 3);
  for (let p = 0; p < size * size; p++) {
    const a = Math.min(1, cover[p]);
    for (let c = 0; c < 3; c++) out[p * 3 + c] = Math.round(c0[c] + (c1[c] - c0[c]) * a);
  }
  return out;
}

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]), len = Buffer.alloc(4), crc = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, rgb) {
  const head = Buffer.alloc(13);
  head.writeUInt32BE(size, 0); head.writeUInt32BE(size, 4); head[8] = 8; head[9] = 2; // 8 bits, RGB
  const raw = Buffer.alloc((size * 3 + 1) * size); // each row starts with filter 0
  for (let y = 0; y < size; y++) rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
// An ICO holding PNG images, which every current browser reads.
function ico(images) {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(1, 2); head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, data }, j) => {
    const e = 6 + 16 * j;
    head[e] = size; head[e + 1] = size;
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(24, e + 6); head.writeUInt32LE(data.length, e + 8); head.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...images.map((im) => im.data)]);
}

/** The icon files, by the name each is served under at the site's root. */
export function icons(markFile, { bg, fg }) {
  const m = readMark(markFile);
  return {
    'favicon.svg': faviconSvg(m, bg, fg),
    'favicon.ico': ico([16, 32, 48].map((size) => ({ size, data: png(size, draw(m, size, bg, fg)) }))),
    'apple-touch-icon.png': png(180, draw(m, 180, bg, fg)),
  };
}
