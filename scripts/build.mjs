#!/usr/bin/env node
/**
 * Build wrapper: `node scripts/build.mjs [--maps]`
 *
 * Runs the standard tsc + vite build; --maps additionally emits sourcemaps
 * (WIREMD_SOURCEMAPS=1) for local dist debugging. Cross-platform by design —
 * no `ENV=val cmd` syntax that breaks on Windows CI shells.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const withMaps = process.argv.includes('--maps');

const env = { ...process.env };
if (withMaps) env.WIREMD_SOURCEMAPS = '1';

for (const step of [['tsc'], ['vite', 'build']]) {
  const res = spawnSync(step[0], step.slice(1), {
    cwd: root,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}
