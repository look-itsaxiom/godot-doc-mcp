import { createRequire } from "node:module";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { GodotTools } from "../adapters/godotTools.js";

const SERVER_NAME = "godot-docs-mcp-server";
const SERVER_VERSION = (() => {
  try {
    const req = createRequire(import.meta.url);
    // Try TS source tree first, then built dist tree
    try {
      const pkgTs = req("../../../package.json");
      return pkgTs.version || "0.0.0";
    } catch {
      const pkgJs = req("../../package.json");
      return pkgJs.version || "0.0.0";
    }
  } catch {
    return "0.0.0";
  }
})();

// Start MCP server using the official typescript-sdk over stdio
export async function startMcpStdioServer(
  tools: GodotTools,
  opts?: { onInitialize?: () => void },
): Promise<void> {
  // Minimal startup log to stderr for smoke debugging
  try {
    console.error(`[MCP] starting ${SERVER_NAME}@${SERVER_VERSION} on stdio`);
  } catch {}
  // Avoid verbose stdin byte logging that can confuse clients
  const mcp = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    },
  );

  // Tools (tool names must match ^[a-zA-Z0-9_-]+$ — no dots)
  mcp.tool(
    "godot_search",
    "Full-text search across Godot classes and symbols.",
    {
      query: z.string(),
      kind: z.enum(["class", "method", "property", "signal", "constant"]).optional(),
      limit: z.number().int().positive().optional(),
    },
    async (args, _extra) => {
      type Kind = "class" | "method" | "property" | "signal" | "constant";
      const { query, kind, limit } = args as {
        query: string;
        kind?: Kind;
        limit?: number;
      };
      const result = await tools.search({ query, kind, limit });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  mcp.tool(
    "godot_get_class",
    "Return one class by name (optionally include ancestors).",
    {
      name: z.string(),
      includeAncestors: z.boolean().optional(),
      maxDepth: z.number().int().min(0).optional(),
    },
    async (args, _extra) => {
      const { name, includeAncestors, maxDepth } = args as {
        name: string;
        includeAncestors?: boolean;
        maxDepth?: number;
      };
      const result = await tools.getClass({ name, includeAncestors, maxDepth });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  mcp.tool(
    "godot_get_symbol",
    "Return a member/method/signal/constant by qualified name (<Class>.<member>).",
    { qname: z.string() },
    async (args, _extra) => {
      const { qname } = args as { qname: string };
      const result = await tools.getSymbol({ qname });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  mcp.tool(
    "godot_list_classes",
    "List classes (optionally by prefix).",
    {
      prefix: z.string().optional(),
      limit: z.number().int().positive().optional(),
    },
    async (args, _extra) => {
      const { prefix, limit } = args as { prefix?: string; limit?: number };
      const result = await tools.listClasses({ prefix, limit });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  // --- Concept-oriented tools ---

  mcp.tool(
    "godot_scene_tree",
    "Scene tree fundamentals: nodes, parenting, groups, signals, lifecycle (_ready, _process). Start here for scene architecture.",
    { maxClasses: z.number().int().positive().optional() },
    async (args, _extra) => {
      const { maxClasses } = args as { maxClasses?: number };
      const result = await tools.getConcept({ name: "scene_tree", maxClasses });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  mcp.tool(
    "godot_physics",
    "Physics system: rigid/static/character bodies, collision shapes, areas, joints, raycasting.",
    { dimension: z.enum(["2d", "3d"]).optional(), maxClasses: z.number().int().positive().optional() },
    async (args, _extra) => {
      const { dimension, maxClasses } = args as { dimension?: "2d" | "3d"; maxClasses?: number };
      const result = await tools.getConcept({ name: "physics", maxClasses });
      if (dimension) {
        const dim = dimension.toUpperCase();
        result.classes = result.classes.filter((c) => c.name.includes(dim));
      }
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  mcp.tool(
    "godot_rendering",
    "Rendering and graphics: materials, shaders, meshes, textures, lights, cameras, sprites, viewports.",
    { dimension: z.enum(["2d", "3d"]).optional(), maxClasses: z.number().int().positive().optional() },
    async (args, _extra) => {
      const { dimension, maxClasses } = args as { dimension?: "2d" | "3d"; maxClasses?: number };
      const result = await tools.getConcept({ name: "rendering", maxClasses });
      if (dimension) {
        const dim = dimension.toUpperCase();
        result.classes = result.classes.filter((c) => c.name.includes(dim));
      }
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  mcp.tool(
    "godot_audio",
    "Audio system: players, streams, effects, buses.",
    { maxClasses: z.number().int().positive().optional() },
    async (args, _extra) => {
      const { maxClasses } = args as { maxClasses?: number };
      const result = await tools.getConcept({ name: "audio", maxClasses });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  mcp.tool(
    "godot_animation",
    "Animation: AnimationPlayer, AnimationTree, tweens, skeletons, blend trees.",
    { maxClasses: z.number().int().positive().optional() },
    async (args, _extra) => {
      const { maxClasses } = args as { maxClasses?: number };
      const result = await tools.getConcept({ name: "animation", maxClasses });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  mcp.tool(
    "godot_ui",
    "UI/Control nodes: buttons, labels, containers, panels, themes, layout.",
    { maxClasses: z.number().int().positive().optional() },
    async (args, _extra) => {
      const { maxClasses } = args as { maxClasses?: number };
      const result = await tools.getConcept({ name: "ui", maxClasses });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  mcp.tool(
    "godot_input",
    "Input handling: events, actions, keyboard, mouse, touch, gamepad.",
    { maxClasses: z.number().int().positive().optional() },
    async (args, _extra) => {
      const { maxClasses } = args as { maxClasses?: number };
      const result = await tools.getConcept({ name: "input", maxClasses });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  mcp.tool(
    "godot_networking",
    "Networking: multiplayer, RPCs, WebSocket, HTTP.",
    { maxClasses: z.number().int().positive().optional() },
    async (args, _extra) => {
      const { maxClasses } = args as { maxClasses?: number };
      const result = await tools.getConcept({ name: "networking", maxClasses });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  mcp.tool(
    "godot_resources",
    "Resource system: loading, saving, custom resources, importers.",
    { maxClasses: z.number().int().positive().optional() },
    async (args, _extra) => {
      const { maxClasses } = args as { maxClasses?: number };
      const result = await tools.getConcept({ name: "resources", maxClasses });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  mcp.tool(
    "godot_math",
    "Math types: vectors, transforms, quaternions, AABB, geometry utilities.",
    { maxClasses: z.number().int().positive().optional() },
    async (args, _extra) => {
      const { maxClasses } = args as { maxClasses?: number };
      const result = await tools.getConcept({ name: "math", maxClasses });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  mcp.tool(
    "godot_list_concepts",
    "List all available concept categories with class counts.",
    {},
    async (_args, _extra) => {
      const concepts = await tools.listConcepts();
      const results: Array<{ concept: string; classCount: number }> = [];
      for (const c of concepts) {
        const data = await tools.getConcept({ name: c });
        results.push({ concept: c, classCount: data.totalClasses });
      }
      return { content: [{ type: "text", text: JSON.stringify(results) }] };
    },
  );

  // Prompts
  mcp.prompt("how_to_use_godot_docs", "Helper for using Godot docs tools effectively", async () => {
    return {
      description:
        "Call godot_search first; then fetch details with godot_get_class or godot_get_symbol.",
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: [
              "Use godot_search to find classes or symbols by keywords.",
              "Then call godot_get_class for a class overview, or godot_get_symbol for a specific member",
              '(e.g., "Node._ready", "Vector2.x").',
              "To browse via URIs, open godot://class/<Name> or godot://symbol/<Class>/<kind>/<name>.",
            ].join(" "),
          },
        },
      ],
    };
  });

  // Resources
  const classTemplate = new ResourceTemplate("godot://class/{name}{?ancestors,maxDepth}", {
    list: async () => {
      const names = await tools.listClasses({});
      return {
        resources: names.map((n) => ({
          uri: `godot://class/${n}`,
          name: n,
          description: `Godot class: ${n}`,
          mimeType: "application/json",
        })),
      };
    },
    complete: {
      name: async (value: string) => {
        const suggestions = await tools.listClasses({ prefix: value, limit: 50 });
        return suggestions;
      },
    },
  });

  mcp.resource("godot-class", classTemplate, async (uriObj, vars) => {
    const name = String(vars.name || "");
    const u = new URL(uriObj.toString());
    const ancestorsParam = u.searchParams.get("ancestors");
    const maxDepthParam = u.searchParams.get("maxDepth");
    const includeAncestors = ancestorsParam === "1" || ancestorsParam === "true";
    const maxDepth = maxDepthParam ? Number(maxDepthParam) : undefined;
    const json = await tools.getClass({ name, includeAncestors, maxDepth });
    return {
      contents: [{ uri: uriObj.toString(), mimeType: "application/json", text: JSON.stringify(json, null, 2) }],
    };
  });

  const symbolTemplate = new ResourceTemplate("godot://symbol/{className}/{kind}/{name}", {
    list: undefined,
    complete: {
      className: async (value: string) => tools.listClasses({ prefix: value, limit: 50 }),
      kind: async () => ["method", "property", "signal", "constant"],
      name: async () => [],
    },
  });

  mcp.resource("godot-symbol", symbolTemplate, async (uriObj, vars) => {
    const cls = String(vars.className || "");
    const member = String(vars.name || "");
    const uri = uriObj.toString();
    const json = await tools.getSymbol({ qname: `${cls}.${member}` });
    return {
      contents: [{ uri, mimeType: "application/json", text: JSON.stringify(json, null, 2) }],
    };
  });

  const searchTemplate = new ResourceTemplate("godot://search{?q,kind,limit}", {
    list: async () => ({ resources: [] }),
    complete: {
      kind: async () => ["class", "method", "property", "signal", "constant"],
    },
  });

  mcp.resource("godot-search", searchTemplate, async (uriObj) => {
    const u = new URL(uriObj.toString());
    const q = u.searchParams.get("q") || "";
    const kindParam = u.searchParams.get("kind") || undefined;
    const limitParam = u.searchParams.get("limit") || undefined;
    const KINDS = ["class", "method", "property", "signal", "constant"] as const;
    type Kind = (typeof KINDS)[number];
    const kind: Kind | undefined = (KINDS as readonly string[]).includes(kindParam ?? "")
      ? (kindParam as Kind)
      : undefined;
    const limit = limitParam ? Number(limitParam) : undefined;
    const json = await tools.search({ query: q, kind, limit });
    return {
      contents: [
        {
          uri: uriObj.toString(),
          mimeType: "application/json",
          text: JSON.stringify(json, null, 2),
        },
      ],
    };
  });

  // Initialize/warm-up hook after client initialization
  mcp.server.oninitialized = () => {
    try {
      opts?.onInitialize?.();
    } catch {}
  };

  // Connect via stdio
  const transport = new StdioServerTransport();
  await mcp.connect(transport);
  // Ensure the process stays alive waiting for stdio even if the runtime would otherwise exit.
  try {
    process.stdin.resume();
  } catch {}
  // As a fallback in some environments, keep an inert timer to prevent exit.
  // This will be cleared automatically when the process exits.
  setInterval(() => {}, 1 << 30);
}
