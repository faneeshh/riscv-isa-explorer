import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  displayMnemonic,
  loadInstrDict,
  groupByRawExtension,
  findMultiExtensionInstructions,
} from "../src/parser.js";

const FIXTURE = {
  add: {
    encoding: "0000000----------000-----0110011",
    extension: ["rv_i"],
    match: "0x33",
    mask: "0xfe00707f",
  },
  sc_w: {
    encoding: "00011------------010-----0101111",
    extension: ["rv_a"],
    match: "0x1800202f",
    mask: "0xf800707f",
  },
  aes32dsi: {
    encoding: "----",
    extension: ["rv32_zknd", "rv32_zk", "rv32_zkn"],
    match: "0x0",
    mask: "0x0",
  },
  fadd_d: {
    encoding: "----",
    extension: ["rv_d"],
    match: "0x0",
    mask: "0x0",
  },
};

function withFixture(fixture, fn) {
  const dir = mkdtempSync(join(tmpdir(), "riscv-parser-test-"));
  const path = join(dir, "instr_dict.json");
  writeFileSync(path, JSON.stringify(fixture));
  try {
    fn(path);
  } finally {
    unlinkSync(path);
  }
}

test("displayMnemonic: uppercases and converts underscores to dots", () => {
  assert.equal(displayMnemonic("add"), "ADD");
  assert.equal(displayMnemonic("sc_w"), "SC.W");
  assert.equal(displayMnemonic("fadd_d"), "FADD.D");
});

test("displayMnemonic: rejects non-string and empty input", () => {
  assert.throws(() => displayMnemonic(""), TypeError);
  assert.throws(() => displayMnemonic(null), TypeError);
  assert.throws(() => displayMnemonic(42), TypeError);
});

test("loadInstrDict: reads and returns a valid file", () => {
  withFixture(FIXTURE, (path) => {
    const dict = loadInstrDict(path);
    assert.equal(Object.keys(dict).length, 4);
    assert.deepEqual(dict.add.extension, ["rv_i"]);
  });
});

test("loadInstrDict: rejects a top-level array", () => {
  withFixture([], (path) => {
    assert.throws(() => loadInstrDict(path), /plain object/);
  });
});

test("loadInstrDict: rejects an entry whose extension is not an array", () => {
  withFixture({ bad: { extension: "rv_i" } }, (path) => {
    assert.throws(() => loadInstrDict(path), /Invalid entry "bad"/);
  });
});

test("loadInstrDict: rejects an entry whose extension array has non-strings", () => {
  withFixture({ bad: { extension: ["rv_i", 42] } }, (path) => {
    assert.throws(() => loadInstrDict(path), /Invalid entry "bad"/);
  });
});

test("groupByRawExtension: builds a tag-to-mnemonics map", () => {
  const groups = groupByRawExtension(FIXTURE);
  assert.deepEqual(groups.rv_i, ["ADD"]);
  assert.deepEqual(groups.rv_a, ["SC.W"]);
  assert.deepEqual(groups.rv_d, ["FADD.D"]);
});

test("groupByRawExtension: instruction with multiple tags appears under each", () => {
  const groups = groupByRawExtension(FIXTURE);
  assert.deepEqual(groups.rv32_zknd, ["AES32DSI"]);
  assert.deepEqual(groups.rv32_zk, ["AES32DSI"]);
  assert.deepEqual(groups.rv32_zkn, ["AES32DSI"]);
});

test("groupByRawExtension: preserves first-seen tag order", () => {
  const groups = groupByRawExtension(FIXTURE);
  assert.deepEqual(
    Object.keys(groups),
    ["rv_i", "rv_a", "rv32_zknd", "rv32_zk", "rv32_zkn", "rv_d"],
  );
});

test("findMultiExtensionInstructions: returns only entries with multiple tags", () => {
  const multi = findMultiExtensionInstructions(FIXTURE);
  assert.equal(multi.length, 1);
  assert.equal(multi[0].mnemonic, "AES32DSI");
  assert.deepEqual(multi[0].extensions, ["rv32_zknd", "rv32_zk", "rv32_zkn"]);
});

test("findMultiExtensionInstructions: empty dict returns empty array", () => {
  assert.deepEqual(findMultiExtensionInstructions({}), []);
});