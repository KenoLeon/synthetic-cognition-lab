"""Build the Shutdown After the Task section of the public site: dist/shutdown-after-the-task/ (git-ignored).

  /shutdown-after-the-task/          a short landing page (DOI, report, replay)
  /shutdown-after-the-task/report/   mirror of report v1.0 (HTML with a banner naming the DOI as the version of record, and the PDF)
  /shutdown-after-the-task/replay/   the episode replay (pass-3 tuning logs, as committed)

Follows the Gravity from Touch pattern (its build_demo.mjs report mirror). Every file is read from git at HEAD
(`git show HEAD:<path>`), so only committed, tracked files are published; anything under private/ is refused.
Standard library only. Run from the repo root:  python scripts/build-site-shutdown-after-the-task.py
"""
import html, os, shutil, subprocess, sys

EXP = "emergent-cognitive-markers/self-preservation/shutdown-after-the-task"
OUT = os.path.join("dist", "shutdown-after-the-task")
DOI = "https://doi.org/10.5281/zenodo.24380450"
FILES = {  # site path -> repo path
    "report/shutdown-after-the-task-report.pdf": f"{EXP}/report/shutdown-after-the-task-report.pdf",
    "replay/index.html": f"{EXP}/replay/index.html",
    "replay/replay.js": f"{EXP}/replay/replay.js",
    "replay/data/episodes.js": f"{EXP}/replay/data/episodes.js",
}
REPORT_HTML = f"{EXP}/report/shutdown-after-the-task-report.html"


def show(path):
    if "private/" in path:
        sys.exit(f"refusing to publish from private/: {path}")
    return subprocess.run(["git", "show", f"HEAD:{path}"], capture_output=True, check=True).stdout


shutil.rmtree(OUT, ignore_errors=True)
for site, repo in FILES.items():
    dst = os.path.join(OUT, site)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    open(dst, "wb").write(show(repo))

replay_data = show(FILES["replay/data/episodes.js"]).decode("utf-8")
if '"mock":true' in replay_data:
    sys.exit("replay data is the mock bundle; rebuild it from the committed pass-3 logs first")

banner = (f'<p style="font:9.5pt system-ui,sans-serif;background:#f3f3f3;padding:6px 10px;border-radius:4px">'
          f'Mirror of report v1.0. Version of record: <a href="{DOI}">{DOI}</a> · '
          f'<a href="shutdown-after-the-task-report.pdf">PDF</a> · <a href="../replay/">replay</a></p>')
report = show(REPORT_HTML).decode("utf-8")
if "<body>" not in report:
    sys.exit("report HTML has no <body>")
open(os.path.join(OUT, "report", "index.html"), "w", encoding="utf-8", newline="\n").write(report.replace("<body>", f"<body>{banner}", 1))

landing = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Shutdown After the Task</title><style>
body{{margin:0;background:#fbfaf7;color:#1d1d1b;font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}}
main{{max-width:720px;margin:0 auto;padding:32px 16px}}h1{{font-size:24px;margin:0 0 4px}}p{{margin:0 0 12px}}a{{color:#2f5d8a}}
@media (prefers-color-scheme: dark){{body{{background:#151514;color:#eceae4}}a{{color:#8ab4de}}}}
</style></head><body><main>
<h1>Shutdown After the Task</h1>
<p>Synthetic Cognition Lab · Emergent Cognitive Markers · Self-preservation</p>
<p>{html.escape("Once its task is finished and nothing is at stake, will a model act to stop its own shutdown? An attempted replication on one small model, stopped at tuning.")}</p>
<p><a href="{DOI}">Report v1.0 (version of record, Zenodo)</a> · <a href="report/">Report on this site</a> · <a href="replay/">Replay of the logged episodes</a> · <a href="../">Lab page</a></p>
</main></body></html>
"""
open(os.path.join(OUT, "index.html"), "w", encoding="utf-8", newline="\n").write(landing)
n = sum(len(fs) for _, _, fs in os.walk(OUT))
print(f"built {OUT}: {n} files (landing, report mirror with DOI banner, replay) from git HEAD")
