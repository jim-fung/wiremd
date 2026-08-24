/**
 * coss codegen - actions family (button, badge, icon, checkbox)
 *
 * All emitters produce standalone fragments for both `html` and `jsx`
 * formats. JSX fragments use native elements only: `className` for classes,
 * double-quoted JSON string literals for string attributes, and boolean
 * attributes emitted bare when true / omitted when false.
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import type { CodegenFormat, NodeEmitter } from '../types.js';
import type { WiremdNode } from '../../../types.js';
import { escapeHtmlAttr, escapeHtmlText, escapeJsxAttr, escapeJsxText, safeUrl } from '../escape.js';

// ---------------------------------------------------------------------------
// Shared fragment helpers (module-local; each family module keeps its own copy
// so no shared file outside this task's ownership is introduced)
// ---------------------------------------------------------------------------

/** Escape a string for a double-quoted attribute in the target format. */
function attrEscaped(format: CodegenFormat, value: string): string {
  return format === 'jsx' ? escapeJsxAttr(value) : escapeHtmlAttr(value);
}

/** Escape a string for a text position in the target format. */
function textEscaped(format: CodegenFormat, value: string): string {
  return format === 'jsx' ? escapeJsxText(value) : escapeHtmlText(value);
}

/** Render ` name="value"` in the target format; empty string when absent. */
function attr(format: CodegenFormat, name: string, value: string | undefined): string {
  if (value === undefined) return '';
  return ` ${name}="${attrEscaped(format, value)}"`;
}

/**
 * Render a boolean attribute: bare (` required`) when true, omitted when
 * false or absent. Identical for HTML and JSX per the codegen contracts.
 */
function boolAttr(_format: CodegenFormat, name: string, value: boolean | undefined): string {
  return value === true ? ` ${name}` : '';
}

/** Render the class attribute (`class` in HTML, `className` in JSX). */
function classAttr(format: CodegenFormat, classes: string): string {
  return ` ${format === 'jsx' ? 'className' : 'class'}="${attrEscaped(format, classes)}"`;
}

// ---------------------------------------------------------------------------
// button
// ---------------------------------------------------------------------------

/**
 * Full variant class strings, byte-pinned to the Task 2 brief. Written out
 * (not composed) so the emitted order can never drift from the fixture:
 * structure, variant border/background, sizing, variant text, shadow and
 * hover, focus-visible ring, disabled states.
 */
const BUTTON_CLASSES: Record<'primary' | 'secondary' | 'danger', string> = {
  primary:
    'inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-zinc-950 bg-zinc-950 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
  secondary:
    'inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-950 shadow-sm transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
  danger:
    'inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-red-600 bg-red-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
};

export const emitButton: NodeEmitter<Extract<WiremdNode, { type: 'button' }>> = (
  node,
  format,
  recurse,
) => {
  const variant = node.props.variant ?? 'primary';
  const classes = BUTTON_CLASSES[variant];
  const disabled = node.props.state === 'disabled';

  const inner =
    node.children && node.children.length > 0
      ? node.children.map((child) => recurse(child, format)).join('')
      : textEscaped(format, node.content ?? '');

  // An href turns the button into an anchor with the same coss styling.
  if (node.href !== undefined) {
    const href = safeUrl(node.href);
    return `<a${attr(format, 'href', href)}${classAttr(format, classes)}>${inner}</a>`;
  }

  const type = node.props.type ?? 'button';
  return (
    `<button${attr(format, 'type', type)}` +
    `${boolAttr(format, 'disabled', disabled)}` +
    `${classAttr(format, classes)}>${inner}</button>`
  );
};

// ---------------------------------------------------------------------------
// badge
// ---------------------------------------------------------------------------

const BADGE_VARIANTS: Record<'default' | 'primary' | 'success' | 'warning' | 'error', string> = {
  default: 'border-zinc-200 bg-white',
  primary: 'border-zinc-950 bg-zinc-950',
  success: 'border-emerald-200 bg-emerald-50',
  warning: 'border-amber-200 bg-amber-50',
  error: 'border-red-200 bg-red-50',
};
const BADGE_TEXT: Record<'default' | 'primary' | 'success' | 'warning' | 'error', string> = {
  default: 'text-zinc-700',
  primary: 'text-white',
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  error: 'text-red-700',
};

export const emitBadge: NodeEmitter<Extract<WiremdNode, { type: 'badge' }>> = (node, format) => {
  const variant = node.props.variant ?? 'default';
  const classes = `inline-flex items-center rounded-lg border ${BADGE_VARIANTS[variant]} px-2 py-0.5 text-xs font-medium ${BADGE_TEXT[variant]}`;
  return `<span${classAttr(format, classes)}>${textEscaped(format, node.content ?? '')}</span>`;
};

// ---------------------------------------------------------------------------
// icon
// ---------------------------------------------------------------------------

const ICON_SIZES: Record<'small' | 'medium' | 'large', string> = {
  small: 'h-4 w-4',
  medium: 'h-5 w-5',
  large: 'h-6 w-6',
};

/**
 * Inline SVG circle placeholder for the named icon, wrapped in a labelled
 * span. SVG presentation attributes are kebab-case in HTML and camelCase in
 * JSX (`viewBox` is already camelCase in both).
 */
export const emitIcon: NodeEmitter<Extract<WiremdNode, { type: 'icon' }>> = (node, format) => {
  const size = node.props.size ?? 'medium';
  const classes = `inline-flex ${ICON_SIZES[size]} shrink-0 items-center justify-center text-zinc-950`;
  const svgAttrs =
    format === 'jsx'
      ? 'viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"'
      : 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  return (
    `<span role="img"${attr(format, 'aria-label', node.props.name)}` +
    `${classAttr(format, classes)}>` +
    `<svg ${svgAttrs}><circle cx="12" cy="12" r="9" /></svg>` +
    `</span>`
  );
};

// ---------------------------------------------------------------------------
// checkbox
// ---------------------------------------------------------------------------

const CHECKBOX_INPUT_CLASSES =
  'h-4 w-4 shrink-0 rounded-lg border-zinc-300 accent-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1 disabled:opacity-50';
const CHECKBOX_LABEL_CLASSES = 'inline-flex items-center gap-2 text-sm text-zinc-950';

function checkboxInput(
  format: CodegenFormat,
  props: { required?: boolean; disabled?: boolean; value?: string },
  checked: boolean,
): string {
  return (
    `<input type="checkbox"` +
    `${boolAttr(format, 'checked', checked)}` +
    `${boolAttr(format, 'required', props.required)}` +
    `${boolAttr(format, 'disabled', props.disabled)}` +
    `${classAttr(format, CHECKBOX_INPUT_CLASSES)} />`
  );
}

export const emitCheckbox: NodeEmitter<Extract<WiremdNode, { type: 'checkbox' }>> = (
  node,
  format,
  recurse,
) => {
  const input = checkboxInput(format, node.props, node.checked);
  const labelText =
    node.label !== undefined
      ? textEscaped(format, node.label)
      : (node.children ?? []).map((child) => recurse(child, format)).join('');

  // Without any label content the bare input is the whole fragment.
  if (labelText === '') return input;
  return `<label${classAttr(format, CHECKBOX_LABEL_CLASSES)}>${input}${labelText}</label>`;
};
