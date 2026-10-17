# Brand system

Contents: the house and wings, colour, typography, marks, glyphs, components, motion, stage looks.

## The house and its wings

lastfomo (always lowercase) is a research house. The design system in Figma is called **Illuminated Protocol v1.0** (file key `wlBCwNY8ibiNCAs1e7Rlua`, page node `55:3913`). It defines foundations, 14 component families with wing modes, a brandbook, social templates and a landing page.

| Code | Wing | Line | Signal | Domain | Imagery |
|---|---|---|---|---|---|
| MCH | machina | What thinks. | chartreuse `#d4f70d` | private, on-premise AI (Case N° 0001: a medical practice) | GPU rig, rails, fans, RAM, PSU, HUD reticles, grids, code rain |
| HRT | hortus | What grows. | phosphor `#46ed08` | plant science, farm analysis, crop optimisation, medical plants, feeding systems and hardware | germination timelapse, roots, root maps, medical plants on black, dosing pumps, CNC, electronics |
| ARC | arca | What lasts. | magenta `#ff0a96` | vaults, private collections and galleries, direct artist relationships, gem hunters, collectibles | vault doors, salons, display cases, jewels, armour, paintings, coins |
| 04 | Glimp (working title) | In the works. | sealed grey `#9a9a9a` | not yet announced | always sealed: grey plate, lock glyph |

The house appears on its own (no single wing colour) on intro cards, end cards, the hub of the walking experience and banners. House pieces may show the three wing colours together, always in the order hortus, machina, arca from left to right.

## Colour

| Name | Hex | Role |
|---|---|---|
| VOID | `#080808` | plates, curtains, the deepest backgrounds |
| INK | `#111111` | default canvas (Night theme) |
| GRAPHITE | `#1c1c1c` | window chrome, frames, monolith faces |
| IRON | `#2a2a2a` | subtle dividers on dark |
| ASH | `#8c8c8c` | secondary text on dark (contrast about 5.9:1 on INK) |
| PAPER | `#ffffff` | primary text and marks on dark |
| MIST | `#f4f4f4` | canvas for the light theme |
| Sealed grey | `#9a9a9a` | sealed plates and states |
| Chartreuse | `#d4f70d` | MACHINA |
| Phosphor | `#46ed08` | HORTUS |
| Magenta | `#ff0a96` | ARCA (use `#ff4fae` for small magenta text on dark) |

Accent text on the light theme needs darker partners to stay readable: chartreuse `#4f5c00`, phosphor `#1c6a00`, magenta `#b3006a`. Use the bright originals only for fills, glows, dots and lines on light backgrounds.

Rules of use:
- The brand is Night first. Films, loops, posts and the walking experience are dark. Web pages follow the viewer's theme; the light version swaps to MIST and ink text but keeps plates and video windows dark, because they are images.
- One wing colour per composition. The wing colour marks the signal: a dot, a line, a ring, a label, a lit edge, a plate. It is never a large flat background except inside a stipple plate.
- Footage is graded so the wing colour is the only saturated colour in frame (see `video.md`).

## Typography

| Face | Weight | Role | Notes |
|---|---|---|---|
| Jacquard 24 | 400 | wordmarks and brand headers only: lastfomo, machina, hortus, arca | pixel blackletter; reveal it row by row (12 steps); never for sentences |
| Geist | 300 Light | headlines, supers, big numbers | tight tracking, about -0.03em at display sizes |
| Geist | 400 Regular | body copy | 15 to 19 px on web, 52 ch max line length |
| Geist Mono | 500 Medium | labels, codes, specs, buttons | uppercase, tracking 0.12 to 0.14em |

Sizes at 1920 x 1080: wordmark 150 to 230 px, headline or super 46 to 76 px, body 32 to 40 px, labels 18 to 22 px. On the web use `clamp()` (see `layouts.md`).

Sources that work in a sandbox: Geist and Geist Mono from the npm package `geist` (`dist/fonts`, woff2 and ttf); Jacquard 24 from `https://raw.githubusercontent.com/google/fonts/main/ofl/jacquard24/Jacquard24-Regular.ttf`. Published web pages can load all three from Google Fonts.

Label pattern: `CODE — Wing · Discipline`, for example `MCH — Machina · Autonomous AI`, `HRT — Hortus · Nature research`, `ARC — Arca · Art & collections`. Case codes: `CASE N° 0001`.

## Marks

- **Horse mark**: Figma node `9:4`, viewBox 420 x 120, even-odd fill. Vector in `assets/horse.svg`.
- **Wordmark**: Figma node `9:5`, 303 x 62, eight pixel paths. Vector in `assets/wordmark.svg`.
- **Lockup**: horse at (0, 0, 420 x 120) plus wordmark scaled to 293 wide at (468, 30), total 761 x 120. Vector in `assets/lockup.svg`.

Use the marks in PAPER on dark, INK on light, or the wing colour inside a stipple plate. Keep clear space of at least a quarter of the horse's height on every side. Never crop, rotate, outline, skew or recolour the horse in two colours. The horse is always whole on end cards, plates, portals and thumbnails.

The lockup builds on end cards: the horse wipes in left to right (0.9 s, ease-out), then the wordmark rises 26 units from below (0.6 s), with an FM bell as it lands.

## Glyphs

The Figma glyph set (24 x 24): Lux (four-point star), ArrowNE, ArrowE, ArrowS, Plus, Cross, Register, Progress, Check, Lock, Key. Vectors in `assets/glyphs.svg` as `<symbol>` elements.

- **Lux** sits above the centre arch on house pieces and inside the brand curtain.
- **Plus** is the HUD reticle (four plus marks that converge on a target) and the web cursor; on hover it rotates into a cross.
- **ArrowNE** marks links ("Open the case ↗").
- **Lock** and **Key** mark sealed and open states.

## Components

- **Stipple plate (nave).** An arch window filled with a two-pixel stipple field in one wing colour, with the whole horse at about 60% height, dithered at its edge and punched with a halftone hole grid. Animate it by re-randomising about 5% of cells about 10 times a second; let it develop from empty to full over 0.9 s, the horse arriving 0.45 s later.
- **Arch window.** Width w, height about 1.33 w to 1.73 w, top fully rounded (radius w/2). The holder for footage, loops and plates on every surface.
- **Index row.** `01/` + title in Geist Light + mono spec + ArrowNE, separated by hairlines. Number only real sequences.
- **Stat.** A rule on top, a big Geist Light value, a mono label below and an optional one-line note.
- **Chip.** Pill outline (1 px at 30% paper), a dot, a mono label. Example chips: "Local by default", "Seed to sensor", "By invitation".
- **Sealed and open.** Sealed is greyscale at about 40% brightness with a lock; opening sweeps a wing-colour line left to right over 0.6 to 1.4 s, revealing full colour; open shows a key.
- **Signal.** A small dot in the wing colour with a soft glow above an object, bobbing gently, plus a ring on the ground beneath. Found signals turn paper-white and dim.
- **Brand curtain.** A VOID panel rises over the frame (0 to 42% of 0.95 s), holds with the Lux glyph turning, then lifts away upward. Used for page and world transitions.
- **Crash.** Horizontal row shifts plus stepped 80 px blocks in the three wing colours, ending on three frames of VOID and a sub hit. Used once per film to change register.

## Motion

| Token | Value |
|---|---|
| snap | 120 ms |
| glide | 320 ms |
| drift | 960 ms |
| ease (deliberate) | `cubic-bezier(0.2, 0, 0, 1)` |
| exit | `cubic-bezier(0.4, 0, 1, 1)` |

Signature moves: lines rise from under a mask (0.6 to 0.9 s, staggered 0.12 s); the wordmark builds in pixel rows; plates develop; the reticle converges and flashes the wing colour; sealed sweeps open. Always honour `prefers-reduced-motion` on the web (no shimmer, no bob, instant transitions).

## Stage looks

- **Observed (real footage).** Graded down to the signal colour, desaturated about 0.45, lifted blacks slightly negative, contrast about 1.1, light grain and vignette. Overlaid with HUD language: plus reticles, mono labels, scan lines, root maps.
- **Recorded (brand paper).** INK or VOID canvas, stipple plates, kinetic type, the lockup. Generous empty space.
- **Dark neon stage (3D and game worlds).** Near-black background, dense exponential fog, hemisphere light about 0.25 to 0.3 tinted in the wing colour, ambient about 0.05, then the wing colour as unlit (basic) materials: edge outlines on objects, floor lanes or grids, thin vertical beams above points of interest, rings, fireflies or dust. Add a light per-world grade (CSS on the canvas: contrast 1.06 to 1.14, saturate 1.1 to 1.3). Machina is the reference; Hortus is a night meadow; Arca is a candlelit castle in magenta.
