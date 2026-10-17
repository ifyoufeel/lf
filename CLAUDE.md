# lastfomo

lastfomo is a research house with three wings: Machina (private, on-premise AI), Hortus (plant science) and Arca (art and collections).
This repo is its landing page, built from one source in `site/` with the brand on rails.

## Read before any work

- Every asset follows the `lastfomo-brand` skill in `.claude/skills/lastfomo-brand/`: the page, copy, stills, loops, films. Read `SKILL.md`, then only the reference the task needs (`references/web-and-games.md` for the page, `references/copy.md` for words).
- `docs/contract.md`: file layout, markup conventions, commands. Match it exactly.
- `docs/brand-rails.md`: every rail, the check that enforces it, how to fix a failure, and what only a human can see.
- `README.md`: the overview for people, with the owner’s open items.

## Sources of truth

| Path | Holds | Who edits |
|---|---|---|
| `brand/tokens.json` | colours, themes, wing modes, type, motion, layout | by hand, with the owner |
| `brand/ledger.json` | facts, approved lines, banned copy, British spelling, placeholders, media rights | by hand, owner-approved |
| `brand/marks/*.svg` | the exact Figma vectors: horse, wordmark, lockup, glyphs | nobody |
| `site/tokens.css` | generated from `brand/tokens.json` by `node tools/build.mjs` | nobody |

The rest of `site/` is hand-written source. `dist/` and `out/` are generated and ignored by git.

## The rules, web edition

1. The horse is always whole: never cropped, clipped or bled off a plate, arch or frame.
2. One wing colour per composition. All three only at house level, ordered hortus, machina, arca.
3. The wing colour is the only saturated colour. Everything else is void, ink, graphite, ash, paper, mist.
4. Jacquard 24 sets only `lastfomo`, `machina`, `hortus`, `arca`, and only through `.word`.
5. Real facts only. Every number on the page traces to `brand/ledger.json` → `facts`.
6. No client names. The Machina case is “a medical practice”.
7. One message per screen: a label, a wordmark, one line, at most one button.
8. Every wing uses the same arch holder (`.arch`, fully rounded top). Never a rectangle.
9. Sealed until you look: grey to colour behind a sweep line in the wing colour.
10. Light on the wire: loops under 1.2 MB, video loads only when its screen is active.
11. British spelling and typographic punctuation: ’ “ ” and the em dash in labels.
12. No exclamation marks. No emoji, no hype, no superlatives.

“0 bytes leave the room” is a design premise, never a measurement.

## Workflow

1. Edit `site/`. A Claude Code hook runs the brand check after every edit under `site/` or `brand/`. Fix what it reports before moving on.
2. `node tools/build.mjs`: regenerates `site/tokens.css`, checks the source and the built Artifact, writes both targets. It fails on brand errors.
3. `node tools/qa/shoot.mjs`: every screen of every route, desktop 1440×900 and phone 390×844, dark and light, into `out/qa/`.
4. Look at the contact sheets, `out/qa/<route>/<viewport>-<scheme>-contact.jpg`, yourself. In `out/qa/report.json` → `summary`, expect `fontsLoaded: true` and zero `overflowScreens`, `clippedTextScreens`, `coveredTextScreens`, `consoleErrors` and `pageErrors`. After any behaviour change, also run `node tools/qa/smoke.mjs`.
5. Publish, and name any placeholder or rights warning in your reply.

Other commands: `node tools/brandcheck.mjs` checks `site/` on its own (`--html <file>` for one page, `--json` for machine output). After changing the checker, run `node tools/brandcheck.test.mjs`.

## Publishing targets

- claude.ai Artifact: `dist/artifact/lastfomo.html`, a fragment with CSS, JS and images inlined. Publish it with the Artifact tool and republish to the same URL for updates.
- Static host (Vercel or any other): upload `dist/web/` as it is: `index.html`, its CSS and JS, `media/` beside it.

Publish only from `dist/`, after a build that passed: the build checks the page that ships, not only its source.

## Adding a number, a line or an image

- Ask the owner first. Never infer, round or estimate a figure.
- A number: add a fact to `brand/ledger.json` → `facts` (`id`, `claim`, `numbers` exactly as the page writes them, such as `"3.1"` or `"0:40"`), then use it in `site/`.
- A line: owner-approved lines live in `ledger.json` → `approvedLines`. Add it there first, then to the page.
- An image: the file in `site/media/`, then an entry in `ledger.json` → `media` with alt text and rights, then `<img src="media/<name>.jpg" alt="…">`.
- Not confirmed yet: ship a named placeholder listed in `ledger.json` → `placeholders`, never a guess.

## Open placeholders

- `[YOUR EMAIL]` in the footer and the brief composer: waiting for the house address.
- The roadmap “Next” items and the “What happens next” steps are unconfirmed wording (`ledger.json` → `unconfirmed`).
- Loops: Arca plays (`site/media/arca-loop.*`). Machina and Hortus still show posters; make their loops from the owner’s GIF previews with `python3 tools/media/gif_to_loop.py <preview.gif> <wing>` and list them in `site/media.json`.
- Films are the owner’s YouTube uploads (`site/media.json` → `films`). Play controls are links to them; the web build plays them in place, the Artifact opens YouTube. The build fails if a link disagrees with `media.json`. The links and durations are unconfirmed (`ledger.json` → `unconfirmed`).
- Rights to confirm for the Frazetta painting and the museum photographs (the R12 warning lists them).

## Never

- Never edit `site/tokens.css` by hand. Change `brand/tokens.json`, then rebuild.
- Never add a colour outside `brand/tokens.json`. In `site/`, colours arrive only through `var(--token)`.
- Never set anything but the four brand names in Jacquard 24.
- Never invent a metric, a result, a date or a duration.
- Never name Wing 04. It stays “Wing 04, in the works”, always sealed.
- Never crop the horse, and never redraw, rotate, outline or two-tone it. Marks come from `brand/marks/` unchanged.
- Never bring back removed copy: “EST. 2026”, “By appointment”, invented results, the field-report page.
- Never silence a check, or widen the ledger, to make a failure pass. Fix the page, or ask the owner.
