---
name: godot-concept
description: Explore a Godot concept area (physics, rendering, ui, etc.)
arguments:
  - name: concept
    description: "Concept area: scene_tree, physics, rendering, audio, animation, ui, input, networking, resources, math — or omit to list all"
    required: false
allowed-tools:
  - "mcp__plugin_godot-doc-mcp_godot-docs__godot_scene_tree"
  - "mcp__plugin_godot-doc-mcp_godot-docs__godot_physics"
  - "mcp__plugin_godot-doc-mcp_godot-docs__godot_rendering"
  - "mcp__plugin_godot-doc-mcp_godot-docs__godot_audio"
  - "mcp__plugin_godot-doc-mcp_godot-docs__godot_animation"
  - "mcp__plugin_godot-doc-mcp_godot-docs__godot_ui"
  - "mcp__plugin_godot-doc-mcp_godot-docs__godot_input"
  - "mcp__plugin_godot-doc-mcp_godot-docs__godot_networking"
  - "mcp__plugin_godot-doc-mcp_godot-docs__godot_resources"
  - "mcp__plugin_godot-doc-mcp_godot-docs__godot_math"
  - "mcp__plugin_godot-doc-mcp_godot-docs__godot_list_concepts"
  - "mcp__plugin_godot-doc-mcp_godot-docs__godot_get_class"
---

Explore a Godot concept area.

**If no argument is provided:**
1. Call `godot_list_concepts`
2. Present the available concepts as a list with class counts
3. Ask which area the user wants to explore

**If an argument is provided ("$ARGUMENTS"):**
1. Call the matching concept tool: `godot_$ARGUMENTS` (e.g., if "physics" → `godot_physics`)
2. Present an overview: concept description and the most relevant classes with their briefs
3. Group classes by subcategory where natural (e.g., physics → bodies, shapes, joints)
4. Ask: "Want details on any of these classes?"
5. If yes, use `godot_get_class` for the requested class
