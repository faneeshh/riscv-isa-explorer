/**
 * Tier 1: loads instr_dict.json and groups its instructions by their raw
 * extension tag(s). Also surfaces instructions whose extension list has
 * more than one entry.
 *
 * No normalization happens here — Tier 1 is a faithful read of the JSON.
 * The normalized cross-reference lives in cross_reference.js.
 *
 * This module never prints. The CLI is responsible for formatting.
 */

import { readFileSync } from "node:fs";

export function displayMnemonic(rawKey) {
  if (typeof rawKey !== "string" || rawKey.length === 0) {
    throw new TypeError(
      `Expected a non-empty string, got: ${JSON.stringify(rawKey)}`,
    );
  }
  return rawKey.toUpperCase().replace(/_/g, ".");
}

export function loadInstrDict(filePath) {
  const dict = JSON.parse(readFileSync(filePath, "utf8"));
  if (dict === null || typeof dict !== "object" || Array.isArray(dict)) {
    throw new Error("instr_dict.json must be a plain object at the top level");
  }
  for (const [key, value] of Object.entries(dict)) {
    if (
      value === null ||
      typeof value !== "object" ||
      !Array.isArray(value.extension) ||
      !value.extension.every((e) => typeof e === "string")
    ) {
      throw new Error(
        `Invalid entry "${key}": extension must be an array of strings`,
      );
    }
  }
  return dict;
}

export function groupByRawExtension(dict) {
  const groups = {};
  for (const [key, value] of Object.entries(dict)) {
    const mnemonic = displayMnemonic(key);
    for (const tag of value.extension) {
      if (!groups[tag]) groups[tag] = [];
      groups[tag].push(mnemonic);
    }
  }
  return groups;
}

export function findMultiExtensionInstructions(dict) {
  const result = [];
  for (const [key, value] of Object.entries(dict)) {
    if (value.extension.length > 1) {
      result.push({
        mnemonic: displayMnemonic(key),
        extensions: value.extension,
      });
    }
  }
  return result;
}