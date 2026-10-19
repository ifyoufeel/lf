#!/usr/bin/env node
// Tests for api/brief.mjs, the Vercel Function that emails the brief. The email API is mocked: nothing is sent.
// Usage: node tools/brief.test.mjs
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { handleBrief, WINGS, TIMELINES, LIMITS } = await import(pathToFileURL(join(ROOT, 'api/brief.mjs')).href);

const HOST = 'https://lastfomo.vercel.app';
const good = { wing: 'Machina, private AI', name: 'Ada Example', email: 'ada@example.org', org: '', timeline: 'This year',
  brief: 'A private model for our archive.\nNothing leaves the building.', website: '', elapsed: 42000 };
const req = (body, { method = 'POST', origin = HOST, raw } = {}) => new Request(HOST + '/api/brief', {
  method, headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) },
  body: method === 'POST' ? (raw ?? JSON.stringify(body)) : undefined,
});
const mock = (status = 200) => {
  const calls = [];
  const send = async (url, init) => { calls.push({ url, init, body: JSON.parse(init.body) }); return new Response('{}', { status }); };
  return { calls, send };
};
const ENV = { RESEND_API_KEY: 're_test' };

let failed = 0, passed = 0;
const test = async (name, fn) => {
  try { await fn(); passed++; console.log('pass  ' + name); }
  catch (err) { failed++; console.log('FAIL  ' + name + '\n        ' + err.message); }
};
const eq = (got, want, what) => { if (got !== want) throw new Error(`${what}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`); };

await test('sends a valid brief to the house inbox, reply-to the visitor', async () => {
  const m = mock();
  const res = await handleBrief(req(good), { env: ENV, send: m.send });
  eq(res.status, 200, 'status'); eq((await res.json()).ok, true, 'ok');
  eq(m.calls.length, 1, 'email API calls');
  const c = m.calls[0];
  eq(c.url, 'https://api.resend.com/emails', 'url');
  eq(c.init.headers.authorization, 'Bearer re_test', 'auth');
  eq(c.body.to[0], 'lastfomo@gmail.com', 'to');
  eq(c.body.reply_to, 'ada@example.org', 'reply_to');
  eq(c.body.subject, 'Project brief: Machina, private AI, Ada Example', 'subject');
  if (!c.body.text.includes('Organisation: not given') || !c.body.text.endsWith('Nothing leaves the building.')) throw new Error('text: ' + c.body.text);
  eq(res.headers.get('cache-control'), 'no-store', 'cache-control');
});
await test('BRIEF_TO and BRIEF_FROM override the defaults', async () => {
  const m = mock();
  await handleBrief(req(good), { env: { ...ENV, BRIEF_TO: 'house@example.org', BRIEF_FROM: 'lastfomo <brief@example.org>' }, send: m.send });
  eq(m.calls[0].body.to[0], 'house@example.org', 'to'); eq(m.calls[0].body.from, 'lastfomo <brief@example.org>', 'from');
});
await test('without RESEND_API_KEY it answers 503 and sends nothing', async () => {
  const m = mock();
  const res = await handleBrief(req(good), { env: {}, send: m.send });
  eq(res.status, 503, 'status'); eq(m.calls.length, 0, 'calls');
});
await test('an email API failure is a 502, never a false success', async () => {
  const m = mock(500);
  const res = await handleBrief(req(good), { env: ENV, send: m.send });
  eq(res.status, 502, 'status'); eq((await res.json()).ok, false, 'ok');
});
await test('an unreachable email API is a 502', async () => {
  const res = await handleBrief(req(good), { env: ENV, send: async () => { throw new TypeError('fetch failed'); } });
  eq(res.status, 502, 'status');
});
await test('GET is refused with 405', async () => {
  const res = await handleBrief(req(null, { method: 'GET' }), { env: ENV, send: mock().send });
  eq(res.status, 405, 'status'); eq(res.headers.get('allow'), 'POST', 'allow');
});
await test('another origin, or none, is refused with 403', async () => {
  const m = mock();
  eq((await handleBrief(req(good, { origin: 'https://evil.example' }), { env: ENV, send: m.send })).status, 403, 'foreign origin');
  eq((await handleBrief(req(good, { origin: null }), { env: ENV, send: m.send })).status, 403, 'no origin');
  eq((await handleBrief(req(good, { origin: 'not a url' }), { env: ENV, send: m.send })).status, 403, 'bad origin');
  eq(m.calls.length, 0, 'calls');
});
await test('the honeypot answers as if sent and sends nothing', async () => {
  const m = mock();
  const res = await handleBrief(req({ ...good, website: 'https://spam.example' }), { env: ENV, send: m.send });
  eq(res.status, 200, 'status'); eq((await res.json()).ok, true, 'ok'); eq(m.calls.length, 0, 'calls');
});
await test('a form filled in under 3 s is refused', async () => {
  const m = mock();
  eq((await handleBrief(req({ ...good, elapsed: 900 }), { env: ENV, send: m.send })).status, 400, 'fast');
  eq((await handleBrief(req({ ...good, elapsed: undefined }), { env: ENV, send: m.send })).status, 400, 'missing');
  eq(m.calls.length, 0, 'calls');
});
await test('invalid fields are refused with 422', async () => {
  const m = mock();
  for (const bad of [{ wing: 'Wing 04' }, { timeline: 'Yesterday' }, { name: '   ' }, { brief: '' }, { email: 'not-an-email' }, { email: 'a@b.c\r\nBcc: x@y.z' }]) {
    eq((await handleBrief(req({ ...good, ...bad }), { env: ENV, send: m.send })).status, 422, JSON.stringify(bad));
  }
  eq(m.calls.length, 0, 'calls');
});
await test('malformed JSON and oversize bodies are refused', async () => {
  const m = mock();
  eq((await handleBrief(req(null, { raw: '{not json' }), { env: ENV, send: m.send })).status, 400, 'bad json');
  eq((await handleBrief(req(null, { raw: '42' }), { env: ENV, send: m.send })).status, 400, 'not an object');
  eq((await handleBrief(req({ ...good, brief: 'x'.repeat(30000) }), { env: ENV, send: m.send })).status, 413, 'oversize');
  eq(m.calls.length, 0, 'calls');
});
await test('an over-length field is refused, never sent cut short', async () => {
  const m = mock();
  eq((await handleBrief(req({ ...good, brief: 'word '.repeat(1001) + 'THE END' }), { env: ENV, send: m.send })).status, 422, 'long brief');
  eq((await handleBrief(req({ ...good, name: 'N'.repeat(121) }), { env: ENV, send: m.send })).status, 422, 'long name');
  eq(m.calls.length, 0, 'calls');
  const at = await handleBrief(req({ ...good, brief: 'x'.repeat(5000) }), { env: ENV, send: m.send });
  eq(at.status, 200, 'a brief of exactly 5000 characters');
});
await test('line breaks never reach the subject; control characters are stripped', async () => {
  const m = mock();
  await handleBrief(req({ ...good, name: 'Ada\r\nBcc: x@y.z\u0007' }), { env: ENV, send: m.send });
  eq(m.calls[0].body.subject, 'Project brief: Machina, private AI, Ada Bcc: x@y.z', 'subject');
});
await test('the wing and timeline lists and the field limits match the form in site/index.html', async () => {
  const html = readFileSync(join(ROOT, 'site/index.html'), 'utf8');
  const form = html.slice(html.indexOf('<form class="form" id="brief">'), html.indexOf('</form>'));
  const radios = [...form.matchAll(/name="wing" value="([^"]+)"/g)].map((m) => m[1]);
  const select = form.slice(form.indexOf('<select name="timeline">'), form.indexOf('</select>'));
  const options = [...select.matchAll(/<option>([^<]+)<\/option>/g)].map((m) => m[1]);
  eq(JSON.stringify(radios.slice().sort()), JSON.stringify([...WINGS].sort()), 'wings');
  eq(JSON.stringify(options.slice().sort()), JSON.stringify([...TIMELINES].sort()), 'timelines');
  if (!/name="website"[^>]*tabindex="-1"/.test(form)) throw new Error('the honeypot input (name="website", tabindex="-1") is missing from the form');
  for (const [field, max] of Object.entries(LIMITS)) {
    const tag = (form.match(new RegExp(`<(?:input|textarea)[^>]*name="${field}"[^>]*>`)) || [])[0] || '';
    eq((tag.match(/maxlength="(\d+)"/) || [])[1], String(max), `maxlength on ${field}`);
  }
});

console.log(`\n${failed ? 'Failed' : 'Passed'}: ${passed} passed, ${failed} failed.`);
process.exit(failed ? 1 : 0);
