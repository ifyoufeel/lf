#!/usr/bin/env node
/**
 * Fixture tests for the brand check.
 *
 *   node tools/brandcheck.test.mjs
 *
 * Every fixture in tools/fixtures/brandcheck/ names what it must trigger in a comment:
 *   <!-- expect: R8 error 4, R8 warning 1 -->   exact counts per rule and severity
 *   <!-- expect: none -->                        no errors and no warnings
 * A rule fixture must trigger its own rule and nothing else. Source mode, the CLI, Artifact
 * fragments and large base64 pages are tested from temporary trees. Exit 1 on any failure.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { check, internals } from './brandcheck.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BRAND = path.join(ROOT, 'brand');
const FIXTURES = path.join(HERE, 'fixtures', 'brandcheck');

// Fixtures check against a frozen copy of the brand data, so the owner's live ledger (placeholders cleared,
// rights confirmed) cannot change what a rule test expects. The copy keeps one placeholder and one rights check.
const FIX_BRAND = fs.mkdtempSync(path.join(os.tmpdir(), 'lf-brand-'));
fs.cpSync(BRAND, FIX_BRAND, { recursive: true });
{
  const lp = path.join(FIX_BRAND, 'ledger.json');
  const led = JSON.parse(fs.readFileSync(lp, 'utf8'));
  led.placeholders = [{ token: '[YOUR EMAIL]', where: 'fixture', owner: 'fixture' }];
  if (led.media && led.media['arca-salon.jpg']) led.media['arca-salon.jpg'].rights = 'check';
  fs.writeFileSync(lp, JSON.stringify(led, null, 2));
}
process.on('exit', () => fs.rmSync(FIX_BRAND, { recursive: true, force: true }));
const CLI = path.join(HERE, 'brandcheck.mjs');

let passed = 0;
let failed = 0;
function report(name, problems) {
  if (problems.length) {
    failed++;
    console.log(`FAIL  ${name}`);
    for (const p of problems) console.log(`        ${p}`);
  } else {
    passed++;
    console.log(`pass  ${name}`);
  }
}
function test(name, fn) {
  let problems;
  try { problems = fn() || []; } catch (err) { problems = [`threw: ${err.stack || err}`]; }
  report(name, problems);
}

const count = (items, rule) => items.filter((i) => i.rule === rule).length;
const show = (items) => items.map((i) => `${i.rule} ${i.file}${i.line ? ':' + i.line : ''} ${i.message}`);

/* ---------------------------------------------------------------- fixtures */

function parseExpect(html, name) {
  const m = /<!--\s*expect:\s*([\s\S]*?)-->/.exec(html);
  if (!m) throw new Error(`${name} has no <!-- expect: … --> comment`);
  const body = m[1].trim();
  if (body === 'none') return [];
  return body.split(',').map((part) => {
    const t = part.trim().split(/\s+/);
    if (t.length !== 3 || !/^R\d+$/.test(t[0]) || !/^(error|warning)$/.test(t[1]) || !/^\d+$/.test(t[2])) {
      throw new Error(`${name}: cannot read expectation "${part.trim()}"`);
    }
    return { rule: t[0], severity: t[1], n: Number(t[2]) };
  });
}

const fixtureFiles = fs.readdirSync(FIXTURES).filter((f) => f.endsWith('.html')).sort();
if (!fixtureFiles.includes('clean.html')) report('clean.html exists', ['tools/fixtures/brandcheck/clean.html is missing']);
for (let r = 1; r <= 17; r++) {
  const prefix = `r${String(r).padStart(2, '0')}-`;
  if (!fixtureFiles.some((f) => f.startsWith(prefix))) report(`fixture for R${r}`, [`no ${prefix}*.html in tools/fixtures/brandcheck/`]);
}

for (const f of fixtureFiles) {
  test(f, () => {
    const file = path.join(FIXTURES, f);
    const expect = parseExpect(fs.readFileSync(file, 'utf8'), f);
    const res = check({ root: ROOT, html: file, brandDir: FIX_BRAND });
    const problems = [];
    const own = /^r(\d+)-/.exec(f);
    if (own) {
      const rule = 'R' + Number(own[1]);
      if (!expect.some((e) => e.rule === rule)) problems.push(`expectations do not mention ${rule}`);
      if (!count(res.errors, rule) && !count(res.warnings, rule)) problems.push(`${rule} did not trigger`);
    }
    for (const e of expect) {
      const got = count(e.severity === 'error' ? res.errors : res.warnings, e.rule);
      if (got !== e.n) problems.push(`${e.rule} ${e.severity}s: expected ${e.n}, got ${got}`);
    }
    const allowed = new Set(expect.map((e) => e.rule));
    const stray = [...res.errors, ...res.warnings].filter((i) => !allowed.has(i.rule));
    if (stray.length) problems.push('unexpected findings:', ...show(stray));
    if (problems.length) problems.push('all findings:', ...show([...res.errors, ...res.warnings]));
    return problems;
  });
}

/* ---------------------------------------------------------------- Artifact fragment */

test('Artifact fragment (no html, head or body) passes like clean.html', () => {
  const clean = fs.readFileSync(path.join(FIXTURES, 'clean.html'), 'utf8');
  const fragment = clean
    .replace(/<!doctype html>\n?/i, '')
    .replace(/<\/?(?:html|head|body)\b[^>]*>\n?/gi, '')
    .replace(/<meta charset="utf-8">\n?/, '');
  if (/<(?:html|head|body)\b/i.test(fragment)) return ['fragment still has document tags'];
  const res = check({ root: ROOT, htmlText: fragment, file: 'fragment.html', brandDir: FIX_BRAND });
  return res.errors.length || res.warnings.length ? show([...res.errors, ...res.warnings]) : [];
});

/* ---------------------------------------------------------------- large inputs */

test('1.2 MB page of base64 data URIs checks in under 2 s', () => {
  const clean = fs.readFileSync(path.join(FIXTURES, 'clean.html'), 'utf8');
  const b64 = 'QUJDRA'.repeat(100000);
  const big = clean
    .replace('</nav>', `</nav>\n  <img src="data:image/jpeg;base64,${b64}" alt="">\n  <video poster="data:image/jpeg;base64,${b64}"></video>`)
    .replace('.lead{', `.plate{background:url(data:image/png;base64,${b64})}\n.lead{`);
  if (big.length < 1_200_000) return [`fixture is only ${big.length} bytes`];
  const t0 = performance.now();
  const res = check({ root: ROOT, htmlText: big, file: 'big.html', brandDir: FIX_BRAND });
  const ms = performance.now() - t0;
  const problems = [];
  if (ms > 2000) problems.push(`took ${Math.round(ms)} ms`);
  if (res.errors.length) problems.push(...show(res.errors));
  return problems;
});

/* ---------------------------------------------------------------- JS scanner */

test('script scanner reads strings, template chunks and skips regex literals', () => {
  const code = "const r = /\"[^']+\"/g; // it's a comment\nconst s = `a ${x ? 'b c' : \"d e\"} f`; /* \"no\" */ const t = 'g\\'h';";
  const got = internals.jsStrings(code).map((s) => s.value);
  const want = ['a ', 'b c', 'd e', ' f', "g'h"];
  return JSON.stringify(got) === JSON.stringify(want) ? [] : [`got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`];
});

/* ---------------------------------------------------------------- source mode */

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'brandcheck-'));
const lockupSvg = fs.readFileSync(path.join(BRAND, 'marks', 'lockup.svg'), 'utf8');
const horseD = /\sd="([^"]*)"/.exec(fs.readFileSync(path.join(BRAND, 'marks', 'horse.svg'), 'utf8'))[1];

const SOURCE = {
  'index.html': `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>lastfomo — research house</title>
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="styles.css">
<script src="boot.js"></script>
</head>
<body>
<header class="bar"><a class="brand" href="#/" aria-label="lastfomo, home">${lockupSvg}</a></header>
<main class="view" data-view="home">
  <section class="screen" data-wing="machina">
    <p class="code">MCH — Machina · Autonomous AI</p>
    <h2 class="word">machina</h2>
    <canvas class="plate" data-plate="machina"></canvas>
    <img src="media/machina-rig.jpg" alt="The wide view of the eight-GPU rig with its cooling fans lit">
  </section>
</main>
<script src="main.js"></script>
</body>
</html>
`,
  'tokens.css': `:root{--bg:#f4f4f4;--fg:#111111;--machina:#d4f70d;--disp:"Jacquard 24",monospace}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#111111;--fg:#ffffff}}
:root[data-theme="dark"]{--bg:#111111;--fg:#ffffff}
[data-wing="machina"]{--wing:var(--machina)}
`,
  'styles.css': `body{margin:0;background:var(--bg);color:var(--fg)}
.word{font-family:var(--disp)}
.code{font:500 12px/1.3 monospace;color:var(--wing)}
@media (prefers-reduced-motion: reduce){*{animation:none}}
`,
  'main.js': `const HORSE = new Path2D("${horseD}");
document.title = 'lastfomo — research house';
`,
  'boot.js': `document.documentElement.classList.add('js');
`,
};

function sourceTree(name, edits = {}, { media = true } = {}) {
  const site = path.join(TMP, name, 'site');
  fs.mkdirSync(path.join(site, 'media'), { recursive: true });
  for (const [f, text] of Object.entries({ ...SOURCE, ...edits })) {
    if (text != null) fs.writeFileSync(path.join(site, f), text);
  }
  if (media) fs.writeFileSync(path.join(site, 'media', 'machina-rig.jpg'), 'jpeg');
  return path.join(TMP, name);
}
const runSource = (root) => check({ root, brandDir: BRAND });

function expectOnly(res, rule, severity, n) {
  const problems = [];
  const list = severity === 'error' ? res.errors : res.warnings;
  if (count(list, rule) !== n) problems.push(`${rule} ${severity}s: expected ${n}, got ${count(list, rule)}`);
  const stray = [...res.errors, ...res.warnings].filter((i) => i.rule !== rule);
  if (stray.length) problems.push('unexpected findings:', ...show(stray));
  return problems;
}

test('source mode: a clean site/ passes with no findings', () => {
  const res = runSource(sourceTree('clean'));
  const problems = [];
  if (res.errors.length || res.warnings.length) problems.push(...show([...res.errors, ...res.warnings]));
  if (!res.files.includes('site/boot.js')) problems.push(`boot.js was not read: ${res.files.join(', ')}`);
  return problems;
});

test('source mode: styles.css may hold no colour literal, even in :root', () => {
  const res = runSource(sourceTree('styles-hex', { 'styles.css': SOURCE['styles.css'] + ':root{--x:#ffffff}\n' }));
  return expectOnly(res, 'R2', 'error', 1);
});

test('source mode: tokens.css is exempt from R2 but checked by R3', () => {
  const res = runSource(sourceTree('tokens-hex', { 'tokens.css': SOURCE['tokens.css'] + ':root{--ink2:#123456}\n' }));
  return expectOnly(res, 'R3', 'error', 1);
});

test('source mode: a local boot script is checked like main.js', () => {
  const res = runSource(sourceTree('boot-hex', { 'boot.js': "document.body.style.color = '#fff';\n" }));
  const problems = expectOnly(res, 'R2', 'error', 1);
  if (!res.errors.some((e) => e.file === 'site/boot.js')) problems.push('the R2 error is not reported against site/boot.js');
  return problems;
});

test('source mode: a rounded Path2D horse is an R11 error', () => {
  const res = runSource(sourceTree('horse', { 'main.js': SOURCE['main.js'].replace('322.101', '322.1') }));
  return expectOnly(res, 'R11', 'error', 1);
});

test('source mode: a media file missing on disk is an R12 error', () => {
  const res = runSource(sourceTree('media', {}, { media: false }));
  return expectOnly(res, 'R12', 'error', 1);
});

test('source mode: missing site/ files are reported, not thrown', () => {
  const root = path.join(TMP, 'empty');
  fs.mkdirSync(root, { recursive: true });
  const res = runSource(root);
  const problems = [];
  if (count(res.errors, 'R0') !== 4) problems.push(`expected 4 R0 errors, got ${show(res.errors).join(' | ')}`);
  if (res.errors.some((e) => e.rule !== 'R0')) problems.push('other rules ran without input');
  return problems;
});

/* ---------------------------------------------------------------- CLI */

const cli = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });

test('CLI: --html clean.html exits 0', () => {
  const r = cli('--html', path.join(FIXTURES, 'clean.html'));
  return r.status === 0 && /Passed: 0 errors/.test(r.stdout) ? [] : [`status ${r.status}`, r.stdout, r.stderr];
});

test('CLI: an error exits 1 and the report groups by rule', () => {
  const r = cli('--html', path.join(FIXTURES, 'r08-typographic-punctuation.html'));
  const problems = [];
  if (r.status !== 1) problems.push(`status ${r.status}`);
  const out = r.stdout;
  if (!(out.indexOf('Errors') < out.indexOf('Warnings') && out.indexOf('Warnings') < out.indexOf('Failed:'))) problems.push('expected Errors, then Warnings, then the total');
  if (!/R8 typographic-punctuation \(4\)/.test(out)) problems.push('missing the R8 group header');
  return problems.length ? [...problems, out] : [];
});

test('CLI: --json prints machine output', () => {
  const r = cli('--html', path.join(FIXTURES, 'r06-facts-ledger.html'), '--json');
  let data;
  try { data = JSON.parse(r.stdout); } catch (err) { return [`not JSON: ${err.message}`, r.stdout]; }
  const e = data.errors && data.errors[0];
  const ok = r.status === 1 && data.counts.errors === 1 && e.rule === 'R6' && e.id === 'facts-ledger' && typeof e.message === 'string' && e.line > 0;
  return ok ? [] : [`status ${r.status}`, r.stdout];
});

test('CLI: source mode without site/ fails with a clear message', () => {
  const root = path.join(TMP, 'no-site');
  fs.cpSync(BRAND, path.join(root, 'brand'), { recursive: true });
  const r = cli('--root', root);
  const out = r.stdout + r.stderr;
  const problems = [];
  if (r.status !== 1) problems.push(`status ${r.status}`);
  if (!/Missing source file site\/index\.html/.test(out)) problems.push('no missing-file message');
  if (/\n\s+at /.test(out)) problems.push('printed a stack trace');
  return problems.length ? [...problems, out] : [];
});

test('CLI: an unknown option exits 2 with usage', () => {
  const r = cli('--nope');
  return r.status === 2 && /Usage:/.test(r.stderr) ? [] : [`status ${r.status}`, r.stderr];
});

fs.rmSync(TMP, { recursive: true, force: true });

console.log(`\n${failed ? 'Failed' : 'Passed'}: ${passed} passed, ${failed} failed.`);
process.exitCode = failed ? 1 : 0;
