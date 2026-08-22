#!/usr/bin/env node
/**
 * E2E harness for Cypress.
 *
 * Starts both screens under test:
 *   1. the editor app (Vite dev server, started programmatically so no browser
 *      window pops despite editor/vite.config.ts setting open: true)
 *   2. the wiremd CLI preview server over cypress/fixtures/pages
 *
 * Then runs Cypress (`run` headless by default, `--open` for interactive).
 * Videos land in cypress/videos/, screenshots in cypress/screenshots/.
 *
 * Requires `bun run build` to have produced dist/cli/index.js (the preview
 * server runs through bin/wiremd.js).
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EDITOR_PORT = 5174;
const PAGES_PORT = 3017;
const openMode = process.argv.includes('--open');

const requireFromEditor = createRequire(path.join(repoRoot, 'editor', 'package.json'));

function waitUntilReady(url, label, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) return resolve();
      } catch {
        // not up yet
      }
      if (Date.now() > deadline) {
        return reject(new Error(`${label} did not become ready at ${url}`));
      }
      setTimeout(attempt, 300);
    };
    attempt();
  });
}

async function startEditorServer() {
  // Resolve through editor/ so we get its own Vite; import the ESM entry
  // explicitly because bare 'vite' resolves to the CJS build here.
  const editorPkgDir = path.dirname(requireFromEditor.resolve('vite/package.json'));
  const vite = await import(pathToFileURL(path.join(editorPkgDir, 'dist/node/index.js')).href);
  const server = await vite.createServer({
    root: path.join(repoRoot, 'editor'),
    logLevel: 'error',
    server: { port: EDITOR_PORT, strictPort: true, open: false },
  });
  await server.listen();
  console.log(`[e2e] editor dev server on http://localhost:${EDITOR_PORT}`);
  return { name: 'editor-vite', stop: () => server.close() };
}

function startPagesServer() {
  if (!existsSync(path.join(repoRoot, 'dist', 'cli', 'index.js'))) {
    console.error('[e2e] dist/cli/index.js missing — run `bun run build` first.');
    process.exit(1);
  }
  const child = spawn(
    process.execPath,
    [
      path.join(repoRoot, 'bin', 'wiremd.js'),
      path.join(repoRoot, 'cypress/fixtures/pages'),
      '--serve',
      String(PAGES_PORT),
      '--style',
      'clean',
    ],
    { stdio: 'inherit' },
  );
  console.log(`[e2e] pages preview server on http://localhost:${PAGES_PORT}`);
  // Surface early death (e.g. EADDRINUSE from a stale process) instead of
  // letting waitUntilReady poll a dead server for the full timeout.
  // Resolves with an Error once the child dies, or never resolves while alive
  // (so racing it against readiness needs no unhandled-rejection guard).
  const failed = new Promise((resolve) => {
    child.on('exit', (code, signal) =>
      resolve(new Error(`[e2e] pages server exited early (code=${code}, signal=${signal}). Check whether port ${PAGES_PORT} is already in use.`)),
    );
    child.on('error', (err) => resolve(err));
  });
  return {
    name: 'pages-server',
    failed,
    stop: () => {
      child.kill('SIGTERM');
    },
  };
}

/** Split a quoted-capable CLI passthrough ("--spec \"my spec.cy.ts\""). */
function splitArgs(raw) {
  const matches = raw.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  return matches.map((token) => token.replaceAll('"', ''));
}

function runCypress() {
  const cypressBin = path.join(repoRoot, 'node_modules', '.bin', 'cypress');
  // Always run in a real installed browser, never the bundled Electron
  // (override with E2E_BROWSER, e.g. E2E_BROWSER=firefox).
  const browser = process.env.E2E_BROWSER ?? 'chrome';
  const args = openMode ? ['open', '--browser', browser] : ['run', '--browser', browser];
  // Extra CLI passthrough, e.g. E2E_CYPRESS_ARGS="--spec cypress/e2e/editor.cy.ts"
  const extra = splitArgs(process.env.E2E_CYPRESS_ARGS ?? '');
  return new Promise((resolve) => {
    const child = spawn(cypressBin, [...args, ...extra], { stdio: 'inherit' });
    child.on('exit', (code) => resolve(code ?? 1));
    child.on('error', (err) => {
      console.error(`[e2e] failed to launch cypress: ${err.message}`);
      resolve(1);
    });
  });
}

const servers = [];
let exitCode = 1;
try {
  servers.push(await startEditorServer());
  const pages = startPagesServer();
  servers.push(pages);
  await waitUntilReady(`http://localhost:${EDITOR_PORT}/`, 'editor dev server');
  // If the pages server dies while we wait (stale port, crash), fail fast
  // with the real reason instead of a generic readiness timeout.
  const failure = await Promise.race([
    waitUntilReady(`http://localhost:${PAGES_PORT}/login-form.md`, 'pages preview server').then(() => null),
    pages.failed,
  ]);
  if (failure) {
    throw failure;
  }
  exitCode = await runCypress();
} finally {
  for (const server of servers.reverse()) {
    try {
      server.stop();
    } catch {
      // already gone
    }
  }
}
process.exit(exitCode);
