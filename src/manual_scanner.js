/**
 * Tier 2 (scan phase): walks the .adoc files in the ISA manual's src/ tree
 * and returns the subset of given candidate extension names that appear in
 * at least one file, matched with word boundaries.
 *
 * AsciiDoc is treated as plain text — no real parsing. This means the scan
 * picks up mentions inside code blocks too, which we accept as a known limit.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

function escapeForRegex(str) {
  if (typeof RegExp.escape === "function") return RegExp.escape(str);
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function walkAdocFiles(rootDir) {
  const results = [];
  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkAdocFiles(fullPath));
    } else if (entry.name.endsWith(".adoc")) {
      results.push(fullPath);
    }
  }
  return results;
}

export function scanManualForExtensions(manualSrcDir, candidates) {
  const candidateArray = [...candidates];
  if (candidateArray.length === 0) return new Set();

  const pattern = new RegExp(
    `\\b(?:${candidateArray.map(escapeForRegex).join("|")})\\b`,
    "g",
  );

  const seenText = new Set();
  for (const filePath of walkAdocFiles(manualSrcDir)) {
    const content = readFileSync(filePath, "utf8");
    for (const match of content.matchAll(pattern)) {
      seenText.add(match[0]);
    }
  }

  const found = new Set();
  for (const candidate of candidateArray) {
    if (seenText.has(candidate)) found.add(candidate);
  }
  return found;
}