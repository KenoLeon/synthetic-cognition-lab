# Gravity from Touch: check the staged deposit bundle (private/gravity-from-touch/deposit/) without trusting the builder.
#   python scripts/verify_deposit.py [bundle folder]
# Checks: (1) every MANIFEST line matches the file or zip entry (sha256, size), and nothing in the bundle or its zips
# is missing from the MANIFEST; (2) the report-set items and logs match the hashes committed in report/release-manifest.txt;
# (3) no API keys, .env files, key variables or local private/ paths anywhere in the bundle or inside its zips
# (the code zip may name private/ in default paths: it must instead be byte-identical to `git archive` of its commit).
import hashlib, os, re, subprocess, sys, zipfile

B = sys.argv[1] if len(sys.argv) > 1 else '../../private/gravity-from-touch/deposit'
sha = lambda b: hashlib.sha256(b).hexdigest()
fail = []

# ---- read every byte once: bundle files and zip entries
blobs = {}
for f in os.listdir(B):
    if f == 'MANIFEST.txt': continue
    b = open(os.path.join(B, f), 'rb').read()
    blobs[f] = b
    if f.endswith('.zip'):
        with zipfile.ZipFile(os.path.join(B, f)) as z:
            for i in z.infolist():
                if not i.is_dir(): blobs[f'{f}:{i.filename}'] = z.read(i)

# ---- (1) MANIFEST
listed = {}
for line in open(os.path.join(B, 'MANIFEST.txt'), encoding='utf8'):
    if line.startswith('#') or not line.strip(): continue
    h, n, p = line.split('  ')[:3]
    listed[p] = (h, int(n))
for p, (h, n) in listed.items():
    if p not in blobs: fail.append(f'listed but missing: {p}')
    elif sha(blobs[p]) != h or len(blobs[p]) != n: fail.append(f'checksum/size mismatch: {p}')
for p in blobs:
    if p not in listed: fail.append(f'in bundle but not in MANIFEST: {p}')
print(f'(1) MANIFEST: {len(listed)} lines, {len(blobs)} files and entries checked')

# ---- (2) committed release manifest (items/..., logs/... relative to the release folder)
SET = 'gravity-from-touch-report-set.zip:gravity-from-touch-report-set/'
n2 = 0
for line in open('report/release-manifest.txt', encoding='utf8'):
    if line.startswith('#') or not line.strip(): continue
    h, n, p = line.split()[:3]
    key = SET + (p[len('items/'):] if p.startswith('items/') else p)
    n2 += 1
    if key not in blobs: fail.append(f'committed release file missing from bundle: {p}')
    elif sha(blobs[key]) != h: fail.append(f'differs from committed release manifest: {p}')
print(f'(2) committed release manifest: {n2} files compared')

# ---- (3) leaks
pats = [rb'AIza[0-9A-Za-z_\-]{20,}', rb'GEMINI_API_KEY\s*=', rb'(?i)x-goog-api-key\W{1,4}[A-Za-z0-9_\-]{20,}', rb'(?i)authorization:\s*bearer', rb'(?i)[?&]key=[0-9A-Za-z_\-]{10,}',
        rb'sk-[A-Za-z0-9]{20,}', rb'C:\\\\Users', rb'C:/Users', rb'/home/\w+', rb'private/gravity-from-touch']
for p, b in blobs.items():
    name = p.split(':')[-1]
    if re.search(r'(^|/)\.env', name): fail.append(f'.env file in bundle: {p}')
    for pat in pats:
        m = re.search(pat, b)
        if m and not (pat == rb'private/gravity-from-touch' and (p in ('README.md', 'METADATA.md') or p.startswith('gravity-from-touch-code.zip:'))):
            fail.append(f'leak pattern {pat!r} in {p}: ...{b[max(0, m.start() - 40):m.end() + 20]!r}...')
print(f'(3) leak scan: {len(blobs)} files and entries, {len(pats)} patterns')

commit = next(l.split()[-1] for l in open(os.path.join(B, 'MANIFEST.txt'), encoding='utf8') if l.startswith('# code commit'))
fresh = subprocess.run(['git', 'archive', '--format=zip', '--prefix=gravity-from-touch-code/', commit, 'LICENSE', 'embodiment/gravity-from-touch'],
                       cwd='../..', capture_output=True, check=True).stdout
same = sha(fresh) == sha(blobs['gravity-from-touch-code.zip'])
if not same: fail.append(f'code zip differs from git archive of {commit}')
print(f'(4) code zip byte-identical to git archive of {commit[:7]}: {same}')

for f in fail: print('FAIL', f)
print('OK' if not fail else f'{len(fail)} problems')
sys.exit(1 if fail else 0)
