/**
 * coss codegen - display family tests (Phase 3 Task 6)
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import { describe, expect, test } from 'vitest';
import { generateCode } from '../src/codegen/coss/index.js';
import { parse } from '../src/index.js';

describe('emitAvatar', () => {
  test('default size with name + initials', () => {
    const out = generateCode({
      type: 'avatar',
      props: { name: 'Ada Lovelace' },
    } as any);
    expect(out).toContain('role="img"');
    expect(out).toContain('aria-label="Ada Lovelace"');
    expect(out).toContain('AL');
    expect(out).toMatch(/size-9/);
  });

  test('size variants map to width/height', () => {
    for (const [size, klass] of [
      ['sm', 'size-6'],
      ['md', 'size-9'],
      ['lg', 'size-12'],
      ['xl', 'size-16'],
    ]) {
      const out = generateCode({ type: 'avatar', props: { name: 'X', size } } as any);
      expect(out).toContain(klass);
    }
  });

  test('name -> first letter only initials when no whitespace', () => {
    const out = generateCode({ type: 'avatar', props: { name: 'cher' } } as any);
    expect(out).toContain('C');
  });

  test('placeholder initials when no name', () => {
    const out = generateCode({ type: 'avatar', props: {} } as any);
    expect(out).toContain('?');
    expect(out).toContain('aria-label="avatar"');
  });
});

describe('emitFrame', () => {
  test('renders as flex column with rounded-2xl muted background', () => {
    const out = generateCode({
      type: 'frame',
      props: {},
      children: [{ type: 'paragraph', content: 'Panel body', props: {} }],
    } as any);
    expect(out).toContain('rounded-2xl');
    expect(out).toContain('bg-zinc-100');
    expect(out).toContain('data-slot="frame"');
    expect(out).toContain('Panel body');
  });
});

describe('emitGroup', () => {
  test('horizontal default with data-orientation', () => {
    const out = generateCode({
      type: 'group',
      orientation: 'horizontal',
      props: {},
      children: [{ type: 'button', content: 'A', props: {} }],
    } as any);
    expect(out).toContain('data-orientation="horizontal"');
    expect(out).toContain('role="group"');
  });

  test('vertical orientation adds flex-col', () => {
    const out = generateCode({
      type: 'group',
      orientation: 'vertical',
      props: {},
      children: [],
    } as any);
    expect(out).toContain('data-orientation="vertical"');
    expect(out).toContain('flex-col');
  });
});

describe('emitEmpty', () => {
  test('centered dashed card with data-slot', () => {
    const out = generateCode({
      type: 'empty',
      props: {},
      children: [{ type: 'heading', content: 'Nothing here', level: 3, props: {} }],
    } as any);
    expect(out).toContain('data-slot="empty"');
    expect(out).toContain('text-center');
    expect(out).toContain('Nothing here');
  });
});

describe('emitCalendar', () => {
  test('renders month + year in caption + nav buttons', () => {
    const out = generateCode({
      type: 'calendar',
      props: { month: 'August', year: 2026 },
      children: [],
    } as any);
    expect(out).toContain('data-slot="calendar"');
    expect(out).toContain('August 2026');
    expect(out).toContain('aria-label="Previous month"');
    expect(out).toContain('aria-label="Next month"');
  });

  test('emits 28-31 day buttons for August 2026', () => {
    const out = generateCode({
      type: 'calendar',
      props: { month: 'August', year: 2026 },
      children: [],
    } as any);
    const dayButtons = (out.match(/<button[^>]*calendar-day[^>]*>/g) ?? []).length;
    expect(dayButtons).toBe(31);
  });

  test('weekday header renders Su-Mo-Tu-We-Th-Fr-Sa', () => {
    const out = generateCode({
      type: 'calendar',
      props: { month: 'March', year: 2026 },
      children: [],
    } as any);
    for (const w of ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']) {
      expect(out).toContain(`>${w}</div>`);
    }
  });
});

describe('emitDatePicker', () => {
  test('default placeholder when no value', () => {
    const out = generateCode({ type: 'date-picker', props: {} } as any);
    expect(out).toContain('aria-haspopup="dialog"');
    expect(out).toContain('Pick a date');
    expect(out).toContain('date-picker-placeholder');
  });

  test('value overrides placeholder, uses date-picker-value class', () => {
    const out = generateCode({
      type: 'date-picker',
      props: { value: '2026-08-24', placeholder: 'Pick' },
    } as any);
    expect(out).toContain('2026-08-24');
    expect(out).toContain('date-picker-value');
    expect(out).not.toContain('date-picker-placeholder');
  });
});

describe('display family end-to-end', () => {
  test('parses ::: avatar with name and size, emits initials', () => {
    const ast = parse('::: avatar {name:"Grace Hopper" size:sm}\n:::');
    expect(ast.children[0].type).toBe('avatar');
    const out = generateCode(ast.children[0] as any);
    expect(out).toContain('GH');
    expect(out).toContain('size-6');
  });

  test('parses ::: group with button children', () => {
    const ast = parse('::: group\n[A] [B]*\n:::');
    expect(ast.children[0].type).toBe('group');
    const out = generateCode(ast.children[0] as any);
    expect(out).toContain('data-orientation="horizontal"');
    expect(out).toContain('A');
  });

  test('parses ::: calendar with month/year props', () => {
    const ast = parse('::: calendar {month:"December" year:2026}\n:::');
    expect(ast.children[0].type).toBe('calendar');
    const out = generateCode(ast.children[0] as any);
    expect(out).toContain('December 2026');
  });
});
