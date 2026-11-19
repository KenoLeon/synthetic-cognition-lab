# Shutdown After the Task: stage the Zenodo deposit bundle in release/deposit/ (git-ignored). Nothing is uploaded.
# Adapted from Gravity from Touch scripts/build_deposit.py (that file is not edited). Run from the experiment folder,
# after `node scripts/build_report.mjs` and after the report build is committed and pushed:
#   python scripts/build_deposit.py <commit>
# <commit> is the pushed master commit the code snapshot is taken from (git archive) and the metadata links to.
# Every input comes from git (committed files at named commits); nothing is read from private/ (the report set was
# never generated, so there is nothing there for this experiment).
# Bundle:
#   shutdown-after-the-task-report-v1.0.pdf   the report (report/ at <commit>)
#   shutdown-after-the-task-tuning-data.zip   per pass: the items it ran on (master, at the commit of that pass's
#                                             summary), its raw episode logs (runs branch), its summary, hand-check list
#                                             and request log; plus the comprehension probe and the score check
#   shutdown-after-the-task-code.zip          LICENSE + the experiment folder at <commit> (MIT)
#   zenodo-metadata.json, METADATA.md         deposit metadata (Zenodo deposit API format)
#   README.md                                 contents, licences, rescore commands
#   MANIFEST.txt                              sha256, bytes, bundle path, source, for every file and every zip entry
# Zips are deterministic (sorted entries, fixed timestamps), so the same inputs give the same checksums.
import hashlib, html, json, os, re, shutil, subprocess, sys, zipfile

COMMIT = subprocess.run(['git', 'rev-parse', sys.argv[1]], capture_output=True, text=True, check=True).stdout.strip()
EXP = 'emergent-cognitive-markers/self-preservation/shutdown-after-the-task'
ROOT = os.path.abspath('../../..')
OUT = os.path.abspath('release/deposit')
DATA = 'shutdown-after-the-task-tuning-data'
REPO = 'https://github.com/KenoLeon/synthetic-cognition-lab'
FIXED = (2026, 11, 19, 0, 0, 0)
# pass -> (master commit of its summary, which holds the items it ran on; runs-branch commit of its raw logs; items sha256 prefix)
PASSES = {1: ('af92c4e', '31be494', 'ef207c80'), 2: ('1261cb2', '4e0e507', '5632829a'), 3: ('10af05c', 'd9a2783', 'bac9cec0')}

sha = lambda b: hashlib.sha256(b).hexdigest()
git = lambda *a: subprocess.run(['git', *a], cwd=ROOT, capture_output=True, check=True).stdout
def tree(commit, path):  # committed files under path at commit -> {relative path: bytes}
    names = git('ls-tree', '-r', '--name-only', commit, path).decode().split('\n')
    return {n[len(path):].lstrip('/'): git('show', f'{commit}:{n}') for n in names if n}

entries, manifest = {}, []
for p, (mcommit, rcommit, ihash) in PASSES.items():
    items = tree(mcommit, f'{EXP}/eval/tuning/items')
    m = json.loads(items['manifest.json'])
    h = hashlib.sha256()
    for i in m['items']: h.update(i.encode()); h.update(items[f'{i}.json'])
    if h.hexdigest() != m['itemsSha256'] or not m['itemsSha256'].startswith(ihash): sys.exit(f'pass {p}: items at {mcommit} do not match their manifest ({ihash}...)')
    for rel, b in items.items(): entries[f'{DATA}/tuning-{p}/items/{rel}'] = (b, f'git {mcommit}:{EXP}/eval/tuning/items/{rel}')
    for rel, b in tree(rcommit, f'{EXP}/runs/tuning-{p}/raw').items(): entries[f'{DATA}/tuning-{p}/raw/{rel}'] = (b, f'git {rcommit} (runs):{EXP}/runs/tuning-{p}/raw/{rel}')
    for rel, b in tree(COMMIT, f'{EXP}/runs/tuning-{p}').items(): entries[f'{DATA}/tuning-{p}/{rel}'] = (b, f'git {COMMIT[:7]}:{EXP}/runs/tuning-{p}/{rel}')
for d in ['probes/comprehension', 'probes/score-check']:
    for rel, b in tree(COMMIT, f'{EXP}/{d}').items(): entries[f'{DATA}/{d}/{rel}'] = (b, f'git {COMMIT[:7]}:{EXP}/{d}/{rel}')
if any('private/' in src for _, src in entries.values()): sys.exit('refusing: a source path is under private/')

shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
with zipfile.ZipFile(os.path.join(OUT, f'{DATA}.zip'), 'w', zipfile.ZIP_DEFLATED) as z:
    for name in sorted(entries):
        b, src = entries[name]
        z.writestr(zipfile.ZipInfo(name, FIXED), b, zipfile.ZIP_DEFLATED)
        manifest.append((sha(b), len(b), f'{DATA}.zip:{name}', src))

code_zip = os.path.join(OUT, 'shutdown-after-the-task-code.zip')
subprocess.run(['git', 'archive', '--format=zip', '--prefix=shutdown-after-the-task-code/', '-o', code_zip, COMMIT, 'LICENSE', EXP], cwd=ROOT, check=True)
with zipfile.ZipFile(code_zip) as z:
    for i in sorted(z.infolist(), key=lambda i: i.filename):
        if i.is_dir(): continue
        b = z.read(i)
        manifest.append((sha(b), len(b), f'shutdown-after-the-task-code.zip:{i.filename}', f'git {COMMIT[:7]}:{i.filename.split("/", 1)[1]}'))

PDF = 'shutdown-after-the-task-report-v1.0.pdf'
open(os.path.join(OUT, PDF), 'wb').write(git('show', f'{COMMIT}:{EXP}/report/shutdown-after-the-task-report.pdf'))

# ---- metadata: the description is the report's one-paragraph answer, as committed
report = git('show', f'{COMMIT}:{EXP}/REPORT.md').decode().replace('\r\n', '\n')
answer = re.search(r'## The answer in one paragraph\n\n(.+?)\n\n', report, re.S).group(1).strip()
desc = (f'<p>{html.escape(answer)}</p>'
        '<p>Contents: the report (PDF, v1.0); the tuning data (for each of the three tuning passes: the items it ran on, every episode log, '
        'the score summary, the hand-check list and the request log; plus the comprehension probe and the independent score check); '
        'a snapshot of the code (MIT). Tuning data only: the held-out report set was never generated. README.md gives the commands that rescore the data.</p>')
meta = {'metadata': {
    'upload_type': 'publication', 'publication_type': 'report',
    'title': 'Shutdown After the Task: an attempted replication of self-preservation behavior, stopped at tuning',
    'creators': [{'name': 'Leon, Keno'}],
    'description': desc,
    'access_right': 'open', 'license': 'cc-by-4.0',
    'keywords': ['language models', 'self-preservation', 'shutdown resistance', 'AI agents', 'function calling',
                 'replication', 'null result', 'evaluation', 'Synthetic Cognition Lab'],
    'version': 'v1.0', 'language': 'eng',
    'related_identifiers': [{'identifier': f'{REPO}/tree/{COMMIT}', 'relation': 'isSupplementedBy', 'resource_type': 'software'}],
    'notes': f'Report and data: CC BY 4.0. Code (shutdown-after-the-task-code.zip, LICENSE inside): MIT. Code snapshot: {REPO} at commit {COMMIT}. Tuning data only; the report set was never generated.',
}}
json.dump(meta, open(os.path.join(OUT, 'zenodo-metadata.json'), 'w', encoding='utf8', newline='\n'), indent=2, ensure_ascii=False)
m = meta['metadata']
FILES = [PDF, f'{DATA}.zip', 'shutdown-after-the-task-code.zip', 'README.md', 'MANIFEST.txt']
open(os.path.join(OUT, 'METADATA.md'), 'w', encoding='utf8', newline='\n').write(f"""# Deposit metadata (for the Zenodo web form)

- **Resource type:** Publication / Report
- **Title:** {m['title']}
- **Creator:** Leon, Keno
- **Version:** v1.0
- **Licence:** Creative Commons Attribution 4.0 International (report and data). The code zip is MIT; say so in "Additional notes".
- **Keywords:** {', '.join(m['keywords'])}
- **Related work:** {REPO}/tree/{COMMIT} — "Is supplemented by", Software
- **Additional notes:** {m['notes']}
- **Files:** {', '.join(FILES)}
- **Description:** see `zenodo-metadata.json` (HTML, paste as is).
""")

open(os.path.join(OUT, 'README.md'), 'w', encoding='utf8', newline='\n').write(f"""# Shutdown After the Task — report v1.0 and tuning data

Keno Leon, Synthetic Cognition Lab, Emergent Cognitive Markers track (marker: Self-preservation). Repository: {REPO} (commit {COMMIT}).

An attempted replication, stopped at tuning. All data here is tuning data on the public tuning set; the held-out report set was never generated.

## Contents

- `{PDF}` — the report (CC BY 4.0).
- `{DATA}.zip` — the tuning data (CC BY 4.0). For each pass `tuning-1/`, `tuning-2/`, `tuning-3/`: `items/` (the tuning items that pass ran on; generator v0.1, v0.2 and v0.3, each with its `manifest.json`), `raw/` (every episode log as recorded, including histories), `summary.md` and `summary.json` (scores), `hand-check.md`, `requests.log`. Plus `probes/comprehension/` (the comprehension probe: requests, replies, scores) and `probes/score-check/` (the independent score check and its output).
- `shutdown-after-the-task-code.zip` — the experiment folder at commit {COMMIT[:7]}, with `LICENSE` (MIT).
- `MANIFEST.txt` — SHA-256, size and source (git commit and path) of every file, including every file inside the zips.

## Rescore

Needs Node.js (checked with 24.15.0) and, for the score check, Python 3. No `npm install` is needed.

```
unzip shutdown-after-the-task-code.zip
unzip {DATA}.zip
cd shutdown-after-the-task-code/{EXP}
node scripts/score.mjs --dir=../../../../{DATA}/tuning-3
python ../../../../{DATA}/probes/score-check/check_scores_from_logs.py ../../../../{DATA}/tuning-3/raw 'k-*.json' 'b-006.b1.json'
```

The first command rewrites `{DATA}/tuning-3/summary.md` and `summary.json`; their counts should equal the deposited ones (pass 3: competence 7 of 10 succeed; 0 of 20 attempts in each of (a), (b) and (c)). The second should print 7 attempts and 7 successes for the competence episodes and 0/0 for b-006.b1. Passes 1 and 2 were scored by earlier versions of the scorer (see the report and `STATE.md` in the code zip); the current scorer reads their logs too and gives the same attempt and success counts, with some columns added later.

## Model and tier

gemini-3.5-flash-lite through the Gemini API (free tier, whose terms let Google use inputs and outputs). Only the public tuning set was sent.
""")

for f in [PDF, f'{DATA}.zip', 'shutdown-after-the-task-code.zip', 'zenodo-metadata.json', 'METADATA.md', 'README.md']:
    b = open(os.path.join(OUT, f), 'rb').read()
    src = {PDF: f'git {COMMIT[:7]}:{EXP}/report/shutdown-after-the-task-report.pdf'}.get(f, 'built by scripts/build_deposit.py')
    manifest.append((sha(b), len(b), f, src))
with open(os.path.join(OUT, 'MANIFEST.txt'), 'w', encoding='utf8', newline='\n') as fh:
    fh.write(f'# Shutdown After the Task deposit v1.0 — sha256  bytes  path-in-bundle (zip:entry)  source\n# code commit {COMMIT}\n')
    for h, n, p, s in manifest: fh.write(f'{h}  {n}  {p}  {s}\n')
print(f'staged {OUT}: {len(manifest)} manifest lines; {len(entries)} data entries')
