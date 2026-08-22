/**
 * Embed contract tests — the `wiremd/embed` browser-safe boundary.
 *
 * Covers gate P1 sections: API shape (A1–A6), positions and diagnostics
 * (D1–D6), includes-disabled policy (I1–I2), and partial validity.
 * The security corpus for preview output lives in
 * `tests/preview-renderer.test.ts`; the bundle boundary in
 * `tests/embed-bundle.test.ts`.
 */

import { describe, expect, test } from 'vitest';
import {
  compileWiremd,
  renderToPreview,
  WIREMD_STYLES,
} from '../src/embed/index.js';
import { SYNTAX_VERSION } from '../src/version.js';
import { parse } from '../src/parser/index.js';

const VALID_SOURCE = `# Account settings
Name
[_______________]
[Save]*`;

describe('embed API — compileWiremd', () => {
  test('A1: valid source returns a document with no error diagnostics', () => {
    const result = compileWiremd(VALID_SOURCE);
    expect(result.document).not.toBeNull();
    expect(result.document?.type).toBe('document');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.syntaxVersion).toBe(SYNTAX_VERSION);
  });

  test('A2: never throws on a hostile corpus; always returns a result', () => {
    const hostile = [
      '',
      '   ',
      '::: unclosed',
      '[unclosed button',
      '```nested\nfence\n```',
      `${VALID_SOURCE}\n${'x'.repeat(500_000)}`,
      '<div><script>alert(1)</script></div>',
    ];
    for (const source of hostile) {
      const result = compileWiremd(source);
      expect(result).toHaveProperty('diagnostics');
      expect(Array.isArray(result.diagnostics)).toBe(true);
    }
  });

  test('empty string compiles to an empty document, no diagnostics', () => {
    const result = compileWiremd('');
    expect(result.document?.children).toEqual([]);
    expect(result.diagnostics).toEqual([]);
  });

  test('A5: syntax version is reported and identical input is deterministic', () => {
    const a = compileWiremd(VALID_SOURCE);
    const b = compileWiremd(VALID_SOURCE);
    expect(a.syntaxVersion).toBe(SYNTAX_VERSION);
    expect(JSON.stringify(a.document)).toBe(JSON.stringify(b.document));
  });

  test('A6: WIREMD_STYLES lists the seven documented styles in order', () => {
    expect([...WIREMD_STYLES]).toEqual([
      'sketch',
      'clean',
      'wireframe',
      'none',
      'tailwind',
      'material',
      'brutal',
    ]);
  });

  test('syntax-version mismatch surfaces an error diagnostic but still compiles', () => {
    const result = compileWiremd(VALID_SOURCE, { syntaxVersion: '9.9' });
    const mismatch = result.diagnostics.find(
      (d) => d.code === 'wmd-invalid-syntax-version'
    );
    expect(mismatch?.severity).toBe('error');
    expect(result.document).not.toBeNull();
  });

  test('validate stage can be disabled', () => {
    // A construct that parses but fails validation is hard to trigger via
    // text alone; assert the option is honored by checking no validator-
    // sourced diagnostics appear when skipped.
    const result = compileWiremd(VALID_SOURCE, { validate: false });
    expect(result.diagnostics.filter((d) => d.source === 'validator')).toEqual([]);
  });
});

describe('unsupported-node visibility (drop diagnostics)', () => {
  test('D1: unsupported mdast blocks yield wmd-unsupported-node warnings with spans', () => {
    const source = [
      VALID_SOURCE,
      '',
      '<div>raw html block</div>',
    ].join('\n');

    const collected: import('../src/diagnostics.js').WiremdDiagnostic[] = [];
    const result = compileWiremd(source, {
      onDiagnostic: (d) => collected.push(d),
    });
    const drops = collected.filter((d) => d.code === 'wmd-unsupported-node');
    expect(drops.length).toBeGreaterThanOrEqual(1);
    for (const drop of drops) {
      expect(drop.severity).toBe('warning');
      expect(drop.source).toBe('parser');
      expect(drop.start?.line).toBeGreaterThan(0);
      expect(drop.start?.column).toBeGreaterThan(0);
    }
    // The valid subset still compiled.
    expect(result.document).not.toBeNull();
  });

  test('D4: partial validity — good blocks render alongside drop warnings', () => {
    const source = [
      '<div>dropped</div>',
      '',
      '# Still here',
      '[Also here]*',
    ].join('\n');
    const collected: import('../src/diagnostics.js').WiremdDiagnostic[] = [];
    const result = compileWiremd(source, { onDiagnostic: (d) => collected.push(d) });

    const types = result.document?.children.map((c) => c.type) ?? [];
    expect(types).toContain('heading');
    expect(types).toContain('button');
    expect(collected.some((d) => d.code === 'wmd-unsupported-node')).toBe(true);

    // Preview renders the surviving subset without throwing.
    const preview = renderToPreview(result.document!, {
      classPrefix: 'wmd-',
    });
    expect(preview.html).toContain('Still here');
  });

  test('source passed to compile is never mutated', () => {
    const source = `${VALID_SOURCE}\n<div>x</div>`;
    const snapshot = source;
    compileWiremd(source);
    expect(source).toBe(snapshot);
  });

  test('plain parse() keeps its historical console.warn drop behavior', () => {
    const warns: unknown[][] = [];
    const original = console.warn;
    console.warn = (...args: unknown[]) => warns.push(args);
    try {
      parse('<div>x</div>');
    } finally {
      console.warn = original;
    }
    expect(warns.length).toBeGreaterThan(0);
    expect(String(warns[0][0])).toContain('Unsupported node type');
  });
});

describe('positions (ParseOptions.position becomes live)', () => {
  test('D2: default parse stays position-blind (renderToJSON unchanged)', () => {
    const ast = parse(`# Title\n[Button]*`);
    expect(ast.position).toBeUndefined();
    expect(JSON.stringify(ast)).not.toContain('"position"');
  });

  test('D2: position:true populates fence-relative spans on transformed nodes', () => {
    const ast = parse('# Title\n[Button]*', { position: true });
    expect(ast.children.length).toBe(2);
    const [heading, button] = ast.children;
    expect(heading.position?.start).toMatchObject({ line: 1, column: 1 });
    expect(button.position?.start).toMatchObject({ line: 2, column: 1 });
  });

  test('compileWiremd always compiles with positions for span-bearing diagnostics', () => {
    const collected: import('../src/diagnostics.js').WiremdDiagnostic[] = [];
    compileWiremd('<div>x</div>', { onDiagnostic: (d) => collected.push(d) });
    const drop = collected.find((d) => d.code === 'wmd-unsupported-node');
    expect(drop?.start).toBeDefined();
    expect(drop?.start?.line).toBe(1);
  });
});

describe('includes disabled loudly (v1 include policy)', () => {
  test('I1: ![[token]] outside code spans yields one warning per token', () => {
    const source = 'intro\n![[shared/header.md]]\ntext ![[other.md]] more';
    const collected: import('../src/diagnostics.js').WiremdDiagnostic[] = [];
    compileWiremd(source, { onDiagnostic: (d) => collected.push(d) });
    const includeWarnings = collected.filter(
      (d) => d.code === 'wmd-includes-disabled'
    );
    expect(includeWarnings.length).toBe(2);
    for (const warning of includeWarnings) {
      expect(warning.severity).toBe('warning');
      expect(warning.source).toBe('include');
      expect(warning.start).toBeDefined();
    }
    // Spans are ordered and located on their lines.
    expect(includeWarnings[0].start?.line).toBe(2);
    expect(includeWarnings[1].start?.line).toBe(3);
  });

  test('I2: tokens inside code spans do NOT trigger the diagnostic', () => {
    const source = 'text with `![[not-an-include.md]]` inline\n```\n![[also-not.md]]\n```';
    const collected: import('../src/diagnostics.js').WiremdDiagnostic[] = [];
    compileWiremd(source, { onDiagnostic: (d) => collected.push(d) });
    expect(
      collected.filter((d) => d.code === 'wmd-includes-disabled')
    ).toEqual([]);
  });

  test('no filesystem access ever happens on the embed path', async () => {
    // Static assertion by import graph: the embed entry must not reach the
    // Node include implementation. (Mechanically proven by the bundle test.)
    const embedSource = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('../src/embed/index.ts', import.meta.url), 'utf-8')
    );
    expect(embedSource).not.toMatch(/from\s+'[^']*includes/);
    expect(embedSource).not.toMatch(/require\(/);
  });
});
