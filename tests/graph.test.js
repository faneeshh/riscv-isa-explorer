import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSharedInstructionGraph,
  buildSharedInstructionEdges,
  formatAsDot,
} from "../src/graph.js";

const FIXTURE = {
  add: { extension: ["rv_i"] },
  aes32dsi: { extension: ["rv32_zknd", "rv32_zk", "rv32_zkn"] },
  aes32esi: { extension: ["rv32_zkne", "rv32_zk", "rv32_zkn"] },
  andn: { extension: ["rv_zbb", "rv_zkn", "rv_zk"] },
};

test("buildSharedInstructionGraph: builds a symmetric adjacency map", () => {
  const g = buildSharedInstructionGraph(FIXTURE);
  assert.equal(g.rv32_zk.has("rv32_zkn"), true);
  assert.equal(g.rv32_zkn.has("rv32_zk"), true);
});

test("buildSharedInstructionGraph: excludes self-edges and single-extension instructions", () => {
  const g = buildSharedInstructionGraph(FIXTURE);
  assert.equal(g.rv_i, undefined);
  for (const neighbors of Object.values(g)) {
    for (const n of neighbors) {
      assert.notEqual(g[n], undefined);
    }
  }
});

test("buildSharedInstructionEdges: counts shared instructions per pair", () => {
  const edges = buildSharedInstructionEdges(FIXTURE);
  const zkPair = edges.find(
    (e) => e.a === "rv32_zk" && e.b === "rv32_zkn",
  );
  assert.equal(zkPair.count, 2);
});

test("buildSharedInstructionEdges: pairs are stored with a < b lexicographically", () => {
  const edges = buildSharedInstructionEdges(FIXTURE);
  for (const { a, b } of edges) {
    assert.ok(a < b, `expected ${a} < ${b}`);
  }
});

test("buildSharedInstructionEdges: sorted by count desc, then a, then b", () => {
  const edges = buildSharedInstructionEdges(FIXTURE);
  for (let i = 0; i < edges.length - 1; i++) {
    const cur = edges[i];
    const nxt = edges[i + 1];
    assert.ok(
      cur.count > nxt.count ||
        (cur.count === nxt.count && cur.a <= nxt.a),
      `bad order: ${JSON.stringify(cur)} then ${JSON.stringify(nxt)}`,
    );
  }
});

test("buildSharedInstructionEdges: empty input returns empty array", () => {
  assert.deepEqual(buildSharedInstructionEdges({}), []);
});

test("formatAsDot: produces a valid undirected DOT graph", () => {
  const edges = [
    { a: "rv_zba", b: "rv_zbb", count: 3 },
    { a: "rv_a", b: "rv_zacas", count: 5 },
  ];
  const dot = formatAsDot(edges);
  assert.match(dot, /^graph \{/);
  assert.match(dot, /\}$/);
  assert.match(dot, /"rv_zba" -- "rv_zbb" \[label="3"\]/);
  assert.match(dot, /"rv_a" -- "rv_zacas" \[label="5"\]/);
});

test("formatAsDot: empty edges produces a valid empty graph", () => {
  const dot = formatAsDot([]);
  assert.equal(dot, "graph {\n}");
});