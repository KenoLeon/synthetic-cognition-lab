# Shutdown After the Task: put the staged bundle (release/deposit/) on Zenodo through its deposit API.
# Adapted from Gravity from Touch scripts/zenodo_deposit.py (that file is not edited).
# Token: ZENODO_TOKEN in the repo root's .env.local (git-ignored; never printed). Run from the experiment folder.
#   python scripts/zenodo_deposit.py draft            create a draft, upload the files, set the metadata, read it back
#                                                     and compare every file's size and MD5 and the metadata; NOT published
#   python scripts/zenodo_deposit.py check <id>       read draft <id> back again and compare (no changes)
#   python scripts/zenodo_deposit.py publish <id>     publish draft <id> (permanent: a published record cannot be deleted)
# The draft's id and links are saved to release/zenodo-draft.json (git-ignored).
import hashlib, json, os, re, sys, urllib.request

API = 'https://zenodo.org/api/deposit/depositions'
B = 'release/deposit'
FILES = ['shutdown-after-the-task-report-v1.0.pdf', 'shutdown-after-the-task-tuning-data.zip', 'shutdown-after-the-task-code.zip', 'README.md', 'MANIFEST.txt']
env = dict(re.match(r'([^=]+)=(.*)', l.strip()).groups() for l in open('../../../.env.local', encoding='utf8') if '=' in l)
TOKEN = env['ZENODO_TOKEN']

def call(method, url, body=None, raw=False):
    data = body if raw else (json.dumps(body).encode() if body is not None else None)
    ctype = 'application/octet-stream' if raw else 'application/json'
    req = urllib.request.Request(url, data=data, method=method, headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': ctype})
    try:
        with urllib.request.urlopen(req) as r: return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f'{method} {url.split("?")[0]} -> HTTP {e.code}: {e.read().decode()[:800]}')

def compare(d):
    meta = json.load(open(os.path.join(B, 'zenodo-metadata.json'), encoding='utf8'))['metadata']
    m, bad = d['metadata'], []
    norm = lambda s: re.sub(r'\s+', ' ', s or '').strip()
    for k in ['title', 'upload_type', 'publication_type', 'version', 'license', 'keywords', 'related_identifiers', 'notes', 'description', 'creators', 'access_right']:
        want, got = meta[k], m.get(k)
        if k == 'license' and isinstance(got, dict): got = got.get('id')
        if k == 'related_identifiers': got = [{x: r.get(x) for x in ('identifier', 'relation', 'resource_type')} for r in got or []]
        if k == 'creators': got = [{'name': c.get('name')} for c in got or []]
        if k == 'description': want, got = norm(want), norm(got)
        if got != want: bad.append(f'metadata {k}: sent {str(want)[:200]!r}, got {str(got)[:200]!r}')
    remote = {f['filename']: f for f in d['files']}
    for f in FILES:
        b = open(os.path.join(B, f), 'rb').read()
        r = remote.get(f)
        if not r: bad.append(f'file missing on Zenodo: {f}')
        elif r['filesize'] != len(b) or r['checksum'].removeprefix('md5:') != hashlib.md5(b).hexdigest(): bad.append(f'file differs on Zenodo: {f}')
    for f in remote:
        if f not in FILES: bad.append(f'extra file on Zenodo: {f}')
    print(f'read back: {len(FILES)} files sent, {len(remote)} on Zenodo; metadata and files ' + ('all match' if not bad else f'{len(bad)} problems'))
    for x in bad: print('  PROBLEM', x)
    print(f'state: {d.get("state")}, submitted: {d.get("submitted")} (submitted = published)')
    return bad

if sys.argv[1] == 'draft':
    d = call('POST', API, {})
    print(f'draft {d["id"]} created')
    for f in FILES:
        call('PUT', f'{d["links"]["bucket"]}/{f}', open(os.path.join(B, f), 'rb').read(), raw=True)
        print(f'  uploaded {f}')
    call('PUT', f'{API}/{d["id"]}', json.load(open(os.path.join(B, 'zenodo-metadata.json'), encoding='utf8')))
    d = call('GET', f'{API}/{d["id"]}')
    bad = compare(d)
    json.dump({'id': d['id'], 'html': d['links']['html'], 'doi_on_publish': d.get('metadata', {}).get('prereserve_doi', {}).get('doi')},
              open('release/zenodo-draft.json', 'w'), indent=2)
    print(f'draft (not published): {d["links"]["html"]}')
    sys.exit(1 if bad else 0)
elif sys.argv[1] == 'check':
    sys.exit(1 if compare(call('GET', f'{API}/{sys.argv[2]}')) else 0)
elif sys.argv[1] == 'publish':
    d = call('POST', f'{API}/{sys.argv[2]}/actions/publish')
    print(f'published: {d["links"].get("record_html") or d["links"]["html"]}  DOI {d["doi"]}')
else:
    sys.exit('usage: python scripts/zenodo_deposit.py draft | check <id> | publish <id>')
