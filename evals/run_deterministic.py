#!/usr/bin/env python3
"""Deterministic (no-LLM) checks for a produced `.rngo/` directory.

These are the assertions from evals.json that can be verified with grep-ish
heuristics instead of judgment: does the spec parse and emit events, are
field names not using the pre-migration schema, are there no stray regex
anchors, and (per eval) do known fields show the expected shape.

Usage:
    run_deterministic.py <dir> [--eval-name NAME] [--fixture FIXTURE_DIR]

<dir> must contain a `.rngo/` subdirectory. Two usages:
  - point it at a fresh output dir (e.g. what run_llm_eval.py produces) to
    check one eval's output
  - point it at a fixture that ships a spec (fixtures/orders-existing-spec)
    with no --eval-name, as a plain compatibility canary against the
    installed `rngo` CLI

Exits 0 if every check passes, 1 otherwise.
"""

import argparse
import hashlib
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

# (label, anchor substring, tokens that must appear within `window` lines of it)
EVAL_CHECKS: dict[str, list[tuple[str, str, list[str]]]] = {
    "fresh-infer-blog-node-prisma": [
        ("PostStatus enum uses select/constant", "PostStatus", ["select", "constant"]),
        ("isAdmin uses select/constant true|false", "isAdmin", ["select", "constant"]),
        ("Post.body nullable uses select-with-null", "body", ["select", "null"]),
        ("authorId is a reference", "authorId", ["reference"]),
        ("postId is a reference", "postId", ["reference"]),
    ],
    "fresh-infer-shop-python-fastapi": [
        ("OrderStatus enum uses select/constant", "OrderStatus", ["select", "constant"]),
        ("in_stock uses select/constant true|false", "in_stock", ["select", "constant"]),
        ("tracking_number nullable uses select-with-null", "tracking_number", ["select", "null"]),
        ("order_id is a reference", "order_id", ["reference"]),
        ("product_id is a reference", "product_id", ["reference"]),
    ],
}


def run_parse_check(dir_: Path) -> tuple[bool, str]:
    result = subprocess.run(
        [str(HERE / "check_parses.sh"), str(dir_)], capture_output=True, text=True
    )
    out = (result.stdout or result.stderr).strip()
    return out.startswith("PASS"), out


def read_all(dir_: Path, subdirs: list[str]) -> dict[str, str]:
    text = {}
    for sub in subdirs:
        d = dir_ / sub
        if not d.exists():
            continue
        for p in d.rglob("*.yml"):
            text[str(p)] = p.read_text()
    return text


def check_no_old_field_names(effects_files: dict[str, str]) -> list[str]:
    """Effects should reference a channel via `channel:` + `metadata:`. The
    pre-migration schema used `system:` + `format: {table: ...}` instead.
    `format:` is legitimate on *channels* (encoding format, e.g. sql/json) —
    this only applies to files under .rngo/effects/."""
    failures = []
    for path, text in effects_files.items():
        if re.search(r"(?m)^system:\s*$", text):
            failures.append(f"{path}: uses old top-level `system:` key (should be `channel:`)")
        if re.search(r"(?m)^format:\s*$", text):
            failures.append(f"{path}: uses old top-level `format:` key (should be `metadata:`)")
    return failures


def check_no_regex_anchors(files: dict[str, str]) -> list[str]:
    failures = []
    for path, text in files.items():
        for m in re.finditer(r"(?m)^\s*pattern:\s*(.+)$", text):
            val = m.group(1).strip()
            if "^" in val or "$" in val:
                failures.append(f"{path}: pattern contains anchor: {val}")
    return failures


def check_proximity(
    files: dict[str, str], anchor: str, required_tokens: list[str], window: int = 20
) -> tuple[bool, str | None]:
    for path, text in files.items():
        lines = text.splitlines()
        for i, line in enumerate(lines):
            if anchor in line:
                lo, hi = max(0, i - window), min(len(lines), i + window)
                chunk = "\n".join(lines[lo:hi])
                if all(tok in chunk for tok in required_tokens):
                    return True, f"{path}:{i + 1}"
    return False, None


def check_invariant_eval(dir_: Path, fixture_dir: Path | None) -> list[str]:
    failures = []
    inv_dir = dir_ / ".rngo" / "invariants"
    inv_files = sorted(inv_dir.glob("*.yml")) if inv_dir.exists() else []
    if not inv_files:
        return ["no file found under .rngo/invariants/"]

    for f in inv_files:
        text = f.read_text()
        for field in ("type: sql", "query:", "expect:"):
            if field not in text:
                failures.append(f"{f}: missing `{field}`")
        if not re.search(r"\bfulfillment", text) or not re.search(r"\b(payment|order)", text):
            failures.append(f"{f}: query doesn't appear to reference fulfillments and payments/orders")
        if not re.search(r"result\s*==", text):
            failures.append(f"{f}: expect doesn't look like a `result ==` comparison")

    if fixture_dir and fixture_dir.exists():
        orig_spec = fixture_dir / ".rngo" / "spec.yml"
        new_spec = dir_ / ".rngo" / "spec.yml"
        if orig_spec.exists():
            if not new_spec.exists() or _sha(orig_spec) != _sha(new_spec):
                failures.append("spec.yml changed from the original fixture")

        orig_effects_dir = fixture_dir / ".rngo" / "effects"
        for orig_f in orig_effects_dir.glob("*.yml") if orig_effects_dir.exists() else []:
            new_f = dir_ / ".rngo" / "effects" / orig_f.name
            if not new_f.exists() or _sha(orig_f) != _sha(new_f):
                failures.append(f"effects/{orig_f.name} changed from the original fixture")

    return failures


def _sha(p: Path) -> bytes:
    return hashlib.sha256(p.read_bytes()).digest()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("dir", type=Path)
    ap.add_argument("--eval-name")
    ap.add_argument("--fixture", type=Path, help="original fixture dir, for diff checks (invariant eval)")
    args = ap.parse_args()

    results: list[tuple[str, bool, str]] = []

    ok, detail = run_parse_check(args.dir)
    results.append(("rngo run --stdout parses with no error and emits events", ok, detail))

    files = read_all(args.dir, [".rngo/effects", ".rngo/channels", ".rngo/invariants", ".rngo/schemas"])
    effects_files = read_all(args.dir, [".rngo/effects"])

    old_fields = check_no_old_field_names(effects_files)
    results.append(("effects use channel:/metadata:, not old system:/format:", not old_fields, "; ".join(old_fields)))

    anchors = check_no_regex_anchors(files)
    results.append(("no ^/$ regex anchors in patterns", not anchors, "; ".join(anchors)))

    if args.eval_name in EVAL_CHECKS:
        for label, anchor, tokens in EVAL_CHECKS[args.eval_name]:
            ok, where = check_proximity(files, anchor, tokens)
            results.append((label, ok, where or f"no `{anchor}` found with {tokens} nearby"))

    if args.eval_name == "add-invariant-orders-existing-spec":
        failures = check_invariant_eval(args.dir, args.fixture)
        results.append(("invariant added correctly; pre-existing files unchanged", not failures, "; ".join(failures)))

    failed = 0
    for label, ok, detail in results:
        status = "PASS" if ok else "FAIL"
        if not ok:
            failed += 1
        suffix = f" — {detail}" if detail and not ok else ""
        print(f"[{status}] {label}{suffix}")

    print(f"\n{len(results) - failed}/{len(results)} checks passed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
