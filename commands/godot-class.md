---
name: godot-class
description: Look up a Godot class by name
arguments:
  - name: name
    description: Class name (e.g., "Node2D", "RigidBody3D", "Control")
    required: true
allowed-tools:
  - "mcp__plugin_godot-doc-mcp_godot-docs__godot_get_class"
  - "mcp__plugin_godot-doc-mcp_godot-docs__godot_get_symbol"
---

Look up the Godot class "$ARGUMENTS" and present a formatted overview.

1. Call `godot_get_class` with name "$ARGUMENTS", includeAncestors true, maxDepth 1
2. Present the class documentation in this format:

## $ARGUMENTS

**Inherits:** [inheritance chain]

> [brief description]

### Methods
[List key methods with return types and parameter signatures]

### Properties
[List properties with types and defaults]

### Signals
[List signals with parameters]

### Constants
[List constants if any]

3. If the user asks about a specific method or property, use `godot_get_symbol` to get full details
