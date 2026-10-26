#!/usr/bin/env python3
"""Build the public lab page from the README files and the root README's experiment tables.

Run from the repo root:  python scripts/build-lab-page.py
Output: dist/lab/index.html (git-ignored). Standard library only; no scripts in the output.
Also rewrites each track README's experiments list (between <!-- experiments: ... --> and
<!-- /experiments -->) from the same rows, so GitHub readers see what the lab page shows.
Publish gate:            python scripts/build-lab-page.py --check
  exits 1 and lists every TODO-KENO, every visible '—' Public line and every stale README
  experiments list; writes nothing.

Page order: lab intro -> Embodiment -> Emergent Cognitive Markers -> Earlier work -> Contact.
The root README.md is the lab file: the intro is its "## What the lab is for" section, Earlier work
is the "### Earlier related work" subsection of "## Where things stand", Contact is "## Contact";
nothing else in it reaches the page.
Experiment cards come from README.md "### Live" and "### Coming up" and use only the
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
LAB_FILE = "README.md"
CARD_TABLES = ["### Live", "### Coming up"]
CARD_COLUMNS = ["Experiment", "Track", "Stage", "Public line"]  # the only columns ever read

BENCH_MARKER = "<!-- bench-embed -->"
EXPERIMENTS_MARKER = re.compile(r"<!--\s*experiments:.*?-->")
EXPERIMENTS_BLOCK = re.compile(r"(<!--\s*experiments:.*?-->)(.*?)(<!--\s*/experiments\s*-->)", re.S)


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
        if not s or re.match(r"^-{3,}$", s):  # blank line or horizontal rule
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


def subsection(body, title):
    """The text under '### title' inside a '## ' section body, or None."""
    parts = re.split(r"^### +(.+)$", body, flags=re.M)
    return {parts[k].strip(): parts[k + 1] for k in range(1, len(parts), 2)}.get(title)


# ---------- experiment cards from the lab file ----------

def card_rows(lab):
    rows = []
    for heading in CARD_TABLES:
        m = re.search(rf"^{re.escape(heading)}\s*$", lab, flags=re.M)
        if not m:
            sys.exit(f"{LAB_FILE}: missing table heading '{heading}'")
        start = m.start()
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
.bench-embed{margin:0 0 1rem}
.bench-embed iframe{width:100%;height:600px;border:1px solid var(--rule);border-radius:4px;display:block}
.bench-embed p{margin:.4rem 0 0;font-size:.875rem;color:var(--muted)}
footer{padding:1.5rem 0 3rem;border-top:1px solid var(--rule);color:var(--muted);font-size:.875rem}
"""

BENCH_URL = "https://kenoleon.github.io/synthetic-cognition-lab/gravity-from-touch/"  # GitHub Pages, deployed by .github/workflows/pages.yml
BENCH_DIV = ('<div id="bench-embed" class="bench-embed" data-embed="bench">'
             f'<iframe src="{BENCH_URL}" title="Gravity from Touch workbench" loading="lazy"></iframe>'
             f'<p>Interactive bench: play with the simulated body, or replay logged trials. '
             f'<a href="{BENCH_URL}">Open it full screen</a>.</p></div>')


def readme_list(rows, track, folder):
    """The track README's experiments list (Markdown), from the same rows as the cards."""
    lines = []
    for r in rows:
        if r["Track"] != track or r["Public line"].lower() == "hidden":
            continue
        name = r["Experiment"]
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        label = f"[{name}]({slug}/)" if (ROOT / folder / slug).is_dir() else name
        line = "" if r["Public line"] in ("—", "-", "") else f" — {r['Public line']}"
        lines.append(f"- **{label}** · {r['Stage']}{line}")
    return "\n".join(lines) if lines else "No public experiments yet."


def synced_readme(name, folder, rows):
    """(current, synced) text of the track README."""
    md = read(f"{folder}/README.md")
    new, n = EXPERIMENTS_BLOCK.subn(lambda m: f"{m.group(1)}\n{readme_list(rows, name, folder)}\n{m.group(3)}", md)
    if n != 1:
        sys.exit(f"{folder}/README.md: expected one experiments block (start and end markers), found {n}")
    return md, new


def track_section(name, folder, rows):
    md = read(f"{folder}/README.md")
    md = EXPERIMENTS_BLOCK.sub(lambda m: m.group(1), md)  # the Markdown list is for GitHub; the page gets cards
    md = re.sub(r"^# .*\n", "", md, count=1)  # the track title is rendered as the section heading
    body = md_to_html(md, heading_shift=2)  # '## Bench' -> h4
    body = body.replace(BENCH_MARKER, BENCH_DIV)
    body, n = EXPERIMENTS_MARKER.subn(cards_html(rows, name), body)
    if n != 1:
        sys.exit(f"{folder}/README.md: expected one experiments marker, found {n}")
    slug = folder
    return f'<section id="{slug}"><h3>{html.escape(name)}</h3>\n{body}\n</section>'


def page_parts(lab):
    """(title, intro, earlier work, contact) Markdown from the lab file; exits if one is missing."""
    pre, root = sections(lab)
    title = re.search(r"^# +(.+)$", pre, flags=re.M).group(1).strip()
    for needed in ("What the lab is for", "Where things stand", "Contact"):
        if needed not in root:
            sys.exit(f"{LAB_FILE}: missing section '## {needed}'")
    earlier = subsection(root["Where things stand"], "Earlier related work")
    if earlier is None:
        sys.exit(f"{LAB_FILE}: missing '### Earlier related work' under '## Where things stand'")
    return title, root["What the lab is for"], earlier, root["Contact"]


def build():
    lab = read(LAB_FILE)
    rows = card_rows(lab)
    title, intro, earlier, contact = page_parts(lab)
    parts = [
        f'<header id="lab-intro"><h2>{html.escape(title)}</h2>\n{md_to_html(intro)}\n</header>',
        *[track_section(n, f, rows) for n, f in TRACKS],
        f'<section id="earlier-work"><h3>Earlier work</h3>\n{md_to_html(earlier)}\n</section>',
        f'<section id="contact"><h3>Contact</h3>\n{md_to_html(contact)}\n</section>',
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
    for n, f in TRACKS:
        old, new = synced_readme(n, f, rows)
        if new != old:
            with open(ROOT / f / "README.md", "w", encoding="utf-8", newline="\n") as fh:
                fh.write(new)
            print(f"updated {f}/README.md experiments list")
    shown = sum(1 for r in rows if r["Public line"].lower() != "hidden")
    print(f"wrote {OUT.relative_to(ROOT)}: {shown} experiment card(s), {len(rows) - shown} hidden")


CONTENT_FILES = ["README.md", *[f"{folder}/README.md" for _, folder in TRACKS]]


def check():
    """Publish gate: list every TODO-KENO in the content files and every visible row whose
    Public line is still '—'. Exit 1 if any remain. Does not write the page."""
    problems = []
    for rel in CONTENT_FILES:
        for n, line in enumerate(read(rel).split("\n"), 1):
            if "TODO-KENO" in line:
                problems.append(f"{rel}:{n}: {line.strip()}")
    lab = read(LAB_FILE)
    page_parts(lab)  # exits if a section the page needs is missing
    rows = card_rows(lab)
    for r in rows:
        if r["Public line"].lower() != "hidden" and r["Public line"] in ("—", "-", ""):
            problems.append(f"{LAB_FILE}: Public line is '—' for {r['Experiment']} ({r['Track']})")
    for n, f in TRACKS:
        old, new = synced_readme(n, f, rows)
        if new != old:
            problems.append(f"{f}/README.md: experiments list is out of date with {LAB_FILE} (run the build)")
    for p in problems:
        print(p)
    print(f"check: {len(problems)} item(s) to fill before publishing")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")  # Windows consoles default to cp1252 and mangle "—"
    if "--check" in sys.argv[1:]:
        check()
    build()
