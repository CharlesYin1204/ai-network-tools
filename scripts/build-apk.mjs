#!/usr/bin/env node
import fs from 'node:fs/promises';
import { buildApk } from '../lib/apk.mjs';

try {
  const config = process.argv[2] ? JSON.parse(await fs.readFile(process.argv[2], 'utf8')) : {};
  const result = await buildApk(config);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(JSON.stringify({ error: error.message, code: error.code || 'APK_ERROR' }));
  process.exitCode = 1;
}
