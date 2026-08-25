/**
 * coss codegen - coss parity family (accordion, collapsible, menu,
 * context-menu, toolbar).
 *
 * menu-item children are emitted internally by emitMenu/emitContextMenu and
 * never dispatched directly - the regression block pins that contract.
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import { describe, expect, test } from 'vitest';
import { generateCode } from '../src/codegen/coss/index.js';
import { parse } from '../src/index.js';
import type { WiremdNode } from '../src/types.js';

/** Canonical accordion: second item carries an explicit {.collapsed}. */
const ACCORDION_SRC = `::: accordion

::: accordion-item First question
First answer here.
:::

::: accordion-item Second question {.collapsed}
Second answer.
:::

:::`;

/** Canonical menu exercising every item flavor plus group label, separator, submenu. */
const MENU_SRC = `::: menu Actions
### File group
- New file {shortcut:"⌘N"}
- [x] Enable sync
- ( ) Light
- (x) Dark

---

- Delete {.danger}
- Share
  - Copy link
:::

::: context-menu Canvas zone
- Cut
- Copy
- Paste {disabled}
:::

::: toolbar
[Bold]* [Italic] [Underline]

---

[Save]
:::

::: collapsible Advanced settings {.collapsed}
Hidden settings content.
:::`;

describe('emitAccordion', () => {
  test('first item expands by default; later panels carry hidden (html)', () => {
    const ast = parse('::: accordion\n\n::: accordion-item A\na\n:::\n\n::: accordion-item B\nb\n:::\n\n:::');
    expect(ast.children[0].type).toBe('accordion');
    const out = generateCode(ast.children[0] as any);
    expect(out).toContain('border-b border-zinc-200 last:border-b-0');
    expect(out.match(/aria-expanded="true"/g)).toHaveLength(1);
    expect(out).toContain('>A</span>');
    expect(out).toContain('>B</span>');
    // First panel open, second panel hidden.
    const panels = [...out.matchAll(/<div class="overflow-hidden[^"]*"([^>]*)>/g)].map((m) => m[1]);
    expect(panels).toHaveLength(2);
    expect(panels[0]).not.toContain('hidden');
    expect(panels[1]).toContain('hidden');
  });

  test('explicit {.collapsed} opts the first item out of the default expansion (html)', () => {
    const ast = parse(ACCORDION_SRC);
    const out = generateCode(ast.children[0] as any);
    expect(out).not.toContain('aria-expanded="true"');
    expect(out.match(/aria-expanded="false"/g)).toHaveLength(2);
    expect(out.match(/" hidden>/g)).toHaveLength(2);
    expect(out).toContain('First question');
    expect(out).toContain('Second question');
    expect(out).toContain('First answer here.');
    expect(out).toContain('Second answer.');
  });

  test('jsx uses className and keeps the bare hidden attr on collapsed panels', () => {
    const ast = parse(ACCORDION_SRC);
    const jsx = generateCode(ast.children[0] as any, { format: 'jsx' });
    expect(jsx).toContain('className=');
    expect(jsx).not.toContain('class="');
    expect(jsx).toContain('hidden>');
    expect(jsx).toContain('aria-expanded="false"');
  });

  test('hand-built accordion node dispatches through the family table', () => {
    const out = generateCode({
      type: 'accordion',
      props: {},
      children: [
        {
          type: 'accordion-item',
          summary: 'First',
          expanded: true,
          props: {},
          children: [{ type: 'paragraph', content: 'Panel one.', props: {} }],
        },
        {
          type: 'accordion-item',
          summary: 'Second',
          expanded: false,
          props: {},
          children: [{ type: 'paragraph', content: 'Panel two.', props: {} }],
        },
      ],
    } as WiremdNode);
    expect(out).toMatch(/<button[^>]*aria-expanded="true"/);
    expect(out).toMatch(/<button[^>]*aria-expanded="false"/);
    expect(out).toContain('Panel one.');
    expect(out).toContain('" hidden>');
  });
});

describe('emitCollapsible', () => {
  test('default collapsible is expanded: no hidden attr, aria-expanded=true (html)', () => {
    const out = generateCode({
      type: 'collapsible',
      collapsed: false,
      props: { title: 'Advanced settings' },
      children: [{ type: 'paragraph', content: 'Visible settings.', props: {} }],
    } as WiremdNode);
    expect(out).toMatch(/<button[^>]*aria-expanded="true"/);
    expect(out).not.toMatch(/" hidden>/);
    expect(out).toContain('Advanced settings');
    expect(out).toContain('Visible settings.');
  });

  test('collapsed collapsible hides the panel (html + jsx)', () => {
    const ast = parse('::: collapsible Advanced settings {.collapsed}\nHidden settings content.\n:::');
    expect(ast.children[0].type).toBe('collapsible');
    const html = generateCode(ast.children[0] as any);
    expect(html).toMatch(/<button[^>]*aria-expanded="false"/);
    expect(html).toContain('" hidden>');
    expect(html).toContain('Hidden settings content.');
    const jsx = generateCode(ast.children[0] as any, { format: 'jsx' });
    expect(jsx).toContain('className=');
    expect(jsx).toContain('hidden>');
    expect(jsx).not.toContain('class="');
  });

  test('parses an expanded collapsible end-to-end', () => {
    const ast = parse('::: collapsible Advanced settings\nShown by default.\n:::');
    const out = generateCode(ast.children[0] as any);
    expect(out).toContain('aria-expanded="true"');
    expect(out).toContain('Shown by default.');
    expect(out).not.toMatch(/" hidden>/);
  });
});

describe('emitMenu', () => {
  test('trigger button with aria-haspopup + popup with role=menu (html + jsx)', () => {
    const ast = parse(MENU_SRC);
    const menu = ast.children[0];
    expect(menu.type).toBe('menu');
    const html = generateCode(menu as any);
    expect(html).toMatch(/<button[^>]*aria-haspopup="menu" aria-expanded="true">Actions/);
    expect(html).toMatch(/<div[^>]*role="menu">/);
    expect(html).toContain('New file');
    const jsx = generateCode(menu as any, { format: 'jsx' });
    expect(jsx).toContain('className=');
    expect(jsx).toMatch(/aria-haspopup="menu"/);
    expect(jsx).toMatch(/<div[^>]*role="menu">/);
  });

  test('shortcut renders inside a kbd element', () => {
    const out = generateCode({
      type: 'menu',
      props: { title: 'Actions' },
      children: [{ type: 'menu-item', content: 'New file', shortcut: '⌘N', props: {} }],
    } as unknown as WiremdNode);
    expect(out).toMatch(/<kbd[^>]*>⌘N<\/kbd>/);
  });

  test('gfm checkbox items become menuitemcheckbox with aria-checked', () => {
    const out = generateCode({
      type: 'menu',
      props: { title: 'Actions' },
      children: [
        { type: 'menu-item', content: 'Enable sync', indicator: 'check', checked: true, props: {} },
        { type: 'menu-item', content: 'Disable sync', indicator: 'check', checked: false, props: {} },
      ],
    } as unknown as WiremdNode);
    expect(out).toMatch(/role="menuitemcheckbox" aria-checked="true"/);
    expect(out).toMatch(/role="menuitemcheckbox" aria-checked="false"/);
    expect(out).toContain('✓');
  });

  test('radio items become menuitemradio with the dot indicator', () => {
    const ast = parse(MENU_SRC);
    const out = generateCode(ast.children[0] as any);
    expect(out).toMatch(/role="menuitemradio" aria-checked="false"><span[^>]*><\/span><span[^>]*>Light/);
    expect(out).toMatch(/role="menuitemradio" aria-checked="true"/);
    expect(out).toContain('●');
  });

  test('{.danger} renders the destructive (red) item classes', () => {
    const ast = parse(MENU_SRC);
    const out = generateCode(ast.children[0] as any);
    expect(out).toMatch(/class="[^"]*text-red-600[^"]*" role="menuitem"[^>]*><span[^>]*>Delete/);
  });

  test('{disabled} adds aria-disabled and the disabled class suffix', () => {
    const out = generateCode({
      type: 'menu',
      props: { title: 'Actions' },
      children: [{ type: 'menu-item', content: 'Paste', disabled: true, props: {} }],
    } as unknown as WiremdNode);
    expect(out).toMatch(/class="[^"]*pointer-events-none opacity-60" role="menuitem" aria-disabled="true"/);
  });

  test('heading becomes a group label div; standalone --- becomes a separator row', () => {
    const ast = parse(MENU_SRC);
    const out = generateCode(ast.children[0] as any);
    expect(out).toMatch(/<div[^>]*>File group<\/div>/);
    expect(out).toMatch(/<div[^>]*role="separator"><\/div>/);
  });

  test('nested list becomes a submenu: caret span plus indented sub-list', () => {
    const ast = parse(MENU_SRC);
    const out = generateCode(ast.children[0] as any);
    expect(out).toContain('▸');
    expect(out).toMatch(/<div[^>]*ml-6 border-l border-zinc-100 pl-2[^>]*>/);
    const shareIdx = out.indexOf('>Share</span>');
    const caretIdx = out.indexOf('▸');
    const subIdx = out.indexOf('Copy link');
    expect(shareIdx).toBeGreaterThan(-1);
    expect(caretIdx).toBeGreaterThan(shareIdx);
    expect(subIdx).toBeGreaterThan(caretIdx);
  });

  test('menu-item never dispatches through generateCode directly', () => {
    expect(() =>
      generateCode({ type: 'menu-item', content: 'New file', props: {} } as unknown as WiremdNode),
    ).toThrow('Unsupported codegen node type: menu-item');
  });
});

describe('emitContextMenu', () => {
  test('dashed zone div (not a button) plus popup with role=menu (html)', () => {
    const ast = parse(MENU_SRC);
    const ctx = ast.children.find((c) => c.type === 'context-menu')!;
    expect(ctx.type).toBe('context-menu');
    const out = generateCode(ctx as any);
    expect(out).toMatch(/<div[^>]*border-dashed[^>]*data-wmd-context-zone>Canvas zone<\/div>/);
    expect(out).not.toContain('<button');
    expect(out).not.toContain('aria-haspopup');
    expect(out).toMatch(/<div[^>]*role="menu">/);
    expect(out).toContain('>Cut</span>');
    expect(out).toContain('>Paste</span>');
    expect(out).toMatch(/aria-disabled="true"/);
  });

  test('jsx keeps the zone div and className', () => {
    const ast = parse(MENU_SRC);
    const ctx = ast.children.find((c) => c.type === 'context-menu')!;
    const jsx = generateCode(ctx as any, { format: 'jsx' });
    expect(jsx).toContain('className=');
    expect(jsx).not.toContain('class="');
    expect(jsx).toContain('data-wmd-context-zone');
    expect(jsx).toMatch(/<div[^>]*role="menu">/);
  });

  test('parses ::: context-menu end-to-end from a standalone source', () => {
    const ast = parse('::: context-menu Canvas zone\n- Cut\n- Copy\n- Paste {disabled}\n:::');
    expect(ast.children[0].type).toBe('context-menu');
    const out = generateCode(ast.children[0] as any);
    expect(out).toContain('Canvas zone');
    expect(out).toContain('Copy');
  });
});

describe('emitToolbar', () => {
  test('role=toolbar wrapper with vertical separator spans (html)', () => {
    const ast = parse(MENU_SRC);
    const toolbar = ast.children.find((c) => c.type === 'toolbar')!;
    expect(toolbar.type).toBe('toolbar');
    const out = generateCode(toolbar as any);
    expect(out).toMatch(/<div role="toolbar"/);
    expect(out).toMatch(/<span role="separator" aria-orientation="vertical"/);
    expect(out).toContain('>Bold</button>');
    expect(out).toContain('>Save</button>');
  });

  test('jsx keeps role attributes and uses className', () => {
    const jsx = generateCode({
      type: 'toolbar',
      props: {},
      children: [
        { type: 'button', content: 'Bold', props: { variant: 'primary' } },
        { type: 'separator', props: {} },
        { type: 'button', content: 'Save', props: {} },
      ],
    } as unknown as WiremdNode, { format: 'jsx' });
    expect(jsx).toMatch(/<div role="toolbar" className=/);
    expect(jsx).toMatch(/<span role="separator" aria-orientation="vertical" className=/);
  });

  test('parses ::: toolbar end-to-end with bracket buttons and --- separator', () => {
    const ast = parse('::: toolbar\n[Bold]* [Italic]\n\n---\n\n[Save]\n:::');
    expect(ast.children[0].type).toBe('toolbar');
    const out = generateCode(ast.children[0] as any);
    expect(out).toMatch(/<div role="toolbar"/);
    expect(out).toMatch(/aria-orientation="vertical"/);
    expect(out).toContain('Italic');
  });
});

describe('coss parity family regression: exclusion list still throws', () => {
  test('menu-item fed directly to the dispatcher throws', () => {
    expect(() =>
      generateCode({ type: 'menu-item', content: 'Cut', props: {} } as unknown as WiremdNode),
    ).toThrow('Unsupported codegen node type: menu-item');
  });
});
