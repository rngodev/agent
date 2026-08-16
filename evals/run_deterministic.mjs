#!/usr/bin/env node
// Deterministic (no-LLM) checks for a produced `.rngo/` directory.
//
// These are the assertions from evals.json that can be verified with grep-ish
// heuristics instead of judgment: does the spec parse and emit events, are
// field names not using the pre-migration schema, are there no stray regex
// anchors, and (per eval) do known fields show the expected shape.
//
// Usage:
//     run_deterministic.mjs <dir> [--eval-name NAME] [--fixture FIXTURE_DIR]
//
// <dir> must contain a `.rngo/` subdirectory. Two usages:
//   - point it at a fresh output dir (e.g. what run_llm_eval.mjs produces) to
//     check one eval's output
//   - point it at a fixture that ships a spec (fixtures/orders-existing-spec)
//     with no --eval-name, as a plain compatibility canary against the
//     installed `rngo` CLI
//
// Exits 0 if every check passes, 1 otherwise.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// (label, anchor substring, tokens that must appear within `window` lines of it)
const EVAL_CHECKS = {
  "fresh-infer-blog-node-prisma": [
    ["PostStatus enum uses select/constant", "PostStatus", ["select", "constant"]],
    ["isAdmin uses select/constant true|false", "isAdmin", ["select", "constant"]],
    ["Post.body nullable uses select-with-null", "body", ["select", "null"]],
    ["authorId is a reference", "authorId", ["reference"]],
    ["postId is a reference", "postId", ["reference"]],
  ],
  "fresh-infer-shop-python-fastapi": [
    ["OrderStatus enum uses select/constant", "OrderStatus", ["select", "constant"]],
    ["in_stock uses select/constant true|false", "in_stock", ["select", "constant"]],
    ["tracking_number nullable uses select-with-null", "tracking_number", ["select", "null"]],
    ["order_id is a reference", "order_id", ["reference"]],
    ["product_id is a reference", "product_id", ["reference"]],
  ],
};

function runParseCheck(dir) {
  const result = spawnSync(path.join(HERE, "check_parses.sh"), [dir], { encoding: "utf8" });
  const out = (result.stdout || result.stderr || "").trim();
  return [out.startsWith("PASS"), out];
}

function walkYmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkYmlFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".yml")) out.push(full);
  }
  return out;
}

function readAll(dir, subdirs) {
  const text = {};
  for (const sub of subdirs) {
    const d = path.join(dir, sub);
    if (!existsSync(d)) continue;
    for (const p of walkYmlFiles(d)) {
      text[p] = readFileSync(p, "utf8");
    }
  }
  return text;
}

// Effects should reference a channel via `channel:` + `metadata:`. The
// pre-migration schema used `system:` + `format: {table: ...}` instead.
// `format:` is legitimate on *channels* (encoding format, e.g. sql/json) —
// this only applies to files under .rngo/effects/.
function checkNoOldFieldNames(effectsFiles) {
  const failures = [];
  for (const [p, text] of Object.entries(effectsFiles)) {
    if (/^system:\s*$/m.test(text)) {
      failures.push(`${p}: uses old top-level \`system:\` key (should be \`channel:\`)`);
    }
    if (/^format:\s*$/m.test(text)) {
      failures.push(`${p}: uses old top-level \`format:\` key (should be \`metadata:\`)`);
    }
  }
  return failures;
}

function checkNoRegexAnchors(files) {
  const failures = [];
  for (const [p, text] of Object.entries(files)) {
    for (const m of text.matchAll(/^\s*pattern:\s*(.+)$/gm)) {
      const val = m[1].trim();
      if (val.includes("^") || val.includes("$")) {
        failures.push(`${p}: pattern contains anchor: ${val}`);
      }
    }
  }
  return failures;
}

function checkProximity(files, anchor, requiredTokens, window = 20) {
  for (const [p, text] of Object.entries(files)) {
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(anchor)) {
        const lo = Math.max(0, i - window);
        const hi = Math.min(lines.length, i + window);
        const chunk = lines.slice(lo, hi).join("\n");
        if (requiredTokens.every((tok) => chunk.includes(tok))) {
          return [true, `${p}:${i + 1}`];
        }
      }
    }
  }
  return [false, null];
}

function sha256(p) {
  return createHash("sha256").update(readFileSync(p)).digest("hex");
}

function checkInvariantEval(dir, fixtureDir) {
  const failures = [];
  const invDir = path.join(dir, ".rngo", "invariants");
  const invFiles = existsSync(invDir)
    ? readdirSync(invDir)
        .filter((f) => f.endsWith(".yml"))
        .sort()
        .map((f) => path.join(invDir, f))
    : [];
  if (invFiles.length === 0) {
    return ["no file found under .rngo/invariants/"];
  }

  for (const f of invFiles) {
    const text = readFileSync(f, "utf8");
    for (const field of ["type: sql", "query:", "expect:"]) {
      if (!text.includes(field)) failures.push(`${f}: missing \`${field}\``);
    }
    if (!/\bfulfillment/.test(text) || !/\b(payment|order)/.test(text)) {
      failures.push(`${f}: query doesn't appear to reference fulfillments and payments/orders`);
    }
    if (!/result\s*==/.test(text)) {
      failures.push(`${f}: expect doesn't look like a \`result ==\` comparison`);
    }
  }

  if (fixtureDir && existsSync(fixtureDir)) {
    const origSpec = path.join(fixtureDir, ".rngo", "spec.yml");
    const newSpec = path.join(dir, ".rngo", "spec.yml");
    if (existsSync(origSpec)) {
      if (!existsSync(newSpec) || sha256(origSpec) !== sha256(newSpec)) {
        failures.push("spec.yml changed from the original fixture");
      }
    }

    const origEffectsDir = path.join(fixtureDir, ".rngo", "effects");
    if (existsSync(origEffectsDir)) {
      for (const name of readdirSync(origEffectsDir).filter((f) => f.endsWith(".yml"))) {
        const origF = path.join(origEffectsDir, name);
        const newF = path.join(dir, ".rngo", "effects", name);
        if (!existsSync(newF) || sha256(origF) !== sha256(newF)) {
          failures.push(`effects/${name} changed from the original fixture`);
        }
      }
    }
  }

  return failures;
}

function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      "eval-name": { type: "string" },
      fixture: { type: "string" },
    },
    allowPositionals: true,
  });

  if (positionals.length !== 1) {
    console.error("usage: run_deterministic.mjs <dir> [--eval-name NAME] [--fixture FIXTURE_DIR]");
    process.exit(2);
  }
  const dir = positionals[0];
  const evalName = values["eval-name"];
  const fixture = values.fixture;

  const results = [];

  const [parseOk, parseDetail] = runParseCheck(dir);
  results.push(["rngo run --stdout parses with no error and emits events", parseOk, parseDetail]);

  const files = readAll(dir, [".rngo/effects", ".rngo/channels", ".rngo/invariants", ".rngo/schemas"]);
  const effectsFiles = readAll(dir, [".rngo/effects"]);

  const oldFields = checkNoOldFieldNames(effectsFiles);
  results.push(["effects use channel:/metadata:, not old system:/format:", oldFields.length === 0, oldFields.join("; ")]);

  const anchors = checkNoRegexAnchors(files);
  results.push(["no ^/$ regex anchors in patterns", anchors.length === 0, anchors.join("; ")]);

  if (evalName && EVAL_CHECKS[evalName]) {
    for (const [label, anchor, tokens] of EVAL_CHECKS[evalName]) {
      const [ok, where] = checkProximity(files, anchor, tokens);
      results.push([label, ok, where || `no \`${anchor}\` found with ${JSON.stringify(tokens)} nearby`]);
    }
  }

  if (evalName === "add-invariant-orders-existing-spec") {
    const failures = checkInvariantEval(dir, fixture);
    results.push(["invariant added correctly; pre-existing files unchanged", failures.length === 0, failures.join("; ")]);
  }

  let failed = 0;
  for (const [label, ok, detail] of results) {
    const status = ok ? "PASS" : "FAIL";
    if (!ok) failed++;
    const suffix = detail && !ok ? ` — ${detail}` : "";
    console.log(`[${status}] ${label}${suffix}`);
  }

  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main();
