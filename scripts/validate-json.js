// scripts/validate-json.js
import { readFileSync } from "fs";
import { execSync } from "child_process";

const list = execSync(`git ls-files '*.json'`, { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  // ignore node_modules if any JSON slipped in
  .filter((f) => !f.includes("node_modules"));

let bad = [];
for (const f of list) {
  try {
    JSON.parse(readFileSync(f, "utf8"));
  } catch (e) {
    bad.push({ file: f, error: e.message });
  }
}

if (bad.length) {
  console.error("❌ Malformed JSON files:");
  for (const { file, error } of bad) console.error(`- ${file}: ${error}`);
  process.exit(1);
} else {
  console.log("✅ All JSON files parse correctly.");
}
