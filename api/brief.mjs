// Vercel Function: POST /api/brief. Sends the brief from Start a project to the house inbox through Resend.
// Zero dependencies, Node 22 globals only. Nothing is stored and the brief is never logged.
// Environment (Production): RESEND_API_KEY (required), BRIEF_TO (default lastfomo@gmail.com),
// BRIEF_FROM (default Resend's test sender, which delivers only to the Resend account's own address).
// Without a key it answers 503, and the page falls back to its composed brief with copy and mailto.

// Must match the radios and the select in site/index.html (tools/brief.test.mjs checks).
export const WINGS = new Set(['Hortus, nature research', 'Machina, private AI', 'Arca, art and artifacts', 'Not sure yet']);
export const TIMELINES = new Set(['As soon as possible', 'In the next three months', 'This year', 'Just exploring']);
const EMAIL = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/;
const MAX_BODY = 20000; // bytes; a brief is a few kilobytes
const MIN_FILL = 3000; // ms the visitor spent on the form, measured in their own browser

const strip = (v) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
const line = (v, max) => strip(v).replace(/\s+/g, ' ').trim().slice(0, max); // one line: no CR/LF reaches a header
const text = (v, max) => strip(v).replace(/\r\n?/g, '\n').trim().slice(0, max);
const json = (body, status, headers = {}) => Response.json(body, { status, headers: { 'cache-control': 'no-store', ...headers } });

export async function handleBrief(request, { env = process.env, send = fetch } = {}) {
  if (request.method !== 'POST') return json({ ok: false }, 405, { allow: 'POST' });
  const origin = request.headers.get('origin');
  let sameOrigin = false;
  try { sameOrigin = !!origin && new URL(origin).host === new URL(request.url).host; } catch (_) { sameOrigin = false; }
  if (!sameOrigin) return json({ ok: false }, 403);
  if (Number(request.headers.get('content-length')) > MAX_BODY) return json({ ok: false }, 413);

  let raw;
  try { raw = await request.text(); } catch (_) { return json({ ok: false }, 400); }
  if (raw.length > MAX_BODY) return json({ ok: false }, 413);
  let f;
  try { f = JSON.parse(raw); } catch (_) { return json({ ok: false }, 400); }
  if (!f || typeof f !== 'object') return json({ ok: false }, 400);

  if (line(f.website, 200)) return json({ ok: true }, 200); // honeypot: a bot filled the hidden field; answer as if sent
  if (!(Number(f.elapsed) >= MIN_FILL)) return json({ ok: false }, 400); // filled faster than a person types

  const b = {
    wing: line(f.wing, 40), name: line(f.name, 120), email: line(f.email, 200),
    org: line(f.org, 160), timeline: line(f.timeline, 40), brief: text(f.brief, 5000),
  };
  if (!WINGS.has(b.wing) || !TIMELINES.has(b.timeline) || !b.name || !b.brief || !EMAIL.test(b.email)) {
    return json({ ok: false }, 422);
  }

  const key = env.RESEND_API_KEY;
  if (!key) return json({ ok: false, reason: 'not-configured' }, 503);

  const body = ['Wing: ' + b.wing, 'Name: ' + b.name, 'Email: ' + b.email, 'Organisation: ' + (b.org || 'not given'),
    'Timeline: ' + b.timeline, '', b.brief].join('\n');
  let res;
  try {
    res = await send('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: env.BRIEF_FROM || 'lastfomo <onboarding@resend.dev>',
        to: [env.BRIEF_TO || 'lastfomo@gmail.com'],
        reply_to: b.email,
        subject: 'Project brief: ' + b.wing + ', ' + b.name,
        text: body,
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error('brief: email API unreachable (' + (err && err.name) + ')');
    return json({ ok: false }, 502);
  }
  if (!res.ok) console.error('brief: email API answered ' + res.status); // the status only, never the brief
  return json({ ok: res.ok }, res.ok ? 200 : 502);
}

export default { fetch: (request) => handleBrief(request) };
