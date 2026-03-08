#!/usr/bin/env node
// Launches the MCP server with the tsx loader.
// Uses subprocess to avoid shebang portability issues with `env -S`.
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cli = resolve(__dirname, '..', 'server', 'src', 'cli.ts');

const child = spawn(process.execPath, ['--import', 'tsx', cli], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => process.exit(code ?? 1));
child.on('error', (err) => {
  console.error(err.message);
  process.exit(1);
});
