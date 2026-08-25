/**
 * Embed/preview coverage for the Phase 3 primitives (feedback, overlay,
 * navigation, data entry, display families) and the coss parity family
 * (accordion, collapsible, menu, context-menu, toolbar).
 *
 * Two gates per family:
 *   1. `compileWiremd` accepts the discriminant — the validator allowlist
 *      (`validTypes`) and the preview renderer used to reject/drop these.
 *   2. `renderToPreview` emits the same class-name suffixes, aria/data
 *      attributes, and DOM shape the standalone html-renderer produces, so
 *      host CSS written against one matches the other.
 */

import { describe, expect, test } from 'vitest';
import { compileWiremd, renderToPreview } from '../src/embed/index.js';

function preview(source: string, classPrefix = 'ok-wiremd-') {
  const compiled = compileWiremd(source, { style: 'coss' });
  expect(compiled.document).not.toBeNull();
  const result = renderToPreview(compiled.document!, { classPrefix, style: 'coss' });
  return { compiled, result };
}

/** No validator rejections may ride on a Phase 3 compile. */
function expectNoAstRejections(compiled: ReturnType<typeof compileWiremd>): void {
  const rejections = compiled.diagnostics.filter(
    (d) => d.code === 'wmd-invalid-wiremd-ast' && d.message.includes('INVALID_COMPONENT_TYPE'),
  );
  expect(rejections, JSON.stringify(rejections)).toEqual([]);
}

/** One representative source per Phase 3 discriminant (44 + form). */
const PHASE3_SOURCES: Array<[name: string, source: string]> = [
  // feedback
  ['toast', '::: toast {.success}\nSaved!\n:::'],
  ['skeleton', '::: skeleton {width:"200px"}\n:::'],
  ['spinner', '::: spinner\n:::'],
  ['kbd', '[⌘K]{.kbd}'],
  ['progress', '::: progress {value:60}\n:::'],
  ['meter', '::: meter {value:30}\n:::'],
  // overlays
  ['dialog', '::: dialog\n## Confirm\nBody\n:::'],
  ['alert-dialog', '::: alert-dialog\n## Delete?\nSure?\n:::'],
  ['sheet', '::: sheet {.left}\nContent\n:::'],
  ['drawer', '::: drawer {.bottom}\nContent\n:::'],
  ['popover', '::: popover\nContent\n:::'],
  ['tooltip', '::: tooltip\nHelpful text\n:::'],
  ['preview-card', '::: preview-card\n## Title\nBody\n:::'],
  // navigation
  ['pagination', '::: pagination\n[1]* [2] [3]\n:::'],
  ['segmented-control', '::: segmented-control\n[Day]* [Week]\n:::'],
  ['scroll-area', '::: scroll-area\nLine\n:::'],
  ['sidebar', '::: sidebar\n- Home\n- Settings\n:::'],
  ['menubar', '::: menubar\n[File] [Edit]\n:::'],
  // data entry
  ['form', '::: form\n### Email\n[_____________]\n:::'],
  ['field', '::: field\n### Name\n[_____________]\n:::'],
  ['fieldset', '::: fieldset\n## Legend\n[ ] One\n:::'],
  ['label', '::: label\nEmail address\n:::'],
  ['input-group', '::: input-group {addonStart:"@"}\n[_____________]\n:::'],
  ['otp-field', '::: otp-field {length:6}\n:::'],
  ['number-field', '::: number-field {min:0 max:10}\n:::'],
  ['autocomplete', '::: autocomplete\n- Alpha\n- Beta\n:::'],
  ['combobox', '::: combobox\n- Apple\n- Banana\n:::'],
  ['command', '::: command\n- Run task\n:::'],
  ['checkbox-group', '::: checkbox-group\n## Extras\n[ ] Gift\n:::'],
  ['toggle-group', '::: toggle-group\n[B]* [I]\n:::'],
  ['switch', '::: switch {.checked} {label:"Email"}\n:::'],
  ['slider', '::: slider {value:60}\n:::'],
  ['toggle', '::: toggle {.active label:"Bold"}\n:::'],
  // display
  ['avatar', '::: avatar {name:"Ada Lovelace" size:"lg"}\n:::'],
  ['frame', '::: frame\nContent\n:::'],
  ['group', '::: group\n[One] [Two]\n:::'],
  ['empty', '::: empty\nNothing here\n:::'],
  ['calendar', '::: calendar {month:"January" year:2026}\n:::'],
  ['date-picker', '::: date-picker {placeholder:"Pick a date"}\n:::'],
  // coss parity family
  ['accordion', '::: accordion\n\n::: accordion-item First question\nFirst answer here.\n:::\n\n::: accordion-item Second question {.collapsed}\nSecond answer.\n:::\n\n:::'],
  ['collapsible', '::: collapsible Advanced settings {.collapsed}\nHidden settings content.\n:::'],
  ['menu', '::: menu Actions\n### File group\n- New file {shortcut:"⌘N"}\n- [x] Enable sync\n- ( ) Light\n- (x) Dark\n\n---\n\n- Delete {.danger}\n:::'],
  ['context-menu', '::: context-menu Canvas zone\n- Cut\n- Copy\n- Paste {disabled}\n:::'],
  ['toolbar', '::: toolbar\n[Bold]* [Italic] [Underline]\n\n---\n\n[Save]\n:::'],
];

describe('phase 3 embed compile gate', () => {
  test('every Phase 3 discriminant compiles without INVALID_COMPONENT_TYPE', () => {
    // The 40-primitive list includes `form`, which predates Phase 3; the
    // corpus covers all of them (44 sources, form included) plus the
    // 5 coss parity primitives.
    expect(PHASE3_SOURCES.length).toBe(44);
    for (const [name, source] of PHASE3_SOURCES) {
      const compiled = compileWiremd(source, { style: 'coss' });
      expect(compiled.document, name).not.toBeNull();
      expectNoAstRejections(compiled);
    }
  });

  test('preview fragments stay script-free, prefixed, and fully rendered', () => {
    for (const [name, source] of PHASE3_SOURCES) {
      const { result } = preview(source);
      // Nothing falls into the unknown-node branch.
      expect(result.html, name).not.toContain('Unknown node type');
      // Preview policy holds on the new surface too.
      expect(result.html, name).not.toMatch(/<script/i);
      const unescaped = result.html.replace(/&lt;[\s\S]*?&gt;/g, '');
      expect(unescaped, name).not.toMatch(/\son[a-z]+\s*=/i);
      // Every emitted class token carries the host prefix.
      const classTokens = [...result.html.matchAll(/class="([^"]*)"/g)].flatMap((m) =>
        m[1].split(/\s+/),
      );
      for (const token of classTokens) {
        if (token === '') continue;
        expect(token.startsWith('ok-wiremd-'), `${name}: class token "${token}"`).toBe(true);
      }
    }
  });
});

describe('phase 3 feedback family previews', () => {
  test('toast carries role=status and its variant on data-variant', () => {
    const { compiled, result } = preview('::: toast {.success}\nSaved!\n:::');
    expectNoAstRejections(compiled);
    expect(result.html).toMatch(/<div class="ok-wiremd-toast" role="status" data-variant="success">/);
  });

  test('skeleton renders a shimmer div with sanitized inline size', () => {
    const { result } = preview('::: skeleton {width:"200px" height:"12px"}\n:::');
    expect(result.html).toMatch(/<div class="ok-wiremd-skeleton" style="width:200px;height:12px"><\/div>/);
  });

  test('kbd renders a <kbd> element with its key text', () => {
    const { result } = preview('[⌘K]{.kbd}');
    expect(result.html).toMatch(/<kbd class="ok-wiremd-kbd">⌘K<\/kbd>/);
  });

  test('progress exposes progressbar aria plus a width-% indicator', () => {
    const { result } = preview('::: progress {value:60 label:"Uploading"}\n:::');
    expect(result.html).toMatch(/role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100"/);
    expect(result.html).toMatch(/class="ok-wiremd-progress-indicator" style="width:60%"/);
    expect(result.html).toContain('ok-wiremd-progress-label');
  });

  test('spinner and meter carry their role metadata', () => {
    expect(preview('::: spinner {size:"large"}\n:::').result.html).toMatch(
      /<div class="ok-wiremd-spinner ok-wiremd-spinner-lg" role="status" aria-label="Loading"><\/div>/,
    );
    expect(preview('::: meter {value:30 min:0 max:50}\n:::').result.html).toMatch(
      /role="meter" aria-valuenow="30" aria-valuemin="0" aria-valuemax="50"/,
    );
  });
});

describe('phase 3 overlay family previews', () => {
  test('dialog renders its dialog role, description, and close button', () => {
    const { result } = preview('::: dialog {description:"Are you sure?"}\n## Confirm\nBody\n:::');
    expect(result.html).toMatch(/<div class="ok-wiremd-dialog" role="dialog">/);
    expect(result.html).toContain('ok-wiremd-dialog-description');
    expect(result.html).toMatch(/class="ok-wiremd-dialog-close" aria-label="Close"/);
  });

  test('sheet and drawer expose their side on data-side', () => {
    expect(preview('::: sheet {.left}\nContent\n:::').result.html).toMatch(
      /<div class="ok-wiremd-sheet" role="dialog" data-side="left">/,
    );
    expect(preview('::: drawer {.bottom}\nContent\n:::').result.html).toMatch(
      /<div class="ok-wiremd-drawer" role="dialog" data-side="bottom">/,
    );
  });

  test('alert-dialog uses alertdialog role with action pair', () => {
    const { result } = preview('::: alert-dialog {cancelText:"No" actionText:"Yes"}\n## Delete?\n:::');
    expect(result.html).toMatch(/<div class="ok-wiremd-alert-dialog" role="alertdialog">/);
    expect(result.html).toContain('ok-wiremd-alert-dialog-actions');
    expect(result.html).toContain('>No</button>');
    expect(result.html).toContain('>Yes</button>');
  });

  test('tooltip is a role=tooltip span with data-side', () => {
    const { result } = preview('::: tooltip\nHelpful text\n:::');
    expect(result.html).toMatch(/<span class="ok-wiremd-tooltip" role="tooltip" data-side="top">/);
    expect(result.html).toContain('Helpful text');
  });

  test('popover renders statically with dialog role', () => {
    expect(preview('::: popover\nContent\n:::').result.html).toMatch(
      /<div class="ok-wiremd-popover" role="dialog">/,
    );
  });
});

describe('phase 3 navigation family previews', () => {
  test('pagination marks the current page with aria-current', () => {
    const { result } = preview('::: pagination\n[1]* [2] [3]\n:::');
    expect(result.html).toMatch(/aria-label="pagination" role="navigation"/);
    expect(result.html).toMatch(/class="ok-wiremd-pagination-link ok-wiremd-pagination-active" href="#" aria-current="page"/);
    expect(result.html).toMatch(/class="ok-wiremd-pagination-link" href="#">2<\/a>/);
  });

  test('sidebar renders aside > nav menu with sidebar-item links', () => {
    const { result } = preview('::: sidebar\n- Home\n- Settings\n:::');
    expect(result.html).toMatch(/<aside class="ok-wiremd-sidebar-nav">/);
    expect(result.html).toMatch(/<nav class="ok-wiremd-sidebar-menu">/);
    expect(result.html).toMatch(/<a class="ok-wiremd-sidebar-item" href="#">Home<\/a>/);
  });

  test('segmented-control and menubar keep their group roles', () => {
    expect(preview('::: segmented-control\n[Day]* [Week]\n:::').result.html).toMatch(
      /class="ok-wiremd-segmented-item ok-wiremd-segmented-active" aria-pressed="true"/,
    );
    expect(preview('::: menubar\n[File] [Edit]\n:::').result.html).toMatch(
      /<div class="ok-wiremd-menubar" role="menubar">/,
    );
  });

  test('scroll-area wraps content in a viewport div', () => {
    const { result } = preview('::: scroll-area {maxHeight:"120px"}\nLine\n:::');
    expect(result.html).toContain('ok-wiremd-scroll-area-viewport');
    expect(result.html).toMatch(/style="max-height:120px"/);
  });
});

describe('phase 3 data entry family previews', () => {
  test('form and field compose: form wrapper, field label + control', () => {
    const { result } = preview('::: form\n::: field {description:"We never share it."}\n### Email\n[_____________]\n:::\n:::');
    expect(result.html).toMatch(/<form class="ok-wiremd-form">/);
    expect(result.html).toContain('ok-wiremd-field-label');
    expect(result.html).toContain('ok-wiremd-field-description');
    expect(result.html).toContain('ok-wiremd-input');
  });

  test('otp-field renders six readonly digit slots', () => {
    const { result } = preview('::: otp-field {length:6}\n:::');
    expect(result.html).toMatch(/role="group" aria-label="Verification code"/);
    expect(result.html.match(/class="ok-wiremd-otp-slot"/g)).toHaveLength(6);
  });

  test('combobox lists options in a listbox', () => {
    const { result } = preview('::: combobox {placeholder:"Pick one"}\n- Apple\n- Banana\n:::');
    expect(result.html).toMatch(/role="combobox" aria-expanded="false" aria-autocomplete="list" placeholder="Pick one"/);
    expect(result.html).toMatch(/<ul class="ok-wiremd-combobox-list" role="listbox">/);
    expect(result.html.match(/class="ok-wiremd-combobox-option" role="option"/g)).toHaveLength(2);
  });

  test('switch mirrors checked state on aria-checked and switch-on class', () => {
    const on = preview('::: switch {.checked} {label:"Email"}\n:::').result.html;
    expect(on).toMatch(/class="ok-wiremd-switch ok-wiremd-switch-on" role="switch" aria-checked="true"/);
    const off = preview('::: switch {label:"Spam"}\n:::').result.html;
    expect(off).toMatch(/class="ok-wiremd-switch" role="switch" aria-checked="false"/);
    expect(off).toContain('ok-wiremd-switch-label');
  });

  test('slider exposes value aria and fill width percentage', () => {
    const { result } = preview('::: slider {value:60 label:"Volume"}\n:::');
    expect(result.html).toMatch(/class="ok-wiremd-slider-track" role="slider" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100"/);
    expect(result.html).toMatch(/class="ok-wiremd-slider-fill" style="width:60%"/);
    expect(result.html).toMatch(/class="ok-wiremd-slider-thumb" style="left:60%"/);
  });

  test('toggle and toggle-group carry aria-pressed state', () => {
    expect(preview('::: toggle {.active label:"Bold"}\n:::').result.html).toMatch(
      /class="ok-wiremd-toggle ok-wiremd-toggle-pressed" aria-pressed="true"/,
    );
    expect(preview('::: toggle-group\n[B]* [I]\n:::').result.html).toMatch(
      /class="ok-wiremd-toggle ok-wiremd-toggle-pressed" aria-pressed="true"/,
    );
  });

  test('number-field, autocomplete, and command keep their control shapes', () => {
    expect(preview('::: number-field {min:0 max:10}\n:::').result.html).toMatch(
      /class="ok-wiremd-number-input" type="number" min="0" max="10"/,
    );
    expect(preview('::: autocomplete\n- Alpha\n:::').result.html).toMatch(
      /<ul class="ok-wiremd-autocomplete-list" role="listbox">/,
    );
    expect(preview('::: command\n- Run task\n:::').result.html).toMatch(
      /<div class="ok-wiremd-command" role="dialog" aria-label="Command menu">/,
    );
  });

  test('fieldset, label, input-group, checkbox-group keep marker classes', () => {
    expect(preview('::: fieldset\n## Legend\n:::').result.html).toContain('ok-wiremd-fieldset-legend');
    expect(preview('::: label\nEmail address\n:::').result.html).toMatch(
      /<label class="ok-wiremd-label">Email address<\/label>/,
    );
    expect(preview('::: input-group {addonStart:"@"}\n[_____________]\n:::').result.html).toContain(
      'ok-wiremd-input-group-addon',
    );
    expect(preview('::: checkbox-group\n## Extras\n:::').result.html).toMatch(
      /<div class="ok-wiremd-checkbox-group" role="group">/,
    );
  });
});

describe('phase 3 display family previews', () => {
  test('avatar derives initials and applies the size class', () => {
    const { result } = preview('::: avatar {name:"Ada Lovelace" size:"lg"}\n:::');
    expect(result.html).toMatch(/class="ok-wiremd-avatar ok-wiremd-avatar-lg" role="img" aria-label="Ada Lovelace"/);
    expect(result.html).toMatch(/<span class="ok-wiremd-avatar-fallback">AL<\/span>/);
  });

  test('empty keeps its data-slot marker', () => {
    expect(preview('::: empty\nNothing here\n:::').result.html).toMatch(
      /<div class="ok-wiremd-empty" data-slot="empty">/,
    );
  });

  test('group mirrors orientation as class and data attribute', () => {
    expect(preview('::: group {orientation:"vertical"}\n[One]\n:::').result.html).toMatch(
      /class="ok-wiremd-group ok-wiremd-group-vertical" role="group" data-orientation="vertical"/,
    );
    expect(preview('::: group\n[One]\n:::').result.html).toContain('ok-wiremd-group-horizontal');
  });

  test('calendar renders caption and exactly 31 day buttons for January 2026', () => {
    const { result } = preview('::: calendar {month:"January" year:2026}\n:::');
    expect(result.html).toContain('<div class="ok-wiremd-calendar-caption">January 2026</div>');
    expect(result.html.match(/<button type="button" class="ok-wiremd-calendar-day">/g)).toHaveLength(31);
    // Grid padding cells are inert divs, not buttons.
    expect(result.html).toContain('ok-wiremd-calendar-day-outside');
    expect(result.html).toContain('ok-wiremd-calendar-weekday');
  });

  test('date-picker shows the placeholder when no value is set', () => {
    const { result } = preview('::: date-picker {placeholder:"Pick a date"}\n:::');
    expect(result.html).toMatch(/class="ok-wiremd-date-picker" data-slot="date-picker"/);
    expect(result.html).toMatch(
      /class="ok-wiremd-date-picker-value ok-wiremd-date-picker-placeholder">Pick a date</,
    );
    expect(result.html).toMatch(/class="ok-wiremd-date-picker-trigger" aria-haspopup="dialog"/);
  });
});

describe('coss parity family previews', () => {
  test('accordion expands the first item by default and hides the rest', () => {
    const { result } = preview('::: accordion\n\n::: accordion-item A\na\n:::\n\n::: accordion-item B\nb\n:::\n\n:::');
    expect(result.html).toMatch(/class="ok-wiremd-accordion-trigger" aria-expanded="true"/);
    expect(result.html).toMatch(/class="ok-wiremd-accordion-trigger" aria-expanded="false"/);
    expect(result.html).toMatch(/class="ok-wiremd-accordion-panel" hidden>/);
    expect(result.html).toMatch(/class="ok-wiremd-accordion-panel">/);
  });

  test('accordion {.collapsed} keeps every panel hidden', () => {
    const { result } = preview('::: accordion\n\n::: accordion-item First question\nFirst answer here.\n:::\n\n::: accordion-item Second question {.collapsed}\nSecond answer.\n:::\n\n:::');
    expect(result.html).not.toContain('aria-expanded="true"');
    expect(result.html.match(/class="ok-wiremd-accordion-panel" hidden>/g)).toHaveLength(2);
    expect(result.html).toContain('First answer here.');
  });

  test('collapsible collapsed state lands on class, aria, and the hidden panel', () => {
    const { result } = preview('::: collapsible Advanced settings {.collapsed}\nHidden settings content.\n:::');
    expect(result.html).toContain('ok-wiremd-collapsible-collapsed');
    expect(result.html).toMatch(/class="ok-wiremd-collapsible-trigger" aria-expanded="false">Advanced settings/);
    expect(result.html).toMatch(/class="ok-wiremd-collapsible-panel" hidden>/);
    expect(result.html).toContain('Hidden settings content.');
  });

  test('menu keeps its trigger, popup role, kbd shortcut, and destructive flag', () => {
    const { result } = preview('::: menu Actions\n### File group\n- New file {shortcut:"⌘N"}\n- [x] Enable sync\n- Delete {.danger}\n:::');
    expect(result.html).toMatch(/<button type="button" class="ok-wiremd-menu-trigger" aria-haspopup="menu" aria-expanded="true">Actions/);
    expect(result.html).toMatch(/<div class="ok-wiremd-menu-popup" role="menu">/);
    expect(result.html).toMatch(/<div class="ok-wiremd-menu-label">File group<\/div>/);
    expect(result.html).toMatch(/<kbd class="ok-wiremd-menu-shortcut">⌘N<\/kbd>/);
    expect(result.html).toMatch(/class="ok-wiremd-menu-item ok-wiremd-menu-destructive" role="menuitem"/);
    expect(result.html).toMatch(/class="ok-wiremd-menu-item" role="menuitemcheckbox" aria-checked="true"/);
  });

  test('context-menu renders a dashed zone div instead of a button trigger', () => {
    const { result } = preview('::: context-menu Canvas zone\n- Cut\n- Paste {disabled}\n:::');
    expect(result.html).toMatch(/<div class="ok-wiremd-context-menu-trigger" data-wmd-context-zone>Canvas zone<\/div>/);
    expect(result.html).not.toMatch(/<button[^>]*ok-wiremd-context-menu/);
    expect(result.html).toMatch(/<div class="ok-wiremd-context-menu-popup" role="menu">/);
    expect(result.html).toMatch(/class="ok-wiremd-context-menu-item ok-wiremd-context-menu-item-disabled" role="menuitem" aria-disabled="true"/);
  });

  test('toolbar carries role=toolbar and vertical separator spans', () => {
    const { result } = preview('::: toolbar\n[Bold]* [Italic] [Underline]\n\n---\n\n[Save]\n:::');
    expect(result.html).toMatch(/<div class="ok-wiremd-toolbar" role="toolbar">/);
    expect(result.html).toMatch(
      /<span class="ok-wiremd-toolbar-separator" role="separator" aria-orientation="vertical"><\/span>/,
    );
    expect(result.html).toContain('>Bold</button>');
    expect(result.html).toContain('>Save</button>');
  });
});
