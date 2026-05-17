# riscv-isa-explorer

CLI tool for the LFX Mentorship 2026 coding challenge: _Mapping the RISC-V Extensions Landscape_.

Parses `instr_dict.json` from [riscv-extensions-landscape](https://github.com/rpsene/riscv-extensions-landscape) and cross-references the extensions against the [RISC-V ISA manual](https://github.com/riscv/riscv-isa-manual).

## What it does

- **Tier 1** — groups instructions by extension, prints a summary, and lists any instructions shared across multiple extensions.
- **Tier 2** — scans the manual's AsciiDoc sources and reports which extensions appear in the JSON only, the manual only, or both.
- **Tier 3** — prints an adjacency list of extensions that share at least one instruction.

## Running it

```bash
git clone https://github.com/faneeshh/riscv-isa-explorer.git
cd riscv-isa-explorer
npm install
npm run fetch    # pulls instr_dict.json and clones the ISA manual into ./data
npm start
npm test
```

Requires Node 18+ and `git` on PATH.

## Sample output

See [`sample_output.txt`](./sample_output.txt).

## Notes on the approach

No runtime dependencies — plain Node, regex over text, and the built-in `node:test` runner.

Tags in the JSON use forms like `rv_zba`, `rv64_zba`, `rv_d_zfa`, while the manual writes `Zba`, `D`, `Zfa`. Normalization rules:

- Strip leading `rv_`, `rv32_`, or `rv64_`.
- Split compound tags on `_` — `rv_d_zfa` means "needs D and Zfa", so it becomes two separate extensions.
- Single-letter parts are uppercased (`i` → `I`); multi-letter parts get a leading capital (`zba` → `Zba`).
- `rv32_zba` and `rv_zba` collapse to the same extension since they're XLEN variants, not distinct extensions.

Manual scanning is whitelist-driven rather than extracting every capitalized word from the `.adoc` files (which would pull in "When", "Small", etc.). The candidate set comes from the JSON tags plus a short list of extensions the manual covers but the JSON doesn't yet include, and each token is matched with word boundaries.

## Layout

```
src/
  cli.js              entry point
  normalize.js        tag normalization
  parser.js           Tier 1
  manual_scanner.js   Tier 2 (scan)
  cross_reference.js  Tier 2 (compare)
  graph.js            Tier 3
scripts/fetch_data.js
tests/*.test.js
```

## Known limits

- Scanning uses regex, not a real AsciiDoc parser, so extensions mentioned only inside unrecognized table formats may be missed.
- Matching is strict. `Zifence_i` in the manual won't match `zifencei` in the JSON — intentionally, since fuzzy matching would obscure the mismatches this tool is meant to surface.
