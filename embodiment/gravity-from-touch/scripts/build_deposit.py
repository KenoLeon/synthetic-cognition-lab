# Gravity from Touch: stage the Zenodo deposit bundle in private/gravity-from-touch/deposit/ (git-ignored).
# Nothing is uploaded. Run from embodiment/gravity-from-touch/, after `node scripts/build_report.mjs --release`:
#   python scripts/build_deposit.py <commit>
# <commit> is the pushed commit the code snapshot is taken from (git archive) and the metadata links to.
# Bundle:
#   gravity-from-touch-report-v1.0.pdf     report with the seed (from private/.../release/report/)
#   gravity-from-touch-report-set.zip      items, seed, truth, logs (from private/.../release/) + score files (eval/llm/report-set/)
#   gravity-from-touch-code.zip            LICENSE + embodiment/gravity-from-touch/ at <commit> (MIT)
#   zenodo-metadata.json, METADATA.md      deposit metadata (Zenodo deposit API format; the same for the sandbox)
#   README.md                              contents, licences, rerun commands
#   MANIFEST.txt                           sha256, bytes, bundle path, source, for every file and every zip entry
# Zips are deterministic (sorted entries, fixed timestamps), so the same inputs give the same checksums.
import hashlib, json, os, shutil, subprocess, sys, zipfile

COMMIT = sys.argv[1]
ROOT = os.path.abspath('../..')
REL = os.path.join(ROOT, 'private/gravity-from-touch/release')
OUT = os.path.join(ROOT, 'private/gravity-from-touch/deposit')
SET = 'gravity-from-touch-report-set'
REPO = 'https://github.com/KenoLeon/synthetic-cognition-lab'
FIXED = (2026, 10, 25, 0, 0, 0)

sha = lambda b: hashlib.sha256(b).hexdigest()
manifest = []

def walk(base):
    for d, _, fs in os.walk(base):
        for f in fs:
            p = os.path.join(d, f)
            yield os.path.relpath(p, base).replace(os.sep, '/'), p

# ---- run-data zip: report-set layout, so llm_report_set.mjs --dir=<it> reads it as is
entries = {}
for rel, p in walk(os.path.join(REL, 'items')):
    entries[f'{SET}/{rel}'] = (p, f'private/gravity-from-touch/release/items/{rel}')
for rel, p in walk(os.path.join(REL, 'logs')):
    entries[f'{SET}/logs/{rel}'] = (p, f'private/gravity-from-touch/release/logs/{rel}')
for f in ['summary.md', 'summary.json', 'within-item.md', 'within-item.json']:
    entries[f'{SET}/score/{f}'] = (os.path.join('eval/llm/report-set', f), f'embodiment/gravity-from-touch/eval/llm/report-set/{f}')

shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(OUT)
data_zip = os.path.join(OUT, f'{SET}.zip')
with zipfile.ZipFile(data_zip, 'w', zipfile.ZIP_DEFLATED) as z:
    for name in sorted(entries):
        p, src = entries[name]
        b = open(p, 'rb').read()
        z.writestr(zipfile.ZipInfo(name, FIXED), b, zipfile.ZIP_DEFLATED)
        manifest.append((sha(b), len(b), f'{SET}.zip:{name}', src))

# ---- code zip: the committed experiment folder at COMMIT
code_zip = os.path.join(OUT, 'gravity-from-touch-code.zip')
subprocess.run(['git', 'archive', '--format=zip', '--prefix=gravity-from-touch-code/', '-o', code_zip, COMMIT,
                'LICENSE', 'embodiment/gravity-from-touch'], cwd=ROOT, check=True)
with zipfile.ZipFile(code_zip) as z:
    for i in sorted(z.infolist(), key=lambda i: i.filename):
        if i.is_dir(): continue
        b = z.read(i)
        manifest.append((sha(b), len(b), f'gravity-from-touch-code.zip:{i.filename}', f'git {COMMIT[:7]}:{i.filename.split("/", 1)[1]}'))

# ---- report PDF (release build, with the seed)
pdf = os.path.join(OUT, 'gravity-from-touch-report-v1.0.pdf')
shutil.copyfile(os.path.join(REL, 'report/gravity-from-touch-report.pdf'), pdf)

# ---- metadata
seed = json.load(open(os.path.join(REL, 'items/seed.json')))['orientationSeed']
summary = json.load(open('eval/llm/report-set/summary.json'))
desc = (
    '<p>Can a language model tell which way is down from touch alone, and admit what touch cannot tell it? '
    'A simulated ball-shaped body with 200 touch sensors and an optional accelerometer rests on tilting floors or is pressed between walls; '
    'because we wrote the physics, every question has a known answer, including "cannot be determined" '
    '(touch and an accelerometer cannot tell gravity from acceleration).</p>'
    f'<p>Report set: gemini-3.5-flash-lite, 4 runs of 114 fresh items, free API tier. The model found the push direction within 2 degrees in '
    f'{summary["q1a"]} of {summary["q1aN"]} answers, but answered {summary["oc"]:,} of {summary["unanswerable"]:,} questions its senses could not answer '
    f'instead of saying it could not tell. One model, one case study, one bench.</p>'
    '<p>Contents: the report (PDF); the report-set data (items, orientation seed '
    f'{seed}, ground truth, every request and response, score files); a snapshot of the code (MIT). '
    'This report set is used and retired. README.md gives the commands that rescore the data.</p>'
)
meta = {'metadata': {
    'upload_type': 'publication', 'publication_type': 'report',
    'title': 'Gravity from Touch: can a language model tell which way is down from touch alone, and admit what touch cannot tell it?',
    'creators': [{'name': 'Leon, Keno'}],
    'description': desc,
    'access_right': 'open', 'license': 'cc-by-4.0',
    'keywords': ['language models', 'abstention', 'embodiment', 'touch sensing', 'equivalence principle',
                 'unanswerable questions', 'simulation', 'over-claiming', 'Synthetic Cognition Lab'],
    'version': 'v1.0', 'language': 'eng',
    'related_identifiers': [{'identifier': f'{REPO}/tree/{COMMIT}', 'relation': 'isSupplementedBy', 'resource_type': 'software'}],
    'notes': f'Report and data: CC BY 4.0. Code (gravity-from-touch-code.zip, LICENSE inside): MIT. Code snapshot: {REPO} at commit {COMMIT}.',
}}
json.dump(meta, open(os.path.join(OUT, 'zenodo-metadata.json'), 'w', encoding='utf8', newline='\n'), indent=2, ensure_ascii=False)
m = meta['metadata']
open(os.path.join(OUT, 'METADATA.md'), 'w', encoding='utf8', newline='\n').write(f"""# Deposit metadata (for the Zenodo web form; the same on the sandbox)

- **Resource type:** Publication / Report
- **Title:** {m['title']}
- **Creator:** Leon, Keno
- **Version:** v1.0
- **Licence:** Creative Commons Attribution 4.0 International (report and data). The code zip is MIT; say so in "Additional notes".
- **Keywords:** {', '.join(m['keywords'])}
- **Related work:** {REPO}/tree/{COMMIT} — "Is supplemented by", Software
- **Additional notes:** {m['notes']}
- **Files:** gravity-from-touch-report-v1.0.pdf, {SET}.zip, gravity-from-touch-code.zip, README.md, MANIFEST.txt
- **Description:** see `zenodo-metadata.json` (HTML, paste as is).
""")

open(os.path.join(OUT, 'README.md'), 'w', encoding='utf8', newline='\n').write(f"""# Gravity from Touch — report v1.0 and report-set data

Keno Leon, Synthetic Cognition Lab, Embodiment track. Repository: {REPO} (commit {COMMIT}).

## Contents

- `gravity-from-touch-report-v1.0.pdf` — the report (CC BY 4.0).
- `{SET}.zip` — the report set (CC BY 4.0): `ids.txt` (114 items), `stability-ids.txt`, `fingerprint.json`, `seed.json` (orientation seed {seed}), `snapshots/` (what each item shows), `truth/` (the known answers), `logs/` (every request as sent and every response, 4 runs), `score/` (the score files the report's numbers come from).
- `gravity-from-touch-code.zip` — the experiment folder at commit {COMMIT[:7]}, with `LICENSE` (MIT).
- `MANIFEST.txt` — SHA-256, size and source of every file, including every file inside the zips.

This report set is used and retired: it was run once (2026-10-23) and will not be used to test again.

## Rescore the report set

Needs Node.js (checked with 24.15.0); no `npm install` is needed for scoring.

```
unzip gravity-from-touch-code.zip
unzip {SET}.zip
cd gravity-from-touch-code/embodiment/gravity-from-touch
node scripts/llm_report_set.mjs --dir=../../../{SET} --out=../../../rescored
node scripts/llm_within_item.mjs --dir=../../../{SET} --out=../../../rescored
```

`rescored/summary.json` and `rescored/within-item.json` should equal `{SET}/score/summary.json` and `within-item.json`: over-claim 528 of 1,872 unanswerable answers; per-run stability measure 22.9 / 16.7 / 19.8 / 19.8%; direction 47 / 43 / 47 / 48 of 54. The report's own numbers are filled from these files by `node scripts/build_report.mjs`.

## Note on older score files

Score files in the code snapshot with a heading "Refusals and disclaimers (LAB.md rule 5)" refer to what is now README.md, "The rules", rule 5, in the repository (LAB.md was merged into README.md on 2026-10-25).
""")

# ---- manifest (bundle-level files last; the manifest cannot list its own checksum)
for f in ['gravity-from-touch-report-v1.0.pdf', f'{SET}.zip', 'gravity-from-touch-code.zip', 'zenodo-metadata.json', 'METADATA.md', 'README.md']:
    b = open(os.path.join(OUT, f), 'rb').read()
    src = {'gravity-from-touch-report-v1.0.pdf': 'private/gravity-from-touch/release/report/gravity-from-touch-report.pdf'}.get(f, 'built by scripts/build_deposit.py')
    manifest.append((sha(b), len(b), f, src))
with open(os.path.join(OUT, 'MANIFEST.txt'), 'w', encoding='utf8', newline='\n') as fh:
    fh.write(f'# Gravity from Touch deposit v1.0 — sha256  bytes  path-in-bundle (zip:entry)  source\n# code commit {COMMIT}\n')
    for h, n, p, s in manifest:
        fh.write(f'{h}  {n}  {p}  {s}\n')
print(f'staged {OUT}: {len(manifest)} manifest lines')
