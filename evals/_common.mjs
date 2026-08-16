// Shared helpers for the rngo skill eval scripts.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export function loadEvals(workspace) {
  return JSON.parse(readFileSync(path.join(workspace, "evals.json"), "utf8")).evals;
}

// Fixtures are named as a suffix of their eval_name, e.g. eval
// `fresh-infer-blog-node-prisma` -> fixture `blog-node-prisma`.
export function resolveFixture(workspace, evalName) {
  const fixturesDir = path.join(workspace, "fixtures");
  const candidates = readdirSync(fixturesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && evalName.endsWith(d.name))
    .map((d) => d.name);
  if (candidates.length === 0) {
    throw new Error(`no fixture in ${fixturesDir} matches eval_name ${JSON.stringify(evalName)}`);
  }
  const best = candidates.reduce((a, b) => (b.length > a.length ? b : a));
  return path.join(fixturesDir, best);
}

export function selectEvals(evals, wanted, selectAll) {
  if (selectAll) return evals;
  const wantedSet = new Set(wanted);
  const selected = evals.filter((e) => wantedSet.has(String(e.id)) || wantedSet.has(e.eval_name));
  const found = new Set();
  for (const e of selected) {
    found.add(String(e.id));
    found.add(e.eval_name);
  }
  const missing = [...wantedSet].filter((w) => !found.has(w)).sort();
  if (missing.length > 0) {
    throw new Error(`no eval matched: ${JSON.stringify(missing)}`);
  }
  return selected;
}
