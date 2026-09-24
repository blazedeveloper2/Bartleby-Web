"""Video checker for the exercise how-to videos. See README.md beside this.

Usage:
  python vidcheck.py OUTDIR VIDEO_ID [VIDEO_ID ...]
  python vidcheck.py OUTDIR --zoom VIDEO_ID T0 T1

For each id writes OUTDIR/<id>.json (metadata, chapters) and OUTDIR/<id>.jpg
(a 4x4 contact sheet of frames spread evenly across the whole video, each
stamped with its timestamp, built from YouTube's storyboard images), and
prints a one-line summary. --zoom samples just seconds T0..T1 instead, for
finding where a section starts. Nothing is played, so there is no audio.
Needs Pillow; on Windows run with PYTHONIOENCODING=utf-8.
"""
import io, json, os, re, sys, urllib.request
from PIL import Image, ImageDraw

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126 Safari/537.36")


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def player_response(vid):
    html = get(f"https://www.youtube.com/watch?v={vid}").decode("utf-8", "replace")
    m = re.search(r"ytInitialPlayerResponse\s*=\s*(\{.+?\});(?:var|</script>)", html, re.S)
    if not m:
        raise RuntimeError("no player response")
    return json.loads(m.group(1))


def chapters(desc):
    out = []
    for line in desc.splitlines():
        if re.search(r"(^|\s)\(?\d{1,2}:\d{2}(:\d{2})?\)?(\s|$)", line):
            out.append(line.strip()[:90])
    return out[:20]


def sheet(vid, spec, length_s, outpath, n=16, cols=4, t0=None, t1=None):
    parts = spec.split("|")
    base, levels = parts[0], parts[1:]
    # highest level with real frames; prefer the 320-wide one
    best = None
    for i, lv in enumerate(levels):
        f = lv.split("#")
        w, h, count, gc, gr, interval, name, sigh = int(f[0]), int(f[1]), int(f[2]), int(f[3]), int(f[4]), int(f[5]), f[6], f[7]
        if interval > 0 and count > 1:
            best = (i, w, h, count, gc, gr, interval, name, sigh)
    if not best:
        return None
    L, w, h, count, gc, gr, interval, name, sigh = best
    per = gc * gr
    lo = 0 if t0 is None else min(count - 1, int(t0 * 1000 / interval))
    hi = count - 1 if t1 is None else min(count - 1, int(t1 * 1000 / interval))
    idxs = sorted({lo + round(k * (hi - lo) / (n - 1)) for k in range(n)})
    cache = {}
    tiles = []
    for idx in idxs:
        sn = idx // per
        if sn not in cache:
            url = base.replace("$L", str(L)).replace("$N", name.replace("$M", str(sn))) + "&sigh=" + sigh
            try:
                cache[sn] = Image.open(io.BytesIO(get(url))).convert("RGB")
            except Exception:
                cache[sn] = None
        img = cache[sn]
        if img is None:
            continue
        pos = idx % per
        x, y = (pos % gc) * w, (pos // gc) * h
        tile = img.crop((x, y, x + w, y + h)).resize((320, 180))
        t = idx * interval / 1000
        d = ImageDraw.Draw(tile)
        label = f"{int(t // 60)}:{int(t % 60):02d}"
        d.rectangle((0, 0, 44, 16), fill=(0, 0, 0))
        d.text((4, 2), label, fill=(255, 255, 0))
        tiles.append(tile)
    if not tiles:
        return None
    rows = (len(tiles) + cols - 1) // cols
    out = Image.new("RGB", (cols * 320, rows * 180), (20, 20, 20))
    for i, t in enumerate(tiles):
        out.paste(t, ((i % cols) * 320, (i // cols) * 180))
    out.save(outpath, quality=82)
    return len(tiles)


def check(vid, outdir):
    rec = {"id": vid}
    try:
        oe = json.loads(get(f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json"))
        rec["oembed"] = True
        rec["title"], rec["channel"] = oe.get("title"), oe.get("author_name")
    except Exception as e:
        rec["oembed"] = False
        rec["error"] = f"oembed: {e}"
    try:
        p = player_response(vid)
        vd = p.get("videoDetails", {})
        mf = p.get("microformat", {}).get("playerMicroformatRenderer", {})
        ps = p.get("playabilityStatus", {})
        rec.update({
            "title": vd.get("title", rec.get("title")),
            "channel": vd.get("author", rec.get("channel")),
            "length_s": int(vd.get("lengthSeconds", 0) or 0),
            "views": int(vd.get("viewCount", 0) or 0),
            "published": mf.get("publishDate"),
            "status": ps.get("status"),
            "embeddable": ps.get("playableInEmbed"),
            "short": "/shorts/" in json.dumps(mf.get("canonicalUrl", "")) or int(vd.get("lengthSeconds", 0) or 0) <= 60,
            "chapters": chapters(vd.get("shortDescription", "")),
            "description": vd.get("shortDescription", "")[:600],
        })
        spec = p.get("storyboards", {}).get("playerStoryboardSpecRenderer", {}).get("spec")
        if spec:
            n = sheet(vid, spec, rec["length_s"], os.path.join(outdir, f"{vid}.jpg"))
            rec["sheet"] = os.path.join(outdir, f"{vid}.jpg") if n else None
            rec["frames"] = n
        else:
            rec["sheet"] = None
    except Exception as e:
        rec["error"] = (rec.get("error", "") + f" page: {e}").strip()
    with open(os.path.join(outdir, f"{vid}.json"), "w", encoding="utf-8") as f:
        json.dump(rec, f, indent=1, ensure_ascii=False)
    return rec


def zoom(vid, t0, t1, outdir):
    """A 16-frame sheet of just t0..t1 seconds — for finding where a section starts."""
    p = player_response(vid)
    spec = p["storyboards"]["playerStoryboardSpecRenderer"]["spec"]
    out = os.path.join(outdir, f"{vid}_{t0}-{t1}.jpg")
    sheet(vid, spec, 0, out, t0=t0, t1=t1)
    print(out)


if __name__ == "__main__":
    outdir = sys.argv[1]
    os.makedirs(outdir, exist_ok=True)
    if sys.argv[2] == "--zoom":            # --zoom ID T0 T1
        zoom(sys.argv[3], int(sys.argv[4]), int(sys.argv[5]), outdir)
        sys.exit()
    for vid in sys.argv[2:]:
        r = check(vid, outdir)
        mins = f"{r.get('length_s', 0) // 60}:{r.get('length_s', 0) % 60:02d}"
        print(f"{vid} | {r.get('title')} | {r.get('channel')} | {mins} | {r.get('views', 0):,} views | "
              f"{r.get('published')} | embed={r.get('embeddable')} | frames={r.get('frames')} | {r.get('error', '')}")
