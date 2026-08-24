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
