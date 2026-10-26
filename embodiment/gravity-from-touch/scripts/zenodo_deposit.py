# Gravity from Touch: put the staged bundle (private/gravity-from-touch/deposit/) on Zenodo through its deposit API.
# Token: ZENODO_TOKEN in the repo root's .env.local (git-ignored; never printed). Run from embodiment/gravity-from-touch/.
#   python scripts/zenodo_deposit.py draft            create a draft, upload the files, set the metadata, read it back
#                                                     and compare every file's size and MD5 with the local copy; NOT published
#   python scripts/zenodo_deposit.py publish <id>     publish draft <id> (permanent: a published record cannot be deleted)
# The draft's id and links are saved to private/gravity-from-touch/deposit/zenodo-draft.json.
import hashlib, json, os, re, sys, urllib.request

API = 'https://zenodo.org/api/deposit/depositions'
B = '../../private/gravity-from-touch/deposit'
FILES = ['gravity-from-touch-report-v1.0.pdf', 'gravity-from-touch-report-set.zip', 'gravity-from-touch-code.zip', 'README.md', 'MANIFEST.txt']
env = dict(re.match(r'([^=]+)=(.*)', l.strip()).groups() for l in open('../../.env.local', encoding='utf8') if '=' in l)
TOKEN = env['ZENODO_TOKEN']

def call(method, url, body=None, raw=False):
    data = body if raw else (json.dumps(body).encode() if body is not None else None)
    ctype = 'application/octet-stream' if raw else 'application/json'
    req = urllib.request.Request(url, data=data, method=method, headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': ctype})
    try:
        with urllib.request.urlopen(req) as r: return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f'{method} {url.split("?")[0]} -> HTTP {e.code}: {e.read().decode()[:800]}')

if sys.argv[1] == 'draft':
    d = call('POST', API, {})
    print(f'draft {d["id"]} created')
    for f in FILES:
        call('PUT', f'{d["links"]["bucket"]}/{f}', open(os.path.join(B, f), 'rb').read(), raw=True)
        print(f'  uploaded {f}')
    meta = json.load(open(os.path.join(B, 'zenodo-metadata.json'), encoding='utf8'))
    d = call('PUT', f'{API}/{d["id"]}', meta)
    # read back: metadata fields and every file against the local bytes
    d = call('GET', f'{API}/{d["id"]}')
    m, bad = d['metadata'], []
    for k in ['title', 'upload_type', 'publication_type', 'version', 'license', 'keywords', 'related_identifiers', 'notes']:
        want = meta['metadata'][k]
        got = m.get(k)
        if k == 'license' and isinstance(got, dict): got = got.get('id')
        if k == 'related_identifiers': got = [{x: r.get(x) for x in ('identifier', 'relation', 'resource_type')} for r in got or []]
        if got != want: bad.append(f'metadata {k}: sent {want!r}, got {got!r}')
    remote = {f['filename']: f for f in d['files']}
    for f in FILES:
        b = open(os.path.join(B, f), 'rb').read()
        r = remote.get(f)
        if not r: bad.append(f'file missing on Zenodo: {f}')
        elif r['filesize'] != len(b) or r['checksum'].removeprefix('md5:') != hashlib.md5(b).hexdigest(): bad.append(f'file differs on Zenodo: {f}')
    json.dump({'id': d['id'], 'html': d['links']['html'], 'doi_on_publish': d.get('metadata', {}).get('prereserve_doi', {}).get('doi')},
              open(os.path.join(B, 'zenodo-draft.json'), 'w'), indent=2)
    print(f'read back: {len(FILES)} files, {len(remote)} on Zenodo; ' + ('all match' if not bad else f'{len(bad)} problems'))
    for x in bad: print('  PROBLEM', x)
    print(f'draft (not published): {d["links"]["html"]}')
elif sys.argv[1] == 'publish':
    d = call('POST', f'{API}/{sys.argv[2]}/actions/publish')
    print(f'published: {d["links"].get("record_html") or d["links"]["html"]}  DOI {d["doi"]}')
else:
    sys.exit('usage: python scripts/zenodo_deposit.py draft | publish <id>')
