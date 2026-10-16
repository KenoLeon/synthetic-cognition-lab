#!/usr/bin/env bash
# v0.2.1 LLM runs (planning/008 Tasks 2-4, plan approved in 009). Resumable: rerun to continue.
set -u
M=gemini-3.5-flash-lite
D=eval/llm/v3
node scripts/llm_query.mjs $M --dir=$D --ids=@$D/task2-ids.txt                  # Task 2: 108 touch trials (= stability run 1 for touch items)
node scripts/llm_query.mjs $M --dir=$D --ids=@$D/stability-A-ids.txt            # stability run 1, inner-sense-only items
node scripts/llm_query.mjs $M --dir=$D --ids=@$D/stability-ids.txt --rep=2      # stability run 2
node scripts/llm_query.mjs $M --dir=$D --ids=@$D/stability-ids.txt --rep=3      # stability run 3
node scripts/llm_query.mjs gemini-3.8-flash --dir=$D --ids=@$D/flash-ids.txt    # Task 4 (optional): Flash spot check, 20/day
