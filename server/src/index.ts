import path from "node:path";
import { createGodotTools, type GodotTools } from "./adapters/godotTools.js";
import { classifyConcepts } from "./concepts/classifier.js";
import { resolveDocDir } from "./docResolver.js";
import { isNodeVersionOk, loadConfig } from "./env.js";
import { buildIndex } from "./indexer/indexBuilder.js";
import { createLogger } from "./logger.js";
import { startMcpStdioServer } from "./mcp/stdio.js";
import { parseAll } from "./parser/xmlParser.js";

export async function createServer(env: Record<string, string | undefined> = process.env) {
  if (!isNodeVersionOk(env.NODE_VERSION || process.versions.node)) {
    throw new Error("Node.js v20+ required");
  }
  const cfg = loadConfig(env);
  const logger = createLogger(cfg.MCP_SERVER_LOG);
  const { docDir, source, godotVersion } = await resolveDocDir({
    godotDocDir: cfg.GODOT_DOC_DIR,
    godotBin: cfg.GODOT_BIN,
    cacheDir: path.dirname(cfg.GODOT_INDEX_PATH),
  });
  logger.info(`Docs resolved from ${source}${godotVersion ? ` (Godot ${godotVersion})` : ""}: ${docDir}`);
  const classes = await parseAll(docDir);
  const index = buildIndex(classes);
  const conceptMap = classifyConcepts(classes);
  const tools = createGodotTools(classes, index, logger, conceptMap);
  return { cfg, logger, tools };
}

export async function start(env: Record<string, string | undefined> = process.env) {
  // Fast initialize path: start stdio server immediately, then warm up in background.
  // Be lenient here to avoid client initialize timeouts; validate during warm-up instead.
  if (!isNodeVersionOk(env.NODE_VERSION || process.versions.node)) {
    // Allow startup; warm-up will fail with a clear error later if needed.
  }

  const cfg = loadConfig(env);
  const logger = createLogger(cfg.MCP_SERVER_LOG);

  // Deferred tools facade: waits for warmup before serving calls.
  let impl: GodotTools | null = null;
  let ready!: () => void;
  const readyPromise = new Promise<void>((res) => {
    ready = res;
  });

  const facade: GodotTools = {
    async search(input: {
      query: string;
      kind?: "class" | "method" | "property" | "signal" | "constant";
      limit?: number;
    }) {
      await readyPromise;
      const i = impl;
      if (!i) throw new Error("Server not ready");
      return i.search(input);
    },
    async getClass(input: { name: string }) {
      await readyPromise;
      const i = impl;
      if (!i) throw new Error("Server not ready");
      return i.getClass(input);
    },
    async getSymbol(input: { qname: string }) {
      await readyPromise;
      const i = impl;
      if (!i) throw new Error("Server not ready");
      return i.getSymbol(input);
    },
    async listClasses(input: { prefix?: string; limit?: number }) {
      await readyPromise;
      const i = impl;
      if (!i) throw new Error("Server not ready");
      return i.listClasses(input);
    },
    async getConcept(input: { name: string; kind?: string }) {
      await readyPromise;
      const i = impl;
      if (!i) throw new Error("Server not ready");
      return i.getConcept(input);
    },
    async listConcepts() {
      await readyPromise;
      const i = impl;
      if (!i) throw new Error("Server not ready");
      return i.listConcepts();
    },
  };

  if (String(cfg.MCP_STDIO) === "1") {
    // Fire-and-forget; stdio listeners keep the process alive.
    void startMcpStdioServer(facade, {
      onInitialize: () => {
        // Warm up docs/index only after responding to initialize.
        (async () => {
          try {
            // Resolve doc dir after initialize so clients don't time out waiting.
            const { docDir, source, godotVersion } = await resolveDocDir({
              godotDocDir: cfg.GODOT_DOC_DIR,
              godotBin: cfg.GODOT_BIN,
              cacheDir: path.dirname(cfg.GODOT_INDEX_PATH),
            });
            logger.info(`Docs resolved from ${source}${godotVersion ? ` (Godot ${godotVersion})` : ""}: ${docDir}`);
            const classes = await parseAll(docDir);
            const index = buildIndex(classes);
            const conceptMap = classifyConcepts(classes);
            impl = createGodotTools(classes, index, logger, conceptMap);
            ready();
            logger.info("Godot docs index ready");
          } catch (err) {
            logger.error("Failed to build index");
            console.error(err);
            process.exit(1);
          }
        })();
      },
    });
  }
}

const isMain = (() => {
  try {
    const argv1 = process.argv[1] ? path.resolve(process.argv[1]) : "";
    if (!argv1) return false;
    const argv1Url = new URL(`file://${argv1}`).href;
    return import.meta.url === argv1Url;
  } catch {
    return false;
  }
})();

if (isMain) {
  start().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
