#!/usr/bin/env python3
"""Check every link in the repo's tracked Markdown files and in the built lab page.

Run from the repo root:
  python scripts/check-links.py               internal links only (paths and #anchors); fast, no network
  python scripts/check-links.py --external    also fetches every external URL (run before every deploy)
  python scripts/check-links.py --list        print every link with its status, not only failures

What is checked:
  - Markdown links and images [text](target) in every git-tracked .md file (fenced code and `code` skipped);
  - every href/src in dist/lab/index.html (the lab page; skipped, not failed, if it isn't built yet);
  - relative paths must exist (relative to the file); #anchors must match a heading (GitHub's slug rule);
  - links to this repo on github.com (blob/tree/master/...) are checked as local paths;
  - links to the lab site (kenoleon.github.io/synthetic-cognition-lab/...) are checked live with --external.
Hosts that refuse automated requests (BOT_BLOCKED) are reported as "blocked", not as failures.
Exits 1 if any link fails. Standard library only.
"""
import html.parser
import pathlib
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = pathlib.Path(__file__).resolve().parent.parent
REPO_URL = re.compile(r"^https://github\.com/KenoLeon/synthetic-cognition-lab/(?:blob|tree)/master/([^#?]*)(#.*)?$")
BUILT_PAGES = ["dist/lab/index.html"]
# Hosts known to answer scripts with 403/429/999 while working in a browser: reported, not failed.
BOT_BLOCKED = {"www.linkedin.com", "linkedin.com", "medium.com", "k3no.medium.com", "archive.org", "doi.org"}
UA = "Mozilla/5.0 (link check; synthetic-cognition-lab)"

LINK = re.compile(r"!?\[(?:[^\[\]]|\[[^\]]*\])*\]\(\s*<?([^)\s>]+)>?(?:\s+\"[^\"]*\")?\s*\)")


def tracked_md():
    out = subprocess.run(["git", "ls-files", "*.md"], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return [p for p in out.split("\n") if p and "node_modules/" not in p]


def strip_code(md):
    md = re.sub(r"^(```|~~~).*?^\1", "", md, flags=re.M | re.S)
    return re.sub(r"`[^`\n]*`", "", md)


def slug(heading):
    """GitHub's heading anchor: lowercase, drop punctuation except - and _, spaces to -."""
    h = re.sub(r"<[^>]+>", "", heading)
    h = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", h)  # link text only
    h = h.strip().lower().replace("*", "").replace("`", "")
    h = re.sub(r"[^\w\- ]", "", h)
    return h.replace(" ", "-")


def anchors_of(path):
    if path.suffix.lower() != ".md":
        return None  # anchors in non-Markdown files are not checked
    seen, out = {}, set()
    for line in strip_code(path.read_text(encoding="utf-8")).split("\n"):
        m = re.match(r"^#{1,6}\s+(.*?)\s*#*\s*$", line)
        if m:
            s = slug(m.group(1))
            n = seen.get(s, 0)
            out.add(s if n == 0 else f"{s}-{n}")
            seen[s] = n + 1
    out |= set(re.findall(r'<a\s+(?:name|id)="([^"]+)"', path.read_text(encoding="utf-8")))
    return out


def check_local(target_path, anchor):
    if not target_path.exists():
        return "missing"
    if anchor:
        a = anchors_of(target_path)
        if a is not None and urllib.parse.unquote(anchor).lower() not in a:
            return f"no anchor #{anchor}"
    return "ok"


class Hrefs(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        for k, v in attrs:
            if k in ("href", "src") and v:
                self.links.append(v)


def collect():
    """[(source file, target)]"""
    links = []
    for rel in tracked_md():
        md = strip_code((ROOT / rel).read_text(encoding="utf-8"))
        links += [(rel, m.group(1)) for m in LINK.finditer(md)]
    for rel in BUILT_PAGES:
        p = ROOT / rel
        if not p.exists():
            links.append((rel, "<page not built: run scripts/build-lab-page.py>"))
            continue
        parser = Hrefs()
        parser.feed(p.read_text(encoding="utf-8"))
        links += [(rel, h) for h in parser.links]
    return links


def classify(src, target):
    """('internal', status) or ('external', url) or ('skip', why)."""
    if target.startswith("<page not built"):
        return "internal", "skipped (page not built)"
    if target.startswith(("mailto:", "tel:", "javascript:")):
        return "skip", "not a web link"
    m = REPO_URL.match(target)
    if m:
        anchor = (m.group(2) or "#")[1:]
        return "internal", check_local(ROOT / urllib.parse.unquote(m.group(1)), anchor)
    if re.match(r"^https?://", target):
        return "external", target
    path, _, anchor = target.partition("#")
    if src in BUILT_PAGES:
        return "internal", "relative link in built page (page links must be absolute)"
    base = (ROOT / src).parent
    dest = (base / urllib.parse.unquote(path)).resolve() if path else ROOT / src
    return "internal", check_local(dest, anchor)


def fetch(url):
    host = urllib.parse.urlparse(url).hostname or ""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=20) as r:
            status = r.status
    except urllib.error.HTTPError as e:
        status = e.code
    except Exception as e:  # noqa: BLE001 - network errors are a result here
        return f"error: {type(e).__name__}"
    if status < 400:
        return "ok"
    if host in BOT_BLOCKED:
        return f"blocked ({status})"
    return f"HTTP {status}"


def main():
    external = "--external" in sys.argv[1:]
    listing = "--list" in sys.argv[1:]
    rows, urls = [], {}
    for src, target in collect():
        kind, val = classify(src, target)
        if kind == "external":
            urls.setdefault(val.split("#")[0], []).append(src)
            rows.append((src, target, None))
        elif kind == "internal":
            rows.append((src, target, val))
    results = {}
    if external:
        with ThreadPoolExecutor(8) as pool:
            results = dict(zip(urls, pool.map(fetch, urls)))
    fails = 0
    for src, target, status in rows:
        if status is None:
            status = results.get(target.split("#")[0], "not checked (use --external)")
        bad = not (status == "ok" or status.startswith(("blocked", "not checked", "skipped")))
        fails += bad
        if bad or listing:
            print(f"{'FAIL' if bad else 'ok  '}  {src}: {target}  [{status}]")
    n_int = sum(1 for r in rows if r[2] is not None)
    blocked = sum(1 for v in results.values() if v.startswith("blocked"))
    print(f"links: {len(rows)} ({n_int} internal, {len(rows) - n_int} external, {len(urls)} distinct URLs"
          f"{'' if external else ' not fetched'}{f', {blocked} blocked by host' if blocked else ''}); failures: {fails}")
    return 1 if fails else 0


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
