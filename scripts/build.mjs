// Regenerates skills/rngo/resources/**/*.md from their source pages on the
// rngo docs site. Each local file mirrors a doc route 1:1: resources/foo/bar.md
// comes from {RNGO_WEB_URL}/docs/foo/bar.md, and a directory's `overview.md`
// comes from that directory's own route ({RNGO_WEB_URL}/docs/foo.md), since
// the site has no separate "overview" segment.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const webUrl = process.env.RNGO_WEB_URL ?? "https://rngo.dev";
const resourcesDir = path.join(root, "skills/rngo/resources");

function listMarkdownFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(entryPath));
    } else if (entry.name.endsWith(".md")) {
      files.push(entryPath);
    }
  }
  return files;
}

function docUrlFor(filePath) {
  const relPath = path.relative(resourcesDir, filePath);
  const parsed = path.parse(relPath);
  const docPath =
    parsed.name === "overview" ? parsed.dir : path.join(parsed.dir, parsed.name);
  return docPath === "" ? `${webUrl}/docs.md` : `${webUrl}/docs/${docPath}.md`;
}

const localFiles = listMarkdownFiles(resourcesDir);

for (const filePath of localFiles) {
  const url = docUrlFor(filePath);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  const content = await res.text();

  if (content !== readFileSync(filePath, "utf8")) {
    writeFileSync(filePath, content);
    console.log(`Updated ${path.relative(root, filePath)} from ${url}`);
  }
}

console.log(`Checked ${localFiles.length} file${localFiles.length === 1 ? "" : "s"} against ${webUrl}.`);
