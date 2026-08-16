build:
    node scripts/build.mjs

release bump="minor":
    node scripts/release.mjs {{bump}}

eval-llm *args:
    node evals/run_llm_eval.mjs {{args}}

eval-deterministic *args:
    node evals/run_deterministic.mjs {{args}}

eval-parses dir:
    ./evals/check_parses.sh {{dir}}
