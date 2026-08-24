/**
 * coss codegen - data entry family tests (Phase 3 Task 5)
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import { describe, expect, test } from 'vitest';
import { generateCode } from '../src/codegen/coss/index.js';
import { parse } from '../src/index.js';
import type { WiremdNode } from '../src/types.js';

function buttonGroup(children: WiremdNode[]): WiremdNode {
  return {
    type: 'container',
    containerType: 'button-group',
    props: {},
    children: children as any,
  } as WiremdNode;
}

describe('emitForm', () => {
  test('renders form with gap classes and children', () => {
    const out = generateCode({
      type: 'form',
      props: {},
      children: [{ type: 'input', props: { placeholder: 'Email' } } as WiremdNode],
    } as WiremdNode);
    expect(out).toMatch(/<form[^>]*class="flex flex-col gap-4"/);
    expect(out).toContain('Email');
  });

  test('action and method attributes pass through', () => {
    const out = generateCode({
      type: 'form',
      props: { action: '/login', method: 'post' },
      children: [],
    } as WiremdNode);
    expect(out).toContain('action="/login"');
    expect(out).toContain('method="post"');
  });

  test('parses ::: form end-to-end', () => {
    const ast = parse('::: form\nEmail [____]\n:::');
    expect(ast.children[0].type).toBe('form');
    const out = generateCode(ast.children[0] as any);
    expect(out).toContain('<form');
  });
});

describe('emitField', () => {
  test('label + description + error children', () => {
    const out = generateCode({
      type: 'field',
      props: { label: 'Email', description: 'We never share it', error: 'Invalid email' },
      children: [{ type: 'input', props: {} } as WiremdNode],
    } as WiremdNode);
    expect(out).toContain('<label');
    expect(out).toContain('Email');
    expect(out).toContain('We never share it');
    expect(out).toContain('role="alert"');
    expect(out).toContain('Invalid email');
    expect(out).toContain('text-red-600');
  });
});

describe('emitFieldset', () => {
  test('legend + description + border classes', () => {
    const out = generateCode({
      type: 'fieldset',
      props: { legend: 'Notifications', description: 'Choose channels' },
      children: [],
    } as WiremdNode);
    expect(out).toContain('<legend');
    expect(out).toContain('Notifications');
    expect(out).toContain('Choose channels');
    expect(out).toContain('rounded-xl border');
  });
});

describe('emitLabel', () => {
  test('plain label element', () => {
    const out = generateCode({ type: 'label', content: 'Email address', props: {} } as WiremdNode);
    expect(out).toMatch(/<label[^>]*>Email address<\/label>/);
  });

  test('htmlFor becomes for attribute', () => {
    const out = generateCode({
      type: 'label',
      content: 'X',
      props: { htmlFor: 'email' },
    } as WiremdNode);
    expect(out).toContain('for="email"');
  });
});

describe('emitInputGroup', () => {
  test('addonStart renders before children with border-r', () => {
    const out = generateCode({
      type: 'input-group',
      props: { addonStart: 'https://example.com/' },
      children: [{ type: 'input', props: {} } as WiremdNode],
    } as WiremdNode);
    expect(out.indexOf('https://example.com/')).toBeLessThan(out.indexOf('<input'));
    expect(out).toContain('border-r');
  });

  test('addonEnd renders after children with border-l', () => {
    const out = generateCode({
      type: 'input-group',
      props: { addonEnd: '.com' },
      children: [{ type: 'input', props: {} } as WiremdNode],
    } as WiremdNode);
    expect(out.indexOf('.com')).toBeGreaterThan(out.indexOf('<input'));
    expect(out).toContain('border-l');
  });
});

describe('emitOtpField', () => {
  test('default 6 slots with numeric attrs', () => {
    const out = generateCode({ type: 'otp-field', props: {} } as WiremdNode);
    const slots = out.match(/<input[^>]*inputMode="numeric"/g) ?? [];
    expect(slots.length).toBe(6);
    expect(out).toContain('maxLength="1"');
    expect(out).toContain('aria-label="Verification code"');
  });

  test('custom length', () => {
    const out = generateCode({ type: 'otp-field', props: { length: 4 } } as WiremdNode);
    const slots = out.match(/<input[^>]*inputMode="numeric"/g) ?? [];
    expect(slots.length).toBe(4);
  });
});

describe('emitNumberField', () => {
  test('steppers + numeric attrs', () => {
    const out = generateCode({
      type: 'number-field',
      props: { value: 3, min: 0, max: 10 },
    } as WiremdNode);
    expect(out).toContain('aria-label="Decrease"');
    expect(out).toContain('aria-label="Increase"');
    expect(out).toContain('min="0"');
    expect(out).toContain('max="10"');
    expect(out).toContain('value="3"');
  });
});

describe('emitAutocomplete', () => {
  test('combobox input + suggestion listbox', () => {
    const out = generateCode({
      type: 'autocomplete',
      props: { placeholder: 'Search fruits...', suggestions: ['Apple', 'Banana'] },
      children: [],
    } as WiremdNode);
    expect(out).toContain('role="combobox"');
    expect(out).toContain('aria-autocomplete="list"');
    expect(out).toContain('placeholder="Search fruits..."');
    expect(out).toContain('role="listbox"');
    expect(out).toContain('Apple');
  });
});

describe('emitCombobox', () => {
  test('options render as listbox options', () => {
    const out = generateCode({
      type: 'combobox',
      props: { placeholder: 'Country', options: ['US', 'CA'] },
      children: [],
    } as WiremdNode);
    expect(out).toContain('role="combobox"');
    expect(out).toContain('role="option"');
    expect(out).toContain('US');
    expect(out).toContain('CA');
  });

  test('parses ::: combobox with list children end-to-end', () => {
    // Blank line before the closing fence keeps it out of the last list-item (pre-existing remark quirk)
    const ast = parse('::: combobox {placeholder:"Pick..."}\n- US\n- CA\n\n:::');
    expect(ast.children[0].type).toBe('combobox');
    const node = ast.children[0] as any;
    expect(node.props.options).toEqual(['US', 'CA']);
    const out = generateCode(node);
    expect(out).toContain('US');
  });
});

describe('emitCommand', () => {
  test('dialog wrapper + input', () => {
    const out = generateCode({
      type: 'command',
      props: { placeholder: 'Type a command...' },
      children: [{ type: 'paragraph', content: 'Results', props: {} }],
    } as WiremdNode);
    expect(out).toContain('role="dialog"');
    expect(out).toContain('aria-label="Command menu"');
    expect(out).toContain('placeholder="Type a command..."');
    expect(out).toContain('Results');
  });
});

describe('emitCheckboxGroup', () => {
  test('group role + label + description', () => {
    const out = generateCode({
      type: 'checkbox-group',
      props: { label: 'Interests', description: 'Pick all' },
      children: [],
    } as WiremdNode);
    expect(out).toContain('role="group"');
    expect(out).toContain('Interests');
    expect(out).toContain('Pick all');
  });
});

describe('emitToggleGroup', () => {
  test('flattens button-group children and marks pressed', () => {
    const out = generateCode({
      type: 'toggle-group',
      props: {},
      children: [
        buttonGroup([
          { type: 'button', content: 'Star', props: { variant: 'primary' } } as WiremdNode,
          { type: 'button', content: 'Heart', props: {} } as WiremdNode,
        ]),
      ],
    } as WiremdNode);
    expect(out).toContain('aria-pressed="true"');
    expect(out).toContain('aria-pressed="false"');
    expect(out).toContain('bg-zinc-950');
    expect(out).toContain('Star');
  });
});

describe('emitSwitch', () => {
  test('checked switch: role=switch, aria-checked, dark track', () => {
    const out = generateCode({ type: 'switch', checked: true, props: {} } as WiremdNode);
    expect(out).toContain('role="switch"');
    expect(out).toContain('aria-checked="true"');
    expect(out).toContain('bg-zinc-950');
  });

  test('unchecked switch uses light track', () => {
    const out = generateCode({ type: 'switch', checked: false, props: {} } as WiremdNode);
    expect(out).toContain('aria-checked="false"');
    expect(out).toContain('bg-zinc-200');
  });

  test('with label wraps control and text in a row', () => {
    const out = generateCode({
      type: 'switch',
      checked: true,
      props: { label: 'Email notifications' },
    } as WiremdNode);
    expect(out).toContain('Email notifications');
    expect(out).toMatch(/<div[^>]*flex items-center gap-3/);
  });

  test('parses ::: switch {.checked} end-to-end', () => {
    const ast = parse('::: switch {.checked}\n:::');
    expect(ast.children[0].type).toBe('switch');
    expect((ast.children[0] as any).checked).toBe(true);
  });
});

describe('emitSlider', () => {
  test('slider role + aria values + fill width', () => {
    const out = generateCode({
      type: 'slider',
      value: 70,
      props: { min: 0, max: 100, label: 'Volume' },
    } as WiremdNode);
    expect(out).toContain('role="slider"');
    expect(out).toContain('aria-valuenow="70"');
    expect(out).toContain('aria-valuemin="0"');
    expect(out).toContain('aria-valuemax="100"');
    expect(out).toContain('style="width:70%"');
    expect(out).toContain('Volume');
  });

  test('value clamps to track range', () => {
    const out = generateCode({
      type: 'slider',
      value: 200,
      props: { min: 0, max: 100 },
    } as WiremdNode);
    expect(out).toContain('style="width:100%"');
  });
});

describe('emitToggle', () => {
  test('pressed toggle uses dark classes + aria-pressed', () => {
    const out = generateCode({
      type: 'toggle',
      pressed: true,
      props: { label: 'Bold' },
    } as WiremdNode);
    expect(out).toContain('aria-pressed="true"');
    expect(out).toContain('Bold');
    expect(out).toContain('bg-zinc-950');
  });

  test('unpressed toggle uses light classes', () => {
    const out = generateCode({ type: 'toggle', pressed: false, props: { label: 'Italic' } } as WiremdNode);
    expect(out).toContain('aria-pressed="false"');
    expect(out).toContain('text-zinc-500');
  });
});
