# Production playbook

Contents: sandbox realities, toolchain, engine notes, pipelines (films, GIF loops, still graphics, real captures, deterministic gameplay), QA tests, asset recovery.

## Sandbox realities (learned the hard way)

- **Your working folder may reset between turns.** `/home/claude` can be wiped, while `/mnt/user-data/outputs` and `/mnt/user-data/uploads` persist. Keep anything you will need again (frames, captures, scripts) small enough to rebuild, or copy key files to outputs.
- **Background jobs die when the turn ends.** Long jobs must finish inside the turn that starts them. Make long work resumable and deterministic (fixed frame numbering and schedules) so a stopped job can restart at a known frame.
- **Each command has a 300 s limit.** Launch long jobs with `(setsid nohup cmd > log 2>&1 < /dev/null &)` and poll the log with `sleep` in later calls.
- **The shell is `sh`.** Brace lists such as `{a,b}` do not expand; wrap such commands in `bash -c '...'`.
- **Never `pkill -f` a pattern that also appears in your own command line**, or you kill your own shell. Find the PID with `ps aux | grep -v grep | grep "..."` and kill it by number.
- **Resources are small:** 1 CPU and about 3 to 4 GB of RAM. Render video in segments of about 450 frames (about 3.3 minutes each at 1080p), cache decoded images with an LRU of about 40, and avoid holding hundreds of full frames in memory.
- **Network allowlist:** npm, PyPI, GitHub (including raw.githubusercontent.com) and the Ubuntu archives work. Google Fonts CSS, cdnjs and Figma image rasters do not, from inside the sandbox (published artifacts can still use cdnjs and Google Fonts). Use the Figma MCP tools for design data.

## Toolchain

| Need | Source |
|---|---|
| Skia drawing and text | `pip install skia-python uharfbuzz --break-system-packages` |
| Geist fonts (woff2 and ttf) | `npm pack geist`, then `package/dist/fonts/` |
| Jacquard 24 | raw.githubusercontent.com `google/fonts/main/ofl/jacquard24/Jacquard24-Regular.ttf` |
| gifsicle | `apt-get install -y gifsicle` |
| Headless browser with WebGL | npm `@sparticuz/chromium@131` plus `puppeteer-core@23` |
| three.js for local mirrors and tests | npm `three@0.128.0` (`build/three.min.js`) |
| DOM for logic tests | npm `jsdom@24` |
| Video | ffmpeg with libx264 (present) |

## Brand-launch-film engine notes

The engine lives at `/mnt/skills/plugins/brand-launch-film/scripts/engine` (`core`, `audio`, `encode`, `post`, `typeset`).
- `core.parse_svg_path(d)` returns `(skia.Path, subpaths)`; take element 0, and set an even-odd fill for the horse.
- `audio.Mix(duration)` with `.add(signal, t0, gain, pan)` and the voices `pad_note`, `chord`, `pluck`, `tick`, `blip`, `whoosh`, `sub_hit`, `fm_bell`, `riser`, `glitch`, then `reverb`, `master`, `write_wav`.
- `encode.Encoder(path, w, h, fps, crf, preset)` with `.write(rgb_uint8)` and `.close()`; `encode.concat(list, out)` and `encode.mux(video, wav, out)`.
- `post.grain(img, frame_index, strength)` and `post.to_u8(img)`.

## Pipelines

**Brand film.** Write the edit as a table of sections with start and end times; render frames as pure functions of time (`render(frame_index)`); keep supers, cursor paths and score events in the same timeline so sound lands on picture. Render a stills sheet first, then segments in the background, then concatenate and mux. Encode a CRF 23 web copy.

**GIF loops under 1 MB.**
1. Render frames with no grain (grain destroys GIF compression).
2. For static-camera footage, smooth over time and hold pixels until they really change (threshold about 9 levels), two passes round the loop so the seam stays clean.
3. `ffmpeg palettegen=max_colors=256:stats_mode=full`, then `paletteuse=dither=none:diff_mode=rectangle`, `-loop 0`.
4. `gifsicle -O3 --lossy=N`, stepping N from 0 to 200 until the file fits, measuring PSNR against the clean frames over the content area. Keep the highest frame rate that stays at 38 dB or better (12.5, 16.7, 20 or 25 fps; whole-centisecond frame delays).

**Still graphics** (thumbnails, posts, banners). Draw at 2x with Skia, downscale with `INTER_AREA`, apply a mild unsharp mask, save JPG at quality 94 to 95 (PNG for text-only banners). Build stipple plates at final resolution and upscale them with nearest-neighbour so the pixels stay crisp.

**Real captures of a web page.** Mirror the page locally: copy the published HTML, point fonts to local woff2, three.js to a local copy and `/_blob/` media to local files, and serve them with `python3 -m http.server`. Launch Chromium with `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`, emulate `prefers-color-scheme: dark`, and slow CSS animation with the DevTools call `Animation.setPlaybackRate(0.25)`. Replay each screen's reveal by toggling its `in` class. Record element rectangles (arch holders, buttons, video frames) so the film can composite the real loops and films back into them. This Chromium build plays H.264.

**Deterministic gameplay.** Inject a virtual clock before page scripts: replace `performance.now`, `requestAnimationFrame`, `setTimeout` and `clearTimeout` with a queue that advances exactly 1/30 s per step. Then set position, yaw and pitch from a scripted route, step once, and take a screenshot. Pace CSS animations to the capture speed with `Animation.setPlaybackRate`, and hide toasts with an injected style. Expose `setWorld`, `hud` and `showFinal` in the local mirror only. At 1280 x 720, frames take about 0.6 to 0.9 s; split long routes into parts that restore the found-signal state before they start.

## QA tests

- **Logic smoke test for interactive pages:** run the page script in jsdom with three r128 from npm, stubbing only the WebGL renderer and the 2D canvas, and set `global.document` so three's loaders work. Script a full play-through: start, walk, enter every world, inspect every signal, leave by every exit portal, reach the finale. Assert zero errors.
- **Visual check:** render a few frames of each world or screen headlessly and view them as a sheet before publishing.
- **Media checks:** `ffprobe` for duration and streams, a zero-error decode, and file sizes against budget.

## Asset recovery

The exact vectors travel with this skill in `assets/` (horse, wordmark, lockup, glyphs). If they are ever missing, the published landing page contains the horse path (`new Path2D("...")`) and the lockup SVG in its header, and the Figma file has the horse at node `9:4` and the wordmark at node `9:5`.
