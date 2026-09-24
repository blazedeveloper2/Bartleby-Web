"""Search YouTube and list the top video results.

Usage: python ytsearch.py "query" [N]
Prints: id | length | views | channel | title
"""
import json, re, sys, urllib.parse, urllib.request

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126 Safari/537.36")

q, n = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 8
url = "https://www.youtube.com/results?search_query=" + urllib.parse.quote(q) + "&sp=EgIQAQ%253D%253D"  # videos only
req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})
html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
m = re.search(r"var ytInitialData\s*=\s*(\{.+?\});</script>", html, re.S)
data = json.loads(m.group(1))

out = []
def walk(o):
    if isinstance(o, dict):
        if "videoRenderer" in o:
            v = o["videoRenderer"]
            out.append((
                v.get("videoId"),
                v.get("lengthText", {}).get("simpleText", "?"),
                v.get("viewCountText", {}).get("simpleText", "?"),
                "".join(r.get("text", "") for r in v.get("ownerText", {}).get("runs", [])),
                "".join(r.get("text", "") for r in v.get("title", {}).get("runs", [])),
            ))
            return
        for x in o.values():
            walk(x)
    elif isinstance(o, list):
        for x in o:
            walk(x)
walk(data)
for r in out[:n]:
    print(" | ".join(str(x) for x in r))
