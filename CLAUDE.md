# lastfomo

lastfomo is a research house with three wings: Machina (private, on-premise AI), Hortus (plant science) and Arca (art and artifacts).
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
| `site/shop.json` | the shop: Hortus hardware (products, English copy, prices), the Machina compute and the Arca market, `live` | by hand, from `shop/source/emode.json` and dated market reports |
| `shop/source/` | the maker’s pages as imported: Russian text, prices, photos | the `shop-import` workflow |

The rest of `site/` is hand-written source. `tools/shop/render.mjs` renders `site/shop.json` into `site/index.html` at its `<!-- shop:… -->` markers, for the build and the brand check alike. `dist/` and `out/` are generated and ignored by git.

## The rules, web edition

1. The horse is always whole: never cropped, clipped or bled off a plate, arch or frame.
2. One wing colour per composition. All three only at house level, ordered hortus, machina, arca.
3. The wing colour is the only saturated colour. Everything else is void, ink, graphite, ash, paper, mist.
4. Jacquard 24 sets only `lastfomo`, `machina`, `hortus`, `arca`, and only through `.word`.
5. Real facts only. Every number on the page traces to `brand/ledger.json` → `facts`.
6. No client names. The Machina case is “a medical practice”.
7. One message per screen: a label, a wordmark, one line, at most one button. The shop’s pages are packed like a shop’s, by the owner’s choice.
8. The arch holder (`.arch`, fully rounded top) belongs to the home page, as part of the brand: every wing uses it there, never a rectangle. Subpages (the cases, the hardware and each product) hold their pictures in square cards (the owner’s rule, 26 October 2026).
9. Sealed until you look: grey to colour behind a sweep line in the wing colour.
10. Light on the wire: loops under 1.2 MB, video loads only when its screen is active.
11. British spelling and typographic punctuation: ’ “ ” and the em dash in labels.
12. No exclamation marks. No emoji, no hype, no superlatives.

“0 bytes leave the room” is a design premise, never a measurement.

## Workflow

1. Edit `site/`. A Claude Code hook runs the brand check after every edit under `site/` or `brand/`. Fix what it reports before moving on.
2. `node tools/build.mjs`: regenerates `site/tokens.css`, checks the source and the built Artifact, writes both targets (and `dist/preview/` while the shop is not live). It fails on brand errors.
3. `node tools/qa/shoot.mjs`: every screen of every route, desktop 1440×900 and phone 390×844, dark and light, into `out/qa/`.
4. Look at the contact sheets, `out/qa/<route>/<viewport>-<scheme>-contact.jpg`, yourself. In `out/qa/report.json` → `summary`, expect `fontsLoaded: true` and zero `overflowScreens`, `clippedTextScreens`, `coveredTextScreens`, `consoleErrors` and `pageErrors`. After any behaviour change, also run `node tools/qa/smoke.mjs`.
5. Publish, and name any placeholder in your reply.

Other commands: `node tools/brandcheck.mjs` checks `site/` on its own (`--html <file>` for one page, `--json` for machine output). After changing the checker, run `node tools/brandcheck.test.mjs`. After changing `api/brief.mjs` or the brief form, run `node tools/brief.test.mjs`.

## Publishing targets

- claude.ai Artifact: `dist/artifact/lastfomo.html`, a fragment with CSS, JS and images inlined. Publish it with the Artifact tool and republish to the same URL for updates.
- Vercel, live at https://lastfomo.vercel.app: project `lastfomo`, connected to this repo. A push to the production branch (the default branch, today `claude/great-hamilton-2sna3z`) builds `dist/web/` with `vercel.json` and goes live; a brand error fails the build. Other branches get login-protected previews. Any other static host takes `dist/web/` as it is.
- Vercel connector: leave `teamId` out of its calls, and never crawl the live site (see `docs/publishing.md` → “The live project”).

Publish only from `dist/`, after a build that passed: the build checks the page that ships, not only its source.

## Adding a number, a line or an image

- Ask the owner first. Never infer, round or estimate a figure.
- A number: add a fact to `brand/ledger.json` → `facts` (`id`, `claim`, `numbers` exactly as the page writes them, such as `"3.1"` or `"0:40"`), then use it in `site/`.
- A line: owner-approved lines live in `ledger.json` → `approvedLines`. Add it there first, then to the page.
- An image: the file in `site/media/`, then an entry in `ledger.json` → `media` with alt text and rights, then `<img src="media/<name>.jpg" alt="…">`.
- Not confirmed yet: ship a named placeholder listed in `ledger.json` → `placeholders`, never a guess.

## Open items

- Contact: lastfomo@gmail.com (`ledger.json` → `contact`), in the footer and the brief composer. On the web build “Send the brief” posts to `api/brief.mjs` (a Vercel Function), which emails it through Resend once `RESEND_API_KEY` is set in the Vercel project; without the key, and in the Artifact, the form falls back to copy and mailto.
- The roadmap “Next” items and the “What happens next” steps are unconfirmed wording (`ledger.json` → `unconfirmed`).
- Loops: all three wings play, made from the owner’s GIF previews (`site/media/*_loop_v4.gif`, sources that do not ship) with `python3 tools/media/gif_to_loop.py <preview.gif> <wing>`, each resting at 3.6 s (`site/media.json` → `hold`).
- Case cover footage: the owner’s 10 s AV1 videos (`site/media/<wing>-cover-av1.mp4`, as supplied) with H.264 copies (`<wing>-cover.mp4`, 1280×720) and first-frame posters, in `site/media.json` → `covers`. Full-bleed behind each case cover, looping while the cover is on screen. No pause control, by the owner’s choice; reduced motion keeps the poster.
- The header shows the horse alone (the owner’s choice); R11 holds it to `brand/marks/horse.svg` and its viewBox.
- The walk (`#/explore`, `site/explore.js`): the hero’s Explore opens the house, a case cover’s Explore opens its wing. While it is open the header keeps the trail (Home / Explore / wing) and trades Start a project for the settings (auto walk, music, sounds, look with your phone). three.js r128 is vendored in `site/vendor/` for the web build’s CSP; the Artifact loads cdnjs’s copy by hash. Phone motion works on the web build; claude.ai Artifacts refuse motion sensors, so there the walk falls back to drag-to-look. Its interface wording is suggested (`ledger.json` → `unconfirmed`).
- Films are the owner’s YouTube uploads (`site/media.json` → `films`). Play controls are links to them; the web build plays them in place, the Artifact opens YouTube. The build fails if a link disagrees with `media.json`. Inside the Artifact the popup needs the film files in its asset store (`films.<wing>.asset`); until then it links out.
- Every image and film is the owner’s, except the shop’s product photos (`site/media/shop-*.jpg`), which are E-MODE’s: rights “check” until the owner agrees their use with the maker.
- The Hortus hardware shop is a demonstration: `site/shop.json` → `"live": false` puts it in the Artifact and `dist/preview/` only, never on lastfomo.vercel.app. QA it with `node tools/qa/shoot.mjs --dir dist/preview --routes "#/hortus,#/hardware,#/hardware/ponics-pilot"`. Prices are in US dollars by the owner’s rule: the maker’s rouble list price ÷ 100, rounded (`site/shop.json` → `$prices`). Going live waits on the owner: photo rights, the in-house versus E-MODE wording (`ledger.json` → `conflicts`), and how a web order is taken. Every shop price and spec is a fact in `ledger.json` (`hortus.shop.*`).
- The Machina compute (`#/compute`) and the Arca market (`#/market`) ride the same `live` flag. Their numbers are a snapshot of market reports gathered on 26 October 2026, each a dated, sourced fact (`machina.market.*`, `arca.market.*`): refresh them before going live, since GPU and gold prices move daily. The calculator is an estimate whose method sits in `site/shop.json` → `machina.calc` (`ledger.json` → `unconfirmed`). Requests (Machina builds and sourcing, Arca coins and art) go in the basket priced “by email”. The art is three named placeholders until the owner lists real works; auctions and more artists come later.

## Never

- Never edit `site/tokens.css` by hand. Change `brand/tokens.json`, then rebuild.
- Never add a colour outside `brand/tokens.json`. In `site/`, colours arrive only through `var(--token)`.
- Never set anything but the four brand names in Jacquard 24.
- Never invent a metric, a result, a date or a duration.
- Never name Wing 04. It stays “Wing 04, in the works”, always sealed.
- Never crop the horse, and never redraw, rotate, outline or two-tone it. Marks come from `brand/marks/` unchanged.
- Never bring back removed copy: “EST. 2026”, “By appointment”, invented results, the field-report page.
- Never silence a check, or widen the ledger, to make a failure pass. Fix the page, or ask the owner.
