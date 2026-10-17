# Publishing

One source, two targets. Now the site lives as a claude.ai Artifact. Later it moves to its own domain on Vercel. This file is the plan for both, with the research behind each choice.

Research date: 17 October 2026. Every price below is as seen on that date. `vercel.com` itself was not reachable from the research session, so Vercel figures come from Vercel’s documentation index (the Vercel MCP search), from search results quoting Vercel’s pages, and from Vercel’s own source code on GitHub. Prices marked *reported* come from third parties. Confirm every price on the vendor’s page before paying.

`[DOMAIN]` stands for the house domain and `[YOUR EMAIL]` for the house address. Neither is decided yet.

## At a glance

| Question | Recommendation | Cost per month |
|---|---|---|
| Where the site lives now | The claude.ai Artifact built from `dist/artifact/lastfomo.html`, videos in its asset store | included in the owner’s claude.ai plan |
| Where it lives later | Vercel, plan **Pro** (the site is commercial), framework preset “Other”, `vercel.json` in this repo | $20 per seat (*reported*) |
| Where the six videos live later | **Vercel Blob**, one public store, versioned file names | $0 at launch scale; within the Pro allowance |
| How “Send the brief” works later | A zero-dependency Vercel Function that sends the brief by email through Resend; the copy and mailto fallback stays | $0 on Resend Free |
| Analytics | None at launch, or Vercel Web Analytics (cookieless). Never a third-party tracker. | $0 on Hobby; about $0.03 per 1,000 events on Pro |
| Fonts | Google Fonts at launch (the CSP allows only them); self-host them on the web build soon after | $0 |

## 1. Now: the Artifact

### What an Artifact gives us

- A page at `claude.ai/artifact/<id>`, private by default, shared by link.
- The page is a fragment. claude.ai wraps it in its own document skeleton, so our `<head>` tags do not become the document head.
- Scripts load only from cdnjs, jsDelivr, unpkg, the Tailwind CDN and code.jquery.com. Stylesheets load only from Google Fonts. Everything else is inline.
- 16 MB per page. Supporting files up to 15 MB each. An asset store for media, served at root-relative `/_blob/<id>` URLs, with a 20 MiB cap per video (the `assets` type definitions of the Artifact runtime, contract 0.2.84). The films (13 to 15 MB) fit the asset store; they sit at the edge of the 15 MB supporting-file limit, so the asset store is the right home.
- What it cannot do: `mailto:` links are unreliable inside the frame, forms cannot submit anywhere, there is no custom domain, no response headers of our own, no analytics, and no control over link previews.

The page already handles this. Routing uses hash routes, and plain anchors (`#machina`) also work, because an Artifact link passes only plain anchors (`site/main.js`, `route()`). The brief composer shows the brief with a copy button whenever there is no address, and opens the mail app only when one is set.

### Steps

1. Build and check: `node tools/build.mjs`. It fails on brand errors and prints the size of `dist/artifact/lastfomo.html` (about 1 MB today, the stills inlined as data URIs, far below 16 MB). Then `node tools/qa/shoot.mjs` and, after behaviour changes, `node tools/qa/smoke.mjs`.
2. Publish with the Artifact tool: `file_path` `dist/artifact/lastfomo.html`, `capabilities: {"assets": {}}` (the tool uploads media only to a page that declares `assets`), a one-word icon. Keep the returned URL.
3. Upload the six MP4s in one call: the same `url`, `asset: true`, `file_paths` with the three loops and three films. Each result returns an `id` and a `url` of the form `/_blob/<id>`.
4. Write those six URLs into the Artifact’s media manifest (see *Two manifests* below), rebuild, and republish to the same URL with the same `file_path`. Never publish to a new path: that creates a new link.
5. Share the link. Name the open items in the message: `[YOUR EMAIL]`, the unconfirmed wording, and the rights checks for the Frazetta painting and the museum photographs.

### The old Artifact

The original page (`https://claude.ai/artifact/Ckgt4AxvQpeKTKaPFByNMx`) still references its videos in its own asset store:

| Video | Old asset URL |
|---|---|
| Machina loop | `/_blob/bf7188baf3ac4918affb6ad7ee6ed1fc` |
| Hortus loop | `/_blob/1954fe12a4cbf1869bae56414182711a` |
| Arca loop | `/_blob/3e2177f1f4f9e95b1410697aa7f1fe3c` |
| Machina film | `/_blob/96a48013939984a66d40b8c0267746e8` |
| Hortus film | `/_blob/c4088dce44998cd1952520033d875a11` |
| Arca film | `/_blob/bb9879d9b46963c1d8dd66c01287d6c5` |

If the owner can open that Artifact as an editor, publishing the new build to it keeps the old link and the six videos without a re-upload: put these URLs in the Artifact manifest and publish with `url` set to the old Artifact. If not, step 2 above creates a new link and step 3 re-uploads the videos.

### Two manifests

`site/media.json` holds one URL per video today. The two targets need different ones: `/_blob/<id>` only resolves inside claude.ai, and a Vercel Blob URL is not guaranteed to load inside the Artifact frame. Proposal for the build (the orchestrator’s call, as `tools/build.mjs` and the contract are theirs): a value may be a string, used by both targets, or an object with one URL per target.

```json
{
  "loops": {
    "machina": {
      "artifact": "/_blob/bf7188baf3ac4918affb6ad7ee6ed1fc",
      "web": "https://<store>.public.blob.vercel-storage.com/video/machina-loop.v1.mp4"
    }
  }
}
```

## 2. Later: `dist/web` on Vercel

### Plan: Pro, not Hobby

Vercel’s fair use guidelines restrict Hobby to non-commercial personal use and count advertising a product or service as commercial ([fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines)). A page that asks for project briefs advertises the house’s services. Use **Pro** from the first deployment of this repo. Pro is $20 per seat per month with 1 TB of Fast Data Transfer included, as reported for spring 2026 ([makerkit summary](https://makerkit.dev/blog/saas/vercel-cost); confirm at [vercel.com/pricing](https://vercel.com/pricing)). Hobby includes 100 GB of Fast Data Transfer and 1 million function invocations ([limits](https://vercel.com/docs/limits)).

### Project settings

| Setting | Value | Where it is set |
|---|---|---|
| Framework Preset | Other | `vercel.json` → `"framework": null` (“To select ‘Other’ as the Framework Preset, use null”, [vercel.json reference](https://vercel.com/docs/project-configuration/vercel-json)) |
| Build Command | `node tools/build.mjs` | `vercel.json` → `buildCommand` |
| Output Directory | `dist/web` | `vercel.json` → `outputDirectory` |
| Install Command | none | the repo has no `package.json`, so nothing installs |
| Root Directory | the repo root | dashboard |
| Node.js Version | 22.x, as in `.github/workflows/brand.yml` | dashboard → Settings → Build and Deployment |
| Production Branch | `main` | dashboard → Settings → Git |

The build runs the brand check before it writes anything, so a brand error fails the Vercel build and no preview or production deployment ships an off-brand page. That is the same rail as the pre-commit hook and CI, now at the door.

### The proposed `vercel.json`

The file sits at the repo root. Nothing is deployed yet.

| Key | Value | Why |
|---|---|---|
| `$schema` | `https://openapi.vercel.sh/vercel.json` | editor validation; used in every example in the [vercel.json reference](https://vercel.com/docs/project-configuration/vercel-json) |
| `framework` | `null` | preset “Other”: no framework detection, no framework build |
| `buildCommand` | `node tools/build.mjs` | the one build, with the brand check |
| `outputDirectory` | `dist/web` | the static target from `docs/contract.md` |
| `cleanUrls` | `true` | `/index.html` and `/404.html` answer at `/` and `/404`; extension paths get a 308 ([cleanUrls](https://vercel.com/docs/project-configuration/vercel-json)) |
| `headers` | two rules | security headers on every path, a long cache on `/media/` |

**Validation.** The file is legal JSON. Every top-level key appears in the `VercelConfig` interface in Vercel’s own client ([`packages/client/src/types.ts`](https://github.com/vercel/vercel/blob/main/packages/client/src/types.ts)), with the declared types (`buildCommand`, `outputDirectory` and `framework` are `string | null`, `cleanUrls` is `boolean`), and `$schema` is the documented editor hint. The `headers` array matches `headersSchema` in [`packages/routing-utils/src/schemas.ts`](https://github.com/vercel/vercel/blob/main/packages/routing-utils/src/schemas.ts): each rule has only `source` and `headers` (the schema also allows `has` and `missing`), each header only `key` and `value`, all within the length limits (a header value may run to 32,768 characters; the CSP is 422). The CLI validates `vercel.json` with these same schemas ([`packages/cli/src/util/validate-config.ts`](https://github.com/vercel/vercel/blob/main/packages/cli/src/util/validate-config.ts)). The sources `/(.*)` and `/media/(.*)` use the pattern form shown in Vercel’s own header examples.

### Caching

- `/media/(.*)`: `public, max-age=31536000, immutable`. Stills and posters are a year in the browser.
- Everything else keeps Vercel’s default for static files. HTML, CSS and JS file names carry no hash, so they must revalidate.

A year-long immutable cache is only safe while a changed file gets a new URL. Two ways to hold that line:

1. **Recommended, a build change:** `tools/build.mjs` appends a short content hash to every media reference in `dist/web/index.html`, for example `media/machina-rig.jpg?v=3f2a1c`. The file name, the ledger entry and the source stay as they are.
2. **Without a build change:** never replace a file in `site/media/` in place. A new still gets a new name and a new ledger entry.

If neither holds, lower the media rule to `public, max-age=604800` (a week) before launch.

### Security headers

| Header | Value | Note |
|---|---|---|
| `Content-Security-Policy` | see below | mirrors the Artifact allowlist: own files, Google Fonts, nothing else |
| `Strict-Transport-Security` | `max-age=63072000` | two years; no `includeSubDomains` until every subdomain of `[DOMAIN]` is on HTTPS |
| `X-Content-Type-Options` | `nosniff` | |
| `X-Frame-Options` | `DENY` | for browsers that predate `frame-ancestors` |
| `Referrer-Policy` | `same-origin` | no referrer leaves for other hosts, Google Fonts included |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()` | the page uses none of these; fullscreen and autoplay keep their defaults |
| `Cross-Origin-Opener-Policy` | `same-origin` | |

The policy, one directive per line:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
style-src-elem 'self' https://fonts.googleapis.com;
style-src-attr 'unsafe-inline';
font-src https://fonts.gstatic.com;
img-src 'self';
media-src 'self' https://*.public.blob.vercel-storage.com;
connect-src 'self';
object-src 'none';
base-uri 'none';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests
```

- `script-src 'self'`: the web build keeps `boot.js` and `main.js` as files (“CSP-friendly: no inline script”, `tools/build.mjs`). The JSON manifest `<script type="application/json" id="lf-media">` is a data block, not a script, so the policy does not touch it. If the build ever inlines scripts into `dist/web` (as the contract’s wording suggests), add a `'sha256-…'` hash per inline script, computed by the build. Never add `'unsafe-inline'` to `script-src`.
- Styles: stylesheet elements may come only from our files and Google Fonts (`style-src-elem`). The markup uses `style="--d:.35s"` attributes for reveal delays, and those need `style-src-attr 'unsafe-inline'` ([CSP Level 3](https://www.w3.org/TR/CSP3/#directive-style-src-attr)). `style-src` repeats both for browsers without the split directives.
- `media-src` already allows Vercel Blob, so the videos can move there without a header change. Once the store exists, replace the wildcard with the store’s own host.
- `connect-src 'self'` covers the brief endpoint (`/api/brief`). Vercel Web Analytics loads its script from a path on the site’s own origin ([quickstart](https://vercel.com/docs/analytics/quickstart)); confirm on the first preview that its reports go there too, as the browser console names any host the policy blocks.
- The policy has to travel as a header: `frame-ancestors` is ignored in a `<meta>` policy ([CSP Level 3](https://www.w3.org/TR/CSP3/#meta-element)).

**Tested.** A local server served `site/` and `dist/web/` with exactly these headers, and Chromium walked every route, sent the brief through the composer and loaded all four brand fonts from Google Fonts. Zero CSP violations. Probes confirmed the policy bites: a video from a Blob host loaded, while an inline script, a foreign script, a foreign video and a foreign `fetch` were all blocked.

The Vercel Toolbar on preview deployments needs `vercel.live` in five directives ([toolbar and CSP](https://vercel.com/docs/vercel-toolbar/managing-toolbar)). This policy leaves it out, so the toolbar stays off on previews. Turn the toolbar off for the project rather than widen the policy.

### Preview deployments

- Connect the GitHub repository. Every push to `main` builds production; every push to another branch builds a preview with its own URL, and pull requests get a comment with the link ([deployments](https://vercel.com/docs/deployments)).
- Previews sit behind Vercel Authentication. Standard Protection covers preview and deployment URLs on every plan and leaves the production domain public ([deployment protection](https://vercel.com/docs/deployment-protection)). Check it is on under Settings → Deployment Protection after the import.
- Promote a tested preview with `vercel promote <url>`, or merge to `main`.

### Custom domain

1. Settings → Domains → add `[DOMAIN]` and `www.[DOMAIN]`. Redirect one to the other (apex as the canonical host is the usual choice).
2. At the registrar: an `A` record for the apex to `76.76.21.21`, and a `CNAME` for `www` to the target Vercel shows (the current docs example is `cname.vercel-dns-0.com`). Or move the nameservers to Vercel. Use the exact values `vercel domains inspect [DOMAIN]` prints ([set up a custom domain](https://vercel.com/docs/domains/set-up-custom-domain)).
3. Wait for verification. Vercel issues the certificate; `vercel certs ls` shows it.
4. If the brief is sent by email (section 4), add the sending records the email provider lists for its sending subdomain, plus a DMARC record.

### Alternatives

**Cloudflare Pages.** Strong and cheap. A free site holds 20,000 files of up to 25 MiB each, so even the films fit, and preview deployments are unlimited ([Pages limits](https://developers.cloudflare.com/pages/platform/limits/)). Headers go in a `_headers` file: at most 100 rules, 2,000 characters per line, which this CSP fits ([headers](https://developers.cloudflare.com/pages/configuration/headers/)). R2 stores video with no egress fee, at $0.015 per GB-month after 10 GB-month free ([R2 pricing](https://developers.cloudflare.com/r2/pricing/)), and Turnstile is free ([Turnstile plans](https://developers.cloudflare.com/turnstile/plans/)). Not first choice because the owner asked for Vercel, the Vercel tooling is already connected to this workspace, and at this traffic the Pro seat buys simplicity, not capacity. Better when traffic reaches terabytes, or when the seat fee matters more than one vendor for host, storage and functions.

**GitHub Pages.** Free and already next to the code. A published site may be at most 1 GB, with a soft limit of 100 GB of bandwidth a month and 10 builds an hour ([Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)). It sets no custom response headers, so no `frame-ancestors`, no HSTS of our own and no long media cache, and it runs no functions for the brief. Its policy also rules out running an online business on it, and a studio page that collects briefs sits close to that line. Better only as a holding page or a mirror.

## 3. Video hosting

### What the videos need

- **Loops** (three, 600 × 826, 25 fps, 5.12 s, 0.35 to 1.2 MB): plain MP4 in `<video muted playsinline loop preload="none">`, source set and `play()` called only when the screen is active (`site/main.js`, `activate()`). Muted and inline is what lets mobile browsers autoplay them. Adaptive streaming adds nothing at this size.
- **Films** (three, 1080p H.264, 36 to 40 s, 13 to 15 MB): the host must answer HTTP range requests, so the player can seek and start without downloading the whole file.
- **Both:** encode with the index at the front (`ffmpeg … -movflags +faststart`), so playback starts after the first bytes. Check it before upload.
- Total: about 49 MB of video, plus about 0.6 MB of stills that stay in the repo.

### Options

| Option | What it costs | For | Against |
|---|---|---|---|
| **In the git repo**, served from `dist/web/media/` | nothing extra; transfer counts against Fast Data Transfer | one deploy holds everything | each re-cut adds up to 15 MB to history for good. GitHub warns above 50 MiB per file, blocks above 100 MiB, and recommends repositories stay under 1 GB ([large files](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)). Range support for Vercel static files is not confirmed in Vercel’s docs; test it. |
| **Git LFS** | Vercel supports LFS for free, as a project setting; redeploy after enabling it ([git settings](https://vercel.com/docs/project-configuration/git-settings), [changelog](https://vercel.com/changelog/git-lfs-support)). GitHub Free and Pro include 10 GiB of LFS storage and 10 GiB of bandwidth a month, metered beyond ([LFS billing](https://docs.github.com/en/billing/concepts/product-billing/git-lfs), [quotas](https://github.com/github/docs/blob/main/data/variables/large_files.yml)) | history stays small | every build pulls about 49 MB from GitHub. Per-branch previews spend the 10 GiB in roughly 200 builds. Every clone needs `git-lfs`. |
| **Vercel Blob** | storage $0.023 per GB-month; transfer $0.05 per GB on Pro; Hobby includes 1 GB storage and 10 GB transfer, Pro 5 GB and 100 GB (current docs as quoted in search, [Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing)) | out of git and out of builds; public URLs; range requests documented ([examples](https://vercel.com/docs/vercel-blob/examples)); the CDN caches blobs up to 512 MB, for a month by default ([public storage](https://vercel.com/docs/vercel-blob/public-storage)); same vendor as the host, so no new party sees a visitor | one more store and a CLI step; the CSP lists its host |
| **A video platform** | Cloudflare Stream: $5 a month per 1,000 minutes stored (prepaid), $1 per 1,000 minutes delivered, encoding free ([Stream pricing](https://developers.cloudflare.com/stream/pricing/)). Mux: a free plan with up to 10 videos and 100,000 delivery minutes, then per-minute rates (*reported*, June 2026: [agentdeals](https://agentdeals.dev/vendor/mux); [Mux price drop](https://mux.com/blog/price-drop)) | adaptive bitrate for weak networks; posters and captions built in | HLS needs the platform’s player or a script in browsers without native HLS: a third party in the page, a wider CSP, and a player that may report viewing data. A minimum of $5 a month on Stream for about two minutes of video. Loops lose the simple MP4 path. |

**Recommendation: Vercel Blob.** Six files, 49 MB, short films. Blob keeps them out of the repository and out of every build, serves them with range requests from Vercel’s CDN, and costs nothing at launch: storage is about 0.05 GB, and Pro’s 100 GB of Blob transfer covers roughly 7,000 complete film plays a month (at about 14 MB a play) before $0.05 per GB applies. A video platform earns its place only if the films grow long or the audience watches on weak networks.

### Steps

1. Create a public store: `vercel blob create-store lastfomo-media --access public` ([Blob CLI](https://vercel.com/docs/cli/blob)).
2. Upload each file under a versioned name, so a re-cut never meets a stale cache:
   `vercel blob put machina-film.mp4 --pathname video/machina-film.v1.mp4 --access public --content-type video/mp4`.
   The default browser and CDN cache is 30 days (`--cache-control-max-age 2592000`); versioned names let a longer value be set safely.
3. Put the six URLs in the `web` side of the manifest, rebuild and deploy a preview.
4. On the preview: each loop autoplays muted on its screen on a phone; each film seeks; `curl -r 0-99 -I <film url>` answers `206 Partial Content`.
5. Replace `https://*.public.blob.vercel-storage.com` in the CSP with the store’s own host.

## 4. The contact form

### Options

| Option | For | Against |
|---|---|---|
| **A. A Vercel Function plus an email API** | our code, no stored submissions, no extra party in the browser | a small function to keep; an email provider sees the brief in transit |
| **B. A hosted form backend** | no code | the brief sits in a third party’s database and dashboard, often with its own script or redirect; at odds with “Private by architecture, not by policy.” |
| **C. Keep mailto and copy only** | nothing to run | depends on the visitor’s mail app; no confirmation of receipt |

**Recommendation: A**, with C kept as the fallback.

### How it works

- The web build marks the form with an endpoint (for example `data-endpoint="/api/brief"`); the Artifact build does not. `main.js` posts the brief as JSON when the attribute is there. On success it shows a sent state. On any failure, or when there is no endpoint, it shows today’s composed brief with the copy button and the mailto link. The sent-state wording is new copy and needs the owner’s approval in `ledger.json` → `approvedLines` first.
- `api/brief.mjs` at the repo root is a Vercel Function. Plain files in `/api` need no configuration and may export a web-standard `fetch` handler ([Node.js runtime](https://vercel.com/docs/functions/runtimes/node-js), [functions API](https://vercel.com/docs/functions/functions-api-reference)). Verify on the first preview that it deploys beside `dist/web` with the “Other” preset.
- It calls Resend’s REST API with `fetch`, so it has zero dependencies ([Resend OpenAPI](https://github.com/resend/resend-openapi): `POST https://api.resend.com/emails`, bearer key, `from`, `to`, `subject`, `text`, `reply_to`).
- Environment variables: `RESEND_API_KEY`, `BRIEF_TO` (`[YOUR EMAIL]`), `BRIEF_FROM` (for example `lastfomo <brief@send.[DOMAIN]>`). Set them for Production only; previews then fall back to copy, which keeps test briefs out of the house inbox.
- Request bodies are capped at 4.5 MB on Vercel Functions ([limitations](https://vercel.com/docs/functions/limitations)); a brief is a few kilobytes.

A sketch, syntax-checked and unit-tested against a mocked email API (send, honeypot, timing, validation, origin and method):

```js
// api/brief.mjs: a proposal, not shipped. Zero dependencies; Node 22 globals only.
const WINGS = new Set(['Machina, private AI', 'Hortus, nature research', 'Arca, art and collections', 'Not sure yet']);
const TIMELINES = new Set(['As soon as possible', 'In the next three months', 'This year', 'Just exploring']);
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max);
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export default {
  async fetch(request) {
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST' } });
    const origin = request.headers.get('origin');
    if (!origin || new URL(origin).host !== new URL(request.url).host) return new Response(null, { status: 403 });
    let f;
    try { f = await request.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
    if (clean(f.website, 200)) return Response.json({ ok: true });                // honeypot: answer as if sent
    if (!(Date.now() - Number(f.t) > 3000)) return Response.json({ ok: false }, { status: 400 }); // filled too fast
    const b = { wing: clean(f.wing, 40), name: clean(f.name, 120), email: clean(f.email, 200),
      org: clean(f.org, 160), timeline: clean(f.timeline, 40), brief: clean(f.brief, 5000) };
    if (!WINGS.has(b.wing) || !TIMELINES.has(b.timeline) || !b.name || !b.brief || !EMAIL.test(b.email)) {
      return Response.json({ ok: false }, { status: 422 });
    }
    const text = ['Wing: ' + b.wing, 'Name: ' + b.name, 'Email: ' + b.email, 'Organisation: ' + (b.org || 'not given'),
      'Timeline: ' + b.timeline, '', b.brief].join('\n');
    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ from: process.env.BRIEF_FROM, to: [process.env.BRIEF_TO], reply_to: b.email,
        subject: 'Project brief: ' + b.wing + ', ' + b.name, text }),
    });
    // Never log the brief itself: runtime logs are kept by the host.
    if (!sent.ok) console.error('brief: email API answered ' + sent.status);
    return Response.json({ ok: sent.ok }, { status: sent.ok ? 200 : 502 });
  },
};
```

The wing and timeline lists must match the form in `site/index.html`. The form adds two fields: a hidden `website` input (the honeypot: visually hidden, `tabindex="-1"`, `autocomplete="off"`, `aria-hidden="true"`) and `t`, the time the form was shown.

### Spam

In order, adding the next layer only when the last one is not enough:

1. The honeypot and the minimum fill time above, plus strict server-side validation and length caps.
2. A Vercel Firewall rate-limit rule on `/api/brief`, for example 5 requests per 10 minutes per IP. Fixed-window rate limiting is on every plan, and Hobby projects may have up to 3 custom rules ([rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)). It is set in the dashboard: no code, no dependency, nothing in the page.
3. Only if spam still arrives: Cloudflare Turnstile (free, [plans](https://developers.cloudflare.com/turnstile/plans/)) or Vercel BotID. Turnstile puts a third-party script in the page and widens `script-src`, `frame-src` and `connect-src`. BotID needs the `botid` npm package and a JavaScript submit, which the page already uses ([BotID and forms](https://vercel.com/docs/botid/form-submissions)). Both break the zero-dependency rule, so neither ships by default.

### Privacy

- No cookies, no storage: the function forwards the brief to one inbox and keeps nothing. It never logs the body.
- Resend Free covers 3,000 emails a month, at most 100 a day ([Resend pricing](https://resend.com/docs/knowledge-base/what-is-resend-pricing)). Choose the Ireland sending region (`eu-west-1`). Resend states that the region sets where mail is sent from, not where account data lives: logs and metadata stay in the United States ([regions](https://resend.com/docs/dashboard/domains/regions)).
- If the brief must stay in Europe, the same function can call an EU-hosted provider instead. Scaleway Transactional Email is one: 300 emails a month free, then €0.25 per 1,000, API at `api.scaleway.com` ([capabilities and limits](https://www.scaleway.com/en/docs/transactional-email/reference-content/tem-capabilities-and-limits/), reviewed by Scaleway in October 2024; confirm). Only the `fetch` call changes.
- A short privacy note next to the form (what is collected, who receives it, how long it is kept) is new copy for the owner to write and approve.

## 5. Launch checklist

### Content gates

- [ ] `[YOUR EMAIL]` replaced everywhere; `ledger.json` → `placeholders` emptied.
- [ ] Rights confirmed for the Frazetta painting and the museum photographs (the R12 warning lists them). A public domain is a wider audience than a shared link.
- [ ] Unconfirmed wording (`ledger.json` → `unconfirmed`) approved or replaced.
- [ ] `node tools/build.mjs` passes; `node tools/qa/shoot.mjs` and `node tools/qa/smoke.mjs` are clean on the preview build.

### Open Graph and X

In the head of the web build only (the Artifact cannot use them):

```html
<link rel="canonical" href="https://[DOMAIN]/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="lastfomo">
<meta property="og:title" content="lastfomo research house">
<meta property="og:description" content="A research house with three wings: nature, intelligence, and the objects worth keeping.">
<meta property="og:url" content="https://[DOMAIN]/">
<meta property="og:image" content="https://[DOMAIN]/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="The lastfomo horse in three arches: hortus, machina, arca.">
<meta name="twitter:card" content="summary_large_image">
```

Image URLs must be absolute ([Open Graph protocol](https://ogp.me/)). X reads `og:` tags and shows `summary_large_image` at 2:1, from 300 × 157 up to 4096 × 4096, under 5 MB, JPG, PNG, WEBP or GIF, never SVG ([summary card with large image](https://dev.twitter.com/cards/types/summary-large-image), archived developer page).

**The image** (`og.jpg`, 1200 × 630, under 200 KB):

- A house-level composition, so the trio is allowed: three arches on void, left to right hortus, machina, arca, each holding the stipple horse whole with clear margins on every side.
- Arches drawn with the same holder shape as the page; the horse from `brand/marks/horse.svg` unchanged.
- At most the wordmark `lastfomo` in Jacquard 24. No line, no button.
- Everything inside the middle 1200 × 600 band with air above and below, so a 2:1 crop never touches a horse.
- Built by script from the marks and checked at 600 × 315, the size a feed shows.

### Icons

- `favicon.svg`: a void square with the paper horse whole and centred at about 80% of the width. The horse is 420 × 120, so it reads small at 16 and 32 pixels. Check it at those sizes. If it does not read, ask the owner about a glyph from `brand/marks/glyphs.svg`. Never crop the horse to fill the square.
- `favicon.ico` or a 32 × 32 PNG for browsers without SVG icons.
- `apple-touch-icon.png`, 180 × 180, the same composition on a solid void background, the horse inside the central 80% so rounded corners never reach it.
- Colours come from `brand/tokens.json` (void `#080808`, paper `#ffffff`), written by the build, not by hand.

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

### robots.txt and sitemap

```
User-agent: *
Allow: /
Sitemap: https://[DOMAIN]/sitemap.xml
```

The sitemap lists one URL, `https://[DOMAIN]/` ([sitemap protocol](https://www.sitemaps.org/protocol.html)). Hash routes are not separate pages to a search engine: Google asks single-page sites to use the History API rather than fragments for content that should be indexed ([JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)). If the case pages should rank on their own later, the web build can move to real paths (`/machina`) with a rewrite to `index.html` in `vercel.json`, while the Artifact keeps hash routes. Not needed for launch. Whether to admit AI crawlers is the owner’s call.

### 404 and hash routes

No rewrites are needed. The fragment never reaches the server: it is “dereferenced solely by the user agent” ([RFC 3986, section 3.5](https://www.rfc-editor.org/rfc/rfc3986#section-3.5)), so `/#/machina` is a request for `/`, and `main.js` falls back to home for any unknown hash. Stray paths such as `/old-page` get Vercel’s platform 404 unless `dist/web/404.html` exists; Vercel serves that file for unmatched paths on a static site ([custom 404 page](https://vercel.com/kb/guide/custom-404-page)). Recommended: a one-screen 404 built from the same source, the horse whole on a plate, one button, “Back to the house”.

### Analytics

Vercel Web Analytics uses no cookies. It identifies a visitor by a hash of the incoming request that is valid for one day, so a visitor cannot be followed across days or across sites ([Web Analytics](https://vercel.com/docs/analytics), [privacy and compliance](https://vercel.com/docs/analytics/privacy-policy)). Vercel already serves every request, so it adds no new party. Verified, with one caveat: the plain-HTML install has no route support ([quickstart](https://vercel.com/docs/analytics/quickstart)), so whether `#/machina` counts as its own page view must be tested on a preview.

- Install: `vercel project web-analytics enable`, then one tag, `<script defer src="/<unique-path>/script.js"></script>`, with the path the dashboard gives. The docs’ inline `window.va` stub is only needed for custom events; if it is ever used, it goes in `boot.js`, never inline, so `script-src 'self'` holds.
- Cost: Hobby collects 50,000 events a month and has no custom events. Pro bills $0.03 per 1,000 events and adds custom events, which could record each route change from `main.js` ([limits and pricing](https://vercel.com/docs/analytics/limits-and-pricing), current docs as quoted in search).
- Launching without analytics is also on brand. Add them when there is a question they answer.

### Performance budget

| Item | Budget | Today |
|---|---|---|
| HTML + CSS + JS, uncompressed | 150 KB | about 89 KB (`index.html` 42.8, `main.js` 22.0, `styles.css` 21.6, `tokens.css` 2.1, `boot.js` 0.4) |
| A still or poster | 80 KB | largest 76.5 KB (`hortus-loop.jpg`) |
| A loop | 1.2 MB | 0.35 to 1.2 MB |
| Video loaded on first paint | none | none: `preload="none"`, source set on the active screen |
| Fonts | `display=swap`; preconnect to both Google origins | both in place |
| Core Web Vitals at the 75th percentile | LCP 2.5 s or less, INP 200 ms or less, CLS 0.1 or less ([Web Vitals](https://web.dev/articles/vitals)) | measure on the preview |

- Add `loading="lazy" decoding="async"` to the stills on case pages; none of them is on the first screen.
- Do not preload Google-hosted fonts: their file URLs vary by browser. Preconnect is the right tool, and the page has it ([font best practices](https://web.dev/articles/font-best-practices)).

### Fonts and privacy

Google Fonts is the only third party the web build contacts. Each visit sends the visitor’s IP address to Google. A Munich court held in January 2022 that embedding Google Fonts this way without consent breached the GDPR (LG München I, 3 O 17493/20; [summary](https://www.activemind.legal/guides/ruling-google-fonts/)). Soon after launch, self-host the three families on the web build:

- Geist and Geist Mono from the `geist` npm package, Jacquard 24 from `google/fonts` (all three under the SIL Open Font License; ship the licence text with them).
- woff2 files under `site/fonts/`, `@font-face` rules with `font-display: swap`, a preload for Geist Light (300) and Jacquard 24 only.
- Then tighten the policy: `font-src 'self'`, and drop `https://fonts.googleapis.com` from `style-src` and `style-src-elem`.

The Artifact keeps Google Fonts, the one stylesheet host its sandbox allows.

## 6. Decisions waiting

For the owner:

- `[DOMAIN]` and `[YOUR EMAIL]`.
- Vercel Pro (recommended) and who holds the seat.
- Analytics at launch or not.
- Resend (US data) or an EU-hosted email provider.
- The sent-state line and the privacy note for the brief.
- Rights for the Frazetta painting and the museum photographs before the public launch.

For the orchestrator (they own `tools/build.mjs`, `site/` and the contract):

- Two manifests: per-target video URLs in `site/media.json`.
- A content hash on media references in `dist/web`, or the rename rule, so the year-long media cache stays safe.
- Keep `dist/web` free of inline scripts, or emit CSP hashes; the contract says “inline CSS and JS”, the build writes files.
- Web-only head tags (canonical, Open Graph, icons), `robots.txt`, `sitemap.xml`, `404.html`, `og.jpg` and the icons in `dist/web`.
- The `data-endpoint` attribute, the honeypot and the `t` field on the form, and the fetch path in `main.js`.
- Self-hosted fonts for the web build.

## Sources

Vercel: [vercel.json reference](https://vercel.com/docs/project-configuration/vercel-json) · [fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines) · [limits](https://vercel.com/docs/limits) · [pricing](https://vercel.com/pricing) · [cache-control headers](https://vercel.com/docs/caching/cache-control-headers) · [deployments](https://vercel.com/docs/deployments) · [deployment protection](https://vercel.com/docs/deployment-protection) · [custom domain](https://vercel.com/docs/domains/set-up-custom-domain) · [toolbar and CSP](https://vercel.com/docs/vercel-toolbar/managing-toolbar) · [git settings and LFS](https://vercel.com/docs/project-configuration/git-settings) · [LFS changelog](https://vercel.com/changelog/git-lfs-support) · [Blob](https://vercel.com/docs/vercel-blob) · [Blob public storage](https://vercel.com/docs/vercel-blob/public-storage) · [Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing) · [Blob examples](https://vercel.com/docs/vercel-blob/examples) · [Blob CLI](https://vercel.com/docs/cli/blob) · [Node.js runtime](https://vercel.com/docs/functions/runtimes/node-js) · [functions API](https://vercel.com/docs/functions/functions-api-reference) · [function limitations](https://vercel.com/docs/functions/limitations) · [rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting) · [BotID and forms](https://vercel.com/docs/botid/form-submissions) · [Web Analytics](https://vercel.com/docs/analytics) · [analytics privacy](https://vercel.com/docs/analytics/privacy-policy) · [analytics quickstart](https://vercel.com/docs/analytics/quickstart) · [analytics pricing](https://vercel.com/docs/analytics/limits-and-pricing) · [custom 404 page](https://vercel.com/kb/guide/custom-404-page)

Vercel source: [`client/src/types.ts`](https://github.com/vercel/vercel/blob/main/packages/client/src/types.ts) · [`routing-utils/src/schemas.ts`](https://github.com/vercel/vercel/blob/main/packages/routing-utils/src/schemas.ts) · [`cli/src/util/validate-config.ts`](https://github.com/vercel/vercel/blob/main/packages/cli/src/util/validate-config.ts)

GitHub: [large files](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github) · [LFS billing](https://docs.github.com/en/billing/concepts/product-billing/git-lfs) · [LFS quotas](https://github.com/github/docs/blob/main/data/variables/large_files.yml) · [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

Cloudflare: [Pages limits](https://developers.cloudflare.com/pages/platform/limits/) · [Pages headers](https://developers.cloudflare.com/pages/configuration/headers/) · [R2 pricing](https://developers.cloudflare.com/r2/pricing/) · [Stream pricing](https://developers.cloudflare.com/stream/pricing/) · [Turnstile plans](https://developers.cloudflare.com/turnstile/plans/)

Email: [Resend pricing](https://resend.com/docs/knowledge-base/what-is-resend-pricing) · [Resend regions](https://resend.com/docs/dashboard/domains/regions) · [Resend OpenAPI](https://github.com/resend/resend-openapi) · [Scaleway TEM limits](https://www.scaleway.com/en/docs/transactional-email/reference-content/tem-capabilities-and-limits/)

Video platforms: [Cloudflare Stream pricing](https://developers.cloudflare.com/stream/pricing/) · [Mux price drop](https://mux.com/blog/price-drop) · [Mux plans (reported)](https://agentdeals.dev/vendor/mux)

Web standards and search: [CSP Level 3](https://www.w3.org/TR/CSP3/) · [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986#section-3.5) · [Open Graph](https://ogp.me/) · [X summary card (archived)](https://dev.twitter.com/cards/types/summary-large-image) · [sitemap protocol](https://www.sitemaps.org/protocol.html) · [Google JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) · [Web Vitals](https://web.dev/articles/vitals) · [font best practices](https://web.dev/articles/font-best-practices) · [Google Fonts ruling summary](https://www.activemind.legal/guides/ruling-google-fonts/) · [Vercel pricing summary (reported)](https://makerkit.dev/blog/saas/vercel-cost)
