// Regenerates the primitive schema type references and linked index in
// skills/{rngo-custom-schema-type,rngo-effect-inference}/ from
// https://rngo.dev/docs/schema/primitive/*.md sources. Each skill gets its
// own copy of references/*.md so it stays self-contained (usable as a
// standalone package, no cross-skill file refs).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const baseUrl = "https://rngo.dev/docs/schema/primitive";

// Kept in sync manually with the primitive schema types documented at baseUrl.
const primitiveNames = [
  "array",
  "constant",
  "context",
  "function",
  "number",
  "object",
  "reference",
  "select",
  "string",
];

const skillDirs = [
  path.join(root, "skills/rngo-custom-schema-type"),
  path.join(root, "skills/rngo-effect-inference"),
];

async function fetchEntry(name) {
  const url = `${baseUrl}/${name}.md`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  const content = await res.text();

  const h1Match = content.match(/^#\s+(.+)$/m);
  if (!h1Match) return null;

  const afterH1 = content.slice(h1Match.index + h1Match[0].length);
  const paragraphMatch = afterH1.match(/\n\s*\n([^\n#][^\n]*(?:\n(?![ \t]*\n)[^\n#][^\n]*)*)/);
  if (!paragraphMatch) return null;

  const paragraph = paragraphMatch[1].replace(/\s+/g, " ").trim();
  // First sentence only, so multi-sentence page intros don't bloat the SKILL.md index.
  const summary = paragraph.split(/(?<=\.)\s+/)[0];

  return { name: h1Match[1].trim(), summary, content };
}

const entries = new Map();
for (const name of primitiveNames) {
  const entry = await fetchEntry(name);
  if (entry) entries.set(entry.name, entry);
}

for (const skillDir of skillDirs) {
  const referencesDir = path.join(skillDir, "references");
  mkdirSync(referencesDir, { recursive: true });
  for (const [name, { content }] of entries) {
    writeFileSync(path.join(referencesDir, `${name}.md`), content);
  }

  const skillPath = path.join(skillDir, "SKILL.md");
  let skill = readFileSync(skillPath, "utf8");

  for (const [name, { summary }] of entries) {
    const indexLine = new RegExp(`^- \\[\`${name}\`\\]\\(references/${name}\\.md\\) — .*$`, "m");
    if (!indexLine.test(skill)) {
      console.warn(`No existing index line for \`${name}\` found in ${skillPath}, skipping`);
      continue;
    }
    skill = skill.replace(indexLine, `- [\`${name}\`](references/${name}.md) — ${summary}`);
  }

  writeFileSync(skillPath, skill);
}

console.log(
  `Regenerated ${entries.size} entr${entries.size === 1 ? "y" : "ies"} for ${skillDirs.length} skills:`,
  [...entries.keys()],
);
