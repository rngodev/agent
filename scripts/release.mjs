// Bumps the version, commits the release, and tags it. Run via `just release
// [minor|patch]`. Pushing (git push && git push origin <tag>) is left to the
// caller so the trigger for CI (a release tag landing on GitHub) is explicit.
// Also updates each skill's skills/*/.version to keep them in sync with the
// root VERSION.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const versionFile = path.join(root, "VERSION");
const skillsDir = path.join(root, "skills");
const skillVersionFiles = readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(skillsDir, entry.name, ".version"));

const bump = process.argv[2] ?? "minor";
if (bump !== "minor" && bump !== "patch") {
  console.error(`Unknown bump type "${bump}", expected "minor" or "patch"`);
  process.exit(1);
}

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

const status = git(["status", "--porcelain"]);
if (status !== "") {
  console.error("Working tree is not clean, aborting release.");
  process.exit(1);
}

const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
if (branch !== "main") {
  console.error(`Releases must be cut from main, currently on "${branch}".`);
  process.exit(1);
}

const currentVersion = existsSync(versionFile)
  ? readFileSync(versionFile, "utf8").trim()
  : "0.0.0";

const match = currentVersion.match(/^0\.(\d+)\.(\d+)$/);
if (!match) {
  console.error(`VERSION "${currentVersion}" doesn't look like 0.x.x, aborting.`);
  process.exit(1);
}

const minor = Number(match[1]);
const patch = Number(match[2]);
const nextVersion =
  bump === "minor" ? `0.${minor + 1}.0` : `0.${minor}.${patch + 1}`;
const tag = nextVersion;

if (git(["tag", "--list", tag])) {
  console.error(`Tag ${tag} already exists, aborting.`);
  process.exit(1);
}

writeFileSync(versionFile, `${nextVersion}\n`);
git(["add", versionFile]);

for (const skillVersionFile of skillVersionFiles) {
  writeFileSync(skillVersionFile, `${nextVersion}\n`);
  git(["add", skillVersionFile]);
}

git(["commit", "-m", `Release ${tag}`]);
git(["tag", "-a", tag, "-m", `Release ${tag}`]);

console.log(`Created release commit and tag ${tag}.`);
console.log(`Push with: git push && git push origin ${tag}`);
