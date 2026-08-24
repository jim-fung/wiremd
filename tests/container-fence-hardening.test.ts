import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser/index.js';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { remarkWiremdInlineContainers } from '../src/parser/remark-inline-containers.js';
import { remarkWiremdContainers } from '../src/parser/remark-containers.js';

/**
 * Regression tests for container fence (':::') parsing hardening:
 *
 * 1. Bare back-to-back closer runs (':::\n:::' with a blank line above) fold
 *    into ONE remark paragraph and used to close only a single nesting
 *    level, so the enclosing container swallowed every following block.
 * 2. A list as the last container child used to absorb the closing ':::'
 *    into its last item's text (lazy continuation) — 'CA\n:::'.
 * 3. remark-gfm autolinks URLs inside opener attributes, truncating the
 *    opener paragraph's first text child and losing the attribute.
 */

describe('container fence hardening', () => {
  describe('quirk 1: back-to-back closer paragraphs close every nesting level', () => {
    it('two demos separated by a heading both survive a bare :::\n::: closer run', () => {
      const input = `::: demo
::: card
### Title
[Buy]*

:::
:::

## After

::: demo
plain content
:::`;

      const result = parse(input);
      // ONE demo (not two) used to swallow the heading and the second demo.
      expect(result.children.map((c: any) => c.type)).toEqual([
        'demo',
        'heading',
        'demo',
      ]);

      const firstDemo = result.children[0];
      expect(firstDemo.children).toHaveLength(1);
      const card = firstDemo.children[0];
      expect(card).toMatchObject({ type: 'container', containerType: 'card' });
      expect(card.children.map((c: any) => c.type)).toEqual(['heading', 'button']);
      expect(card.children[0]).toMatchObject({ level: 3, content: 'Title' });
      expect(card.children[1]).toMatchObject({ type: 'button', content: 'Buy' });

      expect(result.children[1]).toMatchObject({ type: 'heading', level: 2, content: 'After' });

      const secondDemo = result.children[2];
      expect(secondDemo.type).toBe('demo');
      expect(secondDemo.children.map((c: any) => c.type)).toEqual(['paragraph']);
      expect(secondDemo.children[0].content).toBe('plain content');
    });

    it('a three-line closer run :::\n:::\n::: closes three nesting levels', () => {
      const input = `::: demo
::: card
::: section
x

:::
:::
:::

## After`;

      const result = parse(input);
      expect(result.children.map((c: any) => c.type)).toEqual(['demo', 'heading']);

      const demo = result.children[0];
      const card = demo.children[0];
      expect(card).toMatchObject({ type: 'container', containerType: 'card' });
      const section = card.children[0];
      expect(section).toMatchObject({ type: 'container', containerType: 'section' });
      expect(section.children.map((c: any) => c.type)).toEqual(['paragraph']);
      expect(section.children[0].content).toBe('x');

      expect(result.children[1]).toMatchObject({ type: 'heading', level: 2, content: 'After' });
    });

    it('tight closers with a content line directly above still work', () => {
      const input = `::: demo
::: card
Card body

:::
:::

## After`;

      const result = parse(input);
      expect(result.children.map((c: any) => c.type)).toEqual(['demo', 'heading']);
      const card = result.children[0].children[0];
      expect(card).toMatchObject({ type: 'container', containerType: 'card' });
      expect(card.children[0].content).toBe('Card body');
    });
  });

  describe('quirk 2: a trailing list must not absorb the closing fence', () => {
    it("parses '::: combobox\\n- US\\n- CA\\n:::' with clean list-item text", () => {
      const result = parse('::: combobox\n- US\n- CA\n:::');
      expect(result.children).toHaveLength(1);
      const combobox = result.children[0];
      expect(combobox.type).toBe('combobox');

      const list = combobox.children[0];
      expect(list.type).toBe('list');
      const items = list.children.map((item: any) => item.content);
      // The last item used to be 'CA\n:::'.
      expect(items).toEqual(['US', 'CA']);
      expect(JSON.stringify(combobox)).not.toContain(':::');
    });

    it('counts list-absorbed closer runs level by level', () => {
      const input = `::: demo
- a
- b
:::
:::

## After`;

      const result = parse(input);
      expect(result.children.map((c: any) => c.type)).toEqual(['demo', 'heading']);
      const list = result.children[0].children[0];
      expect(list.type).toBe('list');
      expect(list.children.map((item: any) => item.content)).toEqual(['a', 'b']);
      expect(result.children[1].content).toBe('After');
    });

    it('keeps a nested list intact when only its final ::: is absorbed', () => {
      const input = `::: sidebar
- [Home](#)
:::

## Outside`;

      const result = parse(input);
      expect(result.children.map((c: any) => c.type)).toEqual(['sidebar', 'heading']);
      const sidebar = result.children[0];
      const list = sidebar.children[0];
      expect(list.type).toBe('list');
      expect(JSON.stringify(list)).not.toContain(':::');
      expect(result.children[1].content).toBe('Outside');
    });
  });

  describe('quirk 3: gfm autolinks must not truncate opener attributes', () => {
    it('reconstructs the opener line so {addonStart:"https://…"} survives', () => {
      // remark-gfm autolinks the URL, splitting the opener paragraph into
      // text('::: input-group {addonStart:"') + link('https://example.com/"}').
      // Assert at the remark-plugin level: the wiremdBlock must carry the
      // complete, untruncated attributes string.
      const processor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkWiremdInlineContainers)
        .use(remarkWiremdContainers);
      const mdast: any = processor.runSync(processor.parse(
        '::: input-group {addonStart:"https://example.com/"}\n[username____]\n\n:::',
      ));

      expect(mdast.children).toHaveLength(1);
      const block = mdast.children[0];
      expect(block.type).toBe('wiremdBlock');
      expect(block.containerType).toBe('input-group');
      expect(block.attributes).toBe('{addonStart:"https://example.com/"}');
    });

    it('keeps the content line folded after a link-split opener and parses the prop', () => {
      const result = parse('::: input-group {addonStart:"https://example.com/"}\n[username____]\n\n:::');
      expect(result.children).toHaveLength(1);
      const group = result.children[0];
      expect(group.type).toBe('input-group');
      // The [username____] line used to vanish with the truncated opener.
      expect(group.children.map((c: any) => c.type)).toEqual(['input']);
      expect(group.children[0].props.placeholder).toBe('username');
      // Full URL survives both layers: the opener reconstruction (remark) and
      // the first-colon split in parseAttributes (transformer).
      expect(String(group.props.addonStart)).toBe('https://example.com/');
    });

    it('leaves ordinary paragraphs containing links untouched', () => {
      const result = parse('::: note\nSee [docs](https://example.com) here\n:::');
      const note = result.children[0];
      expect(note).toMatchObject({ type: 'container', containerType: 'note' });
      expect(note.children[0].type).toBe('paragraph');
      expect(JSON.stringify(note.children[0])).toContain('https://example.com');

      const plain = parse('Visit [docs](https://example.com) today');
      expect(plain.children[0].type).toBe('paragraph');
      expect(JSON.stringify(plain.children[0])).toContain('https://example.com');
    });
  });

  describe('particles-page-style settings block', () => {
    it('parses as one demo whose layout has both sidebar and main sections', () => {
      const input = `::: demo
::: layout {.sidebar-main}

::: sidebar
### Workspace
- Profile

:::

::: main
### Notifications
[Save changes]*

:::

:::
:::`;

      const result = parse(input);
      // Exactly ONE top-level demo — the trailing closer run must close
      // layout and demo without swallowing siblings.
      expect(result.children).toHaveLength(1);
      const demo = result.children[0];
      expect(demo.type).toBe('demo');

      const layout = demo.children[0];
      expect(layout).toMatchObject({ type: 'container', containerType: 'layout' });
      expect(layout.props.classes).toContain('sidebar-main');
      expect(layout.children.map((c: any) => c.type)).toEqual(['sidebar', 'container']);

      const sidebar = layout.children[0];
      expect(sidebar.type).toBe('sidebar');
      expect(sidebar.children.map((c: any) => c.type)).toEqual(['heading', 'list']);
      expect(sidebar.children[0]).toMatchObject({ level: 3, content: 'Workspace' });
      expect(sidebar.children[1].children[0].content).toBe('Profile');

      const main = layout.children[1];
      expect(main).toMatchObject({ type: 'container', containerType: 'main' });
      expect(main.children.map((c: any) => c.type)).toEqual(['heading', 'button']);
      expect(main.children[0]).toMatchObject({ level: 3, content: 'Notifications' });
      expect(main.children[1]).toMatchObject({ type: 'button', content: 'Save changes' });
    });
  });
});
