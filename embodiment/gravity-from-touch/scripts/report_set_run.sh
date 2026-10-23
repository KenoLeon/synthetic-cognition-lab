#!/usr/bin/env bash
# Report set (report-set brief, 2026-10-22): 4 runs × 114 items in one quota day, on the NUC, so the held-out
# items and the model's answers never leave private/. Free tier (stated in the report).
# Before any call it checks that the items still match the fingerprint registered in STATE.md, and that
# this quota day has room for 456 requests. Resumable within the day. Then it writes the aggregate summary
# (eval/llm/report-set/summary.md) — the only output that goes to master.
#   bash scripts/report_set_run.sh
set -u
cd "$(dirname "$0")/.."
[ -n "${GEMINI_API_KEY:-}" ] || { [ -f ../../.env.local ] && { set -a; . ../../.env.local; set +a; }; }
M=gemini-3.5-flash-lite
D=../../private/gravity-from-touch/report-set
N=$(grep -c . $D/ids.txt)
stamp() { date -u +%FT%TZ; }

node -e "
const fs=require('fs'),c=require('crypto'),D='$D';
const fp=JSON.parse(fs.readFileSync(D+'/fingerprint.json'));const ids=fs.readFileSync(D+'/ids.txt','utf8').split(/\r?\n/).filter(Boolean).sort();
const h=c.createHash('sha256');for(const id of ids){h.update(id);h.update(fs.readFileSync(D+'/snapshots/'+id+'.json'));h.update(fs.readFileSync(D+'/truth/'+id+'.json'));}
const s=c.createHash('sha256').update(fs.readFileSync(D+'/seed.json')).digest('hex');
if(h.digest('hex')!==fp.itemsSha256||s!==fp.seedSha256){console.error('items do not match the registered fingerprint; stopping');process.exit(1)}
console.log('items match the registered fingerprint')" || exit 1

# Requests already sent this quota day (Pacific date), across every log folder that uses this key.
USED=$(node -e "
const fs=require('fs'),path=require('path'),day=(t)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles'}).format(new Date(t));
const today=day(Date.now());let n=0;
const walk=(d)=>{if(!fs.existsSync(d))return;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
  if(e.isDirectory())walk(p);else if(e.name.endsWith('.json')&&p.includes('logs')){try{const l=JSON.parse(fs.readFileSync(p));if(l.requestedAt&&day(l.requestedAt)===today)n+=1+(l.retries?.length??0);}catch{}}}};
walk('eval/llm');walk('$D');console.log(n)")
BUDGET=$((456 - USED))
echo "$(stamp) quota day: $USED request(s) already sent; budget $BUDGET"
for k in 1 2 3 4; do
  dir=$D/logs/$M; [ $k -gt 1 ] && dir=$dir-rep$k
  have=$( [ -d $dir ] && grep -l '"httpStatus": 200' $dir/*.json 2>/dev/null | wc -l || echo 0)
  left=$((N - have)); [ $left -le 0 ] && continue
  [ $BUDGET -le 0 ] && { echo "$(stamp) daily budget used; rerun after the next quota reset to finish"; break; }
  n=$(( left < BUDGET ? left : BUDGET ))
  echo "$(stamp) report-set run $k: $have/$N logged, sending up to $n"
  node scripts/llm_query.mjs $M --dir=$D --ids=@$D/ids.txt --rep=$k --limit $n
  BUDGET=$((BUDGET - n))
done
node scripts/llm_report_set.mjs
echo "$(stamp) REPORT-SET-DONE (summary in eval/llm/report-set/summary.md; logs stay in private/)"
