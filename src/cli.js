import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadInstrDict,
  groupByRawExtension,
  findMultiExtensionInstructions,
} from "./parser.js";
import { crossReference } from "./cross_reference.js";
import { buildSharedInstructionEdges, formatAsDot } from "./graph.js";

const PROJECT_ROOT = path.resolve(fileURLToPath(import.meta.url), "../../");
const INSTR_DICT_PATH = path.join(PROJECT_ROOT, "data", "instr_dict.json");
const MANUAL_SRC_DIR = path.join(
  PROJECT_ROOT,
  "data",
  "riscv-isa-manual",
  "src",
);
const DOT_OUTPUT_PATH = path.join(PROJECT_ROOT, "shared_graph.dot");

function sectionHeader(title) {
  console.log(title);
  console.log("-".repeat(title.length));
  console.log("");
}

function wrapList(items, width, indent) {
  const pad = " ".repeat(indent);
  const lines = [];
  let current = pad;
  for (let i = 0; i < items.length; i++) {
    const chunk = items[i] + (i < items.length - 1 ? ", " : "");
    if (current.length + chunk.length > width && current.trim().length > 0) {
      lines.push(current.trimEnd());
      current = pad + chunk;
    } else {
      current += chunk;
    }
  }
  if (current.trim().length > 0) lines.push(current.trimEnd());
  return lines.join("\n");
}

function main() {
  try {
    const banner = "RISC-V ISA Explorer";
    console.log(banner);
    console.log("=".repeat(banner.length));
    console.log("");

    // Tier 1
    const dict = loadInstrDict(INSTR_DICT_PATH);
    const groups = groupByRawExtension(dict);
    const multiExt = findMultiExtensionInstructions(dict);

    sectionHeader("TIER 1: Instruction Set Parsing");

    const totalTags = Object.keys(groups).length;
    const totalInstructions = Object.keys(dict).length;
    console.log(
      `${totalTags} distinct extension tags across ${totalInstructions} instructions.`,
    );
    console.log("");

    const sortedTags = Object.entries(groups).sort(
      (a, b) => b[1].length - a[1].length,
    );
    console.log("Top 20 by instruction count:");
    console.log("");
    for (const [tag, mnemonics] of sortedTags.slice(0, 20)) {
      const tagCol = tag.padEnd(20);
      const countCol = String(mnemonics.length).padEnd(3);
      console.log(`${tagCol}  |  ${countCol}  |  e.g. ${mnemonics[0]}`);
    }
    console.log();
    console.log(`(Showing top 20 of ${totalTags} tags.)`);
    console.log("");

    console.log(
      `${multiExt.length} instructions belong to more than one extension.`,
    );
    console.log("");
    const showMulti = multiExt.slice(0, 10);
    for (const { mnemonic, extensions } of showMulti) {
      console.log(`${mnemonic.padEnd(12)}  ${extensions.join(", ")}`);
    }
    if (multiExt.length > 10) {
      console.log(`(Showing first 10 of ${multiExt.length}.)`);
    }

    console.log("");

    // Tier 2
    sectionHeader("TIER 2: Cross-Reference with ISA Manual");

    const { inBoth, jsonOnly, manualOnly, summary } = crossReference(
      dict,
      MANUAL_SRC_DIR,
    );
    console.log(
      `${summary.matched} matched, ${summary.jsonOnly} in JSON only, ${summary.manualOnly} in manual only.`,
    );
    console.log("");

    console.log(
      "JSON only (extensions with instructions but no chapter in the manual):",
    );
    console.log("");
    console.log(wrapList([...jsonOnly].sort(), 70, 2));
    console.log("");

    console.log(
      "Manual only (extensions documented but with no instructions in JSON):",
    );
    console.log("");
    console.log(wrapList([...manualOnly].sort(), 70, 2));

    console.log("");

    // Tier 3
    sectionHeader("TIER 3: Shared-Instruction Graph");

    const edges = buildSharedInstructionEdges(dict);
    console.log(
      `${edges.length} extension pairs share at least one instruction.`,
    );
    console.log("");
    console.log("Top 10 most-shared pairs:");
    for (const { a, b, count } of edges.slice(0, 10)) {
      console.log(`${a.padEnd(20)}  --  ${b}  (${count} shared)`);
    }
    console.log("");

    writeFileSync(DOT_OUTPUT_PATH, formatAsDot(edges), "utf8");
    console.log(
      'Full graph written to shared_graph.dot (run "dot -Tpng shared_graph.dot -o shared_graph.png" to render).',
    );
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exit(1);
  }
}

main();
