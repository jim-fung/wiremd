# Phase 2: coss Codegen Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pure coss-flavored code generation for wiremd's currently rendered component vocabulary, expose it as HTML/JSX fragments, and integrate it into coss demo-fence code panes without changing legacy rendering.

**Architecture:** Codegen is independent from the existing output `format` option. `generateCode` accepts one node or an ordered node list and emits a standalone HTML or JSX **fragment** — never imports, never a module wrapper. For coss-styled demos the existing code pane is always rendered; when the demo lacks `{.show-source}` the pane's content is generated code, and with `{.show-source}` it is the existing escaped `demo.raw`. Legacy styles always show `demo.raw`. The dispatcher table and escaping helpers land first as stubs so emitter families can be implemented in parallel without touching shared files.

**Tech Stack:** TypeScript, Bun, Vitest, existing unified parser and HTML renderer. No new runtime dependencies.

## Global Constraints

- Use Bun commands (`bun run test`, `bun run build`).
- Add no runtime dependencies and no Tailwind compiler.
- Preserve existing `format` values (`html`, `json`, `react`, `tailwind`) everywhere; `codegen` is additive.
- `generateCode(input, { format?: 'html' | 'jsx' })` returns a fragment string; default `'html'`; it never emits `import` statements or module wrappers (module generation remains `renderToReact`'s job).
- **Demo pane default:** coss demos always render the existing `.wmd-demo-code` pane. Without `show-source` the pane contains `generateCode(demo.children, { format })` output (escaped once by the existing pane escaping); with `{.show-source}` the pane contains the existing escaped `demo.raw`. Legacy styles always show escaped `demo.raw`, regardless of `codegen`.
- `{.show-source}` is detected via `node.props.classes?.includes('show-source')` (class, not boolean prop).
- **Supported scope — exactly 34 discriminants:** button, input, textarea, select, checkbox, radio, radio-group, icon, badge, container, nav, nav-item, brand, grid, grid-item, row, heading, paragraph, text, image, link, list, list-item, table, table-header, table-row, table-cell, blockquote, code, separator, tabs, tab, breadcrumbs, demo. `demo` emits its children as an ordered fragment. `option` and `breadcrumb-item` are emitted internally by the `select`/`breadcrumbs` emitters only — direct use throws. Direct `form`, `accordion`, `accordion-item`, `alert`, `loading-state`, `empty-state`, `error-state` throw `Unsupported codegen node type: <type>` (Phase 3). Note `::: alert` parses into a `container` with `containerType: 'alert'`, which IS supported via the container emitter.
- Generated strings are deterministic, escaped for their target syntax, and safe for quoted attributes/JSX literals. `safeUrl` permits empty, `#fragment`, relative, `http:`, `https:`, `mailto:`, `tel:` (case-insensitive scheme, leading/trailing whitespace trimmed); all other schemes throw `Unsafe URL: <url>`.
- JSX rules (native elements only, no imports): `className` for classes; string attributes as double-quoted entity-escaped values (`&` -> `&amp;` first, then `"` -> `&quot;`, `<` -> `&lt;`, `>` -> `&gt;`; JSX string attributes have no backslash escape processing, so backslash-escaping like `\"` is never emitted); boolean attributes emitted bare when true and omitted when false/absent; self-closing tags for void elements; children emitted recursively; JSX text escapes `& < > { }`.
- `--codegen <html|jsx>` is accepted on every invocation but affects only HTML output (`--format html`) and only coss demo panes; `--format` stays authoritative for output type; `--format json --codegen jsx` produces identical JSON to today. Invalid values print `Error: Invalid codegen "<value>". Must be html or jsx.` and exit 1. Output extension logic unchanged.
- Keep bundle size within the existing chunk guard.

---

### Task 1: Codegen skeleton — types, escaping, dispatcher stubs, root export

**Files:**
- Create: `src/codegen/coss/types.ts`
- Create: `src/codegen/coss/escape.ts`
- Create: `src/codegen/coss/emitters/actions.ts`
- Create: `src/codegen/coss/emitters/forms.ts`
- Create: `src/codegen/coss/emitters/content.ts`
- Create: `src/codegen/coss/emitters/navigation.ts`
- Create: `src/codegen/coss/emitters/layout.ts`
- Create: `src/codegen/coss/index.ts`
- Modify: `src/index.ts`
- Test: `tests/coss-codegen.test.ts`

**Interfaces (produced here, consumed by all later tasks):**
- `export type CodegenFormat = 'html' | 'jsx'` and `export interface CodegenOptions { format?: CodegenFormat }` from `types.ts`.
- `export type CodegenInput = WiremdNode | readonly WiremdNode[]`.
- `export function generateCode(input: CodegenInput, options?: CodegenOptions): string` from `index.ts`.
- Each family module exports `emit<NodeFamily>(node: Extract<WiremdNode, { type: ... }>, format: CodegenFormat, recurse: (node: WiremdNode, format: CodegenFormat) => string): string` — Task 1 registers every supported discriminant to a stub that throws `Not implemented: <type>`; later tasks replace stubs inside their own module only (no `index.ts` edits in Tasks 2–4).
- Escape helpers (`escapeHtmlText`, `escapeHtmlAttr`, `escapeJsxText`, `escapeJsxAttr`, `safeUrl`) are module-private in `escape.ts`, re-exported only to emitter modules via a shared internal import.

- [ ] **Step 1: Write failing contract tests**

```ts
import { describe, expect, test } from 'vitest';
import { generateCode } from '../src/codegen/coss/index.js';
import type { WiremdNode } from '../src/types.js';

const SUPPORTED = [
  'button', 'input', 'textarea', 'select', 'checkbox', 'radio', 'radio-group', 'icon',
  'badge', 'container', 'nav', 'nav-item', 'brand', 'grid', 'grid-item', 'row',
  'heading', 'paragraph', 'text', 'image', 'link', 'list', 'list-item',
  'table', 'table-header', 'table-row', 'table-cell', 'blockquote', 'code', 'separator',
  'tabs', 'tab', 'breadcrumbs', 'demo',
] as const;

describe('generateCode contracts', () => {
  test('empty input yields empty string', () => {
    expect(generateCode([])).toBe('');
  });

  test('single node is normalized to a one-element fragment', () => {
    expect(generateCode({ type: 'separator', props: {} })).toBe('<hr class="h-px w-full bg-zinc-200" />');
  });

  test('array preserves sibling order and joins with newline', () => {
    const out = generateCode([
      { type: 'separator', props: {} },
      { type: 'separator', props: {} },
    ]);
    expect(out.split('\n')).toHaveLength(2);
  });

  test('every supported discriminant dispatches (stubs may throw Not implemented, never unknown)', () => {
    for (const type of SUPPORTED) {
      const node = { type, props: {} } as unknown as WiremdNode;
      try {
        generateCode(node);
      } catch (e) {
        expect((e as Error).message).toMatch(/^Not implemented|^Unsafe URL/);
      }
    }
  });

  test.each(['form', 'accordion', 'accordion-item', 'alert', 'loading-state', 'empty-state', 'error-state', 'option', 'breadcrumb-item'] as const)(
    'direct %s throws Unsupported codegen node type',
    (type) => {
      expect(() => generateCode({ type, props: {} } as unknown as WiremdNode)).toThrow(
        `Unsupported codegen node type: ${type}`,
      );
    },
  );

  test('output is deterministic across repeated calls', () => {
    const node: WiremdNode = { type: 'separator', props: {} };
    expect(generateCode(node)).toBe(generateCode(node));
  });

  test('unsafe URLs throw regardless of case and surrounding whitespace', () => {
    for (const href of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', '  javascript:x  ', 'jAvAsCrIpT&colon;']) {
      expect(() => generateCode({ type: 'link', href, content: 'x', props: {} })).toThrow(/Unsafe URL/);
    }
  });
});
```

- [ ] **Step 2: Run red**

Run: `bun run test -- tests/coss-codegen.test.ts`
Expected: FAIL — module `../src/codegen/coss/index.js` does not exist.

- [ ] **Step 3: Implement skeleton**

`escape.ts` implements the five helpers with the exact encodings from Global Constraints (HTML text `& < > " '`; HTML attr same set; JSX text `& < > { }`; JSX attr JSON-string with inner quotes escaped; `safeUrl` per allowlist, case-insensitive scheme check after trimming).

`index.ts` normalizes input, dispatches via a frozen table mapping all 34 discriminants to family emitters, throws `Unsupported codegen node type: <type>` for the nine excluded ones, and joins non-empty results with `\n`. Family modules in Task 1 contain only stubs: `throw new Error('Not implemented: <type>')`.

- [ ] **Step 4: Root export**

In `src/index.ts` add:

```ts
export { generateCode } from './codegen/coss/index.js';
export type { CodegenFormat, CodegenInput, CodegenOptions } from './codegen/coss/types.js';
```

(`export *` from types/renderer already exists; these are explicit because the codegen module is outside those barrels. Verify `tsc --noEmit` and that `CodegenOptions` is used by a test so no-unused checks pass.)

- [ ] **Step 5: Green + commit**

Run: `bun run test -- tests/coss-codegen.test.ts` — PASS; `bunx tsc --noEmit` — clean.

```bash
git add src/codegen/coss src/index.ts tests/coss-codegen.test.ts
git commit -m "feat(codegen): coss skeleton - contracts, escaping, dispatcher stubs"
```

---

### Task 2 (wave B, parallel): actions + forms emitters

**Files:**
- Modify: `src/codegen/coss/emitters/actions.ts` (button, badge, icon, checkbox)
- Modify: `src/codegen/coss/emitters/forms.ts` (input, textarea, select, radio, radio-group)
- Test: `tests/coss-codegen-actions-forms.test.ts`

**Interfaces:** consumes Task 1's `CodegenFormat`, escape helpers, and `recurse` callback; no edits to `index.ts` or other families' modules.

- [ ] **Step 1: Red fixtures (one HTML + one JSX per discriminant)**

Fixture nodes MUST satisfy the real AST shapes (`paragraph` requires `props`; `input` carries `inputType` inside `props`; select carries `options: { value, label, selected? }[]`). Exact-output example:

```ts
const primary: WiremdNode = { type: 'button', content: 'Save', props: { variant: 'primary' } };
expect(generateCode(primary)).toBe(
  '<button type="button" class="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-zinc-950 bg-zinc-950 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50">Save</button>',
);
expect(generateCode(primary, { format: 'jsx' })).toBe(
  '<button type="button" className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-zinc-950 bg-zinc-950 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50">Save</button>',
);
```

Cover: button variants primary/secondary/danger + href-link form + disabled state; badge variants; icon (name → inline SVG circle placeholder span with `aria-label`); checkbox with label; input with `props.inputType`, placeholder, required, disabled; textarea rows/value; select with options incl. selected + placeholder; radio-group with inline prop and radios (deterministic `name` from `props.name` or `radio-group` — never `Math.random`). JSX fixtures assert native elements only, no `import`, boolean-attr rules (e.g. `required` bare when true, absent when false).

- [ ] **Step 2: Run red** — `bun run test -- tests/coss-codegen-actions-forms.test.ts` → FAIL (`Not implemented`).

- [ ] **Step 3: Implement both modules** replacing their stubs; classes follow the coss neutral palette (zinc scale, `rounded-lg`, `bg-zinc-950` primary, focus-visible rings). `select` renders a native `<select>` with trigger classes and its `option` children internally. `checkbox`/`radio` are native inputs with labels.

- [ ] **Step 4: Green + commit**

Run: `bun run test -- tests/coss-codegen-actions-forms.test.ts tests/coss-codegen.test.ts` — PASS.

```bash
git add src/codegen/coss/emitters/actions.ts src/codegen/coss/emitters/forms.ts tests/coss-codegen-actions-forms.test.ts
git commit -m "feat(codegen): coss actions and forms emitters"
```

---

### Task 3 (wave B, parallel): content emitters

**Files:**
- Modify: `src/codegen/coss/emitters/content.ts` (heading, paragraph, text, image, link, list, list-item, blockquote, code, separator, table, table-header, table-row, table-cell)
- Test: `tests/coss-codegen-content.test.ts`

**Interfaces:** consumes Task 1 contracts; `badge` stays in actions (Task 2) — do not move it.

- [ ] **Step 1: Red fixtures** — one HTML + one JSX per discriminant: heading levels 1–6; escaped paragraph/text (`&`, `<`, quotes); link with safe href + title; image with alt/src; ordered/unordered nested lists; blockquote; inline vs block code (`inline === false` → `pre/code`); table with header/rows/cells incl. `align` and `header` cells; separator. Assert table child ordering (`thead` before `tbody`) and that no attribute ever renders `undefined`.

- [ ] **Step 2: Run red** → FAIL.

- [ ] **Step 3: Implement** — semantic elements, coss text scale (`text-zinc-950` headings, `text-zinc-700` body, `text-zinc-500` muted), `safeUrl` for link/image, code block `bg-zinc-900 text-zinc-50 rounded-lg p-4 font-mono text-sm`.

- [ ] **Step 4: Green + commit** — `bun run test -- tests/coss-codegen-content.test.ts tests/coss-codegen.test.ts` PASS.

```bash
git add src/codegen/coss/emitters/content.ts tests/coss-codegen-content.test.ts
git commit -m "feat(codegen): coss content emitters"
```

---

### Task 4 (wave B, parallel): navigation + layout emitters

**Files:**
- Modify: `src/codegen/coss/emitters/navigation.ts` (nav, nav-item, brand, link-route registration only if needed, tabs, tab, breadcrumbs)
- Modify: `src/codegen/coss/emitters/layout.ts` (container, grid, grid-item, row)
- Test: `tests/coss-codegen-nav-layout.test.ts`

**Interfaces:** consumes Task 1 contracts; `link` remains in content — navigation emitters call `recurse` for children instead of re-implementing it.

- [ ] **Step 1: Red fixtures** — nav with brand + items + active item (`aria-current="page"`); nav-item href safety; tabs with tab list + active panel (`data-active` styling, panel `hidden` when inactive); breadcrumbs rendering items internally (non-last as links with separator, last as `aria-current` span — `breadcrumb-item` never emitted directly); container variants (card `rounded-xl border-zinc-200 bg-white p-6 shadow-sm`, hero, sidebar layout two-column, modal centered panel, empty/error/loading dashed placeholders) via `containerType`; grid with `columns` → `grid grid-cols-N gap-3`; grid-item; row as flex with gap and alignment classes. One HTML + one JSX per discriminant; assert no `show-source` class ever leaks into generated output.

- [ ] **Step 2: Run red** → FAIL.

- [ ] **Step 3: Implement** both modules.

- [ ] **Step 4: Green + commit** — `bun run test -- tests/coss-codegen-nav-layout.test.ts tests/coss-codegen.test.ts` PASS.

```bash
git add src/codegen/coss/emitters/navigation.ts src/codegen/coss/emitters/layout.ts tests/coss-codegen-nav-layout.test.ts
git commit -m "feat(codegen): coss navigation and layout emitters"
```

---

### Task 5 (wave C): demo-fence integration

**Files:**
- Modify: `src/types.ts` (RenderOptions.codegen)
- Modify: `src/renderer/index.ts` (thread into context)
- Modify: `src/renderer/html-renderer.ts` (RenderContext + renderDemo)
- Test: `tests/renderer.test.ts`

**Interfaces:** `RenderOptions.codegen?: 'html' | 'jsx'`; `RenderContext.codegen: 'html' | 'jsx'` (default `'html'`); `renderDemo` reads `context.style`, `context.codegen`, and `node.props.classes`.

- [ ] **Step 1: Red tests**

```ts
const demoMd = '::: demo\n\n[Save]*\n\n:::';
const ast = parse(demoMd);

test('coss demo pane shows generated code by default (pane retained)', () => {
  const html = renderToHTML(ast, { style: 'coss', codegen: 'html' });
  expect(html).toContain('wmd-demo-preview');
  expect(html).toContain('wmd-demo-code');
  expect(html).toContain('<button');
  expect(html).not.toContain('wmd-demo-code wmd-hidden'); // pane is never removed
});

test('show-source class restores normalized raw source pane', () => {
  const raw = renderToHTML(parse('::: demo {.show-source}\n\n[Save]*\n\n:::'), { style: 'coss', codegen: 'jsx' });
  expect(raw).toContain('wmd-demo-code');
  expect(raw).toContain('&lt;button');           // generated code never appears
  expect(raw).toContain('[Save]*');              // normalized raw, escaped
});

test('legacy styles always show raw source regardless of codegen', () => {
  const legacy = renderToHTML(ast, { style: 'clean', codegen: 'jsx' });
  expect(legacy).toContain('wmd-demo-code');
  expect(legacy).toContain('[Save]*');
  expect(legacy).not.toContain('className=');
});

test('codegen defaults to html without the option', () => {
  const html = renderToHTML(ast, { style: 'coss' });
  expect(html).toContain('class=');
  expect(html).not.toContain('className=');
});
```

- [ ] **Step 2: Run red** → new assertions fail (pane currently always shows `demo.raw`).

- [ ] **Step 3: Implement** — add option to `RenderOptions` (types.ts:175-183 region), `codegen: options.codegen ?? 'html'` into the context built in `renderToHTML` (renderer/index.ts:31-50), add the field to `RenderContext` (html-renderer.ts:11-17), and in `renderDemo` (html-renderer.ts:769-781): compute `const showRaw = context.style !== 'coss' || node.props.classes?.includes('show-source') === true;` then pane content = `showRaw ? escapeHtml(node.raw) : escapeHtml(generateCode(node.children, { format: context.codegen }))`. `generateCode` returns unescaped-for-display source; the pane escapes exactly once. If a child throws `Unsupported codegen node type`, catch it and fall back to escaped `node.raw` for that demo (test this fallback).

- [ ] **Step 4: Green + commit** — `bun run test -- tests/renderer.test.ts tests/parser.test.ts` PASS.

```bash
git add src/types.ts src/renderer/index.ts src/renderer/html-renderer.ts tests/renderer.test.ts
git commit -m "feat(codegen): coss demo panes show generated code"
```

---

### Task 6 (wave C, parallel with 5): CLI `--codegen` flag

**Files:**
- Modify: `src/cli/index.ts`
- Test: `tests/cli-unit.test.ts`, `tests/cli.test.ts`

**Interfaces:** `CLIOptions.codegen?: 'html' | 'jsx'`; parsed via existing `readFlagValue` pattern WITH correct `i = next` advancement; passed into the `renderToHTML` call only.

- [ ] **Step 1: Red tests** — parse `--codegen jsx` sets option; default options object has NO `codegen` key (`toEqual` exact-default test must stay passing); invalid value prints exact error and exits 1; help contains `--codegen`; integration (after `bun run build`): `--codegen jsx` on a coss demo document produces HTML whose pane contains `className=`; `--format json --codegen jsx` output is byte-identical to `--format json` alone; `--style clean --codegen jsx` pane contains raw source, not JSX.

- [ ] **Step 2: Run red** → FAIL.

- [ ] **Step 3: Implement** — mirror `--style` validation shape, add help line `--codegen <format>  Code format for coss demo panes: html, jsx (default: html)`, thread `codegen` into `generateOutput`'s `renderToHTML` options. Do not touch extension logic or format dispatch.

- [ ] **Step 4: Green + commit** — `bun run build && bun run test -- tests/cli-unit.test.ts tests/cli.test.ts` PASS.

```bash
git add src/cli/index.ts tests/cli-unit.test.ts tests/cli.test.ts
git commit -m "feat(cli): --codegen flag for coss demo panes"
```

---

### Task 7: notices + verification gate

**Files:**
- Modify: `THIRD_PARTY_NOTICES.md`
- Test: `tests/api-examples.test.ts`

- [ ] **Step 1: Notice + API smoke**

Append under the third-party section:

```md
- coss ui class-string conventions: https://coss.com/ui — source https://github.com/cosscom/coss,
  `apps/ui/` (MIT per repository LICENSING.md; Copyright (c) 2025 coss.com, originally
  Copyright (c) 2025 Origin UI). wiremd's generated Tailwind class strings are modeled on
  these conventions; no coss source code is bundled.
```

Add to `tests/api-examples.test.ts`: root-import `generateCode` + `CodegenOptions` type-only import, call it, assert fragment output.

- [ ] **Step 2: Full gate**

```bash
bun run test && bun run build && bun run docs:build
```

All green; bundle within chunk guard; `git grep "@import" src/codegen` empty.

- [ ] **Step 3: Commit**

```bash
git add THIRD_PARTY_NOTICES.md tests/api-examples.test.ts
git commit -m "docs: attribute coss class conventions; codegen API smoke"
```

- [ ] **Step 4: Controller self-review** — full-allowlist dispatch test green in both formats; excluded types throw; demo pane contract (default generated / show-source raw / legacy raw / fallback on unsupported child) tested; CLI precedence proven; escaping single-pass verified.
