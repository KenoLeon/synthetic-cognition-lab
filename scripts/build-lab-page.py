#!/usr/bin/env python3
"""Build the public lab page from the README files and LAB.md's experiment tables.

Run from the repo root:  python scripts/build-lab-page.py
Output: dist/lab/index.html (git-ignored). Standard library only; no scripts in the output.

Page order: lab intro -> Embodiment -> Emergent Cognitive Markers -> Earlier work -> Contact.
Experiment cards come from LAB.md "Live experiments" and "Future experiments" and use only the
Experiment, Track, Stage and Public line columns. Public line "hidden" -> card skipped;
"—" -> name and stage only. The Archived table is never read.
"""
import html
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "dist" / "lab" / "index.html"
TRACKS = [("Embodiment", "embodiment"), ("Emergent Cognitive Markers", "emergent-cognitive-markers")]
CARD_TABLES = ["### Live experiments", "### Future experiments"]
CARD_COLUMNS = ["Experiment", "Track", "Stage", "Public line"]  # the only columns ever read

BENCH_MARKER = "<!-- bench-embed -->"
EXPERIMENTS_MARKER = re.compile(r"<!--\s*experiments:.*?-->")


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


# ---------- minimal markdown (headings, paragraphs, lists, tables, inline) ----------

def inline(text):
    out = html.escape(text, quote=False)
    out = re.sub(r"`([^`]+)`", r"<code>\1</code>", out)
    out = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", out)
    out = re.sub(r"(?<![*\w])\*([^*]+)\*(?!\w)", r"<i>\1</i>", out)
    out = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)",
                 lambda m: f'<a href="{html.escape(m.group(2))}" class="link-dark">{m.group(1)}</a>', out)
    return out


def split_row(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def md_to_html(md, heading_shift=0):
    """Convert a small markdown subset. HTML comments are passed through (used as markers)."""
    lines, out, i = md.split("\n"), [], 0
    while i < len(lines):
        line = lines[i]
        s = line.strip()
        if not s:
            i += 1
        elif s.startswith("<!--"):
            out.append(s)
            i += 1
        elif m := re.match(r"^(#{1,6})\s+(.*)$", s):
            lvl = min(6, len(m.group(1)) + heading_shift)
            out.append(f"<h{lvl}>{inline(m.group(2))}</h{lvl}>")
            i += 1
        elif s.startswith("|") and i + 1 < len(lines) and re.match(r"^\|?\s*:?-{3,}", lines[i + 1].strip()):
            head = split_row(s)
            i += 2
            body = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                body.append(split_row(lines[i]))
                i += 1
            th = "".join(f"<th>{inline(c)}</th>" for c in head)
            trs = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in body)
            out.append(f'<table class="table"><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table>')
        elif re.match(r"^[-*]\s+", s):
            items = []
            while i < len(lines) and re.match(r"^[-*]\s+", lines[i].strip()):
                items.append(re.sub(r"^[-*]\s+", "", lines[i].strip()))
                i += 1
            lis = "".join(f'<li class="list-group-item">{inline(x)}</li>' for x in items)
            out.append(f'<ul class="list-group">{lis}</ul>')
        else:
            para = []
            while i < len(lines) and lines[i].strip() and not re.match(r"^(#|\||[-*]\s|<!--)", lines[i].strip()):
                para.append(lines[i].strip())
                i += 1
            out.append(f"<p>{inline(' '.join(para))}</p>")
    return "\n".join(out)


def sections(md):
    """Split on '## ' headings -> (preamble, {title: body})."""
    parts = re.split(r"^## +(.+)$", md, flags=re.M)
    return parts[0], {parts[k].strip(): parts[k + 1] for k in range(1, len(parts), 2)}


# ---------- experiment cards from LAB.md ----------

def card_rows(lab):
    rows = []
    for heading in CARD_TABLES:
        start = lab.index(heading)
        block = lab[start:].split("\n")[1:]
        table = []
        for line in block:
            if line.startswith("#"):
                break
            if line.strip().startswith("|"):
                table.append(line)
        header = split_row(table[0])
        idx = {name: header.index(name) for name in CARD_COLUMNS}  # KeyError if a column is missing
        for line in table[2:]:
            cells = split_row(line)
            rows.append({name: cells[idx[name]] for name in CARD_COLUMNS})
    return rows


def cards_html(rows, track):
    items = []
    for r in rows:
        if r["Track"] != track or r["Public line"].lower() == "hidden":
            continue
        line = "" if r["Public line"] in ("—", "-", "") else f'<br><span class="public-line">{inline(r["Public line"])}</span>'
        items.append(f'<li class="list-group-item experiment-card"><b>{inline(r["Experiment"])}</b>'
                     f'<br><small class="text-muted stage">{inline(r["Stage"])}</small>{line}</li>')
    if not items:
        return '<p class="text-muted">No public experiments yet.</p>'
    return '<ul class="list-group experiments">' + "".join(items) + "</ul>"


# ---------- page ----------

CSS = """
:root{--bg:#d6d6d6;--text:#212529;--muted:#6c757d;--rule:rgba(0,0,0,.125);--link:#3385cc;--link-hover:#66b2ff}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans","Liberation Sans",sans-serif;font-size:1rem;line-height:1.5}
.container{max-width:960px;margin:0 auto;padding:0 16px}
header{padding:3rem 0 1rem;text-align:center}
h1,h2,h3,h4{font-weight:500;line-height:1.2;margin:0 0 .5rem}
h2{font-size:calc(1.325rem + .9vw)}
h3{font-size:calc(1.3rem + .6vw)}
h4{font-size:calc(1.275rem + .3vw);margin-top:1.25rem}
@media (min-width:1200px){h2{font-size:2rem}h3{font-size:1.75rem}h4{font-size:1.5rem}}
section{padding:1.5rem 0;border-top:1px solid var(--rule)}
p{margin:0 0 1rem}
a.link-dark{color:var(--text)}
a.link-dark:hover{color:var(--link)}
.text-muted{color:var(--muted)}
.list-group{list-style:none;margin:0 0 1rem;padding:0}
.list-group-item{padding:.5rem 0;border-bottom:1px solid var(--rule)}
.list-group-item:last-child{border-bottom:0}
.stage{letter-spacing:.05em}
.table{width:100%;border-collapse:collapse;margin:0 0 1rem}
.table th,.table td{text-align:left;padding:.5rem;border-bottom:1px solid var(--rule);vertical-align:top}
.bench-embed{min-height:240px;border:1px dashed var(--muted);border-radius:4px;display:flex;align-items:center;justify-content:center;color:var(--muted);margin:0 0 1rem}
footer{padding:1.5rem 0 3rem;border-top:1px solid var(--rule);color:var(--muted);font-size:.875rem}
"""

BENCH_DIV = ('<div id="bench-embed" class="bench-embed" data-embed="bench">'
             'Bench embed goes here (interactive 3D workbench, not built yet).</div>')


def track_section(name, folder, rows):
    md = read(f"{folder}/README.md")
    md = re.sub(r"^# .*\n", "", md, count=1)  # the track title is rendered as the section heading
    body = md_to_html(md, heading_shift=2)  # '## Bench' -> h4
    body = body.replace(BENCH_MARKER, BENCH_DIV)
    body, n = EXPERIMENTS_MARKER.subn(cards_html(rows, name), body)
    if n != 1:
        sys.exit(f"{folder}/README.md: expected one experiments marker, found {n}")
    slug = folder
    return f'<section id="{slug}"><h3>{html.escape(name)}</h3>\n{body}\n</section>'


def build():
    lab = read("LAB.md")
    rows = card_rows(lab)
    pre, root = sections(read("README.md"))
    title = re.search(r"^# +(.+)$", pre, flags=re.M).group(1).strip()
    intro = md_to_html(re.sub(r"^# .*\n", "", pre, count=1))
    for needed in ("Earlier work", "Contact"):
        if needed not in root:
            sys.exit(f"README.md: missing section '## {needed}'")
    parts = [
        f'<header id="lab-intro"><h2>{html.escape(title)}</h2>\n{intro}\n</header>',
        *[track_section(n, f, rows) for n, f in TRACKS],
        f'<section id="earlier-work"><h3>Earlier work</h3>\n{md_to_html(root["Earlier work"])}\n</section>',
        f'<section id="contact"><h3>Contact</h3>\n{md_to_html(root["Contact"])}\n</section>',
    ]
    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<style>{CSS}</style>
</head>
<body>
<div class="container">
{chr(10).join(parts)}
<footer>Generated from the Synthetic Cognition Lab repository.</footer>
</div>
</body>
</html>
"""
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(page, encoding="utf-8")
    shown = sum(1 for r in rows if r["Public line"].lower() != "hidden")
    print(f"wrote {OUT.relative_to(ROOT)}: {shown} experiment card(s), {len(rows) - shown} hidden")


if __name__ == "__main__":
    build()
