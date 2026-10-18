# Web pages and the walking experience

Contents: the landing page, case pages, Start a project, the walking experience, publishing artifacts, known fixes.

## Landing page

Live artifact: `https://claude.ai/artifact/Ckgt4AxvQpeKTKaPFByNMx`. One self-contained HTML file with hash routes: `#/` (home), `#/machina`, `#/hortus`, `#/arca` (case pages), `#/start` (Start a project).

Home, one full screen each: hero (pixel wordmark, house line, three live stipple naves) → the house (one method, four principles) → Machina, Hortus, Arca (alternating sides; the approved loop plays muted in the arch holder; "Play the film" and "Open the case ↗") → the films (three posters; a full-screen player with sound) → roadmap (Built / Next / Later, with a progress track) → closing ("Nothing left to miss.", Start a project).

Signature behaviour: live stipple naves that develop on view and brighten around the cursor; reveals that rise from a mask; the wordmark built row by row; the active wing colour driving the dots index, progress bar and focus rings; the brand curtain between routes; a plus cursor on desktop that turns into a cross over links; counters that count up once.

Media: the wing loops (0.35 to 1.2 MB MP4, 600 x 826, 25 fps, 5.12 s) and the three films (13 to 15 MB web encodes) live in the artifact's asset store and are referenced by `/_blob/` URLs. Loops and films load only when their screen is active.

## Case page template

Five screens: cover (code label, wordmark, headline, brief, a live plate) → film (16:9 player, no autoplay, sound on demand) → scope (index rows; numbered only when they are a real sequence, such as spec, build, install, live) → metrics or field notes (stats grid from the facts ledger, count-up once) → stills and "Next case ↗".

## Start a project

Cover (headline "Tell us what you want to grow, think or keep."), the brief (wing pills, name, email, organisation, timeline, a few lines), then "What happens next" (three steps). Sending composes an email to the house address with the brief filled in, with a copy button as a fallback. A database cannot collect public enquiries, because outside viewers can read artifact data but never write it. The contact address is lastfomo@gmail.com.

## The walking experience

Live artifact: `https://claude.ai/artifact/GNyvJEi3xmRftrt6MF2EkB`. A first-person walking world in the spirit of Radiohead's PolyFauna: few instructions, a signal to follow, ambient sound that changes with each world. three.js r128 from cdnjs, everything else built in code.

| World | Look | Signals |
|---|---|---|
| The house (hub) | stipple floor, dust, the three naves as walk-through portals with live plates and labels, a sealed Wing 04 arch, a lockup monolith | the house monolith (does not count) |
| Hortus | night meadow: near-black green sky and fog, dark grass with a faint glow, a phosphor ground grid, fireflies, neon-edged stations with light beams | root lab, the field, medical plants, feeding rig, sensor node (5) |
| Machina | server corridor: chartreuse grid floor, blinking racks, code-rain walls, data pulses, a glowing core with rings and a beam | eight GPUs, the processor, memory, power, the network, Case N° 0001 at the core (6) |
| Arca | dark castle in magenta: neon floor lanes, column rings, outlined windows, magenta candles and dust, neon-edged cases | the necklace, the helmet, the gauntlet, the painting, the chest, the vault (6) |

Game layer: 17 signals with a counter in the HUD; panels with a code label, title, body, two stats and an image for Arca objects; sealed objects sweep open when inspected; the chest lid opens; the vault wheel turns; finishing a wing marks its portal "Explored"; finishing all three shows "You walked the whole house." with links to the site and to Start a project.

Controls: WASD or arrows, Shift to hurry, drag to look, E to inspect, M for sound, H for help. On touch: a left-thumb joystick, right-thumb look, tap a signal or the Inspect button. Sound is generated live with Web Audio and is off until the visitor chooses it on the start screen.

Budgets: grass 3,800 instances on desktop and about 2,100 on phones; at most three point lights per world; all instanced meshes with `frustumCulled = false`; pixel ratio capped at 2 (1.5 on touch).

## Publishing artifacts

- Pages are single self-contained HTML files. Scripts load only from cdnjs, jsDelivr, the Tailwind play CDN or code.jquery.com, pinned to exact versions (three.js `r128` on cdnjs is the known-good UMD build). Fonts come from Google Fonts. Images are inlined as data URIs; videos go into the asset store (20 MB per file) after the first publish, then the page is updated with their `/_blob/` URLs.
- Make small changes with the Artifact tool's `edit` action, where every `old_str` must occur exactly once. Dry-run all replacements in Python first, counting occurrences, and syntax-check the edited script with `node --check`.
- For comment threads, read them, make the change, reply in the thread, then resolve threads that are fully addressed. Leave a thread open when you still need something from the commenter (for example, the contact email).

## Known fixes (do not regress)

- Counters measured elapsed time against the animation-frame timestamp and could start negative; they now use `performance.now()` and clamp progress to 0..1.
- A label rule (`.form label > span`) also matched the pill spans and broke them; it is now scoped with `:not(.pill)`.
- The `hidden` attribute lost to component `display` rules; a global `[hidden]{display:none!important}` restores it.
- Arca's rectangular window ignored the mobile layout; every wing now uses the same arch holder.
- Safari let playing video escape rounded corners; the holder carries a mask image to force the clip.
- Hortus was lit at nearly double brightness and looked flat lime green; all worlds now use the dark neon stage.
- In three.js r128, keep the default linear output and use unlit (basic) materials for exact brand colours; set `frustumCulled = false` on instanced meshes, or whole fields vanish when their origin leaves the view.
