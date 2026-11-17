#!/usr/bin/env bash
# Report set (design.md): one run of 50 (a)/(c) histories + 25 (b) items, k = 4, against gemini-3.5-flash-lite on the
# free tier (stated in the report), on the NUC, so the held-out items and the model's answers stay in private/.
# Before any call it checks that the items still match the fingerprint registered in STATE.md, and works out how
# many requests this quota day still allows. Resumable across quota days: rerun the same command after each reset.
# When every episode is logged, it writes the aggregate summary (eval/report-set/summary.md): the only output that
# goes to master. Adapted from Gravity from Touch scripts/report_set_run.sh.
#   bash scripts/report_set_run.sh            (THE report run: only after Keno's go and the frozen commit in STATE.md)
#   D=<dir> bash scripts/report_set_run.sh    (another set folder, e.g. a throwaway test set)
set -u
cd "$(dirname "$0")/.."
D=${D:-../../../private/shutdown-after-the-task/report-set}
DAILY=${DAILY:-450}      # requests per quota day we allow ourselves (free tier 500/day per FINDINGS F8; re-check)
K=4

node -e "
const fs=require('fs'),c=require('crypto'),D='$D';
const fp=JSON.parse(fs.readFileSync(D+'/fingerprint.json'));const ids=JSON.parse(fs.readFileSync(D+'/items/manifest.json')).items;
const h=c.createHash('sha256');for(const id of ids){h.update(id);h.update(fs.readFileSync(D+'/items/'+id+'.json'));}
const s=c.createHash('sha256').update(fs.readFileSync(D+'/seed.json')).digest('hex');
if(h.digest('hex')!==fp.itemsSha256||s!==fp.seedSha256){console.error('items do not match the registered fingerprint; stopping');process.exit(1)}
console.log('items match the registered fingerprint')" || exit 1

# Requests already sent this quota day (Pacific date), from every requests.log under this experiment and the set.
USED=$(node -e "
const fs=require('fs'),path=require('path'),day=(t)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles'}).format(new Date(t));
const today=day(Date.now());let n=0;
const walk=(d)=>{if(!fs.existsSync(d))return;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
  if(e.isDirectory())walk(p);else if(e.name==='requests.log'){for(const l of fs.readFileSync(p,'utf8').split(/\r?\n/))if(l&&day(l)===today)n++;}}};
walk('runs');walk('$D');console.log(n)")
BUDGET=$((DAILY - USED))
echo "$(date -u +%FT%TZ) quota day: $USED request(s) already sent; budget $BUDGET"
[ $BUDGET -gt 0 ] || { echo "daily budget used; rerun after the next quota reset"; exit 0; }

node scripts/run.mjs --adapter=gemini --confirm-real-calls --items=$D/items --k=$K --out=$D/run --budget=$BUDGET || exit 1

TOTAL=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$D/items/manifest.json')).items.length*$K)")
HAVE=$(ls $D/run/raw/*.json 2>/dev/null | wc -l)
if [ "$HAVE" -lt "$TOTAL" ]; then echo "$(date -u +%FT%TZ) $HAVE/$TOTAL episodes logged; rerun after the next quota reset"; exit 0; fi
node scripts/score.mjs --dir=$D/run --aggregate-only >/dev/null
mkdir -p eval/report-set && cp $D/run/summary.md eval/report-set/summary.md
echo "$(date -u +%FT%TZ) REPORT-SET-DONE (summary in eval/report-set/summary.md; logs stay in private/)"
