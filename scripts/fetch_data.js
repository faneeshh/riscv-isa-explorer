/**
 * Fetches the data files this tool needs into ./data/:
 *   - instr_dict.json from rpsene/riscv-extensions-landscape
 *   - the riscv-isa-manual repo, shallow-cloned (or git-pulled if present)
 *
 * Run with: npm run fetch
 * Requires: Node 18+ (for global fetch), git on PATH.
 */

import { execFileSync } from "node:child_process";
import { writeFile, access, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const INSTR_DICT_URL =
  "https://raw.githubusercontent.com/rpsene/riscv-extensions-landscape/main/src/instr_dict.json";
const MANUAL_REPO_URL = "https://github.com/riscv/riscv-isa-manual.git";
const DATA_DIR = path.resolve(fileURLToPath(import.meta.url), "../../data");

async function fetchInstrDict() {
  console.log("Fetching instr_dict.json...");
  const res = await fetch(INSTR_DICT_URL);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch instr_dict.json: ${res.status} ${res.statusText}`,
    );
  }
  await writeFile(path.join(DATA_DIR, "instr_dict.json"), await res.text());
}

async function cloneOrUpdateManual() {
  const dest = path.join(DATA_DIR, "riscv-isa-manual");
  const exists = await access(dest).then(
    () => true,
    () => false,
  );
  if (exists) {
    console.log("Updating riscv-isa-manual...");
    execFileSync("git", ["-C", dest, "pull", "--quiet"], { stdio: "inherit" });
  } else {
    console.log("Cloning riscv-isa-manual...");
    execFileSync(
      "git",
      ["clone", "--depth", "1", "--quiet", MANUAL_REPO_URL, dest],
      { stdio: "inherit" },
    );
  }
}

async function main() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await fetchInstrDict();
    await cloneOrUpdateManual();
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exit(1);
  }
}

main();