# Godot API Docs MCP Server — AGENTS.md

This file sets conventions and guidance for contributors and AI agents working in this repository. It applies to the entire repo tree.

## Goal
Build a local Model Context Protocol (MCP) server that serves Godot Engine API documentation sourced from the `doc/` directory (cloned from the official Godot repository). The server should expose fast, offline search and retrieval of class/method/signal/property documentation to MCP clients over stdio.

## Non‑Goals (for now)
- Editing or authoring Godot docs.
- Networking to fetch remote docs at runtime.
- Providing general web search beyond the local `doc/` corpus.

## Source of Truth
- Docs live under `doc/` in Godot’s canonical XML format (e.g., `doc/classes/*.xml`). Treat `doc/` as read‑only.
- Prefer Godot 4.x XML schema (class, brief_description, description, methods, members, signals, constants, theme_items, annotations). Gracefully tolerate 3.x variants (missing sections).

## Planned Layout
- `server/` — MCP server implementation (TypeScript).
- `server/src/index.ts` — entrypoint and bootstrap.
- `server/src/cli.ts` — CLI runner (stdio by default).
- `server/src/mcp/` — stdio MCP server wiring (tools, resources, prompts).
- `server/src/parser/` — XML parser for Godot docs.
- `server/src/indexer/` — search index builder + persistence store.
- `server/src/adapters/` — mapping from parsed docs to MCP tools/resources.
- `server/src/search/` — lightweight in‑memory search engine.
- `server/src/resolver/` — class/symbol resolution helpers.
- `server/test/` — unit tests for parser, index, resolver, tools, server.
- `.cache/godot-index.json` — generated index (ignored in VCS).

If a Python implementation is later desired, place it in `server-py/` mirroring the structure.

## High‑Level Architecture
1. Startup loads configuration (env/flags), resolves doc location (via `GODOT_DOC_DIR`, `GODOT_BIN`, or auto-detection).
2. Parse XML files under `doc/classes/*.xml` into typed objects.
3. Build a compact inverted index (class names, members, methods, signals, constants, plus text fields: brief/description). Persist to `.cache/godot-index.json` and keep an in‑memory representation for fast queries.
4. Expose MCP tools and resources for search and retrieval.
5. Optional: file watcher to rebuild index when XML changes.

## MCP Surface
Tools (names are stable API):
- `godot_search` — Full‑text search.
  - params: `{ query: string, kind?: "class"|"method"|"property"|"signal"|"constant", limit?: number }`
  - returns: `Array<{ uri: string, name: string, kind: string, score: number, snippet?: string }>`
- `godot_get_class` — Return one class (optionally include ancestors).
  - params: `{ name: string, includeAncestors?: boolean, maxDepth?: number }`
  - returns: `GodotClassDoc | { inheritanceChain: string[], classes: GodotClassDoc[], warnings?: string[] }`
- `godot_get_symbol` — Return a member/method/signal/constant by qualified name.
  - params: `{ qname: string } // e.g. "Node._ready", "Vector2.x", "Button.pressed"`
  - returns: `GodotSymbolDoc`
- `godot_list_classes` — Enumerate classes (optionally by prefix).
  - params: `{ prefix?: string, limit?: number }`
  - returns: `string[]`

Resources:
- URIs use a stable scheme the client can open:
  - `godot://class/<ClassName>{?ancestors,maxDepth}`
  - `godot://symbol/<ClassName>/<kind>/<name>`
  - `godot://search?q=<q>&kind=<kind>`

Prompts (optional helpers exposed via MCP):
- `how_to_use_godot_docs` — Short instruction prompt that teaches the model to call `godot_search` first, then `godot_get_*` for details.

## Current Status (Sep 21, 2025)
- Stdio MCP server running with tools/resources/prompts implemented.
- XML parsing, symbol resolution, search index, and persistence utilities in place.
- Env handling and minimal logger wired.
- Tests and fixtures cover parser, indexer, search, resolver, tools, server, and security guards.
- Example scripts and run instructions validated locally.

Known follow‑ups (not blockers):
- Optional file watcher to rebuild index on doc changes.
- Optional warm‑start on boot using `.cache/godot-index.json` automatically if present.

## Type Shapes (TypeScript)
These interfaces are for internal use and tool return values.

```ts
export interface GodotMethod {
  name: string;
  returnType?: string;
  arguments: Array<{ name: string; type?: string; default?: string }>;
  description?: string;
  qualifiers?: string[]; // e.g., virtual, const, static
}

export interface GodotProperty {
  name: string;
  type?: string;
  default?: string;
  description?: string;
}

export interface GodotSignal {
  name: string;
  arguments: Array<{ name: string; type?: string }>;
  description?: string;
}

export interface GodotConstant { name: string; value?: string; description?: string }

export interface GodotClassDoc {
  name: string;
  inherits?: string;
  category?: string;
  brief?: string;
  description?: string;
  methods: GodotMethod[];
  properties: GodotProperty[];
  signals: GodotSignal[];
  constants: GodotConstant[];
  themeItems?: Record<string, string[]>; // optional, Godot 4.x
  annotations?: string[]; // optional
  since?: string; // Godot version detected
}

export type GodotSymbolDoc =
  | ({ kind: 'method'; className: string } & GodotMethod)
  | ({ kind: 'property'; className: string } & GodotProperty)
  | ({ kind: 'signal'; className: string } & GodotSignal)
  | ({ kind: 'constant'; className: string } & GodotConstant);
```

## Parsing Conventions
- Input: XML files under `doc/classes/`. Each file describes one class.
- Use a robust XML parser tolerant of entity references and CDATA (e.g., `fast-xml-parser`).
- Preserve inline formatting (code spans) and convert to Markdown for summaries/snippets.
- Normalize whitespace; keep code examples intact.
- Treat missing sections as empty arrays.

## Search Index
- Tokenize names (`Camera3D` -> tokens: `camera`, `3d`, `camera3d`).
- Tokenize text fields; lowercase; remove stopwords; keep 2+ char tokens.
- Score by BM25‑ish heuristic or tf‑idf; boost exact class name matches and symbol name matches.
- Store compact postings in memory; write `.cache/godot-index.json` for warm start.
- Result `snippet` should be a short excerpt from `brief` or `description` with query highlights where possible.

## Environment Variables
- `GODOT_DOC_DIR` (optional, default: auto-detected) — Path to pre-extracted Godot XML docs (must contain `classes/` subdirectory). Overrides auto-detection.
- `GODOT_BIN` (optional, default: auto-detected) — Path to a specific Godot binary. Used to extract docs via `--doctool`.
- `GODOT_INDEX_PATH` (default: `./.cache/godot-index.json`) — On‑disk index.
- `MCP_SERVER_LOG` (default: `info`) — `silent|error|warn|info|debug`.
- `MCP_STDIO` (default: `1`) — Use stdio transport; future socket support may add `MCP_SOCKET_PATH`.

Doc resolution order: `GODOT_DOC_DIR` → `GODOT_BIN` → auto-detect PATH → error with instructions.

## Build & Run (Node/TypeScript)
- Node 20+ and `pnpm` recommended (npm works too).
- We execute TypeScript directly with `tsx` (no `dist/` or transpile step). Suggested scripts:
  - `dev`: `tsx watch server/src/cli.ts`
  - `start`: `node --import tsx server/src/cli.ts`
  - `typecheck` (optional): `tsc -p tsconfig.json --noEmit`
  - `test`: `vitest`

Example local run (stdio):
```bash
# from repo root — use bundled docs for development
pnpm install
GODOT_DOC_DIR=./doc pnpm dev
```

## Testing Guidance
- Add fixture XML files under `server/test/fixtures/` with small representative samples (methods, overloaded methods, properties with defaults, signals with args).
- Unit test XML parsing into `GodotClassDoc` and symbol extraction.
- Unit test search scoring for known queries (e.g., "_ready", "signal pressed", "Vector2.x").
- Contract test MCP tools return shapes and error cases.

## Error Handling
- No docs found (no `GODOT_DOC_DIR`, no `GODOT_BIN`, no Godot on PATH) → fail fast with clear message and hint.
- Missing class/symbol → return MCP tool error with `code: NOT_FOUND` and suggestions (did‑you‑mean list).
- XML parse error → include filename and line/column when available.

## Performance Targets
- Cold start parse and index ≤ 3s for typical Godot 4 docs on a modern laptop.
- Search latency p95 ≤ 20ms for simple queries; ≤ 60ms for multi‑term.
- Memory overhead ≤ 150MB for index in Node.

## Security & Privacy
- Never read outside `GODOT_DOC_DIR` except `.cache/`.
- No network calls in normal operation.
- Avoid executing any code found inside docs; treat as plain text.

## Style Guide (TS)
- TypeScript strict mode; ESM modules.
- Prefer composition over inheritance; small, testable modules.
- No global singletons except a narrowly scoped `container` created in `index.ts`.
- Logging via a minimal wrapper (console or `pino`) behind an interface.
- Public MCP tool names and return schemas are stable once published.

## Contributor Workflow
1. Open a small PR per change set; add or update tests.
2. Keep changes focused; do not modify unrelated files.
3. If you add a new MCP tool or change a return shape, update this AGENTS.md and the README.

## Implementation Checklist (first pass)
- [x] Scaffold `server/` (tsconfig, package.json, src/).
- [x] Implement XML → `GodotClassDoc` parser.
- [x] Build search index + persistence.
- [x] Expose MCP tools/resources via stdio.
- [x] Wire env vars; add logging.
- [x] Add tests + fixtures; document examples.
