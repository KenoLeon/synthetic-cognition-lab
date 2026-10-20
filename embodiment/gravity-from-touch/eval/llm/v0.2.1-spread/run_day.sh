#!/usr/bin/env bash
# One quota day of the spread study (spread brief, 2026-10-20). Used by .github/workflows/spread.yml,
# also runnable locally. Runs the next incomplete runs in order (1..10), sending at most BUDGET requests
# (default 456 = 4 runs of 114; the free-tier cap for gemini-3.5-flash-lite is 500/day, FINDINGS F8).
# When all 10 runs are complete it applies the decision rule (scripts/llm_spread.mjs) once.
# Key: GEMINI_API_KEY from the environment (Actions secret), or .env.local here or at the repo root.
set -u
cd "$(dirname "$0")/../../.."
if [ -z "${GEMINI_API_KEY:-}" ] && [ ! -f .env.local ] && [ -f ../../.env.local ]; then set -a; . ../../.env.local; set +a; fi
M=gemini-3.5-flash-lite
D=eval/llm/v0.2.1-spread
LOG=$D/schedule.log
N=$(grep -c . $D/ids.txt)
BUDGET=${BUDGET:-456}

stamp() { date -u +%FT%TZ; }
done_in() { # successful replies logged for run $1
  local dir=$D/logs/$M; [ "$1" -gt 1 ] && dir=$dir-rep$1
  [ -d "$dir" ] || { echo 0; return; }
  grep -l '"httpStatus": 200' "$dir"/*.json 2>/dev/null | wc -l
}
remaining() { local r=""; for k in $(seq 1 10); do [ "$(done_in $k)" -lt "$N" ] && r="$r $k"; done; echo $r; }

if grep -q SPREAD-FINISHED $LOG 2>/dev/null; then echo "spread study already finished; nothing to do"; exit 0; fi
todo=$(remaining)
if [ -n "$todo" ]; then
  node scripts/gemini_list_models.mjs | tail -1 | tee -a $LOG   # model listing (incl. version) for this day
  for k in $todo; do
    [ "$BUDGET" -le 0 ] && break
    left=$((N - $(done_in $k)))
    n=$(( left < BUDGET ? left : BUDGET ))
    echo "$(stamp) run $k start ($((N - left))/$N logged; sending up to $n)" | tee -a $LOG
    node scripts/llm_query.mjs $M --dir=$D --ids=@$D/ids.txt --rep=$k --limit $n
    BUDGET=$((BUDGET - n))
    echo "$(stamp) run $k end ($(done_in $k)/$N logged)" | tee -a $LOG
  done
fi
if [ -z "$(remaining)" ]; then
  node scripts/llm_spread.mjs | tee -a $LOG
  echo "$(stamp) SPREAD-FINISHED" | tee -a $LOG
else
  echo "$(stamp) day done; runs still incomplete:$(remaining)" | tee -a $LOG
fi
