build:
    node scripts/build.mjs

build-local:
    RNGO_WEB_URL=http://localhost:5173 node scripts/build.mjs

install-local:
    rsync -a --delete skills/rngo/ ~/.claude/skills/rngo/

release bump="minor":
    node scripts/release.mjs {{bump}}

eval-llm *args:
    node evals/run_llm_eval.mjs {{args}}

eval-deterministic *args:
    node evals/run_deterministic.mjs {{args}}

eval-parses dir:
    ./evals/check_parses.sh {{dir}}
