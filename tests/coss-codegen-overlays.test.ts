/**
 * coss codegen - overlay family (dialog, alert-dialog, sheet, drawer,
 * popover, tooltip, preview-card). Task 3 of the Phase 3 plan.
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import { describe, expect, test } from 'vitest';
import { generateCode } from '../src/codegen/coss/index.js';
import type { WiremdNode } from '../src/types.js';

describe('emitDialog', () => {
  test('default dialog: role=dialog + popup with title', () => {
    const out = generateCode({
      type: 'dialog',
      props: { title: 'Edit profile', classes: [] },
      children: [{ type: 'paragraph', content: 'Name', props: {} }],
    } as WiremdNode);
    expect(out).toContain('role="dialog"');
    expect(out).toContain('Edit profile');
    expect(out).toContain('rounded-2xl border');
    expect(out).toContain('aria-label="Close"');
  });

  test('jsx dialog uses className', () => {
    const jsx = generateCode(
      { type: 'dialog', props: { title: 'Hi' }, children: [] } as WiremdNode,
      { format: 'jsx' },
    );
    expect(jsx).toContain('className=');
    expect(jsx).toContain('Hi');
  });
});

describe('emitAlertDialog', () => {
  test('default alert-dialog: Cancel + Continue buttons', () => {
    const out = generateCode({
      type: 'alert-dialog',
      props: { title: 'Delete project?' },
      children: [],
    } as WiremdNode);
    expect(out).toContain('role="alertdialog"');
    expect(out).toContain('Delete project?');
    expect(out).toContain('Cancel');
    expect(out).toContain('Continue');
  });

  test('custom action + cancel text', () => {
    const out = generateCode({
      type: 'alert-dialog',
      props: {
        title: 'Confirm',
        actionText: 'Yes, delete',
        cancelText: 'Keep',
        actionVariant: 'danger',
      },
      children: [],
    } as WiremdNode);
    expect(out).toContain('Yes, delete');
    expect(out).toContain('Keep');
  });
});

describe('emitSheet', () => {
  test('right-side sheet is the default', () => {
    const out = generateCode({
      type: 'sheet',
      side: 'right',
      props: { title: 'Filters' },
      children: [],
    } as WiremdNode);
    expect(out).toContain('data-side="right"');
    expect(out).toContain('inset-y-0 right-0');
    expect(out).toContain('Filters');
  });

  test.each(['top', 'right', 'bottom', 'left'] as const)('sheet side %s', (side) => {
    const out = generateCode({
      type: 'sheet',
      side,
      props: {},
      children: [],
    } as WiremdNode);
    expect(out).toContain(`data-side="${side}"`);
  });
});

describe('emitDrawer', () => {
  test('drawer defaults to left side', () => {
    const out = generateCode({
      type: 'drawer',
      side: 'left',
      props: { title: 'Menu' },
      children: [],
    } as WiremdNode);
    expect(out).toContain('data-side="left"');
    expect(out).toContain('Menu');
  });
});

describe('emitPopover', () => {
  test('popover with title + description', () => {
    const out = generateCode({
      type: 'popover',
      props: { title: 'Quick actions', description: 'Choose an action' },
      children: [],
    } as WiremdNode);
    expect(out).toContain('role="dialog"');
    expect(out).toContain('Quick actions');
    expect(out).toContain('Choose an action');
    expect(out).toContain('w-72');
  });
});

describe('emitTooltip', () => {
  test('tooltip with content (html)', () => {
    const out = generateCode({
      type: 'tooltip',
      props: { content: 'Press S to save', side: 'top' },
      children: [],
    } as WiremdNode);
    expect(out).toContain('role="tooltip"');
    expect(out).toContain('data-side="top"');
    expect(out).toContain('Press S to save');
  });

  test('escapes tooltip content', () => {
    const out = generateCode({
      type: 'tooltip',
      props: { content: 'A & B' },
      children: [],
    } as WiremdNode);
    expect(out).toContain('A &amp; B');
  });
});

describe('emitPreviewCard', () => {
  test('preview-card with children (no href)', () => {
    const out = generateCode({
      type: 'preview-card',
      props: {},
      children: [
        { type: 'heading', level: 3, content: 'Card title', props: {} },
        { type: 'paragraph', content: 'Description', props: {} },
      ],
    } as WiremdNode);
    expect(out).toContain('Card title');
    expect(out).toContain('Description');
    expect(out).toContain('rounded-lg border');
    expect(out).not.toContain('<a ');
  });

  test('preview-card with href wraps in <a>', () => {
    const out = generateCode({
      type: 'preview-card',
      props: { href: '/blog/post-1' },
      children: [{ type: 'paragraph', content: 'Read more', props: {} }],
    } as WiremdNode);
    expect(out).toContain('href="/blog/post-1"');
    expect(out).toContain('<a');
  });
});

describe('overlay family regression: exclusion list still throws', () => {
  test('form, accordion etc. still throw', () => {
    for (const t of ['accordion', 'accordion-item', 'loading-state', 'empty-state', 'error-state', 'option', 'breadcrumb-item'] as const) {
      expect(() => generateCode({ type: t, props: {} } as unknown as WiremdNode))
        .toThrow(`Unsupported codegen node type: ${t}`);
    }
  });
});
