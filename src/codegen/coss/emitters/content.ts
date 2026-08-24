/**
 * coss codegen - content family
 *
 * heading, paragraph, text, image, link, list, list-item, table,
 * table-header, table-row, table-cell, blockquote, code, separator.
 *
 * Conventions:
 * - Semantic elements only; JSX output swaps `class` for `className` and
 *   escapes attributes per format (HTML attr entities vs JSON string).
 * - coss text scale: `text-zinc-950` headings, `text-zinc-700` body,
 *   `text-zinc-500` muted (table headers).
 * - `href`/`src` pass through `safeUrl`; optional fields are skipped when
 *   absent so no attribute ever renders `undefined`.
 * - Children recurse through the dispatcher callback; a non-empty `children`
 *   array takes precedence over `content`.
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import type { NodeEmitter, CodegenFormat, CodegenRecurse } from '../types.js';
import type { WiremdNode } from '../../../types.js';
import { escapeHtmlAttr, escapeHtmlText, escapeJsxAttr, escapeJsxText, safeUrl } from '../escape.js';

/** Escape a text position value for the target format. */
function text(format: CodegenFormat, value: string): string {
  return format === 'jsx' ? escapeJsxText(value) : escapeHtmlText(value);
}

/** Escape an attribute value for the target format. */
function attrValue(format: CodegenFormat, value: string): string {
  return format === 'jsx' ? escapeJsxAttr(value) : escapeHtmlAttr(value);
}

/** Render `class="…"` / `className="…"`, escaped for the target format. */
function classAttr(format: CodegenFormat, classes: string): string {
  return ` ${format === 'jsx' ? 'className' : 'class'}="${attrValue(format, classes)}"`;
}

/** An optional attribute; `undefined` values are omitted entirely. */
type OptionalAttr = readonly [name: string, value: string | number | undefined];

/** Render optional attributes (already ordered); skips absent values. */
function attrs(format: CodegenFormat, entries: readonly OptionalAttr[]): string {
  let out = '';
  for (const [name, value] of entries) {
    if (value === undefined) continue;
    out += ` ${name}="${attrValue(format, String(value))}"`;
  }
  return out;
}

/** Inline body: non-empty children recurse, otherwise escaped `content`. */
function inlineBody(
  node: { content?: string; children?: WiremdNode[] },
  format: CodegenFormat,
  recurse: CodegenRecurse,
): string {
  if (node.children !== undefined && node.children.length > 0) {
    return node.children.map((child) => recurse(child, format)).join('');
  }
  return text(format, node.content ?? '');
}

/** Recurse every child (defensive against absent arrays) and join inline. */
function childBody(children: WiremdNode[] | undefined, format: CodegenFormat, recurse: CodegenRecurse): string {
  return (children ?? []).map((child) => recurse(child, format)).join('');
}

/** Heading level -> coss size class (h5 and h6 share `text-base`). */
const HEADING_SIZE_CLASSES: Readonly<Record<1 | 2 | 3 | 4 | 5 | 6, string>> = {
  1: 'text-3xl',
  2: 'text-2xl',
  3: 'text-xl',
  4: 'text-lg',
  5: 'text-base',
  6: 'text-base',
};

export const emitHeading: NodeEmitter<Extract<WiremdNode, { type: 'heading' }>> = (node, format, recurse) => {
  const tag = `h${node.level}`;
  const classes = `${HEADING_SIZE_CLASSES[node.level] ?? 'text-base'} font-semibold text-zinc-950`;
  return `<${tag}${classAttr(format, classes)}>${inlineBody(node, format, recurse)}</${tag}>`;
};

export const emitParagraph: NodeEmitter<Extract<WiremdNode, { type: 'paragraph' }>> = (node, format, recurse) => {
  return `<p${classAttr(format, 'text-zinc-700 leading-6')}>${inlineBody(node, format, recurse)}</p>`;
};

export const emitText: NodeEmitter<Extract<WiremdNode, { type: 'text' }>> = (node, format) => {
  return `<span${classAttr(format, 'text-zinc-700 leading-6')}>${text(format, node.content ?? '')}</span>`;
};

export const emitImage: NodeEmitter<Extract<WiremdNode, { type: 'image' }>> = (node, format) => {
  const src = safeUrl(node.src ?? '');
  const optional = attrs(format, [
    ['alt', node.alt],
    ['width', node.props.width],
    ['height', node.props.height],
    ['loading', node.props.loading],
  ]);
  return `<img src="${attrValue(format, src)}"${optional}${classAttr(format, 'rounded-lg')} />`;
};

export const emitLink: NodeEmitter<Extract<WiremdNode, { type: 'link' }>> = (node, format, recurse) => {
  // URL safety is part of this emitter's contract: unsafe schemes throw
  // before any output is produced.
  const href = safeUrl(node.href ?? '');
  const optional = attrs(format, [['title', node.title]]);
  return `<a href="${attrValue(format, href)}"${optional}${classAttr(format, 'text-zinc-950 underline underline-offset-2')}>${inlineBody(node, format, recurse)}</a>`;
};

/** Shared list chrome: marker class + indentation + body color + spacing. */
const LIST_BASE_CLASSES = 'pl-5 text-zinc-700 space-y-1';

export const emitList: NodeEmitter<Extract<WiremdNode, { type: 'list' }>> = (node, format, recurse) => {
  const tag = node.ordered ? 'ol' : 'ul';
  const marker = node.ordered ? 'list-decimal' : 'list-disc';
  return `<${tag}${classAttr(format, `${marker} ${LIST_BASE_CLASSES}`)}>${childBody(node.children, format, recurse)}</${tag}>`;
};

export const emitListItem: NodeEmitter<Extract<WiremdNode, { type: 'list-item' }>> = (node, format, recurse) => {
  return `<li>${inlineBody(node, format, recurse)}</li>`;
};

export const emitTable: NodeEmitter<Extract<WiremdNode, { type: 'table' }>> = (node, format, recurse) => {
  const children = node.children ?? [];
  // thead always precedes tbody regardless of child order.
  const head = children
    .filter((child) => child.type === 'table-header')
    .map((child) => recurse(child, format))
    .join('');
  const rows = children
    .filter((child) => child.type === 'table-row')
    .map((child) => recurse(child, format))
    .join('');
  const body = rows.length > 0 ? `<tbody>${rows}</tbody>` : '';
  return `<table${classAttr(format, 'w-full text-sm')}>${head}${body}</table>`;
};

export const emitTableHeader: NodeEmitter<Extract<WiremdNode, { type: 'table-header' }>> = (node, format, recurse) => {
  return `<thead>${childBody(node.children, format, recurse)}</thead>`;
};

export const emitTableRow: NodeEmitter<Extract<WiremdNode, { type: 'table-row' }>> = (node, format, recurse) => {
  return `<tr>${childBody(node.children, format, recurse)}</tr>`;
};

/** Cell alignment -> utility class. */
const ALIGN_CLASSES: Readonly<Record<'left' | 'center' | 'right', string>> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export const emitTableCell: NodeEmitter<Extract<WiremdNode, { type: 'table-cell' }>> = (node, format, recurse) => {
  const isHeader = node.header === true;
  const align = node.align !== undefined ? ALIGN_CLASSES[node.align] : undefined;
  // Header cells default to `text-left`; body cells only carry alignment
  // when the AST states one.
  const classes = isHeader
    ? `border-b border-zinc-200 font-medium text-zinc-500 ${align ?? 'text-left'}`
    : `border-b border-zinc-200 text-zinc-700${align !== undefined ? ` ${align}` : ''}`;
  const tag = isHeader ? 'th' : 'td';
  return `<${tag}${classAttr(format, classes)}>${inlineBody(node, format, recurse)}</${tag}>`;
};

export const emitBlockquote: NodeEmitter<Extract<WiremdNode, { type: 'blockquote' }>> = (node, format, recurse) => {
  return `<blockquote${classAttr(format, 'border-l-2 border-zinc-200 pl-4 italic text-zinc-600')}>${childBody(node.children, format, recurse)}</blockquote>`;
};

const INLINE_CODE_CLASSES = 'rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[.8125rem] text-zinc-600';
const BLOCK_CODE_CLASSES = 'rounded-lg bg-zinc-900 p-4 font-mono text-sm text-zinc-50 overflow-x-auto';

export const emitCode: NodeEmitter<Extract<WiremdNode, { type: 'code' }>> = (node, format) => {
  const value = text(format, node.value ?? '');
  // `inline === false` (and only explicit false) selects the block form.
  if (node.inline === false) {
    const langClass =
      node.lang !== undefined && node.lang !== '' ? classAttr(format, `language-${node.lang}`) : '';
    return `<pre${classAttr(format, BLOCK_CODE_CLASSES)}><code${langClass}>${value}</code></pre>`;
  }
  return `<code${classAttr(format, INLINE_CODE_CLASSES)}>${value}</code>`;
};

/** Shared coss separator classes. */
const SEPARATOR_CLASSES = 'h-px w-full bg-zinc-200';

export const emitSeparator: NodeEmitter<Extract<WiremdNode, { type: 'separator' }>> = (_node, format) => {
  return format === 'jsx'
    ? `<hr className="${SEPARATOR_CLASSES}" />`
    : `<hr class="${SEPARATOR_CLASSES}" />`;
};
