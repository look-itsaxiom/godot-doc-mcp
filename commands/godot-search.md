---
name: godot-search
description: Search Godot API docs by keyword
arguments:
  - name: query
    description: Search query (e.g., "collision", "tween", "signal")
    required: true
allowed-tools:
  - "mcp__plugin_godot-doc-mcp_godot-docs__godot_search"
  - "mcp__plugin_godot-doc-mcp_godot-docs__godot_get_class"
  - "mcp__plugin_godot-doc-mcp_godot-docs__godot_get_symbol"
---

Search the Godot API documentation for "$ARGUMENTS".

1. Call `godot_search` with query "$ARGUMENTS"
2. Format results as a clean table with columns: Name, Kind, Score, Snippet
3. Show the top 10 results
4. After showing results, ask: "Want me to dive into any of these? Just name a class or symbol."
5. If the user names one, use `godot_get_class` or `godot_get_symbol` to show details
