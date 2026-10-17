# Source contract

How the lastfomo site is laid out, so every tool (and every future session) agrees on it.

## Files

| Path | Role | Edited by |
|---|---|---|
| `brand/tokens.json` | Colours, themes, wing modes, type, motion, layout. Single source of truth. | hand |
| `brand/ledger.json` | Facts, approved lines, banned phrases, British spelling, placeholders, media rights. | hand, owner-approved |
| `brand/marks/*.svg` | Exact Figma vectors: horse (Logo/Mark 9:3), wordmark (9:5), lockup (9:7), glyphs. | never by hand |
| `site/index.html` | The page: a full HTML document with hash routes `#/`, `#/machina`, `#/hortus`, `#/arca`, `#/start`. | hand |
| `site/tokens.css` | Generated from `brand/tokens.json` by `tools/build.mjs`. | generated |
| `site/styles.css` | Component styles. Colours only through `var(--token)`; no hex, rgb or named colours. | hand |
| `site/boot.js` | Runs in `<head>` before first paint: adds the `js` class that gates reveals, restores the saved theme. | hand |
| `site/main.js` | Behaviour: plates, reveals, routing, curtain, player, cursor, brief composer, theme switch. | hand |
| `site/media.json` | Video manifest: `{ "loops": { "machina": null, ... }, "films": { ... } }`. `null` means not uploaded yet. | hand |
| `site/media/*.jpg` | Posters and stills. Every file has an entry in `brand/ledger.json` → `media`. | hand |
| `dist/web/` | Build output for any static host (Vercel): full document, inline CSS and JS, `media/` beside it. | generated |
| `dist/artifact/lastfomo.html` | Build output for a claude.ai Artifact: a fragment (no doctype/html/head/body), CSS, JS and images inlined. | generated |

## Markup conventions

- `main.view[data-view]` per route, optional `data-wing` on case views.
- `section.screen` per full-screen step, optional `data-wing="machina|hortus|arca"`. House-level screens carry no `data-wing`.
- `.word` is the only class set in Jacquard 24, and its text is exactly one of `lastfomo`, `machina`, `hortus`, `arca`.
- `.code` labels follow `CODE — Wing · Discipline` (e.g. `MCH — Machina · Autonomous AI`).
- `canvas.plate[data-plate="machina|hortus|arca|paper"]` is a live stipple plate holding the whole horse.
- `.naves` holds the house trio in the order hortus, machina, arca.
- `[data-count]` marks a stat that counts up once; its final text is in the markup.
- `button#theme` cycles the theme preference `auto → dark → light` and sets `data-theme` on `<html>` (no attribute for auto).
- Images use `src="media/<name>.jpg"`, video posters `poster="media/<name>.jpg"`.

## Commands

| Command | Does |
|---|---|
| `node tools/build.mjs` | Regenerates `site/tokens.css`, runs the brand check, writes `dist/web/` and `dist/artifact/lastfomo.html`. Fails on brand errors. |
| `node tools/brandcheck.mjs` | Checks the source (`site/`). `--html <file>` checks one self-contained page. `--json` for machine output. Exit 1 on errors. |
| `node tools/brandcheck.test.mjs` | Fixture tests for the brand check. |
| `node tools/qa/shoot.mjs` | Headless screenshots of every screen of every route, desktop 1440×900 and phone 390×844, dark and light, plus contact sheets and a JSON report in `out/qa/`. |
| `node tools/qa/smoke.mjs` | Clicks through routes, player, brief form and theme switch; reports console errors. |
