export interface Config {
  GODOT_DOC_DIR: string | undefined;
  GODOT_BIN: string | undefined;
  GODOT_INDEX_PATH: string;
  MCP_SERVER_LOG: "silent" | "error" | "warn" | "info" | "debug";
  MCP_STDIO: string;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  return {
    GODOT_DOC_DIR: env.GODOT_DOC_DIR,
    GODOT_BIN: env.GODOT_BIN,
    GODOT_INDEX_PATH: env.GODOT_INDEX_PATH ?? "./.cache/godot-index.json",
    MCP_SERVER_LOG: (env.MCP_SERVER_LOG as Config["MCP_SERVER_LOG"]) ?? "info",
    MCP_STDIO: env.MCP_STDIO !== undefined ? String(env.MCP_STDIO) : "1",
  };
}

export function isNodeVersionOk(v: string = process.versions.node): boolean {
  const major = Number(String(v).trim().split(".")[0]);
  return Number.isFinite(major) && major >= 20;
}
