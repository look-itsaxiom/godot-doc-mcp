# Installable, Version-Flexible, Token-Efficient MCP Server

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make godot-doc-mcp installable via npx, auto-detect the user's Godot version for docs, and reduce concept tool output bloat.

**Architecture:** Add a CLI entrypoint with shebang for npm bin. Add a doc resolver layer that tries GODOT_DOC_DIR → GODOT_BIN --doctool → godot on PATH --doctool → error. Cache extracted docs keyed by version. Cap concept tool class lists to the most relevant classes.

**Tech Stack:** Node.js 20+, TypeScript, @modelcontextprotocol/sdk, fast-xml-parser, zod, vitest

---

### Task 1: Add npm bin entrypoint

**Files:**
- Create: `bin/godot-doc-mcp.mjs`
- Modify: `package.json`

**Step 1: Create the bin entrypoint**

Create `bin/godot-doc-mcp.mjs`:
```js
#!/usr/bin/env node
import { start } from '../server/src/index.js';
start().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Step 2: Update package.json**

Add `bin` field and update the `name` to be npm-publishable:
```json
{
  "name": "godot-doc-mcp",
  "bin": {
    "godot-doc-mcp": "./bin/godot-doc-mcp.mjs"
  }
}
```

Also add `"files"` to control what gets published:
```json
{
  "files": [
    "bin/",
    "server/src/",
    "package.json",
    "README.md"
  ]
}
```

Note: We do NOT include `doc/` in files — docs come from the user's Godot install.

**Step 3: Test the bin entrypoint locally**

Run: `node bin/godot-doc-mcp.mjs`
Expected: Server starts on stdio (will error if no docs available, which is fine — Task 2 handles that)

**Step 4: Test npx-style invocation**

Run: `npm link && npx godot-doc-mcp --help` (or just verify the link works)
Expected: Binary is found and runs

**Step 5: Commit**

```bash
git add bin/godot-doc-mcp.mjs package.json
git commit -m "feat: add npm bin entrypoint for npx support"
```

---

### Task 2: Add Godot doc resolver (auto-detect + cache)

**Files:**
- Create: `server/src/docResolver.ts`
- Create: `server/test/docResolver.test.ts`
- Modify: `server/src/env.ts` (add GODOT_BIN to Config)
- Modify: `server/src/index.ts` (use resolver instead of direct parseAll)

**Step 1: Write the failing tests**

Create `server/test/docResolver.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { resolveDocDir } from '../src/docResolver.js';

describe('resolveDocDir', () => {
  it('returns GODOT_DOC_DIR when set and valid', async () => {
    const result = await resolveDocDir({
      godotDocDir: './doc',
      godotBin: undefined,
      cacheDir: './.cache',
    });
    expect(result.docDir).toBe('./doc');
    expect(result.source).toBe('env');
  });

  it('throws when GODOT_DOC_DIR is set but invalid', async () => {
    await expect(resolveDocDir({
      godotDocDir: './nonexistent',
      godotBin: undefined,
      cacheDir: './.cache',
    })).rejects.toThrow(/GODOT_DOC_DIR/);
  });

  it('returns cached docs when available and version matches', async () => {
    // This test needs a mock — we'll test the cache-hit path
    // by pre-creating the cache structure
  });

  it('throws clear error when no Godot found', async () => {
    await expect(resolveDocDir({
      godotDocDir: undefined,
      godotBin: undefined,
      cacheDir: './.cache',
      // Mock: no godot on PATH
      execGodot: async () => { throw new Error('not found'); },
    })).rejects.toThrow(/Could not find Godot/);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test -- server/test/docResolver.test.ts`
Expected: FAIL — module not found

**Step 3: Implement docResolver.ts**

Create `server/src/docResolver.ts`:
```ts
import { existsSync, statSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface ResolveDocDirOptions {
  godotDocDir?: string;
  godotBin?: string;
  cacheDir: string;
  /** Override for testing — runs a godot command and returns stdout */
  execGodot?: (bin: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;
}

export interface ResolveDocDirResult {
  docDir: string;
  source: 'env' | 'cache' | 'extracted';
  godotVersion?: string;
}

const GODOT_BIN_CANDIDATES = ['godot', 'godot4', 'godot.exe', 'godot4.exe'];

export async function resolveDocDir(opts: ResolveDocDirOptions): Promise<ResolveDocDirResult> {
  const exec = opts.execGodot ?? defaultExecGodot;

  // 1. Explicit GODOT_DOC_DIR — use as-is
  if (opts.godotDocDir) {
    const classesDir = path.join(opts.godotDocDir, 'classes');
    if (!existsSync(classesDir) || !statSync(classesDir).isDirectory()) {
      throw new Error(
        `GODOT_DOC_DIR is set to "${opts.godotDocDir}" but no classes/ directory found there. ` +
        `Ensure the path contains Godot XML docs (doc/classes/*.xml).`
      );
    }
    return { docDir: opts.godotDocDir, source: 'env' };
  }

  // 2. Find a Godot binary
  const bin = await findGodotBin(opts.godotBin, exec);

  // 3. Get version
  const version = await getGodotVersion(bin, exec);

  // 4. Check cache
  const versionSlug = version.replace(/[^a-zA-Z0-9._-]/g, '_');
  const cachedDir = path.join(opts.cacheDir, `godot-${versionSlug}`);
  const cachedClassesDir = path.join(cachedDir, 'classes');
  const versionFile = path.join(cachedDir, '.godot-version');

  if (existsSync(cachedClassesDir) && existsSync(versionFile)) {
    const cachedVersion = readFileSync(versionFile, 'utf8').trim();
    if (cachedVersion === version) {
      return { docDir: cachedDir, source: 'cache', godotVersion: version };
    }
  }

  // 5. Extract docs via --doctool
  mkdirSync(cachedClassesDir, { recursive: true });
  try {
    await exec(bin, ['--doctool', cachedDir, '--headless']);
  } catch (e) {
    // Some Godot versions need --no-header or different flags
    // Try without --headless as fallback
    try {
      await exec(bin, ['--doctool', cachedDir]);
    } catch (e2) {
      throw new Error(
        `Found Godot at "${bin}" (${version}) but --doctool failed.\n` +
        `Error: ${e2 instanceof Error ? e2.message : String(e2)}\n` +
        `You can manually extract docs and set GODOT_DOC_DIR instead.`
      );
    }
  }

  // Verify extraction produced files
  if (!existsSync(cachedClassesDir) || !statSync(cachedClassesDir).isDirectory()) {
    throw new Error(
      `Godot --doctool ran but no classes/ directory was created at ${cachedDir}. ` +
      `Try running manually: ${bin} --doctool ${cachedDir} --headless`
    );
  }

  writeFileSync(versionFile, version, 'utf8');
  return { docDir: cachedDir, source: 'extracted', godotVersion: version };
}

async function findGodotBin(
  explicit: string | undefined,
  exec: (bin: string, args: string[]) => Promise<{ stdout: string; stderr: string }>
): Promise<string> {
  // Try explicit GODOT_BIN first
  if (explicit) {
    try {
      await exec(explicit, ['--version']);
      return explicit;
    } catch {
      throw new Error(
        `GODOT_BIN is set to "${explicit}" but it could not be executed. ` +
        `Ensure the path points to a valid Godot binary.`
      );
    }
  }

  // Try common binary names on PATH
  for (const candidate of GODOT_BIN_CANDIDATES) {
    try {
      await exec(candidate, ['--version']);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error(
    'Could not find Godot engine binary.\n\n' +
    'Options:\n' +
    '  1. Install Godot and ensure "godot" is on your PATH\n' +
    '  2. Set GODOT_BIN to the path of your Godot binary\n' +
    '  3. Set GODOT_DOC_DIR to a directory containing pre-extracted XML docs\n' +
    '     (run: godot --doctool ./my-docs --headless)'
  );
}

async function getGodotVersion(
  bin: string,
  exec: (bin: string, args: string[]) => Promise<{ stdout: string; stderr: string }>
): Promise<string> {
  const { stdout } = await exec(bin, ['--version']);
  return stdout.trim();
}

async function defaultExecGodot(
  bin: string,
  args: string[]
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(bin, args, { timeout: 120_000 });
}
```

**Step 4: Run tests**

Run: `pnpm test -- server/test/docResolver.test.ts`
Expected: PASS for tests 1, 2, 4. Test 3 may need fleshing out.

**Step 5: Update env.ts**

Add `GODOT_BIN` to Config interface and loadConfig:
```ts
export interface Config {
  GODOT_DOC_DIR: string | undefined;  // Changed: now optional
  GODOT_BIN: string | undefined;       // New
  GODOT_INDEX_PATH: string;
  MCP_SERVER_LOG: 'silent' | 'error' | 'warn' | 'info' | 'debug';
  MCP_STDIO: string;
}

export function loadConfig(env): Config {
  return {
    GODOT_DOC_DIR: env.GODOT_DOC_DIR,          // No default — resolver handles fallback
    GODOT_BIN: env.GODOT_BIN,                   // New
    GODOT_INDEX_PATH: env.GODOT_INDEX_PATH ?? './.cache/godot-index.json',
    MCP_SERVER_LOG: ...,
    MCP_STDIO: ...,
  };
}
```

Remove `validateConfig` — the doc resolver now handles validation.

**Step 6: Update index.ts**

Wire `resolveDocDir` into both `createServer` and `start`:
```ts
import { resolveDocDir } from './docResolver.js';

// In the warm-up:
const { docDir, source, godotVersion } = await resolveDocDir({
  godotDocDir: cfg.GODOT_DOC_DIR,
  godotBin: cfg.GODOT_BIN,
  cacheDir: path.dirname(cfg.GODOT_INDEX_PATH),
});
logger.info(`Docs resolved from ${source}${godotVersion ? ` (Godot ${godotVersion})` : ''}: ${docDir}`);
const classes = await parseAll(docDir);
```

**Step 7: Update existing tests**

Update `server/test/env.test.ts`:
- Remove the `validateConfig` tests (validation moved to docResolver)
- Update `loadConfig` defaults test — GODOT_DOC_DIR is now undefined by default

**Step 8: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

**Step 9: Commit**

```bash
git add server/src/docResolver.ts server/test/docResolver.test.ts server/src/env.ts server/src/index.ts server/test/env.test.ts
git commit -m "feat: auto-detect Godot binary and extract docs with version-keyed cache"
```

---

### Task 3: Trim concept tool output

**Files:**
- Modify: `server/src/adapters/godotTools.ts`
- Modify: `server/src/mcp/stdio.ts`
- Create: `server/test/concepts.test.ts`

**Step 1: Write the failing test**

Create `server/test/concepts.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseAll } from '../src/parser/xmlParser.js';
import { buildIndex } from '../src/indexer/indexBuilder.js';
import { classifyConcepts } from '../src/concepts/classifier.js';
import { createGodotTools } from '../src/adapters/godotTools.js';

describe('concept tool output limits', () => {
  it('caps class list to maxClasses (default 25)', async () => {
    const classes = await parseAll('./doc');
    const index = buildIndex(classes);
    const conceptMap = classifyConcepts(classes);
    const tools = createGodotTools(classes, index, undefined, conceptMap);

    const result = await tools.getConcept({ name: 'scene_tree' });
    expect(result.classes.length).toBeLessThanOrEqual(25);
    expect(result.totalClasses).toBeGreaterThan(25); // scene_tree has hundreds
  });

  it('returns all classes when maxClasses is high enough', async () => {
    const classes = await parseAll('./doc');
    const index = buildIndex(classes);
    const conceptMap = classifyConcepts(classes);
    const tools = createGodotTools(classes, index, undefined, conceptMap);

    const result = await tools.getConcept({ name: 'math', maxClasses: 1000 });
    // math has few classes, so all should be returned
    expect(result.classes.length).toBe(result.totalClasses);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- server/test/concepts.test.ts`
Expected: FAIL — `totalClasses` not in result, `maxClasses` not accepted

**Step 3: Update getConcept in godotTools.ts**

Add `maxClasses` param and `totalClasses` to response. Prioritize "core" classes (direct children of the concept's ancestor classes) over loosely matched ones:

```ts
async getConcept(input: { name: string; kind?: string; maxClasses?: number }): Promise<ConceptResult> {
  // ... existing lookup ...
  const MAX = input.maxClasses ?? 25;
  const totalClasses = matchingClasses.length;

  // Prioritize: classes whose name contains the concept keyword first,
  // then by inheritance depth (closer to root = more fundamental)
  matchingClasses.sort((a, b) => {
    const aCore = isCoreClass(a.name, conceptName);
    const bCore = isCoreClass(b.name, conceptName);
    if (aCore !== bCore) return aCore ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return {
    title: overview.title,
    overview: overview.overview,
    examples: overview.examples,
    classes: matchingClasses.slice(0, MAX),
    totalClasses,
  };
}
```

**Step 4: Update ConceptResult interface**

```ts
export interface ConceptResult {
  title: string;
  overview: string;
  examples: string[];
  classes: Array<{ name: string; brief: string; inherits?: string }>;
  totalClasses: number;
}
```

**Step 5: Add maxClasses param to concept tools in stdio.ts**

Add optional `maxClasses` Zod param to each concept tool:
```ts
{ maxClasses: z.number().int().positive().optional() }
```

Pass through to `tools.getConcept({ name: '...', maxClasses })`.

**Step 6: Run tests**

Run: `pnpm test`
Expected: All tests pass including the new concept tests

**Step 7: Commit**

```bash
git add server/src/adapters/godotTools.ts server/src/mcp/stdio.ts server/test/concepts.test.ts
git commit -m "feat: cap concept tool class output to 25 most relevant, add totalClasses count"
```

---

### Task 4: Remove bundled docs from repo

**Files:**
- Modify: `.gitignore`
- Delete: `doc/classes/*.xml` (892 files)
- Modify: `server/test/env.test.ts` (update test that references `./doc`)
- Modify: tests that use `./doc` as fixture path

**Step 1: Update .gitignore**

Add `doc/classes/` to .gitignore so extracted docs don't get committed.

**Step 2: Check which tests depend on `./doc`**

Grep for `./doc` in test files. The env test references it, and the new concepts test does too. These tests need the bundled docs to run — so we keep a small fixture set in `server/test/fixtures/` (which already exists) and update tests to use that, OR we keep `doc/` in the repo but exclude from npm package.

**Decision:** Keep `doc/` in the repo for development/testing but exclude from npm via `files` in package.json (already done in Task 1). This way tests still work locally but the npm package is lean.

**Step 3: Commit**

```bash
git commit -m "chore: exclude doc/ from npm package, add to .gitignore note"
```

---

### Task 5: Update README and documentation

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

**Step 1: Update README Quick Start**

Replace the current manual setup instructions with:
```markdown
## Quick Start

### Via npx (recommended)

Configure in Claude Code settings (`~/.claude.json`):
```json
{
  "mcpServers": {
    "godot-docs": {
      "command": "npx",
      "args": ["-y", "godot-doc-mcp"]
    }
  }
}
```

The server auto-detects your Godot installation and extracts docs on first run.

### Environment variables (optional)
- `GODOT_BIN` — Path to a specific Godot binary (for multiple installs)
- `GODOT_DOC_DIR` — Path to pre-extracted XML docs (skips auto-detection)
- `MCP_SERVER_LOG` — Log level: silent|error|warn|info|debug (default: info)
```

**Step 2: Update AGENTS.md**

Update the environment variables section to include `GODOT_BIN` and reflect that `GODOT_DOC_DIR` is now optional.

**Step 3: Commit**

```bash
git add README.md AGENTS.md
git commit -m "docs: update setup instructions for npx and auto-detection"
```

---

### Task 6: Final validation

**Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

**Step 2: Test npx flow end-to-end**

Run: `npm link && npx godot-doc-mcp`
Expected: If Godot is on PATH, extracts docs and starts. If not, clear error message.

**Step 3: Test with explicit GODOT_DOC_DIR**

Run: `GODOT_DOC_DIR=./doc npx godot-doc-mcp`
Expected: Uses bundled docs, server starts

**Step 4: Verify concept tool output is trimmed**

Use MCP smoke test or manual stdio to call `godot_scene_tree` — should return ≤25 classes, not 600+.

**Step 5: Tag for release (don't publish yet)**

```bash
git tag v0.2.0
```
