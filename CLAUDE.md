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
| `site/shop.json` | the shop: Hortus hardware (products, English copy, prices), the Machina and Arca previews (price studies), `live` | by hand, from `shop/source/emode.json` and dated market reports |
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

- claude.ai Artifact: `dist/artifact/lastfomo.html`, a fragment with CSS, JS and images inlined. Publish it with the Artifact tool and republish to the same URL for updates: the site’s Artifact is https://claude.ai/artifact/WLBQxwzmGz8e5Kw2gHSPY5 (“lastfomo research house”; pass it as `url`). Review copies made for the owner to try a change get their own link.
- Vercel, live at https://lastfomo.com (`www` redirects to it; DNS at GoDaddy, `docs/publishing.md` → “Custom domain”) and at https://lastfomo.vercel.app: project `lastfomo`, connected to this repo, on Hobby by the owner’s choice (a personal site). A push to the production branch (the default branch, today `claude/great-hamilton-2sna3z`) builds `dist/web/` with `vercel.json` and goes live; a brand error fails the build. Other branches get login-protected previews. Any other static host takes `dist/web/` as it is.
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
- Loops: each wing’s loop plays round in its arch for as long as its screen is active, with no pause control (the owner’s choice, 26 October 2026); reduced motion keeps the poster. They come from the owner’s MP4 previews (`site/media/<wing>-loop-source.mp4`, 960×1280, sources that do not ship), made with `python3 tools/media/video_to_loop.py <preview.mp4> <wing>`: an H.264 file for every browser (the preview as supplied when it already fits 1.2 MB) and, where the H.264 had to be squeezed to fit, an AV1 file for wide screens (`site/media.json` → `loops`).
- Case cover footage: the owner’s 10 s AV1 videos (`site/media/<wing>-cover-av1.mp4`, as supplied) with H.264 copies (`<wing>-cover.mp4`, 1280×720) and first-frame posters, in `site/media.json` → `covers`. Full-bleed behind each case cover, looping while the cover is on screen. No pause control, by the owner’s choice; reduced motion keeps the poster.
- The header shows the horse alone (the owner’s choice); R11 holds it to `brand/marks/horse.svg` and its viewBox.
- Icons: the white horse on black (the owner, 26 October 2026). The build writes `favicon.svg`, `favicon.ico` and `apple-touch-icon.png` into `dist/web/` with `tools/icons.mjs`, from `brand/marks/horse.svg` and the void and paper tokens; never draw them by hand. The Artifact has none, since claude.ai owns its tab’s icon.
- The walk (`#/explore`, `site/explore.js`): the hero’s Explore opens the house, a case cover’s Explore opens its wing. While it is open the header keeps the trail (Home / Explore / wing) and trades Start a project for the settings (auto walk, music, sounds, look with your phone). three.js r128 is vendored in `site/vendor/` for the web build’s CSP; the Artifact loads cdnjs’s copy by hash. Phone motion works on the web build; claude.ai Artifacts refuse motion sensors, so there the walk falls back to drag-to-look. Its wording is approved to go live (the owner, 26 October 2026).
- The sound field (`site/explore.js`, `dialog#xp-sf`): once all three wings are explored, stones rise round the house column and Play opens the jam machine from the owner’s own Sound Field artifact (stones, loops, scenes and engine as the owner made them). Approved to go live, wording included (the owner, 27 October 2026, after trying it in a review Artifact). The owner’s open request there, more loops per stone and more scenes, is not built yet.
- Films are the owner’s YouTube uploads (`site/media.json` → `films`). Play controls are links to them; the web build plays them in place, the Artifact opens YouTube. The build fails if a link disagrees with `media.json`. Inside the Artifact the popup needs the film files in its asset store (`films.<wing>.asset`); until then it links out.
- Every image and film is the owner’s, except the shop’s product photos (`site/media/shop-*.jpg`), which are E-MODE’s: rights “check” until the owner agrees their use with the maker.
- The Hortus hardware shop and the Machina and Arca previews are approved to go live (the owner, 26 October 2026, after a test on their own devices): `site/shop.json` → `"live": true` puts them in the web build as well as the Artifact; `false` takes them off the web build again. QA them with `node tools/qa/shoot.mjs --routes "#/hortus,#/hardware,#/hardware/hortuspilot-n,#/machina,#/arca"`. Shop prices are in US dollars by the owner’s rule: the maker’s rouble list price ÷ 100, rounded (`site/shop.json` → `$prices`); every price and spec is a fact in `ledger.json` (`hortus.shop.*`). An order is composed in the basket and sent by email; nothing is charged on the page. The shop names the maker AGC162 and sells the products under Hortus names (HortusPilot N, F and pH; HortusRoom A, C and S), and never says where they are made (the owner, 26 October 2026). The products come from E-MODE: each product’s `source` in `site/shop.json` is its key for the importer, and the photos, which still carry E-MODE’s logos, are the owner’s to rework (`ledger.json` → `conflicts`).
- Hortus research (`site/research/`, live at `/research` from 27 October 2026): an index and a page per study, hash routes `#research`, `#el-nino-2026`, `#plant-vision`, entered from `section#hortus-research` on the Hortus case, below the hardware. A document of its own: `/tokens.css` and `/boot.js` from the site, `research.css`, `js/`, three.js from `/vendor/`, jsPDF in `research/vendor/`, the data, papers, decks and scripts beside it. `node tools/build.mjs` copies it to `dist/web/research/` and checks it as one page (`out/check/research.html`) against every rail but R6 and R7’s percentages, the studies’ own figures (the owner to confirm). It began as the build behind the research’s claude.ai Artifact and is hand-written source now; on the web it saves files through the browser and leaves out the Claude features. A new study is one more view in `index.html` and one more entry in `STUDIES` in `js/app.js`; the index, Latest study and Next study follow.
- The previews: Machina says it builds private AI on the premises and sources the hardware, beside what four machines cost now against their launch price; Arca says the vault and the artists open later, beside gold in 2026 and art sales by year, one screen each on its case before “Next”. Their numbers are a snapshot of market reports gathered on 26 October 2026, each a dated, sourced fact (`machina.study.*`, `arca.study.*`): refresh them as the markets move, since GPU and gold prices change daily.

## Never

- Never edit `site/tokens.css` by hand. Change `brand/tokens.json`, then rebuild.
- Never add a colour outside `brand/tokens.json`. In `site/`, colours arrive only through `var(--token)`.
- Never set anything but the four brand names in Jacquard 24.
- Never invent a metric, a result, a date or a duration.
- Never name Wing 04. It stays “Wing 04, in the works”, always sealed.
- Never crop the horse, and never redraw, rotate, outline or two-tone it. Marks come from `brand/marks/` unchanged.
- Never bring back removed copy: “EST. 2026”, “By appointment”, invented results, the field-report page.
- Never silence a check, or widen the ledger, to make a failure pass. Fix the page, or ask the owner.
