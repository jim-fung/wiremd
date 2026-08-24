/**
 * coss codegen - overlay family (dialog, alert-dialog, sheet, drawer,
 * popover, tooltip, preview-card). Task 3 of the Phase 3 plan.
 *
 * The renderer is the source of truth for visual output; these emitters
 * produce static HTML/JSX that mirrors the coss registry components in
 * shape. They do NOT bind to a popup/portal primitive library; the goal
 * is to ship a code fragment the user can drop into a JSX file unchanged
 * and a build step (their own) wires the actual interactivity.
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import type { CodegenFormat, NodeEmitter } from '../types.js';
import type { WiremdNode } from '../../../types.js';
import { escapeHtmlAttr, escapeHtmlText, escapeJsxAttr, escapeJsxText } from '../escape.js';

function attrEscaped(format: CodegenFormat, value: string): string {
  return format === 'jsx' ? escapeJsxAttr(value) : escapeHtmlAttr(value);
}

function textEscaped(format: CodegenFormat, value: string): string {
  return format === 'jsx' ? escapeJsxText(value) : escapeHtmlText(value);
}

function classAttr(format: CodegenFormat, classes: string): string {
  return ` ${format === 'jsx' ? 'className' : 'class'}="${attrEscaped(format, classes)}"`;
}

function childFragments(
  children: readonly WiremdNode[] | undefined,
  format: CodegenFormat,
  recurse: (node: WiremdNode, format: CodegenFormat) => string,
): string[] {
  return (children ?? [])
    .map((child) => recurse(child, format))
    .filter((fragment) => fragment.length > 0);
}

// Shared base classes per overlay (modeled on coss apps/ui/registry/default).
const DIALOG_BASE = 'fixed inset-0 z-50 grid grid-rows-[1fr_auto_3fr] justify-items-center p-4';
const DIALOG_POPUP_BASE =
  'relative row-start-2 flex max-h-full min-h-0 w-full min-w-0 max-w-lg origin-center flex-col rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-950 shadow-lg';
const ALERT_DIALOG_BASE = DIALOG_POPUP_BASE;
const SHEET_POPUP_BASE =
  'fixed z-50 gap-4 bg-white p-6 shadow-lg transition ease-in-out border-zinc-200';
const DRAWER_POPUP_BASE =
  'fixed z-50 gap-4 bg-white p-6 shadow-lg transition ease-in-out border-zinc-200';
const POPOVER_BASE =
  'z-50 w-72 origin-[--radix-popover-content-transform-origin] rounded-md border border-zinc-200 bg-white p-4 text-zinc-950 shadow-md outline-none';
const TOOLTIP_BASE =
  'z-50 overflow-hidden rounded-md bg-zinc-950 px-3 py-1.5 text-xs text-zinc-50 shadow-sm';
const PREVIEW_CARD_BASE =
  'flex w-full flex-col items-start gap-1 rounded-lg border border-zinc-200 bg-white p-4 text-zinc-950 shadow-sm';

// ---------------------------------------------------------------------------
// dialog
// ---------------------------------------------------------------------------

export const emitDialog: NodeEmitter<Extract<WiremdNode, { type: 'dialog' }>> = (
  node,
  format,
  recurse,
) => {
  const title = typeof node.props?.title === 'string' ? node.props.title : undefined;
  const desc = typeof node.props?.description === 'string' ? node.props.description : undefined;
  const inner = childFragments(node.children, format, recurse);
  const titleFragment = title
    ? `<h2${classAttr(format, 'text-lg font-semibold leading-none tracking-tight')}>${textEscaped(format, title)}</h2>`
    : '';
  const descFragment = desc
    ? `<p${classAttr(format, 'text-sm text-zinc-500')}>${textEscaped(format, desc)}</p>`
    : '';
  const close = `<button type="button"${classAttr(format, 'absolute end-2 top-2 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2')} aria-label="Close">×</button>`;
  const popup = `<div${classAttr(format, DIALOG_POPUP_BASE)} role="dialog">
${[titleFragment, descFragment, ...inner, close].filter((f) => f.length > 0).join('\n')}
</div>`;
  return `<div${classAttr(format, DIALOG_BASE)}>
  ${popup}
</div>`;
};

// ---------------------------------------------------------------------------
// alert-dialog
// ---------------------------------------------------------------------------

export const emitAlertDialog: NodeEmitter<Extract<WiremdNode, { type: 'alert-dialog' }>> = (
  node,
  format,
  recurse,
) => {
  const title = typeof node.props?.title === 'string' ? node.props.title : undefined;
  const desc = typeof node.props?.description === 'string' ? node.props.description : undefined;
  const actionText = typeof node.props?.actionText === 'string' ? node.props.actionText : 'Continue';
  const cancelText = typeof node.props?.cancelText === 'string' ? node.props.cancelText : 'Cancel';
  const actionVariant = node.props?.actionVariant === 'secondary' ? 'secondary' : 'primary';
  const inner = childFragments(node.children, format, recurse);
  const titleFragment = title
    ? `<h2${classAttr(format, 'text-lg font-semibold leading-none tracking-tight')}>${textEscaped(format, title)}</h2>`
    : '';
  const descFragment = desc
    ? `<p${classAttr(format, 'text-sm text-zinc-500')}>${textEscaped(format, desc)}</p>`
    : '';
  const actions = `<div${classAttr(format, 'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end')}>
    <button type="button"${classAttr(format, 'inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-950 hover:bg-zinc-50')}>${textEscaped(format, cancelText)}</button>
    <button type="button"${classAttr(format, `inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium text-white ${actionVariant === 'primary' ? 'bg-zinc-950 hover:bg-zinc-800' : 'bg-zinc-100 text-zinc-950 hover:bg-zinc-200'}`)}>${textEscaped(format, actionText)}</button>
  </div>`;
  const popup = `<div${classAttr(format, ALERT_DIALOG_BASE)} role="alertdialog">
${[titleFragment, descFragment, ...inner, actions].filter((f) => f.length > 0).join('\n')}
</div>`;
  return `<div${classAttr(format, DIALOG_BASE)}>
  ${popup}
</div>`;
};

// ---------------------------------------------------------------------------
// sheet
// ---------------------------------------------------------------------------

const SHEET_SIDE_CLASSES: Record<'top' | 'right' | 'bottom' | 'left', string> = {
  top: 'inset-x-0 top-0 border-b',
  right: 'inset-y-0 right-0 h-full w-3/4 max-w-sm border-l sm:max-w-sm',
  bottom: 'inset-x-0 bottom-0 border-t',
  left: 'inset-y-0 left-0 h-full w-3/4 max-w-sm border-r sm:max-w-sm',
};

export const emitSheet: NodeEmitter<Extract<WiremdNode, { type: 'sheet' }>> = (
  node,
  format,
  recurse,
) => {
  const title = typeof node.props?.title === 'string' ? node.props.title : undefined;
  const desc = typeof node.props?.description === 'string' ? node.props.description : undefined;
  const inner = childFragments(node.children, format, recurse);
  const sideClass = SHEET_SIDE_CLASSES[node.side] || SHEET_SIDE_CLASSES.right;
  const popupClasses = `${SHEET_POPUP_BASE} ${sideClass}`;
  const titleFragment = title
    ? `<h2${classAttr(format, 'text-lg font-semibold text-zinc-950')}>${textEscaped(format, title)}</h2>`
    : '';
  const descFragment = desc
    ? `<p${classAttr(format, 'text-sm text-zinc-500')}>${textEscaped(format, desc)}</p>`
    : '';
  const close = `<button type="button"${classAttr(format, 'absolute end-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100')} aria-label="Close">×</button>`;
  return `<div${classAttr(format, popupClasses)} role="dialog" data-side="${attrEscaped(format, node.side)}">
${[titleFragment, descFragment, ...inner, close].filter((f) => f.length > 0).join('\n')}
</div>`;
};

// ---------------------------------------------------------------------------
// drawer
// ---------------------------------------------------------------------------

export const emitDrawer: NodeEmitter<Extract<WiremdNode, { type: 'drawer' }>> = (
  node,
  format,
  recurse,
) => {
  const title = typeof node.props?.title === 'string' ? node.props.title : undefined;
  const inner = childFragments(node.children, format, recurse);
  const sideClass = SHEET_SIDE_CLASSES[node.side] || SHEET_SIDE_CLASSES.left;
  const popupClasses = `${DRAWER_POPUP_BASE} ${sideClass}`;
  const titleFragment = title
    ? `<h2${classAttr(format, 'text-lg font-semibold text-zinc-950')}>${textEscaped(format, title)}</h2>`
    : '';
  return `<div${classAttr(format, popupClasses)} role="dialog" data-side="${attrEscaped(format, node.side)}">
${[titleFragment, ...inner].filter((f) => f.length > 0).join('\n')}
</div>`;
};

// ---------------------------------------------------------------------------
// popover
// ---------------------------------------------------------------------------

export const emitPopover: NodeEmitter<Extract<WiremdNode, { type: 'popover' }>> = (
  node,
  format,
  recurse,
) => {
  const title = typeof node.props?.title === 'string' ? node.props.title : undefined;
  const desc = typeof node.props?.description === 'string' ? node.props.description : undefined;
  const inner = childFragments(node.children, format, recurse);
  const titleFragment = title
    ? `<h3${classAttr(format, 'text-base font-semibold leading-none tracking-tight')}>${textEscaped(format, title)}</h3>`
    : '';
  const descFragment = desc
    ? `<p${classAttr(format, 'text-sm text-zinc-500')}>${textEscaped(format, desc)}</p>`
    : '';
  return `<div${classAttr(format, POPOVER_BASE)} role="dialog">
${[titleFragment, descFragment, ...inner].filter((f) => f.length > 0).join('\n')}
</div>`;
};

// ---------------------------------------------------------------------------
// tooltip
// ---------------------------------------------------------------------------

export const emitTooltip: NodeEmitter<Extract<WiremdNode, { type: 'tooltip' }>> = (
  node,
  format,
) => {
  const content = node.props?.content ?? '';
  const side: 'top' | 'right' | 'bottom' | 'left' =
    node.props?.side === 'right' || node.props?.side === 'bottom' || node.props?.side === 'left'
      ? node.props.side
      : 'top';
  return `<span${classAttr(format, TOOLTIP_BASE)} role="tooltip" data-side="${attrEscaped(format, side)}">${textEscaped(format, content)}</span>`;
};

// ---------------------------------------------------------------------------
// preview-card
// ---------------------------------------------------------------------------

export const emitPreviewCard: NodeEmitter<Extract<WiremdNode, { type: 'preview-card' }>> = (
  node,
  format,
  recurse,
) => {
  const href = typeof node.props?.href === 'string' ? node.props.href : undefined;
  const inner = childFragments(node.children, format, recurse);
  const card = `<div${classAttr(format, PREVIEW_CARD_BASE)}>
${inner.join('\n')}
</div>`;
  if (href) {
    return `<a${classAttr(format, 'block text-zinc-950 no-underline')} href="${attrEscaped(format, href)}">${card}</a>`;
  }
  return card;
};
