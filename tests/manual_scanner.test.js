import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  walkAdocFiles,
  scanManualForExtensions,
} from "../src/manual_scanner.js";

function makeFakeManual(files) {
  const root = mkdtempSync(join(tmpdir(), "riscv-manual-test-"));
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

test("walkAdocFiles: returns only .adoc files", () => {
  const root = makeFakeManual({
    "a.adoc": "",
    "b.txt": "",
    "sub/c.adoc": "",
    "sub/d.md": "",
  });
  try {
    const files = walkAdocFiles(root).map((p) => p.slice(root.length + 1));
    assert.deepEqual(files.sort(), ["a.adoc", join("sub", "c.adoc")].sort());
  } finally {
    cleanup(root);
  }
});

test("walkAdocFiles: recurses into nested directories", () => {
  const root = makeFakeManual({
    "a.adoc": "",
    "x/y/z/deep.adoc": "",
  });
  try {
    const files = walkAdocFiles(root);
    assert.equal(files.length, 2);
  } finally {
    cleanup(root);
  }
});

test("scanManualForExtensions: finds candidates that appear with word boundaries", () => {
  const root = makeFakeManual({
    "a.adoc": "The Zba extension provides shifted-add instructions.",
    "b.adoc": "The Zbb extension and Zicsr are also documented.",
  });
  try {
    const found = scanManualForExtensions(root, ["Zba", "Zbb", "Zicsr", "Zbc"]);
    assert.deepEqual([...found].sort(), ["Zba", "Zbb", "Zicsr"]);
  } finally {
    cleanup(root);
  }
});

test("scanManualForExtensions: word boundaries prevent substring matches", () => {
  const root = makeFakeManual({
    "a.adoc": "Words like Zban and Zbat are different extensions.",
  });
  try {
    const found = scanManualForExtensions(root, ["Zba"]);
    assert.deepEqual([...found], []);
  } finally {
    cleanup(root);
  }
});

test("scanManualForExtensions: matching is case-sensitive", () => {
  const root = makeFakeManual({
    "a.adoc": "The zba extension (lowercase) should not match.",
  });
  try {
    const found = scanManualForExtensions(root, ["Zba"]);
    assert.deepEqual([...found], []);
  } finally {
    cleanup(root);
  }
});

test("scanManualForExtensions: single-letter extensions match in prose", () => {
  const root = makeFakeManual({
    "a.adoc": "The M extension provides multiplication.",
  });
  try {
    const found = scanManualForExtensions(root, ["M", "F"]);
    assert.deepEqual([...found], ["M"]);
  } finally {
    cleanup(root);
  }
});

test("scanManualForExtensions: empty candidate list returns empty set without I/O", () => {
  const found = scanManualForExtensions("/this/path/does/not/exist", []);
  assert.equal(found.size, 0);
});

test("scanManualForExtensions: handles regex-special characters in candidates", () => {
  const root = makeFakeManual({
    "a.adoc": "Mentions Zfh.",
  });
  try {
    const found = scanManualForExtensions(root, ["Zfh", "Z.fh"]);
    assert.deepEqual([...found], ["Zfh"]);
  } finally {
    cleanup(root);
  }
});