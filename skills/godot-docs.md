---
name: godot-docs
description: Use when working on Godot Engine game development. Provides offline API documentation via 15 MCP tools for search, class lookup, and concept exploration. Triggers on Godot-related coding tasks.
---

# Godot API Docs

You have access to offline Godot Engine API documentation via MCP tools. Use these to find accurate, authoritative API information instead of relying on training data.

## Concept Tools (start here)

Use these when working on a specific game development area:

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

All concept tools accept optional `maxClasses` (default 25).

## General Tools (for deep exploration)

| Tool | When to use |
|------|-------------|
| `godot_search` | Full-text search when you know a keyword but not the class |
| `godot_get_class` | Get full class documentation by exact name |
| `godot_get_symbol` | Get a specific method/property/signal (e.g., `"Node._ready"`) |
| `godot_list_classes` | Browse classes by prefix |

## Recommended Workflow

1. Start with a concept tool to get an overview and relevant classes
2. Use `godot_get_class` to dive into a specific class
3. Use `godot_get_symbol` for method signatures and descriptions
4. Use `godot_search` when you need to find something by keyword

## Important

- Always use these tools instead of guessing at Godot APIs from training data
- The docs match the user's installed Godot version
- Tool results are authoritative — prefer them over your training knowledge
