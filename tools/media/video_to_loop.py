#!/usr/bin/env python3
"""Turn a wing's MP4 preview into the loop that plays inside the site's arch holder.

    python3 tools/media/video_to_loop.py <preview.mp4> <wing> [--width 960]

The owner's previews (26 October 2026) are already the arch's 3:4 picture, 960 x 1280, and loop on their own: the last
frames lead back into the first. A wider or taller preview is trimmed to 3:4 about its centre; a bigger one is scaled
to --width. Writes, each under 1.2 MB (rule 10, light on the wire):
    site/media/<wing>-loop.mp4      H.264 High, yuv420p, for every browser. A preview that is already H.264 at size
                                    and within the budget is kept as supplied (remuxed: its metadata left out, the
                                    index moved to the front so it starts playing at once)
    site/media/<wing>-loop-av1.mp4  AV1, 10-bit, for wide screens that decode it, only where the H.264 had to be
                                    squeezed to fit: the same budget buys a picture closer to the preview
    site/media/<wing>-loop.jpg      the first frame, the poster, so poster and loop line up; under 80 KB
Each encode keeps the best quality that fits the budget. Needs ffmpeg with libx264 and libsvtav1, and Pillow.
"""
import argparse
import io
import json
import os
import subprocess
import sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BUDGET = 1.2 * 1024 * 1024
POSTER = 80 * 1024
ASPECT = 3 / 4  # .wing .arch


def probe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                          'stream=codec_name,profile,width,height,pix_fmt,avg_frame_rate:format=duration,size',
                          '-of', 'json', path], capture_output=True, text=True, check=True).stdout
    j = json.loads(out)
    s, f = j['streams'][0], j['format']
    num, den = (int(x) for x in s['avg_frame_rate'].split('/'))
    return {**s, 'fps': num / den if den else 0, 'duration': float(f['duration']), 'size': int(f['size'])}


def even(n):
    return int(n) - (int(n) % 2)


def geometry(src, width):
    """The 3:4 crop about the centre, and the output size (never wider than the preview or --width)."""
    w, h = src['width'], src['height']
    if abs(w / h - ASPECT) < 0.005:
        cw, ch, cx, cy = w, h, 0, 0
    elif w / h > ASPECT:
        cw, ch = even(h * ASPECT), h
        cx, cy = (w - cw) // 2, 0
    else:
        cw, ch = w, even(w / ASPECT)
        cx, cy = 0, (h - ch) // 2
    ow = even(min(width, cw))
    return (cw, ch, cx, cy), (ow, even(ow / ASPECT))


def best_crf(encode, lo, hi):
    """The lowest CRF (the best picture) whose file fits the budget; encode(crf) writes the file and returns its size."""
    fit = None
    while lo <= hi:
        mid = (lo + hi) // 2
        if encode(mid) <= BUDGET:
            fit, hi = mid, mid - 1
        else:
            lo = mid + 1
    if fit is None:
        sys.exit('no quality setting fits the 1.2 MB budget; lower --width')
    encode(fit)  # leave the chosen encode on disk
    return fit


def run(args):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *args], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('preview')
    ap.add_argument('wing', choices=['machina', 'hortus', 'arca'])
    ap.add_argument('--width', type=int, default=960, help='widest the loop may be (the arch is at most 465 px wide, 2x)')
    a = ap.parse_args()

    src = probe(a.preview)
    (cw, ch, cx, cy), (ow, oh) = geometry(src, a.width)
    print(f'{a.wing}: {src["width"]}x{src["height"]} {src["codec_name"]}, {src["duration"]:.2f} s at {src["fps"]:g} fps, '
          f'{src["size"] / 1024:.0f} KB -> {ow}x{oh}')
    vf = f'crop={cw}:{ch}:{cx}:{cy},scale={ow}:{oh}:flags=lanczos' if (cw, ch, ow) != (src['width'], src['height'], src['width']) else 'null'
    media = os.path.join(ROOT, 'site', 'media')
    common = ['-map', '0:v:0', '-an', '-map_metadata', '-1', '-movflags', '+faststart']
    out = {}

    # H.264: the preview as supplied when it already fits, else the best encode that does.
    mp4 = os.path.join(media, f'{a.wing}-loop.mp4')
    as_supplied = (src['codec_name'] == 'h264' and src['pix_fmt'] == 'yuv420p' and vf == 'null'
                   and src['size'] <= BUDGET)
    if as_supplied:
        run(['-i', a.preview, *common, '-c', 'copy', mp4])
        out[mp4] = 'as supplied'
    else:
        def h264(crf):
            run(['-i', a.preview, '-vf', vf + ',format=yuv420p', '-r', f'{src["fps"]:g}', '-c:v', 'libx264',
                 '-preset', 'veryslow', '-crf', str(crf), '-profile:v', 'high', *common, mp4])
            return os.path.getsize(mp4)
        out[mp4] = f'crf {best_crf(h264, 14, 36)}'

    # AV1, 10-bit, where the H.264 had to give some of the picture up to fit: the same budget buys wide screens a picture
    # close to the preview as made. A preview kept as supplied is already the best picture, and an AV1 copy of it could
    # only re-encode its artefacts at the same weight, so it gets none.
    av1 = os.path.join(media, f'{a.wing}-loop-av1.mp4')
    if as_supplied:
        if os.path.exists(av1):
            os.remove(av1)
    else:
        def svt(crf):
            run(['-i', a.preview, '-vf', vf + ',format=yuv420p10le', '-r', f'{src["fps"]:g}', '-c:v', 'libsvtav1',
                 '-preset', '4', '-crf', str(crf), '-svtav1-params', 'tune=0', *common, av1])
            return os.path.getsize(av1)
        out[av1] = f'crf {best_crf(svt, 18, 50)}'

    # The poster stands until the loop starts (and for good under reduced motion): the first frame, within the 80 KB a
    # poster may weigh (docs/publishing.md, performance budget), at the best quality and size that fit.
    jpg = os.path.join(media, f'{a.wing}-loop.jpg')
    frame = subprocess.run(['ffmpeg', '-v', 'error', '-i', a.preview, '-vf', vf, '-frames:v', '1', '-f', 'image2pipe',
                            '-c:v', 'png', '-'], capture_output=True, check=True).stdout
    still = Image.open(io.BytesIO(frame)).convert('RGB')
    for pw in (ow, even(ow * 0.75), even(ow * 0.6)):
        pic = still if pw == ow else still.resize((pw, even(pw / ASPECT)), Image.LANCZOS)
        for q in (85, 80, 75, 70, 65):
            pic.save(jpg, quality=q, optimize=True, progressive=True)
            if os.path.getsize(jpg) <= POSTER:
                break
        if os.path.getsize(jpg) <= POSTER:
            break
    else:
        sys.exit(f'{jpg} is over the 80 KB a poster may weigh')
    print(f'wrote {os.path.relpath(jpg, ROOT)}: {pic.width}x{pic.height}, quality {q}, {os.path.getsize(jpg) / 1024:.0f} KB')

    for f in out:
        r = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-f', 'null', '-'], capture_output=True, text=True)
        if r.stderr.strip():
            sys.exit(f'decode errors in {f}:\n{r.stderr}')
        p = probe(f)
        print(f'wrote {os.path.relpath(f, ROOT)}: {p["codec_name"]} {p["width"]}x{p["height"]}, {p["duration"]:.2f} s, '
              f'{p["size"] / 1024:.0f} KB ({out[f]})')
        if p['size'] > BUDGET:
            sys.exit(f'{f} is over the 1.2 MB budget')
    entry = (f'"av1": "media/{a.wing}-loop-av1.mp4", ' if av1 in out else '') + f'"mp4": "media/{a.wing}-loop.mp4"'
    print(f'site/media.json → "loops": {{ "{a.wing}": {{ {entry} }} }}')


if __name__ == '__main__':
    main()
