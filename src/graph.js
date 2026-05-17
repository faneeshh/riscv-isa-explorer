/**
 * Tier 3: computes which extensions share instructions.
 *
 * Two extensions are connected if at least one instruction is tagged with
 * both. We use raw JSON tags here (same as Tier 1), so rv_zba and rv64_zba
 * are separate nodes — that's the faithful view of how the data is shaped.
 *
 * Three exports: an adjacency map for traversal, a sorted edge list with
 * shared-instruction counts, and a Graphviz DOT formatter for visual output.
 */

function buildPairCounts(dict) {
  const counts = new Map();
  for (const { extension: tags } of Object.values(dict)) {
    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        const [a, b] =
          tags[i] < tags[j] ? [tags[i], tags[j]] : [tags[j], tags[i]];
        const key = `${a}\x00${b}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  return counts;
}

export function buildSharedInstructionGraph(dict) {
  const graph = {};
  for (const [key] of buildPairCounts(dict)) {
    const [a, b] = key.split("\x00");
    if (!graph[a]) graph[a] = new Set();
    if (!graph[b]) graph[b] = new Set();
    graph[a].add(b);
    graph[b].add(a);
  }
  return graph;
}

export function buildSharedInstructionEdges(dict) {
  const edges = [];
  for (const [key, count] of buildPairCounts(dict)) {
    const [a, b] = key.split("\x00");
    edges.push({ a, b, count });
  }
  return edges.sort((x, y) => {
    if (y.count !== x.count) return y.count - x.count;
    if (x.a !== y.a) return x.a < y.a ? -1 : 1;
    if (x.b !== y.b) return x.b < y.b ? -1 : 1;
    return 0;
  });
}

export function formatAsDot(edges) {
  const lines = ["graph {"];
  for (const { a, b, count } of edges) {
    lines.push(`  "${a}" -- "${b}" [label="${count}"]`);
  }
  lines.push("}");
  return lines.join("\n");
}
