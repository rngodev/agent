#!/usr/bin/env python3
"""Run the rngo skill against its eval fixtures via a live `claude -p` agent,
then grade the result against evals.json assertions with an LLM judge.

Requires the `claude` CLI on PATH and authenticated (same as any other
`claude -p` call — set ANTHROPIC_API_KEY or whatever auth this environment
normally uses). Each eval costs two model calls (execution + grading) and
runs the executor with --permission-mode bypassPermissions, scoped to a
throwaway copy of the fixture — it does not touch your real working tree.

Usage:
    run_llm_eval.py --eval 0 --eval 2      # by id
    run_llm_eval.py --eval fresh-infer-blog-node-prisma
    run_llm_eval.py --all
    run_llm_eval.py --all --model sonnet

Writes results to eval-runs/<timestamp>/eval-<id>-<name>/:
    repo/               throwaway fixture copy the executor ran against
    result.txt          executor's final message
    timing.json         duration/cost/usage for the executor call
    outputs/.rngo        copy of the produced .rngo directory
    deterministic.txt   output of run_deterministic.py against outputs/
    grading.json         LLM judge verdict per assertion, with evidence

Exits non-zero if any selected eval has a failing assertion — usable as a CI
gate, though given the cost/latency of live model calls you'll likely want
to run this less often than plain `run_deterministic.py`.
"""

import argparse
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

from _common import load_evals, resolve_fixture, select_evals

HERE = Path(__file__).resolve().parent
WORKSPACE = HERE
SKILL_DIR = WORKSPACE.parent / "skills" / "rngo"

GRADING_SCHEMA = {
    "type": "object",
    "properties": {
        "expectations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "passed": {"type": "boolean"},
                    "evidence": {"type": "string"},
                },
                "required": ["text", "passed", "evidence"],
            },
        },
        "summary": {
            "type": "object",
            "properties": {
                "passed": {"type": "integer"},
                "failed": {"type": "integer"},
                "total": {"type": "integer"},
                "pass_rate": {"type": "number"},
            },
            "required": ["passed", "failed", "total", "pass_rate"],
        },
    },
    "required": ["expectations", "summary"],
}


def run_execution(prompt: str, repo_dir: Path, model: str | None) -> tuple[dict, float]:
    skills_dir = repo_dir / ".claude" / "skills"
    skills_dir.mkdir(parents=True, exist_ok=True)
    skill_link = skills_dir / "rngo"
    if not skill_link.exists():
        skill_link.symlink_to(SKILL_DIR, target_is_directory=True)

    cmd = ["claude", "-p", prompt, "--output-format", "json", "--permission-mode", "bypassPermissions"]
    if model:
        cmd += ["--model", model]

    start = time.time()
    proc = subprocess.run(cmd, cwd=repo_dir, capture_output=True, text=True, timeout=900)
    duration = time.time() - start
    if proc.returncode != 0:
        raise RuntimeError(f"executor `claude -p` failed (exit {proc.returncode}): {proc.stderr[-2000:]}")
    return json.loads(proc.stdout), duration


def run_grading(assertions: list[str], outputs_dir: Path, deterministic_report: str, model: str | None) -> dict:
    prompt = (
        "Grade a coding agent's output against these assertions. For each one, decide "
        "pass/fail with concrete evidence — read the actual files under "
        f"{outputs_dir}, don't take claims on faith. Independently verify everything, "
        "including the assertions the deterministic report below already checked.\n\n"
        "Assertions:\n" + "\n".join(f"- {a}" for a in assertions) + "\n\n"
        "Deterministic check output (for reference only):\n" + deterministic_report + "\n\n"
        "Respond with JSON matching the required schema only."
    )
    cmd = [
        "claude", "-p", prompt,
        "--output-format", "json",
        "--permission-mode", "bypassPermissions",
        "--allowed-tools", "Read,Glob,Grep,Bash",
        "--json-schema", json.dumps(GRADING_SCHEMA),
    ]
    if model:
        cmd += ["--model", model]
    proc = subprocess.run(cmd, cwd=outputs_dir.parent, capture_output=True, text=True, timeout=600)
    if proc.returncode != 0:
        raise RuntimeError(f"grader `claude -p` failed (exit {proc.returncode}): {proc.stderr[-2000:]}")
    envelope = json.loads(proc.stdout)
    # with --json-schema, the schema-conformant payload is in `structured_output`,
    # not `result` (which is left empty)
    return envelope["structured_output"]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--eval", action="append", default=[], dest="evals", help="eval id or eval_name (repeatable)")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--model")
    ap.add_argument("--out-dir", type=Path, default=WORKSPACE / "eval-runs")
    args = ap.parse_args()

    if not args.all and not args.evals:
        sys.exit("pass --eval <id|name> (repeatable) or --all")

    evals = load_evals(WORKSPACE)
    selected = select_evals(evals, args.evals, args.all)

    run_dir = args.out_dir / time.strftime("%Y%m%d-%H%M%S")
    overall_ok = True

    for ev in selected:
        eval_dir = run_dir / f"eval-{ev['id']}-{ev['eval_name']}"
        repo_dir = eval_dir / "repo"
        fixture = resolve_fixture(WORKSPACE, ev["eval_name"])
        eval_dir.mkdir(parents=True, exist_ok=True)
        shutil.copytree(fixture, repo_dir)

        print(f"\n=== eval {ev['id']} ({ev['eval_name']}) — running skill against {fixture.name} ===")
        result, duration = run_execution(ev["prompt"], repo_dir, args.model)
        (eval_dir / "result.txt").write_text(result.get("result", ""))
        (eval_dir / "timing.json").write_text(json.dumps({
            "duration_ms": int(duration * 1000),
            "total_cost_usd": result.get("total_cost_usd"),
            "usage": result.get("usage"),
        }, indent=2))

        outputs_dir = eval_dir / "outputs"
        outputs_dir.mkdir(exist_ok=True)
        produced_rngo = repo_dir / ".rngo"
        if produced_rngo.exists():
            shutil.copytree(produced_rngo, outputs_dir / ".rngo")

        det = subprocess.run(
            [sys.executable, str(HERE / "run_deterministic.py"), str(outputs_dir),
             "--eval-name", ev["eval_name"], "--fixture", str(fixture)],
            capture_output=True, text=True,
        )
        (eval_dir / "deterministic.txt").write_text(det.stdout + det.stderr)
        print(det.stdout.strip())
        if det.returncode != 0:
            overall_ok = False

        print(f"--- grading against {len(ev['assertions'])} assertions ---")
        grading = run_grading(ev["assertions"], outputs_dir, det.stdout, args.model)
        (eval_dir / "grading.json").write_text(json.dumps(grading, indent=2))

        for exp in grading["expectations"]:
            status = "PASS" if exp["passed"] else "FAIL"
            print(f"[{status}] {exp['text']}")
            if not exp["passed"]:
                print(f"       {exp['evidence']}")
                overall_ok = False

        print(f"summary: {grading['summary']['passed']}/{grading['summary']['total']} passed")

    print(f"\nresults written to {run_dir}")
    sys.exit(0 if overall_ok else 1)


if __name__ == "__main__":
    main()
