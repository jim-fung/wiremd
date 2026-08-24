/**
 * coss codegen - data entry family (form, field, fieldset, label,
 * input-group, otp-field, number-field, autocomplete, combobox, command,
 * checkbox-group, toggle-group, switch, slider, toggle). Task 5 of the
 * Phase 3 plan.
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import type { CodegenFormat, CodegenRecurse, NodeEmitter } from '../types.js';
import type { WiremdNode } from '../../../types.js';
import { escapeHtmlAttr, escapeHtmlText, escapeJsxAttr, escapeJsxText, safeUrl } from '../escape.js';

type FormNode = Extract<WiremdNode, { type: 'form' }>;
type FieldNode = Extract<WiremdNode, { type: 'field' }>;
type FieldsetNode = Extract<WiremdNode, { type: 'fieldset' }>;
type LabelNode = Extract<WiremdNode, { type: 'label' }>;
type InputGroupNode = Extract<WiremdNode, { type: 'input-group' }>;
type OtpFieldNode = Extract<WiremdNode, { type: 'otp-field' }>;
type NumberFieldNode = Extract<WiremdNode, { type: 'number-field' }>;
type AutocompleteNode = Extract<WiremdNode, { type: 'autocomplete' }>;
type ComboboxNode = Extract<WiremdNode, { type: 'combobox' }>;
type CommandNode = Extract<WiremdNode, { type: 'command' }>;
type CheckboxGroupNode = Extract<WiremdNode, { type: 'checkbox-group' }>;
type ToggleGroupNode = Extract<WiremdNode, { type: 'toggle-group' }>;
type SwitchNode = Extract<WiremdNode, { type: 'switch' }>;
type SliderNode = Extract<WiremdNode, { type: 'slider' }>;
type ToggleNode = Extract<WiremdNode, { type: 'toggle' }>;

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

function element(tag: string, attrs: readonly Attr[], children: readonly string[], format: CodegenFormat): string {
  const open = openTag(tag, attrs, format);
  const body = children.filter((fragment) => fragment.length > 0);
  if (body.length === 0) return `${open}</${tag}>`;
  return [open, ...body, `</${tag}>`].join('\n');
}

function inlineElement(tag: string, attrs: readonly Attr[], text: string, format: CodegenFormat): string {
  return `${openTag(tag, attrs, format)}${text}</${tag}>`;
}

function escapeText(text: string, format: CodegenFormat): string {
  return format === 'jsx' ? escapeJsxText(text) : escapeHtmlText(text);
}

function childFragments(children: readonly WiremdNode[] | undefined, format: CodegenFormat, recurse: CodegenRecurse): string[] {
  return (children ?? []).map((child) => recurse(child, format)).filter((fragment) => fragment.length > 0);
}

const INPUT_BASE = 'h-9 w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-500';

// ---------------------------------------------------------------------------
// form / field / fieldset / label
// ---------------------------------------------------------------------------

export const emitForm: NodeEmitter<FormNode> = (node, format, recurse) => {
  const attrs: Attr[] = [classAttr(format, 'flex flex-col gap-4')];
  if (node.props?.action) attrs.push({ name: 'action', value: safeUrl(node.props.action) });
  if (node.props?.method) attrs.push({ name: 'method', value: node.props.method });
  return element('form', attrs, childFragments(node.children, format, recurse), format);
};

export const emitField: NodeEmitter<FieldNode> = (node, format, recurse) => {
  const children: string[] = [];
  if (node.props?.label) {
    children.push(inlineElement('label', [classAttr(format, 'text-sm font-medium text-zinc-950')], escapeText(node.props.label, format), format));
  }
  children.push(...childFragments(node.children, format, recurse));
  if (node.props?.description) {
    children.push(inlineElement('p', [classAttr(format, 'text-xs text-zinc-500')], escapeText(node.props.description, format), format));
  }
  if (node.props?.error) {
    children.push(inlineElement('p', [{ name: 'role', value: 'alert' }, classAttr(format, 'text-xs text-red-600')], escapeText(node.props.error, format), format));
  }
  return element('div', [classAttr(format, 'flex flex-col items-start gap-2')], children, format);
};

export const emitFieldset: NodeEmitter<FieldsetNode> = (node, format, recurse) => {
  const children: string[] = [];
  if (node.props?.legend) {
    children.push(inlineElement('legend', [classAttr(format, 'px-1 text-sm font-semibold text-zinc-950')], escapeText(node.props.legend, format), format));
  }
  if (node.props?.description) {
    children.push(inlineElement('p', [classAttr(format, 'text-xs text-zinc-500')], escapeText(node.props.description, format), format));
  }
  children.push(...childFragments(node.children, format, recurse));
  return element('fieldset', [classAttr(format, 'flex flex-col gap-3 rounded-xl border border-zinc-200 p-4')], children, format);
};

export const emitLabel: NodeEmitter<LabelNode> = (node, format) => {
  const attrs: Attr[] = [classAttr(format, 'text-sm font-medium text-zinc-950')];
  if (node.props?.htmlFor) attrs.push({ name: 'for', value: node.props.htmlFor });
  return inlineElement('label', attrs, escapeText(node.content, format), format);
};

// ---------------------------------------------------------------------------
// input-group / otp-field / number-field
// ---------------------------------------------------------------------------

const INPUT_GROUP_BASE = 'flex w-full items-stretch overflow-hidden rounded-lg border border-zinc-200';

export const emitInputGroup: NodeEmitter<InputGroupNode> = (node, format, recurse) => {
  const children: string[] = [];
  if (node.props?.addonStart) {
    children.push(inlineElement('span', [classAttr(format, 'inline-flex items-center border-r border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-500')], escapeText(node.props.addonStart, format), format));
  }
  children.push(...childFragments(node.children, format, recurse));
  if (node.props?.addonEnd) {
    children.push(inlineElement('span', [classAttr(format, 'inline-flex items-center border-l border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-500')], escapeText(node.props.addonEnd, format), format));
  }
  return element('div', [classAttr(format, INPUT_GROUP_BASE)], children, format);
};

export const emitOtpField: NodeEmitter<OtpFieldNode> = (node, format) => {
  const length = Number(node.props?.length ?? 6);
  const maxLength = Number(node.props?.maxLength ?? 1);
  const slots = Array.from({ length }, () =>
    inlineElement(
      'input',
      [
        classAttr(format, 'h-11 w-10 rounded-lg border border-zinc-200 text-center text-base tabular-nums text-zinc-950 outline-none'),
        { name: 'type', value: 'text' },
        { name: 'inputMode', value: 'numeric' },
        { name: 'maxLength', value: String(maxLength) },
        { name: 'aria-label', value: 'digit' },
      ],
      '',
      format,
    ).replace('></input>', '>'),
  );
  return element(
    'div',
    [classAttr(format, 'flex gap-2'), { name: 'role', value: 'group' }, { name: 'aria-label', value: 'Verification code' }],
    slots,
    format,
  );
};

export const emitNumberField: NodeEmitter<NumberFieldNode> = (node, format) => {
  const p = node.props ?? {};
  const inputAttrs: Attr[] = [
    classAttr(format, 'w-20 border-0 bg-transparent p-1 text-center text-sm tabular-nums text-zinc-950 outline-none'),
    { name: 'type', value: 'number' },
  ];
  if (p.min !== undefined) inputAttrs.push({ name: 'min', value: String(p.min) });
  if (p.max !== undefined) inputAttrs.push({ name: 'max', value: String(p.max) });
  if (p.step !== undefined) inputAttrs.push({ name: 'step', value: String(p.step) });
  if (p.value !== undefined) inputAttrs.push({ name: 'value', value: String(p.value) });
  if (p.placeholder) inputAttrs.push({ name: 'placeholder', value: p.placeholder });
  const stepper = (label: string, glyph: string) =>
    inlineElement(
      'button',
      [
        { name: 'type', value: 'button' },
        classAttr(format, 'h-9 w-8 text-base text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950'),
        { name: 'aria-label', value: label },
      ],
      glyph,
      format,
    );
  const input = inlineElement('input', inputAttrs, '', format).replace('></input>', '>');
  return element(
    'div',
    [classAttr(format, 'inline-flex w-fit items-center overflow-hidden rounded-lg border border-zinc-200')],
    [stepper('Decrease', '−'), input, stepper('Increase', '+')],
    format,
  );
};

// ---------------------------------------------------------------------------
// autocomplete / combobox / command
// ---------------------------------------------------------------------------

export const emitAutocomplete: NodeEmitter<AutocompleteNode> = (node, format) => {
  const p = node.props ?? {};
  const inputAttrs: Attr[] = [
    classAttr(format, INPUT_BASE),
    { name: 'type', value: 'text' },
    { name: 'role', value: 'combobox' },
    { name: 'aria-expanded', value: 'false' },
    { name: 'aria-autocomplete', value: 'list' },
  ];
  if (p.placeholder) inputAttrs.push({ name: 'placeholder', value: p.placeholder });
  const input = inlineElement('input', inputAttrs, '', format).replace('></input>', '>');
  const suggestions: string[] = p.suggestions ?? [];
  const items = suggestions.map((s) =>
    inlineElement('li', [{ name: 'role', value: 'option' }, classAttr(format, 'rounded-md px-2.5 py-1.5 text-sm text-zinc-950 hover:bg-zinc-100')], escapeText(s, format), format),
  );
  const children: string[] = [input];
  if (items.length > 0) {
    children.push(element('ul', [{ name: 'role', value: 'listbox' }, classAttr(format, 'mt-1 flex flex-col gap-0.5 rounded-lg border border-zinc-200 bg-white p-1 shadow-md')], items, format));
  }
  return element('div', [classAttr(format, 'flex w-full max-w-sm flex-col')], children, format);
};

export const emitCombobox: NodeEmitter<ComboboxNode> = (node, format) => {
  const p = node.props ?? {};
  const inputAttrs: Attr[] = [
    classAttr(format, `${INPUT_BASE} pr-8`),
    { name: 'type', value: 'text' },
    { name: 'role', value: 'combobox' },
    { name: 'aria-expanded', value: 'false' },
    { name: 'aria-autocomplete', value: 'list' },
  ];
  if (p.placeholder) inputAttrs.push({ name: 'placeholder', value: p.placeholder });
  const input = inlineElement('input', inputAttrs, '', format).replace('></input>', '>');
  const options: string[] = p.options ?? [];
  const items = options.map((o) =>
    inlineElement('li', [{ name: 'role', value: 'option' }, classAttr(format, 'rounded-md px-2.5 py-1.5 text-sm text-zinc-950 hover:bg-zinc-100')], escapeText(o, format), format),
  );
  const children: string[] = [input];
  if (items.length > 0) {
    children.push(element('ul', [{ name: 'role', value: 'listbox' }, classAttr(format, 'mt-1 flex flex-col gap-0.5 rounded-lg border border-zinc-200 bg-white p-1 shadow-md')], items, format));
  }
  return element('div', [classAttr(format, 'flex w-full max-w-sm flex-col')], children, format);
};

export const emitCommand: NodeEmitter<CommandNode> = (node, format, recurse) => {
  const p = node.props ?? {};
  const inputAttrs: Attr[] = [classAttr(format, INPUT_BASE), { name: 'type', value: 'text' }];
  if (p.placeholder) inputAttrs.push({ name: 'placeholder', value: p.placeholder });
  const input = inlineElement('input', inputAttrs, '', format).replace('></input>', '>');
  return element(
    'div',
    [classAttr(format, 'flex w-full max-w-md flex-col gap-2 rounded-xl border border-zinc-200 p-2'), { name: 'role', value: 'dialog' }, { name: 'aria-label', value: 'Command menu' }],
    [input, ...childFragments(node.children, format, recurse)],
    format,
  );
};

// ---------------------------------------------------------------------------
// checkbox-group / toggle-group
// ---------------------------------------------------------------------------

export const emitCheckboxGroup: NodeEmitter<CheckboxGroupNode> = (node, format, recurse) => {
  const children: string[] = [];
  if (node.props?.label) {
    children.push(inlineElement('p', [classAttr(format, 'text-sm font-medium text-zinc-950')], escapeText(node.props.label, format), format));
  }
  if (node.props?.description) {
    children.push(inlineElement('p', [classAttr(format, 'text-xs text-zinc-500')], escapeText(node.props.description, format), format));
  }
  children.push(...childFragments(node.children, format, recurse));
  return element('div', [{ name: 'role', value: 'group' }, classAttr(format, 'flex flex-col items-start gap-3')], children, format);
};

const TOGGLE_CLASSES = 'inline-flex h-8 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-500 hover:text-zinc-950';
const TOGGLE_PRESSED_CLASSES = 'inline-flex h-8 items-center justify-center rounded-lg border border-zinc-950 bg-zinc-950 px-3 text-sm font-medium text-zinc-50';

function bracketItems(children: readonly WiremdNode[] | undefined): WiremdNode[] {
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

export const emitToggleGroup: NodeEmitter<ToggleGroupNode> = (node, format) => {
  const items = bracketItems(node.children).filter((i) => i.type === 'button' || i.type === 'nav-item');
  const buttons = items.map((item) => {
    const pressed = (item as { props?: { classes?: string[]; variant?: string } }).props?.classes?.includes('active') === true ||
      (item as { props?: { variant?: string } }).props?.variant === 'primary';
    const attrs: Attr[] = [
      { name: 'type', value: 'button' },
      classAttr(format, pressed ? TOGGLE_PRESSED_CLASSES : TOGGLE_CLASSES),
      { name: 'aria-pressed', value: pressed ? 'true' : 'false' },
    ];
    return inlineElement('button', attrs, escapeText((item as { content?: string }).content ?? '', format), format);
  });
  return element('div', [{ name: 'role', value: 'group' }, classAttr(format, 'inline-flex items-center gap-1')], buttons, format);
};

// ---------------------------------------------------------------------------
// switch / slider / toggle
// ---------------------------------------------------------------------------

export const emitSwitch: NodeEmitter<SwitchNode> = (node, format) => {
  const p = node.props ?? {};
  const trackAttrs: Attr[] = [
    { name: 'type', value: 'button' },
    { name: 'role', value: 'switch' },
    { name: 'aria-checked', value: node.checked ? 'true' : 'false' },
    classAttr(format, node.checked
      ? 'relative h-5 w-9 rounded-full bg-zinc-950 transition-colors'
      : 'relative h-5 w-9 rounded-full bg-zinc-200 transition-colors'),
  ];
  if (p.disabled) trackAttrs.push({ name: 'disabled' });
  const thumb = inlineElement(
    'span',
    [classAttr(format, node.checked
      ? 'absolute left-[18px] top-0.5 size-4 rounded-full bg-white shadow-sm transition-all'
      : 'absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-all')],
    '',
    format,
  ).replace('></span>', '>');
  const control = element('button', trackAttrs, [thumb], format);
  if (p.label || p.description) {
    const text: string[] = [];
    if (p.label) text.push(inlineElement('span', [classAttr(format, 'text-sm text-zinc-950')], escapeText(p.label, format), format));
    if (p.description) text.push(inlineElement('span', [classAttr(format, 'text-xs text-zinc-500')], escapeText(p.description, format), format));
    const labels = element('span', [classAttr(format, 'flex flex-col')], text, format);
    return element('div', [classAttr(format, 'flex items-center gap-3')], [control, labels], format);
  }
  return control;
};

export const emitSlider: NodeEmitter<SliderNode> = (node, format) => {
  const p = node.props ?? {};
  const min = p.min ?? 0;
  const max = p.max ?? 100;
  const range = max - min || 1;
  const pct = Math.max(0, Math.min(100, ((node.value - min) / range) * 100));
  const labelHTML = p.label
    ? inlineElement('label', [classAttr(format, 'flex w-full justify-between text-sm text-zinc-950')], `${escapeText(p.label, format)} `, format)
    : '';
  const valueHTML = inlineElement('span', [classAttr(format, 'text-sm tabular-nums text-zinc-500')], escapeText(String(node.value), format), format);
  const track = element(
    'div',
    [
      { name: 'role', value: 'slider' },
      { name: 'aria-valuenow', value: String(node.value) },
      { name: 'aria-valuemin', value: String(min) },
      { name: 'aria-valuemax', value: String(max) },
      classAttr(format, 'relative h-1.5 w-full rounded-full bg-zinc-200'),
    ],
    [
      inlineElement('div', [classAttr(format, 'absolute left-0 top-0 h-full rounded-full bg-zinc-950')], '', format).replace('></div>', ` style="width:${pct}%"></div>`),
      inlineElement('div', [classAttr(format, 'absolute top-1/2 size-4 -translate-y-1/2 rounded-full border-2 border-zinc-950 bg-white')], '', format).replace('></div>', ` style="left:${pct}%"></div>`),
    ],
    format,
  );
  return element('div', [classAttr(format, 'flex w-full max-w-90 flex-col gap-2')], [labelHTML, valueHTML, track].filter(Boolean), format);
};

export const emitToggle: NodeEmitter<ToggleNode> = (node, format) => {
  const attrs: Attr[] = [
    { name: 'type', value: 'button' },
    classAttr(format, node.pressed ? TOGGLE_PRESSED_CLASSES : TOGGLE_CLASSES),
    { name: 'aria-pressed', value: node.pressed ? 'true' : 'false' },
  ];
  return inlineElement('button', attrs, escapeText(node.props?.label ?? '', format), format);
};
