#!/usr/bin/env bash
# Run-to-run spread (spread brief, 2026-10-20): 10 runs of the 114-item v0.2.1 set (108 touch + 6
# inner-sense trials), same prompts (taken from the replication logs), model, settings and k = 1 per run.
# Free-tier cap for gemini-3.5-flash-lite: 500 requests/day (FINDINGS F8), so at most 4 runs (456) per
# quota day: days 1-3 = runs 1-4, 5-8, 9-10. A run interrupted by the cap is finished on a catch-up day.
# Quota days reset at midnight Pacific (07:00 UTC while PDT, until 2026-11-01); runs start at 07:10 UTC.
# Each run's day is taken from its logged request times by scripts/llm_spread.mjs, not from this schedule.
# Resumable: rerun to continue. Key: GEMINI_API_KEY from .env.local (here or at the repo root).
set -u
cd "$(dirname "$0")/../../.."
[ -f .env.local ] || { set -a; . ../../.env.local; set +a; }
M=gemini-3.5-flash-lite
D=eval/llm/v0.2.1-spread
LOG=$D/schedule.log
N=$(grep -c . $D/ids.txt)

stamp() { date -u +%FT%TZ; }
wait_reset() {
  local now t
  now=$(date -u +%s); t=$(date -u -d "$(date -u +%F) 07:10" +%s)
  [ "$now" -ge "$t" ] && t=$((t + 86400))
  echo "$(stamp) waiting for the quota reset; starting at $(date -u -d "@$t" +%FT%TZ)" | tee -a $LOG
  sleep $((t - now))
}
done_in() { # successful replies logged for run $1
  local dir=$D/logs/$M; [ "$1" -gt 1 ] && dir=$dir-rep$1
  [ -d "$dir" ] || { echo 0; return; }
  grep -l '"httpStatus": 200' "$dir"/*.json 2>/dev/null | wc -l
}
day() { # $1 = day label, rest = run numbers
  local d=$1; shift
  wait_reset
  node scripts/gemini_list_models.mjs | tail -1 | tee -a $LOG   # model listing (incl. version) for this day
  for k in "$@"; do
    echo "$(stamp) day $d run $k start ($(done_in $k)/$N already logged)" | tee -a $LOG
    node scripts/llm_query.mjs $M --dir=$D --ids=@$D/ids.txt --rep=$k
    echo "$(stamp) day $d run $k end ($(done_in $k)/$N logged)" | tee -a $LOG
  done
}

day 1 1 2 3 4
day 2 5 6 7 8
day 3 9 10
for pass in 1 2; do # catch-up for runs the cap interrupted
  todo=""; for k in $(seq 1 10); do [ "$(done_in $k)" -lt "$N" ] && todo="$todo $k"; done
  [ -z "$todo" ] && break
  day "catch-up $pass" $todo
done
node scripts/llm_spread.mjs | tee -a $LOG
echo "$(stamp) SPREAD-FINISHED" | tee -a $LOG
