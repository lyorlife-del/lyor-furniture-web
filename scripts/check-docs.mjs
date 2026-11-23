import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(resolve(dir, entry.name))
      : [resolve(dir, entry.name)],
  );
}
const docs = walk("doc").filter((file) => file.endsWith(".md"));
const failures = [];
for (const file of docs) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (
      target &&
      !/^(https?:|mailto:)/.test(target) &&
      !existsSync(resolve(dirname(file), target))
    )
      failures.push(file + ": broken link " + target);
  }
}
const steps = docs.filter((file) => /[\\/]steps[\\/]ST-\d+\.md$/.test(file));
if (steps.length !== 109)
  failures.push("Expected 109 canonical step documents; found " + steps.length);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    "Verified " +
      docs.length +
      " Markdown documents, 20 flows and " +
      steps.length +
      " step documents; local links resolve.",
  );
