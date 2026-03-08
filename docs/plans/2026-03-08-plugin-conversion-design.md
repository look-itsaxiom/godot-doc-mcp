# Plugin Conversion Design

## Problem

The MCP server works but `godot-doc-mcp` is not published to npm, so `npx -y godot-doc-mcp` fails with a 404 when invoked from Claude Code. Converting to a Claude Code plugin solves distribution and adds user-facing commands.

## Decision: MCP-first plugin (Approach A)

The MCP server remains the engine. The plugin wraps it with a `.mcp.json` that uses `${CLAUDE_PLUGIN_ROOT}` for portable paths. Commands and agents are prompt-only markdown files that call MCP tools — no additional code.

## Plugin Structure

```
plugin.json                    # Plugin manifest
.mcp.json                      # MCP server config
skills/
  godot-docs.md                # Tool reference + workflow guidance
commands/
  godot-search.md              # /godot-search <query>
  godot-class.md               # /godot-class <ClassName>
  godot-concept.md             # /godot-concept <area>
agents/
  godot-explorer.md            # Multi-step API exploration agent
```

## Components

### plugin.json

- name: `godot-doc-mcp`
- version: `0.2.0` (bump from 0.1.0 to reflect plugin conversion)
- description: Offline Godot API docs — 15 MCP tools for search, lookup, and concept exploration
- No hooks needed

### .mcp.json

```json
{
  "mcpServers": {
    "godot-docs": {
      "command": "node",
      "args": ["--import", "tsx", "${CLAUDE_PLUGIN_ROOT}/server/src/cli.ts"],
      "env": {
        "MCP_STDIO": "1"
      }
    }
  }
}
```

Uses `node --import tsx` directly (same as `pnpm start`). The `bin/godot-doc-mcp.mjs` entrypoint spawns a subprocess which adds unnecessary indirection for a plugin.

### skills/godot-docs.md

Adapted from existing SKILL.md. Describes available tools and recommended workflow. Triggers when Claude is working on Godot game development tasks.

### commands/godot-search.md

- Args: `<query>` (required)
- Calls `godot_search` with the query
- Formats results as a table (name, kind, score, snippet)
- Pre-allows: `mcp__plugin_godot-doc-mcp_godot-docs__godot_search`

### commands/godot-class.md

- Args: `<name>` (required)
- Calls `godot_get_class` with `includeAncestors: true, maxDepth: 1`
- Formats output: brief, inheritance, methods, properties, signals, constants
- Pre-allows: `mcp__plugin_godot-doc-mcp_godot-docs__godot_get_class`

### commands/godot-concept.md

- Args: `<concept>` (required)
- Calls the matching `godot_<concept>` tool (e.g., `godot_physics`)
- If no arg, calls `godot_list_concepts` and shows available categories
- Pre-allows: all 11 concept tools + `godot_list_concepts`

### agents/godot-explorer.md

- Autonomous agent for multi-step Godot API exploration
- Given a game dev task, it: searches concepts → pulls relevant classes → reads specific methods → synthesizes recommendations
- Has access to all 15 MCP tools
- Returns a structured recommendation with relevant classes, key methods, and code patterns

## What Changes

- New files: `plugin.json`, `.mcp.json`, `skills/godot-docs.md`, 3 commands, 1 agent
- Existing SKILL.md and README.md: update installation instructions to use plugin install
- AGENTS.md: update to reflect plugin structure
- package.json: bump to 0.2.0
- No changes to server code

## What Doesn't Change

- All server code under `server/`
- All tests
- `bin/godot-doc-mcp.mjs` (kept for potential future npm publish)
- `doc/` directory
- Doc resolution logic (env vars, auto-detect, cache)

## Installation (new)

```bash
claude plugin add look-itsaxiom/godot-doc-mcp
```

The plugin auto-starts the MCP server. Godot auto-detection works as before.
