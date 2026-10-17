#!/usr/bin/env python3
"""Turn a wing GIF preview (1920 x 1080, window + wordmark) into the loop that plays inside the site's arch holder.

    python3 tools/media/gif_to_loop.py <preview.gif> <wing> [--inset 0.03] [--anchor center|bottom] [--scale 2]

Finds the window (the non-background shape left of the wordmark) across all frames, crops slightly inside it so the
GIF's own frame edge falls outside the site's arch mask, trims to the holder's 3:4 so nothing is cropped again in the
page (--anchor bottom keeps a badge at the foot of the window, such as Arca's lock), and writes:
    site/media/<wing>-loop.mp4   H.264, yuv420p, 25 fps, muted, faststart (plays inline on phones)
    site/media/<wing>-loop.webm  VP9 twin, for browsers built without H.264 (open-source Chromium, some Linux)
    site/media/<wing>-loop.jpg   the first frame with the same crop, so poster and loop line up
Needs ffmpeg with libx264 and Pillow. Rule 12 (light on the wire): the loop must stay under 1.2 MB.
"""
import argparse
import os
import subprocess
import sys

from PIL import Image, ImageChops

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BG = (17, 17, 17)  # INK, the canvas the previews are rendered on
BUDGET = 1.2 * 1024 * 1024


def window_box(gif):
    """Bounding box of everything that differs from the canvas, left of the wordmark, over all frames."""
    im = Image.open(gif)
    canvas = Image.new('RGB', im.size, BG)
    acc = None
    for i in range(getattr(im, 'n_frames', 1)):
        im.seek(i)
        diff = ImageChops.difference(im.convert('RGB'), canvas).convert('L').point(lambda v: 255 if v > 24 else 0)
        acc = diff if acc is None else ImageChops.lighter(acc, diff)
    w, h = acc.size
    cols = [any(acc.getpixel((x, y)) for y in range(0, h, 2)) for x in range(w)]
    # The window is the first solid run of columns; the wordmark starts after a gap of empty columns.
    start = cols.index(True)
    end = start
    while end < w and (cols[end] or any(cols[end:end + 12])):
        if not any(cols[end:end + 12]):
            break
        end += 1
    while end > start and not cols[end - 1]:
        end -= 1
    box = acc.crop((start, 0, end, h)).getbbox()
    return (start + box[0], box[1], start + box[2], box[3]), getattr(im, 'n_frames', 1)


def even(n):
    return n - (n % 2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('gif')
    ap.add_argument('wing', choices=['machina', 'hortus', 'arca'])
    ap.add_argument('--inset', type=float, default=0.03, help='fraction trimmed from every side of the window')
    ap.add_argument('--anchor', choices=['center', 'bottom'], default='center', help='which part to keep when trimming to 3:4')
    ap.add_argument('--aspect', type=float, default=0.75, help='width / height of the holder (.wing .arch is 3:4)')
    ap.add_argument('--scale', type=int, default=2)
    a = ap.parse_args()

    (x0, y0, x1, y1), frames = window_box(a.gif)
    iw, ih = x1 - x0, y1 - y0
    dx, dy = round(iw * a.inset), round(ih * a.inset)
    cx, cy, cw, ch = x0 + dx, y0 + dy, even(iw - 2 * dx), even(ih - 2 * dy)
    if cw / ch < a.aspect:  # taller than the holder: trim height
        nh = even(round(cw / a.aspect))
        cy += (ch - nh) if a.anchor == 'bottom' else (ch - nh) // 2
        ch = nh
    else:  # wider than the holder: trim width, always centred
        nw = even(round(ch * a.aspect))
        cx += (cw - nw) // 2
        cw = nw
    ow, oh = even(cw * a.scale), even(ch * a.scale)
    print(f'{a.wing}: {frames} frames, window {iw}x{ih} at ({x0},{y0}), crop {cw}x{ch} at ({cx},{cy}) -> {ow}x{oh}')

    media = os.path.join(ROOT, 'site', 'media')
    mp4 = os.path.join(media, f'{a.wing}-loop.mp4')
    jpg = os.path.join(media, f'{a.wing}-loop.jpg')
    vf = f'crop={cw}:{ch}:{cx}:{cy},scale={ow}:{oh}:flags=lanczos,unsharp=3:3:0.4,format=yuv420p'
    for crf in (20, 23, 26, 29):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a.gif, '-vf', vf, '-r', '25', '-fps_mode', 'cfr',
                        '-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf), '-profile:v', 'high',
                        '-movflags', '+faststart', '-an', mp4], check=True)
        if os.path.getsize(mp4) <= BUDGET:
            break
    size = os.path.getsize(mp4)
    webm = os.path.join(media, f'{a.wing}-loop.webm')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a.gif, '-vf', vf, '-r', '25', '-fps_mode', 'cfr',
                    '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', '-row-mt', '1', '-deadline', 'good',
                    '-an', webm], check=True)

    im = Image.open(a.gif)
    im.seek(0)
    poster = im.convert('RGB').crop((cx, cy, cx + cw, cy + ch)).resize((ow, oh), Image.LANCZOS)
    poster.save(jpg, quality=90, optimize=True, progressive=True)

    for f in (mp4, webm):
        r = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-f', 'null', '-'], capture_output=True, text=True)
        if r.stderr.strip():
            sys.exit(f'decode errors in {f}:\n{r.stderr}')
    dur = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4],
                         capture_output=True, text=True).stdout.strip()
    wsize = os.path.getsize(webm)
    print(f'wrote {os.path.relpath(mp4, ROOT)} ({size / 1024:.0f} KB, {float(dur):.2f} s, crf {crf}), '
          f'{os.path.relpath(webm, ROOT)} ({wsize / 1024:.0f} KB) and {os.path.relpath(jpg, ROOT)}')
    print(f'site/media.json → "loops": {{ "{a.wing}": {{ "mp4": "media/{a.wing}-loop.mp4", "webm": "media/{a.wing}-loop.webm" }} }}')
    if max(size, wsize) > BUDGET:
        sys.exit('loop is over the 1.2 MB budget; lower --scale')


if __name__ == '__main__':
    main()
