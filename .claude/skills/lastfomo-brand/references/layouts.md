# Layouts and formats

Contents: principles, the three safety systems, layout patterns with formulas, format specs, scaling content, minimum sizes, web layout.

## Principles

Design every visual at the **1920 x 1080 master** as one centred **content group**, then derive other formats from it. Position the group by formula rather than by eye, so that the same composition re-flows to any canvas. Leave the rest of the frame as calm void (INK or graded footage). The owner consistently preferred smaller, more centred content with more air around it.

## The three safety systems

Choose one before you lay anything out.

| System | Safe area at 1920 x 1080 | Use it when | What it enables |
|---|---|---|---|
| Full frame | 96 px margins | a 16:9-only deliverable (YouTube, website hero) | the richest layouts, end-card rows |
| Centre-safe | the centre square x 420 to 1500 (1080 x 1080) | one master must also yield 1:1 and 9:16 | a square crop is the centre; 9:16 is the square on a 1080 x 1920 canvas with dark letterbox, or a stacked re-layout |
| Band-safe | the middle band y 360 to 720 | the top and bottom thirds will carry someone else's overlays, captions or crops | top and bottom thirds show only footage; no logos there; end cards become one horizontal row |

In centre-safe and band-safe work, every brand moment (horse intro, reticle, seal, lockup) sits at the exact frame centre.

## Layout patterns

**Row (window + text).** The default for 16:9 loops, thumbnails, wing posts and end cards.

```
window   w x h (arch, top radius w/2)
gap      g
text     width t = max(wordmark width, line width, label width)
x0       = (W - (w + g + t)) / 2        window at (x0, (H - h)/2)
text x   = x0 + w + g
```
Values at the master: window 480 x 660 (thumbnails 430 x 600), gap 64 to 90, label (mono 20 px, wing colour) about 170 px above the wordmark baseline, wordmark (Jacquard 150 to 180 px), line (Geist Light 44 to 48 px) about 70 px below the wordmark baseline, then a chip or small lockup. Centre the text block vertically on the window's centre.

**Stacked (square and story).** Window on top, text centred below.

| Canvas | Window | Label | Wordmark | Line | Chip |
|---|---|---|---|---|---|
| 1080 x 1080 | 380 x 520 at y 90 | +80 below window, 18 px | +210, 130 px | +274, 40 px | +305 |
| 1080 x 1920 | 600 x 840 at y 300 | +100, 20 px | +255, 160 px | +328, 46 px | +370 |

Stories keep all content between y 250 and y 1580, clear of the platform's top and bottom interface.

**House arches.** Three stipple plates (hortus, machina, arca, left to right), gaps 30 to 44 px, the Lux glyph above the centre plate, then the house line and a small lockup below. Plates at the master: 300 x 560 each.

**Triptych.** Three windows with one image per wing, a single headline below ("Three wings. One house."), a mono house label under it.

**Sealed teaser.** One grey stipple plate with the whole horse and a lock in the lower-left corner, a mono label ("Wing 04") and a Geist Light line ("In the works.").

## Format specs

| Deliverable | Canvas | Notes |
|---|---|---|
| Film master | 1920 x 1080, 30 fps | H.264, CRF 17 master plus CRF 23 web copy |
| Film square | 1080 x 1080 | centre crop of a centre-safe master |
| Film vertical | 1080 x 1920 | the square on dark letterbox, or a stacked re-layout |
| GIF loop | 1920 x 1080, content scale 0.465 | the latest approved size; under 1 MB; 5 to 5.12 s seamless |
| GIF loop (small) | 640 x 360 | earlier versions at content scale 1.0, 0.67 and 0.52 |
| YouTube thumbnail | 1280 x 720 | design at 2x; row pattern; JPG about 100 KB |
| Post | 1920 x 1080 and 1080 x 1080 | row or stacked pattern |
| Story | 1080 x 1920 | stacked; safe band y 250 to 1580 |
| LinkedIn banner | 1584 x 396 | content right of x 420 (profile photo); lockup is the only text |
| X header | 1500 x 500 | content right of x 440 and within y 60 to 440 (mobile crop); lockup only |
| LinkedIn company cover | 1128 x 191 | not yet made; needs its own layout, do not crop the 1584 banner |

Social posts in the pack: per format, three wing posts (real image plus graphics) and three house posts (the wings, three wings one house, Wing 04 teaser). Banners: the wings, three images, the horse.

## Scaling content

Scale the **whole content group** about the frame centre, never individual elements, so proportions and spacing survive. The owner tuned the loops in steps: content 33% smaller, then 22% smaller, then 11% smaller (1.0 to 0.67 to 0.52 to 0.465 of the master layout). When a smaller group makes text too small, raise the canvas resolution (the loops moved from 640 x 360 to 1920 x 1080) instead of shrinking type below the minimums.

To render crisply: draw at the master or at 2x, downscale once with area averaging (`cv2.INTER_AREA`), then apply a mild unsharp mask (1.2 to 1.3 times the image minus 0.2 to 0.3 times a 0.8 px blur).

## Minimum legible sizes

| Output | Minimum |
|---|---|
| 1080p video | supers 44 px, labels 18 px |
| Thumbnail at 1280 x 720 | wordmark about 150 px, line 40 px; check at 320 x 180 |
| GIF at 640 x 360 | 11 px text is the floor; prefer the 1920 version |
| Web | body 15 px, labels 11 px, touch targets 44 px |
| Banners | no text but the lockup, at least 40 px tall |

## Web layout

- **Scroll by scroll.** Each section is a full screen (`height: 100%` of the scroll container, not `100vh`), with `scroll-snap-type: y mandatory` and `scroll-snap-stop: always`. Under 620 px of height, switch to proximity snapping and let sections grow.
- **Fit a phone.** Every screen must fit 390 x 844 without scrolling: shrink holders (`min(34svh, 320px)` on mobile, `min(64svh, 620px)` on desktop), stack the copy below, and drop the lead paragraph on very short screens.
- **Spacing.** Margins `clamp(20px, 5vw, 96px)`, content max width 1320 px, display type in `clamp()`.
- **Chrome.** A fixed, blurred header with the horse mark alone (the owner’s choice, October 2026; the wordmark lives in the hero) and a "Start a project" pill; a dots index on desktop and a two-pixel progress bar on mobile, both in the active wing colour.
- **Holders.** One arch holder class for all wings. Add `-webkit-mask-image: -webkit-radial-gradient(white, black)` so playing video stays clipped to the rounded top in Safari.
- **Themes and safety.** Colour tokens on `:root`, redefined for dark, with explicit body backgrounds. `viewport-fit=cover` with safe-area padding. `prefers-reduced-motion` support and visible focus rings in the wing colour.
