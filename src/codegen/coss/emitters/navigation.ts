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
  const active = node.props?.state === 'active' || node.props?.classes?.includes('active') === true;
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

// ---------------------------------------------------------------------------
// Phase 3 Task 4: pagination / segmented-control / scroll-area / sidebar / menubar
// ---------------------------------------------------------------------------

type PaginationNode = Extract<WiremdNode, { type: 'pagination' }>;
type SegmentedControlNode = Extract<WiremdNode, { type: 'segmented-control' }>;
type ScrollAreaNode = Extract<WiremdNode, { type: 'scroll-area' }>;
type SidebarNode = Extract<WiremdNode, { type: 'sidebar' }>;
type MenubarNode = Extract<WiremdNode, { type: 'menubar' }>;

/** Flatten the button-group containers the parser wraps bracket items in. */
function flattenBracketItems(children: readonly WiremdNode[] | undefined): WiremdNode[] {
  const out: WiremdNode[] = [];
  for (const child of children ?? []) {
    const anyChild = child as { type: string; containerType?: string; children?: WiremdNode[] };
    if (anyChild.type === 'container' && anyChild.containerType === 'button-group') {
      out.push(...(anyChild.children ?? []));
    } else {
      out.push(child);
    }
  }
  return out;
}

function bracketItemActive(node: WiremdNode): boolean {
  const classes: string[] = (node as { props?: { classes?: string[] } }).props?.classes ?? [];
  return classes.includes('active') || (node as { props?: { variant?: string } }).props?.variant === 'primary';
}

const PAGINATION_LINK_CLASSES =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium text-zinc-950 hover:bg-zinc-100';
const PAGINATION_LINK_ACTIVE_CLASSES =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-2 text-sm font-medium text-zinc-950 shadow-sm';

export const emitPagination: NodeEmitter<PaginationNode> = (node, format) => {
  const label = typeof node.props?.label === 'string' ? node.props.label : 'pagination';
  const items = flattenBracketItems(node.children).filter(
    (i) => i.type === 'button' || i.type === 'nav-item',
  );
  const listItems = items.map((item) => {
    const active = bracketItemActive(item);
    const linkClasses = active ? PAGINATION_LINK_ACTIVE_CLASSES : PAGINATION_LINK_CLASSES;
    const attrs: Attr[] = [
      { name: 'href', value: '#' },
      classAttr(format, linkClasses),
    ];
    if (active) attrs.push({ name: 'aria-current', value: 'page' });
    const text = escapeText((item as { content?: string }).content ?? '', format);
    return inlineElement('li', [], inlineElement('a', attrs, text, format), format);
  });
  const list = element('ul', [classAttr(format, 'flex flex-row items-center gap-1')], listItems, format);
  return element('nav', [{ name: 'aria-label', value: label }, classAttr(format, 'mx-auto flex w-full justify-center')], [list], format);
};

const SEGMENTED_ITEM_CLASSES =
  'inline-flex h-8 items-center justify-center rounded-lg px-4 text-sm font-medium text-zinc-500 hover:text-zinc-950';
const SEGMENTED_ITEM_ACTIVE_CLASSES =
  'inline-flex h-8 items-center justify-center rounded-lg bg-white px-4 text-sm font-medium text-zinc-950 shadow-sm';

export const emitSegmentedControl: NodeEmitter<SegmentedControlNode> = (node, format) => {
  const items = flattenBracketItems(node.children).filter(
    (i) => i.type === 'button' || i.type === 'nav-item',
  );
  const buttons = items.map((item) => {
    const active = bracketItemActive(item);
    const attrs: Attr[] = [
      { name: 'type', value: 'button' },
      classAttr(format, active ? SEGMENTED_ITEM_ACTIVE_CLASSES : SEGMENTED_ITEM_CLASSES),
      { name: 'aria-pressed', value: active ? 'true' : 'false' },
    ];
    const text = escapeText((item as { content?: string }).content ?? '', format);
    return inlineElement('button', attrs, text, format);
  });
  return element(
    'div',
    [classAttr(format, 'inline-flex items-center gap-0.5 rounded-lg bg-zinc-100 p-1'), { name: 'role', value: 'group' }],
    buttons,
    format,
  );
};

export const emitScrollArea: NodeEmitter<ScrollAreaNode> = (node, format, recurse) => {
  const maxHeight = node.props?.maxHeight;
  const styleValue =
    maxHeight !== undefined
      ? `max-height:${typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight}`
      : undefined;
  const attrs: Attr[] = [
    classAttr(format, 'relative size-full min-h-0 overflow-hidden rounded-lg border border-zinc-200'),
  ];
  if (styleValue !== undefined) attrs.push({ name: 'style', value: styleValue });
  return element('div', attrs, childFragments(node.children, format, recurse), format);
};

const SIDEBAR_ITEM_CLASSES =
  'flex h-8 w-full items-center gap-2 rounded-lg p-2 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950';
const SIDEBAR_ITEM_ACTIVE_CLASSES =
  'flex h-8 w-full items-center gap-2 rounded-lg bg-zinc-100 p-2 text-sm font-medium text-zinc-950';

export const emitSidebar: NodeEmitter<SidebarNode> = (node, format, recurse) => {
  const title = typeof node.props?.title === 'string' ? node.props.title : undefined;
  const inner = (node.children ?? []).map((child) => {
    if (child.type === 'list') {
      const items = (child.children ?? [])
        .filter((li): li is Extract<WiremdNode, { type: 'list-item' }> => li.type === 'list-item')
        .map((li) => {
          const active = (li.props?.classes ?? []).includes('active');
          const text = escapeText((li.content ?? '').replace(/\s*:::\s*$/, '').trim(), format);
          return inlineElement(
            'a',
            [{ name: 'href', value: '#' }, classAttr(format, active ? SIDEBAR_ITEM_ACTIVE_CLASSES : SIDEBAR_ITEM_CLASSES)],
            text,
            format,
          );
        });
      return element('nav', [classAttr(format, 'flex flex-col gap-0.5')], items, format);
    }
    return recurse(child, format);
  }).filter((f) => f.length > 0);
  const header = title !== undefined
    ? inlineElement('div', [classAttr(format, 'px-2 pb-3 text-sm font-semibold text-zinc-950')], escapeText(title, format), format)
    : '';
  return element(
    'aside',
    [classAttr(format, 'flex w-64 flex-col gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-3')],
    [header, ...inner],
    format,
  );
};

export const emitMenubar: NodeEmitter<MenubarNode> = (node, format, recurse) =>
  element(
    'div',
    [classAttr(format, 'flex w-fit items-center gap-0.5 rounded-lg border border-zinc-200 bg-zinc-50 p-1'), { name: 'role', value: 'menubar' }],
    childFragments(node.children, format, recurse),
    format,
  );

// ---------------------------------------------------------------------------
// accordion / collapsible / toolbar (coss parity)
// ---------------------------------------------------------------------------

type AccordionNode = Extract<WiremdNode, { type: 'accordion' }>;
type AccordionItemNode = Extract<WiremdNode, { type: 'accordion-item' }>;
type CollapsibleNode = Extract<WiremdNode, { type: 'collapsible' }>;
type ToolbarNode = Extract<WiremdNode, { type: 'toolbar' }>;

const ACCORDION_ITEM_CLASSES = 'border-b border-zinc-200 last:border-b-0';
const ACCORDION_TRIGGER_CLASSES =
  'flex flex-1 cursor-pointer items-start justify-between gap-4 rounded-md py-4 pr-1 text-left font-medium text-sm text-zinc-950';
const ACCORDION_INDICATOR_CLASSES =
  'pointer-events-none inline-flex size-4 shrink-0 translate-y-0.5 items-center justify-center text-zinc-950 opacity-80 transition-transform duration-200 ease-in-out';
const ACCORDION_PANEL_CLASSES = 'overflow-hidden pb-4 pr-1 pt-0 text-sm text-zinc-500';

export const emitAccordion: NodeEmitter<AccordionNode> = (node, format, recurse) =>
  element('div', [], childFragments(node.children, format, recurse), format);

export const emitAccordionItem: NodeEmitter<AccordionItemNode> = (node, format, recurse) => {
  const expanded = node.expanded === true;
  const trigger = element(
    'button',
    [
      { name: 'type', value: 'button' },
      { name: 'aria-expanded', value: expanded ? 'true' : 'false' },
      classAttr(format, ACCORDION_TRIGGER_CLASSES),
    ],
    [
      inlineElement('span', [classAttr(format, 'flex-1')], escapeText(node.summary ?? '', format), format),
      inlineElement('span', [classAttr(format, ACCORDION_INDICATOR_CLASSES)], '▾', format),
    ],
    format,
  );
  const panelAttrs: Attr[] = [classAttr(format, ACCORDION_PANEL_CLASSES)];
  if (!expanded) panelAttrs.push({ name: 'hidden' });
  const panel = element('div', panelAttrs, childFragments(node.children, format, recurse), format);
  return element('div', [classAttr(format, ACCORDION_ITEM_CLASSES)], [trigger, panel], format);
};

const COLLAPSIBLE_TRIGGER_CLASSES =
  'flex w-full cursor-pointer items-center justify-between gap-4 rounded-md border border-zinc-200 bg-white px-4 py-3 text-left font-medium text-sm text-zinc-950';
const COLLAPSIBLE_PANEL_CLASSES =
  'mt-2 overflow-hidden rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950';

export const emitCollapsible: NodeEmitter<CollapsibleNode> = (node, format, recurse) => {
  const expanded = node.collapsed !== true;
  const title = typeof node.props?.title === 'string' && node.props.title ? node.props.title : 'Toggle';
  const trigger = element(
    'button',
    [
      { name: 'type', value: 'button' },
      { name: 'aria-expanded', value: expanded ? 'true' : 'false' },
      classAttr(format, COLLAPSIBLE_TRIGGER_CLASSES),
    ],
    [
      inlineElement('span', [classAttr(format, 'flex-1')], escapeText(title, format), format),
      inlineElement('span', [classAttr(format, ACCORDION_INDICATOR_CLASSES)], '▾', format),
    ],
    format,
  );
  const panelAttrs: Attr[] = [classAttr(format, COLLAPSIBLE_PANEL_CLASSES)];
  if (!expanded) panelAttrs.push({ name: 'hidden' });
  const panel = element('div', panelAttrs, childFragments(node.children, format, recurse), format);
  return element('div', [], [trigger, panel], format);
};

const TOOLBAR_CLASSES = 'relative flex gap-2 rounded-xl border border-zinc-200 bg-white p-1 text-zinc-950';
const TOOLBAR_SEPARATOR_CLASSES = 'shrink-0 self-stretch w-px bg-zinc-200';

export const emitToolbar: NodeEmitter<ToolbarNode> = (node, format, recurse) => {
  const frags = (node.children ?? [])
    .map((child) => {
      if (child.type === 'separator') {
        return element(
          'span',
          [
            { name: 'role', value: 'separator' },
            { name: 'aria-orientation', value: 'vertical' },
            classAttr(format, TOOLBAR_SEPARATOR_CLASSES),
          ],
          [],
          format,
        );
      }
      return recurse(child, format);
    })
    .filter((fragment) => fragment.length > 0);
  return element('div', [{ name: 'role', value: 'toolbar' }, classAttr(format, TOOLBAR_CLASSES)], frags, format);
};
