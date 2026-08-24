# Phase 1: coss Theme & Style Deprecation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hand-authored `coss` visual style to wiremd, make it the default everywhere, and deprecate the seven existing styles with warnings — Phase 1 of the spec at `docs/superpowers/specs/2026-08-24-coss-style-design.md`.

**Architecture:** A new `getCossStyle(prefix)` function in `src/renderer/styles.ts` following the exact precedent of `getCleanStyle()`/`getMaterialStyle()`. The canonical style union (`WIREMD_STYLES` / `WiremdStyle`) moves to `src/types.ts` (currently defined only in `src/embed/index.ts`) so all option types reference one source. Defaults flip from `'sketch'` to `'coss'` in CLI, programmatic renderer, and preview renderer; the CLI warns when a deprecated style is explicitly selected.

**Tech Stack:** TypeScript, vitest (`bun run test`), bun-based repo. No new runtime dependencies.

## Global Constraints

- Package manager is **bun**: run tests with `bun run test`, builds with `bun run build`.
- **No new runtime dependencies.** The coss theme is hand-written CSS strings; no Tailwind compilation.
- **Coss CSS must not use `@import`** (no external font fetches) — preview pipeline strips/substitutes them (see `tests/preview-renderer.test.ts:145` S4 pattern). Use a local Inter stack: `font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;`.
- All seven legacy styles (`sketch clean wireframe none tailwind material brutal`) **must remain functional** this release — removal happens next major.
- Deprecation message, verbatim: `` Style '<name>' is deprecated and will be removed in the next major release — use --style coss `` (emitted once per CLI invocation).
- Default style becomes `'coss'` in: CLI options, `renderToHTML` defaults, `renderPreview` defaults, `getStyleCSS` fallback branch.
- Size budget stays within the existing chunk guard (theme adds ~10 KB CSS).
- Legacy behavior contract: tests that pass `style: 'sketch'` explicitly must keep passing unchanged.

---
### Task 1: Canonical `WiremdStyle` union in types.ts, add `'coss'`

**Files:**
- Modify: `src/types.ts:164`
- Modify: `src/embed/index.ts:41-49`
- Test: `tests/embed.test.ts` (existing WIREMD_STYLES assertions)

**Interfaces:**
- Consumes: nothing new.
- Produces: `export const WIREMD_STYLES = ['coss', 'sketch', ...] as const;` and `export type WiremdStyle = (typeof WIREMD_STYLES)[number];` exported from `src/types.ts`; `RenderOptions.style?: WiremdStyle`. `src/embed/index.ts` re-exports both (same names as today) for backward compatibility.

- [ ] **Step 1: Write the failing test**

Append to `tests/embed.test.ts`:

```typescript
describe('WIREMD_STYLES registry', () => {
  it('includes coss first and keeps all legacy styles', () => {
    expect(WIREMD_STYLES[0]).toBe('coss');
    expect(WIREMD_STYLES).toContain('sketch');
    expect(WIREMD_STYLES).toContain('clean');
    expect(WIREMD_STYLES).toContain('wireframe');
    expect(WIREMD_STYLES).toContain('none');
    expect(WIREMD_STYLES).toContain('tailwind');
    expect(WIREMD_STYLES).toContain('material');
    expect(WIREMD_STYLES).toContain('brutal');
  });
});
```

Adjust the file's existing import of `WIREMD_STYLES` if it currently comes from `../src/embed/index.js` — keep importing from the same module (re-export keeps paths stable).

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- tests/embed.test.ts`
Expected: FAIL — `expected 'sketch' to be 'coss'`

- [ ] **Step 3: Implement**

In `src/types.ts`, directly above `RenderOptions` (line ~160), add:

```typescript
/** Ordered style identifiers accepted across renderers, CLI, and embed API. */
export const WIREMD_STYLES = [
  'coss',
  'sketch',
  'clean',
  'wireframe',
  'none',
  'tailwind',
  'material',
  'brutal',
] as const;

export type WiremdStyle = (typeof WIREMD_STYLES)[number];
```

Change `RenderOptions.style`:

```typescript
  style?: WiremdStyle;
```

In `src/embed/index.ts`, replace the local `WIREMD_STYLES` definition (lines ~41-49) and type with a re-export:

```typescript
import { WIREMD_STYLES, type WiremdStyle } from '../types.js';

/** @deprecated use the canonical export from 'wiremd' root — kept for back-compat. */
export { WIREMD_STYLES };
export type { WiremdStyle };
```

(If `embed/index.ts` already imports from `../types.js`, merge into that import statement.)

Then verify the package root (`src/index.ts`) exports both symbols — spec requires them from the public API. If not already re-exported there, add:

```typescript
export { WIREMD_STYLES, type WiremdStyle } from './types.js';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test -- tests/embed.test.ts tests/type-guards.test.ts`
Expected: PASS (all)

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/embed/index.ts tests/embed.test.ts
git commit -m "feat(styles): canonical WiremdStyle union in types, add coss"
```

---
### Task 2: `getCossStyle()` theme function

**Files:**
- Modify: `src/renderer/styles.ts` (add function after `getBrutalStyle`, register in `getStyleCSS` switch at line ~55)
- Test: `tests/renderer.test.ts` (new describe block)

**Interfaces:**
- Consumes: `prefix: string` parameter convention shared by all theme functions.
- Produces: `function getCossStyle(prefix: string): string` (module-private, called from `getStyleCSS`); switch case `'coss'`.

- [ ] **Step 1: Write the failing test**

Add inside `tests/renderer.test.ts` top-level describe:

```typescript
describe('coss style', () => {
  it('applies wmd-coss class and Inter font stack', () => {
    const html = renderToHTML(parse('# Hello'), { style: 'coss' });
    expect(html).toContain('wmd-coss');
    expect(html).toContain("'Inter'");
  });

  it('uses no @import (preview-safe)', () => {
    const css = getStyleCSS('coss', 'wmd-');
    expect(css).not.toContain('@import');
  });

  it('styles buttons, inputs, cards, badges, nav, and tables', () => {
    const css = getStyleCSS('coss', 'wmd-');
    for (const sel of [
      '.wmd-button', '.wmd-input', '.wmd-container-card', '.wmd-badge',
      '.wmd-nav', '.wmd-table', '.wmd-separator', '.wmd-breadcrumbs',
      '.wmd-checkbox', '.wmd-select', '.wmd-code-block',
    ]) {
      expect(css).toContain(sel);
    }
  });
});
```

Check the test file's existing imports; `getStyleCSS` may need adding to the import from `../src/renderer/styles.js` (or via the package index if that's how the file imports).

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- tests/renderer.test.ts`
Expected: FAIL — `getStyleCSS('coss', ...)` falls back to sketch (contains `@import`), `wmd-coss` absent.

- [ ] **Step 3: Implement**

In `src/renderer/styles.ts`, register the case in `getStyleCSS`'s switch (line ~55):

```typescript
    case 'coss':      themeCSS = getCossStyle(prefix); break;
```

and change the fallback line:

```typescript
    default:          themeCSS = getCossStyle(prefix);
```

Add the theme function after `getBrutalStyle` (end of file):

```typescript
/**
 * Coss Style - Cal.com design-system look (Inter, neutral surfaces,
 * black primary actions, subtle rings). Light mode only.
 */
function getCossStyle(prefix: string): string {
  return `
/* wiremd Coss Style - Cal.com-inspired neutral design system */
* {
  box-sizing: border-box;
}

body.${prefix}root {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #fafafa;
  color: #111111;
  padding: 40px;
  margin: 0;
  line-height: 1.6;
}

.${prefix}h1, .${prefix}h2, .${prefix}h3, .${prefix}h4, .${prefix}h5, .${prefix}h6 {
  font-weight: 600;
  margin: 1.5em 0 0.75em;
  color: #0a0a0a;
  letter-spacing: -0.02em;
}
.${prefix}h1 { font-size: 2.25em; }
.${prefix}h2 { font-size: 1.75em; }
.${prefix}h3 { font-size: 1.4em; }
.${prefix}h4 { font-size: 1.2em; }
.${prefix}h5 { font-size: 1.05em; }
.${prefix}h6 { font-size: 1em; }

.${prefix}paragraph { margin: 0.75em 0; color: #3f3f46; }

.${prefix}link, .${prefix}text a { color: #0a0a0a; text-decoration: underline; text-underline-offset: 2px; }

/* Buttons */
.${prefix}button {
  display: inline-block;
  padding: 8px 16px;
  margin: 4px;
  background: #ffffff;
  border: 1px solid #d4d4d8;
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  color: #0a0a0a;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
}
.${prefix}button:hover { background: #f4f4f5; border-color: #a1a1aa; }
.${prefix}button:focus-visible { outline: 2px solid #0a0a0a; outline-offset: 2px; }
.${prefix}state-disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }

.${prefix}button-primary, .${prefix}button.${prefix}primary {
  background: #0a0a0a; color: #ffffff; border-color: #0a0a0a;
}
.${prefix}button-primary:hover, .${prefix}button.${prefix}primary:hover {
  background: #27272a; border-color: #27272a;
}
.${prefix}button-secondary, .${prefix}button.${prefix}secondary {
  background: #ffffff; color: #0a0a0a; border-color: #d4d4d8;
}
.${prefix}button-danger, .${prefix}button.${prefix}danger {
  background: #dc2626; color: #ffffff; border-color: #dc2626;
}
.${prefix}button-danger:hover, .${prefix}button.${prefix}danger:hover {
  background: #b91c1c; border-color: #b91c1c;
}

/* Inputs */
.${prefix}input, .${prefix}textarea, .${prefix}select {
  display: block;
  width: 100%;
  padding: 8px 12px;
  margin: 4px 0;
  background: #ffffff;
  border: 1px solid #d4d4d8;
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;
  color: #111111;
}
.${prefix}input:focus, .${prefix}textarea:focus, .${prefix}select:focus {
  outline: 2px solid #0a0a0a;
  outline-offset: 1px;
  border-color: #0a0a0a;
}
.${prefix}input::placeholder, .${prefix}textarea::placeholder { color: #a1a1aa; }
.${prefix}checkbox, .${prefix}radio { accent-color: #0a0a0a; width: 16px; height: 16px; margin: 4px; }
.${prefix}radio-group { display: flex; flex-direction: column; gap: 4px; margin: 4px 0; }
.${prefix}radio-group-inline { display: flex; flex-direction: row; gap: 16px; align-items: center; }

/* Badge */
.${prefix}badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  background: #f4f4f5;
  color: #3f3f46;
  border: 1px solid #e4e4e7;
  margin: 2px;
}
.${prefix}badge-primary { background: #0a0a0a; color: #ffffff; border-color: #0a0a0a; }
.${prefix}badge-success { background: #dcfce7; color: #14532d; border-color: #bbf7d0; }
.${prefix}badge-warning { background: #fef9c3; color: #713f12; border-color: #fef08a; }
.${prefix}badge-error { background: #fee2e2; color: #7f1d1d; border-color: #fecaca; }

/* Cards / containers */
.${prefix}container-card, .${prefix}grid-item-card {
  background: #ffffff;
  border: 1px solid #e4e4e7;
  border-radius: 12px;
  padding: 20px;
  margin: 12px 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.${prefix}container-modal {
  background: #ffffff;
  border: 1px solid #e4e4e7;
  border-radius: 12px;
  padding: 24px;
  margin: 24px auto;
  max-width: 480px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
}
.${prefix}container-hero {
  background: #ffffff;
  border: 1px solid #e4e4e7;
  border-radius: 12px;
  padding: 48px 32px;
  text-align: center;
  margin: 12px 0;
}
.${prefix}container-empty-state, .${prefix}container-error-state, .${prefix}container-loading-state {
  background: #ffffff;
  border: 1px dashed #d4d4d8;
  border-radius: 12px;
  padding: 40px 24px;
  text-align: center;
  color: #71717a;
  margin: 12px 0;
}
.${prefix}container-error-state { border-color: #fecaca; color: #b91c1c; }
.${prefix}container-layout { display: flex; flex-direction: column; gap: 8px; }

/* Layout: sidebar/grid */
.${prefix}layout-sidebar, .${prefix}container-sidebar {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
}
.${prefix}sidebar-main {
  background: #ffffff;
  border-right: 1px solid #e4e4e7;
  padding: 16px;
}
.${prefix}layout-main { min-width: 0; }
.${prefix}grid { display: grid; gap: 12px; margin: 12px 0; }
.${prefix}grid-item { min-width: 0; }

/* Navigation */
.${prefix}nav {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border-bottom: 1px solid #e4e4e7;
  padding: 12px 20px;
}
.${prefix}brand { font-weight: 600; color: #0a0a0a; margin-right: auto; }
.${prefix}nav-content { display: flex; align-items: center; gap: 8px; }
.${prefix}nav-item {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #3f3f46;
  cursor: pointer;
}
.${prefix}nav-item:hover { background: #f4f4f5; color: #0a0a0a; }
.${prefix}nav-item.${prefix}active { background: #f4f4f5; color: #0a0a0a; font-weight: 600; }

/* Breadcrumbs */
.${prefix}breadcrumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 14px;
  color: #71717a;
  margin: 8px 0;
}
.${prefix}breadcrumb-item { color: #71717a; }
.${prefix}breadcrumb-current { color: #0a0a0a; font-weight: 500; }
.${prefix}breadcrumb-sep { color: #d4d4d8; }

/* Separator */
.${prefix}separator { border: none; border-top: 1px solid #e4e4e7; margin: 24px 0; }

/* Blockquote */
.${prefix}blockquote {
  border-left: 3px solid #0a0a0a;
  background: #f4f4f5;
  border-radius: 0 8px 8px 0;
  padding: 12px 16px;
  margin: 12px 0;
  color: #3f3f46;
}

/* Code */
.${prefix}code-inline {
  background: #f4f4f5;
  border: 1px solid #e4e4e7;
  border-radius: 6px;
  padding: 1px 6px;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 0.85em;
}
.${prefix}code-block {
  background: #18181b;
  color: #fafafa;
  border-radius: 12px;
  padding: 16px;
  overflow-x: auto;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 0.85em;
  line-height: 1.6;
}

/* Lists */
.${prefix}list { padding-left: 24px; margin: 8px 0; color: #3f3f46; }
.${prefix}list-item { margin: 4px 0; }

/* Tables */
.${prefix}table, table.${prefix}table {
  width: 100%;
  border-collapse: collapse;
  background: #ffffff;
  border: 1px solid #e4e4e7;
  border-radius: 8px;
  overflow: hidden;
  margin: 12px 0;
  font-size: 14px;
}
.${prefix}table th {
  background: #f4f4f5;
  text-align: left;
  font-weight: 600;
  color: #0a0a0a;
}
.${prefix}table th, .${prefix}table td {
  padding: 10px 14px;
  border-bottom: 1px solid #e4e4e7;
}
.${prefix}table tr:last-child td { border-bottom: none; }

/* Icon */
.${prefix}icon { display: inline-block; vertical-align: middle; width: 1em; height: 1em; fill: currentColor; }
`;
}
```

Note: `getNoneStyle`/shared rules handle tabs/demo structure; do not duplicate them here.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test -- tests/renderer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/styles.ts tests/renderer.test.ts
git commit -m "feat(styles): coss theme - Cal.com-inspired neutral design"
```

---
### Task 3: Flip defaults to `'coss'` + CLI help rewrite

**Files:**
- Modify: `src/cli/index.ts:119` (default), `src/cli/index.ts:48` and `src/cli/index.ts:58-84` (help text)
- Modify: `src/renderer/index.ts:29,37` (doc comment + default)
- Modify: `src/renderer/preview-renderer.ts:68`
- Test: `tests/cli-unit.test.ts`, `tests/preview-renderer.test.ts`, `tests/renderer.test.ts`

**Interfaces:**
- Consumes: Task 2's registered `'coss'` case.
- Produces: default style resolution `'coss'` in all three entry points.

- [ ] **Step 1: Update the default-asserting tests first (they encode the new contract)**

`tests/preview-renderer.test.ts:57` — change:

```typescript
    expect(result.html.startsWith('<div class="wmd-root wmd-coss"')).toBe(true);
```

`tests/preview-renderer.test.ts:172` loop — leave as-is (explicit legacy styles still valid).

`tests/cli-unit.test.ts:257` area — find the assertion asserting the default style log line and change the expectation to `'coss'` (exact line verified at execution time; it asserts output contains the resolved style name).

Add to `tests/renderer.test.ts` top-level describe:

```typescript
  it('defaults to coss style when no style given', () => {
    const html = renderToHTML(parse('# Hello'));
    expect(html).toContain('wmd-coss');
  });
```

- [ ] **Step 2: Run to verify failures**

Run: `bun run test -- tests/preview-renderer.test.ts tests/renderer.test.ts tests/cli-unit.test.ts`
Expected: FAIL on the changed/new assertions only.

- [ ] **Step 3: Implement defaults**

`src/cli/index.ts:119`: `style: 'coss',`
`src/renderer/index.ts:37`: `style = 'coss',` and update the doc comment at line 29 to `{ style: 'coss' }`.
`src/renderer/preview-renderer.ts:68`: `const style = options.style ?? 'coss';`

CLI help text — replace line 48:

```
  -s, --style <style>        Visual style: coss (default), or deprecated: sketch, clean, wireframe, none, tailwind, material, brutal
```

Replace lines 58-65 examples block:

```
EXAMPLES:
  # Generate HTML with the default coss style
  wiremd wireframe.md

  # Output to specific file
  wiremd wireframe.md -o output.html

  # Use a deprecated legacy style (warns; removed next major)
  wiremd wireframe.md --style sketch
```

Replace the STYLES block (lines ~78-84):

```
STYLES:
  coss       - Cal.com-inspired neutral design system (default)
  Deprecated (removed next major):
  sketch     - Balsamiq-inspired hand-drawn look
  clean      - Modern minimal design
  wireframe  - Traditional grayscale with hatching
  none       - Unstyled semantic HTML
  tailwind   - Modern utility-first design with purple accents
  material   - Google Material Design with elevation system
  brutal     - Neo-brutalism with bold colors and thick borders
```

- [ ] **Step 4: Run full unit suite and fix any remaining default-dependent failures**

Run: `bun run test`
Expected: PASS except known pre-existing DOM-suite failures (see memory: ~504 pre-existing dom failures are NOT in unit suite; unit suite should go fully green). Any other failure names a spot where `'sketch'` was assumed — update that assertion to `'coss'` only when it asserts *default* behavior, never when it passes an explicit style.

- [ ] **Step 5: Commit**

```bash
git add -A src/ tests/
git commit -m "feat!: default style is now coss across CLI and renderers"
```

---
### Task 4: CLI deprecation warning for legacy styles

**Files:**
- Modify: `src/cli/index.ts` (parse loop ~line 157-163, warn before render)
- Test: `tests/cli-unit.test.ts`

**Interfaces:**
- Consumes: `WIREMD_STYLES` from `src/types.js` (Task 1) for validation list.
- Produces: module-level helper `warnIfDeprecatedStyle(style: string, logger: {style(msg:string):void}): void` exported for tests; emits exactly one line per invocation: `` Style '<name>' is deprecated and will be removed in the next major release — use --style coss ``.

- [ ] **Step 1: Write the failing test**

```typescript
import { warnIfDeprecatedStyle } from '../src/cli/index.js';

describe('deprecated style warning', () => {
  const messages: string[] = [];
  const logger = { style: (m: string) => messages.push(m) };

  it('warns for legacy styles', () => {
    warnIfDeprecatedStyle('sketch', logger);
    expect(messages[0]).toBe(
      "Style 'sketch' is deprecated and will be removed in the next major release — use --style coss",
    );
  });

  it('stays silent for coss', () => {
    messages.length = 0;
    warnIfDeprecatedStyle('coss', logger);
    expect(messages).toHaveLength(0);
  });
});
```

(Adapt import path to how existing cli-unit tests import.)

- [ ] **Step 2: Run to verify failure**

Run: `bun run test -- tests/cli-unit.test.ts`
Expected: FAIL — `warnIfDeprecatedStyle` not exported.

- [ ] **Step 3: Implement**

In `src/cli/index.ts`, export near the top:

```typescript
const DEPRECATED_STYLES: readonly string[] = ['sketch', 'clean', 'wireframe', 'none', 'tailwind', 'material', 'brutal'];

export function warnIfDeprecatedStyle(style: string, log: { style(msg: string): void }): void {
  if ((DEPRECATED_STYLES as readonly string[]).includes(style)) {
    log.style(`Style '${style}' is deprecated and will be removed in the next major release — use --style coss`);
  }
}
```

Replace the validation list at line ~159 with `WIREMD_STYLES` (imported from `../types.js`):

```typescript
        if (!(WIREMD_STYLES as readonly string[]).includes(style)) {
          console.error(`Error: Invalid style "${style}". Must be one of: ${WIREMD_STYLES.join(', ')}.`);
```

In `run()` (or wherever options are parsed then acted on, after parsing succeeds), call once:

```typescript
  warnIfDeprecatedStyle(options.style, logger);
```

Because the flag parser only overwrites `options.style` when `--style` is passed, and the default is now `'coss'`, an explicit legacy selection is exactly `options.style ∈ DEPRECATED_STYLES` — no separate tracking boolean needed.

- [ ] **Step 4: Run tests to verify pass**

Run: `bun run test -- tests/cli-unit.test.ts tests/error-handling.test.ts`
Expected: PASS. If `error-handling.test.ts` asserts the old invalid-style message text, update it to the new `Must be one of:` wording.

- [ ] **Step 5: Commit**

```bash
git add src/cli/index.ts tests/cli-unit.test.ts tests/error-handling.test.ts
git commit -m "feat(cli): deprecation warning for legacy styles"
```

---
### Task 5: Editor + VS Code extension style lists gain coss

**Files:**
- Modify: `editor/src/main.ts:215`
- Modify: `editor/src/renderMarkup.ts:10`
- Modify: `vscode-extension/src/extension.ts:63`

**Interfaces:**
- Consumes: nothing (these are UI string lists mirroring WIREMD_STYLES).
- Produces: `'coss'` selectable and first in each picker; legacy entries remain.

- [ ] **Step 1: Make the edits**

`editor/src/renderMarkup.ts:10` — extend the union literal to include `'coss'` first:

```typescript
type Style = 'coss' | 'sketch' | 'clean' | 'wireframe' | 'none' | 'tailwind' | 'material' | 'brutal';
```

(match the file's actual declaration shape — read lines 1-20 first.)

`editor/src/main.ts:215` — prepend `'coss'` to the array literal.

`vscode-extension/src/extension.ts:63` — prepend `'coss'` to the array literal.

- [ ] **Step 2: Typecheck/build**

Run: `bun run build`
Expected: exits 0 (tsc covers editor/vscode via project references or their own builds — verify which config covers them; if separate, run their build scripts found in their package.json files).

- [ ] **Step 3: Commit**

```bash
git add editor/src/main.ts editor/src/renderMarkup.ts vscode-extension/src/extension.ts
git commit -m "feat(editor,vscode): offer coss style first in style pickers"
```

---
### Task 6: Documentation — README + styles catalog

**Files:**
- Modify: `README.md` (lines 44, 71, 85-89, 175-186)
- Modify: `docs/components/styles.md`

**Interfaces:** docs-only; no code consumed/produced.

- [ ] **Step 1: README updates**

Line 44 and 71: drop `--style sketch` from examples (coss is the default) — plain `wiremd contact.md`.
Lines 85-89: feature bullet becomes:
`- ✅ **8 visual styles** - coss (Cal.com-inspired, default), plus deprecated legacy: sketch, clean, wireframe, tailwind, material, brutal, none`
Lines 175-186 usage block:

````markdown
# Generate HTML with the default coss style
wiremd wireframe.md

# Deprecated legacy styles (warn; removed next major)
wiremd wireframe.md --style sketch      # Balsamiq-inspired
wiremd wireframe.md --style clean       # Modern minimal
wiremd wireframe.md --style material    # Material Design
````

- [ ] **Step 2: Rewrite `docs/components/styles.md` coss-first**

New content:

```markdown
# Styles

wiremd renders wireframes through visual styles. As of this release the default and
recommended style is **coss**, modeled on the [coss ui](https://coss.com/ui/docs)
design system: Inter typography, neutral surfaces, black primary actions, subtle
focus rings.

## coss (default)

::: demo

# Dashboard

## Revenue

$12,480 [+8.2%]*

[New Report] [Export]

:::

All component pages in this catalog render their examples in coss.

## Deprecated styles

The following styles still work but print a deprecation warning and will be
removed in the next major release:

| Style | Look |
| --- | --- |
| `sketch` | Balsamiq-inspired hand-drawn (former default) |
| `clean` | Modern minimal |
| `wireframe` | Grayscale with hatching |
| `none` | Unstyled semantic HTML |
| `tailwind` | Utility-first look, purple accents |
| `material` | Material Design elevation |
| `brutal` | Neo-brutalism |

Select one explicitly: `wiremd page.md --style sketch`.
```

- [ ] **Step 3: Commit**

```bash
git add README.md docs/components/styles.md
git commit -m "docs: coss-first style documentation, legacy styles marked deprecated"
```

---
### Task 7: Verification gate

**Files:** none modified (verification only).

- [ ] **Step 1: Full unit suite**

Run: `bun run test`
Expected: fully green (unit suite had no pre-existing failures).

- [ ] **Step 2: Build + size budget**

Run: `bun run build`
Expected: exits 0; chunk guard under budget.

- [ ] **Step 3: Manual smoke**

Run: `bun run dev -- examples/showcase.md` (or generate static HTML for any example) and open output — confirm coss rendering: Inter-ish neutral look, black primary buttons, no external font request in DevTools network tab.

- [ ] **Step 4: E2E smoke (optional, heavy)**

`bun run test:e2e` always launches Chrome and records video (memory gotcha). Only the editor spec references styles (`cypress/e2e/editor.cy.ts`) — if it asserts a default style name, update it to coss; otherwise defer full e2e baselines to Phase 3 per spec.

- [ ] **Step 5: Milestone record**

Save supermemory entry: Phase 1 complete, commit range, any deviations.
