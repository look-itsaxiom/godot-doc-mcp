# Plugin Conversion — Implementation Plan

## Steps

### Step 1: Create plugin.json
Create the plugin manifest at repo root.

### Step 2: Create .mcp.json
MCP server config using `${CLAUDE_PLUGIN_ROOT}` paths.

### Step 3: Create skills/godot-docs.md
Adapt existing SKILL.md into a plugin skill with proper frontmatter and trigger description.

### Step 4: Create commands/godot-search.md
Search command with allowed-tools and formatting instructions.

### Step 5: Create commands/godot-class.md
Class lookup command with formatting instructions.

### Step 6: Create commands/godot-concept.md
Concept exploration command that routes to the right concept tool.

### Step 7: Create agents/godot-explorer.md
Autonomous API exploration agent with access to all MCP tools.

### Step 8: Update package.json version
Bump to 0.2.0.

### Step 9: Update README.md
Add plugin installation instructions, keep npx docs but mark as "alternative (requires npm publish)".

### Step 10: Update AGENTS.md
Reflect plugin structure in the planned layout section.

### Step 11: Validate plugin
Run plugin-validator to check structure.

## Parallelization

- Steps 1-2 are independent
- Steps 3-7 are independent (all new files)
- Steps 8-10 are independent (all different files)
- Step 11 depends on all above
