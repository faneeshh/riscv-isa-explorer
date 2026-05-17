import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectJsonExtensions,
  collectCandidatesFromFilenames,
  crossReference,
} from "../src/cross_reference.js";

function makeFakeManual(files) {
  const root = mkdtempSync(join(tmpdir(), "riscv-xref-test-"));
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = join(root, relPath);
    mkdirSync(join(fullPath, ".."), { recursive: true });
    writeFileSync(fullPath, content);
  }
  return root;
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

const FIXTURE_DICT = {
  add:      { extension: ["rv_i"] },
  sh1add:   { extension: ["rv_zba"] },
  add_uw:   { extension: ["rv64_zba"] },
  fadd_d:   { extension: ["rv_d"] },
  aes32dsi: { extension: ["rv32_zknd", "rv32_zk", "rv32_zkn"] },
};

test("collectJsonExtensions: returns normalized extensions from the dict", () => {
  const exts = collectJsonExtensions(FIXTURE_DICT);
  assert.deepEqual(
    [...exts].sort(),
    ["D", "I", "Zba", "Zk", "Zkn", "Zknd"].sort(),
  );
});

test("collectJsonExtensions: collapses XLEN variants", () => {
  const exts = collectJsonExtensions(FIXTURE_DICT);
  assert.equal(exts.has("Zba"), true);
  assert.equal([...exts].filter((e) => e.toLowerCase() === "zba").length, 1);
});

test("collectCandidatesFromFilenames: capitalizes single letters and stems", () => {
  const root = makeFakeManual({
    "priv/smrnmi.adoc": "",
    "priv/svinval.adoc": "",
    "unpriv/zba.adoc": "",
    "unpriv/m-st-ext.adoc": "",
    "unpriv/a.adoc": "",
  });
  try {
    const cands = collectCandidatesFromFilenames(root);
    assert.equal(cands.has("Smrnmi"), true);
    assert.equal(cands.has("Svinval"), true);
    assert.equal(cands.has("Zba"), true);
    assert.equal(cands.has("A-st-ext"), false);
    assert.equal(cands.has("A"), false);
  } finally {
    cleanup(root);
  }
});

test("collectCandidatesFromFilenames: skips missing priv or unpriv directories", () => {
  const root = makeFakeManual({
    "unpriv/zba.adoc": "",
  });
  try {
    const cands = collectCandidatesFromFilenames(root);
    assert.deepEqual([...cands], ["Zba"]);
  } finally {
    cleanup(root);
  }
});

test("crossReference: partitions extensions into inBoth, jsonOnly, manualOnly", () => {
  const root = makeFakeManual({
    "priv/smrnmi.adoc": "The Smrnmi extension is described here.",
    "unpriv/zba.adoc": "The Zba extension provides shifted-add. I extension is base. D extension is double-precision.",
    "unpriv/zk.adoc": "The Zk extension. Also mentions Zkn and Zknd.",
  });
  try {
    const report = crossReference(FIXTURE_DICT, root);

    assert.equal(report.inBoth.has("Zba"), true);
    assert.equal(report.inBoth.has("I"), true);
    assert.equal(report.inBoth.has("D"), true);
    assert.equal(report.inBoth.has("Zk"), true);
    assert.equal(report.inBoth.has("Zkn"), true);
    assert.equal(report.inBoth.has("Zknd"), true);

    assert.equal(report.manualOnly.has("Smrnmi"), true);
    assert.equal(report.jsonOnly.size, 0);

    assert.equal(report.summary.matched, 6);
    assert.equal(report.summary.manualOnly, 1);
    assert.equal(report.summary.jsonOnly, 0);
  } finally {
    cleanup(root);
  }
});

test("crossReference: extensions in JSON but not in manual go to jsonOnly", () => {
  const root = makeFakeManual({
    "unpriv/zba.adoc": "The Zba extension.",
  });
  try {
    const dict = {
      add: { extension: ["rv_i"] },
      sh1add: { extension: ["rv_zba"] },
      obsolete: { extension: ["rv_zbp"] },
    };
    const report = crossReference(dict, root);
    assert.equal(report.jsonOnly.has("I"), true);
    assert.equal(report.jsonOnly.has("Zbp"), true);
    assert.equal(report.inBoth.has("Zba"), true);
  } finally {
    cleanup(root);
  }
});