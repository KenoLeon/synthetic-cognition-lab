#!/usr/bin/env bash
# Replication of the v0.2.1 runs on the refactored workbench (refactor brief, task 5, 2026-10-19).
# Same items, prompt, model, k = 1 per run and run structure as eval/llm/v3/run-v0.2.1.sh (no Flash check).
# Resumable: rerun to continue. Key: GEMINI_API_KEY from .env.local (here or at the repo root).
set -u
cd "$(dirname "$0")/../../.."
[ -f .env.local ] || { set -a; . ../../.env.local; set +a; }
M=gemini-3.5-flash-lite
D=eval/llm/v0.2.1-replication
node scripts/llm_query.mjs $M --dir=$D --ids=@$D/task2-ids.txt               # run 1: 108 touch trials
node scripts/llm_query.mjs $M --dir=$D --ids=@$D/stability-A-ids.txt         # run 1: inner-sense-only items
node scripts/llm_query.mjs $M --dir=$D --ids=@$D/stability-ids.txt --rep=2   # run 2
node scripts/llm_query.mjs $M --dir=$D --ids=@$D/stability-ids.txt --rep=3   # run 3
node scripts/llm_score_v3.mjs --dir=$D
