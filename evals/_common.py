"""Shared helpers for the rngo skill eval scripts."""

import json
from pathlib import Path


def load_evals(workspace: Path) -> list[dict]:
    return json.loads((workspace / "evals.json").read_text())["evals"]


def resolve_fixture(workspace: Path, eval_name: str) -> Path:
    """Fixtures are named as a suffix of their eval_name, e.g. eval
    `fresh-infer-blog-node-prisma` -> fixture `blog-node-prisma`."""
    fixtures_dir = workspace / "fixtures"
    candidates = [d for d in fixtures_dir.iterdir() if d.is_dir() and eval_name.endswith(d.name)]
    if not candidates:
        raise ValueError(f"no fixture in {fixtures_dir} matches eval_name {eval_name!r}")
    return max(candidates, key=lambda d: len(d.name))


def select_evals(evals: list[dict], wanted: list[str], select_all: bool) -> list[dict]:
    if select_all:
        return evals
    wanted_set = set(wanted)
    selected = [e for e in evals if str(e["id"]) in wanted_set or e["eval_name"] in wanted_set]
    missing = wanted_set - {str(e["id"]) for e in selected} - {e["eval_name"] for e in selected}
    if missing:
        raise ValueError(f"no eval matched: {sorted(missing)}")
    return selected
