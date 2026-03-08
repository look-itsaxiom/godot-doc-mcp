#!/usr/bin/env node
// Bootstrap script for Claude Code plugin: ensures dependencies are installed,
// then launches the MCP server with the tsx loader.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const nodeModules = resolve(root, 'node_modules');
const cli = resolve(root, 'server', 'src', 'cli.ts');

// Auto-install dependencies if missing (first run after plugin install)
if (!existsSync(nodeModules)) {
  console.error('[godot-doc-mcp] Installing dependencies (first run)...');
  try {
    execFileSync('npm', ['install', '--production', '--no-fund', '--no-audit'], {
      cwd: root,
      stdio: ['ignore', 'ignore', 'inherit'],
      shell: process.platform === 'win32',
    });
  } catch {
    console.error('[godot-doc-mcp] Failed to install dependencies. Run "npm install" manually in:', root);
    process.exit(1);
  }
}

// Launch the MCP server
const child = spawn(process.execPath, ['--import', 'tsx', cli], {
  stdio: 'inherit',
  cwd: root,
  env: process.env,
});

child.on('exit', (code) => process.exit(code ?? 1));
child.on('error', (err) => {
  console.error(err.message);
  process.exit(1);
});
