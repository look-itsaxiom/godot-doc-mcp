#!/usr/bin/env node
import { start } from '../server/src/index.js';
start().catch((err) => {
  console.error(err);
  process.exit(1);
});
