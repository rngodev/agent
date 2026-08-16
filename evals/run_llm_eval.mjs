#!/usr/bin/env node
// Run the rngo skill against its eval fixtures via a live `claude -p` agent,
// then grade the result against evals.json assertions with an LLM judge.
//
// Requires the `claude` CLI on PATH and authenticated (same as any other
// `claude -p` call — set ANTHROPIC_API_KEY or whatever auth this environment
// normally uses). Each eval costs two model calls (execution + grading) and
// runs the executor with --permission-mode bypassPermissions, scoped to a
// throwaway copy of the fixture — it does not touch your real working tree.
//
// Usage:
//     run_llm_eval.mjs --eval 0 --eval 2      # by id
//     run_llm_eval.mjs --eval fresh-infer-blog-node-prisma
//     run_llm_eval.mjs --all
//     run_llm_eval.mjs --all --model sonnet
//
// Writes results to eval-runs/<timestamp>/eval-<id>-<name>/:
//     repo/               throwaway fixture copy the executor ran against
//     result.txt          executor's final message
//     timing.json         duration/cost/usage for the executor call
//     outputs/.rngo        copy of the produced .rngo directory
//     deterministic.txt   output of run_deterministic.mjs against outputs/
//     grading.json         LLM judge verdict per assertion, with evidence
//
// Exits non-zero if any selected eval has a failing assertion — usable as a CI
// gate, though given the cost/latency of live model calls you'll likely want
// to run this less often than plain `run_deterministic.mjs`.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { loadEvals, resolveFixture, selectEvals } from "./_common.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE = HERE;
const SKILL_DIR = path.join(WORKSPACE, "..", "skills", "rngo");

const GRADING_SCHEMA = {
  type: "object",
  properties: {
    expectations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          passed: { type: "boolean" },
          evidence: { type: "string" },
        },
        required: ["text", "passed", "evidence"],
      },
    },
    summary: {
      type: "object",
      properties: {
        passed: { type: "integer" },
        failed: { type: "integer" },
        total: { type: "integer" },
        pass_rate: { type: "number" },
      },
      required: ["passed", "failed", "total", "pass_rate"],
    },
  },
  required: ["expectations", "summary"],
};

function runExecution(prompt, repoDir, model) {
  const skillsDir = path.join(repoDir, ".claude", "skills");
  mkdirSync(skillsDir, { recursive: true });
  const skillLink = path.join(skillsDir, "rngo");
  if (!existsSync(skillLink)) {
    symlinkSync(SKILL_DIR, skillLink, "dir");
  }

  const args = ["-p", prompt, "--output-format", "json", "--permission-mode", "bypassPermissions"];
  if (model) args.push("--model", model);

  const start = Date.now();
  const proc = spawnSync("claude", args, {
    cwd: repoDir,
    encoding: "utf8",
    timeout: 900_000,
    maxBuffer: 1024 * 1024 * 64,
  });
  const duration = (Date.now() - start) / 1000;
  if (proc.status !== 0) {
    throw new Error(`executor \`claude -p\` failed (exit ${proc.status}): ${(proc.stderr || "").slice(-2000)}`);
  }
  return [JSON.parse(proc.stdout), duration];
}

function runGrading(assertions, outputsDir, deterministicReport, model) {
  const prompt =
    "Grade a coding agent's output against these assertions. For each one, decide " +
    "pass/fail with concrete evidence — read the actual files under " +
    `${outputsDir}, don't take claims on faith. Independently verify everything, ` +
    "including the assertions the deterministic report below already checked.\n\n" +
    "Assertions:\n" +
    assertions.map((a) => `- ${a}`).join("\n") +
    "\n\n" +
    "Deterministic check output (for reference only):\n" +
    deterministicReport +
    "\n\n" +
    "Respond with JSON matching the required schema only.";

  const args = [
    "-p",
    prompt,
    "--output-format",
    "json",
    "--permission-mode",
    "bypassPermissions",
    "--allowed-tools",
    "Read,Glob,Grep,Bash",
    "--json-schema",
    JSON.stringify(GRADING_SCHEMA),
  ];
  if (model) args.push("--model", model);

  const proc = spawnSync("claude", args, {
    cwd: path.dirname(outputsDir),
    encoding: "utf8",
    timeout: 600_000,
    maxBuffer: 1024 * 1024 * 64,
  });
  if (proc.status !== 0) {
    throw new Error(`grader \`claude -p\` failed (exit ${proc.status}): ${(proc.stderr || "").slice(-2000)}`);
  }
  const envelope = JSON.parse(proc.stdout);
  // with --json-schema, the schema-conformant payload is in `structured_output`,
  // not `result` (which is left empty)
  return envelope.structured_output;
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      eval: { type: "string", multiple: true, default: [] },
      all: { type: "boolean", default: false },
      model: { type: "string" },
      "out-dir": { type: "string" },
    },
  });

  if (!values.all && values.eval.length === 0) {
    console.error("pass --eval <id|name> (repeatable) or --all");
    process.exit(1);
  }

  const outDir = values["out-dir"] ? path.resolve(values["out-dir"]) : path.join(WORKSPACE, "eval-runs");

  const evals = loadEvals(WORKSPACE);
  const selected = selectEvals(evals, values.eval, values.all);

  const runDir = path.join(outDir, timestamp());
  let overallOk = true;

  for (const ev of selected) {
    const evalDir = path.join(runDir, `eval-${ev.id}-${ev.eval_name}`);
    const repoDir = path.join(evalDir, "repo");
    const fixture = resolveFixture(WORKSPACE, ev.eval_name);
    mkdirSync(evalDir, { recursive: true });
    cpSync(fixture, repoDir, { recursive: true });

    console.log(`\n=== eval ${ev.id} (${ev.eval_name}) — running skill against ${path.basename(fixture)} ===`);
    const [result, duration] = runExecution(ev.prompt, repoDir, values.model);
    writeFileSync(path.join(evalDir, "result.txt"), result.result || "");
    writeFileSync(
      path.join(evalDir, "timing.json"),
      JSON.stringify(
        {
          duration_ms: Math.round(duration * 1000),
          total_cost_usd: result.total_cost_usd,
          usage: result.usage,
        },
        null,
        2
      )
    );

    const outputsDir = path.join(evalDir, "outputs");
    mkdirSync(outputsDir, { recursive: true });
    const producedRngo = path.join(repoDir, ".rngo");
    if (existsSync(producedRngo)) {
      cpSync(producedRngo, path.join(outputsDir, ".rngo"), { recursive: true });
    }

    const det = spawnSync(
      process.execPath,
      [path.join(HERE, "run_deterministic.mjs"), outputsDir, "--eval-name", ev.eval_name, "--fixture", fixture],
      { encoding: "utf8" }
    );
    writeFileSync(path.join(evalDir, "deterministic.txt"), (det.stdout || "") + (det.stderr || ""));
    console.log((det.stdout || "").trim());
    if (det.status !== 0) overallOk = false;

    console.log(`--- grading against ${ev.assertions.length} assertions ---`);
    const grading = runGrading(ev.assertions, outputsDir, det.stdout || "", values.model);
    writeFileSync(path.join(evalDir, "grading.json"), JSON.stringify(grading, null, 2));

    for (const exp of grading.expectations) {
      const status = exp.passed ? "PASS" : "FAIL";
      console.log(`[${status}] ${exp.text}`);
      if (!exp.passed) {
        console.log(`       ${exp.evidence}`);
        overallOk = false;
      }
    }

    console.log(`summary: ${grading.summary.passed}/${grading.summary.total} passed`);
  }

  console.log(`\nresults written to ${runDir}`);
  process.exit(overallOk ? 0 : 1);
}

main();
