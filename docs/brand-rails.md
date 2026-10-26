# Brand rails

A rail is a brand rule that a machine checks, so the page stays on brand without anyone remembering to look. This file lists every rail: the rule in plain words, what enforces it, and how to fix a failure. The rules themselves come from the `lastfomo-brand` skill (`.claude/skills/lastfomo-brand/SKILL.md`); the data they read lives in `brand/tokens.json`, `brand/ledger.json` and `brand/marks/`.

Rule IDs `R0` to `R17` belong to `tools/brandcheck.mjs` and appear in every report. They are stable: docs, hooks and fixtures refer to them. The QA harness (`tools/qa/shoot.mjs`, `tools/qa/smoke.mjs`) reports under the field names of `out/qa/report.json` and the step names of `out/qa/smoke.json`.

## Where the rails run

| Where | When | What runs |
|---|---|---|
| Claude Code hook (`.claude/settings.json` → `tools/hooks/brandcheck-hook.mjs`) | after every Edit or Write under `site/` or `brand/` | the source check; errors go straight back to Claude |
| `node tools/build.mjs` | every build | regenerates `site/tokens.css`, checks `site/`, builds, then checks `dist/artifact/lastfomo.html` as one page. Fails on any error. |
| `.githooks/pre-commit` | every commit, once enabled with `git config core.hooksPath .githooks` | the build, then refuses the commit if `site/tokens.css` was stale |
| `.github/workflows/brand.yml` | every push and pull request | `node tools/brandcheck.test.mjs`, the build, and `git diff --exit-code -- site/tokens.css` |
| `node tools/qa/shoot.mjs` | before publishing | screenshots, contact sheets, layout and font checks, in `out/qa/` |
| `node tools/qa/smoke.mjs` | after behaviour changes, before publishing | clicks through the page; PASS, FAIL or SKIP per step |

The QA tools need Playwright and Chromium, so they run on a workstation, not in CI.

## The twelve rules and what guards them

| # | Rule (web edition) | Rails | Human review |
|---|---|---|---|
| 1 | The horse is always whole. | R11 (exact vectors) | every plate, poster and still on the contact sheets |
| 2 | One wing colour per composition; the trio only at house level, ordered hortus, machina, arca. | R4, R5 | wing colour inside photographs |
| 3 | The wing colour is the only saturated colour. | R2, R3 | the grade of photographs and video |
| 4 | Jacquard 24 sets only lastfomo, machina, hortus, arca. | R1 | — |
| 5 | Real facts only; every number traced to `ledger.json`. | R6, R7 | numbers written as words, claims without numbers |
| 6 | No client names. | — | every line of copy |
| 7 | One message per screen. | `overflowScreens`, `clippedTextScreens` (symptoms only) | the contact sheets |
| 8 | The arch holder on the home page; square cards on subpages. | — | the contact sheets, phone and desktop |
| 9 | Sealed until you look. | R14 (a still version exists) | the reveal in a browser |
| 10 | Light on the wire. | R16, build size report | video sizes before upload |
| 11 | British spelling and typographic punctuation. | R8, R9 | words the ledger does not list |
| 12 | No exclamation marks, no emoji, no hype. | R7, R17 | tone |

## Every rail

### Brand check (`tools/brandcheck.mjs`)

Source mode checks `site/index.html`, `site/styles.css`, `site/main.js`, `site/boot.js`, `site/explore.js` and `site/tokens.css` (every local script and stylesheet the page loads; three.js, which the walk loads on its own, is third-party code and is not checked). `--html <file>` checks one self-contained page, such as the built Artifact.

| Rail | The rule in plain words | Severity | How to fix a failure |
|---|---|---|---|
| R0 `inputs` | The check needs the brand data and the source files. | error | `site/tokens.css` missing: run `node tools/build.mjs`. Brand data unreadable: fix the JSON syntax in `brand/`. |
| R1 `jacquard-names-only` | Pixel type sets the brand name and nothing else. The display face may only be declared in rules that target `.word` (`.word`, `.hero .word`, `.wing .word`, `.case-cover .word`), and every `.word` reads exactly lastfomo, machina, hortus or arca. | error | Move the `var(--disp)` declaration into a `.word` rule. Set other text in `var(--sans)` or `var(--mono)`. If a `.word` holds anything else, change the text to a brand name or drop the class. |
| R2 `colour-literals` | Colours come from tokens. No hex, `rgb()`, `hsl()` or named colours in `site/styles.css`, `site/main.js` or `style=""`. In one-page mode, literals may sit only in `:root` and `[data-wing…]` token blocks. | error (mask alpha: warning) | Replace the literal with `var(--token)`. In JS, read the token with `getComputedStyle(document.documentElement).getPropertyValue('--wing')`. A colour the tokens lack goes to the owner, then into `brand/tokens.json`. |
| R3 `token-values` | Token colours are the brand’s colours: every hex in a token block exists in `brand/tokens.json`. | error | Never edit `site/tokens.css`; rebuild. In a single page, copy the value from `brand/tokens.json`. |
| R4 `one-wing-per-composition` | Inside a `data-wing` composition: no other wing, no other wing’s colour token, plates of the same wing, and `.code` labels that start with its code (MCH, HRT, ARC). | error | Use `var(--wing)` and `var(--wing-t)` rather than a named wing token. Set `data-plate` to the composition’s wing. Move house-level content out of the wing section. Start the label with the right code, as in `MCH — Machina · Autonomous AI`. |
| R5 `house-trio-order` | The house trio reads hortus, machina, arca, left to right: in `.naves` and in any row whose children carry all three wings (film cards, wing pills). Stacked `.screen` sections and `main.view` pages are the narrative, not a row. | error | Reorder the row’s children. |
| R6 `facts-ledger` | Every number on the page is a real, recorded fact. | error | A typo: correct it. A new figure: ask the owner, add a fact to `ledger.json` → `facts` with the number as written (`"3.1"`, `"0:40"`, `"0001"`, `"3,994.90"`: a number grouped in thousands keeps its decimals), then use it. Never add a number only to make the check pass. |
| R7 `banned-copy` | Removed copy stays removed: “EST. 2026”, “By appointment”, invented results (records, timings, weeks, percentages), the field report, Wing 04’s working title, exclamation marks. | error | Follow the reason in the report: “By invitation”, build facts instead of results, film durations as m:ss, a full stop where an exclamation mark stood. |
| R8 `typographic-punctuation` | Apostrophes are ’, quotes are “ ”, dashes are —. This covers JS strings that reach the page. | error (spaced hyphen: warning) | Use the suggested character. Straight quotes stay in code only. |
| R9 `british-spelling` | British spelling: colour, optimise, catalogue, jewellery. | error | Use the suggested word. Add a missing pair to `ledger.json` → `britishSpelling`. |
| R10 `placeholders` | Known placeholders are visible debt; unknown ones are mistakes. | known token: warning with a count; unknown `[ALL CAPS]` token: error | Replace a known token once the owner supplies the value. Register a new placeholder in `ledger.json` → `placeholders` with where it sits and who supplies it, or remove it. |
| R11 `marks-integrity` | The horse and wordmark are the exact Figma vectors. Checks the `Path2D("…")` horse in `site/main.js` and the header mark in `site/index.html` against `brand/marks/`: the horse alone (the owner’s choice) or the full lockup, each with the mark’s own `viewBox`, so the frame never crops the horse. | error in source; warning in one-page mode | Copy the `d` attribute and the `viewBox` from `brand/marks/horse.svg` (or `lockup.svg`) unchanged. Never hand-edit coordinates. |
| R12 `images` | Every image has alt text, an entry in `ledger.json` → `media`, and a file in `site/media/`. Files with rights “check” are listed before launch. | errors: missing alt, unlisted or missing file. Warnings: alt differs from the ledger (except `alt=""` inside an `aria-hidden="true"` backdrop, such as a case cover’s stills); rights to check. | Add `alt` (`alt=""` for decoration). Add the file to the ledger with alt and rights before using it. Match the ledger’s alt text. The rights warning stays until the owner confirms; then `rights` changes from `"check"` to `"cleared"` with the source in `note`. |
| R13 `type-minimums` | Labels at least 11 px, body at least 15 px. | error | Raise the size. In `clamp(a, b, c)`, `a` is what counts. |
| R14 `reduced-motion` | Every reveal, plate and curtain has a still version. | error | Keep an `@media (prefers-reduced-motion: reduce)` block: no shimmer, no bob, instant transitions, plates shown developed. |
| R15 `theme-shape` | Light tokens on bare `:root`; dark under `prefers-color-scheme: dark` guarded by `:root:not([data-theme="light"])`; again under `:root[data-theme="dark"]`; body background from `var(--bg)`. | error | In the source, rebuild: `tools/build.mjs` writes this shape. In a single page, restore the three blocks and `body{background:var(--bg)}`. |
| R16 `external-hosts` | Assets load from the page itself or from allowed hosts: Google Fonts for type; cdnjs, jsDelivr, unpkg, Tailwind and jQuery CDNs for scripts. Any `/_blob/` URL is dead. | error | Put the file in `site/media/` or load it from an allowed host. Replace a `/_blob/` URL with the re-uploaded file, recorded in `site/media.json`. |
| R17 `no-emoji` | No emoji in visible text. | error | Remove it. If a mark is needed, use a glyph from `brand/marks/glyphs.svg`. |

“Visible text” means the HTML with scripts, styles, SVG, templates and comments removed, entities decoded, plus `alt`, `aria-label`, `title`, `placeholder` and the `<title>`. Reports give `file:line`.

### QA harness (`tools/qa/shoot.mjs`, `tools/qa/smoke.mjs`)

`shoot.mjs` serves `dist/web/` by default, visits `#/`, `#/machina`, `#/hortus`, `#/arca` and `#/start` at desktop 1440×900 and phone 390×844, in dark and light, and scrolls to every `section.screen`. Findings land in `out/qa/report.json`; flagged screens carry a red outline on the contact sheets.

| Rail | The rule in plain words | Severity | How to fix a failure |
|---|---|---|---|
| `overflowScreens` | Every screen fits a 390 px phone with no sideways scroll. | flagged on the sheet and in `report.json` → `flagged` | `runs[].screens[].overflow.elements` names each element past the edge and by how much. Shrink the holder (`min(34svh, 320px)` on phones), stack the copy, keep margins on `var(--gl)` and `var(--gr)`. Never hide the overflow to mask it. |
| `clippedTextScreens` | No text is cut off by its box. | flagged | Let the box grow or cut the copy. Clipped text usually means a screen carries more than one message. |
| `coveredTextScreens` | No text sits under the fixed header or the dots index. | flagged | Pad the screen by `var(--bar)` at the top, or move the content. |
| `fontsLoaded` | Geist, Geist Mono and Jacquard 24 actually load wherever the page uses them. | `false` is a failure | The stylesheet link must match `type.googleFonts` in `brand/tokens.json`, and family names must match `type.*.family`. `report.json` → `fontCache` lists failed downloads, usually the network. |
| `consoleErrors`, `pageErrors`, `failedRequests` | The page runs without errors. | non-zero is a failure | Read the entries in `report.json`. Videos not uploaded yet are listed under `expectedMissing` and ignored. |
| Contrast review | Text stays readable in both themes. Measured by no tool: the harness shoots dark and light so a person can judge. | human | Small wing-coloured text uses `var(--wing-t)`, which `brand/tokens.json` darkens for the light theme. Bright wing colours are for fills, dots, lines and plates. Secondary text uses `var(--fg2)`. |
| `smoke.mjs` steps | Routes and the curtain, the case links, the film player, the brief form and its copy button, the theme switch (`auto → dark → light`), visible focus rings, fonts, a clean console. | any FAIL exits 1; an absent optional element is SKIP | Read the failing step in the output or in `out/qa/smoke.json`, then fix the behaviour in `site/main.js`. |

### Build and repository

| Rail | The rule in plain words | Severity | How to fix a failure |
|---|---|---|---|
| Tokens in sync | `site/tokens.css` always matches `brand/tokens.json`. | pre-commit and CI fail | Run `node tools/build.mjs` and commit `site/tokens.css` with the change to `brand/tokens.json`. |
| Checker fixtures | Each rule keeps catching what it was built to catch. | CI fails | After a deliberate change to `tools/brandcheck.mjs`, update the matching fixture in `tools/fixtures/brandcheck/` and run `node tools/brandcheck.test.mjs`. |
| Build report | The build prints the size of both targets, the videos still missing and the placeholders still in the page. | information | Read it before publishing. The Artifact page must stay under 16 MB. |

## What the checks cannot see

A passing build means the page is not wrong in the ways a machine can measure. These need a person, every time.

- **Taste.** Whether a screen feels airy, sharp and deliberate. Whether the wing colour leads. Whether the page looks made by the same hand as the films.
- **The horse inside images.** R11 proves the vector is exact, not that a plate, poster, loop or still shows the horse whole with clear margins. Check each one at phone size.
- **Rights.** Every image and film is the owner’s except the Hortus shop’s product photos (`shop-*.jpg`), which are E-MODE’s. A third-party image enters the ledger with rights “check”, and R12 lists it until the owner clears it.
- **The shop’s numbers.** R6 traces every price and specification to a `hortus.shop.*` fact, whose claim names the maker’s page and the import date. Prices show in US dollars by the owner’s rule (the maker’s rouble price ÷ 100, rounded to the dollar), and each fact gives both. R6 cannot tell whether the maker has since changed a price or whether the rule was applied: rerun the `shop-import` workflow and compare `shop/source/emode.json` with `site/shop.json` before the shop goes live.
- **The markets’ numbers.** The Machina compute and the Arca market show market prices: each is a dated, sourced fact (`machina.market.*`, `arca.market.*`) gathered on 26 October 2026. R6 proves a number is recorded, not that the market still agrees: refresh the snapshot before the shop goes live. The calculator’s results are written by script and are estimates; R6 checks only what the markup carries. The art is held by named placeholders (R10) until the owner lists real works.
- **Tone.** R7 catches known bans. It cannot hear hype, a superlative, a line that was never approved, or a paragraph that should be three words. Compare new copy with `ledger.json` → `approvedLines` and the voice in `references/copy.md`.
- **Numbers in words and claims without numbers.** R6 reads digits only: “eight GPUs” or “the fastest” pass unseen. Each still needs a ledger fact or must go.
- **Meaning.** “0 bytes leave the room” is a premise, never a measurement. The Arca field-note objects are research references, not Arca’s holdings: never imply ownership or sale.
- **Client names and Wing 04.** The checks know one banned name, not every name. Read for both.
- **Structure the checks do not model.** One message per screen (the shop’s pages excepted), the arch holder on the home page and square cards on subpages, a sealed reveal that actually reveals.
- **Grade and weight of media.** The wing colour as the only saturated colour inside photographs and video; loops under 1.2 MB and films within budget before upload.

## When a rail seems wrong

Change the data before the checker. A fact the owner confirms goes into `brand/ledger.json`; a colour into `brand/tokens.json`. If the checker itself is wrong, fix it in `tools/brandcheck.mjs` with a fixture that proves the case, run `node tools/brandcheck.test.mjs`, and keep the rule IDs as they are.
