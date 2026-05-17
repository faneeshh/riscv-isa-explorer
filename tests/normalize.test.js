import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeTag, normalizeExtensions } from "../src/normalize.js";

test("normalizeTag: strips rv_ prefix", () => {
  assert.deepEqual(normalizeTag("rv_zba"), ["Zba"]);
});

test("normalizeTag: strips rv32_ and rv64_ prefixes", () => {
  assert.deepEqual(normalizeTag("rv32_zba"), ["Zba"]);
  assert.deepEqual(normalizeTag("rv64_zba"), ["Zba"]);
});

test("normalizeTag: uppercases known single letters", () => {
  assert.deepEqual(normalizeTag("rv_i"), ["I"]);
  assert.deepEqual(normalizeTag("rv_m"), ["M"]);
  assert.deepEqual(normalizeTag("rv_v"), ["V"]);
});

test("normalizeTag: splits compound tags", () => {
  assert.deepEqual(normalizeTag("rv_d_zfa"), ["D", "Zfa"]);
  assert.deepEqual(normalizeTag("rv_zabha_zacas"), ["Zabha", "Zacas"]);
});

test("normalizeTag: handles longer extension names", () => {
  assert.deepEqual(normalizeTag("rv_smrnmi"), ["Smrnmi"]);
  assert.deepEqual(normalizeTag("rv_svinval"), ["Svinval"]);
  assert.deepEqual(normalizeTag("rv_zifencei"), ["Zifencei"]);
});

test("normalizeTag: tag with no rv_ prefix is passed through", () => {
  assert.deepEqual(normalizeTag("zba"), ["Zba"]);
});

test("normalizeTag: rejects non-string input", () => {
  assert.throws(() => normalizeTag(null), TypeError);
  assert.throws(() => normalizeTag(undefined), TypeError);
  assert.throws(() => normalizeTag(42), TypeError);
  assert.throws(() => normalizeTag(""), TypeError);
});

test("normalizeExtensions: collapses XLEN variants", () => {
  assert.deepEqual(normalizeExtensions(["rv_a", "rv64_a"]), ["A"]);
});

test("normalizeExtensions: flattens compound tags into the result", () => {
  assert.deepEqual(normalizeExtensions(["rv_d_zfa"]), ["D", "Zfa"]);
});

test("normalizeExtensions: deduplicates across multiple tags", () => {
  assert.deepEqual(
    normalizeExtensions(["rv_zba", "rv64_zba", "rv_zbb"]),
    ["Zba", "Zbb"],
  );
});

test("normalizeExtensions: preserves first-seen order", () => {
  assert.deepEqual(
    normalizeExtensions(["rv_zbb", "rv_zba", "rv_zbb"]),
    ["Zbb", "Zba"],
  );
});

test("normalizeExtensions: empty array returns empty array", () => {
  assert.deepEqual(normalizeExtensions([]), []);
});

test("normalizeExtensions: null and undefined are treated as empty", () => {
  assert.deepEqual(normalizeExtensions(null), []);
  assert.deepEqual(normalizeExtensions(undefined), []);
});