# Godot API Docs MCP Server

> **Fork of [tkmct/godot-doc-mcp](https://github.com/tkmct/godot-doc-mcp)** — extended with concept-oriented tools for semantic API exploration. See [What Changed](#what-changed-from-upstream) below.

Offline Model Context Protocol (MCP) server that serves Godot Engine API documentation from a local `doc/` folder. Provides **concept-oriented tools** for common game development tasks plus general search and retrieval — 15 tools total over stdio.

- **Concept-first**: 11 tools organized by what you're trying to do (physics, rendering, animation, UI, etc.)
- **General tools**: 4 tools for open-ended search and class/symbol lookup
- Zero network at runtime (local docs only)
- Parses Godot 4.x XML docs; tolerates 3.x variants
- Builds an in‑memory search index with optional on‑disk warm start
- 892 Godot classes indexed and classified by inheritance, naming, and description

---

## Quick Start

Prereqs:
- Node.js 20+
- pnpm (recommended) or npm

Docs source:
- Place Godot XML docs under `./doc/classes/*.xml` (this repo already includes a representative set for local testing). Point `GODOT_DOC_DIR` elsewhere if you keep docs outside the repo.
- Need fresh docs from an existing Godot checkout? Run the editor binary with `--doctool` pointing at your target `doc/classes` folder (add `--headless` for CI/servers). If you don't already have the CLI binary on your `PATH`, follow the [official command line instructions](https://docs.godotengine.org/en/latest/tutorials/editor/command_line_tutorial.html) to install or alias it (package install, manual build, or exporting the editor).

  ```bash
  # inside the upstream Godot repo after building the editor, or anywhere godot is on PATH
  godot --doctool ./doc/classes --headless
  ```

  The command exports the full XML set (classes, signals, etc.). Repeat whenever you update your Godot source to keep docs in sync.

Run (stdio):

```bash
# from repo root
export GODOT_DOC_DIR=./doc
pnpm install
pnpm dev          # hot reload via tsx, runs the stdio MCP server

# or run without watch
pnpm start
```

Smoke tests and examples:

```bash
# Lightweight end‑to‑end checks
pnpm test

# Example local smoke against the parser/index/tools (no external clients)
pnpm run smoke:local

# Minimal MCP client demo (stdio handshake + tool calls)
pnpm run smoke:mcp

# Manual, step‑by‑step stdio session (prints what to send/expect)
node --import tsx scripts/manual-stdio.mjs
```

---

## What This Is

This project turns the Godot docs you already have locally into an MCP server so LLM tooling can search and retrieve authoritative API information offline. The server:
- Parses `doc/classes/*.xml` into typed objects
- Builds a compact inverted index covering class names and text fields
- Serves MCP tools over stdio for search and direct lookup
- Optionally writes `.cache/godot-index.json` for warm starts

Non‑goals (for now): authoring docs, live web fetching, or general web search.

---

## Repository Layout

- `server/` — MCP server implementation (TypeScript)
  - `server/src/index.ts` — bootstrap/container
  - `server/src/cli.ts` — CLI (stdio by default)
  - `server/src/mcp/stdio.ts` — MCP wiring: tools/resources/prompts
  - `server/src/parser/xmlParser.ts` — Godot XML → typed docs
  - `server/src/indexer/` — index build + persistence (if present)
  - `server/src/search/searchEngine.ts` — in‑memory search
  - `server/src/resolver/` — class/symbol resolution helpers
  - `server/src/types.ts` — shared TypeScript interfaces
- `server/test/` — unit tests (parser, index, resolver, tools, server)
- `doc/` — read‑only Godot XML docs (classes, schema, tools)
- `.cache/` — generated index file (ignored in VCS)
- `scripts/` — local utilities and MCP client demos

---

## Configuration

Environment variables:
- `GODOT_DOC_DIR` (default `./doc`) — Root that contains `classes/`.
- `GODOT_INDEX_PATH` (default `./.cache/godot-index.json`) — On‑disk index for warm start.
- `MCP_SERVER_LOG` (default `info`) — `silent|error|warn|info|debug`.
- `MCP_STDIO` (default `1`) — Use stdio transport.

Examples:

```bash
export GODOT_DOC_DIR=$HOME/src/godot/docs
export MCP_SERVER_LOG=debug
pnpm start
```

---

## Using With an MCP Client

Transport: stdio (process pipes). Start the server and configure your MCP client to launch it with the working directory set to this repo and environment variables as needed.

Resources and tools are exposed with stable names and return shapes. The following examples show the intent; exact envelopes depend on your client SDK.

Search:

```json
{
  "tool": "godot_search",
  "args": { "query": "Vector2.x", "limit": 5 }
}
```

Get a class (optionally include ancestors):

```json
{
  "tool": "godot_get_class",
  "args": { "name": "Node", "includeAncestors": true, "maxDepth": 2 }
}
```

Get a symbol by qualified name:

```json
{
  "tool": "godot_get_symbol",
  "args": { "qname": "Button.pressed" }
}
```

List classes by prefix:

```json
{
  "tool": "godot_list_classes",
  "args": { "prefix": "Visu", "limit": 20 }
}
```

URIs your client can open as resources:
- `godot://class/<ClassName>{?ancestors,maxDepth}`
- `godot://symbol/<ClassName>/<kind>/<name>`
- `godot://search?q=<q>&kind=<kind>`

Optional helper prompt exposed as an MCP Prompt:
- `how_to_use_godot_docs` — Teaches the model to call `godot_search` first, then `godot_get_*`.

---

## What Changed from Upstream

This fork is based on [tkmct/godot-doc-mcp](https://github.com/tkmct/godot-doc-mcp) (commit `fa96bfb`). The upstream provides an excellent foundation: XML parsing, BM25 search index, and 4 general MCP tools. We extended it with concept-oriented tools because:

**Problem**: When working on a game, you think in concepts ("how do I set up physics?", "what animation tools exist?"), not in class names. The general tools require you to already know what you're looking for.

**Solution**: 11 concept tools that return curated overviews, GDScript examples, and relevant classes — organized by game development task, not API structure. The general tools remain for deep exploration.

### Changes Made

| Area | What | Why |
|------|------|-----|
| `server/src/concepts/classifier.ts` | **New** — hybrid class classifier (inheritance + name patterns + description keywords) | Tags each of 892 classes with concepts like `physics`, `rendering`, `ui`, etc. |
| `server/src/concepts/registry.ts` | **New** — curated overviews + GDScript examples per concept | Concept tools need prose guidance, not just class listings |
| `server/src/adapters/godotTools.ts` | **Extended** — added `getConcept()` and `listConcepts()` | Wires concept data into the tools interface |
| `server/src/mcp/stdio.ts` | **Extended** — 11 new tool registrations | Exposes concept tools alongside existing general tools |
| `server/src/index.ts` | **Extended** — runs classifier at startup, passes to tools | Concept map built once at startup from parsed XML |

All original tools (`godot_search`, `godot_get_class`, `godot_get_symbol`, `godot_list_classes`) are **unchanged**. All 26 upstream tests pass.

---

## Tool Reference

### Concept Tools (new)

Use these first — they return curated guidance for common game dev tasks:

| Tool | Description | Params |
|------|-------------|--------|
| `godot_scene_tree` | Nodes, parenting, groups, lifecycle | — |
| `godot_physics` | Bodies, collision, joints, raycasting | `dimension?: "2d"\|"3d"` |
| `godot_rendering` | Materials, shaders, meshes, lights, cameras | `dimension?: "2d"\|"3d"` |
| `godot_audio` | Players, streams, effects, buses | — |
| `godot_animation` | AnimationPlayer, tweens, skeletons | — |
| `godot_ui` | Controls, buttons, containers, themes | — |
| `godot_input` | Events, actions, keyboard, mouse, gamepad | — |
| `godot_networking` | Multiplayer, RPCs, WebSocket, HTTP | — |
| `godot_resources` | Loading, saving, custom resources | — |
| `godot_math` | Vectors, transforms, quaternions, geometry | — |
| `godot_list_concepts` | List all concepts with class counts | — |

### General Tools (unchanged from upstream)

- `godot_search`
  - params: `{ query: string, kind?: "class"|"method"|"property"|"signal"|"constant", limit?: number }`
  - returns: `Array<{ uri: string, name: string, kind: string, score: number, snippet?: string }>`

- `godot_get_class`
  - params: `{ name: string, includeAncestors?: boolean, maxDepth?: number }`
  - returns: `GodotClassDoc | { inheritanceChain: string[], classes: GodotClassDoc[], warnings?: string[] }`

- `godot_get_symbol`
  - params: `{ qname: string } // e.g., "Node._ready", "Vector2.x", "Button.pressed"`
  - returns: `GodotSymbolDoc`

- `godot_list_classes`
  - params: `{ prefix?: string, limit?: number }`
  - returns: `string[]`

Type shapes (subset):

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

---

## How It Works

Parsing:
- Uses a tolerant XML parser to handle entities and CDATA
- Preserves inline code spans and normalizes whitespace
- Treats missing sections as empty arrays

Search index:
- Tokenizes names (`Camera3D` → `camera`, `3d`, `camera3d`)
- Tokenizes text fields; lowercases; removes stopwords; keeps 2+ char tokens
- Scores via a BM25‑ish heuristic; boosts exact class and symbol matches
- Stores postings in memory; persists to `.cache/godot-index.json`

Performance targets:
- Cold start (parse + index) ≤ 3s on a modern laptop for typical Godot 4 docs
- Search p95 ≤ 20ms (simple) / ≤ 60ms (multi‑term)
- Memory overhead ≤ 150MB for the in‑memory index

---

## Development

Install and run:

```bash
pnpm install
pnpm dev
```

Type checking and formatting:

```bash
pnpm run check:biome
pnpm run format:check
pnpm run format --write
```

Tests:

```bash
pnpm test
```

Code style:
- TypeScript strict mode; ESM modules
- Prefer composition; small, testable modules
- Logging is behind a minimal wrapper, controllable via `MCP_SERVER_LOG`

Adding or changing MCP tools:
- Keep tool names and return schemas stable once published
- Update this README and `AGENTS.md` if you introduce new tools or change shapes

---

## Troubleshooting

- Invalid `GODOT_DOC_DIR`
  - Symptom: startup fails with a clear message
  - Fix: ensure the path exists and contains `classes/` XML files

- Missing class or symbol
  - Symptom: `NOT_FOUND` tool error with suggestions
  - Fix: check spelling/case; use `godot_search` first to confirm availability

- XML parse error
  - Symptom: error includes filename and, when available, line/column
  - Fix: validate the XML; re‑sync docs from the Godot repo

- Slow cold start
  - Cause: very large docs set or constrained disk
  - Mitigation: keep `.cache/godot-index.json` for warm starts

---

## Security & Privacy

- Reads only within `GODOT_DOC_DIR` and `.cache/`
- Makes no network calls during normal operation
- Treats docs as plain text; never executes embedded code

---

## FAQ

- Where do the docs come from?
  - From a local copy of the official Godot docs (XML). Point `GODOT_DOC_DIR` to your copy; by default the server uses `./doc`.

- Does this support Godot 3.x docs?
  - Yes, with graceful handling of older schema differences (some sections may be missing).

- Which clients can use this?
  - Any MCP‑compatible client that can launch a stdio server process and call tools.

- Can I rebuild the index when docs change?
  - Yes. Restart the server after updating XML files. A file watcher may be added in the future.

---

## Credits

- **Upstream**: [tkmct/godot-doc-mcp](https://github.com/tkmct/godot-doc-mcp) — original MCP server with XML parsing, BM25 search index, and general tools
- **Concept tools**: Added by [Axiom Studio](https://github.com/cskib) using the same pattern developed for [freecad-mcp](https://github.com/cskib/freecad-mcp)
- Godot Engine and documentation are trademarks of their respective owners. This project is not affiliated with or endorsed by the Godot project.
