/**
 * coss codegen - content family
 *
 * heading, paragraph, text, image, link, list, list-item, table,
 * table-header, table-row, table-cell, blockquote, code, separator.
 *
 * Task 1 registers stubs plus the real `separator` emitter (the skeleton's
 * pinned contract fixture); Task 3 replaces the remaining stubs inside this
 * file.
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import type { NodeEmitter } from '../types.js';
import type { WiremdNode } from '../../../types.js';
import { safeUrl } from '../escape.js';

export const emitHeading: NodeEmitter<Extract<WiremdNode, { type: 'heading' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitParagraph: NodeEmitter<Extract<WiremdNode, { type: 'paragraph' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitText: NodeEmitter<Extract<WiremdNode, { type: 'text' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitImage: NodeEmitter<Extract<WiremdNode, { type: 'image' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitLink: NodeEmitter<Extract<WiremdNode, { type: 'link' }>> = (node) => {
  // URL safety is part of this emitter's contract; validate hrefs until the
  // real emitter lands (Task 3), so Unsafe URL always beats Not implemented.
  if (typeof node.href === 'string') safeUrl(node.href);
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitList: NodeEmitter<Extract<WiremdNode, { type: 'list' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitListItem: NodeEmitter<Extract<WiremdNode, { type: 'list-item' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitTable: NodeEmitter<Extract<WiremdNode, { type: 'table' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitTableHeader: NodeEmitter<Extract<WiremdNode, { type: 'table-header' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitTableRow: NodeEmitter<Extract<WiremdNode, { type: 'table-row' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitTableCell: NodeEmitter<Extract<WiremdNode, { type: 'table-cell' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitBlockquote: NodeEmitter<Extract<WiremdNode, { type: 'blockquote' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitCode: NodeEmitter<Extract<WiremdNode, { type: 'code' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

/** Shared coss separator classes. */
const SEPARATOR_CLASSES = 'h-px w-full bg-zinc-200';

export const emitSeparator: NodeEmitter<Extract<WiremdNode, { type: 'separator' }>> = (_node, format) => {
  return format === 'jsx'
    ? `<hr className="${SEPARATOR_CLASSES}" />`
    : `<hr class="${SEPARATOR_CLASSES}" />`;
};
