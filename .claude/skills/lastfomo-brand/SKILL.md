---
name: lastfomo-brand
description: Brand knowledge, layout system, video style and production playbook for lastfomo, a research house with three wings (MACHINA "What thinks." private local AI, HORTUS "What grows." nature research, ARCA "What lasts." art and artifacts). Use this skill whenever the user mentions lastfomo, Machina, Hortus, Arca, the horse mark, the Illuminated Protocol design system, or asks for any asset in this brand - films, showreels, GIF loops, thumbnails, social posts, stories, banners, landing pages, case pages, the walking experience, copy, decks or brand guidelines - even when they just continue work on these wings without naming the brand.
---

# lastfomo brand

lastfomo is a research house. It studies a field until it understands it, then builds what the field needs itself. Three wings share that method: **MACHINA** (private, on-premise AI), **HORTUS** (plant science, cultivation and the feeding hardware behind it) and **ARCA** (vaults, private collections, artists and gem hunters). A fourth wing, working title **Glimp**, is in progress and always appears sealed. The house line is *What grows. What thinks. What lasts.* and the master voice is *Nothing left to miss.*

The visual system (Figma: "Illuminated Protocol v1.0") is dark, airy and deliberate: near-black canvases, one acid wing colour as the signal, a pixel-blackletter wordmark used sparingly, clean Geist type and a stippled horse that lives inside arch-shaped windows. Everything below was learned by shipping films, loops, social packs, a landing page and a 3D walking experience with this owner, including the corrections they made. Follow it so new work looks like it came from the same hand.

## The rules that matter most

Each rule exists because breaking it was either corrected by the owner or caused a real defect.

1. **The horse is always whole.** Never crop, clip or bleed the horse off a plate, arch or frame edge. Early end cards cropped it at the nave edge and the owner asked for every ending to show it complete, with clear margins on all sides.
2. **One wing colour per composition.** Chartreuse `#d4f70d` is Machina, phosphor `#46ed08` is Hortus, magenta `#ff0a96` is Arca. Only house-level pieces (all three wings) may show all three. Never use a wing colour for another wing's content.
3. **The wing colour is the only saturated colour.** Grade footage down (saturation about 0.45) so the signal colour carries the frame. Neon accents, not colour washes; no gradients as decoration.
4. **Dark neon stages.** Machina is the reference look: near-black stage, dense fog, low ambient light, the wing colour arriving as edges, lines, beams and glows. Hortus and Arca follow it (Hortus as a dark night meadow, Arca as a dark castle). Do not light scenes bright and flat.
5. **Pixel type is for the brand name only.** Jacquard 24 sets wordmarks and brand headers (lastfomo, machina, hortus, arca). Never for supers, body, buttons or numbers. Headlines are Geist Light, labels Geist Mono.
6. **Real facts only.** Use the build specs and researched facts in `references/copy.md`. Invented results (records processed, time saved) were removed at the owner's request. "0 bytes leave the room" is a design premise, not a measurement, so never present it as one. Flag anything new as a placeholder.
7. **No client names.** The Machina case is "a medical practice". Keep it anonymous.
8. **Centre the content and keep it safe.** Design at 1920 x 1080 with the content group centred, inside the safety system the format needs (centre-safe square or the middle band). This is what lets one master become square, vertical and banner versions. See `references/layouts.md`.
9. **One message per screen or shot.** A label, a wordmark, one line and at most one chip or button. If it needs a paragraph, it belongs on a case page.
10. **Same holder, same shape.** Wing windows are arches with a fully rounded top on every surface. Arca once used a rectangle and looked broken on mobile; the owner asked for consistency. On the website the arch belongs to the home page; subpages (the cases, the shop, each product) hold their pictures in square cards (the owner, 26 October 2026).
11. **Sealed until you look.** Grey (sealed) to colour (open) via a sweep line in the wing colour is the brand's signature reveal. Use it for unveiling objects, cases and the fourth wing.
12. **Light on the wire.** GIF loops under 1 MB, thumbnails under 2 MB, web video about 20 MB per minute, a 170 MB master kept separately. Make the light version; never ship only the master.

## Quick tokens

| Token | Value | Use |
|---|---|---|
| VOID | `#080808` | deepest canvas, plates, curtains |
| INK | `#111111` | default canvas |
| GRAPHITE | `#1c1c1c` | frames, chrome, monolith faces |
| ASH | `#8c8c8c` | secondary text on dark |
| PAPER | `#ffffff` | primary text and marks on dark |
| Sealed grey | `#9a9a9a` | sealed plates, Wing 04 |
| MACHINA | `#d4f70d` | chartreuse signal |
| HORTUS | `#46ed08` | phosphor signal |
| ARCA | `#ff0a96` | magenta signal (text on dark: `#ff4fae`) |
| Light theme | bg `#f4f4f4`, text `#111111` / `#555555`; accent text `#4f5c00`, `#1c6a00`, `#b3006a` | web pages in light mode |
| Type | Jacquard 24 (wordmarks only), Geist Light / Regular, Geist Mono Medium (labels, uppercase, tracked 0.12em) | |
| Motion | snap 120 ms, glide 320 ms, drift 960 ms, ease `cubic-bezier(0.2,0,0,1)`, exit `cubic-bezier(0.4,0,1,1)` | |

Ready-made files: `assets/tokens.css`, `assets/tokens.json`, `assets/horse.svg`, `assets/wordmark.svg`, `assets/lockup.svg`, `assets/glyphs.svg`. Reference stills: `assets/examples/`.

## Where to look

| Task | Read |
|---|---|
| Colours, type, marks, glyphs, components, stage looks | `references/brand.md` |
| Any words: headlines, supers, captions, case copy, facts | `references/copy.md` |
| Any size or format: posts, stories, banners, thumbnails, GIFs, crops, web layout | `references/layouts.md` |
| Films, loops, motion, sound, edits, exports | `references/video.md` |
| Landing page, case pages, forms, the walking experience, publishing artifacts | `references/web-and-games.md` |
| Tooling, sandbox pitfalls, real captures, render pipelines, QA | `references/production.md` |
| What exists already, links, decisions, open items | `references/history.md` |

Read only what the task needs. A thumbnail needs `layouts.md` and `brand.md`; a film needs `video.md`, `layouts.md` and `copy.md`; a web change needs `web-and-games.md`.

## Default workflow

1. **Name the wing** (or the house) and therefore the single signal colour.
2. **Pick the format and its safety system** from `references/layouts.md` before drawing anything.
3. **Write the words first** from `references/copy.md`: label, wordmark, one line. Check every number against the facts ledger.
4. **Build at 2x or at the 1920 x 1080 master**, then downscale once with area averaging and a light unsharp mask. Text stays crisp and edges clean.
5. **Check at the size people will see it**: a thumbnail at 320 x 180, a GIF at native size, a page on a 390 x 844 phone. Render a contact sheet of key moments for anything that moves.
6. **Deliver the light version first**, the master second, with a one-line note on anything that is a placeholder.

## Before you deliver

- The horse is whole, with margins, everywhere it appears.
- One wing colour (or the house trio), footage desaturated, no stray saturated colour.
- Jacquard only on the brand name.
- Every fact traceable to `references/copy.md`; placeholders named in your reply.
- Content inside the format's safe area; legible at the smallest real viewing size.
- File sizes inside the budgets in rule 12; videos decode with zero errors.
