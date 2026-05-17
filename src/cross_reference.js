/**
 * Tier 2 (cross-reference phase): produces the report of which extensions
 * are documented in both the JSON catalog and the ISA manual, vs which are
 * in only one source.
 *
 * Candidate names for the manual scan come from two places:
 *   1. Normalized extensions in the JSON (so we can confirm those mentions).
 *   2. Filename stems in the manual's src/priv and src/unpriv directories
 *      (which correspond to chapters that often document an extension).
 *
 * The scanner does the final verification: a candidate only counts as
 * "in the manual" if its name appears as a standalone word in some .adoc
 * file. This filters out filename-derived candidates that turned out to be
 * generic chapter names like "intro" or "preface".
 */

import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { normalizeExtensions } from "./normalize.js";
import { scanManualForExtensions } from "./manual_scanner.js";

const SINGLE_LETTER_EXTENSIONS = new Set([
  "i", "m", "a", "f", "d", "q", "c", "v", "h", "s", "u",
]);

const FILENAME_RE = /^[a-z][a-z0-9]+\.adoc$/;

// Chapter filenames whose stems aren't extension names (categories, prefixes,
// or general spec sections). Derived empirically from the current manual.
const NON_EXTENSION_CHAPTER_NAMES = new Set([
  "Base", "Crypto", "Hypervisor", "Machine", "Matrix", "Naming",
  "Preface", "Priv", "Rationale", "Supervisor",
  "Sh", "Sm", "Ss", "Sv",
  "Za", "Zb", "Zp",
]);

function capitalizeFileStem(stem) {
  return SINGLE_LETTER_EXTENSIONS.has(stem)
    ? stem.toUpperCase()
    : stem.charAt(0).toUpperCase() + stem.slice(1).toLowerCase();
}

export function collectJsonExtensions(dict) {
  const result = new Set();
  for (const value of Object.values(dict)) {
    for (const ext of normalizeExtensions(value.extension)) {
      result.add(ext);
    }
  }
  return result;
}

export function collectCandidatesFromFilenames(manualSrcDir) {
  const result = new Set();
  for (const subdir of ["priv", "unpriv"]) {
    const dir = path.join(manualSrcDir, subdir);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!FILENAME_RE.test(name)) continue;
      const stem = name.slice(0, -".adoc".length);
      const capitalized = capitalizeFileStem(stem);
      if (NON_EXTENSION_CHAPTER_NAMES.has(capitalized)) continue;
      result.add(capitalized);
    }
  }
  return result;
}

export function crossReference(dict, manualSrcDir) {
  const jsonExtensions = collectJsonExtensions(dict);
  const filenameCandidates = collectCandidatesFromFilenames(manualSrcDir);
  const allCandidates = new Set([...jsonExtensions, ...filenameCandidates]);
  const foundInManual = scanManualForExtensions(manualSrcDir, allCandidates);

  const inBoth = new Set();
  const jsonOnly = new Set();
  const manualOnly = new Set();

  for (const ext of jsonExtensions) {
    if (foundInManual.has(ext)) {
      inBoth.add(ext);
    } else {
      jsonOnly.add(ext);
    }
  }
  for (const ext of foundInManual) {
    if (!jsonExtensions.has(ext)) {
      manualOnly.add(ext);
    }
  }

  return {
    inBoth,
    jsonOnly,
    manualOnly,
    summary: {
      matched: inBoth.size,
      jsonOnly: jsonOnly.size,
      manualOnly: manualOnly.size,
    },
  };
}