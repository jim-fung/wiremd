/**
 * coss codegen - navigation family (pagination, segmented-control,
 * scroll-area, sidebar, menubar). Task 4 of the Phase 3 plan.
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import { describe, expect, test } from 'vitest';
import { generateCode } from '../src/codegen/coss/index.js';
import { parse } from '../src/index.js';
import type { WiremdNode } from '../src/types.js';

/** Button-group children as produced by bracket parsing inside containers. */
function buttonGroup(children: WiremdNode[]): WiremdNode {
  return {
    type: 'container',
    containerType: 'button-group',
    props: {},
    children: children as any,
  } as WiremdNode;
}

describe('emitPagination', () => {
  test('renders nav with aria-label and page links', () => {
    const out = generateCode({
      type: 'pagination',
      props: {},
      children: [
        buttonGroup([
          { type: 'button', content: 'Previous', props: {} } as WiremdNode,
          { type: 'button', content: '1', props: { variant: 'primary' } } as WiremdNode,
          { type: 'button', content: '2', props: {} } as WiremdNode,
        ]),
      ],
    } as WiremdNode);
    expect(out).toContain('aria-label="pagination"');
    expect(out).toContain('aria-current="page"');
    expect(out).toContain('Previous');
    expect(out).toContain('flex flex-row items-center gap-1');
  });

  test('parses ::: pagination with bracket items end-to-end', () => {
    const ast = parse('::: pagination\n[Previous] [1]* [2] [Next]\n:::');
    expect(ast.children[0].type).toBe('pagination');
    const out = generateCode(ast.children[0] as any);
    expect(out).toContain('aria-current="page"');
    expect(out).toContain('Next');
  });
});

describe('emitSegmentedControl', () => {
  test('renders aria-pressed buttons with active state', () => {
    const out = generateCode({
      type: 'segmented-control',
      props: {},
      children: [
        buttonGroup([
          { type: 'button', content: 'Day', props: { variant: 'primary' } } as WiremdNode,
          { type: 'button', content: 'Week', props: {} } as WiremdNode,
        ]),
      ],
    } as WiremdNode);
    expect(out).toContain('aria-pressed="true"');
    expect(out).toContain('aria-pressed="false"');
    expect(out).toContain('bg-zinc-100 p-1');
    expect(out).toContain('Day');
  });

  test('parses ::: segmented-control end-to-end', () => {
    const ast = parse('::: segmented-control\n[Day]* [Week] [Month]\n:::');
    expect(ast.children[0].type).toBe('segmented-control');
    const out = generateCode(ast.children[0] as any);
    expect(out).toContain('role="group"');
    expect(out).toContain('Month');
  });
});

describe('emitScrollArea', () => {
  test('renders bordered overflow container', () => {
    const out = generateCode({
      type: 'scroll-area',
      props: {},
      children: [{ type: 'paragraph', content: 'Scrollable', props: {} }],
    } as WiremdNode);
    expect(out).toContain('overflow-hidden');
    expect(out).toContain('Scrollable');
  });

  test('maxHeight prop becomes inline style', () => {
    const out = generateCode({
      type: 'scroll-area',
      props: { maxHeight: 200 },
      children: [],
    } as WiremdNode);
    expect(out).toContain('max-height:200px');
  });
});

describe('emitSidebar', () => {
  test('list children become nav menu with active item', () => {
    const out = generateCode({
      type: 'sidebar',
      props: { title: 'Menu' },
      children: [
        {
          type: 'list',
          ordered: false,
          props: {},
          children: [
            { type: 'list-item', content: 'Home', props: { classes: ['active'] } } as WiremdNode,
            { type: 'list-item', content: 'Settings', props: {} } as WiremdNode,
          ],
        } as WiremdNode,
      ],
    } as WiremdNode);
    expect(out).toContain('Menu');
    expect(out).toContain('Home');
    expect(out).toContain('bg-zinc-100 p-2 text-sm font-medium');
    expect(out).toContain('Settings');
    expect(out).toMatch(/<aside[^>]*w-64/);
  });

  test('parses ::: sidebar end-to-end and promotes the discriminant', () => {
    const ast = parse('::: sidebar\n### Menu\n- Home\n- Settings\n:::');
    expect(ast.children[0].type).toBe('sidebar');
    const out = generateCode(ast.children[0] as any);
    expect(out).toContain('Home');
    expect(out).toContain('Settings');
  });
});

describe('emitMenubar', () => {
  test('renders role=menubar container', () => {
    const out = generateCode({
      type: 'menubar',
      props: {},
      children: [{ type: 'button', content: 'File', props: {} } as WiremdNode],
    } as WiremdNode);
    expect(out).toContain('role="menubar"');
    expect(out).toContain('File');
  });
});

describe('navigation family regression: exclusion list still throws', () => {
  test('form etc. still throw', () => {
    for (const t of ['loading-state', 'empty-state', 'error-state', 'option', 'breadcrumb-item', 'menu-item'] as const) {
      expect(() => generateCode({ type: t, props: {} } as unknown as WiremdNode))
        .toThrow(`Unsupported codegen node type: ${t}`);
    }
  });
});
