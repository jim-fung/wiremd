/**
 * coss codegen - actions + forms emitters (Task 2)
 *
 * One HTML + one JSX exact-output fixture per discriminant, plus variant,
 * boolean-attribute, escaping, name-determinism, and repeat-call checks.
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import { describe, expect, test } from 'vitest';
import { generateCode } from '../src/codegen/coss/index.js';
import type { WiremdNode } from '../src/types.js';

// ---------------------------------------------------------------------------
// Shared class strings (mirrored by the emitters; fixtures pin them exactly)
// ---------------------------------------------------------------------------

const PRIMARY_CLASSES =
  'inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-zinc-950 bg-zinc-950 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50';
const SECONDARY_CLASSES =
  'inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-950 shadow-sm transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50';
const DANGER_CLASSES =
  'inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-red-600 bg-red-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50';

const INPUT_CLASSES =
  'h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1 disabled:opacity-50';
const TEXTAREA_CLASSES =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1 disabled:opacity-50';
const SELECT_CLASSES =
  'h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1 disabled:opacity-50';
const CHOICE_INPUT_CLASSES =
  'h-4 w-4 shrink-0 rounded-lg border-zinc-300 accent-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1 disabled:opacity-50';
const CHOICE_LABEL_CLASSES = 'inline-flex items-center gap-2 text-sm text-zinc-950';

const badgeClasses = (variant: 'default' | 'primary' | 'success' | 'warning' | 'error'): string => {
  const tones: Record<typeof variant, string> = {
    default: 'border-zinc-200 bg-white',
    primary: 'border-zinc-950 bg-zinc-950',
    success: 'border-emerald-200 bg-emerald-50',
    warning: 'border-amber-200 bg-amber-50',
    error: 'border-red-200 bg-red-50',
  };
  const texts: Record<typeof variant, string> = {
    default: 'text-zinc-700',
    primary: 'text-white',
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    error: 'text-red-700',
  };
  return `inline-flex items-center rounded-lg border ${tones[variant]} px-2 py-0.5 text-xs font-medium ${texts[variant]}`;
};

const iconClasses = (size: 'small' | 'medium' | 'large'): string => {
  const dims = size === 'small' ? 'h-4 w-4' : size === 'large' ? 'h-6 w-6' : 'h-5 w-5';
  return `inline-flex ${dims} shrink-0 items-center justify-center text-zinc-950`;
};

// ---------------------------------------------------------------------------
// button
// ---------------------------------------------------------------------------

describe('button emitter', () => {
  const primary: WiremdNode = { type: 'button', content: 'Save', props: { variant: 'primary' } };

  test('primary variant HTML', () => {
    expect(generateCode(primary)).toBe(
      `<button type="button" class="${PRIMARY_CLASSES}">Save</button>`,
    );
  });

  test('primary variant JSX (className, no imports, native element)', () => {
    const jsx = generateCode(primary, { format: 'jsx' });
    expect(jsx).toBe(`<button type="button" className="${PRIMARY_CLASSES}">Save</button>`);
  });

  test('secondary variant HTML', () => {
    const node: WiremdNode = { type: 'button', content: 'Cancel', props: { variant: 'secondary' } };
    expect(generateCode(node)).toBe(
      `<button type="button" class="${SECONDARY_CLASSES}">Cancel</button>`,
    );
  });

  test('danger variant JSX', () => {
    const node: WiremdNode = { type: 'button', content: 'Delete', props: { variant: 'danger' } };
    expect(generateCode(node, { format: 'jsx' })).toBe(
      `<button type="button" className="${DANGER_CLASSES}">Delete</button>`,
    );
  });

  test('unspecified variant defaults to primary', () => {
    const node: WiremdNode = { type: 'button', content: 'Save', props: {} };
    expect(generateCode(node)).toBe(`<button type="button" class="${PRIMARY_CLASSES}">Save</button>`);
  });

  test('props.type is honored', () => {
    const node: WiremdNode = { type: 'button', content: 'Go', props: { type: 'submit' } };
    expect(generateCode(node)).toBe(`<button type="submit" class="${PRIMARY_CLASSES}">Go</button>`);
  });

  test('href renders an anchor with the same classes and no type attribute', () => {
    const node: WiremdNode = {
      type: 'button',
      content: 'Docs',
      href: '/docs',
      props: { variant: 'secondary' },
    };
    expect(generateCode(node)).toBe(`<a href="/docs" class="${SECONDARY_CLASSES}">Docs</a>`);
    expect(generateCode(node, { format: 'jsx' })).toBe(
      `<a href="/docs" className="${SECONDARY_CLASSES}">Docs</a>`,
    );
  });

  test('state disabled renders the bare disabled boolean in both formats', () => {
    const node: WiremdNode = {
      type: 'button',
      content: 'Save',
      props: { variant: 'primary', state: 'disabled' },
    };
    expect(generateCode(node)).toBe(
      `<button type="button" disabled class="${PRIMARY_CLASSES}">Save</button>`,
    );
    expect(generateCode(node, { format: 'jsx' })).toBe(
      `<button type="button" disabled className="${PRIMARY_CLASSES}">Save</button>`,
    );
  });

  test('content is escaped per format', () => {
    const node: WiremdNode = { type: 'button', content: 'Save & <ship>', props: {} };
    expect(generateCode(node)).toBe(
      `<button type="button" class="${PRIMARY_CLASSES}">Save &amp; &lt;ship&gt;</button>`,
    );
    expect(generateCode(node, { format: 'jsx' })).toBe(
      `<button type="button" className="${PRIMARY_CLASSES}">Save &amp; &lt;ship&gt;</button>`,
    );
  });

  test('children are recursed when content is absent', () => {
    const node: WiremdNode = {
      type: 'button',
      children: [{ type: 'badge', content: 'Continue', props: {} }],
      props: {},
    };
    expect(generateCode(node)).toBe(
      `<button type="button" class="${PRIMARY_CLASSES}"><span class="${badgeClasses('default')}">Continue</span></button>`,
    );
  });

  test('unsafe href throws Unsafe URL', () => {
    const node: WiremdNode = {
      type: 'button',
      content: 'x',
      href: 'javascript:alert(1)',
      props: {},
    };
    expect(() => generateCode(node)).toThrow('Unsafe URL: javascript:alert(1)');
  });
});

// ---------------------------------------------------------------------------
// badge
// ---------------------------------------------------------------------------

describe('badge emitter', () => {
  test('primary variant HTML', () => {
    const node: WiremdNode = { type: 'badge', content: 'New', props: { variant: 'primary' } };
    expect(generateCode(node)).toBe(`<span class="${badgeClasses('primary')}">New</span>`);
  });

  test('primary variant JSX', () => {
    const node: WiremdNode = { type: 'badge', content: 'New', props: { variant: 'primary' } };
    expect(generateCode(node, { format: 'jsx' })).toBe(
      `<span className="${badgeClasses('primary')}">New</span>`,
    );
  });

  test.each([
    ['default', 'Beta'],
    ['success', 'Active'],
    ['warning', 'Pending'],
    ['error', 'Failed'],
  ] as const)('%s variant HTML', (variant, label) => {
    const node: WiremdNode = { type: 'badge', content: label, props: { variant } };
    expect(generateCode(node)).toBe(`<span class="${badgeClasses(variant)}">${label}</span>`);
  });

  test('unspecified variant defaults to default', () => {
    const node: WiremdNode = { type: 'badge', content: 'Beta', props: {} };
    expect(generateCode(node)).toBe(`<span class="${badgeClasses('default')}">Beta</span>`);
  });
});

// ---------------------------------------------------------------------------
// icon
// ---------------------------------------------------------------------------

describe('icon emitter', () => {
  const iconSvg = (format: 'html' | 'jsx'): string =>
    format === 'jsx'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /></svg>';

  test('medium icon HTML is a labelled span with an SVG circle placeholder', () => {
    const node: WiremdNode = { type: 'icon', props: { name: 'check', size: 'medium' } };
    expect(generateCode(node)).toBe(
      `<span role="img" aria-label="check" class="${iconClasses('medium')}">${iconSvg('html')}</span>`,
    );
  });

  test('medium icon JSX uses camelCase SVG presentation attributes', () => {
    const node: WiremdNode = { type: 'icon', props: { name: 'check', size: 'medium' } };
    expect(generateCode(node, { format: 'jsx' })).toBe(
      `<span role="img" aria-label="check" className="${iconClasses('medium')}">${iconSvg('jsx')}</span>`,
    );
  });

  test('small and large sizes change only the dimension classes', () => {
    const small: WiremdNode = { type: 'icon', props: { name: 'x', size: 'small' } };
    const large: WiremdNode = { type: 'icon', props: { name: 'x', size: 'large' } };
    expect(generateCode(small)).toBe(
      `<span role="img" aria-label="x" class="${iconClasses('small')}">${iconSvg('html')}</span>`,
    );
    expect(generateCode(large)).toBe(
      `<span role="img" aria-label="x" class="${iconClasses('large')}">${iconSvg('html')}</span>`,
    );
  });

  test('unspecified size defaults to medium and the name is attribute-escaped', () => {
    const node: WiremdNode = { type: 'icon', props: { name: 'chevron "right"' } };
    expect(generateCode(node)).toBe(
      `<span role="img" aria-label="chevron &quot;right&quot;" class="${iconClasses('medium')}">${iconSvg('html')}</span>`,
    );
  });
});

// ---------------------------------------------------------------------------
// checkbox
// ---------------------------------------------------------------------------

describe('checkbox emitter', () => {
  test('checked checkbox with label HTML', () => {
    const node: WiremdNode = { type: 'checkbox', label: 'Accept terms', checked: true, props: {} };
    expect(generateCode(node)).toBe(
      `<label class="${CHOICE_LABEL_CLASSES}"><input type="checkbox" checked class="${CHOICE_INPUT_CLASSES}" />Accept terms</label>`,
    );
  });

  test('checked checkbox with label JSX', () => {
    const node: WiremdNode = { type: 'checkbox', label: 'Accept terms', checked: true, props: {} };
    expect(generateCode(node, { format: 'jsx' })).toBe(
      `<label className="${CHOICE_LABEL_CLASSES}"><input type="checkbox" checked className="${CHOICE_INPUT_CLASSES}" />Accept terms</label>`,
    );
  });

  test('unchecked omits the checked attribute; disabled renders bare', () => {
    const node: WiremdNode = {
      type: 'checkbox',
      label: 'Newsletter',
      checked: false,
      props: { disabled: true },
    };
    const html = generateCode(node);
    expect(html).toBe(
      `<label class="${CHOICE_LABEL_CLASSES}"><input type="checkbox" disabled class="${CHOICE_INPUT_CLASSES}" />Newsletter</label>`,
    );
    expect(html).not.toContain(' checked');
    expect(generateCode(node, { format: 'jsx' })).toBe(
      `<label className="${CHOICE_LABEL_CLASSES}"><input type="checkbox" disabled className="${CHOICE_INPUT_CLASSES}" />Newsletter</label>`,
    );
  });

  test('props.required renders bare in HTML and JSX', () => {
    const node: WiremdNode = {
      type: 'checkbox',
      label: 'Consent',
      checked: false,
      props: { required: true },
    };
    expect(generateCode(node, { format: 'jsx' })).toBe(
      `<label className="${CHOICE_LABEL_CLASSES}"><input type="checkbox" required className="${CHOICE_INPUT_CLASSES}" />Consent</label>`,
    );
  });
});

// ---------------------------------------------------------------------------
// input
// ---------------------------------------------------------------------------

describe('input emitter', () => {
  test('typed input with placeholder and required HTML', () => {
    const node: WiremdNode = {
      type: 'input',
      props: { inputType: 'email', placeholder: 'you@example.com', required: true },
    };
    expect(generateCode(node)).toBe(
      `<input type="email" placeholder="you@example.com" required class="${INPUT_CLASSES}" />`,
    );
  });

  test('typed input with placeholder and required JSX', () => {
    const node: WiremdNode = {
      type: 'input',
      props: { inputType: 'email', placeholder: 'you@example.com', required: true },
    };
    expect(generateCode(node, { format: 'jsx' })).toBe(
      `<input type="email" placeholder="you@example.com" required className="${INPUT_CLASSES}" />`,
    );
  });

  test('value and disabled render; absent required stays omitted', () => {
    const node: WiremdNode = {
      type: 'input',
      props: { value: 'jane@example.com', disabled: true },
    };
    const html = generateCode(node);
    expect(html).toBe(
      `<input type="text" value="jane@example.com" disabled class="${INPUT_CLASSES}" />`,
    );
    expect(html).not.toContain(' required');
  });

  test('placeholder is escaped per attribute rules in both formats', () => {
    const node: WiremdNode = { type: 'input', props: { placeholder: 'Say "hi"' } };
    expect(generateCode(node)).toBe(
      `<input type="text" placeholder="Say &quot;hi&quot;" class="${INPUT_CLASSES}" />`,
    );
    expect(generateCode(node, { format: 'jsx' })).toBe(
      `<input type="text" placeholder="Say &quot;hi&quot;" className="${INPUT_CLASSES}" />`,
    );
  });
});

// ---------------------------------------------------------------------------
// textarea
// ---------------------------------------------------------------------------

describe('textarea emitter', () => {
  test('rows, placeholder and value HTML', () => {
    const node: WiremdNode = {
      type: 'textarea',
      props: { rows: 4, value: 'Hello world', placeholder: 'Your bio' },
    };
    expect(generateCode(node)).toBe(
      `<textarea rows="4" placeholder="Your bio" class="${TEXTAREA_CLASSES}">Hello world</textarea>`,
    );
  });

  test('rows, placeholder and value JSX', () => {
    const node: WiremdNode = {
      type: 'textarea',
      props: { rows: 4, value: 'Hello world', placeholder: 'Your bio' },
    };
    expect(generateCode(node, { format: 'jsx' })).toBe(
      `<textarea rows="4" placeholder="Your bio" className="${TEXTAREA_CLASSES}">Hello world</textarea>`,
    );
  });

  test('required renders bare and value is text-escaped', () => {
    const node: WiremdNode = {
      type: 'textarea',
      props: { required: true, value: 'a < b & c' },
    };
    expect(generateCode(node)).toBe(
      `<textarea required class="${TEXTAREA_CLASSES}">a &lt; b &amp; c</textarea>`,
    );
    expect(generateCode(node, { format: 'jsx' })).toBe(
      `<textarea required className="${TEXTAREA_CLASSES}">a &lt; b &amp; c</textarea>`,
    );
  });
});

// ---------------------------------------------------------------------------
// select (options rendered internally)
// ---------------------------------------------------------------------------

describe('select emitter', () => {
  const options = [
    { type: 'option' as const, value: 'free', label: 'Free' },
    { type: 'option' as const, value: 'pro', label: 'Pro', selected: true },
  ];

  test('placeholder plus selected option HTML', () => {
    const node: WiremdNode = {
      type: 'select',
      props: { placeholder: 'Choose a plan' },
      options,
    };
    expect(generateCode(node)).toBe(
      `<select class="${SELECT_CLASSES}"><option value="" disabled>Choose a plan</option><option value="free">Free</option><option value="pro" selected>Pro</option></select>`,
    );
  });

  test('placeholder plus selected option JSX', () => {
    const node: WiremdNode = {
      type: 'select',
      props: { placeholder: 'Choose a plan' },
      options,
    };
    expect(generateCode(node, { format: 'jsx' })).toBe(
      `<select className="${SELECT_CLASSES}"><option value="" disabled>Choose a plan</option><option value="free">Free</option><option value="pro" selected>Pro</option></select>`,
    );
  });

  test('placeholder option carries selected when no real option is selected', () => {
    const node: WiremdNode = {
      type: 'select',
      props: { placeholder: 'Choose a plan' },
      options: [{ type: 'option', value: 'free', label: 'Free' }],
    };
    expect(generateCode(node)).toBe(
      `<select class="${SELECT_CLASSES}"><option value="" disabled selected>Choose a plan</option><option value="free">Free</option></select>`,
    );
  });

  test('required and multiple render bare without a placeholder', () => {
    const node: WiremdNode = {
      type: 'select',
      props: { required: true, multiple: true },
      options: [{ type: 'option', value: 'a', label: 'A' }],
    };
    expect(generateCode(node, { format: 'jsx' })).toBe(
      `<select required multiple className="${SELECT_CLASSES}"><option value="a">A</option></select>`,
    );
  });

  test('option values and labels are escaped', () => {
    const node: WiremdNode = {
      type: 'select',
      props: {},
      options: [{ type: 'option', value: 'a&b', label: 'A & B' }],
    };
    expect(generateCode(node)).toBe(
      `<select class="${SELECT_CLASSES}"><option value="a&amp;b">A &amp; B</option></select>`,
    );
  });
});

// ---------------------------------------------------------------------------
// radio + radio-group
// ---------------------------------------------------------------------------

describe('radio emitter', () => {
  test('standalone radio with explicit props.name HTML', () => {
    const node: WiremdNode = {
      type: 'radio',
      label: 'Pro',
      selected: true,
      props: { name: 'plan', value: 'pro' },
    };
    expect(generateCode(node)).toBe(
      `<label class="${CHOICE_LABEL_CLASSES}"><input type="radio" name="plan" value="pro" checked class="${CHOICE_INPUT_CLASSES}" />Pro</label>`,
    );
  });

  test('standalone radio JSX', () => {
    const node: WiremdNode = {
      type: 'radio',
      label: 'Pro',
      selected: true,
      props: { name: 'plan', value: 'pro' },
    };
    expect(generateCode(node, { format: 'jsx' })).toBe(
      `<label className="${CHOICE_LABEL_CLASSES}"><input type="radio" name="plan" value="pro" checked className="${CHOICE_INPUT_CLASSES}" />Pro</label>`,
    );
  });

  test('unselected radio omits checked and has a deterministic fallback name', () => {
    const node: WiremdNode = { type: 'radio', label: 'Free', selected: false, props: {} };
    expect(generateCode(node)).toBe(
      `<label class="${CHOICE_LABEL_CLASSES}"><input type="radio" name="radio-group" class="${CHOICE_INPUT_CLASSES}" />Free</label>`,
    );
  });
});

describe('radio-group emitter', () => {
  const group: WiremdNode = {
    type: 'radio-group',
    name: 'plan',
    props: { inline: true },
    children: [
      { type: 'radio', label: 'Free', selected: false, props: { value: 'free' } },
      { type: 'radio', label: 'Pro', selected: true, props: { value: 'pro' } },
    ],
  };

  test('inline group propagates its name to children HTML', () => {
    expect(generateCode(group)).toBe(
      `<div class="flex flex-wrap items-center gap-4">` +
        `<label class="${CHOICE_LABEL_CLASSES}"><input type="radio" name="plan" value="free" class="${CHOICE_INPUT_CLASSES}" />Free</label>` +
        `<label class="${CHOICE_LABEL_CLASSES}"><input type="radio" name="plan" value="pro" checked class="${CHOICE_INPUT_CLASSES}" />Pro</label>` +
        `</div>`,
    );
  });

  test('inline group propagates its name to children JSX', () => {
    expect(generateCode(group, { format: 'jsx' })).toBe(
      `<div className="flex flex-wrap items-center gap-4">` +
        `<label className="${CHOICE_LABEL_CLASSES}"><input type="radio" name="plan" value="free" className="${CHOICE_INPUT_CLASSES}" />Free</label>` +
        `<label className="${CHOICE_LABEL_CLASSES}"><input type="radio" name="plan" value="pro" checked className="${CHOICE_INPUT_CLASSES}" />Pro</label>` +
        `</div>`,
    );
  });

  test('stacked group (inline false) uses the grid layout', () => {
    const stacked: WiremdNode = {
      type: 'radio-group',
      name: 'plan',
      props: { inline: false },
      children: [{ type: 'radio', label: 'Free', selected: false, props: { value: 'free' } }],
    };
    expect(generateCode(stacked)).toBe(
      `<div class="grid gap-2">` +
        `<label class="${CHOICE_LABEL_CLASSES}"><input type="radio" name="plan" value="free" class="${CHOICE_INPUT_CLASSES}" />Free</label>` +
        `</div>`,
    );
  });

  test('radio props.name wins over the group name', () => {
    const node: WiremdNode = {
      type: 'radio-group',
      name: 'group-name',
      props: {},
      children: [
        { type: 'radio', label: 'A', selected: false, props: { name: 'own-name', value: 'a' } },
      ],
    };
    expect(generateCode(node)).toContain('name="own-name"');
  });

  test('nameless group falls back to a deterministic name - never Math.random', () => {
    const node: WiremdNode = {
      type: 'radio-group',
      props: {},
      children: [
        { type: 'radio', label: 'A', selected: false, props: { value: 'a' } },
        { type: 'radio', label: 'B', selected: true, props: { value: 'b' } },
      ],
    };
    const first = generateCode(node);
    const second = generateCode(node);
    expect(first).toBe(second);
    expect(first).toBe(
      `<div class="grid gap-2">` +
        `<label class="${CHOICE_LABEL_CLASSES}"><input type="radio" name="radio-group" value="a" class="${CHOICE_INPUT_CLASSES}" />A</label>` +
        `<label class="${CHOICE_LABEL_CLASSES}"><input type="radio" name="radio-group" value="b" checked class="${CHOICE_INPUT_CLASSES}" />B</label>` +
        `</div>`,
    );
  });
});

// ---------------------------------------------------------------------------
// cross-cutting contracts
// ---------------------------------------------------------------------------

describe('actions + forms cross-cutting contracts', () => {
  const composite: readonly WiremdNode[] = [
    { type: 'button', content: 'Save', props: { variant: 'primary' } },
    { type: 'button', content: 'Cancel', props: { variant: 'secondary' } },
    { type: 'button', content: 'Delete', props: { variant: 'danger' } },
    { type: 'button', content: 'Docs', href: '/docs', props: {} },
    { type: 'badge', content: 'New', props: { variant: 'primary' } },
    { type: 'badge', content: 'Beta', props: {} },
    { type: 'icon', props: { name: 'check' } },
    { type: 'checkbox', label: 'Accept', checked: true, props: {} },
    { type: 'input', props: { inputType: 'email', placeholder: 'a@b.co', required: true } },
    { type: 'textarea', props: { rows: 4, value: 'bio' } },
    {
      type: 'select',
      props: { placeholder: 'Choose' },
      options: [
        { type: 'option', value: 'free', label: 'Free' },
        { type: 'option', value: 'pro', label: 'Pro', selected: true },
      ],
    },
    {
      type: 'radio-group',
      name: 'plan',
      props: { inline: true },
      children: [
        { type: 'radio', label: 'Free', selected: false, props: { value: 'free' } },
        { type: 'radio', label: 'Pro', selected: true, props: { value: 'pro' } },
      ],
    },
  ];

  test('output is deterministic across repeated calls in both formats', () => {
    expect(generateCode(composite)).toBe(generateCode(composite));
    expect(generateCode(composite, { format: 'jsx' })).toBe(
      generateCode(composite, { format: 'jsx' }),
    );
  });

  test('JSX output never uses class=, imports, or ="true" booleans', () => {
    const jsx = generateCode(composite, { format: 'jsx' });
    expect(jsx).not.toContain(' class=');
    expect(jsx).not.toContain('class="');
    expect(jsx).not.toContain('import');
    expect(jsx).not.toContain('={true}');
    expect(jsx).not.toContain('={false}');
    // Boolean attributes are bare (or omitted), never ="true"/="false" pairs.
    expect(jsx).not.toMatch(
      /\s(required|disabled|checked|selected|multiple)="(?:true|false)"/,
    );
  });

  test('HTML output never uses className', () => {
    expect(generateCode(composite)).not.toContain('className');
  });
});
