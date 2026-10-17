#!/usr/bin/env node
/**
 * lastfomo brand check.
 *
 * Zero dependencies. Reads brand/tokens.json, brand/ledger.json and brand/marks/*.svg,
 * then checks either the source or one self-contained page against the brand rules.
 *
 *   node tools/brandcheck.mjs                 check site/ (index.html, styles.css, main.js, tokens.css)
 *   node tools/brandcheck.mjs --html <file>   check one page: a full document or an Artifact fragment
 *   node tools/brandcheck.mjs --json          machine output
 *   node tools/brandcheck.mjs --root <dir>    repo root (default: the folder above tools/)
 *
 * Exit 1 when there are errors, 0 otherwise. Rule IDs are referenced by docs: keep them stable.
 *
 * As a module:
 *   import { check, formatReport } from './brandcheck.mjs';
 *   const result = check({ root });            // source mode
 *   const result = check({ html: 'page.html' }); // one page
 *   result.errors / result.warnings: [{ rule: 'R6', id: 'facts-ledger', message, file, line? }]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_ROOT = path.resolve(HERE, '..');

export const RULES = {
  R0: { id: 'inputs', title: 'The files the check needs' },
  R1: { id: 'jacquard-names-only', title: 'Jacquard 24 sets the brand names only' },
  R2: { id: 'colour-literals', title: 'Colours come from tokens' },
  R3: { id: 'token-values', title: 'Token colours match brand/tokens.json' },
  R4: { id: 'one-wing-per-composition', title: 'One wing colour per composition' },
  R5: { id: 'house-trio-order', title: 'The house trio runs hortus, machina, arca, in .naves and in any row of all three wings' },
  R6: { id: 'facts-ledger', title: 'Every number is in the facts ledger' },
  R7: { id: 'banned-copy', title: 'Banned copy' },
  R8: { id: 'typographic-punctuation', title: 'Typographic punctuation' },
  R9: { id: 'british-spelling', title: 'British spelling' },
  R10: { id: 'placeholders', title: 'Placeholders' },
  R11: { id: 'marks-integrity', title: 'The marks are the exact Figma vectors' },
  R12: { id: 'images', title: 'Images, alt text and rights' },
  R13: { id: 'type-minimums', title: 'Type minimums' },
  R14: { id: 'reduced-motion', title: 'Reduced motion' },
  R15: { id: 'theme-shape', title: 'Theme shape' },
  R16: { id: 'external-hosts', title: 'External hosts' },
  R17: { id: 'no-emoji', title: 'No emoji' },
};

const WINGS = ['machina', 'hortus', 'arca'];
const TRIO_ORDER = ['hortus', 'machina', 'arca'];
// Legacy token names used by the original landing page (--chart, --phos, --mag; data-plate="chart").
const WING_ALIAS = { chart: 'machina', phos: 'hortus', mag: 'arca' };

/* ------------------------------------------------------------------ text utilities */

function lineStarts(text) {
  const starts = [0];
  let i = -1;
  while ((i = text.indexOf('\n', i + 1)) !== -1) starts.push(i + 1);
  return starts;
}

function lineAt(starts, offset) {
  let lo = 0, hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= offset) lo = mid; else hi = mid - 1;
  }
  return lo + 1;
}

// Data URIs are replaced by their header ("data:image/jpeg;base64,") so 1 MB of base64 never reaches a regex.
const DATA_URI = /data:[a-z][\w.+-]*\/[\w.+-]+(?:;[\w.+-]+(?:=[\w.+-]+)?)*,[^"'()\s<>`]*/gi;
function stripDataUris(text) {
  return text.replace(DATA_URI, (m) => m.slice(0, m.indexOf(',') + 1));
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function snippet(text, index, len, pad = 20) {
  const a = Math.max(0, index - pad);
  const b = Math.min(text.length, index + len + pad);
  const s = text.slice(a, b).replace(/\s+/g, ' ').trim();
  return (a > 0 ? '…' : '') + s + (b < text.length ? '…' : '');
}

const clip = (s, n = 60) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', rsquo: '’', lsquo: '‘', ldquo: '“',
  rdquo: '”', sbquo: '‚', bdquo: '„', mdash: '—', ndash: '–', middot: '·', times: '×', hellip: '…',
  copy: '©', reg: '®', trade: '™', deg: '°', prime: '′', Prime: '″', laquo: '«', raquo: '»',
  lsaquo: '‹', rsaquo: '›', thinsp: '\u2009', ensp: '\u2002', emsp: '\u2003', hairsp: '\u200a',
  shy: '\u00ad', zwj: '\u200d', zwnj: '\u200c', euro: '€', pound: '£', yen: '¥', cent: '¢',
  sect: '§', para: '¶', bull: '•', larr: '←', rarr: '→', uarr: '↑', darr: '↓', harr: '↔',
  nearr: '↗', minus: '−', plusmn: '±', divide: '÷', frac12: '½', frac14: '¼', frac34: '¾',
  sup1: '¹', sup2: '²', sup3: '³', micro: 'µ', numero: '№', ne: '≠', le: '≤', ge: '≥',
  eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë', aacute: 'á', agrave: 'à', acirc: 'â', auml: 'ä',
  aring: 'å', atilde: 'ã', oacute: 'ó', ograve: 'ò', ocirc: 'ô', ouml: 'ö', otilde: 'õ', oslash: 'ø',
  uacute: 'ú', ugrave: 'ù', ucirc: 'û', uuml: 'ü', iacute: 'í', igrave: 'ì', icirc: 'î', iuml: 'ï',
  ccedil: 'ç', ntilde: 'ñ', szlig: 'ß', aelig: 'æ', oelig: 'œ', Eacute: 'É', Ouml: 'Ö', Uuml: 'Ü',
};

function decodeEntities(s) {
  if (s.indexOf('&') === -1) return s;
  return s.replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);?/g, (m, e) => {
    if (e[0] === '#') {
      const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try { return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : m; } catch { return m; }
    }
    return Object.prototype.hasOwnProperty.call(ENTITIES, e) ? ENTITIES[e] : m;
  });
}

/* ------------------------------------------------------------------ HTML */

const VOID = new Set('area base br col embed hr img input keygen link meta param source track wbr'.split(' '));
const RAWTEXT = new Set(['script', 'style', 'xmp', 'noembed', 'noframes']);
const RCDATA = new Set(['textarea', 'title']);
const PHRASING = new Set('a abbr b bdi bdo br cite code data dfn em i kbd label mark q s samp small span strong sub sup time u var'.split(' '));
const P_CLOSERS = new Set('address article aside blockquote details dialog div dl fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hgroup hr main menu nav ol p pre section table ul'.split(' '));

function parseHTML(src) {
  const root = { type: 'el', name: '#root', attrs: {}, children: [], parent: null, start: 0 };
  const all = [];
  const stack = [root];
  let foreign = 0;
  const top = () => stack[stack.length - 1];
  const pushText = (raw, start) => {
    if (raw) top().children.push({ type: 'text', text: decodeEntities(raw), start, parent: top() });
  };
  const pop = () => {
    const node = stack.pop();
    if (node.name === 'svg' || node.name === 'math') foreign--;
    return node;
  };
  // Close the nearest open <name>; `through(nm)` says whether the search may pass an open element.
  const closeTo = (name, through) => {
    for (let k = stack.length - 1; k > 0; k--) {
      const nm = stack[k].name;
      if (nm === name) { while (stack.length > k) pop(); return true; }
      if (through && !through(nm)) return false;
    }
    return false;
  };
  const TAG = /<([a-zA-Z][^\s/>]*)/y;
  const END = /<\/([a-zA-Z][^\s/>]*)[^>]*>/y;
  const ATTR = /[^\s"'>/=]+/y;
  const UNQ = /[^\s>]*/y;
  const WS = /[\s]*/y;
  const n = src.length;
  let i = 0;
  while (i < n) {
    const lt = src.indexOf('<', i);
    if (lt === -1) { pushText(src.slice(i), i); break; }
    if (lt > i) pushText(src.slice(i, lt), i);
    i = lt;
    const c1 = src[i + 1];
    if (src.startsWith('<!--', i)) { const e = src.indexOf('-->', i + 4); i = e === -1 ? n : e + 3; continue; }
    if (src.startsWith('<![CDATA[', i)) { const e = src.indexOf(']]>', i); i = e === -1 ? n : e + 3; continue; }
    if (c1 === '!' || c1 === '?') { const e = src.indexOf('>', i); i = e === -1 ? n : e + 1; continue; }
    if (c1 === '/') {
      END.lastIndex = i;
      const em = END.exec(src);
      if (!em) { const e = src.indexOf('>', i); i = e === -1 ? n : e + 1; continue; }
      i = END.lastIndex;
      const endName = em[1].toLowerCase();
      if (!VOID.has(endName)) closeTo(endName, null);
      continue;
    }
    TAG.lastIndex = i;
    const tm = TAG.exec(src);
    if (!tm) { pushText('<', i); i++; continue; }
    const name = tm[1].toLowerCase();
    let j = TAG.lastIndex;
    const attrs = {};
    let selfClosing = false;
    while (j < n) {
      const ch = src[j];
      if (ch === '>') { j++; break; }
      if (ch === '/') { if (src[j + 1] === '>') { selfClosing = true; j += 2; break; } j++; continue; }
      if (ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r' || ch === '\f') { j++; continue; }
      ATTR.lastIndex = j;
      const am = ATTR.exec(src);
      if (!am) { j++; continue; }
      j = ATTR.lastIndex;
      const an = am[0].toLowerCase();
      let val = '';
      WS.lastIndex = j; WS.exec(src);
      let k = WS.lastIndex;
      if (src[k] === '=') {
        WS.lastIndex = k + 1; WS.exec(src);
        k = WS.lastIndex;
        const q = src[k];
        if (q === '"' || q === "'") {
          const e = src.indexOf(q, k + 1);
          const end = e === -1 ? n : e;
          val = src.slice(k + 1, end);
          j = end + 1;
        } else {
          UNQ.lastIndex = k;
          val = UNQ.exec(src)[0];
          j = UNQ.lastIndex;
        }
      }
      if (!(an in attrs)) attrs[an] = decodeEntities(val);
    }
    i = j;
    if (!foreign) {
      if (P_CLOSERS.has(name)) closeTo('p', (nm) => PHRASING.has(nm));
      if (name === 'li') closeTo('li', (nm) => nm !== 'ul' && nm !== 'ol' && nm !== 'menu');
      else if (name === 'dt' || name === 'dd') { closeTo('dt', (nm) => nm !== 'dl'); closeTo('dd', (nm) => nm !== 'dl'); }
      else if (name === 'option') closeTo('option', (nm) => nm !== 'select' && nm !== 'datalist' && nm !== 'optgroup');
      else if (name === 'optgroup') { closeTo('option', (nm) => nm !== 'select'); closeTo('optgroup', (nm) => nm !== 'select'); }
      else if (name === 'tr') { closeTo('td', (nm) => nm !== 'table'); closeTo('th', (nm) => nm !== 'table'); closeTo('tr', (nm) => nm !== 'table'); }
      else if (name === 'td' || name === 'th') { closeTo('td', (nm) => nm !== 'tr' && nm !== 'table'); closeTo('th', (nm) => nm !== 'tr' && nm !== 'table'); }
    }
    const node = { type: 'el', name, attrs, children: [], parent: top(), start: lt };
    top().children.push(node);
    all.push(node);
    if (!foreign && VOID.has(name)) continue;
    if (selfClosing && (foreign || name === 'svg' || name === 'math')) continue;
    if (!foreign && (RAWTEXT.has(name) || RCDATA.has(name))) {
      const re = new RegExp('</' + name + '[\\s/]*>', 'ig');
      re.lastIndex = i;
      const cm = re.exec(src);
      const end = cm ? cm.index : n;
      const body = src.slice(i, end);
      node.contentStart = i;
      node.contentEnd = end;
      if (body) node.children.push({ type: 'text', text: RCDATA.has(name) ? decodeEntities(body) : body, raw: RAWTEXT.has(name), start: i, parent: node });
      i = cm ? re.lastIndex : n;
      continue;
    }
    stack.push(node);
    if (name === 'svg' || name === 'math') foreign++;
  }
  return { root, all };
}

const classesOf = (node) => (node.attrs.class ? node.attrs.class.split(/\s+/).filter(Boolean) : []);
const hasClass = (node, c) => classesOf(node).includes(c);

function* descendants(node) {
  const st = [...node.children].reverse();
  while (st.length) {
    const c = st.pop();
    if (c.type !== 'el') continue;
    yield c;
    for (let k = c.children.length - 1; k >= 0; k--) st.push(c.children[k]);
  }
}

function textContent(node) {
  let s = '';
  const st = [node];
  while (st.length) {
    const nd = st.pop();
    if (nd.type === 'text') { if (!nd.raw) s += nd.text; continue; }
    if (nd !== node && (nd.name === 'script' || nd.name === 'style' || nd.name === 'template')) continue;
    for (let k = nd.children.length - 1; k >= 0; k--) st.push(nd.children[k]);
  }
  return s;
}

function describe(node) {
  const cls = classesOf(node);
  return '<' + node.name + (cls.length ? '.' + cls.join('.') : '') + '>';
}

/* Visible text: script, style, svg, template and comments removed, tags stripped, entities decoded,
   plus alt, aria-label, title and placeholder values and the <title> element. One string with a
   per-character source line so every finding can say file:line. Block elements end a run with "\n";
   span, a, button and friends add a space; b, i, em and other phrasing tags join without a gap. */
const VIS_SKIP = new Set(['script', 'style', 'svg', 'template', 'noembed', 'noframes', 'xmp']);
const VIS_NOSEP = new Set('b i em strong u s small mark abbr sup sub q cite dfn kbd var time data wbr code bdi bdo ins del samp ruby rt rp'.split(' '));
const VIS_SPACE = new Set('span a label button img input select textarea svg canvas video audio picture output meter progress iframe object embed math'.split(' '));
const VIS_CODE = new Set(['code', 'kbd', 'samp', 'pre']);
const VIS_ATTRS = ['alt', 'aria-label', 'title', 'placeholder'];

function visibleText(root, lineOfOffset) {
  const chars = [];
  const lines = [];
  const code = [];
  let last = '\n';
  let inCode = 0;
  const put = (ch, line) => { chars.push(ch); lines.push(line); code.push(inCode ? 1 : 0); last = ch; };
  const sep = (line) => {
    if (last === ' ') { chars[chars.length - 1] = '\n'; last = '\n'; }
    else if (last !== '\n') put('\n', line);
  };
  const space = (line) => { if (last !== ' ' && last !== '\n') put(' ', line); };
  const emit = (str, line) => {
    for (let k = 0; k < str.length; k++) {
      const ch = str[k];
      if (ch === '\n') { line++; space(line); continue; }
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\f') { space(line); continue; }
      put(ch, line);
    }
  };
  // Iterative walk: deeply nested markup must not exhaust the call stack.
  const st = [{ node: root, i: 0, kind: -1, line: 1, isCode: false }];
  while (st.length) {
    const fr = st[st.length - 1];
    if (fr.i >= fr.node.children.length) {
      st.pop();
      if (fr.isCode) inCode--;
      if (fr.kind === 1) space(fr.line); else if (fr.kind === 2) sep(fr.line);
      continue;
    }
    const c = fr.node.children[fr.i++];
    if (c.type === 'text') { if (!c.raw) emit(c.text, lineOfOffset(c.start)); continue; }
    const line = lineOfOffset(c.start);
    if (VIS_SKIP.has(c.name)) { if (c.name === 'svg') space(line); continue; }
    const kind = VIS_NOSEP.has(c.name) ? 0 : VIS_SPACE.has(c.name) ? 1 : 2;
    if (kind === 1) space(line); else if (kind === 2) sep(line);
    for (const a of VIS_ATTRS) {
      const v = c.attrs[a];
      if (v && v.trim()) { sep(line); emit(v, line); sep(line); }
    }
    if (c.name === 'br') { sep(line); continue; }
    const isCode = VIS_CODE.has(c.name);
    if (isCode) inCode++;
    st.push({ node: c, i: 0, kind, line, isCode });
  }
  return { text: chars.join(''), lines, code };
}

/* ------------------------------------------------------------------ CSS */

function skipString(s, i) {
  const q = s[i];
  const n = s.length;
  let j = i + 1;
  while (j < n) {
    const c = s[j];
    if (c === '\\') { j += 2; continue; }
    if (c === q) return j + 1;
    if (c === '\n') return j;
    j++;
  }
  return n;
}

// Skip a balanced (...) group. A brace inside it means the CSS is broken: stop there.
function skipParens(s, i) {
  let d = 0;
  const n = s.length;
  for (let j = i; j < n; j++) {
    const c = s[j];
    if (c === '"' || c === "'") { j = skipString(s, j) - 1; continue; }
    if (c === '(') d++;
    else if (c === ')') { d--; if (d === 0) return j + 1; }
    else if (c === '{' || c === '}') return j;
  }
  return n;
}

function splitTop(s, sepChar) {
  const out = [];
  let d = 0, start = 0;
  for (let j = 0; j < s.length; j++) {
    const c = s[j];
    if (c === '"' || c === "'") { j = skipString(s, j) - 1; continue; }
    if (c === '(' || c === '[') d++;
    else if (c === ')' || c === ']') d--;
    else if (c === sepChar && d === 0) { out.push(s.slice(start, j)); start = j + 1; }
  }
  out.push(s.slice(start));
  return out;
}

const DECL_BLOCK_AT = new Set(['font-face', 'page', 'property', 'counter-style', 'font-palette-values', 'viewport', 'position-try']);

function nestSelector(parent, child) {
  const ps = splitTop(parent, ',').map((s) => s.trim());
  const cs = splitTop(child, ',').map((s) => s.trim());
  const out = [];
  for (const p of ps) for (const c of cs) out.push(c.includes('&') ? c.replace(/&/g, p) : p + ' ' + c);
  return out.join(', ');
}

/** Parse a stylesheet into a flat list of rules: { selector, offset, decls: [{ prop, value, offset }], at: [preludes] }. */
function parseCSS(src) {
  const css = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const rules = [];
  const atRules = [];
  const stack = [];
  const n = css.length;
  let seg = 0;
  let i = 0;
  const atPreludes = () => stack.filter((s) => s.kind === 'at').map((s) => s.prelude);
  const inKeyframes = () => stack.some((s) => s.kind === 'at' && /keyframes$/i.test(s.name));
  const lead = (raw, off) => off + (raw.length - raw.trimStart().length);
  const statement = (raw, off) => {
    const t = raw.trim();
    if (!t) return;
    const at = lead(raw, off);
    const top = stack[stack.length - 1];
    if (t[0] === '@' && !(top && top.kind === 'rule')) {
      atRules.push({ prelude: t, name: (/^@([\w-]+)/.exec(t) || [, ''])[1].toLowerCase(), offset: at, at: atPreludes(), block: false });
      return;
    }
    if (top && top.kind === 'rule') {
      const c = t.indexOf(':');
      if (c > 0) top.rule.decls.push({ prop: t.slice(0, c).trim().toLowerCase(), value: t.slice(c + 1).trim(), offset: at });
    }
  };
  while (i < n) {
    const c = css[i];
    if (c === '"' || c === "'") { i = skipString(css, i); continue; }
    if (c === '(') { const e = skipParens(css, i); i = e > i ? e : i + 1; continue; }
    if (c === '{') {
      const raw = css.slice(seg, i);
      const t = raw.trim();
      const off = lead(raw, seg);
      if (t[0] === '@') {
        const name = (/^@([\w-]+)/.exec(t) || [, ''])[1].toLowerCase();
        atRules.push({ prelude: t, name, offset: off, at: atPreludes(), block: true });
        if (DECL_BLOCK_AT.has(name)) {
          const rule = { selector: t, offset: off, decls: [], at: atPreludes(), atRule: name, keyframe: false };
          rules.push(rule);
          stack.push({ kind: 'rule', rule });
        } else {
          stack.push({ kind: 'at', prelude: t, name });
        }
      } else {
        const parent = stack[stack.length - 1];
        const selector = parent && parent.kind === 'rule' && !parent.rule.atRule ? nestSelector(parent.rule.selector, t) : t;
        const rule = { selector, offset: off, decls: [], at: atPreludes(), keyframe: inKeyframes() };
        rules.push(rule);
        stack.push({ kind: 'rule', rule });
      }
      seg = i + 1; i++;
      continue;
    }
    if (c === ';') { statement(css.slice(seg, i), seg); seg = i + 1; i++; continue; }
    if (c === '}') { statement(css.slice(seg, i), seg); stack.pop(); seg = i + 1; i++; continue; }
    i++;
  }
  statement(css.slice(seg), seg);
  return { rules, atRules };
}

function parseDecls(style) {
  const out = [];
  for (const part of splitTop(style, ';')) {
    const c = part.indexOf(':');
    if (c > 0) out.push({ prop: part.slice(0, c).trim().toLowerCase(), value: part.slice(c + 1).trim() });
  }
  return out;
}

/* ------------------------------------------------------------------ colours */

const NAMED_COLOURS = ('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown '
  + 'burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod '
  + 'darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen '
  + 'darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue '
  + 'firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew '
  + 'hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan '
  + 'lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray '
  + 'lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid '
  + 'mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream '
  + 'mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen '
  + 'paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown '
  + 'royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow '
  + 'springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen').split(' ');
const NAMED_SET = new Set(NAMED_COLOURS);
const HEX_RE = /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
const CSS_FN_RE = /(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi;
const JS_FN_RE = /(?<![\w-])(?:rgba?|hsla?)\(/gi;
const NAMED_RE = new RegExp(`(?<![\\w-])(?:${NAMED_COLOURS.slice().sort((a, b) => b.length - a.length).join('|')})(?![\\w-])`, 'gi');
// Properties whose values hold names (fonts, animations, grid areas, counters), not colours.
const NAME_PROPS = new Set(['font', 'font-family', 'animation', 'animation-name', 'transition', 'transition-property',
  'grid-area', 'grid-template-areas', 'grid-template', 'grid', 'grid-row', 'grid-row-start', 'grid-row-end', 'grid-column',
  'grid-column-start', 'grid-column-end', 'counter-reset', 'counter-increment', 'counter-set', 'content', 'quotes',
  'will-change', 'view-transition-name', 'container', 'container-name', 'anchor-name', 'position-anchor', 'font-palette',
  'font-feature-settings', 'font-variation-settings', 'list-style-type', 'list-style']);
const MASK_PROPS = new Set(['mask', 'mask-image', '-webkit-mask', '-webkit-mask-image', 'mask-border', '-webkit-mask-box-image']);

function scrubCssValue(v) {
  return v
    .replace(/url\((?:[^()"']|"[^"]*"|'[^']*')*\)/gi, 'url()')
    .replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, '""');
}

function fnText(s, at) {
  const e = skipParens(s, s.indexOf('(', at));
  return s.slice(at, e).replace(/\s+/g, '');
}

/** Colour literals in a CSS value: [{ text, index }]. */
function cssColours(prop, value) {
  const v = scrubCssValue(value);
  const out = [];
  let m;
  HEX_RE.lastIndex = 0;
  while ((m = HEX_RE.exec(v))) out.push({ text: m[0], index: m.index, hex: true });
  CSS_FN_RE.lastIndex = 0;
  while ((m = CSS_FN_RE.exec(v))) out.push({ text: fnText(v, m.index), index: m.index });
  if (!NAME_PROPS.has(prop)) {
    NAMED_RE.lastIndex = 0;
    while ((m = NAMED_RE.exec(v))) out.push({ text: m[0], index: m.index });
  }
  return out.sort((a, b) => a.index - b.index);
}

/** Colour literals in a JS string literal. Named colours count only as a whole string or in a CSS-like declaration. */
function jsColours(str) {
  const out = [];
  let m;
  HEX_RE.lastIndex = 0;
  while ((m = HEX_RE.exec(str))) out.push(m[0]);
  JS_FN_RE.lastIndex = 0;
  while ((m = JS_FN_RE.exec(str))) out.push(fnText(str, m.index));
  const t = str.trim().toLowerCase();
  if (NAMED_SET.has(t)) out.push(str.trim());
  else {
    const re = /(?:^|[;{\s])(?:color|background(?:-color)?|fill|stroke|border(?:-[a-z]+)?-?color|border|outline(?:-color)?|box-shadow|text-shadow)\s*:\s*([^;]*)/gi;
    while ((m = re.exec(str))) {
      NAMED_RE.lastIndex = 0;
      let k;
      while ((k = NAMED_RE.exec(m[1]))) out.push(k[0]);
    }
  }
  return out;
}

function normHex(h) {
  let x = h.replace('#', '').toLowerCase();
  if (x.length === 3 || x.length === 4) x = x.split('').map((c) => c + c).join('');
  if (x.length === 8 && x.endsWith('ff')) x = x.slice(0, 6);
  return '#' + x;
}

/* ------------------------------------------------------------------ JS */

const JS_EXPR_KEYWORDS = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await', 'export', 'default', 'extends']);

function readEscape(code, j) {
  const c = code[j + 1];
  switch (c) {
    case 'n': return ['\n', j + 2];
    case 't': return ['\t', j + 2];
    case 'r': return ['\r', j + 2];
    case 'b': return ['\b', j + 2];
    case 'f': return ['\f', j + 2];
    case 'v': return ['\v', j + 2];
    case '0': return ['\0', j + 2];
    case 'x': {
      const h = code.slice(j + 2, j + 4);
      return /^[0-9a-fA-F]{2}$/.test(h) ? [String.fromCharCode(parseInt(h, 16)), j + 4] : ['x', j + 2];
    }
    case 'u': {
      if (code[j + 2] === '{') {
        const e = code.indexOf('}', j + 3);
        const h = e > 0 ? code.slice(j + 3, e) : '';
        if (/^[0-9a-fA-F]{1,6}$/.test(h)) { try { return [String.fromCodePoint(parseInt(h, 16)), e + 1]; } catch { /* fall through */ } }
        return ['u', j + 2];
      }
      const h = code.slice(j + 2, j + 6);
      return /^[0-9a-fA-F]{4}$/.test(h) ? [String.fromCharCode(parseInt(h, 16)), j + 6] : ['u', j + 2];
    }
    case '\r': return ['', code[j + 2] === '\n' ? j + 3 : j + 2];
    case '\n': case '\u2028': case '\u2029': return ['', j + 2];
    case undefined: return ['', j + 1];
    default: return [c, j + 2];
  }
}

function readRegex(code, i) {
  const n = code.length;
  let j = i + 1;
  let cls = false;
  while (j < n) {
    const c = code[j];
    if (c === '\\') { j += 2; continue; }
    if (c === '\n') return -1;
    if (cls) { if (c === ']') cls = false; }
    else if (c === '[') cls = true;
    else if (c === '/') { j++; while (j < n && /[a-z]/i.test(code[j])) j++; return j; }
    j++;
  }
  return -1;
}

/** Every string literal (and every static chunk of a template literal) in a script: [{ value, start, end }]. */
function jsStrings(code) {
  const strings = [];
  const n = code.length;
  const tpl = [];
  const IDENT = /[A-Za-z_$#\u00c0-\uffff][\w$\u00c0-\uffff]*/y;
  const NUM = /\d[\w.]*/y;
  let i = 0;
  let prev = 'punc';
  let depth = 0;
  const readTpl = (j) => {
    let buf = '';
    const start = j;
    while (j < n) {
      const c = code[j];
      if (c === '\\') { const [s, k] = readEscape(code, j); buf += s; j = k; continue; }
      if (c === '`') { strings.push({ value: buf, start, end: j + 1 }); return { j: j + 1, open: false }; }
      if (c === '$' && code[j + 1] === '{') { strings.push({ value: buf, start, end: j }); tpl.push(depth); return { j: j + 2, open: true }; }
      buf += c;
      j++;
    }
    strings.push({ value: buf, start, end: n });
    return { j: n, open: false };
  };
  while (i < n) {
    const ch = code[i];
    if (ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r' || ch === '\u00a0' || ch === '\ufeff' || ch === '\u2028' || ch === '\u2029') { i++; continue; }
    if (ch === '/') {
      const nx = code[i + 1];
      if (nx === '/') { const e = code.indexOf('\n', i); i = e === -1 ? n : e; continue; }
      if (nx === '*') { const e = code.indexOf('*/', i + 2); i = e === -1 ? n : e + 2; continue; }
      if (prev === 'punc' || prev === 'kw') {
        const e = readRegex(code, i);
        if (e > 0) { i = e; prev = 'val'; continue; }
      }
      i++; prev = 'punc';
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      let buf = '';
      while (j < n) {
        const c = code[j];
        if (c === ch) { j++; break; }
        if (c === '\\') { const [s, k] = readEscape(code, j); buf += s; j = k; continue; }
        if (c === '\n') break;
        buf += c;
        j++;
      }
      strings.push({ value: buf, start: i, end: j });
      i = j; prev = 'val';
      continue;
    }
    if (ch === '`') { const r = readTpl(i + 1); i = r.j; prev = r.open ? 'punc' : 'val'; continue; }
    if (ch === '{') { depth++; i++; prev = 'punc'; continue; }
    if (ch === '}') {
      if (tpl.length && tpl[tpl.length - 1] === depth) { tpl.pop(); const r = readTpl(i + 1); i = r.j; prev = r.open ? 'punc' : 'val'; continue; }
      depth--; i++; prev = 'punc';
      continue;
    }
    if (ch === ')' || ch === ']') { i++; prev = 'val'; continue; }
    if (/[A-Za-z_$#\u00c0-\uffff]/.test(ch)) {
      IDENT.lastIndex = i;
      const m = IDENT.exec(code);
      i = IDENT.lastIndex;
      prev = JS_EXPR_KEYWORDS.has(m[0]) ? 'kw' : 'val';
      continue;
    }
    if (ch >= '0' && ch <= '9') { NUM.lastIndex = i; NUM.exec(code); i = NUM.lastIndex; prev = 'val'; continue; }
    i++; prev = 'punc';
  }
  return strings;
}

// "User-facing" strings: at least one space and one letter, and not SVG path data.
const isUserFacing = (s) => /\s/.test(s) && /\p{L}/u.test(s) && !/^\s*[Mm]\s*[-+.\d]/.test(s);

function findPath2D(code, strings) {
  const out = [];
  const byStart = new Map(strings.map((s) => [s.start, s]));
  const re = /\bPath2D\s*\(\s*/g;
  let m;
  while ((m = re.exec(code))) {
    const at = re.lastIndex;
    const c = code[at];
    if (c === '"' || c === "'" || c === '`') {
      const s = byStart.get(c === '`' ? at + 1 : at);
      if (s) out.push({ d: s.value, offset: m.index });
      continue;
    }
    const id = /^[A-Za-z_$][\w$]*/.exec(code.slice(at, at + 80));
    if (!id) continue;
    const decl = new RegExp('(?<![\\w$.])' + escapeRe(id[0]) + '\\s*=\\s*([\'"`])', 'g');
    let dm;
    while ((dm = decl.exec(code))) {
      const st = dm.index + dm[0].length - 1;
      const s = byStart.get(dm[1] === '`' ? st + 1 : st);
      if (s && /^\s*[Mm]/.test(s.value)) { out.push({ d: s.value, offset: m.index }); break; }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ SVG paths */

const PATH_TOKEN = /[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;

/** Compare two path strings after normalising whitespace and number spelling. Null when equal. */
function pathDiff(got, want) {
  const A = got.match(PATH_TOKEN) || [];
  const B = want.match(PATH_TOKEN) || [];
  const len = Math.max(A.length, B.length);
  for (let k = 0; k < len; k++) {
    const x = A[k], y = B[k];
    if (x === y) continue;
    if (x !== undefined && y !== undefined && /\d/.test(x) && /\d/.test(y) && Number(x) === Number(y)) continue;
    return { index: k, got: x ?? '(end)', want: y ?? '(end)', gotLen: A.length, wantLen: B.length };
  }
  return null;
}

function svgPathDs(svgText) {
  return [...svgText.matchAll(/<path\b[^>]*?\sd\s*=\s*("([^"]*)"|'([^']*)')/g)].map((m) => m[2] ?? m[3]);
}

/* ------------------------------------------------------------------ URLs */

const SCRIPT_HOSTS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net/npm/', 'unpkg.com', 'cdn.tailwindcss.com', 'code.jquery.com'];

function externalHost(url) {
  const u = url.trim();
  const m = /^(?:https?:)?\/\/([^/?#]+)(\/[^?#]*)?/i.exec(u);
  if (!m) return null;
  return { host: m[1].toLowerCase().replace(/:\d+$/, ''), path: m[2] || '/' };
}

function hostAllowed(kind, ext) {
  if (kind === 'stylesheet') return ext.host === 'fonts.googleapis.com';
  if (kind === 'font') return ext.host === 'fonts.gstatic.com';
  if (kind === 'script') {
    return SCRIPT_HOSTS.some((h) => {
      const [host, ...rest] = h.split('/');
      const pre = rest.length ? '/' + rest.join('/') : '';
      return ext.host === host && ext.path.startsWith(pre || '/');
    });
  }
  return false;
}

const HOST_HINT = {
  stylesheet: 'Stylesheets load only from fonts.googleapis.com.',
  font: 'Fonts load only from fonts.gstatic.com.',
  script: 'Scripts load only from ' + SCRIPT_HOSTS.join(', ') + '.',
  media: 'Images and video ship beside the page (media/) or inline as data: URIs.',
};

/* ------------------------------------------------------------------ findings */

class Findings {
  constructor() { this.errors = []; this.warnings = []; this.seen = new Set(); }
  add(severity, rule, message, file, line) {
    const key = [severity, rule, file, line, message].join('\u0001');
    if (this.seen.has(key)) return;
    this.seen.add(key);
    const item = { rule, id: RULES[rule].id, message, file };
    if (line != null) item.line = line;
    (severity === 'error' ? this.errors : this.warnings).push(item);
  }
  error(rule, message, file, line) { this.add('error', rule, message, file, line); }
  warn(rule, message, file, line) { this.add('warning', rule, message, file, line); }
}

const ruleNum = (r) => Number(r.slice(1));
function sortItems(items) {
  return items.sort((a, b) => ruleNum(a.rule) - ruleNum(b.rule) || String(a.file).localeCompare(String(b.file)) || (a.line || 0) - (b.line || 0));
}

/* ------------------------------------------------------------------ inputs */

function displayPath(abs, root) {
  const rel = path.relative(root, abs);
  if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) return rel.split(path.sep).join('/');
  const relCwd = path.relative(process.cwd(), abs);
  if (relCwd && !relCwd.startsWith('..') && !path.isAbsolute(relCwd)) return relCwd.split(path.sep).join('/');
  return abs;
}

function makeFile(abs, display, raw) {
  const text = stripDataUris(raw);
  const starts = lineStarts(text);
  return { abs, display, text, starts, line: (offset) => lineAt(starts, offset) };
}

function loadBrand(brandDir, options, root, F) {
  const read = (name) => {
    const abs = path.join(brandDir, name);
    const shown = displayPath(abs, root);
    try {
      return JSON.parse(fs.readFileSync(abs, 'utf8'));
    } catch (err) {
      const why = err.code === 'ENOENT' ? 'no such file' : err.message;
      F.error('R0', `Cannot read ${shown}: ${why}.`, shown);
      return null;
    }
  };
  const tokens = options.tokens || read('tokens.json');
  const ledger = options.ledger || read('ledger.json');
  if (!tokens || !ledger) return null;
  const marks = {};
  for (const name of ['horse', 'lockup']) {
    const p = path.join(brandDir, 'marks', name + '.svg');
    marks[name] = fs.existsSync(p) ? svgPathDs(fs.readFileSync(p, 'utf8')) : null;
  }
  return { tokens, ledger, marks };
}

function collectTokenHexes(tokens) {
  const set = new Set();
  const walk = (v) => {
    if (typeof v === 'string') { for (const m of v.matchAll(HEX_RE)) set.add(normHex(m[0])); }
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(tokens);
  return set;
}

const JS_TYPES = new Set(['', 'text/javascript', 'application/javascript', 'module', 'text/ecmascript', 'application/ecmascript']);

/** Pull the HTML tree, inline <style> sheets, inline <script>s and style="" attributes out of one HTML file. */
function readHtml(file) {
  const { root, all } = parseHTML(file.text);
  const sheets = [];
  const scripts = [];
  for (const node of all) {
    if (node.name === 'style') {
      const t = node.children.find((c) => c.type === 'text');
      if (t) sheets.push({ file, text: node.contentStart != null ? file.text.slice(node.contentStart, node.contentEnd) : t.text, base: node.contentStart ?? t.start, kind: 'inline' });
    } else if (node.name === 'script' && !('src' in node.attrs)) {
      const type = (node.attrs.type || '').trim().toLowerCase();
      if (!JS_TYPES.has(type) || node.contentStart == null) continue;
      scripts.push({ file, code: file.text.slice(node.contentStart, node.contentEnd), base: node.contentStart });
    }
  }
  return { file, root, all, sheets, scripts };
}

/* ------------------------------------------------------------------ the check */

/**
 * Run the brand check.
 * @param {object} options
 * @param {string} [options.root]      repo root (default: the folder above tools/)
 * @param {string} [options.html]      check one self-contained page instead of site/
 * @param {string} [options.htmlText]  page source as a string (with options.file as its name)
 * @param {string} [options.brandDir]  where tokens.json, ledger.json and marks/ live (default <root>/brand)
 * @param {string} [options.siteDir]   source folder (default <root>/site)
 * @returns {{ mode, root, files, errors, warnings, ms }}
 */
export function check(options = {}) {
  const t0 = performance.now();
  const root = path.resolve(options.root || DEFAULT_ROOT);
  const brandDir = path.resolve(options.brandDir || path.join(root, 'brand'));
  const siteDir = path.resolve(options.siteDir || path.join(root, 'site'));
  const mode = options.html || options.htmlText != null ? 'html' : 'source';
  const F = new Findings();
  const files = [];
  const done = () => ({
    mode, root, files,
    errors: sortItems(F.errors), warnings: sortItems(F.warnings),
    ms: Math.round(performance.now() - t0),
  });

  // Inputs first: report every missing file in one pass, then stop before any rule runs.
  const brand = loadBrand(brandDir, options, root, F);

  /* ---- gather sources ---- */
  let html;               // { file, root, all, sheets, scripts }
  const sheets = [];      // { file, text, base, kind: 'tokens' | 'styles' | 'inline' }
  const scripts = [];     // { file, code, base }
  const rawFiles = [];    // every file, for "anywhere" scans

  if (mode === 'html') {
    let raw, abs;
    if (options.htmlText != null) {
      raw = String(options.htmlText);
      abs = path.resolve(options.file || 'page.html');
    } else {
      abs = path.resolve(options.html);
      try { raw = fs.readFileSync(abs, 'utf8'); } catch (err) {
        F.error('R0', `Cannot read ${options.html}: ${err.code === 'ENOENT' ? 'no such file' : err.message}.`, options.html);
        return done();
      }
    }
    if (!brand) return done();
    const file = makeFile(abs, displayPath(abs, root), raw);
    files.push(file.display);
    rawFiles.push(file);
    html = readHtml(file);
    sheets.push(...html.sheets);
    scripts.push(...html.scripts);
  } else {
    const want = { html: 'index.html', styles: 'styles.css', js: 'main.js', tokens: 'tokens.css' };
    const missing = Object.values(want).filter((f) => !fs.existsSync(path.join(siteDir, f)));
    if (missing.length) {
      for (const f of missing) {
        const hint = f === 'tokens.css' ? ' It is generated: run node tools/build.mjs.' : '';
        F.error('R0', `Missing source file ${displayPath(path.join(siteDir, f), root)}.${hint}`, displayPath(path.join(siteDir, f), root));
      }
    }
    if (missing.length || !brand) return done();
    const load = (name) => {
      const abs = path.join(siteDir, name);
      const file = makeFile(abs, displayPath(abs, root), fs.readFileSync(abs, 'utf8'));
      files.push(file.display);
      rawFiles.push(file);
      return file;
    };
    const htmlFile = load(want.html);
    const stylesFile = load(want.styles);
    const jsFile = load(want.js);
    const tokensFile = load(want.tokens);
    html = readHtml(htmlFile);
    sheets.push({ file: tokensFile, text: tokensFile.text, base: 0, kind: 'tokens' });
    sheets.push({ file: stylesFile, text: stylesFile.text, base: 0, kind: 'styles' });
    for (const s of html.sheets) sheets.push({ ...s, kind: 'styles' });
    scripts.push({ file: jsFile, code: jsFile.text, base: 0 });
    scripts.push(...html.scripts);
    // Other local scripts and stylesheets the page loads (e.g. a boot script) are checked like main.js and styles.css.
    const known = new Set(Object.values(want));
    for (const node of html.all) {
      const isScript = node.name === 'script' && node.attrs.src != null && JS_TYPES.has((node.attrs.type || '').trim().toLowerCase());
      const isSheet = node.name === 'link' && node.attrs.href != null && /(?:^|\s)stylesheet(?:\s|$)/i.test(node.attrs.rel || '');
      if (!isScript && !isSheet) continue;
      const ref = (isScript ? node.attrs.src : node.attrs.href).trim().replace(/[?#].*$/, '');
      if (!ref || /^(?:[a-z][\w+.-]*:|\/\/|\/)/i.test(ref)) continue;
      const abs = path.resolve(siteDir, ref);
      const rel = path.relative(siteDir, abs);
      if (rel.startsWith('..') || known.has(rel.split(path.sep).join('/')) || !fs.existsSync(abs)) continue;
      known.add(rel.split(path.sep).join('/'));
      const file = load(rel);
      if (isScript) scripts.push({ file, code: file.text, base: 0 });
      else sheets.push({ file, text: file.text, base: 0, kind: 'styles' });
    }
  }

  const { tokens, ledger, marks } = brand;
  const hfile = html.file;
  const hline = (node) => hfile.line(node.start);
  const tokenHexes = collectTokenHexes(tokens);
  const wingCodes = Object.fromEntries(WINGS.map((w) => [w, tokens.wing?.[w]?.code || w.slice(0, 3).toUpperCase()]));

  /* ---- parse ---- */
  for (const s of sheets) {
    const parsed = parseCSS(s.text);
    s.rules = parsed.rules;
    s.atRules = parsed.atRules;
  }
  const declLine = (sheet, offset) => sheet.file.line(sheet.base + offset);
  for (const sc of scripts) sc.strings = jsStrings(sc.code);
  const jsLine = (sc, str) => sc.file.line(sc.base + str.start);
  const userStrings = [];
  for (const sc of scripts) for (const s of sc.strings) if (isUserFacing(s.value)) userStrings.push({ sc, s });

  const inlineStyles = html.all.filter((n) => n.attrs.style != null && n.attrs.style.trim())
    .map((node) => ({ node, decls: parseDecls(node.attrs.style) }));

  const vis = visibleText(html.root, hfile.line);
  const visLine = (index) => vis.lines[Math.min(index, vis.lines.length - 1)] ?? 1;

  const isTokenBlock = (rule) => !rule.keyframe && /^\s*(?::root|\[data-wing)/i.test(rule.selector);
  const selLabel = (rule) => `"${clip(rule.selector.replace(/\s+/g, ' '), 50)}"`;

  /* ---- R1 jacquard-names-only ---- */
  const usesDisplayFace = (prop, value) => /var\(\s*--(?:font-)?disp\s*[,)]/i.test(value)
    || ((prop === 'font-family' || prop === 'font') && /jacquard/i.test(value));
  const targetsWord = (selector) => splitTop(selector, ',').every((sel) => {
    const compounds = sel.trim().split(/\s*[>+~]\s*|\s+/).filter(Boolean);
    return compounds.length > 0 && /\.word(?![\w-])/.test(compounds[compounds.length - 1]);
  });
  for (const s of sheets) {
    for (const rule of s.rules) {
      if (rule.keyframe || rule.atRule) continue;
      for (const d of rule.decls) {
        if (d.prop.startsWith('--')) continue;
        if (usesDisplayFace(d.prop, d.value) && !targetsWord(rule.selector)) {
          F.error('R1', `${selLabel(rule)} sets Jacquard 24 (${d.prop}: ${clip(d.value, 40)}). Only .word may use it.`, s.file.display, declLine(s, d.offset));
        }
      }
    }
  }
  for (const { node, decls } of inlineStyles) {
    for (const d of decls) {
      if (!d.prop.startsWith('--') && usesDisplayFace(d.prop, d.value) && !hasClass(node, 'word')) {
        F.error('R1', `${describe(node)} sets Jacquard 24 in its style attribute. Only .word may use it.`, hfile.display, hline(node));
      }
    }
  }
  const brandNames = ledger.brandNames || [];
  for (const node of html.all) {
    if (!hasClass(node, 'word')) continue;
    const t = textContent(node).replace(/\s+/g, ' ').trim();
    if (!brandNames.includes(t)) {
      F.error('R1', `.word text "${clip(t, 40)}" is not a brand name. Jacquard 24 sets only ${brandNames.join(', ')}.`, hfile.display, hline(node));
    }
  }

  /* ---- R2 colour-literals, R3 token-values ---- */
  for (const s of sheets) {
    for (const rule of s.rules) {
      const tokenBlock = s.kind === 'tokens' || (mode === 'html' && isTokenBlock(rule));
      for (const d of rule.decls) {
        const found = cssColours(d.prop, d.value);
        if (!found.length) continue;
        const line = declLine(s, d.offset);
        if (tokenBlock) {
          for (const c of found) {
            if (c.hex && !tokenHexes.has(normHex(c.text))) {
              F.error('R3', `${c.text} in ${selLabel(rule)} (${d.prop}) is not a value in brand/tokens.json.`, s.file.display, line);
            }
          }
          continue;
        }
        const list = [...new Set(found.map((c) => c.text))].join(', ');
        if (MASK_PROPS.has(d.prop)) {
          F.warn('R2', `${list} in ${selLabel(rule)} (${d.prop}) only sets mask alpha. Prefer currentColor.`, s.file.display, line);
        } else {
          const where = mode === 'html' ? 'outside a token block' : `in ${s.file.display}`;
          F.error('R2', `${list} ${where}: ${selLabel(rule)} (${d.prop}). Use a token, var(--…).`, s.file.display, line);
        }
      }
    }
  }
  for (const { node, decls } of inlineStyles) {
    for (const d of decls) {
      const found = cssColours(d.prop, d.value);
      if (found.length) F.error('R2', `${[...new Set(found.map((c) => c.text))].join(', ')} in the style attribute of ${describe(node)} (${d.prop}). Use a token, var(--…).`, hfile.display, hline(node));
    }
  }
  for (const sc of scripts) {
    for (const s of sc.strings) {
      const found = jsColours(s.value);
      if (found.length) F.error('R2', `${[...new Set(found)].join(', ')} in a script string ("${clip(s.value.trim(), 40)}"). Read colours from the CSS tokens.`, sc.file.display, jsLine(sc, s));
    }
  }

  /* ---- R4 one-wing-per-composition ---- */
  const wingVars = (value) => {
    const out = new Set();
    for (const m of value.matchAll(/var\(\s*--([\w-]+)/g)) {
      const base = m[1].replace(/-t$/, '');
      const w = WINGS.includes(base) ? base : WING_ALIAS[base];
      if (w) out.add(w);
    }
    return out;
  };
  // Map each class to the wing colours its rules use (rules scoped by [data-wing] are left out).
  const classWings = new Map();
  for (const s of sheets) {
    if (s.kind === 'tokens') continue;
    for (const rule of s.rules) {
      if (rule.keyframe || rule.atRule || isTokenBlock(rule) || /\[data-wing/i.test(rule.selector)) continue;
      const ws = new Set();
      for (const d of rule.decls) for (const w of wingVars(d.value)) ws.add(w);
      if (!ws.size) continue;
      for (const sel of splitTop(rule.selector, ',')) {
        const compounds = sel.trim().split(/\s*[>+~]\s*|\s+/).filter(Boolean);
        for (let k = compounds.length - 1; k >= 0; k--) {
          const cls = [...compounds[k].matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
          if (!cls.length) continue;
          for (const c of cls) {
            if (!classWings.has(c)) classWings.set(c, []);
            for (const w of ws) classWings.get(c).push({ wing: w, file: s.file.display, line: declLine(s, rule.offset) });
          }
          break;
        }
      }
    }
  }
  const wingOf = (node) => {
    const w = (node.attrs['data-wing'] || '').trim().toLowerCase();
    return WINGS.includes(w) ? w : null;
  };
  for (const host of html.all) {
    const w = wingOf(host);
    if (!w) continue;
    const st = [host];
    while (st.length) {
      const node = st.pop();
      if (node !== host) {
        const other = wingOf(node);
        if (other && other !== w) {
          F.error('R4', `${describe(node)} data-wing="${other}" sits inside a ${w} composition (line ${hline(host)}). One wing per composition.`, hfile.display, hline(node));
          continue;
        }
      }
      if (node.attrs.style) {
        for (const ow of wingVars(node.attrs.style)) {
          if (ow !== w) F.error('R4', `${describe(node)} uses the ${ow} colour in its style attribute inside a ${w} composition.`, hfile.display, hline(node));
        }
      }
      for (const c of classesOf(node)) {
        for (const ref of classWings.get(c) || []) {
          const at = ref.file === hfile.display ? `line ${ref.line}` : `${ref.file}:${ref.line}`;
          if (ref.wing !== w) F.error('R4', `${describe(node)}: class .${c} uses the ${ref.wing} colour (${at}) inside a ${w} composition.`, hfile.display, hline(node));
        }
      }
      if (node.name === 'canvas' && hasClass(node, 'plate')) {
        const p = (node.attrs['data-plate'] || '').trim().toLowerCase();
        const pw = WING_ALIAS[p] || p;
        if (pw !== w) F.error('R4', `canvas.plate data-plate="${p}" inside a ${w} composition. Use data-plate="${w}".`, hfile.display, hline(node));
      }
      if (hasClass(node, 'code')) {
        const t = textContent(node).replace(/\s+/g, ' ').trim();
        if (t.includes(' — ') && !new RegExp('^' + escapeRe(wingCodes[w]) + '(?![\\w])').test(t)) {
          F.error('R4', `.code "${clip(t, 40)}" inside a ${w} composition. Start it with ${wingCodes[w]}.`, hfile.display, hline(node));
        }
      }
      for (let k = node.children.length - 1; k >= 0; k--) if (node.children[k].type === 'el') st.push(node.children[k]);
    }
  }

  /* ---- R5 house-trio-order ---- */
  // .naves always, and any other row whose direct children carry all three wings (film cards, wing pills).
  // Stacked screens (.screen) and whole pages (main.view) are the page's narrative, not a left-to-right trio, so they are exempt.
  for (const row of html.all) {
    const isNaves = hasClass(row, 'naves');
    let kids = (row.children || []).filter((c) => c.type === 'el' && wingOf(c) && !hasClass(c, 'screen') && !hasClass(c, 'view'));
    if (isNaves && !kids.length) {
      for (const d of descendants(row)) if (wingOf(d) && !kids.some((k) => wingOf(k) && isAncestor(k, d))) kids.push(d);
    }
    const seq = kids.map(wingOf);
    if (!isNaves && !TRIO_ORDER.every((w) => seq.includes(w))) continue;
    const sorted = [...seq].sort((a, b) => TRIO_ORDER.indexOf(a) - TRIO_ORDER.indexOf(b));
    if (seq.join() !== sorted.join()) {
      const label = isNaves ? '.naves' : `<${row.name}${row.attrs.class ? ` class="${row.attrs.class}"` : ''}>`;
      F.error('R5', `${label} runs ${seq.join(', ')}. The house trio runs hortus, machina, arca.`, hfile.display, hline(row));
    }
  }

  /* ---- R6 facts-ledger ---- */
  const allowedNumbers = new Set((ledger.facts || []).flatMap((f) => (f.numbers || []).map(String)));
  for (const m of vis.text.matchAll(/\$?\d+(?:[.:]\d+)*/g)) {
    const num = m[0].replace(/^\$/, '');
    if (allowedNumbers.has(num)) continue;
    F.error('R6', `${num} is not in the facts ledger: "${snippet(vis.text, m.index, m[0].length)}"`, hfile.display, visLine(m.index));
  }

  /* ---- R7 banned-copy ---- */
  for (const b of ledger.banned || []) {
    let re;
    try { re = new RegExp(b.pattern, (b.flags || '').replace(/g/g, '') + 'g'); } catch (err) {
      F.warn('R7', `Ledger pattern ${b.pattern} does not compile: ${err.message}`, 'brand/ledger.json');
      continue;
    }
    for (const m of vis.text.matchAll(re)) {
      if (!m[0]) continue;
      F.error('R7', `"${m[0]}": ${b.reason} ("${snippet(vis.text, m.index, m[0].length)}")`, hfile.display, visLine(m.index));
    }
    if (b.visibleTextOnly) continue;
    for (const { sc, s } of userStrings) {
      for (const m of s.value.matchAll(re)) {
        if (!m[0]) continue;
        F.error('R7', `"${m[0]}" in a script string: ${b.reason} ("${snippet(s.value, m.index, m[0].length)}")`, sc.file.display, jsLine(sc, s));
      }
    }
  }

  /* ---- R8 typographic-punctuation ---- */
  for (const m of vis.text.matchAll(/\p{L}'\p{L}/gu)) {
    if (vis.code[m.index + 1]) continue;
    const word = (/[\p{L}']*$/u.exec(vis.text.slice(Math.max(0, m.index - 24), m.index + 1)) || [''])[0] + "'" + (/^[\p{L}']*/u.exec(vis.text.slice(m.index + 2, m.index + 26)) || [''])[0];
    F.error('R8', `Straight apostrophe in "${word}". Use ’ ("${snippet(vis.text, m.index, 3)}")`, hfile.display, visLine(m.index + 1));
  }
  for (const m of vis.text.matchAll(/"/g)) {
    if (vis.code[m.index]) continue;
    F.error('R8', `Straight double quote. Use “ ” ("${snippet(vis.text, m.index, 1)}")`, hfile.display, visLine(m.index));
  }
  for (const m of vis.text.matchAll(/ - /g)) {
    if (vis.code[m.index + 1]) continue;
    F.warn('R8', `Spaced hyphen used as a dash. Use an em dash, — ("${snippet(vis.text, m.index, 3)}")`, hfile.display, visLine(m.index + 1));
  }
  for (const { sc, s } of userStrings) {
    for (const m of s.value.matchAll(/\p{L}'\p{L}/gu)) {
      F.error('R8', `Straight apostrophe in a script string. Use ’ ("${snippet(s.value, m.index, 3)}")`, sc.file.display, jsLine(sc, s));
    }
  }

  /* ---- R9 british-spelling ---- */
  const spelling = ledger.britishSpelling || {};
  const spellKeys = Object.keys(spelling);
  if (spellKeys.length) {
    const re = new RegExp(`\\b(?:${spellKeys.sort((a, b) => b.length - a.length).map(escapeRe).join('|')})\\b`, 'gi');
    for (const m of vis.text.matchAll(re)) {
      const want = spelling[m[0].toLowerCase()];
      F.error('R9', `"${m[0]}": use "${want}" ("${snippet(vis.text, m.index, m[0].length)}")`, hfile.display, visLine(m.index));
    }
  }

  /* ---- R10 placeholders ---- */
  const known = (ledger.placeholders || []).map((p) => p.token);
  for (const p of ledger.placeholders || []) {
    const hits = [];
    for (const f of rawFiles) {
      let at = -1;
      while ((at = f.text.indexOf(p.token, at + 1)) !== -1) hits.push({ file: f, line: f.line(at) });
    }
    if (!hits.length) continue;
    const byFile = new Map();
    for (const h of hits) {
      if (!byFile.has(h.file.display)) byFile.set(h.file.display, []);
      byFile.get(h.file.display).push(h.line);
    }
    const where = [...byFile].map(([f, ls]) => `${rawFiles.length > 1 ? f : path.basename(f)}:${ls.slice(0, 8).join(', ')}${ls.length > 8 ? ', …' : ''}`).join('; ');
    F.warn('R10', `${p.token} appears ${plural(hits.length, 'time', 'times')} (${where}). ${p.owner || 'Replace it before launch.'}`, hits[0].file.display, hits[0].line);
  }
  for (const f of rawFiles) {
    for (const m of f.text.matchAll(/\[[A-Z][A-Z ]{2,}\]/g)) {
      if (known.includes(m[0])) continue;
      F.error('R10', `Unknown placeholder ${m[0]}. Add it to brand/ledger.json (placeholders) or replace it.`, f.display, f.line(m.index));
    }
  }

  /* ---- R11 marks-integrity ---- */
  const r11 = (msg, file, line) => (mode === 'source' ? F.error('R11', msg, file, line) : F.warn('R11', msg, file, line));
  const diffText = (d) => `token ${d.index + 1}: ${d.got}, expected ${d.want}; ${d.gotLen} vs ${d.wantLen} tokens`;
  const horse = marks.horse?.[0];
  const lockup = marks.lockup;
  if (!horse || !lockup) {
    F.warn('R0', 'brand/marks/horse.svg or lockup.svg is missing or has no paths. R11 was skipped.', 'brand/marks');
  } else {
    const p2d = [];
    for (const sc of scripts) for (const p of findPath2D(sc.code, sc.strings)) p2d.push({ ...p, sc });
    if (p2d.length) {
      if (!p2d.some((p) => !pathDiff(p.d, horse))) {
        const p = p2d.reduce((a, b) => (b.d.length > a.d.length ? b : a));
        r11(`The Path2D horse differs from brand/marks/horse.svg (${diffText(pathDiff(p.d, horse))}). Copy the d attribute exactly.`, p.sc.file.display, p.sc.file.line(p.sc.base + p.offset));
      }
    } else if (mode === 'source') {
      F.warn('R11', 'No Path2D("…") horse found in the scripts, so the plate horse was not checked.', scripts[0].file.display);
    }
    const svg = findHeaderBrandSvg(html.all);
    if (svg) {
      let paths = [...descendants(svg)].filter((n) => n.name === 'path' && n.attrs.d != null);
      if (!paths.length) {
        const use = [...descendants(svg)].find((n) => n.name === 'use');
        const ref = use && (use.attrs.href || use.attrs['xlink:href'] || '').replace(/^#/, '');
        const target = ref && html.all.find((n) => n.attrs.id === ref);
        if (target) paths = [...descendants(target)].filter((n) => n.name === 'path' && n.attrs.d != null);
      }
      const line = hline(svg);
      if (!paths.length) {
        r11('The header brand svg has no paths to check against brand/marks/lockup.svg.', hfile.display, line);
      } else {
        const hd = pathDiff(paths[0].attrs.d, lockup[0]);
        if (hd) r11(`The header horse differs from brand/marks/horse.svg (${diffText(hd)}). Copy the d attribute exactly.`, hfile.display, hline(paths[0]));
        if (paths.length !== lockup.length) {
          r11(`The header brand svg has ${plural(paths.length, 'path', 'paths')}. brand/marks/lockup.svg has ${lockup.length}: the horse and ${lockup.length - 1} wordmark paths.`, hfile.display, line);
        } else {
          const bad = [];
          for (let k = 1; k < lockup.length; k++) if (pathDiff(paths[k].attrs.d, lockup[k])) bad.push(k);
          if (bad.length) r11(`Wordmark ${bad.length === 1 ? 'path' : 'paths'} ${bad.join(', ')} in the header differ from brand/marks/lockup.svg.`, hfile.display, hline(paths[bad[0]]));
        }
      }
    } else if (mode === 'source') {
      F.warn('R11', 'No header brand svg found, so the lockup was not checked.', hfile.display);
    }
  }

  /* ---- R12 images ---- */
  const media = ledger.media || {};
  const videoNames = new Set();
  for (const kind of ['loops', 'films']) for (const w of ledger.videos?.[kind] || []) videoNames.add(`${w}-${kind.slice(0, -1)}`);
  const isLedgerVideo = (f) => /\.(?:mp4|webm|mov|m4v)$/i.test(f) && videoNames.has(f.replace(/\.[^.]+$/, ''));
  for (const node of html.all) {
    if (node.name === 'img' && !('alt' in node.attrs)) {
      F.error('R12', `<img src="${clip(node.attrs.src || '', 50)}"> has no alt attribute. Use alt="" for decoration.`, hfile.display, hline(node));
    }
  }
  const used = new Map();
  for (const f of rawFiles) {
    for (const m of f.text.matchAll(/(?<![\w-])media\/([\w][\w.-]*\.(?:jpe?g|png|webp|avif|gif|svg|mp4|webm|mov|m4v))/gi)) {
      if (!used.has(m[1])) used.set(m[1], []);
      used.get(m[1]).push({ file: f, line: f.line(m.index) });
    }
  }
  for (const [name, refs] of used) {
    const first = refs[0];
    if (!media[name] && !isLedgerVideo(name)) {
      F.error('R12', `media/${name} is not in brand/ledger.json (media). Add it with alt text and rights first.`, first.file.display, first.line);
    }
    if (mode === 'source' && !fs.existsSync(path.join(siteDir, 'media', name))) {
      F.error('R12', `media/${name} does not exist in ${displayPath(path.join(siteDir, 'media'), root)}/.`, first.file.display, first.line);
    }
  }
  for (const node of html.all) {
    if (node.name !== 'img' || !('alt' in node.attrs)) continue;
    const m = /(?:^|\/)media\/([^?#/]+)$/.exec((node.attrs.src || '').trim());
    if (!m || !media[m[1]] || media[m[1]].alt == null) continue;
    if (node.attrs.alt.trim() !== media[m[1]].alt) {
      F.warn('R12', `Alt text for media/${m[1]} differs from the ledger: "${clip(node.attrs.alt, 50)}" vs "${clip(media[m[1]].alt, 50)}".`, hfile.display, hline(node));
    }
  }
  const rights = [...used.keys()].filter((n) => media[n]?.rights === 'check');
  if (rights.length) {
    const first = used.get(rights[0])[0];
    F.warn('R12', `Rights to check before launch: ${rights.map((n) => `${n} (${media[n].note || 'no note'})`).join('; ')}.`, first.file.display, first.line);
  }

  /* ---- R13 type-minimums ---- */
  const tooSmall = (prop, value) => {
    let size = null;
    if (prop === 'font-size') size = value.trim();
    else if (prop === 'font') {
      const parts = splitTop(value.replace(/\s*\/\s*/g, '/'), ' ').filter(Boolean);
      for (const p of parts) {
        const head = splitTop(p, '/')[0];
        if (/^(?:clamp|min|max|calc)\(/i.test(head) || /^-?[\d.]+[a-z%]+$/i.test(head) || /^var\(/i.test(head)) { size = head; break; }
      }
    }
    if (!size) return null;
    let s = size;
    const cm = /^clamp\((.*)\)$/i.exec(s);
    if (cm) s = splitTop(cm[1], ',')[0].trim();
    const um = /^(-?[\d.]+)(px|pt)$/i.exec(s);
    if (!um) return null;
    const px = um[2].toLowerCase() === 'pt' ? Number(um[1]) * 4 / 3 : Number(um[1]);
    return px < 11 ? size : null;
  };
  for (const s of sheets) {
    for (const rule of s.rules) {
      for (const d of rule.decls) {
        const small = tooSmall(d.prop, d.value);
        if (small) F.error('R13', `font-size ${small} in ${selLabel(rule)}. Labels 11 px minimum, body 15 px.`, s.file.display, declLine(s, d.offset));
      }
    }
  }
  for (const { node, decls } of inlineStyles) {
    for (const d of decls) {
      const small = tooSmall(d.prop, d.value);
      if (small) F.error('R13', `font-size ${small} in the style attribute of ${describe(node)}. Labels 11 px minimum, body 15 px.`, hfile.display, hline(node));
    }
  }

  /* ---- R14 reduced-motion ---- */
  const cssFiles = [...new Set(sheets.map((s) => s.file.display))];
  const hasReduced = sheets.some((s) => s.atRules.some((a) => a.name === 'media' && /prefers-reduced-motion\s*:\s*reduce/i.test(a.prelude)));
  if (!hasReduced) {
    F.error('R14', 'No @media (prefers-reduced-motion: reduce) block. Every reveal, plate and curtain needs a still version.', mode === 'source' ? displayPath(path.join(siteDir, 'styles.css'), root) : cssFiles[0] || hfile.display);
  }

  /* ---- R15 theme-shape ---- */
  {
    const tokenSheets = mode === 'source' ? sheets.filter((s) => s.kind === 'tokens') : sheets;
    const where = mode === 'source' ? tokenSheets[0].file.display : hfile.display;
    const normSel = (s) => s.replace(/\s+/g, '').replace(/['"]/g, '').toLowerCase();
    const sels = (rule) => splitTop(rule.selector, ',').map(normSel);
    const defines = (rule) => rule.decls.some((d) => d.prop.startsWith('--'));
    const definesBg = (rule) => rule.decls.some((d) => d.prop === '--bg');
    const inDarkMedia = (rule) => rule.at.some((a) => /prefers-color-scheme\s*:\s*dark/i.test(a));
    const plainAt = (rule) => rule.at.every((a) => /^@layer\b/i.test(a));
    let bare = null, guarded = null, explicit = null;
    for (const s of tokenSheets) {
      for (const rule of s.rules) {
        if (rule.keyframe || rule.atRule || !defines(rule)) continue;
        const list = sels(rule);
        if (!bare && plainAt(rule) && list.includes(':root')) bare = { rule, s };
        if (!guarded && inDarkMedia(rule) && list.includes(':root:not([data-theme=light])')) guarded = { rule, s };
        if (!explicit && !inDarkMedia(rule) && list.includes(':root[data-theme=dark]')) explicit = { rule, s };
      }
    }
    if (!bare) F.error('R15', 'No bare :root block defining the tokens (the light theme).', where);
    if (!guarded) F.error('R15', 'No @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } } block redefining the tokens.', where);
    else if (!definesBg(guarded.rule)) F.error('R15', 'The prefers-color-scheme: dark block does not redefine --bg.', guarded.s.file.display, declLine(guarded.s, guarded.rule.offset));
    if (!explicit) F.error('R15', 'No :root[data-theme="dark"] block redefining the tokens.', where);
    else if (!definesBg(explicit.rule)) F.error('R15', 'The :root[data-theme="dark"] block does not redefine --bg.', explicit.s.file.display, declLine(explicit.s, explicit.rule.offset));
    const bodyBg = sheets.some((s) => s.rules.some((rule) => !rule.keyframe && splitTop(rule.selector, ',').some((x) => x.trim().toLowerCase() === 'body')
      && rule.decls.some((d) => (d.prop === 'background' || d.prop === 'background-color') && /var\(\s*--bg\s*[,)]/.test(d.value))));
    if (!bodyBg) F.error('R15', 'body does not set its background from var(--bg).', mode === 'source' ? displayPath(path.join(siteDir, 'styles.css'), root) : hfile.display);
  }

  /* ---- R16 external-hosts ---- */
  const checkUrl = (kind, url, label, file, line) => {
    const u = (url || '').trim();
    if (!u || /^data:/i.test(u) || u.includes('/_blob/')) return;
    const ext = externalHost(u);
    if (!ext || hostAllowed(kind, ext)) return;
    F.error('R16', `${label} loads from ${ext.host}. ${HOST_HINT[kind]}`, file, line);
  };
  for (const node of html.all) {
    const a = node.attrs;
    const line = hline(node);
    if (node.name === 'script' && a.src != null) checkUrl('script', a.src, '<script src>', hfile.display, line);
    if (node.name === 'link' && a.href != null && /(?:^|\s)stylesheet(?:\s|$)/i.test(a.rel || '')) checkUrl('stylesheet', a.href, '<link rel="stylesheet">', hfile.display, line);
    if (['img', 'video', 'audio', 'source'].includes(node.name)) {
      if (a.src != null) checkUrl('media', a.src, `<${node.name} src>`, hfile.display, line);
      if (a.poster != null) checkUrl('media', a.poster, `<${node.name} poster>`, hfile.display, line);
      if (a.srcset != null) for (const part of a.srcset.split(',')) checkUrl('media', part.trim().split(/\s+/)[0], `<${node.name} srcset>`, hfile.display, line);
    }
  }
  for (const s of sheets) {
    for (const at of s.atRules) {
      if (at.name !== 'import') continue;
      const m = /@import\s+(?:url\(\s*)?["']?([^"')\s]+)/i.exec(at.prelude);
      if (m) checkUrl('stylesheet', m[1], '@import', s.file.display, declLine(s, at.offset));
    }
    for (const rule of s.rules) {
      for (const d of rule.decls) {
        for (const m of d.value.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/gi)) {
          const url = m[1] ?? m[2] ?? m[3];
          const font = rule.atRule === 'font-face' || /\.(?:woff2?|ttf|otf|eot)(?:[?#]|$)/i.test(url);
          checkUrl(font ? 'font' : 'media', url, 'url()', s.file.display, declLine(s, d.offset));
        }
      }
    }
  }
  for (const { node, decls } of inlineStyles) {
    for (const d of decls) {
      for (const m of d.value.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/gi)) checkUrl('media', m[1] ?? m[2] ?? m[3], 'url() in a style attribute', hfile.display, hline(node));
    }
  }
  for (const f of rawFiles) {
    for (const m of f.text.matchAll(/\/_blob\/[\w.-]*/g)) {
      F.error('R16', `${m[0]} is a dead asset-store URL. Re-upload the file and list it in site/media.json.`, f.display, f.line(m.index));
    }
  }

  /* ---- R17 no-emoji ---- */
  for (const m of vis.text.matchAll(/\p{Extended_Pictographic}\uFE0F?/gu)) {
    // ©, ® and ™ are Extended_Pictographic but render as text unless followed by U+FE0F.
    if (/^[\u00a9\u00ae\u2122]$/.test(m[0])) continue;
    F.error('R17', `Emoji ${m[0]} in visible text ("${snippet(vis.text, m.index, m[0].length)}"). No emoji.`, hfile.display, visLine(m.index));
  }

  return done();
}

function isAncestor(a, b) {
  for (let p = b.parent; p; p = p.parent) if (p === a) return true;
  return false;
}

function findHeaderBrandSvg(all) {
  const inHeader = (n) => { for (let p = n.parent; p; p = p.parent) if (p.name === 'header') return true; return false; };
  const firstSvg = (n) => (n.name === 'svg' ? n : [...descendants(n)].find((d) => d.name === 'svg'));
  const brands = all.filter((n) => hasClass(n, 'brand'));
  for (const b of [...brands.filter(inHeader), ...brands]) {
    const svg = firstSvg(b);
    if (svg) return svg;
  }
  const header = all.find((n) => n.name === 'header');
  return header ? firstSvg(header) : null;
}

/* ------------------------------------------------------------------ report */

export function formatReport(result) {
  const out = [];
  out.push(`lastfomo brand check · ${result.mode} · ${result.files.join(', ') || '(no files read)'}`);
  for (const [label, items] of [['Errors', result.errors], ['Warnings', result.warnings]]) {
    if (!items.length) continue;
    out.push('', label);
    const groups = new Map();
    for (const it of items) {
      if (!groups.has(it.rule)) groups.set(it.rule, []);
      groups.get(it.rule).push(it);
    }
    for (const [rule, list] of [...groups].sort((a, b) => ruleNum(a[0]) - ruleNum(b[0]))) {
      out.push(`  ${rule} ${RULES[rule].id} (${list.length})`);
      for (const it of list) {
        // One page: the header names it in full, so item lines use the base name.
        const f = result.mode === 'html' && result.files.length === 1 && it.file === result.files[0] ? path.basename(it.file) : it.file;
        out.push(`    ${f}${it.line ? ':' + it.line : ''}  ${it.message}`);
      }
    }
  }
  const e = result.errors.length;
  const w = result.warnings.length;
  out.push('', `${e ? 'Failed' : 'Passed'}: ${plural(e, 'error', 'errors')}, ${plural(w, 'warning', 'warnings')} in ${(result.ms / 1000).toFixed(2)} s.`);
  return out.join('\n');
}

/** Parser internals, exported for tests and for tools that want the same view of a page. */
export const internals = { parseHTML, visibleText, parseCSS, jsStrings, stripDataUris, decodeEntities, pathDiff, cssColours, jsColours, lineStarts, lineAt };

/* ------------------------------------------------------------------ CLI */

const USAGE = `Usage: node tools/brandcheck.mjs [--html <file>] [--json] [--root <dir>]

  (no options)    check the source: site/index.html, styles.css, main.js, tokens.css
  --html <file>   check one self-contained page (full document or Artifact fragment)
  --json          print machine output
  --root <dir>    repo root (default: the folder above tools/)

Exit 1 when there are errors, 0 otherwise.`;

function main(argv) {
  const opts = {};
  let json = false;
  for (let k = 0; k < argv.length; k++) {
    const a = argv[k];
    if (a === '--json') json = true;
    else if (a === '--html' || a === '--root') {
      const v = argv[++k];
      if (!v || v.startsWith('--')) { process.stderr.write(`brandcheck: ${a} needs a value.\n\n${USAGE}\n`); return 2; }
      opts[a.slice(2)] = v;
    } else if (a.startsWith('--html=')) opts.html = a.slice(7);
    else if (a.startsWith('--root=')) opts.root = a.slice(7);
    else if (a === '-h' || a === '--help') { process.stdout.write(USAGE + '\n'); return 0; }
    else { process.stderr.write(`brandcheck: unknown option ${a}.\n\n${USAGE}\n`); return 2; }
  }
  let result;
  try {
    result = check(opts);
  } catch (err) {
    process.stderr.write(`brandcheck: internal error: ${err.stack || err}\n`);
    return 2;
  }
  process.stdout.write((json
    ? JSON.stringify({ ...result, counts: { errors: result.errors.length, warnings: result.warnings.length } }, null, 2)
    : formatReport(result)) + '\n');
  return result.errors.length ? 1 : 0;
}

function invokedDirectly() {
  if (!process.argv[1]) return false;
  const real = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
  return real(process.argv[1]) === real(fileURLToPath(import.meta.url));
}
if (invokedDirectly()) process.exitCode = main(process.argv.slice(2));
