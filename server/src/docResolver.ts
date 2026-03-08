import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFileCb);

export interface ResolveDocDirOptions {
  godotDocDir?: string;
  godotBin?: string;
  cacheDir: string;
  /** Override for testing */
  execGodot?: (bin: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;
}

export interface ResolveDocDirResult {
  docDir: string;
  source: "env" | "cache" | "extracted";
  godotVersion?: string;
}

function hasClassesDir(dir: string): boolean {
  const classesDir = path.join(dir, "classes");
  return (
    existsSync(classesDir) &&
    statSync(classesDir).isDirectory()
  );
}

function slugify(version: string): string {
  return version.replace(/[^a-zA-Z0-9._-]/g, "_");
}

const NO_GODOT_ERROR = `Could not find Godot docs. Please do one of the following:
  1. Install Godot 4 and ensure 'godot' is on your PATH
  2. Set GODOT_BIN to the path of your Godot executable
  3. Set GODOT_DOC_DIR to a directory containing extracted Godot XML docs (with a classes/ subdirectory)`;

async function defaultExecGodot(
  bin: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(bin, args, { timeout: 120_000 });
}

async function getGodotVersion(
  bin: string,
  exec: (bin: string, args: string[]) => Promise<{ stdout: string; stderr: string }>,
): Promise<string> {
  const { stdout } = await exec(bin, ["--version"]);
  return stdout.trim();
}

async function extractDocs(
  bin: string,
  targetDir: string,
  exec: (bin: string, args: string[]) => Promise<{ stdout: string; stderr: string }>,
): Promise<void> {
  mkdirSync(targetDir, { recursive: true });
  try {
    await exec(bin, ["--doctool", targetDir, "--headless"]);
  } catch {
    // Fall back without --headless for older versions
    await exec(bin, ["--doctool", targetDir]);
  }
}

async function resolveFromBinary(
  bin: string,
  cacheDir: string,
  exec: (bin: string, args: string[]) => Promise<{ stdout: string; stderr: string }>,
): Promise<ResolveDocDirResult> {
  const version = await getGodotVersion(bin, exec);
  const slug = slugify(version);
  const cachedDir = path.join(cacheDir, `godot-${slug}`);
  const versionFile = path.join(cachedDir, ".godot-version");

  // Check cache
  if (existsSync(versionFile)) {
    const cached = readFileSync(versionFile, "utf-8").trim();
    if (cached === version && hasClassesDir(cachedDir)) {
      return { docDir: cachedDir, source: "cache", godotVersion: version };
    }
  }

  // Extract docs
  await extractDocs(bin, cachedDir, exec);

  if (!hasClassesDir(cachedDir)) {
    throw new Error(
      `Godot --doctool ran but did not produce a classes/ directory in ${cachedDir}`,
    );
  }

  writeFileSync(versionFile, version, "utf-8");
  return { docDir: cachedDir, source: "extracted", godotVersion: version };
}

const PATH_CANDIDATES = ["godot", "godot4", "godot.exe", "godot4.exe"];

async function findGodotOnPath(
  exec: (bin: string, args: string[]) => Promise<{ stdout: string; stderr: string }>,
): Promise<string | null> {
  for (const candidate of PATH_CANDIDATES) {
    try {
      await exec(candidate, ["--version"]);
      return candidate;
    } catch {
      // not found, try next
    }
  }
  return null;
}

export async function resolveDocDir(
  opts: ResolveDocDirOptions,
): Promise<ResolveDocDirResult> {
  const exec = opts.execGodot ?? defaultExecGodot;

  // 1. GODOT_DOC_DIR env var — use as-is
  if (opts.godotDocDir) {
    if (!existsSync(opts.godotDocDir) || !statSync(opts.godotDocDir).isDirectory()) {
      throw new Error(
        `GODOT_DOC_DIR is set to "${opts.godotDocDir}" but it does not exist or is not a directory`,
      );
    }
    if (!hasClassesDir(opts.godotDocDir)) {
      throw new Error(
        `GODOT_DOC_DIR is set to "${opts.godotDocDir}" but it has no classes/ subdirectory`,
      );
    }
    return { docDir: opts.godotDocDir, source: "env" };
  }

  // 2. GODOT_BIN env var
  if (opts.godotBin) {
    return resolveFromBinary(opts.godotBin, opts.cacheDir, exec);
  }

  // 3. Auto-detect godot on PATH
  const found = await findGodotOnPath(exec);
  if (found) {
    return resolveFromBinary(found, opts.cacheDir, exec);
  }

  // 4. Error
  throw new Error(NO_GODOT_ERROR);
}
