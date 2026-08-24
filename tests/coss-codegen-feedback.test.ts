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
    for (const t of ['accordion', 'accordion-item', 'loading-state', 'empty-state', 'error-state', 'option', 'breadcrumb-item'] as const) {
      expect(() => generateCode({ type: t, props: {} } as unknown as WiremdNode))
        .toThrow(`Unsupported codegen node type: ${t}`);
    }
  });
});

// ===========================================================================
// Task 2 - feedback family: toast / skeleton / spinner / kbd / progress / meter
// ===========================================================================

describe('emitToast', () => {
  test('default toast: card with role=status (html)', () => {
    const out = generateCode({
      type: 'toast',
      props: { toastType: undefined, classes: [] },
      children: [{ type: 'paragraph', content: 'Changes saved.', props: {} }],
    } as WiremdNode);
    expect(out).toContain('role="status"');
    expect(out).toContain('flex items-center justify-between');
    expect(out).toContain('Changes saved.');
  });

  test('variant toast: emits colored border class (html + jsx)', () => {
    const node = {
      type: 'toast',
      props: { toastType: 'success' as const, classes: [] },
      children: [{ type: 'paragraph', content: 'Saved.', props: {} }],
    } as WiremdNode;
    const html = generateCode(node);
    expect(html).toContain('border-emerald-200');
    const jsx = generateCode(node, { format: 'jsx' });
    expect(jsx).toContain('className=');
    expect(jsx).toContain('border-emerald-200');
  });

  test('opener-line title split (paragraph + paragraph children)', () => {
    const out = generateCode({
      type: 'toast',
      props: { classes: [] },
      children: [
        { type: 'paragraph', content: 'Heads up', props: {} },
        { type: 'paragraph', content: 'A new version is available.', props: {} },
      ],
    } as WiremdNode);
    expect(out).toContain('font-medium text-zinc-950');
    expect(out).toContain('Heads up');
    expect(out).toContain('A new version is available.');
  });
});

describe('emitSkeleton', () => {
  test('default skeleton: shimmer block with bg + linear gradient', () => {
    const out = generateCode({
      type: 'skeleton',
      props: {},
    } as WiremdNode);
    expect(out).toContain('animate-skeleton');
    expect(out).toContain('rounded-sm');
    expect(out).toContain('linear-gradient');
  });

  test('width + height produce inline style', () => {
    const out = generateCode({
      type: 'skeleton',
      props: { width: 200, height: 24 },
    } as WiremdNode);
    expect(out).toContain('width:200px');
    expect(out).toContain('height:24px');
  });
});

describe('emitSpinner', () => {
  test('default medium spinner: animate-spin + size class', () => {
    const out = generateCode({
      type: 'spinner',
      props: {},
    } as WiremdNode);
    expect(out).toContain('role="status"');
    expect(out).toContain('aria-label="Loading"');
    expect(out).toContain('animate-spin');
    expect(out).toContain('h-4 w-4');
  });

  test('large spinner', () => {
    const out = generateCode({
      type: 'spinner',
      props: { size: 'large' },
    } as WiremdNode);
    expect(out).toContain('h-6 w-6');
  });
});

describe('emitKbd', () => {
  test('default kbd: rounded bg + zinc-500 text', () => {
    const out = generateCode({
      type: 'kbd',
      content: '⌘K',
      props: {},
    } as WiremdNode);
    expect(out).toMatch(/<kbd[^>]*class="[^"]*bg-zinc-100/);
    expect(out).toContain('⌘K');
  });

  test('JSX kbd uses className', () => {
    const out = generateCode(
      { type: 'kbd', content: 'K', props: {} } as WiremdNode,
      { format: 'jsx' },
    );
    expect(out).toContain('className=');
    expect(out).toContain('K');
  });

  test('escapes < and > in content', () => {
    const out = generateCode({
      type: 'kbd',
      content: 'A<B',
      props: {},
    } as WiremdNode);
    expect(out).toContain('A&lt;B');
  });
});

describe('emitProgress', () => {
  test('determinate progress with value=60', () => {
    const out = generateCode({
      type: 'progress',
      value: 60,
      indeterminate: false,
      props: {},
    } as WiremdNode);
    expect(out).toContain('role="progressbar"');
    expect(out).toContain('aria-valuenow="60"');
    expect(out).toContain('width:60%');
    expect(out).toContain('60%');
  });

  test('indeterminate progress: width 100% and no value text', () => {
    const out = generateCode({
      type: 'progress',
      value: 0,
      indeterminate: true,
      props: {},
    } as WiremdNode);
    expect(out).toContain('data-indeterminate="true"');
    expect(out).toContain('width:100%');
    expect(out).not.toMatch(/<p[^>]*>0%<\/p>/);
  });

  test('progress with label renders label paragraph', () => {
    const out = generateCode({
      type: 'progress',
      value: 25,
      indeterminate: false,
      props: { label: 'Uploading…' },
    } as WiremdNode);
    expect(out).toContain('Uploading');
    expect(out).toContain('width:25%');
  });
});

describe('emitMeter', () => {
  test('meter with value 30 of 100 renders 30% width', () => {
    const out = generateCode({
      type: 'meter',
      value: 30,
      min: 0,
      max: 100,
      props: {},
    } as WiremdNode);
    expect(out).toContain('role="meter"');
    expect(out).toContain('aria-valuenow="30"');
    expect(out).toContain('aria-valuemax="100"');
    expect(out).toContain('width:30%');
    expect(out).toContain('30 / 100');
  });

  test('meter with custom min/max (e.g. 200/1000 = 20%)', () => {
    const out = generateCode({
      type: 'meter',
      value: 200,
      min: 0,
      max: 1000,
      props: {},
    } as WiremdNode);
    expect(out).toContain('width:20%');
    expect(out).toContain('200 / 1000');
  });
});
