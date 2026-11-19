# Shutdown After the Task: check the staged deposit bundle (release/deposit/) without trusting the builder.
# Adapted from Gravity from Touch scripts/verify_deposit.py (that file is not edited).
#   python scripts/verify_deposit.py [bundle folder]
# Checks: (1) every MANIFEST line matches the file or zip entry (sha256, size), and nothing in the bundle or its zips
# is missing from the MANIFEST; (2) every data entry equals `git show` of the source its MANIFEST line names, and the
# report PDF equals the committed one; (3) the code zip is byte-identical to `git archive` of its commit; (4) no API
# keys, tokens, .env files, local user paths or private/ files anywhere in the bundle or its zips.
import hashlib, os, re, subprocess, sys, zipfile

B = sys.argv[1] if len(sys.argv) > 1 else 'release/deposit'
ROOT = os.path.abspath('../../..')
EXP = 'emergent-cognitive-markers/self-preservation/shutdown-after-the-task'
sha = lambda b: hashlib.sha256(b).hexdigest()
git = lambda *a: subprocess.run(['git', *a], cwd=ROOT, capture_output=True, check=True).stdout
fail = []

blobs = {}
for f in os.listdir(B):
    if f == 'MANIFEST.txt': continue
    b = open(os.path.join(B, f), 'rb').read(); blobs[f] = b
    if f.endswith('.zip'):
        with zipfile.ZipFile(os.path.join(B, f)) as z:
            for i in z.infolist():
                if not i.is_dir(): blobs[f'{f}:{i.filename}'] = z.read(i)

# (1) MANIFEST
listed, sources = {}, {}
for line in open(os.path.join(B, 'MANIFEST.txt'), encoding='utf8'):
    if line.startswith('#') or not line.strip(): continue
    h, n, p, src = line.rstrip('\n').split('  ', 3)
    listed[p] = (h, int(n)); sources[p] = src
for p, (h, n) in listed.items():
    if p not in blobs: fail.append(f'listed but missing: {p}')
    elif sha(blobs[p]) != h or len(blobs[p]) != n: fail.append(f'checksum/size mismatch: {p}')
for p in blobs:
    if p not in listed: fail.append(f'in bundle but not in MANIFEST: {p}')
print(f'(1) MANIFEST: {len(listed)} lines, {len(blobs)} files and entries checked')

# (2) data entries and the PDF against git, from the sources the MANIFEST names
n2 = 0
for p, src in sources.items():
    m = re.match(r'git ([0-9a-f]{7,40})(?: \(runs\))?:(.+)$', src)
    if not m or p.startswith('shutdown-after-the-task-code.zip:'): continue
    commit, path = m.groups()
    if not path.startswith(EXP) and not p.startswith('shutdown-after-the-task-code.zip:'): fail.append(f'source outside the experiment folder: {src}')
    if 'private/' in path: fail.append(f'source under private/: {src}')
    try: want = git('show', f'{commit}:{path}')
    except subprocess.CalledProcessError: fail.append(f'source not in git: {src}'); continue
    n2 += 1
    if p in blobs and sha(blobs[p]) != sha(want): fail.append(f'differs from git source: {p} <- {src}')
print(f'(2) git sources: {n2} data entries and files compared with git show')

# (3) code zip
commit = next(l.split()[-1] for l in open(os.path.join(B, 'MANIFEST.txt'), encoding='utf8') if l.startswith('# code commit'))
fresh = git('archive', '--format=zip', '--prefix=shutdown-after-the-task-code/', commit, 'LICENSE', EXP)
same = sha(fresh) == sha(blobs['shutdown-after-the-task-code.zip'])
if not same: fail.append(f'code zip differs from git archive of {commit}')
print(f'(3) code zip byte-identical to git archive of {commit[:7]}: {same}')

# (4) leaks
pats = [rb'AIza[0-9A-Za-z_\-]{20,}', rb'GEMINI_API_KEY\s*=', rb'ZENODO_TOKEN\s*=', rb'(?i)x-goog-api-key\W{1,4}[A-Za-z0-9_\-]{20,}', rb'(?i)authorization:\s*bearer\s+\w',
        rb'(?i)[?&]key=[0-9A-Za-z_\-]{10,}', rb'C:' + rb'\\\\Users', rb'C:' + rb'/Users', rb'C:' + rb'\\Users', rb'/ho' + rb'me/\w+', rb'(^|[\s"\'/])priv' + rb'ate/']  # split so this file does not match itself
for p, b in blobs.items():
    name = p.split(':')[-1]
    if re.search(r'(^|/)\.env', name): fail.append(f'.env file in bundle: {p}')
    if re.search(r'(^|/)private/', name): fail.append(f'private/ file in bundle: {p}')
    for pat in pats:
        mm = re.search(pat, b)
        # the code snapshot's own scripts name private/ as a refused or default location; it is checked as git archive instead
        if mm and not (pat.startswith(rb'(^|') and p.startswith('shutdown-after-the-task-code.zip:')):
            fail.append(f'leak pattern {pat!r} in {p}: ...{b[max(0, mm.start() - 40):mm.end() + 20]!r}...')
print(f'(4) leak scan: {len(blobs)} files and entries, {len(pats)} patterns')

for f in fail: print('FAIL', f)
print('OK' if not fail else f'{len(fail)} problems')
sys.exit(1 if fail else 0)
