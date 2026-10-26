# Publishing

One source, two targets. Now the site lives as a claude.ai Artifact. Later it moves to its own domain on Vercel. This file is the plan for both, with the research behind each choice.

Research date: 17 October 2026. Every price below is as seen on that date. `vercel.com` itself was not reachable from the research session, so Vercel figures come from Vercel’s documentation index (the Vercel MCP search), from search results quoting Vercel’s pages, and from Vercel’s own source code on GitHub. Prices marked *reported* come from third parties. Confirm every price on the vendor’s page before paying.

`[DOMAIN]` stands for the house domain, not decided yet. The house address is lastfomo@gmail.com.

## At a glance

| Question | Recommendation | Cost per month |
|---|---|---|
| Where the site lives now | **https://lastfomo.vercel.app**, built by Vercel from this repo on every push (see “The live project”), and the claude.ai Artifact built from `dist/artifact/lastfomo.html` | Hobby today; the Artifact is included in the owner’s claude.ai plan |
| Where it lives at launch | Vercel, plan **Pro** (the site is commercial), on the house domain | $20 per seat (*reported*) |
| Where the videos live | Loops: small MP4 and WebM files in `site/media/`, as the build already does. Films: YouTube now (links in the Artifact, a privacy-enhanced embed on click in the web build); **Vercel Blob** if the films should leave YouTube | $0 at launch scale; Blob within the Pro allowance |
| How “Send the brief” works later | A zero-dependency Vercel Function that sends the brief by email through Resend; the copy and mailto fallback stays | $0 on Resend Free |
| Analytics | None at launch, or Vercel Web Analytics (cookieless). Never a third-party tracker. | $0 on Hobby; about $0.03 per 1,000 events on Pro |
| Fonts | Google Fonts at launch (the CSP allows only them); self-host them on the web build soon after | $0 |

## 1. Now: the Artifact

### What an Artifact gives us

- A page at `claude.ai/artifact/<id>`, private by default, shared by link.
- The page is a fragment. claude.ai wraps it in its own document skeleton, so our `<head>` tags do not become the document head.
- Scripts load only from cdnjs, jsDelivr, unpkg, the Tailwind CDN and code.jquery.com. Stylesheets load only from Google Fonts. Everything else is inline.
- 16 MB per page. Supporting files up to 15 MB each. An asset store for media, served at root-relative `/_blob/<id>` URLs, with a 20 MiB cap per video (the `assets` type definitions of the Artifact runtime, contract 0.2.84).
- What it cannot do: `mailto:` links are unreliable inside the frame, forms cannot submit anywhere, other sites cannot be embedded, there is no custom domain, no response headers of our own, no analytics, and no control over link previews.

The page and the build already handle this:

- Routing uses hash routes, and plain anchors (`#machina`) also work, because an Artifact link passes only plain anchors (`site/main.js`, `route()`).
- The build inlines the loops into the Artifact as data URIs, both formats of each (MP4 and WebM, so they play in browsers built without H.264). No upload. With all three loops that is about 4.7 MB of the page (Arca 153 + 44 KB, Machina 886 + 740 KB, Hortus 1,110 + 691 KB, a third more as base64), and it arrives with the page, where the web build loads each loop only when its screen is active. If the Artifact must get lighter, move the loops to its asset store (as for the films) and reference them by URL.
- The films are on YouTube. In the Artifact every play control is a plain link that opens YouTube in a new tab; the web build plays the same film in place (`site/media.json` → `films`, `embed: false` for the Artifact).
- The brief composer shows the brief with a copy button whenever there is no address, and opens the mail app only when one is set.

### Steps

1. Build and check: `node tools/build.mjs`. It fails on brand errors and prints the size of `dist/artifact/lastfomo.html` (about 10.9 MB on 26 October 2026: the page and its stills, each shared photo once, 4.7 MB of inlined loops and the cover footage’s H.264 copies; the limit is 16 MB). Then `node tools/qa/shoot.mjs` and, after behaviour changes, `node tools/qa/smoke.mjs`.
2. Publish with the Artifact tool: `file_path` `dist/artifact/lastfomo.html` and a one-word icon. Keep the returned URL.
3. For every later change, rebuild and republish with the same `file_path`, which keeps the same URL. A new path creates a new link.
4. Share the link. Name the open items in the message: any loop still missing (the build names them; their posters stand in), the unconfirmed wording.

### If the films should play inside the Artifact

The Artifact cannot embed YouTube, but it can play its own files. Declare `capabilities: {"assets": {}}` on the publish (the tool uploads media only to a page that declares `assets`), upload the three film MP4s with `asset: true` and `file_paths`, and the results give `/_blob/<id>` URLs. Each film (13 to 15 MB) fits the 20 MiB asset cap; it sits at the edge of the 15 MB supporting-file limit, so the asset store is the right home. The build would then need an Artifact-only film URL beside the YouTube id, for example `"machina": { "youtube": "hWzvRWBzQFQ", "duration": "0:40", "artifact": "/_blob/<id>" }`. That is the orchestrator’s call: `tools/build.mjs` and the contract are theirs.

The original page (`https://claude.ai/artifact/Ckgt4AxvQpeKTKaPFByNMx`) still references all six videos in its own asset store:

| Video | Old asset URL |
|---|---|
| Machina loop | `/_blob/bf7188baf3ac4918affb6ad7ee6ed1fc` |
| Hortus loop | `/_blob/1954fe12a4cbf1869bae56414182711a` |
| Arca loop | `/_blob/3e2177f1f4f9e95b1410697aa7f1fe3c` |
| Machina film | `/_blob/96a48013939984a66d40b8c0267746e8` |
| Hortus film | `/_blob/c4088dce44998cd1952520033d875a11` |
| Arca film | `/_blob/bb9879d9b46963c1d8dd66c01287d6c5` |

If the owner can open that Artifact as an editor, publishing the new build to it (`url` set to the old Artifact) keeps the old link, and those URLs keep working there without a re-upload. They resolve only inside that one Artifact.

## 2. `dist/web` on Vercel

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
| Production Branch | the repo’s default branch, today `claude/great-hamilton-2sna3z` (the only branch); `main` once it exists | Vercel takes the default branch at import; change it under dashboard → Settings → Git |

The build runs the brand check before it writes anything, so a brand error fails the Vercel build and no preview or production deployment ships an off-brand page. That is the same rail as the pre-commit hook and CI, now at the door.

### The live project

Live since 18 October 2026 at **https://lastfomo.vercel.app**.

| Item | Value |
|---|---|
| Account | `ifyoufeel`, plan Hobby, team “AAA” (`team_j3ojVdoC9TpjZyNBYPIp0MUA`) |
| Project | `lastfomo` (`prj_IEqPNaVDoC1R1lJD4VmLKX6N38Ty`) |
| Repository | `ifyoufeel/lf`, connected through the Vercel GitHub app |
| Production branch | the repo’s default branch, today `claude/great-hamilton-2sna3z` (its only branch) |
| Build | `node tools/build.mjs` → `dist/web`, from `vercel.json`; Node 22.x set on the project |
| Production addresses | `lastfomo.vercel.app` and `lastfomo-aaa-d3d3.vercel.app`, public |
| Deployment Protection | Vercel Authentication on previews and on each deployment’s own URL (`prod_deployment_urls_and_all_previews`); the production addresses stay public |
| Firewall | no custom rules |

Every push builds. A push to the production branch updates the live address; a push to any other branch gets its own preview URL behind the Vercel login. A brand error fails the build, so an off-brand page never ships.

**Checked on 18 October 2026**, from a Vercel sandbox outside the project (the session container cannot reach `*.vercel.app`):

- `/` answers 200 without a login; a deployment’s own URL answers 302 to the Vercel login.
- All 22 files of `dist/web` are byte-identical to a fresh build of the same commit (`/index.html` answers 308 to `/`, as `cleanUrls` intends, and `/` matches it).
- Every header in `vercel.json` arrives: the CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, and the year-long immutable cache on `/media/`.
- `www.youtube-nocookie.com/embed/…` answers 200, and YouTube’s oEmbed resolves all three film ids to the lastfomo channel.

**Checked on 19 October 2026**, after the loops, the horse-only header and the brief function went live (commit `dbe91b0`): the page and all 21 fingerprinted media URLs are byte-identical to a fresh build, and `/api/brief` is deployed beside `dist/web` with the “Other” preset. It answers GET with 405, a post from another origin with 403, and a valid same-origin brief with 503 `{"ok":false,"reason":"not-configured"}` until `RESEND_API_KEY` is set. No email was sent. The Vercel Firewall API answered “config not found” to a rate-limit rule (with and without the team id), so the rule in “Spam” below is still a dashboard step.

**For later sessions.**

- The Vercel connector in Claude works in its own default scope: leave `teamId` out of project and deployment calls. With the team id set, creating a project answered 403 and reading one answered 404.
- Check the live site with a handful of requests, never a crawl. A burst of requests for paths that do not exist made Vercel’s automatic bot protection answer one sandbox address with its Security Checkpoint (403, `x-vercel-mitigated: challenge`). Browsers pass that checkpoint on their own; scripts do not.
- The connector reads and writes the project, its deployments and its sandboxes. The Hobby plan includes some sandbox time; stop a sandbox when the check is done.

The account is on Hobby today. Move to Pro before the house domain goes live (see above).

### The proposed `vercel.json`

The file sits at the repo root, and the live project builds with it.

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

A year-long immutable cache is only safe while a changed file gets a new URL. Since 19 October 2026 `tools/build.mjs` holds that line: every media reference in `dist/web/index.html` (stills, posters and the loops in the manifest) carries a short content hash, for example `media/machina-loop.jpg?v=37ae69f546`, and the build fails if one is missing. The file name, the ledger entry and the source stay as they are, so a file may be replaced in `site/media/` in place. (The Machina and Hortus posters were, that day; the hash is what keeps visitors from seeing the old ones.)

### Security headers

| Header | Value | Note |
|---|---|---|
| `Content-Security-Policy` | see below | mirrors the Artifact allowlist (own files, Google Fonts), plus the YouTube privacy-enhanced player for the films |
| `Strict-Transport-Security` | `max-age=63072000` | two years; no `includeSubDomains` until every subdomain of `[DOMAIN]` is on HTTPS |
| `X-Content-Type-Options` | `nosniff` | |
| `X-Frame-Options` | `DENY` | for browsers that predate `frame-ancestors` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | other hosts see the origin, never the path. Stricter values break the films: YouTube’s embedded player refuses to play without a referrer and shows “Error 153” ([Simon Willison, December 2025](https://simonwillison.net/2025/Dec/1/youtube-embed-153-error/)) |
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
media-src 'self';
frame-src https://www.youtube-nocookie.com;
connect-src 'self';
object-src 'none';
base-uri 'none';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests
```

- `script-src 'self'`: the web build keeps `boot.js`, `explore.js` and `main.js` as files (“CSP-friendly: no inline script”, `tools/build.mjs`), and serves the walk’s three.js from `vendor/three.min.js` rather than a CDN, so the policy needs no third-party host. The walk draws its grain and textures on canvases and reads its images from `media/`, so `img-src 'self'` holds too. `Permissions-Policy` leaves the motion sensors alone, which is what lets the walk turn with the visitor’s phone. The JSON manifest `<script type="application/json" id="lf-media">` is a data block, not a script, so the policy does not touch it. If the build ever inlines scripts into `dist/web` (as the contract’s wording suggests), add a `'sha256-…'` hash per inline script, computed by the build. Never add `'unsafe-inline'` to `script-src`.
- Styles: stylesheet elements may come only from our files and Google Fonts (`style-src-elem`). The markup uses `style="--d:.35s"` attributes for reveal delays, and those need `style-src-attr 'unsafe-inline'` ([CSP Level 3](https://www.w3.org/TR/CSP3/#directive-style-src-attr)). `style-src` repeats both for browsers without the split directives.
- `media-src 'self'`: the loops are files in `media/`. If the films move to Vercel Blob (section 3), add the store’s own host here, for example `https://<store>.public.blob.vercel-storage.com`.
- `frame-src https://www.youtube-nocookie.com`: the only frame the page may hold is the YouTube privacy-enhanced player, created when a visitor presses play (`site/main.js`, `filmFrame()`). `www.youtube.com` frames stay blocked. Links that open YouTube in a new tab are navigation and need nothing here. Drop the line if the films leave YouTube.
- `connect-src 'self'` covers the brief endpoint (`/api/brief`). Vercel Web Analytics loads its script from a path on the site’s own origin ([quickstart](https://vercel.com/docs/analytics/quickstart)); confirm on the first preview that its reports go there too, as the browser console names any host the policy blocks.
- The policy has to travel as a header: `frame-ancestors` is ignored in a `<meta>` policy ([CSP Level 3](https://www.w3.org/TR/CSP3/#meta-element)).

**Tested.** A local server served the page with exactly these headers, and Chromium walked every route, loaded all four brand fonts from Google Fonts, sent the brief through the composer, played the Arca loop from `media/`, and opened a film both in the player dialog and in place on a case page. Zero CSP violations, and each YouTube request carried a referrer. Probes confirmed the policy bites: an inline script, a foreign script, a foreign video, a foreign `fetch` and a `www.youtube.com` frame were all blocked.

The Vercel Toolbar on preview deployments needs `vercel.live` in five directives ([toolbar and CSP](https://vercel.com/docs/vercel-toolbar/managing-toolbar)). This policy leaves it out, so the toolbar stays off on previews. Turn the toolbar off for the project rather than widen the policy.

### Preview deployments

- Connect the GitHub repository (steps above). Every push to the production branch builds production; every push to another branch builds a preview with its own URL, and pull requests get a comment with the link ([deployments](https://vercel.com/docs/deployments)).
- Previews sit behind Vercel Authentication. Standard Protection covers preview and deployment URLs on every plan and leaves the production domain public ([deployment protection](https://vercel.com/docs/deployment-protection)). Check it is on under Settings → Deployment Protection after the import.
- Promote a tested preview with `vercel promote <url>`, or merge into the production branch.

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

- The web build gives the page an endpoint (`brief: "/api/brief"` in its manifest); the Artifact build does not. `main.js` posts the brief as JSON when the endpoint is there. On success it shows a sent state. On any failure, or when there is no endpoint, it shows the composed brief with the copy button and the mailto link. The sent-state wording is new copy, shipped as suggested wording (`ledger.json` → `unconfirmed`) until the owner approves it into `approvedLines`.
- `api/brief.mjs` at the repo root is a Vercel Function. Plain files in `/api` need no configuration and may export a web-standard `fetch` handler ([Node.js runtime](https://vercel.com/docs/functions/runtimes/node-js), [functions API](https://vercel.com/docs/functions/functions-api-reference)). Verify on the first preview that it deploys beside `dist/web` with the “Other” preset.
- It calls Resend’s REST API with `fetch`, so it has zero dependencies ([Resend OpenAPI](https://github.com/resend/resend-openapi): `POST https://api.resend.com/emails`, bearer key, `from`, `to`, `subject`, `text`, `reply_to`).
- Environment variables: `RESEND_API_KEY`, `BRIEF_TO` (`lastfomo@gmail.com`), `BRIEF_FROM` (for example `lastfomo <brief@send.[DOMAIN]>`). Set them for Production only; previews then fall back to copy, which keeps test briefs out of the house inbox.
- Request bodies are capped at 4.5 MB on Vercel Functions ([limitations](https://vercel.com/docs/functions/limitations)); a brief is a few kilobytes.

Shipped on 19 October 2026 as `api/brief.mjs`, with `node tools/brief.test.mjs` (13 tests, the email API mocked) in CI. It follows the plan above with these choices:

- The browser sends `elapsed`, the time spent on the form measured on its own clock, instead of a timestamp, so a visitor whose clock runs fast is not refused. The function refuses anything under 3 s.
- `BRIEF_TO` defaults to lastfomo@gmail.com and `BRIEF_FROM` to Resend’s test sender, `onboarding@resend.dev`, which delivers only to the address of the Resend account itself. So the one setting the owner must add is `RESEND_API_KEY`, from a Resend account opened with lastfomo@gmail.com. A verified sending domain (`BRIEF_FROM`) can wait for the house domain.
- Without the key the function answers 503, and the page shows the composed brief with copy and the mail link, exactly as before.
- The page shows “Sending…” on the button, then “Brief sent.” once the function confirms. These are suggested wording (`ledger.json` → `unconfirmed`).
- The function also caps the body at 20 kB, collapses every single-line field so no line break reaches the subject, and answers with `cache-control: no-store`.

**Owner’s step, once:** open a free account at [resend.com](https://resend.com) with lastfomo@gmail.com, create an API key (sending access is enough), and add it in Vercel → project `lastfomo` → Settings → Environment Variables as `RESEND_API_KEY`, for Production. Then redeploy (or push any commit). Nobody else needs to see the key.

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

- [x] Contact address set: lastfomo@gmail.com.
- [x] Rights: every image and film is the owner’s.
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
| HTML + CSS + JS, uncompressed | 150 KB | about 93 KB (`index.html` 39.7, `main.js` 27.7, `styles.css` 22.9, `tokens.css` 2.0, `boot.js` 0.4) |
| A still or poster | 80 KB | largest 59 KB (`hortus-plants.jpg`) |
| A loop | 1.2 MB | 44 KB to 1.1 MB (largest: `hortus-loop.mp4`, 1,110 KB) |
| Video loaded on first paint | none | web: none (`preload="none"`, source set on the active screen); the Artifact carries its loops inline |
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

- `[DOMAIN]`.
- Vercel Pro (recommended) and who holds the seat.
- Analytics at launch or not.
- Resend (US data) or an EU-hosted email provider.
- The sent-state line and the privacy note for the brief.

For the orchestrator (they own `tools/build.mjs`, `site/` and the contract):

- Two manifests: per-target video URLs in `site/media.json`.
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
