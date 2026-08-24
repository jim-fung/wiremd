/**
 * coss codegen - forms family (input, textarea, select, radio, radio-group)
 *
 * `option` children are emitted internally by `emitSelect` - never directly.
 * JSX fragments use native elements only: `className` for classes,
 * double-quoted JSON string literals for string attributes, and boolean
 * attributes emitted bare when true / omitted when false. Radio names are
 * always deterministic (radio's `props.name`, else the group's `name`, else
 * the literal `radio-group`) - never generated randomly.
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import type { CodegenFormat, NodeEmitter } from '../types.js';
import type { WiremdNode } from '../../../types.js';
import { escapeHtmlAttr, escapeHtmlText, escapeJsxAttr, escapeJsxText } from '../escape.js';

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
function attr(format: CodegenFormat, name: string, value: string | number | undefined): string {
  if (value === undefined) return '';
  return ` ${name}="${attrEscaped(format, String(value))}"`;
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

/**
 * Full control class strings, byte-pinned to the Task 2 fixtures. Order
 * mirrors the button pattern: structure, border/background, padding, text,
 * placeholder, focus-visible ring, disabled state.
 */
const INPUT_CLASSES =
  'h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1 disabled:opacity-50';
const TEXTAREA_CLASSES =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1 disabled:opacity-50';
const SELECT_CLASSES =
  'h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1 disabled:opacity-50';

// ---------------------------------------------------------------------------
// input
// ---------------------------------------------------------------------------


export const emitInput: NodeEmitter<Extract<WiremdNode, { type: 'input' }>> = (node, format) => {
  const { inputType, placeholder, value, required, disabled } = node.props;
  return (
    `<input${attr(format, 'type', inputType ?? 'text')}` +
    `${attr(format, 'value', value)}` +
    `${attr(format, 'placeholder', placeholder)}` +
    `${boolAttr(format, 'required', required)}` +
    `${boolAttr(format, 'disabled', disabled)}` +
    `${classAttr(format, INPUT_CLASSES)} />`
  );
};

// ---------------------------------------------------------------------------
// textarea
// ---------------------------------------------------------------------------

export const emitTextarea: NodeEmitter<Extract<WiremdNode, { type: 'textarea' }>> = (
  node,
  format,
) => {
  const { rows, placeholder, value, required, disabled } = node.props;
  return (
    `<textarea${attr(format, 'rows', rows)}` +
    `${attr(format, 'placeholder', placeholder)}` +
    `${boolAttr(format, 'required', required)}` +
    `${boolAttr(format, 'disabled', disabled)}` +
    `${classAttr(format, TEXTAREA_CLASSES)}>${textEscaped(format, value ?? '')}</textarea>`
  );
};

// ---------------------------------------------------------------------------
// select (renders its option children internally)
// ---------------------------------------------------------------------------

type SelectOption = Extract<WiremdNode, { type: 'option' }>;

function optionFragment(format: CodegenFormat, option: SelectOption): string {
  return (
    `<option${attr(format, 'value', option.value)}` +
    `${boolAttr(format, 'selected', option.selected)}>` +
    `${textEscaped(format, option.label)}</option>`
  );
}

export const emitSelect: NodeEmitter<Extract<WiremdNode, { type: 'select' }>> = (
  node,
  format,
) => {
  const { placeholder, required, disabled, multiple } = node.props;
  // `options` defaults defensively: the dispatcher contract probes every
  // emitter with bare nodes and must never observe a crash.
  const nodeOptions = node.options ?? [];
  const hasSelected = nodeOptions.some((option) => option.selected === true);

  let options = nodeOptions.map((option) => optionFragment(format, option)).join('');
  if (placeholder !== undefined) {
    // Placeholder option first; it is the selected one only when no real
    // option claims selection.
    const placeholderSelected = boolAttr(format, 'selected', !hasSelected);
    options =
      `<option value=""${boolAttr(format, 'disabled', true)}${placeholderSelected}>` +
      `${textEscaped(format, placeholder)}</option>` +
      options;
  }

  return (
    `<select${boolAttr(format, 'required', required)}` +
    `${boolAttr(format, 'disabled', disabled)}` +
    `${boolAttr(format, 'multiple', multiple)}` +
    `${classAttr(format, SELECT_CLASSES)}>${options}</select>`
  );
};

// ---------------------------------------------------------------------------
// radio + radio-group
// ---------------------------------------------------------------------------

const RADIO_INPUT_CLASSES =
  'h-4 w-4 shrink-0 rounded-lg border-zinc-300 accent-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1 disabled:opacity-50';
const RADIO_LABEL_CLASSES = 'inline-flex items-center gap-2 text-sm text-zinc-950';

/** Deterministic fallback when neither the radio nor its group is named. */
const RADIO_FALLBACK_NAME = 'radio-group';

export const emitRadio: NodeEmitter<Extract<WiremdNode, { type: 'radio' }>> = (node, format) => {
  const { name, value, required, disabled } = node.props;
  const input =
    `<input type="radio"` +
    `${attr(format, 'name', name ?? RADIO_FALLBACK_NAME)}` +
    `${attr(format, 'value', value)}` +
    `${boolAttr(format, 'checked', node.selected)}` +
    `${boolAttr(format, 'required', required)}` +
    `${boolAttr(format, 'disabled', disabled)}` +
    `${classAttr(format, RADIO_INPUT_CLASSES)} />`;
  return `<label${classAttr(format, RADIO_LABEL_CLASSES)}>${input}${textEscaped(
    format,
    node.label ?? '',
  )}</label>`;
};

export const emitRadioGroup: NodeEmitter<Extract<WiremdNode, { type: 'radio-group' }>> = (
  node,
  format,
  recurse,
) => {
  const groupName = node.name ?? RADIO_FALLBACK_NAME;
  const children = (node.children ?? [])
    .map((child) =>
      child.type === 'radio' && child.props.name === undefined
        ? { ...child, props: { ...child.props, name: groupName } }
        : child,
    )
    .map((child) => recurse(child, format))
    .join('');

  const classes = node.props.inline === true
    ? 'flex flex-wrap items-center gap-4'
    : 'grid gap-2';
  return `<div${classAttr(format, classes)}>${children}</div>`;
};
