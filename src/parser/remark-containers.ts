/**
 * Custom remark plugin to parse container directives (:::)
 * Handles syntax like:
 * ::: container-type {.class attr="value"}
 * content
 * :::
 *
 * Supports nested containers, implicit closing, and opener-content extraction.
 *
 * Copyright (c) 2025 wiremd
 * Licensed under MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import type { Plugin } from 'unified';

interface ContainerOpener {
  containerType: string;
  attrs: string;
  inline: string;
}

/** Opener line grammar: '::: type {attrs}… inline-content'. */
const OPENER_RE = /^:::\s*(\S+)((?:\s*\{[^}]+\})*)\s*(.*)$/;

function openerFromMatch(match: RegExpMatchArray): ContainerOpener {
  return {
    containerType: (match[1] || 'section').trim(),
    attrs: (match[2] || '').trim(),
    inline: (match[3] || '').trim(),
  };
}

/**
 * Rebuild the source text of a paragraph whose opener line was split across
 * several inline children. remark-gfm (which runs before this plugin)
 * autolinks URLs inside {…} attributes, so an opener like
 * '::: input-group {addonStart:"https://example.com/"}' reaches us as
 * text('::: input-group {addonStart:"') + link('https://example.com/"}').
 * text children contribute their value verbatim, link children their url,
 * breaks a newline.
 */
function reconstructOpenerLine(node: any): string {
  return (node.children || [])
    .map((child: any) => {
      if (child.type === 'text') return child.value;
      if (child.type === 'link') return child.url;
      if (child.type === 'break') return '\n';
      return '';
    })
    .join('');
}

/** Parse a paragraph node as a container opener. Returns null if not an opener. */
function parseContainerOpener(node: any): ContainerOpener | null {
  if (
    node.type !== 'paragraph' ||
    !node.children?.length ||
    node.children[0].type !== 'text'
  )
    return null;

  const firstLine = (node.children[0].value as string).split('\n')[0].trim();
  // Collect every consecutive {…} group on the opener line as attributes.
  // Anything after the last {…} group is inline content. Example:
  //   ::: toggle {.active} {label:"Bold"}   →   attrs="{.active} {label:\"Bold\"}"
  const match = firstLine.match(OPENER_RE);

  // GFM autolink repair: the first text child is truncated at the autolinked
  // URL, which either fails the opener regex or strands an unterminated {…
  // group at the end of the line (e.g. '::: input-group {addonStart:"').
  // Rebuild the full line from all paragraph children and re-match. The
  // reconstruction only feeds the OPENER match — container children keep
  // their mdast shape, so ordinary paragraphs containing links elsewhere
  // are unaffected.
  if (node.children.length > 1 && (!match || /\{[^}]*$/.test(firstLine))) {
    const rebuiltLine = reconstructOpenerLine(node).split('\n')[0].trim();
    const rebuiltMatch = rebuiltLine.match(OPENER_RE);
    if (rebuiltMatch) return openerFromMatch(rebuiltMatch);
  }

  if (!match) return null;
  return openerFromMatch(match);
}

/**
 * Count the ':::' closers in a paragraph that remark folded into a single
 * node. A bare closer run — consecutive ':::' lines with no blank line
 * between them and no content line above (e.g. the ':::\n:::' ending a
 * '::: card'-in-'::: demo' nesting) — becomes ONE paragraph whose text is
 * ':::\n:::'. Each ':::' line in the run closes exactly one nesting level,
 * so the whole paragraph is worth N closers, not one. Returns 0 for
 * anything that is not a pure ':::' run.
 */
function closerRunCount(node: any): number {
  if (
    node.type !== 'paragraph' ||
    !node.children?.length ||
    node.children[0].type !== 'text'
  ) {
    return 0;
  }
  const value = (node.children[0].value as string).trim();
  if (!value) return 0;
  const lines = value.split('\n');
  if (!lines.every((line) => line.trim() === ':::')) return 0;
  // Inline siblings after the ':::' text (e.g. ':::' then a link on the next
  // line) keep the legacy single-closer shape: only a lone ':::' line counts.
  if (node.children.length > 1) return lines.length === 1 ? 1 : 0;
  return lines.length;
}

function makeContainerNode(
  containerType: string,
  attrs: string,
  children: any[],
): any {
  return {
    // Use a custom mdast type that does not collide with any remark-gfm
    // directive (e.g. `container`, `containerDirective`). Otherwise gfm's
    // directive normalizer walks our node, eats the trailing `{attrs}` chunk
    // as a `children` paragraph, and zeroes our `attributes` field.
    type: 'wiremdBlock',
    containerType,
    attributes: attrs,
    children,
    data: {
      hName: 'div',
      hProperties: {
        className: ['wiremd-container', `wiremd-${containerType}`],
      },
    },
  };
}

/**
 * Collect and build a container starting at nodes[startIdx] (the opener paragraph).
 * Returns the container node and the index of the first node after the container.
 */
/**
 * Strip every trailing ':::' closer line off a text value.
 * Returns [valueWithoutClosers, closerCount].
 */
function stripTrailingClosers(value: string): [string, number] {
  const match = value.match(/(?:\n:::)+$/) ?? (value.trim() === ':::' ? [value] : null);
  if (!match) return [value, 0];
  const count = (match[0].match(/:::/g) || []).length;
  return [value.slice(0, value.length - match[0].length), count];
}

interface CloserStrip {
  /** Replacement node, or null when nothing worth keeping remains. */
  node: any | null;
  /** Number of ':::' lines stripped off the end. */
  count: number;
  /**
   * Whether this block terminates the container. Mirrors the legacy
   * implicit-closer signal: the last text contains a '\n:::' marker, even
   * when no trailing run could be stripped.
   */
  closed: boolean;
}

/**
 * Strip a ':::' closer run folded into the last text child of a paragraph
 * (remark merges content and closer into one paragraph when no blank line
 * separates them, e.g. '[Save]*\n:::').
 */
function stripFoldedCloserInParagraph(para: any): CloserStrip {
  const lastInline = para.children[para.children.length - 1];
  if (
    lastInline?.type !== 'text' ||
    !(lastInline.value as string).includes('\n:::')
  ) {
    return { node: para, count: 0, closed: false };
  }
  const [stripped, count] = stripTrailingClosers(lastInline.value as string);
  const trimmed = stripped.trimEnd();
  const keep = trimmed || para.children.length > 1;
  return {
    node: keep
      ? {
          ...para,
          children: [
            ...para.children.slice(0, -1),
            ...(trimmed ? [{ ...lastInline, value: trimmed }] : []),
          ],
        }
      : null,
    count,
    closed: true,
  };
}

/**
 * Strip a ':::' closer run absorbed into the last block of a container child.
 * Handles paragraphs directly, and lists whose last item swallowed the closer
 * via markdown lazy continuation ('- US\n- CA\n:::' parses with the last
 * item's text as 'CA\n:::'). The stripped ':::' lines are counted as closers
 * at the source instead of leaking into list-item text.
 */
function stripFoldedCloserInBlock(node: any): CloserStrip {
  if (node.type === 'paragraph' && node.children?.length) {
    return stripFoldedCloserInParagraph(node);
  }
  if (node.type === 'list' && node.children?.length) {
    const lastItem = node.children[node.children.length - 1];
    const inner = stripFoldedCloserInListItem(lastItem);
    if (!inner.closed) return { node, count: 0, closed: false };
    const itemChildren = node.children.slice(0, -1);
    if (inner.node) itemChildren.push(inner.node);
    return itemChildren.length
      ? { node: { ...node, children: itemChildren }, count: inner.count, closed: true }
      : { node: null, count: inner.count, closed: true };
  }
  return { node, count: 0, closed: false };
}

function stripFoldedCloserInListItem(item: any): CloserStrip {
  if (!item.children?.length) return { node: item, count: 0, closed: false };
  const lastBlock = item.children[item.children.length - 1];
  const inner = stripFoldedCloserInBlock(lastBlock);
  if (!inner.closed) return { node: item, count: 0, closed: false };
  const children = item.children.slice(0, -1);
  if (inner.node) children.push(inner.node);
  return children.length
    ? { node: { ...item, children }, count: inner.count, closed: true }
    : { node: null, count: inner.count, closed: true };
}

function finishContainer(
  containerType: string,
  attrs: string,
  inline: string,
  children: any[],
  nextIndex: number,
  extraClosers = 0,
): { node: any; nextIndex: number; extraClosers: number } {
  const node = makeContainerNode(containerType, attrs, children);
  if (inline) node.inline = inline;
  if (containerType === 'demo') {
    node.rawContent = mdastNodesToText(children);
  }
  return { node, nextIndex, extraClosers };
}

/** Safety cap for nested ::: containers; beyond this we stop recursing instead of overflowing the stack. */
const MAX_CONTAINER_DEPTH = 100;

/**
 * Extract the content children that follow the opener line inside the opener
 * paragraph (remark folds the first content line into the opener paragraph
 * when no blank line separates them). For a single-text paragraph this is
 * simply every line after the first. When inline nodes (gfm autolinks) split
 * the paragraph, the line break lives in one of the text children: the tail
 * of that child plus every following child make up the content — preserving
 * their inline mdast shape.
 */
function extractAfterOpenerChildren(node: any): any[] | null {
  const children = node.children ?? [];
  if (children.length === 1 && children[0].type === 'text') {
    const rest = (children[0].value as string).split('\n').slice(1).join('\n').trim();
    return rest ? [{ type: 'text', value: rest }] : null;
  }
  const breakIdx = children.findIndex(
    (ch: any) => ch.type === 'text' && (ch.value as string).includes('\n'),
  );
  if (breakIdx === -1) return null;
  const head = children[breakIdx];
  const rest = (head.value as string).split('\n').slice(1).join('\n').trim();
  const restChildren = [
    ...(rest ? [{ ...head, value: rest }] : []),
    ...children.slice(breakIdx + 1),
  ];
  return restChildren.length ? restChildren : null;
}

function collectContainer(
  nodes: any[],
  startIdx: number,
  depth = 0,
): { node: any; nextIndex: number; extraClosers: number } {
  const openerNode = nodes[startIdx];
  const opener = parseContainerOpener(openerNode)!;

  // === CASE 1: Complete container in a single plain-text paragraph ===
  // e.g. ":::card\ncontent\n:::" — no blank lines, no inline elements.
  // A run of several ':::' lines closes this container once; the extras belong
  // to enclosing containers and are reported back via extraClosers.
  if (
    openerNode.children.length === 1 &&
    openerNode.children[0].type === 'text'
  ) {
    const fullText = openerNode.children[0].value as string;
    const lines = fullText.split('\n');
    let closingIdx = -1;
    let closerCount = 0;
    for (let j = lines.length - 1; j >= 1; j--) {
      if (lines[j].trim() === ':::') {
        closerCount++;
        closingIdx = j;
      } else break;
    }
    if (closingIdx > 0) {
      const contentText = lines.slice(1, closingIdx).join('\n').trim();
      const children: any[] = [];
      if (opener.inline) {
        children.push({
          type: 'paragraph',
          children: [{ type: 'text', value: opener.inline }],
        });
      }
      if (contentText) {
        children.push({
          type: 'paragraph',
          children: [{ type: 'text', value: contentText }],
        });
      }
      return finishContainer(opener.containerType, opener.attrs, opener.inline, children, startIdx + 1, closerCount - 1);
    }
  }

  // === CASE 2: Complete container in a single paragraph with inline elements ===
  // e.g. ":::card\nSome **bold** text\n:::" — trailing ':::' lines are stripped
  // (all of them; extras belong to enclosing containers).
  const lastChild = openerNode.children[openerNode.children.length - 1];
  if (
    lastChild?.type === 'text' &&
    (lastChild.value.trim().endsWith(':::') ||
      /\n:::\s*$/.test(lastChild.value))
  ) {
    const [strippedLast, strippedCount] = stripTrailingClosers(lastChild.value as string);
    const processedChildren: any[] = [];
    let startChildIdx = 0;
    if (openerNode.children[0].type === 'text') {
      const firstLines = (openerNode.children[0].value as string).split('\n');
      if (firstLines.length > 1 && firstLines[1].trim()) {
        processedChildren.push({
          type: 'text',
          value: firstLines.slice(1).join('\n').trim(),
        });
      }
      startChildIdx = 1;
    }
    for (let j = startChildIdx; j < openerNode.children.length; j++) {
      const ch = openerNode.children[j];
      if (j === openerNode.children.length - 1 && ch.type === 'text') {
        const value = strippedLast.trim();
        if (value) processedChildren.push({ ...ch, value });
      } else {
        processedChildren.push(ch);
      }
    }
    const contentChildren =
      processedChildren.length > 0
        ? [{ type: 'paragraph', children: processedChildren }]
        : [];
    if (opener.inline) {
      contentChildren.unshift({
        type: 'paragraph',
        children: [{ type: 'text', value: opener.inline }],
      });
    }
    return finishContainer(opener.containerType, opener.attrs, opener.inline, contentChildren, startIdx + 1, Math.max(0, strippedCount - 1));
  }

  // === CASE 3: Multi-block container — collect until matching closer ::: ===
  const containerChildren: any[] = [];

  // Opener-content extraction: inline text on the same line as the opener
  if (opener.inline) {
    containerChildren.push({
      type: 'paragraph',
      children: [{ type: 'text', value: opener.inline }],
    });
  }

  // The opener paragraph may contain content after the ":::type" line when there
  // is no blank line between the opener and the first content line, e.g.:
  //   ::: row
  //   [Search___]{type:search}
  // Remark folds both into one paragraph, so we must extract trailing lines.
  // If the trailing content is itself a container opener (e.g. ::: card folded into
  // ::: demo with no blank line), collect it recursively instead of pushing as text.
  let pendingAfterOpener: any = null;
  const afterChildren = extractAfterOpenerChildren(openerNode);
  if (afterChildren) {
    const syntheticPara = {
      type: 'paragraph',
      children: afterChildren,
    };
    if (parseContainerOpener(syntheticPara)) {
      pendingAfterOpener = syntheticPara;
    } else {
      containerChildren.push(syntheticPara);
    }
  }

  let i = startIdx + 1;

  if (pendingAfterOpener) {
    // Build a virtual list so collectContainer can consume the nested opener
    // plus the real nodes that follow it.
    const virtualNodes = [pendingAfterOpener, ...nodes.slice(startIdx + 1)];
    const inner = collectContainer(virtualNodes, 0, depth + 1);
    containerChildren.push(inner.node);
    // inner.nextIndex is relative to virtualNodes whose [0] is the synthetic para;
    // real nodes start at startIdx+1, so advance i by (inner.nextIndex - 1).
    i = startIdx + inner.nextIndex;
    // If the nested container swallowed closers meant for outer levels, this
    // container is the next level to close.
    if (inner.extraClosers > 0) {
      return finishContainer(opener.containerType, opener.attrs, opener.inline, containerChildren, i, inner.extraClosers - 1);
    }
  }

  while (i < nodes.length) {
    const child = nodes[i];

    // Closer paragraph — possibly a folded run of several ':::' lines
    // (':::\n:::'). Each line closes one nesting level; extras propagate to
    // enclosing containers via extraClosers.
    const closerRun = closerRunCount(child);
    if (closerRun > 0) {
      i++;
      return finishContainer(
        opener.containerType,
        opener.attrs,
        opener.inline,
        containerChildren,
        i,
        closerRun - 1,
      );
    }

    // Nested container opener — recurse (must precede implicit-closer check so that
    // a paragraph like "::: tab Label\ncontent\n:::" is treated as a nested container,
    // not as an implicit closer for the outer container).
    if (parseContainerOpener(child)) {
      if (depth >= MAX_CONTAINER_DEPTH) {
        // Depth cap hit: treat the opener as plain content rather than
        // recursing (avoids RangeError on pathologically nested input).
        containerChildren.push(child);
        i++;
        continue;
      }
      const inner = collectContainer(nodes, i, depth + 1);
      containerChildren.push(inner.node);
      i = inner.nextIndex;
      // Closers beyond the ones the nested level needed terminate THIS level;
      // any remainder keeps propagating to enclosing containers.
      if (inner.extraClosers > 0) {
        return finishContainer(opener.containerType, opener.attrs, opener.inline, containerChildren, i, inner.extraClosers - 1);
      }
      continue;
    }

    // Implicit closer: a block whose last text ends with a ':::' run folded
    // in by remark (no blank line before the closer). Handles paragraphs
    // ('[Save]*\n:::') and lists whose last item absorbed the fence
    // ('- US\n- CA\n:::' → item text 'CA\n:::'). Multiple consecutive ':::'
    // lines close multiple nesting levels at once.
    const fence = stripFoldedCloserInBlock(child);
    if (fence.closed) {
      if (fence.node) containerChildren.push(fence.node);
      return finishContainer(
        opener.containerType,
        opener.attrs,
        opener.inline,
        containerChildren,
        i + 1,
        Math.max(0, fence.count - 1),
      );
    }

    containerChildren.push(child);
    i++;
  }

  return finishContainer(opener.containerType, opener.attrs, opener.inline, containerChildren, i);
}

/** Reconstruct wiremd source text from MDAST inline children. */
function mdastInlinesToText(children: any[]): string {
  return (children || []).map((child: any) => {
    switch (child.type) {
      case 'text': return child.value;
      case 'strong': return '**' + mdastInlinesToText(child.children) + '**';
      case 'emphasis': return '_' + mdastInlinesToText(child.children) + '_';
      case 'inlineCode': return '`' + child.value + '`';
      case 'link': return '[' + mdastInlinesToText(child.children) + '](' + child.url + ')';
      case 'image': return '![' + (child.alt || '') + '](' + child.url + ')';
      default: return '';
    }
  }).join('');
}

/** Reconstruct wiremd source text from a list of MDAST block nodes. */
function mdastNodesToText(nodes: any[]): string {
  return nodes.map((node: any) => {
    switch (node.type) {
      case 'heading':
        return '#'.repeat(node.depth) + ' ' + mdastInlinesToText(node.children);
      case 'paragraph':
        return mdastInlinesToText(node.children);
      case 'list':
        return node.children.map((item: any) => {
          const prefix = node.ordered
            ? '1. '
            : item.checked === true ? '- [x] '
            : item.checked === false ? '- [ ] '
            : '- ';
          return prefix + mdastNodesToText(item.children || []).replace(/\n/g, '\n  ');
        }).join('\n');
      case 'table': {
        const rows: string[][] = node.children.map((row: any) =>
          row.children.map((cell: any) => mdastInlinesToText(cell.children || []))
        );
        if (!rows.length) return '';
        const colWidths = rows[0].map((_: any, ci: number) =>
          Math.max(...rows.map((r: string[]) => (r[ci] || '').length), 3)
        );
        const formatRow = (cells: string[]) =>
          '| ' + cells.map((c, i) => c.padEnd(colWidths[i])).join(' | ') + ' |';
        const separator = '| ' + colWidths.map(w => '-'.repeat(w)).join(' | ') + ' |';
        return [formatRow(rows[0]), separator, ...rows.slice(1).map(formatRow)].join('\n');
      }
      case 'code':
        return '```' + (node.lang || '') + '\n' + node.value + '\n```';
      case 'blockquote':
        return mdastNodesToText(node.children).split('\n').map((l: string) => '> ' + l).join('\n');
      case 'wiremdBlock': {
        const inlineSuffix = node.inline ? ' ' + node.inline : '';
        const attrs = node.attributes ? ' ' + node.attributes : '';
        const opener = '::: ' + node.containerType + inlineSuffix + attrs;
        // Skip the first child if it was injected from opener.inline (it's on the opener line)
        let children = node.children || [];
        if (node.inline) {
          const first = children[0];
          if (first?.type === 'paragraph' &&
              first.children?.length === 1 &&
              first.children[0]?.type === 'text' &&
              first.children[0].value?.trim() === node.inline) {
            children = children.slice(1);
          }
        }
        return opener + '\n' + mdastNodesToText(children) + '\n:::';
      }
      default:
        return '';
    }
  }).filter(Boolean).join('\n\n');
}

/**
 * Explode a flat multi-line container paragraph (::: directives folded together
 * with content lines, e.g. "::: grid-3\n::: card\nText\n:::\n:::") into one
 * synthetic paragraph per line so the normal nesting machinery sees distinct
 * opener/closer nodes. Applies only to pure-text paragraphs — anything with
 * inline markup keeps the legacy single-paragraph handling.
 */
function explodeFlatContainerParagraph(node: any): any[] | null {
  if (
    node.type !== 'paragraph' ||
    node.children?.length !== 1 ||
    node.children[0].type !== 'text'
  ) {
    return null;
  }
  const lines = (node.children[0].value as string).split('\n');
  if (!/^:::\s*\S+/.test(lines[0].trim())) return null;
  const isDirectiveLine = (line: string) =>
    /^:::(\s|$)/.test(line.trim()) && line.trim().length >= 3;
  if (!lines.slice(1).some(isDirectiveLine)) return null;

  const out: any[] = [];
  let buffer: string[] = [];
  const flush = () => {
    if (buffer.length) {
      out.push({
        type: 'paragraph',
        children: [{ type: 'text', value: buffer.join('\n') }],
      });
      buffer = [];
    }
  };
  for (const line of lines) {
    if (isDirectiveLine(line)) {
      flush();
      out.push({
        type: 'paragraph',
        children: [{ type: 'text', value: line.trim() }],
      });
    } else {
      buffer.push(line);
    }
  }
  flush();
  return out.length > 1 ? out : null;
}

/** Process a flat array of AST nodes and return nodes with containers properly nested. */
function processNodes(nodes: any[]): any[] {
  const result: any[] = [];
  let i = 0;

  while (i < nodes.length) {
    const node = nodes[i];

    const exploded = explodeFlatContainerParagraph(node);
    if (exploded) {
      nodes.splice(i, 1, ...exploded);
      continue;
    }

    if (closerRunCount(node) > 0) {
      // A ':::' (or folded ':::' run) with no open container above it is a
      // dangling terminator — drop it.
      i++;
      continue;
    }

    if (parseContainerOpener(node)) {
      const { node: containerNode, nextIndex } = collectContainer(nodes, i);
      result.push(containerNode);
      i = nextIndex;
    } else {
      result.push(node);
      i++;
    }
  }

  return result;
}

/**
 * Remark plugin to parse wiremd container directives
 */
export const remarkWiremdContainers: Plugin = () => {
  return (tree: any) => {
    tree.children = processNodes(tree.children);
  };
};
