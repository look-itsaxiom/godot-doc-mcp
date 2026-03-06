import { createSymbolResolver } from "../resolver/symbolResolver.js";
import { createSearchEngine } from "../search/searchEngine.js";
import type { AncestryResponse, GodotClassDoc, GodotSymbolDoc, MemoryIndex } from "../types.js";

export interface ConceptResult {
  title: string;
  overview: string;
  examples: string[];
  classes: Array<{ name: string; brief: string; inherits?: string }>;
}

export interface GodotTools {
  search(input: {
    query: string;
    kind?: "class" | "method" | "property" | "signal" | "constant";
    limit?: number;
  }): Promise<Array<{ uri: string; name: string; kind: string; score: number; snippet?: string }>>;
  getClass(input: { name: string; includeAncestors?: boolean; maxDepth?: number }): Promise<GodotClassDoc | AncestryResponse>;
  getSymbol(input: { qname: string }): Promise<GodotSymbolDoc>;
  listClasses(input: { prefix?: string; limit?: number }): Promise<string[]>;
  getConcept(input: { name: string; kind?: string }): Promise<ConceptResult>;
  listConcepts(): Promise<string[]>;
}

export function createGodotTools(
  classes: GodotClassDoc[],
  index: MemoryIndex,
  logger?: { debug?: (msg: string, meta?: Record<string, unknown>) => void },
  conceptMap?: Map<string, string[]>,
): GodotTools {
  const search = createSearchEngine(index);
  const resolver = createSymbolResolver(classes);
  const classByName = new Map<string, GodotClassDoc>(classes.map((c) => [c.name, c]));

  // Lazy-import registry to avoid circular deps at module level
  let _registry: Record<string, import("../concepts/registry.js").ConceptOverview> | null = null;
  async function getRegistry() {
    if (!_registry) {
      const mod = await import("../concepts/registry.js");
      _registry = mod.CONCEPT_REGISTRY;
    }
    return _registry;
  }

  return {
    async search(input) {
      const { query, kind, limit } = input;
      const q = String(query ?? "").trim();
      if (!q) return [];
      logger?.debug?.("search", { query: q, kind, limit });
      return search.search({ query: q, kind, limit });
    },
    async getClass(input) {
      if (!input || !input.name) {
        const err = new Error("name is required") as Error & { code?: string };
        err.code = "INVALID_ARGUMENT";
        throw err;
      }
      const name = input.name;
      const includeAncestors = Boolean(input.includeAncestors);
      const maxDepth = typeof input.maxDepth === "number" ? input.maxDepth : undefined;
      if (includeAncestors) {
        logger?.debug?.("getClass(includeAncestors)", { name, maxDepth });
        return resolver.getClassChain(name, maxDepth && maxDepth > 0 ? maxDepth : undefined);
      }
      return resolver.getClass(name);
    },
    async getSymbol(input) {
      if (!input || !input.qname) {
        const err = new Error("qname is required") as Error & { code?: string };
        err.code = "INVALID_ARGUMENT";
        throw err;
      }
      return resolver.getSymbol(input.qname);
    },
    async listClasses(input) {
      const prefix = input?.prefix;
      const limit = input?.limit;
      return resolver.listClasses(prefix, limit);
    },
    async getConcept(input) {
      if (!input || !input.name) {
        const err = new Error("name is required") as Error & { code?: string };
        err.code = "INVALID_ARGUMENT";
        throw err;
      }
      const registry = await getRegistry();
      const conceptName = input.name;
      const overview = registry[conceptName];
      if (!overview) {
        const err = new Error(`Concept not found: ${conceptName}`) as Error & { code?: string };
        err.code = "NOT_FOUND";
        throw err;
      }
      // Find all classes tagged with this concept
      const matchingClasses: Array<{ name: string; brief: string; inherits?: string }> = [];
      if (conceptMap) {
        for (const [className, tags] of conceptMap) {
          if (tags.includes(conceptName)) {
            const c = classByName.get(className);
            matchingClasses.push({
              name: className,
              brief: c?.brief || "",
              ...(c?.inherits ? { inherits: c.inherits } : {}),
            });
          }
        }
      }
      // Sort alphabetically
      matchingClasses.sort((a, b) => a.name.localeCompare(b.name));
      return {
        title: overview.title,
        overview: overview.overview,
        examples: overview.examples,
        classes: matchingClasses,
      };
    },
    async listConcepts() {
      const registry = await getRegistry();
      return Object.keys(registry).filter((k) => k !== "general");
    },
  };
}
