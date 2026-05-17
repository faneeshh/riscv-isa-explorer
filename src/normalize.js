/**
 * Normalizes RISC-V extension tags from instr_dict.json into the canonical
 * form the ISA manual uses.
 *
 * JSON form examples:    rv_zba, rv64_zba, rv_d_zfa, rv_i
 * Canonical form:        Zba,    Zba,     [D, Zfa], I
 *
 * Rules:
 *   - Strip leading rv_, rv32_, rv64_  (XLEN variants collapse).
 *   - Split on _ for compound tags. Each part is its own extension.
 *   - Known single-letter extensions (i, m, a, f, d, q, c, v, h, s, u)
 *     become uppercase: i -> I.
 *   - Multi-letter parts get a leading capital: zba -> Zba, smrnmi -> Smrnmi.
 */

const SINGLE_LETTER_EXTENSIONS = new Set([
  "i", "m", "a", "f", "d", "q", "c", "v", "h", "s", "u",
]);

const PREFIX_RE = /^rv(?:32|64)?_/;

export function normalizeTag(tag) {
  if (typeof tag !== "string" || tag.length === 0) {
    throw new TypeError(
      `Expected a non-empty string, got: ${JSON.stringify(tag)}`,
    );
  }

  return tag
    .replace(PREFIX_RE, "")
    .split("_")
    .filter((part) => part.length > 0)
    .map((part) =>
      SINGLE_LETTER_EXTENSIONS.has(part)
        ? part.toUpperCase()
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    );
}

export function normalizeExtensions(tags) {
  if (!tags) return [];

  const seen = new Set();
  const result = [];
  for (const ext of tags.flatMap(normalizeTag)) {
    if (!seen.has(ext)) {
      seen.add(ext);
      result.push(ext);
    }
  }
  return result;
}