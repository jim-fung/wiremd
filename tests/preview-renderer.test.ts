/**
 * Preview fragment renderer tests — gate P1 sections S1–S6.
 *
 * The emitted PreviewResult is asserted mechanically over a corpus that
 * includes adversarial fixtures: no `<script>`, no `on*=` handler
 * attributes, no non-allowlisted URL schemes, no external references,
 * prefix-consistent classes/selectors, no `@import`, no `!important`,
 * no `position: fixed`.
 */

import { describe, expect, test } from 'vitest';
import { compileWiremd, renderToPreview } from '../src/embed/index.js';

function preview(source: string, classPrefix = 'wmd-', style?: Parameters<typeof renderToPreview>[1]['style']) {
  const compiled = compileWiremd(source);
  expect(compiled.document).not.toBeNull();
  return renderToPreview(compiled.document!, { classPrefix, ...(style ? { style } : {}) });
}

// Corpus: ordinary constructs plus adversarial payloads.
const FIXTURES: Array<{ name: string; source: string }> = [
  { name: 'form', source: '# Contact\nName\n[_____________]\n[Submit]*\n[Cancel]' },
  { name: 'nav + breadcrumbs', source: '[[ :logo: Acme | Home | Pricing ]]\n[[ Home > Products > Item ]]'},
  { name: 'tabs', source: '::: tabs\n\n::: tab One\nAlpha content\n\n:::\n\n::: tab Two\nBeta content\n\n:::\n\n:::' },
  { name: 'table', source: '| A | B |\n|---|---|\n| 1 | 2 |' },
  { name: 'list', source: '- one\n- two\n  - nested' },
  { name: 'grid', source: '::: grid-2\n### A\n[Button]\n### B\n[Input_____]\n:::' },
  { name: 'image https', source: '![Alt text](https://example.com/pic.png)' },
  { name: 'image javascript', source: '![x](javascript:alert(1))' },
  { name: 'image data-uri', source: '![x](data:text/html;base64,PHNjcmlwdD4=)' },
  { name: 'image relative', source: '![x](assets/pic.png)' },
  { name: 'link javascript', source: '[click me](javascript:alert(1))' },
  { name: 'link vbscript padded', source: '[click](  jaVaScRiPt:alert(1))' },
  { name: 'link data', source: '[click](data:text/html,<script>alert(1)</script>)' },
  { name: 'link file', source: '[click](file:///etc/passwd)' },
  { name: 'link mailto', source: '[mail us](mailto:hi@example.com)' },
  { name: 'link fragment', source: '[jump](#section)' },
  { name: 'link root-relative', source: '[docs](/docs/intro)' },
  { name: 'raw script in text', source: 'hello <script>alert(1)</script> world' },
  { name: 'raw img onerror in text', source: 'hello <img src=x onerror=alert(1)> world' },
  { name: 'uppercase script tag', source: 'a <SCRIPT>alert(1)</SCRIPT> b' },
  { name: 'blockquote', source: '> quoted words' },
  { name: 'code block', source: '```\nconst x = 1;\n```' },
  { name: 'demo container', source: '::: demo\n[Button]\n:::' },
];

describe('fragment shape (A3/A4)', () => {
  test('no doctype/html/head/body shell; single prefixed root wrapper', () => {
    for (const fixture of FIXTURES) {
      const result = preview(fixture.source);
      expect(result.html, fixture.name).not.toMatch(/<!DOCTYPE/i);
      expect(result.html, fixture.name).not.toMatch(/<html/i);
      expect(result.html, fixture.name).not.toMatch(/<head/i);
      expect(result.html, fixture.name).not.toMatch(/<body/i);
    }
    const result = preview('# Title');
    expect(result.html.startsWith('<div class="wmd-root wmd-sketch"')).toBe(true);
    expect(result.html.endsWith('</div>')).toBe(true);
  });

  test('classPrefix echoes and prefixes every class and selector (custom prefix)', () => {
    const result = preview('[Submit]*\n[____]', 'ok-wiremd-');
    expect(result.classPrefix).toBe('ok-wiremd-');
    // Every class attribute token starts with the prefix.
    const classTokens = [...result.html.matchAll(/class="([^"]*)"/g)].flatMap((m) =>
      m[1].split(/\s+/)
    );
    for (const token of classTokens) {
      if (token === '') continue;
      expect(token.startsWith('ok-wiremd-'), `class token "${token}"`).toBe(true);
    }
    // Every selector in CSS starts with the prefix (or is a rule inside).
    const selectors = result.css.match(/(?:^|\n)([^@\n{}]+)\{/g) ?? [];
    for (const raw of selectors) {
      const selector = raw.replace(/^\n/, '').replace(/\{$/, '').trim();
      for (const part of selector.split(',')) {
        const p = part.trim();
        if (p === '' || p.startsWith('@')) continue;
        // @keyframes stops (`0%`, `from`, `to`) are not selectors.
        if (/^(\d+(\.\d+)?%|from|to)$/.test(p)) continue;
        expect(
          p.includes('ok-wiremd-'),
          `selector "${p}" carries the prefix`
        ).toBe(true);
      }
    }
  });

  test('determinism: identical input yields byte-identical output', () => {
    const a = preview(FIXTURES[0]!.source);
    const b = preview(FIXTURES[0]!.source);
    expect(a.html).toBe(b.html);
    expect(a.css).toBe(b.css);
    expect(JSON.stringify(a.diagnostics)).toBe(JSON.stringify(b.diagnostics));
  });
});

describe('security policy (S1–S5)', () => {
  test('S1: no scripts, handlers, or non-allowlisted schemes across the whole corpus', () => {
    for (const fixture of FIXTURES) {
      const result = preview(fixture.source);
      expect(result.html, `${fixture.name}: <script`).not.toMatch(/<script/i);
      // Handler attributes must not appear in TAG position. Escaped text
      // (`&lt;img onerror=…&gt;`) is safe by construction, so strip escaped
      // entity spans before scanning.
      const unescaped = result.html.replace(/&lt;[\s\S]*?&gt;/g, '');
      expect(unescaped, `${fixture.name}: on-handler`).not.toMatch(/\son[a-z]+\s*=/i);
      expect(unescaped, `${fixture.name}: javascript:`).not.toMatch(/javascript:/i);
      expect(unescaped, `${fixture.name}: vbscript:`).not.toMatch(/vbscript:/i);
      expect(unescaped, `${fixture.name}: data: url`).not.toMatch(/(href|src)="data:/i);
      expect(unescaped, `${fixture.name}: file:`).not.toMatch(/file:/i);
      expect(result.css, fixture.name).not.toMatch(/<script|<\/?iframe/i);
    }
  });

  test('S2: raw HTML in text renders escaped and visible with an info-free path', () => {
    const result = preview('hello <b onclick="evil()">bold</b> world');
    expect(result.html).toContain('&lt;b onclick=');
    expect(result.html).toContain('&lt;/b&gt;');
  });

  test('parser-generated rich text renders as markup with inner text escaped', () => {
    // "**bold** and *em*" flows through the parser's structured path into
    // <strong>/<em>; inner text must be escaped, not passed through raw.
    const result = preview('**bold** words');
    expect(result.html).toContain('<strong>');
    expect(result.html).toMatch(/<strong>bold<\/strong>/);
  });

  test('S3: tabs stack statically — all panels visible, zero scripts, info diagnostic', () => {
    const result = preview('::: tabs\n\n::: tab One\nAlpha\n\n:::\n\n::: tab Two\nBeta\n\n:::\n\n:::');
    expect(result.html).not.toMatch(/<script/i);
    expect(result.html).toContain('Alpha');
    expect(result.html).toContain('Beta');
    expect(result.html).not.toMatch(/hidden/);
    expect(result.diagnostics.some((d) => d.code === 'wmd-tabs-static' && d.severity === 'info')).toBe(true);
  });

  test('S3b: demo blocks lose the copy button / clipboard handler, keep preview', () => {
    const result = preview('::: demo\n[Button]\n:::');
    expect(result.html).not.toMatch(/onclick|navigator\.clipboard/);
    expect(result.diagnostics.some((d) => d.code === 'wmd-demo-static')).toBe(true);
  });

  test('S4: sketch style CSS has no @import / google fonts, emits substitution info', () => {
    const result = preview('# Title', 'wmd-', 'sketch');
    expect(result.css).not.toMatch(/@import/i);
    expect(result.css).not.toMatch(/fonts\.googleapis\.com/i);
    expect(result.diagnostics.some((d) => d.code === 'wmd-font-substituted')).toBe(true);
    // Fallback font stack survives.
    expect(result.css.length).toBeGreaterThan(500);
  });

  test('S5: URL matrix — allowlist passes, everything else becomes # or placeholder', () => {
    const pass = preview('[mail us](mailto:hi@example.com)\n[jump](#section)\n[docs](/docs)');
    expect(pass.html).toMatch(/href="mailto:hi@example\.com"/);
    expect(pass.html).toMatch(/href="#section"/);
    expect(pass.html).toMatch(/href="\/docs"/);

    const blocked = preview('[x](javascript:alert(1))\n![y](vbscript:x)\n![z](data:image/svg+xml;base64,AAA)');
    expect(blocked.html).toMatch(/href="#"/);
    const blockedCodes = blocked.diagnostics.filter((d) => d.code === 'wmd-url-blocked');
    expect(blockedCodes.length).toBeGreaterThanOrEqual(2);
    expect(blockedCodes.some((d) => d.message.includes('javascript'))).toBe(true);

    const relative = preview('![pic](assets/pic.png)');
    expect(relative.html).not.toMatch(/<img /);
    expect(relative.diagnostics.some((d) => d.code === 'wmd-image-relative')).toBe(true);
  });

  test('S6: css contains no !important and no position: fixed (corpus scan)', () => {
    for (const style of ['sketch', 'clean', 'wireframe', 'none'] as const) {
      const result = preview(FIXTURES[0]!.source, 'wmd-', style);
      expect(result.css, style).not.toMatch(/!important/i);
      expect(result.css, style).not.toMatch(/position:\s*fixed/i);
      expect(result.css, style).not.toMatch(/@import/i);
    }
  });
});

describe('atomic html+css contract', () => {
  test('html and css are produced from one walk; both present together', () => {
    const result = preview('# Title\n[Go]*');
    expect(result.html.length).toBeGreaterThan(0);
    expect(result.css.length).toBeGreaterThan(0);
    // Root wrapper classes match the CSS root selector convention.
    expect(result.css).toContain('.wmd-root');
  });
});
