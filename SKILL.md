# godot-doc-mcp — Installation Skill

You are an AI agent installing the Godot API Docs MCP server. Follow these steps exactly.

## What This Is

An offline MCP server that serves Godot Engine API documentation. It auto-detects the user's Godot installation, extracts XML docs via `--doctool`, and provides 15 tools for searching and exploring the API. No network calls at runtime.

## Prerequisites

- Node.js 20+
- Godot 4.x on PATH (or the user sets `GODOT_BIN` / `GODOT_DOC_DIR`)

## Installation

Add to the user's MCP configuration. The exact file depends on the client:

### Claude Code (`~/.claude.json`)

Add to the `mcpServers` object:

```json
{
  "mcpServers": {
    "godot-docs": {
      "command": "npx",
      "args": ["-y", "godot-doc-mcp"]
    }
  }
}
```

### Claude Desktop (`claude_desktop_config.json`)

Add to the `mcpServers` object:

```json
{
  "mcpServers": {
    "godot-docs": {
      "command": "npx",
      "args": ["-y", "godot-doc-mcp"]
    }
  }
}
```

### For a specific Godot version

```json
{
  "mcpServers": {
    "godot-docs": {
      "command": "npx",
      "args": ["-y", "godot-doc-mcp"],
      "env": {
        "GODOT_BIN": "/path/to/godot"
      }
    }
  }
}
```

### For pre-extracted XML docs

```json
{
  "mcpServers": {
    "godot-docs": {
      "command": "npx",
      "args": ["-y", "godot-doc-mcp"],
      "env": {
        "GODOT_DOC_DIR": "/path/to/docs"
      }
    }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GODOT_DOC_DIR` | auto-detected | Path to pre-extracted XML docs (must contain `classes/` subdirectory) |
| `GODOT_BIN` | auto-detected | Path to a specific Godot binary |
| `MCP_SERVER_LOG` | `info` | Log level: `silent`, `error`, `warn`, `info`, `debug` |

## Available Tools

### Concept tools (start here)

Use these when the user is working on a game development task:

| Tool | When to use |
|------|-------------|
| `godot_scene_tree` | Setting up nodes, scenes, signals, lifecycle |
| `godot_physics` | Physics bodies, collision, raycasting, joints |
| `godot_rendering` | Materials, shaders, meshes, lights, cameras |
| `godot_audio` | Sound playback, audio buses, effects |
| `godot_animation` | AnimationPlayer, tweens, skeletons |
| `godot_ui` | Buttons, labels, containers, themes |
| `godot_input` | Keyboard, mouse, gamepad, touch input |
| `godot_networking` | Multiplayer, RPCs, HTTP, WebSocket |
| `godot_resources` | Loading, saving, custom resources |
| `godot_math` | Vectors, transforms, quaternions, geometry |
| `godot_list_concepts` | List all concept categories with class counts |

All concept tools accept optional `maxClasses` (default 25) and return `totalClasses` with the full count.

### General tools (for deep exploration)

| Tool | When to use |
|------|-------------|
| `godot_search` | Full-text search when you know a keyword but not the class |
| `godot_get_class` | Get full class documentation by exact name |
| `godot_get_symbol` | Get a specific method/property/signal (e.g., `"Node._ready"`) |
| `godot_list_classes` | Browse classes by prefix |

### Recommended workflow

1. Start with a concept tool to get an overview and relevant classes
2. Use `godot_get_class` to dive into a specific class
3. Use `godot_get_symbol` for method signatures and descriptions
4. Use `godot_search` when you need to find something by keyword

## Verification

After installation, test by calling:

```json
{ "tool": "godot_list_concepts" }
```

This should return a list of 10 concept categories with class counts. If it fails, check that Godot is on PATH or set `GODOT_BIN`/`GODOT_DOC_DIR`.

## Source

Repository: https://github.com/look-itsaxiom/godot-doc-mcp
