/**
 * coss codegen - navigation family (nav, nav-item, brand, tabs, tab, breadcrumbs)
 *
 * Emits standalone HTML/JSX fragments using coss neutral-palette class
 * strings. `breadcrumb-item` children are emitted internally by
 * `emitBreadcrumbs` - never directly. Child nodes go through `recurse`
 * (which routes back through the dispatcher) instead of re-implementing
 * other families' emitters.
 *
 * Formatting contract shared with the layout family:
 * - fragments are flat (no re-indentation); child fragments join with `\n`
 * - childless elements collapse to a single `<tag ...></tag>` line
 * - attribute order: semantic attributes (href, type, role, aria-*, data-*),
 *   then class/className, then bare boolean attributes (`hidden`)
 * - `props.classes` are never emitted, so `show-source` can never leak
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import type { CodegenFormat, CodegenRecurse, NodeEmitter } from '../types.js';
import type { WiremdNode } from '../../../types.js';
import { escapeHtmlAttr, escapeHtmlText, escapeJsxAttr, escapeJsxText, safeUrl } from '../escape.js';

type NavNode = Extract<WiremdNode, { type: 'nav' }>;
type NavItemNode = Extract<WiremdNode, { type: 'nav-item' }>;
type BrandNode = Extract<WiremdNode, { type: 'brand' }>;
type TabsNode = Extract<WiremdNode, { type: 'tabs' }>;
type TabNode = Extract<WiremdNode, { type: 'tab' }>;
type BreadcrumbsNode = Extract<WiremdNode, { type: 'breadcrumbs' }>;
type BreadcrumbItemNode = Extract<WiremdNode, { type: 'breadcrumb-item' }>;

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

/** Element wrapping pre-escaped text inline: `<tag attrs>text</tag>`. */
function inlineElement(tag: string, attrs: readonly Attr[], text: string, format: CodegenFormat): string {
  return `${openTag(tag, attrs, format)}${text}</${tag}>`;
}

function escapeText(text: string, format: CodegenFormat): string {
  return format === 'jsx' ? escapeJsxText(text) : escapeHtmlText(text);
}

function childFragments(children: readonly WiremdNode[] | undefined, format: CodegenFormat, recurse: CodegenRecurse): string[] {
  return (children ?? []).map((child) => recurse(child, format)).filter((fragment) => fragment.length > 0);
}

// ---------------------------------------------------------------------------
// nav / nav-item / brand
// ---------------------------------------------------------------------------

const NAV_CLASSES = 'flex items-center gap-2 border-b border-zinc-200 bg-white px-4 py-3';
const NAV_ITEM_CLASSES = 'text-zinc-500 hover:text-zinc-950';
const NAV_ITEM_ACTIVE_CLASSES = 'text-zinc-950 font-medium';
const BRAND_CLASSES = 'font-semibold text-zinc-950 mr-auto';

export const emitNav: NodeEmitter<NavNode> = (node, format, recurse) =>
  element('nav', [classAttr(format, NAV_CLASSES)], childFragments(node.children, format, recurse), format);

export const emitNavItem: NodeEmitter<NavItemNode> = (node, format, recurse) => {
  const href = safeUrl(node.href ?? '#');
  const active = node.props?.state === 'active';
  const attrs: Attr[] = [{ name: 'href', value: href }];
  if (active) attrs.push({ name: 'aria-current', value: 'page' });
  attrs.push(classAttr(format, active ? NAV_ITEM_ACTIVE_CLASSES : NAV_ITEM_CLASSES));

  if (node.children !== undefined && node.children.length > 0) {
    return element('a', attrs, childFragments(node.children, format, recurse), format);
  }
  return inlineElement('a', attrs, escapeText(node.content ?? '', format), format);
};

export const emitBrand: NodeEmitter<BrandNode> = (node, format, recurse) =>
  element('div', [classAttr(format, BRAND_CLASSES)], childFragments(node.children, format, recurse), format);

// ---------------------------------------------------------------------------
// tabs / tab
// ---------------------------------------------------------------------------

const TAB_LIST_CLASSES = 'border-b border-zinc-200 flex gap-1';
const TAB_TRIGGER_ACTIVE_CLASSES = 'border-b-2 border-zinc-950 px-3 py-2 text-sm font-medium text-zinc-950';
const TAB_TRIGGER_INACTIVE_CLASSES = 'border-b-2 border-transparent px-3 py-2 text-sm text-zinc-500 hover:text-zinc-950';
const TAB_PANEL_CLASSES = 'pt-4';

/** Tab trigger button rendered by `emitTabs` inside its tab list. */
function tabTrigger(node: TabNode, format: CodegenFormat): string {
  const active = node.active === true;
  const attrs: Attr[] = [
    { name: 'type', value: 'button' },
    { name: 'role', value: 'tab' },
    { name: 'aria-selected', value: active ? 'true' : 'false' },
    { name: 'data-active', value: active ? 'true' : 'false' },
    classAttr(format, active ? TAB_TRIGGER_ACTIVE_CLASSES : TAB_TRIGGER_INACTIVE_CLASSES),
  ];
  return inlineElement('button', attrs, escapeText(node.label ?? '', format), format);
}

/**
 * Tabs composite: a wrapper grouping the trigger list and the panels.
 * Triggers are built from each `tab` child's label/active flag; panels are
 * the emitted `tab` nodes themselves, recursed through the dispatcher.
 */
export const emitTabs: NodeEmitter<TabsNode> = (node, format, recurse) => {
  const tabs = (node.children ?? []).filter((child): child is TabNode => child.type === 'tab');
  const list = element(
    'div',
    [{ name: 'role', value: 'tablist' }, classAttr(format, TAB_LIST_CLASSES)],
    tabs.map((tab) => tabTrigger(tab, format)),
    format,
  );
  const panels = tabs.map((tab) => recurse(tab, format)).filter((fragment) => fragment.length > 0);
  return element('div', [], [list, ...panels], format);
};

/** A single tab: its panel. Active panels render; inactive panels carry `hidden`. */
export const emitTab: NodeEmitter<TabNode> = (node, format, recurse) => {
  const attrs: Attr[] = [classAttr(format, TAB_PANEL_CLASSES)];
  if (node.active !== true) attrs.push({ name: 'hidden' });
  return element('div', attrs, childFragments(node.children, format, recurse), format);
};

// ---------------------------------------------------------------------------
// breadcrumbs
// ---------------------------------------------------------------------------

const BREADCRUMB_LIST_CLASSES = 'flex items-center gap-1.5 text-sm text-zinc-500';
const BREADCRUMB_LINK_CLASSES = 'hover:text-zinc-950';
const BREADCRUMB_SEPARATOR_CLASSES = 'text-zinc-300';
const BREADCRUMB_CURRENT_CLASSES = 'text-zinc-950';

/**
 * Breadcrumbs render their `breadcrumb-item` children internally: every
 * non-current crumb becomes a link followed by a separator `li`, the current
 * crumb becomes a `span` with `aria-current="page"`. `breadcrumb-item` markup
 * never appears in the generated output.
 */
export const emitBreadcrumbs: NodeEmitter<BreadcrumbsNode> = (node, format) => {
  const items = (node.children ?? []).filter(
    (child): child is BreadcrumbItemNode => child.type === 'breadcrumb-item',
  );
  const separator = node.props?.separator === 'chevron' ? '›' : '/';

  const lines: string[] = [];
  items.forEach((item, index) => {
    const isCurrent = item.current === true || index === items.length - 1;
    const label = escapeText(item.content ?? '', format);
    if (isCurrent) {
      const current = inlineElement(
        'span',
        [{ name: 'aria-current', value: 'page' }, classAttr(format, BREADCRUMB_CURRENT_CLASSES)],
        label,
        format,
      );
      lines.push(inlineElement('li', [], current, format));
      return;
    }
    const link = inlineElement(
      'a',
      [{ name: 'href', value: safeUrl(item.href ?? '#') }, classAttr(format, BREADCRUMB_LINK_CLASSES)],
      label,
      format,
    );
    lines.push(inlineElement('li', [], link, format));
    lines.push(
      inlineElement(
        'li',
        [{ name: 'aria-hidden', value: 'true' }, classAttr(format, BREADCRUMB_SEPARATOR_CLASSES)],
        escapeText(separator, format),
        format,
      ),
    );
  });

  const list = element('ol', [classAttr(format, BREADCRUMB_LIST_CLASSES)], lines, format);
  return element('nav', [{ name: 'aria-label', value: 'breadcrumb' }], [list], format);
};
