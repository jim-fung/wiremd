/**
 * Embed bundle boundary smoke test — gate P1 section B1.
 *
 * Bundles a fixture importing only `wiremd/embed` (source-aliased, as a
 * host bundler would) and asserts the emitted output contains none of the
 * prohibited imports/strings:
 *
 *   node:fs / node:path / bare fs+path requires, chalk, chokidar,
 *   react/tailwind renderer symbols, process.env references, and the
 *   external-network endpoints the policy forbids.
 *
 * Also pins the export surface of the source entry (B2's built-dist
 * variant runs in CI after `pnpm build`).
 */

import { describe, expect, test } from 'vitest';
import { build } from 'esbuild';
import { resolve } from 'path';
import { readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import * as embed from '../src/embed/index.js';

const FIXTURE = resolve(import.meta.dirname, 'fixtures/embed-entry-fixture.ts');

const PROHIBITED: Array<[string, RegExp]> = [
  ['node:fs', /["']node:fs["']/],
  ['node:path', /["']node:path["']/],
  ['bare fs require', /require\(["']fs["']\)/],
  ['bare path require', /require\(["']path["']\)/],
  ['chalk', /["']chalk["']/],
  ['chokidar', /["']chokidar["']/],
  ['process.env', /process\.env/],
  ['tailwind CDN', /cdn\.tailwindcss\.com/],
  ['react-renderer module', /react-renderer/],
  ['tailwind-renderer module', /tailwind-renderer/],
  ['includes module', /parser\/includes/],
  ['cli module', /src\/cli/],
];

describe('embed bundle boundary (B1)', () => {
  let outfile: string;

  test('bundle of wiremd/embed excludes every prohibited import', async () => {
    outfile = join(tmpdir(), `wiremd-embed-bundle-${process.pid}.js`);
    await build({
      entryPoints: [FIXTURE],
      bundle: true,
      minify: true,
      format: 'esm',
      platform: 'browser',
      outfile,
      alias: {
        'wiremd/embed': resolve(import.meta.dirname, '../src/embed/index.ts'),
      },
      logLevel: 'silent',
    });

    const bundled = await readFile(outfile, 'utf-8');
    for (const [name, pattern] of PROHIBITED) {
      expect(bundled, `prohibited: ${name}`).not.toMatch(pattern);
    }

    // Renderer symbols that must not be dragged into the graph.
    expect(bundled).not.toMatch(/renderToReact/);
    expect(bundled).not.toMatch(/renderToTailwind/);
    expect(bundled).not.toMatch(/resolveIncludes/);
  }, 30_000);

  test('bundled artifact enforces the preview policy at runtime', async () => {
    // The sketch theme carries the Google-Fonts @import as an inert string
    // constant shared with the standalone renderer (stripping it would
    // change renderToHTML bytes — a compat violation). Policy is proven on
    // BEHAVIOR of the shipped artifact: the preview payload it emits must
    // contain neither the import statement nor any external reference.
    //
    // The runtime build targets `platform: 'node'` so this Node test can
    // execute it; the structural bans above run on the true browser-
    // conditioned bundle, where they are the meaningful assertion.
    const nodeOutfile = join(tmpdir(), `wiremd-embed-bundle-node-${process.pid}.js`);
    await build({
      entryPoints: [FIXTURE],
      bundle: true,
      format: 'esm',
      platform: 'node',
      outfile: nodeOutfile,
      alias: {
        'wiremd/embed': resolve(import.meta.dirname, '../src/embed/index.ts'),
      },
      logLevel: 'silent',
    });
    const bundled = await import(nodeOutfile);
    const compiled = bundled.compileWiremd('# Title\n[Go]*');
    const result = bundled.renderToPreview(compiled.document, {
      classPrefix: 'wmd-',
      style: 'sketch',
    });
    expect(result.css).not.toMatch(/@import/i);
    expect(result.css).not.toMatch(/fonts\.googleapis\.com/i);
    expect(result.html).not.toMatch(/<script|onerror=/i);
  });
});

describe('embed export surface (B2, source-level)', () => {
  test('exports exactly the documented embed contract', () => {
    const keys = Object.keys(embed).sort();
    expect(keys).toEqual([
      'WIREMD_STYLES',
      'compileWiremd',
      'renderToPreview',
    ]);
  });
});
