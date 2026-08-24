/**
 * coss codegen - feedback family tests (Task 1: alert; later tasks extend)
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import { describe, expect, test } from 'vitest';
import { generateCode } from '../src/codegen/coss/index.js';
import type { WiremdNode } from '../src/types.js';

const ALERT_BASE = 'relative grid w-full items-start gap-y-0.5 rounded-lg border px-3.5 py-3 text-sm text-zinc-950';
const ALERT_VARIANT_BG = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-red-200 bg-red-50 text-red-900',
} as const;

function alertNode(variant?: 'success' | 'info' | 'warning' | 'error', content = 'Saved.'): WiremdNode {
  return {
    type: 'container',
    containerType: 'alert',
    props: { classes: variant ? [variant] : [] },
    children: [{ type: 'paragraph', content, props: {} }],
  };
}

describe('emitAlert (feedback family)', () => {
  test('emits role="alert" with base classes for a default alert (html)', () => {
    const out = generateCode(alertNode());
    expect(out).toBe(`<div role="alert" class="${ALERT_BASE}">\n<p class="text-zinc-700 leading-6">Saved.</p>\n</div>`);
  });

  test('emits role="alert" with base classes for a default alert (jsx)', () => {
    const out = generateCode(alertNode(), { format: 'jsx' });
    expect(out).toBe(`<div role="alert" className="${ALERT_BASE}">\n<p className="text-zinc-700 leading-6">Saved.</p>\n</div>`);
  });

  test.each(['success', 'info', 'warning', 'error'] as const)(
    'emits %s variant background (html + jsx)',
    (variant) => {
      const html = generateCode(alertNode(variant));
      expect(html).toContain(`class="${ALERT_BASE} ${ALERT_VARIANT_BG[variant]}"`);
      const jsx = generateCode(alertNode(variant), { format: 'jsx' });
      expect(jsx).toContain(`className="${ALERT_BASE} ${ALERT_VARIANT_BG[variant]}"`);
    },
  );

  test('opener-line title: first paragraph is bolded when siblings present', () => {
    const node: WiremdNode = {
      type: 'container',
      containerType: 'alert',
      props: { classes: ['warning'] },
      children: [
        { type: 'paragraph', content: 'Storage limit reached', props: {} },
        { type: 'paragraph', content: 'Upgrade your plan to continue.', props: {} },
        { type: 'button', content: 'Upgrade Now', props: { variant: 'primary' } },
      ],
    };
    const out = generateCode(node);
    expect(out).toContain('class="font-medium"');
    expect(out).toContain('Storage limit reached');
    expect(out).toContain('Upgrade your plan');
    expect(out).toContain('<button');
    // title comes before body
    const titleIdx = out.indexOf('Storage limit reached');
    const bodyIdx = out.indexOf('Upgrade your plan');
    expect(titleIdx).toBeLessThan(bodyIdx);
  });

  test('opener-line title: accepts paragraph with children[] but no content (remark-containers path)', () => {
    // The remark-containers plugin emits the opener's inline text as a
    // paragraph with only a `children` array of one text node. The emitter
    // must recognize this shape and split it as the title.
    const node: WiremdNode = {
      type: 'container',
      containerType: 'alert',
      props: { classes: ['warning'] },
      children: [
        { type: 'paragraph', children: [{ type: 'text', value: 'Storage limit reached' }], props: {} },
        { type: 'paragraph', content: 'Upgrade your plan to continue.', props: {} },
        { type: 'button', content: 'Upgrade Now', props: { variant: 'primary' } },
      ],
    };
    const out = generateCode(node);
    expect(out).toContain('class="font-medium"');
    expect(out).toContain('Storage limit reached');
    expect(out).toContain('Upgrade your plan');
  });

  test('single child alert: whole paragraph is body, no title split', () => {
    const out = generateCode(alertNode('info', 'Heads up.'));
    expect(out).not.toContain('font-medium');
    expect(out).toContain('Heads up.');
  });

  test('escapes HTML special characters in alert text', () => {
    const node: WiremdNode = {
      type: 'container',
      containerType: 'alert',
      props: { classes: [] },
      children: [{ type: 'paragraph', content: 'A & B <c> "d"', props: {} }],
    };
    const html = generateCode(node);
    expect(html).toContain('A &amp; B &lt;c&gt; &quot;d&quot;');
  });

  test('escapes JSX special characters in alert text (no backslashes)', () => {
    const node: WiremdNode = {
      type: 'container',
      containerType: 'alert',
      props: { classes: [] },
      children: [{ type: 'paragraph', content: 'A & B <c> {d}', props: {} }],
    };
    const jsx = generateCode(node, { format: 'jsx' });
    // escapeJsxText emits single-quoted JS string literals for braces.
    expect(jsx).toContain("A &amp; B &lt;c&gt; {'{'}d{'}'}");
    expect(jsx).not.toContain('\\{');
    expect(jsx).not.toContain('\\"');
  });

  test('unsupported non-alert container type falls through to existing emitter (no regression)', () => {
    const out = generateCode({ type: 'container', containerType: 'card', props: { classes: [] }, children: [] });
    expect(out).toContain('rounded-xl border border-zinc-200 bg-white p-6 shadow-sm');
  });

  test('non-alert container dispatched through emitContainer does not include role=alert', () => {
    const out = generateCode({
      type: 'container',
      containerType: 'card',
      props: { classes: [] },
      children: [{ type: 'paragraph', content: 'hi', props: {} }],
    });
    expect(out).not.toContain('role="alert"');
  });

  test('phase 2 exclusion list: form/accordion/alert-moved-to-supported', () => {
    // `alert` is no longer in the exclusion list - it's now supported via the
    // container emitter's alert branch. Confirm via dispatcher: feeding an
    // `alert` AST node (the standalone node type) still throws because
    // SupportedType is unchanged - the container pathway is the supported one.
    expect(() => generateCode({ type: 'alert', alertType: 'warning', props: { classes: [] }, children: [] }))
      .toThrow('Unsupported codegen node type: alert');
    // `form` etc. still throw.
    for (const t of ['form', 'accordion', 'accordion-item', 'loading-state', 'empty-state', 'error-state', 'option', 'breadcrumb-item'] as const) {
      expect(() => generateCode({ type: t, props: {} } as unknown as WiremdNode))
        .toThrow(`Unsupported codegen node type: ${t}`);
    }
  });
});
