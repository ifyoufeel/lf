# Video style

Contents: grammar, proven structures, supers and labels, grade and texture, HUD per wing, transitions, end cards, sound, export, QA.

## Grammar

- **Alternate two registers.** *Observed* is real footage or real screen captures, graded down to the wing colour. *Recorded* is brand paper: INK canvas, stipple plates, kinetic type, the lockup. Cut between them on the beat; never let one run for the whole film.
- **Open on the brand within three seconds.** A pixel wordmark build, a plate developing, or a reticle locking on.
- **One idea per shot.** Shots of 1.5 to 4 s; reveals of 0.6 to 0.9 s; at most one super on screen at a time.
- **Real over invented.** Prefer real footage and real captures of the site or game over imitations. If something must be simulated, keep it abstract and on brand.
- **End on the lockup** with the horse whole, a single line, and a hold of at least 1.2 s on a clean last frame.

## Proven structures

**Wing film, 36 to 40 s** (the three shipped films):
1. Hook (0 to 6 s): the wing's signature observed shot with an instrument overlay (Machina: the GPU rail under a reticle; Hortus: germination in an arch with the root map; Arca: the vault opening).
2. Build (6 to 25 s): four to six observed shots, each carrying one fact, one statement or one discipline; supers in threes ("Your models." "Your machines." "Nothing leaves the room.").
3. Turn (about 1 s): a crash or curtain that changes register.
4. Recorded close (last 12 to 15 s): the case card or index, then the end card and the hero plate.

**Arca lot sequence**: each lot enters sealed in grey, a magenta sweep opens it to colour, then a short caption (object, maker, place, date). Four lots of about 4 s.

**Walkthrough film, about 60 s** (the shipped site and game film):

| Time | Section |
|---|---|
| 0 to 2.6 s | Recorded intro: wordmark builds; "The house, online." |
| 2.6 to 25 s | Observed site: the real page in a minimal browser window; hero reveal; scroll-snap through the wings with their loops; a click opens the film player; curtain to a case page with metrics counting; the brief typed and sent; three phones rise in |
| 25 to 27.4 s | Crash, then the card "Then walk the house." |
| 27.4 to 57 s | Observed gameplay: start screen, a walk into an arch, one inspected signal per wing, the finale |
| 57 to 60.4 s | End card: lockup and "Nothing left to miss." |

**Loop, 5 to 5.12 s**: one window with the wing's signature motion (rail plus reticle locking twice; roots growing; a lot unsealing then resealing) beside the wordmark and line. The last 0.6 s dissolves into the frames just before the start, so the seam is invisible.

## Supers and labels

- Geist Light, 46 to 76 px at 1080p, PAPER, bottom-left at x 96 with the baseline about 92 px above the bottom edge, over a soft dark gradient scrim.
- They rise from under a mask over 0.6 s and fade out over 0.35 s. Two to six words.
- Labels and codes in Geist Mono, uppercase and tracked, in ASH or the wing colour (`CASE N° 0001`, `MCH — Machina`).
- Keep supers clear of on-screen interface you are showing (a game prompt, a browser bar).

## Grade and texture

| Parameter | Value |
|---|---|
| Saturation | about 0.45 for footage (0.8 for plant footage where green matters) |
| Lift | about -0.03 |
| Contrast | about 1.1, pivot 0.3 |
| Grain | 0.012 to 0.02, animated |
| Vignette | about 0.3 |

Captured websites and games get only a light unsharp mask and grain, because they are already brand-graded.

## HUD and instruments by wing

- **Machina:** four plus marks converging on a target and flashing chartreuse on lock; track boxes with mono readouts; a scan band; GPU index rows; Matrix-style code rain and grid lines in 3D.
- **Hortus:** a phosphor root map traced over roots (bright, low-saturation pixels below the soil line); a scan line passing once; the five-discipline index; fireflies and beams in 3D.
- **Arca:** sealed and open vitrines; lot captions; a dial or countdown on the vault; magenta lanes, column rings and window outlines in 3D.

## Transitions

- **Brand curtain:** VOID panel up, hold with the turning Lux glyph, then lift away (0.7 to 0.95 s). For page or world changes.
- **Crash:** row shifts plus stepped wing-colour blocks, then three frames of VOID and a sub hit (0.8 s). Once per film.
- **Sweep:** grey to colour with a wing-colour line. For reveals.
- **Scroll-snap:** the page moves up a full screen in 0.5 to 0.6 s with an ease-in-out. For website walkthroughs; keep the fixed header pinned.
- **Pixel build:** the wordmark appears in 12 rows. For openings.
- **Dissolve:** six frames inside a continuous scene only.

## End cards

All variants show the whole horse with margins on every side.
- **Lockup card:** the lockup centred, the line in Geist Light below, a small mono line in ASH.
- **Wing card:** left column with the wordmark, line, voice line and pillars; right, a stipple plate holding the whole horse; then a hero plate growing to the frame with side padding (the Arca v2 ending the owner chose as the model for all films).
- **Band-safe card:** one horizontal row of arch plate plus text, inside y 360 to 720.
- **Cover card:** three naves (sealed, wing, sealed) each holding a whole horse.

## Sound

| Wing | Tempo | Bed and voices |
|---|---|---|
| House | free | sine and triangle pad on A and E with a slow filter; FM bell every 7 to 12 s |
| Machina | 120 bpm | hum at 55 and 110 Hz, fan noise, a sixteenth-note saw pulse through a moving low-pass, data blips, machine ticks |
| Hortus | 72 bpm | wind, a stream, bird chirps, pentatonic kalimba or harp plucks building layer by layer, a half-time kick late |
| Arca | 60 bpm | reverberant saw drone on D and A, harpsichord-style arpeggios, seal chimes, vault countdown ticks, a low bell |

Common events: ticks on clicks, typing ticks, whooshes on scrolls and curtains, a glitch on the crash, a sub hit plus FM bell as the lockup lands. Mix with a light reverb (wet about 0.28) and master to -1 dBFS. Score sections follow the edit, not a fixed loop.

## Export

| File | Settings |
|---|---|
| Master | H.264 high, CRF 17, yuv420p, AAC 192k, `+faststart` |
| Web | H.264, CRF 23, preset fast, AAC 160k: about 20 MB per minute at 1080p |
| Asset store for web pages | each file under 20 MB (about 3.4 Mbit/s cap for 40 s at 1080p) |
| GIF | see `production.md`; under 1 MB |

## QA

- Render a contact sheet of 16 to 24 moments before the full render, and another from the finished file.
- Check every super for overlap, every end card for a whole horse, and every cut that crosses a render-segment boundary.
- Verify duration, streams, and zero decode errors (`ffmpeg -v error -i file -f null -`).
- Watch for long moments that read as glitches (for example, a camera inside a stipple plate fills the screen); move the shot rather than cover it with a super.
