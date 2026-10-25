# Source contract

How the lastfomo site is laid out, so every tool (and every future session) agrees on it.

## Files

| Path | Role | Edited by |
|---|---|---|
| `brand/tokens.json` | Colours, themes, wing modes, type, motion, layout. Single source of truth. | hand |
| `brand/ledger.json` | Facts, approved lines, banned phrases, British spelling, placeholders, media rights. | hand, owner-approved |
| `brand/marks/*.svg` | Exact Figma vectors: horse (Logo/Mark 9:3), wordmark (9:5), lockup (9:7), glyphs. | never by hand |
| `site/index.html` | The page: a full HTML document with hash routes `#/`, `#/machina`, `#/hortus`, `#/arca`, `#/start`, and the walk at `#/explore` and `#/explore/<wing>`. | hand |
| `site/tokens.css` | Generated from `brand/tokens.json` by `tools/build.mjs`. | generated |
| `site/styles.css` | Component styles. Colours only through `var(--token)`; no hex, rgb or named colours. | hand |
| `site/boot.js` | Runs in `<head>` before first paint: adds the `js` class that gates reveals, restores the saved theme. | hand |
| `site/main.js` | Behaviour: plates, reveals, routing, header trail, curtain, player and film picker, cursor, brief composer, theme switch. Owns the walk’s routes and calls `window.lfExplore` (`enter`, `leave`). | hand |
| `site/explore.js` | The walk: the house and its three wings in 3D, in the spirit of PolyFauna. Worlds, signals and their panels, the score (Web Audio, generated live), auto walk, the round walk button, look by drag or by the phone’s motion, the settings. Loads three.js only when the walk first opens. Colours come from the tokens; the brand check reads it like `main.js`. | hand |
| `site/vendor/three.min.js` | three.js r128 (MIT), byte for byte npm’s `three@0.128.0` `build/three.min.js`, which is also cdnjs’s r128. The web build serves it (`script-src 'self'`); the Artifact loads the cdnjs copy pinned to this file’s sha512. Never edited; not brand-checked. | never by hand |
| `api/brief.mjs` | Vercel Function `POST /api/brief`: checks the brief (same origin, honeypot, at least 3 s on the form, the form’s own wing and timeline values, length caps) and emails it to `BRIEF_TO` (default lastfomo@gmail.com) through Resend with `RESEND_API_KEY`. Answers 503 without a key. Stores and logs nothing of the brief. | hand |
| `site/media.json` | Video manifest. `loops`: per wing `{ "mp4", "webm", "hold" }` made by `tools/media/gif_to_loop.py`, or `null` to keep the poster. A loop plays once each time its screen becomes active and rests on `hold` seconds (Arca: 3.6, its open frame), so nothing moves for more than 5 s on its own (WCAG 2.2.2). `covers`: per wing `{ "av1", "mp4" }`, the case cover footage: the owner’s AV1 file as supplied (2560×1440) and an H.264 copy (1280×720), each under 1.2 MB, poster `media/<wing>-cover.jpg` (first frame). Wide screens that decode AV1 take it; phones and everything else take the H.264 copy; a browser that decodes neither keeps the poster. The Artifact carries the H.264 copy only. `films`: per wing `{ "youtube": "<id>", "duration": "m:ss" }`. The build adds `embed` (true for web, false for the Artifact) and, on the web build only, `brief` (`/api/brief`, where the form posts). | hand |
| `site/media/*.jpg` | Posters and stills. Every file has an entry in `brand/ledger.json` → `media`. The `*_loop_v4.gif` files beside them are the owner’s loop sources; the build ships only what the page references. `shop-<product>.jpg` are the maker’s product photos, resized from `shop/source/img/`. | hand |
| `site/shop.json` | The Hortus hardware shop: maker, currency, the Hardware screen, the hardware view (groups, ordering steps) and each product (`slug`, `name`, `kind`, `line`, `lead`, `price` as a whole number, `image`, `alt`, `does`, `specs`, `box`). Written in English by hand from `shop/source/emode.json`. `"live": false` keeps it off the web build. | hand |
| `tools/shop/render.mjs` | Renders `site/shop.json` at the four markers in `site/index.html`, each on its own line: `<!-- shop:bar -->` (the basket button), `<!-- shop:hardware -->` (the Hardware screen on the Hortus case), `<!-- shop:views -->` (the hardware views), `<!-- shop:basket -->` (`dialog#basket` and the `#lf-shop` data). One line of markup per marker, so line numbers in reports hold. The brand check always checks the page with the shop in place. | hand |
| `shop/emode-products.json`, `shop/source/` | The maker’s product pages, and what `tools/shop/import-emode.mjs` brings back from them (the maker’s own Russian text, price, stock, photos). Refreshed by the `shop-import` workflow. Nothing here ships. | workflow |
| `dist/web/` | Build output for any static host (Vercel): a full document with its CSS and JS as files (no inline script, so the strict CSP in `vercel.json` holds), `media/` and `vendor/three.min.js` beside it. Every media URL carries its content hash (`?v=`), because `/media/` is cached for a year; the manifest names three.js with its hash too (`three`). | generated |
| `dist/artifact/lastfomo.html` | Build output for a claude.ai Artifact: a fragment (no doctype/html/head/body), CSS, JS and images inlined. Always carries the shop. Its manifest points the walk at cdnjs’s three.js r128 with the vendored copy’s hash (`three`, `threeIntegrity`). | generated |
| `dist/preview/` | While the shop is not live: the web build with the shop in place, for QA. Never deployed (`vercel.json` serves `dist/web`). | generated |

## Markup conventions

- `main.view[data-view]` per route, optional `data-wing` on case views.
- `section.screen` per full-screen step, optional `data-wing="machina|hortus|arca"`. House-level screens carry no `data-wing`.
- `.word` is the only class set in Jacquard 24, and its text is exactly one of `lastfomo`, `machina`, `hortus`, `arca`.
- `.code` labels follow `CODE — Wing · Discipline` (e.g. `MCH — Machina · Autonomous AI`).
- `canvas.plate[data-plate="machina|hortus|arca|paper"]` is a live stipple plate holding the whole horse.
- `.naves`, and any row whose children carry all three wings (the film cards, the brief pills), runs hortus, machina, arca.
- `data-go` and `data-scroll` name an `id` that exists; the build fails otherwise.
- `[data-count]` marks a stat that counts up once; its final text is in the markup.
- `button#theme` cycles the theme preference `auto → dark → light` and sets `data-theme` on `<html>` (no attribute for auto).
- Images use `src="media/<name>.jpg"`, video posters `poster="media/<name>.jpg"`.
- `form#brief` carries a honeypot, `label.hp > input[name="website"][tabindex="-1"]`, hidden from sight and from assistive technology. Its wing radios and timeline options must match `WINGS` and `TIMELINES` in `api/brief.mjs` (`tools/brief.test.mjs` checks). `#sent-title` reads “Brief sent.” after the endpoint confirms, otherwise “Brief ready.” with copy and mailto.
- The header brand link holds one exact mark: the horse alone (`brand/marks/horse.svg`, `viewBox="0 0 420 120"`), the owner’s choice. Beside it, `nav#crumbs` names where you are, like a directory (“Home / Machina”), and stays hidden on the house. A view joins the trail with `data-crumb="<name>"` and, below another page, `data-crumb-parent="<view>"` (Hardware sits under Hortus, a product under Hardware). The right side holds “Start a project” (and the basket while the shop is on).
- The walk: `main.view#view-explore[data-view="explore"]` with `data-crumb="Explore"` and `data-crumb-icon="lux"`, so the trail shows the Lux glyph: “Home / Explore”, then “Home / Explore / Hortus” inside a wing. `#/explore/<wing>` opens a wing directly; `#explore-<wing>` does too, for Artifact links that pass only plain anchors. Walking into an arch sets the route, and the route moves the walk (`lfExplore.enter(wing)`), so the trail, the title and Back follow. While it is open `body.xp-on` hides Start a project, the progress bar and the dots index and shows `button#xp-menu` (the settings, `dialog#xp-set`), and `<html data-theme="dark">` holds until the visitor leaves. The hero’s Explore (`a[href="#/explore"]`) opens the house; each case cover carries Explore beside Play the film (`a[href="#/explore/<wing>"]`). The Arca objects ride in `template#xp-media` as ordinary `img[src="media/…"]`, so the build inlines or fingerprints them like any image. `window.lfExplore.peek()` reports the walk’s state for the QA tools.
- Every film control is `<a data-play="<wing>" href="https://www.youtube.com/watch?v=<id>" target="_blank" rel="noopener">`; the id must match `site/media.json`. Where the page can play a film (`site/main.js`, `inPage`) it opens in `dialog#reel`; otherwise the link opens YouTube. `[data-reels]` (“Watch the films”) opens the same dialog on `#reel-pick`, the three film cards to choose from; the landing has no films screen of its own.
- A case view opens on `section.case-cover`: the label, the wordmark and the line stacked tight, one lead, one “Play the film”, bottom-aligned over `.cover-bg[aria-hidden="true"] > video.cover-v[data-cover="<wing>"]`, the wing’s footage full-bleed under a fall from void to clear. The footage loads when its cover is first active and loops for as long as the cover is the active screen of the open page and the tab is in view; anywhere else it pauses. `button[data-footage]` (“Pause footage” / “Play footage”) holds every cover at once (WCAG 2.2.2), remembered in `localStorage` (`lf-footage`); it stays hidden under reduced motion, which keeps the poster, and when the browser cannot play the footage. The cover stays dark in both themes.
- The Hortus hardware: `#/hardware` is `main.view[data-view="hardware"]`, `#/hardware/<slug>` is `main.view[data-view="hw-<slug>"]`; both carry `data-wing="hortus"` and a `data-page-title`. A page built without the shop sends these routes to the Hortus case. Product photos sit in `span.arch.goods` on paper, sealed in grey until their screen is active. `[data-add="<slug>"]` adds one to the basket and opens it; `[data-basket]` opens it. The basket lives in `localStorage` (`lf-basket`) and sends its order as an email (mailto with copy); nothing is charged on the page.

## Commands

| Command | Does |
|---|---|
| `node tools/build.mjs` | Regenerates `site/tokens.css`, runs the brand check, writes `dist/web/` and `dist/artifact/lastfomo.html` (and `dist/preview/` while the shop is not live). Fails on brand errors. |
| `node tools/brandcheck.mjs` | Checks the source (`site/`). `--html <file>` checks one self-contained page. `--json` for machine output. Exit 1 on errors. |
| `node tools/brandcheck.test.mjs` | Fixture tests for the brand check. |
| `node tools/brief.test.mjs` | Tests for `api/brief.mjs` with the email API mocked: sending, the 503 without a key, origin, method, honeypot, timing, validation, size, and the form’s values. |
| `node tools/qa/shoot.mjs` | Headless screenshots of every screen of every route, desktop 1440×900 and phone 390×844, dark and light, plus contact sheets and a JSON report in `out/qa/`. |
| `node tools/qa/smoke.mjs` | Clicks through routes, the header trail, player and film picker, case covers, brief form and theme switch; reports console errors. |
