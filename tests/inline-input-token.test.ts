import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser/index.js';
import { renderToHTML } from '../src/renderer/index.js';
import type { WiremdNode } from '../src/types.js';

// Walks a node tree and collects any null/undefined children or content slots.
function collectNullNodes(node: any, path: string, offenders: string[]): void {
  if (node === null || node === undefined) {
    offenders.push(path);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((child, i) => collectNullNodes(child, `${path}[${i}]`, offenders));
    return;
  }
  if (typeof node === 'object') {
    if (Array.isArray(node.children)) {
      node.children.forEach((child: any, i: number) =>
        collectNullNodes(child, `${path}.children[${i}]`, offenders)
      );
    }
  }
}

function expectNoNulls(node: WiremdNode, rootLabel: string): void {
  const offenders: string[] = [];
  collectNullNodes(node, rootLabel, offenders);
  expect(offenders, `null slots found at: ${offenders.join(', ')}`).toEqual([]);
}

describe('Inline input tokens in paragraphs', () => {
  it('parses "Email [____]" as [text, input] with no null slots anywhere in the tree', () => {
    const doc = parse('Email [____]');
    expect(doc.children).toHaveLength(1);
    const para = doc.children[0];
    expect(para.type).toBe('paragraph');
    expect((para as any).children).toHaveLength(2);
    expect((para as any).children[0]).toMatchObject({ type: 'text', content: 'Email ' });
    expect((para as any).children[1]).toMatchObject({ type: 'input' });
    expectNoNulls(doc as any, 'doc');
  });

  it('parses "Name [____] [Submit]*" as [text, input, button] siblings in order', () => {
    const doc = parse('Name [____] [Submit]*');
    expect(doc.children).toHaveLength(1);
    const para = doc.children[0];
    expect(para.type).toBe('paragraph');
    const children = (para as any).children;
    expect(children).toHaveLength(3);
    expect(children[0]).toMatchObject({ type: 'text', content: 'Name ' });
    expect(children[1]).toMatchObject({ type: 'input' });
    expect(children[2]).toMatchObject({ type: 'button', content: 'Submit' });
    expect((children[2] as any).props.variant).toBe('primary');
    expectNoNulls(doc as any, 'doc');
  });

  it('still parses standalone "[____]" as an input', () => {
    const doc = parse('[____]');
    expect(doc.children).toHaveLength(1);
    expect(doc.children[0]).toMatchObject({ type: 'input' });
    expectNoNulls(doc as any, 'doc');
  });

  it('extracts placeholder text from inline labeled inputs like "Search [Email___]"', () => {
    const doc = parse('Search [Email___]');
    const para: any = doc.children[0];
    expect(para.type).toBe('paragraph');
    expect(para.children[1]).toMatchObject({ type: 'input' });
    expect(para.children[1].props.placeholder).toBe('Email');
    expectNoNulls(doc as any, 'doc');
  });

  it('does not regress inline buttons: "Save [Save]* now"', () => {
    const doc = parse('Save [Save]* now');
    const para: any = doc.children[0];
    expect(para.type).toBe('paragraph');
    const children = para.children;
    expect(children).toHaveLength(3);
    expect(children[0]).toMatchObject({ type: 'text', content: 'Save ' });
    expect(children[1]).toMatchObject({ type: 'button', content: 'Save' });
    expect(children[1].props.variant).toBe('primary');
    expect(children[2]).toMatchObject({ type: 'text', content: ' now' });
    expectNoNulls(doc as any, 'doc');
  });

  it('does not regress inline dropdowns: "Pick [Option___v] now"', () => {
    const doc = parse('Pick [Option___v] now');
    const para: any = doc.children[0];
    expect(para.type).toBe('paragraph');
    const children = para.children;
    expect(children).toHaveLength(3);
    expect(children[0]).toMatchObject({ type: 'text', content: 'Pick ' });
    expect(children[1]).toMatchObject({ type: 'select' });
    expect(children[1].props.placeholder).toBe('Option');
    expect(children[2]).toMatchObject({ type: 'text', content: ' now' });
    expectNoNulls(doc as any, 'doc');
  });

  it('renders "Email [____]" to HTML containing a wmd-input element', () => {
    const html = renderToHTML(parse('Email [____]'));
    expect(html).toContain('wmd-input');
    expect(html).toMatch(/<input[^>]*class="[^"]*wmd-input/);
  });
});
