/**
 * coss codegen - feedback family (alert, toast, skeleton, spinner, kbd, progress, meter)
 *
 * Task 1 covers the alert emitter only; subsequent tasks extend this file with
 * the rest of the feedback primitives (toast, skeleton, spinner, kbd, progress,
 * meter) and their unit tests live alongside.
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import type { CodegenFormat, NodeEmitter } from '../types.js';
import type { WiremdNode } from '../../../types.js';
import { escapeHtmlAttr, escapeHtmlText, escapeJsxAttr, escapeJsxText } from '../escape.js';

// ---------------------------------------------------------------------------
// Shared fragment helpers (per-family copies; no shared helper module yet)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// alert
// ---------------------------------------------------------------------------

/**
 * coss alert base + variant classes, modeled on coss `apps/ui/registry/default/ui/alert.tsx`.
 * Base is `relative grid w-full items-start gap-y-0.5 rounded-xl border px-3.5 py-3 text-sm`
 * with variant backgrounds; wiremd picks a neutral-palette subset (no theme tokens).
 */
const ALERT_BASE_CLASSES = 'relative grid w-full items-start gap-y-0.5 rounded-lg border px-3.5 py-3 text-sm text-zinc-950';
const ALERT_VARIANT_BG: Record<'success' | 'info' | 'warning' | 'error', string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-red-200 bg-red-50 text-red-900',
};
const ALERT_TITLE_CLASSES = 'font-medium';

/**
 * Detect a `::: alert` opener-line title. The first child of the container is
 * a paragraph that came from the remark-containers plugin's inline opener; the
 * plugin emits that paragraph with only a `children` array (no `content`
 * field), so we look there for the joined text-node values. The
 * `parseParagraph` transformer path produces paragraphs with `content`; the
 * emitter accepts both shapes.
 */
function splitAlertTitle(
  node: Extract<WiremdNode, { type: 'container' }>,
): { title: string | undefined; body: readonly WiremdNode[] } {
  const children = node.children ?? [];
  if (children.length < 2) return { title: undefined, body: children };
  const first = children[0];
  if (first.type !== 'paragraph') return { title: undefined, body: children };
  const fromContent = typeof first.content === 'string' ? first.content : null;
  const fromChildren = Array.isArray(first.children)
    ? first.children.map((c) => {
        // WiremdNode text children have `content`; remark-containers plugin
        // emits raw mdast text nodes with `value`. The container emitter only
        // ever sees WiremdNode, so prefer `content` and fall back to `value`
        // for resilience against the plugin path.
        if (c.type === 'text') {
          const t = c as { content?: string; value?: string };
          return t.content ?? t.value ?? '';
        }
        return '';
      }).join('')
    : '';
  const title = fromContent ?? (fromChildren.length > 0 ? fromChildren : undefined);
  return { title, body: children.slice(1) };
}

export const emitAlert: NodeEmitter<Extract<WiremdNode, { type: 'container' }>> = (
  node,
  format,
  recurse,
) => {
  // The container emitter only handles `containerType: 'alert'`; other shapes
  // should never reach here because the dispatcher routes via the container
  // emitter's own switch. Type the cast explicitly so a future container split
  // is caught at the call site rather than at runtime.
  if ((node.containerType as string) !== 'alert') {
    return '';
  }

  const variantClass = (node.props?.classes ?? []).find((c): c is 'success' | 'info' | 'warning' | 'error' =>
    c === 'success' || c === 'info' || c === 'warning' || c === 'error',
  );
  const classes = variantClass
    ? `${ALERT_BASE_CLASSES} ${ALERT_VARIANT_BG[variantClass]}`
    : ALERT_BASE_CLASSES;

  const { title, body } = splitAlertTitle(node);
  const bodyFragments = childFragments(body, format, recurse);

  const titleFragment = title !== undefined
    ? `<p${classAttr(format, ALERT_TITLE_CLASSES)}>${textEscaped(format, title)}</p>`
    : '';

  const allFragments = [titleFragment, ...bodyFragments].filter((f) => f.length > 0);
  if (allFragments.length === 0) {
    return `<div role="alert"${classAttr(format, classes)}></div>`;
  }
  return `<div role="alert"${classAttr(format, classes)}>\n${allFragments.join('\n')}\n</div>`;
};

// ---------------------------------------------------------------------------
// toast
// ---------------------------------------------------------------------------

const TOAST_BASE_CLASSES =
  'pointer-events-auto flex items-center justify-between gap-1.5 overflow-hidden rounded-lg border border-zinc-200 bg-white px-3.5 py-3 text-sm shadow-sm';
const TOAST_VARIANT_BORDER: Record<'success' | 'info' | 'warning' | 'error', string> = {
  success: 'border-emerald-200',
  info: 'border-blue-200',
  warning: 'border-amber-200',
  error: 'border-red-200',
};
const TOAST_TITLE_CLASSES = 'font-medium text-zinc-950';

function splitToastTitle(
  node: Extract<WiremdNode, { type: 'toast' }>,
): { title: string | undefined; body: readonly WiremdNode[] } {
  const children = node.children ?? [];
  if (children.length < 2) return { title: undefined, body: children };
  const first = children[0];
  if (first.type !== 'paragraph') return { title: undefined, body: children };
  const fromContent = typeof first.content === 'string' ? first.content : null;
  const fromChildren = Array.isArray(first.children)
    ? first.children.map((c) => {
        if (c.type === 'text') {
          const t = c as { content?: string; value?: string };
          return t.content ?? t.value ?? '';
        }
        return '';
      }).join('')
    : '';
  const title = fromContent ?? (fromChildren.length > 0 ? fromChildren : undefined);
  return { title, body: children.slice(1) };
}

export const emitToast: NodeEmitter<Extract<WiremdNode, { type: 'toast' }>> = (
  node,
  format,
  recurse,
) => {
  const variant = node.props?.toastType;
  const variantClass =
    variant && variant !== 'loading' ? TOAST_VARIANT_BORDER[variant] : undefined;
  const classes = variantClass
    ? `${TOAST_BASE_CLASSES} ${variantClass}`
    : TOAST_BASE_CLASSES;
  const { title, body } = splitToastTitle(node);
  const bodyFragments = childFragments(body, format, recurse);
  const fragments: string[] = [];
  if (title !== undefined) {
    fragments.push(
      `<p${classAttr(format, TOAST_TITLE_CLASSES)}>${textEscaped(format, title)}</p>`,
    );
  }
  fragments.push(...bodyFragments);
  if (fragments.length === 0) {
    return `<div role="status"${classAttr(format, classes)}></div>`;
  }
  return `<div role="status"${classAttr(format, classes)}>\n${fragments.join('\n')}\n</div>`;
};

// ---------------------------------------------------------------------------
// skeleton
// ---------------------------------------------------------------------------

const SKELETON_CLASSES =
  'animate-skeleton block w-full rounded-sm bg-zinc-100 [background:linear-gradient(120deg,transparent_40%,rgba(255,255,255,0.64)_50%,transparent_60%)_#f4f4f5_0_0/200%_100%]';

function styleForSize(node: { props?: { width?: number | string; height?: number | string } }): string {
  const width = node.props?.width;
  const height = node.props?.height;
  const parts: string[] = [];
  if (width !== undefined) {
    parts.push(`width:${typeof width === 'number' ? `${width}px` : width}`);
  }
  if (height !== undefined) {
    parts.push(`height:${typeof height === 'number' ? `${height}px` : height}`);
  }
  return parts.length > 0 ? ` style="${parts.join(';')}"` : '';
}

export const emitSkeleton: NodeEmitter<Extract<WiremdNode, { type: 'skeleton' }>> = (
  node,
  format,
) => {
  return `<div${classAttr(format, SKELETON_CLASSES)}${styleForSize(node)}></div>`;
};

// ---------------------------------------------------------------------------
// spinner
// ---------------------------------------------------------------------------

const SPINNER_BASE_CLASSES = 'inline-block animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-950';
const SPINNER_SIZE_CLASSES: Record<'small' | 'medium' | 'large', string> = {
  small: 'h-3 w-3 border-[1.5px]',
  medium: 'h-4 w-4 border-2',
  large: 'h-6 w-6 border-[3px]',
};

export const emitSpinner: NodeEmitter<Extract<WiremdNode, { type: 'spinner' }>> = (
  node,
  format,
) => {
  const size = node.props?.size ?? 'medium';
  const sizeCls = SPINNER_SIZE_CLASSES[size] ?? SPINNER_SIZE_CLASSES.medium;
  const classes = `${SPINNER_BASE_CLASSES} ${sizeCls}`;
  return `<div role="status" aria-label="Loading"${classAttr(format, classes)}></div>`;
};

// ---------------------------------------------------------------------------
// kbd
// ---------------------------------------------------------------------------

const KBD_CLASSES =
  'pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center gap-1 rounded bg-zinc-100 px-1 font-sans font-medium text-zinc-500 text-xs';

export const emitKbd: NodeEmitter<Extract<WiremdNode, { type: 'kbd' }>> = (
  node,
  format,
) => {
  const extra = (node.props?.classes ?? []).join(' ');
  const classes = extra ? `${KBD_CLASSES} ${extra}` : KBD_CLASSES;
  return `<kbd${classAttr(format, classes)}>${textEscaped(format, node.content)}</kbd>`;
};

// ---------------------------------------------------------------------------
// progress
// ---------------------------------------------------------------------------

const PROGRESS_ROOT_CLASSES = 'flex w-full flex-col gap-2';
const PROGRESS_LABEL_CLASSES = 'font-medium text-sm text-zinc-950';
const PROGRESS_TRACK_CLASSES = 'block h-1.5 w-full overflow-hidden rounded-full bg-zinc-100';
const PROGRESS_INDICATOR_CLASSES = 'block h-full rounded-full bg-zinc-950 transition-all duration-500';
const PROGRESS_VALUE_CLASSES = 'text-sm tabular-nums text-zinc-950';

export const emitProgress: NodeEmitter<Extract<WiremdNode, { type: 'progress' }>> = (
  node,
  format,
) => {
  const value = Math.max(0, Math.min(100, Number(node.value ?? 0)));
  const indeterminate = !!node.indeterminate;
  const width = indeterminate ? 100 : value;
  const label = node.props?.label;
  const parts: string[] = [];
  if (typeof label === 'string' && label.length > 0) {
    parts.push(`<p${classAttr(format, PROGRESS_LABEL_CLASSES)}>${textEscaped(format, label)}</p>`);
  }
  parts.push(
    `<div${classAttr(format, PROGRESS_TRACK_CLASSES)}>\n  <div${classAttr(format, PROGRESS_INDICATOR_CLASSES)} style="width:${width}%"></div>\n</div>`,
  );
  if (!indeterminate) {
    parts.push(`<p${classAttr(format, PROGRESS_VALUE_CLASSES)}>${value}%</p>`);
  }
  return `<div${classAttr(format, PROGRESS_ROOT_CLASSES)} role="progressbar" aria-valuenow="${value}"${indeterminate ? ' data-indeterminate="true"' : ''}>\n${parts.join('\n')}\n</div>`;
};

// ---------------------------------------------------------------------------
// meter
// ---------------------------------------------------------------------------

const METER_ROOT_CLASSES = 'flex w-full flex-col gap-2';
const METER_LABEL_CLASSES = 'font-medium text-sm text-zinc-950';
const METER_TRACK_CLASSES = 'block h-2 w-full overflow-hidden bg-zinc-100';
const METER_INDICATOR_CLASSES = 'block h-full bg-zinc-950 transition-all duration-500';
const METER_VALUE_CLASSES = 'text-sm tabular-nums text-zinc-950';

export const emitMeter: NodeEmitter<Extract<WiremdNode, { type: 'meter' }>> = (
  node,
  format,
) => {
  const value = Number(node.value ?? 0);
  const min = Number(node.min ?? 0);
  const max = Number(node.max ?? 100);
  const range = max - min || 1;
  const pct = Math.max(0, Math.min(100, ((value - min) / range) * 100));
  const label = node.props?.label;
  const parts: string[] = [];
  if (typeof label === 'string' && label.length > 0) {
    parts.push(`<p${classAttr(format, METER_LABEL_CLASSES)}>${textEscaped(format, label)}</p>`);
  }
  parts.push(
    `<div${classAttr(format, METER_TRACK_CLASSES)}>\n  <div${classAttr(format, METER_INDICATOR_CLASSES)} style="width:${pct}%"></div>\n</div>`,
  );
  parts.push(`<p${classAttr(format, METER_VALUE_CLASSES)}>${value} / ${max}</p>`);
  return `<div${classAttr(format, METER_ROOT_CLASSES)} role="meter" aria-valuenow="${value}" aria-valuemin="${min}" aria-valuemax="${max}">\n${parts.join('\n')}\n</div>`;
};
