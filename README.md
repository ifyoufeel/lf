# lastfomo

The landing page of lastfomo, a research house with three wings: Machina (private, on-premise AI), Hortus (plant science) and Arca (art and artifacts). *What grows. What thinks. What lasts.*

This repo holds the page as source, the brand as data, and the tools that keep one true to the other. One build turns the source into two publishable pages and refuses anything off brand.

Live at **https://lastfomo.vercel.app**. Vercel builds it from this repo on every push.

## What this is

- `site/` is the page: one HTML document with hash routes for home, the three case pages, Start a project, and the walk (`#/explore`): the house and its wings in 3D, with signals to find, a score for each wing, auto walk and phone controls.
- `brand/` is the brand as data: tokens, a ledger of facts and approved copy, and the exact Figma marks.
- `tools/` builds the page, checks it against the brand rules, and photographs every screen for review.
- `dist/` is what ships: a claude.ai Artifact and a folder for any static host.

The brand rules themselves live in the `lastfomo-brand` skill, `.claude/skills/lastfomo-brand/`. `CLAUDE.md` condenses them for Claude Code sessions. `docs/brand-rails.md` shows which check enforces each one.

## Requirements

- Node 22. Nothing to install: the build and the brand check have no npm dependencies.
- For the QA tools only: a global Playwright with Chromium. Set `PLAYWRIGHT_MODULE` to its folder if it is not found.
- Network access to Google Fonts for the QA tools. Fonts are cached in `out/.fontcache/` after the first run.

## Folder layout

The authoritative description is `docs/contract.md`. In outline:

```
brand/
  tokens.json            colours, themes, wing modes, type, motion, layout; the single source of truth
  ledger.json            facts, approved lines, banned copy, British spelling, placeholders, media rights
  marks/*.svg            exact Figma vectors: horse, wordmark, lockup, glyphs; never edited by hand
site/
  index.html             the page: routes #/, #/machina, #/hortus, #/arca, #/start, #/explore, #/explore/<wing>
  tokens.css             generated from brand/tokens.json by tools/build.mjs; never edited by hand
  styles.css             component styles; colours only through var(--token)
  boot.js                runs in <head> before first paint: the js class, the saved theme
  main.js                plates, reveals, routing, curtain, player, cursor, brief composer, theme switch, basket
  explore.js             the walk: worlds, signals, score, auto walk, walk button, motion look, settings
  vendor/three.min.js    three.js r128 for the walk, loaded only when it opens; never edited
  media.json             video manifest: wing loops, case cover footage, films; null means not uploaded yet
  media/*.jpg            posters and stills, each listed in brand/ledger.json under media
  shop.json              the Hortus hardware shop: products, English copy, prices; "live" says whether it ships to the web
shop/
  emode-products.json    the maker's product pages the importer reads
  source/                what the importer brought back: the maker's Russian text, prices and photos (not shipped)
tools/
  build.mjs              tokens, brand check, both publish targets
  shop/render.mjs        renders site/shop.json into the page (used by the build and the brand check)
  shop/import-emode.mjs  imports the maker's products into shop/source/ (run by the shop-import workflow)
  brandcheck.mjs         the brand check, rules R0 to R17
  brandcheck.test.mjs    fixture tests for the brand check
  fixtures/brandcheck/   one fixture page per rule
  hooks/                 the Claude Code hook that runs the check after each edit
  qa/shoot.mjs           screenshots and contact sheets
  qa/smoke.mjs           interaction smoke test
  qa/harness.mjs         shared plumbing for the QA tools
docs/
  contract.md            file layout, markup conventions, commands
  brand-rails.md         every rail, what enforces it, how to fix a failure
.claude/                 the lastfomo-brand skill and the hook settings
.githooks/pre-commit     the build before every commit
.github/workflows/       the brand check on every push and pull request
dist/                    generated, not committed
  web/                   full document with CSS, JS and media/ beside it
  artifact/lastfomo.html fragment with CSS, JS and images inlined
  preview/               the web build with the shop, while the shop is not live (QA only, never deployed)
out/                     generated, not committed
  qa/                    screenshots, contact sheets, report.json, smoke.json
```

## Commands

| Command | Does |
|---|---|
| `node tools/build.mjs` | Regenerates `site/tokens.css`, runs the brand check, writes `dist/web/` and `dist/artifact/lastfomo.html`. Fails on brand errors. |
| `node tools/brandcheck.mjs` | Checks the source in `site/`. `--html <file>` checks one self-contained page. `--json` for machine output. Exits 1 on errors. |
| `node tools/brandcheck.test.mjs` | Fixture tests for the brand check. |
| `node tools/qa/shoot.mjs` | Screenshots every screen of every route, desktop 1440×900 and phone 390×844, dark and light, with contact sheets and a JSON report in `out/qa/`. |
| `node tools/qa/smoke.mjs` | Clicks through routes, player, brief form and theme switch; reports console errors. |

A normal round:

1. Edit `site/`.
2. `node tools/build.mjs`
3. `node tools/qa/shoot.mjs`, then open the contact sheets in `out/qa/home/`, `out/qa/machina/` and so on: one per viewport and theme, such as `phone-dark-contact.jpg`.
4. `node tools/qa/smoke.mjs` if behaviour changed.
5. Publish one or both targets.

`node tools/qa/shoot.mjs --help` lists options for shooting a single route, viewport or theme.

## Publishing

There are two targets, built from the same source in one run.

**claude.ai Artifact: `dist/artifact/lastfomo.html`.** A fragment with no doctype, `html`, `head` or `body`, because the Artifact supplies its own skeleton. CSS, JS and images are inlined; nothing else is needed. Publish it with the Artifact tool in Claude Code, and republish to the same URL for every update. Keep it under 16 MB. Videos are not inlined: they belong in the Artifact’s asset store.

**Static host: `dist/web/`.** A full HTML document with `tokens.css`, `styles.css`, `boot.js`, `main.js` and `media/` beside it. Any static host serves the folder as it is. `dist/` is not committed, so a host that builds from Git runs `node tools/build.mjs` itself and serves `dist/web/`.

**Vercel, live: https://lastfomo.vercel.app.** The Vercel project `lastfomo` is connected to this repo and builds `dist/web/` with `vercel.json`. A push to the production branch (today `claude/great-hamilton-2sna3z`, the default) updates the live address; a push to any other branch gets a preview URL behind the Vercel login. A brand error fails the build, so nothing off brand goes live. Details and the checks behind them: `docs/publishing.md` → “The live project”.

Publish only from `dist/`, after a build that passed.

## The rails

The brand check runs in four places: after every edit Claude Code makes under `site/` or `brand/`, inside every build, before every commit and on every push. Enable the commit hook once per clone:

```
git config core.hooksPath .githooks
```

`docs/brand-rails.md` lists every rule, what enforces it, how to fix a failure, and what still needs a person: taste, the horse inside photographs, rights and tone.

## Changing things

- **A number or a claim.** Every number on the page must exist in `brand/ledger.json` under `facts`. The owner confirms a new figure first; it goes into the ledger, then onto the page.
- **A line of copy.** Approved lines live in `brand/ledger.json` under `approvedLines`. New lines are approved by the owner and recorded there first.
- **An image.** Add the file to `site/media/` and an entry to the ledger’s `media` with alt text and rights, then reference it as `media/<name>.jpg`.
- **A colour or a token.** Change `brand/tokens.json` and rebuild. `site/tokens.css` follows; it is never edited by hand.
- **A video.** Record its path or URL in `site/media.json`. Until then the poster stands in.

## Open items for the owner

1. **The email key for the brief.** “Send the brief” posts to `api/brief.mjs`, which emails the brief to lastfomo@gmail.com through Resend. It needs one key: create a free account at resend.com with lastfomo@gmail.com, create an API key, and add it in Vercel (project `lastfomo` → Settings → Environment Variables) as `RESEND_API_KEY` for Production, then redeploy. Until then the form falls back to the composed brief with copy and the mail link, as before.
2. **Films inside the Artifact.** The web build plays the YouTube films in a popup. An Artifact cannot embed YouTube, so there the popup needs the film files: upload the three MP4s and they go to the Artifact’s asset store (`site/media.json` → `films.<wing>.asset`). Until then the Artifact opens YouTube in a new tab.
3. **The Hortus hardware shop (a demonstration).** Six E-MODE controllers with English copy, a basket and an order sent by email, in the Artifact only: `site/shop.json` says `"live": false`, so lastfomo.vercel.app does not show it. Before it goes live, decide: the selling prices and currency (today the maker’s list prices in roubles from 25 October 2026); the rights to the maker’s photos and texts (ledger rights “check”); how the Hortus case and the shop describe who makes the hardware (the case says in-house; the shop names E-MODE); and how an order is taken on the web (an email to the house, a payment, or a hand-off to the maker’s own basket). Then set `"live": true`. Prices and photos refresh from the maker with the `shop-import` workflow (Actions → shop-import → Run workflow); a new price only reaches the page through `site/shop.json` and a ledger fact.
4. **Unconfirmed wording.** The roadmap’s “Next” items (more private builds; pilot beds to full farms; a private catalogue by invitation), the “What happens next” steps on Start a project (we read the brief; a short call; a written plan) and the brief’s sending states (“Sending…”, “Brief sent.”, “It is on its way to lastfomo@gmail.com.”) were written as suggestions. Confirm or rewrite them.

The contact address is lastfomo@gmail.com (`brand/ledger.json` → `contact`). Every image and film is the owner’s, except the shop’s product photos, which are E-MODE’s.

Wing 04 stays sealed and unnamed in public unless the owner decides otherwise.
