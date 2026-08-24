/**
 * Task 4 (Phase 2 wave B): navigation + layout coss emitters.
 *
 * Exact HTML + JSX fixtures for nav, nav-item, brand, tabs, tab,
 * breadcrumbs, container, grid, grid-item, row, and demo.
 *
 * Fixtures intentionally only nest discriminants owned by this task so the
 * suite stays green independently of the sibling emitter waves.
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import { describe, expect, test } from 'vitest';
import { generateCode } from '../src/codegen/coss/index.js';
import type { WiremdNode } from '../src/types.js';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const card: WiremdNode = { type: 'container', containerType: 'card', props: {}, children: [] };
const gridItem: WiremdNode = { type: 'grid-item', props: {}, children: [] };
const row: WiremdNode = { type: 'row', props: {}, children: [] };

/** containerTypes outside the declared union (empty/error/loading) need a cast. */
const stateContainer = (containerType: string): WiremdNode =>
  ({ type: 'container', containerType, props: {}, children: [] }) as unknown as WiremdNode;

const navNode: WiremdNode = {
  type: 'nav',
  props: {},
  children: [
    { type: 'brand', props: {}, children: [{ type: 'nav-item', content: 'wiremd', href: '#', props: {} }] },
    { type: 'nav-item', content: 'Docs', href: '/docs', props: {} },
    { type: 'nav-item', content: 'Pricing', href: '/pricing', props: { state: 'active' } },
  ],
};

const tabsNode: WiremdNode = {
  type: 'tabs',
  props: {},
  children: [
    { type: 'tab', label: 'Account', active: true, props: {}, children: [card] },
    { type: 'tab', label: 'Password', active: false, props: {}, children: [] },
  ],
};

const breadcrumbsNode: WiremdNode = {
  type: 'breadcrumbs',
  props: {},
  children: [
    { type: 'breadcrumb-item', content: 'Home', href: '/' },
    { type: 'breadcrumb-item', content: 'Products', href: '/products' },
    { type: 'breadcrumb-item', content: 'Laptop' },
  ],
};

// ---------------------------------------------------------------------------
// navigation: nav
// ---------------------------------------------------------------------------

describe('coss codegen navigation', () => {
  test('nav renders bar with brand and items (html)', () => {
    expect(generateCode(navNode)).toBe(
      `<nav class="flex items-center gap-2 border-b border-zinc-200 bg-white px-4 py-3">
<div class="font-semibold text-zinc-950 mr-auto">
<a href="#" class="text-zinc-500 hover:text-zinc-950">wiremd</a>
</div>
<a href="/docs" class="text-zinc-500 hover:text-zinc-950">Docs</a>
<a href="/pricing" aria-current="page" class="text-zinc-950 font-medium">Pricing</a>
</nav>`,
    );
  });

  test('nav renders bar with brand and items (jsx)', () => {
    expect(generateCode(navNode, { format: 'jsx' })).toBe(
      `<nav className="flex items-center gap-2 border-b border-zinc-200 bg-white px-4 py-3">
<div className="font-semibold text-zinc-950 mr-auto">
<a href="#" className="text-zinc-500 hover:text-zinc-950">wiremd</a>
</div>
<a href="/docs" className="text-zinc-500 hover:text-zinc-950">Docs</a>
<a href="/pricing" aria-current="page" className="text-zinc-950 font-medium">Pricing</a>
</nav>`,
    );
  });

  // -------------------------------------------------------------------------
  // navigation: nav-item
  // -------------------------------------------------------------------------

  test('nav-item default renders muted anchor (html + jsx)', () => {
    const item: WiremdNode = { type: 'nav-item', content: 'Docs', href: '/docs', props: {} };
    expect(generateCode(item)).toBe(
      '<a href="/docs" class="text-zinc-500 hover:text-zinc-950">Docs</a>',
    );
    expect(generateCode(item, { format: 'jsx' })).toBe(
      '<a href="/docs" className="text-zinc-500 hover:text-zinc-950">Docs</a>',
    );
  });

  test('nav-item active state renders aria-current and emphasized classes', () => {
    const item: WiremdNode = { type: 'nav-item', content: 'Pricing', href: '/pricing', props: { state: 'active' } };
    expect(generateCode(item)).toBe(
      '<a href="/pricing" aria-current="page" class="text-zinc-950 font-medium">Pricing</a>',
    );
  });

  test('nav-item without href falls back to #', () => {
    expect(generateCode({ type: 'nav-item', content: 'Home', props: {} })).toBe(
      '<a href="#" class="text-zinc-500 hover:text-zinc-950">Home</a>',
    );
  });

  test('nav-item href is url-safety checked', () => {
    const evil: WiremdNode = { type: 'nav-item', content: 'x', href: 'javascript:alert(1)', props: {} };
    expect(() => generateCode(evil)).toThrow(/Unsafe URL/);
  });

  test('nav-item content is escaped per format', () => {
    const item: WiremdNode = { type: 'nav-item', content: 'A & B <C> "D"', href: '#', props: {} };
    expect(generateCode(item)).toBe(
      '<a href="#" class="text-zinc-500 hover:text-zinc-950">A &amp; B &lt;C&gt; &quot;D&quot;</a>',
    );
    expect(generateCode(item, { format: 'jsx' })).toBe(
      '<a href="#" className="text-zinc-500 hover:text-zinc-950">A &amp; B &lt;C&gt; "D"</a>',
    );
  });

  test('nav-item with children recurses instead of re-implementing link', () => {
    const item: WiremdNode = {
      type: 'nav-item',
      href: '/x',
      props: {},
      children: [{ type: 'brand', props: {}, children: [] }],
    };
    expect(generateCode(item)).toBe(
      `<a href="/x" class="text-zinc-500 hover:text-zinc-950">
<div class="font-semibold text-zinc-950 mr-auto"></div>
</a>`,
    );
  });

  // -------------------------------------------------------------------------
  // navigation: brand
  // -------------------------------------------------------------------------

  test('brand renders semibold block pushed right (html + jsx)', () => {
    const brand: WiremdNode = {
      type: 'brand',
      props: {},
      children: [{ type: 'nav-item', content: 'wiremd', href: '#', props: {} }],
    };
    expect(generateCode(brand)).toBe(
      `<div class="font-semibold text-zinc-950 mr-auto">
<a href="#" class="text-zinc-500 hover:text-zinc-950">wiremd</a>
</div>`,
    );
    expect(generateCode(brand, { format: 'jsx' })).toBe(
      `<div className="font-semibold text-zinc-950 mr-auto">
<a href="#" className="text-zinc-500 hover:text-zinc-950">wiremd</a>
</div>`,
    );
  });

  test('brand without children collapses to a single line', () => {
    expect(generateCode({ type: 'brand', props: {}, children: [] })).toBe(
      '<div class="font-semibold text-zinc-950 mr-auto"></div>',
    );
  });

  // -------------------------------------------------------------------------
  // navigation: tabs + tab
  // -------------------------------------------------------------------------

  test('tabs renders tablist plus panels, inactive panel hidden (html)', () => {
    expect(generateCode(tabsNode)).toBe(
      `<div>
<div role="tablist" class="border-b border-zinc-200 flex gap-1">
<button type="button" role="tab" aria-selected="true" data-active="true" class="border-b-2 border-zinc-950 px-3 py-2 text-sm font-medium text-zinc-950">Account</button>
<button type="button" role="tab" aria-selected="false" data-active="false" class="border-b-2 border-transparent px-3 py-2 text-sm text-zinc-500 hover:text-zinc-950">Password</button>
</div>
<div class="pt-4">
<div class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"></div>
</div>
<div class="pt-4" hidden></div>
</div>`,
    );
  });

  test('tabs renders tablist plus panels, inactive panel hidden (jsx)', () => {
    expect(generateCode(tabsNode, { format: 'jsx' })).toBe(
      `<div>
<div role="tablist" className="border-b border-zinc-200 flex gap-1">
<button type="button" role="tab" aria-selected="true" data-active="true" className="border-b-2 border-zinc-950 px-3 py-2 text-sm font-medium text-zinc-950">Account</button>
<button type="button" role="tab" aria-selected="false" data-active="false" className="border-b-2 border-transparent px-3 py-2 text-sm text-zinc-500 hover:text-zinc-950">Password</button>
</div>
<div className="pt-4">
<div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"></div>
</div>
<div className="pt-4" hidden></div>
</div>`,
    );
  });

  test('tab emits its panel: rendered when active, hidden when inactive (html + jsx)', () => {
    const inactive: WiremdNode = {
      type: 'tab',
      label: 'Settings',
      active: false,
      props: {},
      children: [gridItem],
    };
    expect(generateCode(inactive)).toBe(
      `<div class="pt-4" hidden>
<div class="min-w-0"></div>
</div>`,
    );
    expect(generateCode(inactive, { format: 'jsx' })).toBe(
      `<div className="pt-4" hidden>
<div className="min-w-0"></div>
</div>`,
    );
    expect(generateCode({ type: 'tab', label: 'Settings', active: true, props: {}, children: [] })).toBe(
      '<div class="pt-4"></div>',
    );
  });

  test('tab labels are escaped in the trigger list', () => {
    const tabs: WiremdNode = {
      type: 'tabs',
      props: {},
      children: [{ type: 'tab', label: 'A & B <i> {x}', active: true, props: {}, children: [] }],
    };
    expect(generateCode(tabs)).toContain(
      `<button type="button" role="tab" aria-selected="true" data-active="true" class="border-b-2 border-zinc-950 px-3 py-2 text-sm font-medium text-zinc-950">A &amp; B &lt;i&gt; {x}</button>`,
    );
    expect(generateCode(tabs, { format: 'jsx' })).toContain(
      `<button type="button" role="tab" aria-selected="true" data-active="true" className="border-b-2 border-zinc-950 px-3 py-2 text-sm font-medium text-zinc-950">A &amp; B &lt;i&gt; {'{'}x{'}'}</button>`,
    );
  });

  // -------------------------------------------------------------------------
  // navigation: breadcrumbs
  // ---------------------------------------------------------------------------

  test('breadcrumbs renders ol with link crumbs, separators, and current span (html)', () => {
    expect(generateCode(breadcrumbsNode)).toBe(
      `<nav aria-label="breadcrumb">
<ol class="flex items-center gap-1.5 text-sm text-zinc-500">
<li><a href="/" class="hover:text-zinc-950">Home</a></li>
<li aria-hidden="true" class="text-zinc-300">/</li>
<li><a href="/products" class="hover:text-zinc-950">Products</a></li>
<li aria-hidden="true" class="text-zinc-300">/</li>
<li><span aria-current="page" class="text-zinc-950">Laptop</span></li>
</ol>
</nav>`,
    );
  });

  test('breadcrumbs renders chevron separator variant (jsx)', () => {
    const chevron: WiremdNode = {
      type: 'breadcrumbs',
      props: { separator: 'chevron' },
      children: breadcrumbsNode.children,
    };
    expect(generateCode(chevron, { format: 'jsx' })).toBe(
      `<nav aria-label="breadcrumb">
<ol className="flex items-center gap-1.5 text-sm text-zinc-500">
<li><a href="/" className="hover:text-zinc-950">Home</a></li>
<li aria-hidden="true" className="text-zinc-300">›</li>
<li><a href="/products" className="hover:text-zinc-950">Products</a></li>
<li aria-hidden="true" className="text-zinc-300">›</li>
<li><span aria-current="page" className="text-zinc-950">Laptop</span></li>
</ol>
</nav>`,
    );
  });

  test('breadcrumb items without href fall back to # and current wins over index', () => {
    const crumbs: WiremdNode = {
      type: 'breadcrumbs',
      props: {},
      children: [
        { type: 'breadcrumb-item', content: 'A' },
        { type: 'breadcrumb-item', content: 'B', current: true },
        { type: 'breadcrumb-item', content: 'C' },
      ],
    };
    expect(generateCode(crumbs)).toBe(
      `<nav aria-label="breadcrumb">
<ol class="flex items-center gap-1.5 text-sm text-zinc-500">
<li><a href="#" class="hover:text-zinc-950">A</a></li>
<li aria-hidden="true" class="text-zinc-300">/</li>
<li><span aria-current="page" class="text-zinc-950">B</span></li>
<li><span aria-current="page" class="text-zinc-950">C</span></li>
</ol>
</nav>`,
    );
  });

  test('breadcrumb-item is never emitted directly and crumb hrefs are safety checked', () => {
    const out = generateCode(breadcrumbsNode);
    expect(out).not.toContain('breadcrumb-item');
    const evil: WiremdNode = {
      type: 'breadcrumbs',
      props: {},
      children: [
        { type: 'breadcrumb-item', content: 'x', href: 'javascript:alert(1)' },
        { type: 'breadcrumb-item', content: 'y' },
      ],
    };
    expect(() => generateCode(evil)).toThrow(/Unsafe URL/);
  });

  test('breadcrumb content is escaped', () => {
    const crumbs: WiremdNode = {
      type: 'breadcrumbs',
      props: {},
      children: [
        { type: 'breadcrumb-item', content: 'F & Q', href: '#' },
        { type: 'breadcrumb-item', content: '<Last>' },
      ],
    };
    expect(generateCode(crumbs)).toContain('<a href="#" class="hover:text-zinc-950">F &amp; Q</a>');
    expect(generateCode(crumbs)).toContain(
      '<li><span aria-current="page" class="text-zinc-950">&lt;Last&gt;</span></li>',
    );
  });
});

// ---------------------------------------------------------------------------
// layout: container variants
// ---------------------------------------------------------------------------

describe('coss codegen layout', () => {
  test('container card wraps children (html + jsx)', () => {
    const node: WiremdNode = { type: 'container', containerType: 'card', props: {}, children: [row] };
    expect(generateCode(node)).toBe(
      `<div class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
<div class="flex items-center gap-3"></div>
</div>`,
    );
    expect(generateCode(node, { format: 'jsx' })).toBe(
      `<div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
<div className="flex items-center gap-3"></div>
</div>`,
    );
  });

  test('container hero renders centered band (html + jsx)', () => {
    expect(generateCode({ type: 'container', containerType: 'hero', props: {}, children: [] })).toBe(
      '<div class="py-16 px-8 text-center border-y border-zinc-200"></div>',
    );
    expect(generateCode({ type: 'container', containerType: 'hero', props: {}, children: [] }, { format: 'jsx' })).toBe(
      '<div className="py-16 px-8 text-center border-y border-zinc-200"></div>',
    );
  });

  test('container sidebar renders two-column grid (html + jsx)', () => {
    const node: WiremdNode = {
      type: 'container',
      containerType: 'sidebar',
      props: {},
      children: [gridItem, gridItem],
    };
    expect(generateCode(node)).toBe(
      `<div class="grid md:grid-cols-[240px_1fr] gap-6">
<div class="min-w-0"></div>
<div class="min-w-0"></div>
</div>`,
    );
    expect(generateCode(node, { format: 'jsx' })).toBe(
      `<div className="grid md:grid-cols-[240px_1fr] gap-6">
<div className="min-w-0"></div>
<div className="min-w-0"></div>
</div>`,
    );
  });

  test('container modal renders overlay wrapper and dialog panel (html + jsx)', () => {
    expect(generateCode({ type: 'container', containerType: 'modal', props: {}, children: [] })).toBe(
      `<div class="fixed inset-0 flex items-center justify-center bg-black/50">
<div role="dialog" aria-modal="true" class="rounded-xl bg-white p-6 max-w-md shadow-xl"></div>
</div>`,
    );
    const withChild: WiremdNode = {
      type: 'container',
      containerType: 'modal',
      props: {},
      children: [row],
    };
    expect(generateCode(withChild, { format: 'jsx' })).toBe(
      `<div className="fixed inset-0 flex items-center justify-center bg-black/50">
<div role="dialog" aria-modal="true" className="rounded-xl bg-white p-6 max-w-md shadow-xl">
<div className="flex items-center gap-3"></div>
</div>
</div>`,
    );
  });

  test('container empty and loading render dashed placeholders (html + jsx)', () => {
    for (const node of [stateContainer('empty'), stateContainer('loading')]) {
      expect(generateCode(node)).toBe(
        '<div class="rounded-lg border border-dashed p-8 text-center text-zinc-500"></div>',
      );
      expect(generateCode(node, { format: 'jsx' })).toBe(
        '<div className="rounded-lg border border-dashed p-8 text-center text-zinc-500"></div>',
      );
    }
  });

  test('container error renders red dashed placeholder (html + jsx)', () => {
    expect(generateCode(stateContainer('error'))).toBe(
      '<div class="rounded-lg border border-dashed border-red-200 p-8 text-center text-red-600"></div>',
    );
    expect(generateCode(stateContainer('error'), { format: 'jsx' })).toBe(
      '<div className="rounded-lg border border-dashed border-red-200 p-8 text-center text-red-600"></div>',
    );
  });

  test('container falls back to a neutral bordered box for other containerTypes (html + jsx)', () => {
    for (const kind of ['section', 'footer', 'alert', 'layout', 'unknown-kind']) {
      const node = stateContainer(kind);
      expect(generateCode(node)).toBe('<div class="rounded-lg border border-zinc-200"></div>');
      expect(generateCode(node, { format: 'jsx' })).toBe('<div className="rounded-lg border border-zinc-200"></div>');
    }
  });

  // -------------------------------------------------------------------------
  // layout: grid + grid-item
  // -------------------------------------------------------------------------

  test('grid maps columns 1-12 to grid-cols-N (html + jsx)', () => {
    const node: WiremdNode = { type: 'grid', columns: 3, props: {}, children: [gridItem, gridItem] };
    expect(generateCode(node)).toBe(
      `<div class="grid grid-cols-3 gap-3">
<div class="min-w-0"></div>
<div class="min-w-0"></div>
</div>`,
    );
    expect(generateCode({ ...node, columns: 2 }, { format: 'jsx' })).toBe(
      `<div className="grid grid-cols-2 gap-3">
<div className="min-w-0"></div>
<div className="min-w-0"></div>
</div>`,
    );
    expect(generateCode({ ...node, columns: 1 })).toContain('class="grid grid-cols-1 gap-3"');
    expect(generateCode({ ...node, columns: 12 })).toContain('class="grid grid-cols-12 gap-3"');
  });

  test('grid clamps out-of-range columns to 3 without data warnings', () => {
    for (const columns of [0, -2, 13, 99, 2.5, Number.NaN]) {
      const out = generateCode({ type: 'grid', columns, props: {}, children: [] });
      expect(out).toBe('<div class="grid grid-cols-3 gap-3"></div>');
      expect(out).not.toContain('data-');
    }
  });

  test('grid-item renders min-w-0 box and recurses children (html + jsx)', () => {
    const node: WiremdNode = { type: 'grid-item', props: {}, children: [card] };
    expect(generateCode(node)).toBe(
      `<div class="min-w-0">
<div class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"></div>
</div>`,
    );
    expect(generateCode(gridItem, { format: 'jsx' })).toBe('<div className="min-w-0"></div>');
  });

  // -------------------------------------------------------------------------
  // layout: row
  // -------------------------------------------------------------------------

  test('row renders flex with gap and alignment classes (html + jsx)', () => {
    const node: WiremdNode = { type: 'row', props: {}, children: [gridItem, gridItem] };
    expect(generateCode(node)).toBe(
      `<div class="flex items-center gap-3">
<div class="min-w-0"></div>
<div class="min-w-0"></div>
</div>`,
    );
    expect(generateCode(row, { format: 'jsx' })).toBe('<div className="flex items-center gap-3"></div>');
    expect(generateCode({ ...row, props: { right: true } })).toBe(
      '<div class="flex items-center gap-3 justify-end"></div>',
    );
    expect(generateCode({ ...row, props: { center: true } })).toBe(
      '<div class="flex items-center gap-3 justify-center"></div>',
    );
  });

  // -------------------------------------------------------------------------
  // layout: demo
  // ---------------------------------------------------------------------------

  test('demo emits its children as an ordered fragment without a wrapper (html + jsx)', () => {
    const demo: WiremdNode = {
      type: 'demo',
      raw: '::: demo\n\n[Save]*\n\n:::',
      props: {},
      children: [row, gridItem],
    };
    expect(generateCode(demo)).toBe(
      `<div class="flex items-center gap-3"></div>
<div class="min-w-0"></div>`,
    );
    expect(generateCode({ ...demo, children: [row] }, { format: 'jsx' })).toBe(
      '<div className="flex items-center gap-3"></div>',
    );
  });

  test('demo with no children yields an empty fragment', () => {
    expect(generateCode({ type: 'demo', raw: '', props: {}, children: [] })).toBe('');
  });
});

// ---------------------------------------------------------------------------
// cross-cutting contracts
// ---------------------------------------------------------------------------

describe('coss codegen nav/layout contracts', () => {
  test('show-source never leaks into generated output', () => {
    const marked: WiremdNode[] = [
      { ...navNode, props: { classes: ['show-source'] } },
      { ...tabsNode, props: { classes: ['show-source'] } },
      { ...breadcrumbsNode, props: { classes: ['show-source'] } },
      { ...card, props: { classes: ['show-source'] } },
      { type: 'grid', columns: 3, props: { classes: ['show-source'] }, children: [gridItem] },
      { ...row, props: { classes: ['show-source'] } },
      { type: 'demo', raw: '', props: { classes: ['show-source'] }, children: [row] },
    ];
    for (const node of marked) {
      for (const format of ['html', 'jsx'] as const) {
        expect(generateCode(node, { format })).not.toContain('show-source');
      }
    }
  });

  test('output is deterministic across repeated calls in both formats', () => {
    for (const node of [navNode, tabsNode, breadcrumbsNode, card]) {
      expect(generateCode(node)).toBe(generateCode(node));
      expect(generateCode(node, { format: 'jsx' })).toBe(generateCode(node, { format: 'jsx' }));
    }
  });

  test('generated fragments never contain import statements or module wrappers', () => {
    for (const node of [navNode, tabsNode, breadcrumbsNode]) {
      for (const format of ['html', 'jsx'] as const) {
        expect(generateCode(node, { format })).not.toMatch(/import |export /);
      }
    }
  });
});
