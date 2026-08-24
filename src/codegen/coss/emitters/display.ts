/**
 * coss codegen - display family emitters (Phase 3 Task 6)
 *
 * Avatar, frame, group, empty, calendar, date-picker. Each emitter produces
 * the same canonical Tailwind markup that the wiremd renderer emits, so the
 * HTML and JSX output formats stay symmetric.
 *
 * MIT-licensed coss apps/ui class strings only; never copy source.
 */

import type { CodegenFormat, CodegenRecurse, NodeEmitter } from '../types.js';
import type { WiremdNode } from '../../../types.js';
import { escapeHtmlText, escapeJsxText } from '../escape.js';

type Attr = { name: string; value?: string };

function classAttr(format: CodegenFormat, classes: string): Attr {
  return { name: format === 'jsx' ? 'className' : 'class', value: classes };
}

function openTag(tag: string, attrs: readonly Attr[], format: CodegenFormat): string {
  const rendered = attrs
    .map((attr) => (attr.value === undefined ? attr.name : ` ${attr.name}="${attr.value}"`))
    .join('');
  return format === 'jsx' ? `<${tag}${rendered}>` : `<${tag}${rendered}>`;
}

function element(
  tag: string,
  attrs: readonly Attr[],
  children: readonly string[],
  format: CodegenFormat,
): string {
  const open = openTag(tag, attrs, format);
  const body = children.filter((f) => f.length > 0);
  if (body.length === 0) return `${open}</${tag}>`;
  return `${open}${body.join('')}</${tag}>`;
}

function inlineElement(tag: string, attrs: readonly Attr[], text: string, format: CodegenFormat): string {
  return `${openTag(tag, attrs, format)}${text}</${tag}>`;
}

function escapeText(text: string, format: CodegenFormat): string {
  return format === 'jsx' ? escapeJsxText(text) : escapeHtmlText(text);
}

function childFragments(
  children: readonly WiremdNode[] | undefined,
  format: CodegenFormat,
  recurse: CodegenRecurse,
): string[] {
  return (children ?? []).map((c) => recurse(c, format)).filter((f) => f.length > 0);
}

const AVATAR_SIZE: Readonly<Record<string, string>> = {
  sm: 'size-6 text-[10px]',
  md: 'size-9 text-xs',
  lg: 'size-12 text-base',
  xl: 'size-16 text-lg',
};

function avatarInitials(name: string | undefined): string {
  if (!name) return '?';
  return (
    name
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

type AvatarNode = Extract<WiremdNode, { type: 'avatar' }>;
export const emitAvatar: NodeEmitter<AvatarNode> = (node, format) => {
  const size = (['sm', 'md', 'lg', 'xl'] as const).find((s) => s === node.props?.size) ?? 'md';
  const classes = `inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-zinc-100 text-zinc-950 font-medium align-middle ${AVATAR_SIZE[size] ?? AVATAR_SIZE.md}`;
  const name = node.props?.name;
  const initials = avatarInitials(name);
  return element(
    'div',
    [classAttr(format, classes), { name: 'role', value: 'img' }, { name: 'aria-label', value: name ?? 'avatar' }],
    [
      inlineElement(
        'span',
        [classAttr(format, 'flex size-full items-center justify-center rounded-full bg-zinc-100')],
        escapeText(initials, format),
        format,
      ),
    ],
    format,
  );
};

type FrameNode = Extract<WiremdNode, { type: 'frame' }>;
export const emitFrame: NodeEmitter<FrameNode> = (node, format, recurse) => {
  const classes =
    'relative flex flex-col rounded-2xl bg-zinc-100 p-1 *:[[data-slot=frame-panel]+[data-slot=frame-panel]]:mt-1';
  return element(
    'div',
    [{ name: 'data-slot', value: 'frame' }, classAttr(format, classes)],
    childFragments(node.children, format, recurse),
    format,
  );
};

type GroupNode = Extract<WiremdNode, { type: 'group' }>;
export const emitGroup: NodeEmitter<GroupNode> = (node, format, recurse) => {
  const orientation: string = node.orientation === 'vertical' ? 'vertical' : 'horizontal';
  const classes = `flex w-fit *:focus-visible:z-1 has-[>[data-slot=group]]:gap-2 *:has-focus-visible:z-1 ${
    orientation === 'vertical'
      ? 'flex-col *:data-slot:has-[~[data-slot]]:rounded-b-none *:data-slot:has-[~[data-slot]]:border-b-0'
      : '*:data-slot:has-[~[data-slot]]:rounded-e-none *:data-slot:has-[~[data-slot]]:border-e-0'
  }`;
  return element(
    'div',
    [
      { name: 'role', value: 'group' },
      { name: 'data-orientation', value: orientation },
      { name: 'data-slot', value: 'group' },
      classAttr(format, classes),
    ],
    childFragments(node.children, format, recurse),
    format,
  );
};

type EmptyNode = Extract<WiremdNode, { type: 'empty' }>;
export const emitEmpty: NodeEmitter<EmptyNode> = (node, format, recurse) => {
  const classes =
    'flex min-w-0 flex-1 flex-col items-center justify-center gap-6 text-balance px-6 py-12 text-center md:py-20';
  return element(
    'div',
    [{ name: 'data-slot', value: 'empty' }, classAttr(format, classes)],
    childFragments(node.children, format, recurse),
    format,
  );
};

const CAL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const CAL_WD = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

type CalendarNode = Extract<WiremdNode, { type: 'calendar' }>;
export const emitCalendar: NodeEmitter<CalendarNode> = (node, format) => {
  const year = Number(node.props?.year ?? new Date().getFullYear());
  const monthRaw: string = (node.props?.month as string) ?? CAL_MONTHS[new Date().getMonth()];
  const monthIdx = Math.max(
    0,
    CAL_MONTHS.findIndex((m) => m.toLowerCase() === String(monthRaw).toLowerCase()),
  );
  const first = new Date(year, monthIdx, 1);
  const start = first.getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const dayCells: string[] = [];
  for (let i = 0; i < start; i++) {
    dayCells.push(
      inlineElement(
        'div',
        [classAttr(format, 'calendar-day calendar-day-outside text-zinc-300 pointer-events-none')],
        '',
        format,
      ),
    );
  }
  for (let d = 1; d <= daysInMonth; d++) {
    dayCells.push(
      inlineElement(
        'button',
        [
          { name: 'type', value: 'button' },
          classAttr(
            format,
            'calendar-day h-8 min-w-8 border-0 bg-transparent rounded-md cursor-pointer text-[13px] text-zinc-950 tabular-nums hover:bg-zinc-100',
          ),
        ],
        escapeText(String(d), format),
        format,
      ),
    );
  }
  while (dayCells.length % 7 !== 0) {
    dayCells.push(
      inlineElement(
        'div',
        [classAttr(format, 'calendar-day calendar-day-outside text-zinc-300 pointer-events-none')],
        '',
        format,
      ),
    );
  }
  const weekdays = CAL_WD.map((w) =>
    inlineElement(
      'div',
      [classAttr(format, 'calendar-weekday text-center text-[11px] font-medium text-zinc-500 py-1.5')],
      w,
      format,
    ),
  );
  return element(
    'div',
    [
      { name: 'data-slot', value: 'calendar' },
      classAttr(format, 'inline-flex flex-col rounded-xl border bg-white p-3 min-w-[260px] text-sm'),
    ],
    [
      element(
        'div',
        [classAttr(format, 'flex items-center justify-between px-1 pb-2')],
        [
          inlineElement(
            'button',
            [
              { name: 'type', value: 'button' },
              { name: 'aria-label', value: 'Previous month' },
              classAttr(format, 'w-7 h-7 border-0 bg-transparent rounded-md cursor-pointer text-zinc-500 hover:bg-zinc-100'),
            ],
            '←',
            format,
          ),
          inlineElement(
            'div',
            [classAttr(format, 'calendar-caption font-semibold text-zinc-950')],
            escapeText(`${CAL_MONTHS[monthIdx]} ${year}`, format),
            format,
          ),
          inlineElement(
            'button',
            [
              { name: 'type', value: 'button' },
              { name: 'aria-label', value: 'Next month' },
              classAttr(format, 'w-7 h-7 border-0 bg-transparent rounded-md cursor-pointer text-zinc-500 hover:bg-zinc-100'),
            ],
            '→',
            format,
          ),
        ],
        format,
      ),
      element(
        'div',
        [classAttr(format, 'calendar-grid grid grid-cols-7 gap-0.5')],
        [...weekdays, ...dayCells],
        format,
      ),
    ],
    format,
  );
};

type DatePickerNode = Extract<WiremdNode, { type: 'date-picker' }>;
export const emitDatePicker: NodeEmitter<DatePickerNode> = (node, format) => {
  const placeholder: string = (node.props?.placeholder as string) ?? 'Pick a date';
  const value: string | undefined = node.props?.value as string | undefined;
  const labelText = value ?? placeholder;
  const labelClasses = value
    ? 'date-picker-value font-medium'
    : 'date-picker-placeholder text-zinc-400 font-normal';
  return element(
    'div',
    [{ name: 'data-slot', value: 'date-picker' }, classAttr(format, 'inline-block')],
    [
      element(
        'button',
        [
          { name: 'type', value: 'button' },
          { name: 'aria-haspopup', value: 'dialog' },
          classAttr(
            format,
            'date-picker-trigger inline-flex items-center gap-2 h-9 px-3 min-w-[220px] bg-white border border-zinc-200 rounded-lg text-sm text-zinc-950 justify-between',
          ),
        ],
        [
          inlineElement('span', [classAttr(format, labelClasses)], escapeText(labelText, format), format),
          inlineElement(
            'span',
            [classAttr(format, 'date-picker-caret text-zinc-500 text-xs'), { name: 'aria-hidden', value: 'true' }],
            '▾',
            format,
          ),
        ],
        format,
      ),
    ],
    format,
  );
};
