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

describe('generateCode JSX attribute entity-escaping', () => {
  const INPUT_CLASSES =
    'h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1 disabled:opacity-50';

  // Contains a double quote, ampersand, less-than, backslash, and a newline:
  // exactly the characters the broken JSON.stringify escaping mangled.
  const TRICKY = 'Say "hi" & <b>\nnext\\line';
  // Both formats escape `& < "` to entities; the backslash and newline stay
  // literal (JSX string attributes have no backslash escape processing).
  const ESCAPED = 'Say &quot;hi&quot; &amp; &lt;b&gt;\nnext\\line';

  test('jsx attributes entity-escape quotes and ampersands, never backslash-escape; html unchanged', () => {
    const node: WiremdNode = { type: 'input', props: { placeholder: TRICKY } };
    const jsxOut = generateCode(node, { format: 'jsx' });
    expect(jsxOut).toBe(`<input type="text" placeholder="${ESCAPED}" className="${INPUT_CLASSES}" />`);
    expect(jsxOut).toContain('&quot;');
    expect(jsxOut).toContain('&amp;');
    expect(jsxOut).not.toContain('\\"');
    expect(jsxOut).not.toContain('\\\\');
    expect(jsxOut).not.toContain('\\n');
    expect(generateCode(node)).toBe(`<input type="text" placeholder="${ESCAPED}" class="${INPUT_CLASSES}" />`);
  });
});

// Task 1 Step 4 verification: the package root re-exports the codegen surface and
// CodegenOptions is referenced by a test (brief requirement). Also pins the JSX
// separator contract (className variant of the pinned HTML fixture above).
import { generateCode as generateCodeFromRoot } from '../src/index.js';
import type { CodegenOptions } from '../src/index.js';

describe('root export contracts', () => {
  test('CodegenOptions.format selects jsx output via the package root', () => {
    const options: CodegenOptions = { format: 'jsx' };
    expect(generateCodeFromRoot({ type: 'separator', props: {} }, options)).toBe(
      '<hr className="h-px w-full bg-zinc-200" />',
    );
  });

  test('CodegenOptions.format defaults to html via the package root', () => {
    const options: CodegenOptions = {};
    expect(generateCodeFromRoot({ type: 'separator', props: {} }, options)).toBe(
      '<hr class="h-px w-full bg-zinc-200" />',
    );
  });
});
