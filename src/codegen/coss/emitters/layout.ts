/**
 * coss codegen - layout family (container, grid, grid-item, row, demo)
 *
 * Emits standalone HTML/JSX fragments using coss neutral-palette class
 * strings. `demo` emits its children as an ordered fragment via `recurse`
 * with no wrapper element. Child nodes go through `recurse` (which routes
 * back through the dispatcher) instead of re-implementing other families'
 * emitters.
 *
 * Formatting contract shared with the navigation family:
 * - fragments are flat (no re-indentation); child fragments join with `\n`
 * - childless elements collapse to a single `<tag ...></tag>` line
 * - attribute order: semantic attributes (role, aria-*), then
 *   class/className, then bare boolean attributes (`hidden`)
 * - `props.classes` are never emitted, so `show-source` can never leak
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import type { CodegenFormat, CodegenRecurse, NodeEmitter } from '../types.js';
import type { WiremdNode } from '../../../types.js';
import { escapeHtmlAttr, escapeJsxAttr } from '../escape.js';

type ContainerNode = Extract<WiremdNode, { type: 'container' }>;
type GridNode = Extract<WiremdNode, { type: 'grid' }>;
type GridItemNode = Extract<WiremdNode, { type: 'grid-item' }>;
type RowNode = Extract<WiremdNode, { type: 'row' }>;
type DemoNode = Extract<WiremdNode, { type: 'demo' }>;

/** Rendered attribute; `value: undefined` marks a bare boolean attribute. */
interface Attr {
  readonly name: string;
  readonly value?: string;
}

function classAttr(format: CodegenFormat, classes: string): Attr {
  return { name: format === 'jsx' ? 'className' : 'class', value: classes };
}

function openTag(tag: string, attrs: readonly Attr[], format: CodegenFormat): string {
  const rendered = attrs.map((attr) =>
    attr.value === undefined
      ? attr.name
      : `${attr.name}="${format === 'jsx' ? escapeJsxAttr(attr.value) : escapeHtmlAttr(attr.value)}"`,
  );
  return `<${[tag, ...rendered].join(' ')}>`;
}

/** Wrap child fragments in an element; childless elements render on one line. */
function element(tag: string, attrs: readonly Attr[], children: readonly string[], format: CodegenFormat): string {
  const open = openTag(tag, attrs, format);
  const body = children.filter((fragment) => fragment.length > 0);
  if (body.length === 0) return `${open}</${tag}>`;
  return [open, ...body, `</${tag}>`].join('\n');
}

function childFragments(
  children: readonly WiremdNode[] | undefined,
  format: CodegenFormat,
  recurse: CodegenRecurse,
): string[] {
  return (children ?? []).map((child) => recurse(child, format)).filter((fragment) => fragment.length > 0);
}

// ---------------------------------------------------------------------------
// container
// ---------------------------------------------------------------------------

const CARD_CLASSES = 'rounded-xl border border-zinc-200 bg-white p-6 shadow-sm';
const HERO_CLASSES = 'py-16 px-8 text-center border-y border-zinc-200';
const SIDEBAR_CLASSES = 'grid md:grid-cols-[240px_1fr] gap-6';
const MODAL_OVERLAY_CLASSES = 'fixed inset-0 flex items-center justify-center bg-black/50';
const MODAL_PANEL_CLASSES = 'rounded-xl bg-white p-6 max-w-md shadow-xl';
const STATE_PLACEHOLDER_CLASSES = 'rounded-lg border border-dashed p-8 text-center text-zinc-500';
const ERROR_PLACEHOLDER_CLASSES = 'rounded-lg border border-dashed border-red-200 p-8 text-center text-red-600';
const FALLBACK_CLASSES = 'rounded-lg border border-zinc-200';

/**
 * Class string for one container flavor. `empty` / `error` / `loading` render
 * dashed placeholders; every other containerType (footer, alert, layout,
 * section, form-group, button-group, anything unknown) falls back to a
 * neutral bordered box.
 */
function containerClasses(containerType: string): string {
  switch (containerType) {
    case 'card':
      return CARD_CLASSES;
    case 'hero':
      return HERO_CLASSES;
    case 'sidebar':
      return SIDEBAR_CLASSES;
    case 'modal':
      return MODAL_OVERLAY_CLASSES;
    case 'empty':
    case 'loading':
      return STATE_PLACEHOLDER_CLASSES;
    case 'error':
      return ERROR_PLACEHOLDER_CLASSES;
    default:
      return FALLBACK_CLASSES;
  }
}

export const emitContainer: NodeEmitter<ContainerNode> = (node, format, recurse) => {
  const kind = node.containerType as string;
  const children = childFragments(node.children, format, recurse);
  if (kind === 'modal') {
    const panel = element(
      'div',
      [{ name: 'role', value: 'dialog' }, { name: 'aria-modal', value: 'true' }, classAttr(format, MODAL_PANEL_CLASSES)],
      children,
      format,
    );
    return element('div', [classAttr(format, MODAL_OVERLAY_CLASSES)], [panel], format);
  }
  return element('div', [classAttr(format, containerClasses(kind))], children, format);
};

// ---------------------------------------------------------------------------
// grid / grid-item
// ---------------------------------------------------------------------------

/** Column count for `grid-cols-{N}`: integers 1-12 pass, everything else clamps to 3. */
function gridColumns(columns: number): number {
  return Number.isInteger(columns) && columns >= 1 && columns <= 12 ? columns : 3;
}

export const emitGrid: NodeEmitter<GridNode> = (node, format, recurse) =>
  element(
    'div',
    [classAttr(format, `grid grid-cols-${gridColumns(node.columns)} gap-3`)],
    childFragments(node.children, format, recurse),
    format,
  );

export const emitGridItem: NodeEmitter<GridItemNode> = (node, format, recurse) =>
  element('div', [classAttr(format, 'min-w-0')], childFragments(node.children, format, recurse), format);

// ---------------------------------------------------------------------------
// row
// ---------------------------------------------------------------------------

const ROW_BASE_CLASSES = 'flex items-center gap-3';

function rowClasses(node: RowNode): string {
  const align = node.props?.right === true || node.props?.right === 'true' ? 'justify-end'
    : node.props?.center === true || node.props?.center === 'true' ? 'justify-center'
    : '';
  return align === '' ? ROW_BASE_CLASSES : `${ROW_BASE_CLASSES} ${align}`;
}

export const emitRow: NodeEmitter<RowNode> = (node, format, recurse) =>
  element('div', [classAttr(format, rowClasses(node))], childFragments(node.children, format, recurse), format);

// ---------------------------------------------------------------------------
// demo
// ---------------------------------------------------------------------------

/** `demo` emits its children as an ordered fragment - no wrapper element, `raw` ignored. */
export const emitDemo: NodeEmitter<DemoNode> = (node, format, recurse) =>
  childFragments(node.children, format, recurse).join('\n');
