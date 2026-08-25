/**
 * coss component gallery — renders every component type through the default
 * (coss) style via the CLI preview server and asserts per-component markup,
 * coss theme markers, and demo-fence codegen pane behavior.
 *
 * Visual evidence: each section captures a viewport screenshot; the final test
 * captures the full page. Videos + screenshots are archived by scripts/run-e2e.mjs.
 */
describe('coss components (gallery page, default style)', () => {
  beforeEach(() => {
    cy.visit('/coss-gallery.md');
    // Gate every test on the page's actual content so assertions never race
    // the dev server's initial render.
    cy.get('body.wmd-root.wmd-coss').should('exist');
    cy.get('nav.wmd-nav').should('exist');
  });

  it('applies the coss theme as the default style', () => {
    cy.get('body').should('have.class', 'wmd-coss');
    cy.get('body').should('have.css', 'background-color', 'rgb(250, 250, 250)');
    // Inter stack; no external font fetch (theme must not @import).
    cy.get('body')
      .invoke('css', 'font-family')
      .should('include', 'Inter');
  });

  it('renders navigation: brand, items, and a button item', () => {
    cy.get('nav.wmd-nav').should('exist');
    cy.get('.wmd-brand').should('contain.text', 'Gallery');
    cy.get('.wmd-nav-item').should('have.length.at.least', 2);
    cy.contains('.wmd-nav-item', 'Overview').should('be.visible');
    cy.get('nav').contains('Docs').should('be.visible');
    cy.screenshot('coss-nav', { capture: 'viewport' });
  });

  it('renders buttons with coss primary/secondary/danger variants', () => {
    cy.contains('button', 'Save').should('be.visible');
    cy.contains('button', 'Cancel').should('be.visible');
    cy.contains('button', 'Delete').should('be.visible');
    // Primary variant renders as a filled (near-black) button.
    cy.contains('button', 'Save').then(($btn) => {
      const bg = $btn.css('background-color');
      // coss primary is #0a0a0a (10,10,10)
      expect(bg).to.eq('rgb(10, 10, 10)');
    });
    cy.contains('button', 'Primary Button').should('be.visible');
    cy.screenshot('coss-buttons', { capture: 'viewport' });
  });

  it('renders form controls: inputs, textarea, select, checkbox, radio', () => {
    cy.get('input.wmd-input').should('have.length.at.least', 2);
    cy.get('textarea').should('exist');
    cy.get('select').should('exist');
    cy.get('input[type="checkbox"]').should('exist');
    cy.get('input[type="radio"]').should('have.length.at.least', 2);
    cy.get('input.wmd-input').first().should('have.css', 'border-radius');
    cy.screenshot('coss-forms', { capture: 'viewport' });
  });

  it('renders badges across variants and icons', () => {
    cy.get('.wmd-badge').should('have.length.at.least', 5);
    cy.contains('.wmd-badge', 'Default').should('be.visible');
    cy.get('.wmd-badge-primary').should('exist');
    cy.get('.wmd-badge-success').should('exist');
    cy.get('.wmd-badge-warning').should('exist');
    cy.get('.wmd-badge-error').should('exist');
    cy.get('.wmd-icon').should('have.length.at.least', 1);
    cy.screenshot('coss-badges-icons', { capture: 'viewport' });
  });

  it('renders content: headings, blockquote, code, table, lists, separator', () => {
    cy.get('h3.wmd-h3').should('have.length.at.least', 2);
    cy.get('blockquote.wmd-blockquote').should('contain.text', 'fast to write');
    cy.get('p.wmd-paragraph code').should('contain.text', 'const x = 1');
    cy.get('pre.wmd-code-block').should('contain.text', 'greet');
    cy.get('table.wmd-table').within(() => {
      cy.get('th').should('have.length', 3);
      cy.contains('td', 'Alice').should('be.visible');
    });
    cy.get('ul.wmd-list').should('exist');
    cy.get('ol.wmd-list').should('exist');
    cy.get('hr.wmd-separator').should('exist');
    cy.screenshot('coss-content', { capture: 'viewport' });
  });

  it('renders tabs with visible active panel and breadcrumbs', () => {
    cy.get('.wmd-tab-headers').should('exist');
    cy.contains('.wmd-tab-header', 'Overview').should('be.visible');
    cy.contains('.wmd-tab-header', 'Activity').should('be.visible');
    // Exactly one panel visible (static active state).
    cy.get('.wmd-tab-panel:visible').should('have.length', 1);
    cy.get('.wmd-tab-panel:visible').should('contain.text', 'Overview panel');
    cy.get('nav.wmd-breadcrumbs').should('contain.text', 'Home');
    cy.get('.wmd-breadcrumb-current').should('contain.text', 'Editor');
    cy.screenshot('coss-tabs-breadcrumbs', { capture: 'viewport' });
  });

  it('renders layout containers: card, hero, modal, grid, row', () => {
    cy.get('.wmd-container-card').should('have.length.at.least', 2);
    cy.get('.wmd-container-hero').should('exist');
    cy.get('.wmd-container-modal').should('exist');
    cy.get('.wmd-grid').should('exist');
    cy.get('.wmd-row').should('exist');
    // Card chrome: border + radius per coss.
    cy.get('.wmd-container-card').first().should(($el) => {
      expect(parseFloat($el.css('border-top-width'))).to.be.greaterThan(0);
      expect(parseFloat($el.css('border-top-left-radius'))).to.be.greaterThan(0);
    });
    cy.screenshot('coss-containers', { capture: 'viewport' });
  });

  it('renders alerts: default, four variants, and opener-line title', () => {
    cy.get('.wmd-container-alert').should('have.length.at.least', 5);
    // Every alert carries role="alert" (a11y contract).
    cy.get('.wmd-container-alert[role="alert"]').should('have.length.at.least', 5);
    // Variant classes are present and distinct from the base.
    cy.get('.wmd-container-alert.wmd-success').should('exist');
    cy.get('.wmd-container-alert.wmd-info').should('exist');
    cy.get('.wmd-container-alert.wmd-warning').should('exist');
    cy.get('.wmd-container-alert.wmd-error').should('exist');
    // Opener-line title is present in the rendered output (pre-existing parser
    // wraps the warning alert body in a form-group because of the inline
    // buttons, so we search the warning's HTML for the title text rather than
    // asserting a specific `.wmd-alert-title` descendant).
    cy.contains('.wmd-container-alert.wmd-warning', 'Storage limit reached').should('be.visible');
    cy.contains('.wmd-container-alert.wmd-warning', 'Upgrade your plan').should('be.visible');
    cy.screenshot('coss-alerts', { capture: 'viewport' });
  });

  it('renders feedback family: toast, skeleton, spinner, kbd, progress, meter', () => {
    // toast
    cy.get('.wmd-toast').should('have.length.at.least', 2);
    cy.get('.wmd-toast[role="status"]').should('have.length.at.least', 2);
    cy.contains('.wmd-toast', 'Changes saved').should('be.visible');
    // kbd (inline shortcut)
    cy.get('kbd.wmd-kbd').should('have.length.at.least', 2);
    cy.contains('kbd.wmd-kbd', '⌘K').should('be.visible');
    // skeleton
    cy.get('.wmd-skeleton').should('have.length.at.least', 1);
    // spinner
    cy.get('.wmd-spinner[role="status"]').should('have.length.at.least', 1);
    cy.get('.wmd-spinner.wmd-spinner-md').should('exist');
    // progress
    cy.get('.wmd-progress[role="progressbar"]').should('have.length.at.least', 2);
    cy.get('.wmd-progress-indicator[style*="width:60%"]').should('exist');
    cy.get('.wmd-progress-indicator[style*="width:100%"]').should('exist');
    // meter
    cy.get('.wmd-meter[role="meter"]').should('have.length.at.least', 1);
    cy.get('.wmd-meter-indicator[style*="width:30%"]').should('exist');
    cy.screenshot('coss-feedback', { capture: 'viewport' });
  });

  it('renders overlay family: dialog, alert-dialog, sheet, drawer, popover, tooltip, preview-card', () => {
    // dialog
    cy.get('.wmd-dialog[role="dialog"]').should('have.length.at.least', 1);
    cy.contains('.wmd-dialog', 'Edit profile').should('be.visible');
    // alert-dialog
    cy.get('.wmd-alert-dialog[role="alertdialog"]').should('have.length.at.least', 1);
    cy.contains('.wmd-alert-dialog', 'Delete project?').should('be.visible');
    cy.contains('.wmd-alert-dialog', 'Cancel').should('be.visible');
    // sheet (right side)
    cy.get('.wmd-sheet[data-side="right"]').should('have.length.at.least', 1);
    cy.contains('.wmd-sheet', 'Filters').should('be.visible');
    // drawer (left side)
    cy.get('.wmd-drawer[data-side="left"]').should('have.length.at.least', 1);
    // popover
    cy.get('.wmd-popover[role="dialog"]').should('have.length.at.least', 1);
    cy.contains('.wmd-popover', 'Quick actions').should('be.visible');
    // tooltip
    cy.get('.wmd-tooltip[role="tooltip"]').should('have.length.at.least', 1);
    cy.contains('.wmd-tooltip', 'Press S').should('be.visible');
    cy.screenshot('coss-overlays', { capture: 'viewport' });
  });

  it('renders navigation family: pagination, segmented-control, scroll-area, sidebar, menubar', () => {
    // pagination
    cy.get('.wmd-pagination[aria-label="pagination"]').should('have.length.at.least', 1);
    cy.get('.wmd-pagination-active').should('exist');
    cy.get('.wmd-pagination-link[aria-current="page"]').should('exist');
    cy.contains('.wmd-pagination', 'Next').should('be.visible');
    // segmented-control
    cy.get('.wmd-segmented-control[role="group"]').should('have.length.at.least', 1);
    cy.get('.wmd-segmented-item.wmd-segmented-active').should('exist');
    cy.contains('.wmd-segmented-control', 'Week').should('be.visible');
    // scroll-area
    cy.get('.wmd-scroll-area').should('have.length.at.least', 1);
    cy.get('.wmd-scroll-area[style*="max-height"]').should('exist');
    // sidebar
    cy.get('aside.wmd-sidebar-nav').should('have.length.at.least', 1);
    cy.get('.wmd-sidebar-menu .wmd-sidebar-item').should('have.length.at.least', 3);
    // menubar
    cy.get('.wmd-menubar[role="menubar"]').should('have.length.at.least', 1);
    cy.contains('.wmd-menubar', 'File').should('be.visible');
    cy.screenshot('coss-navigation', { capture: 'viewport' });
  });

  it('renders data entry family: form, field, fieldset, switch, slider, toggle, otp, number, combobox, command', () => {
    // form
    cy.get('form.wmd-form').should('have.length.at.least', 1);
    cy.contains('.wmd-form', 'Sign in').should('exist');
    // field
    cy.get('.wmd-field .wmd-field-label').should('contain', 'Workspace name');
    // fieldset
    cy.get('fieldset.wmd-fieldset .wmd-fieldset-legend').should('contain', 'Notifications');
    // label
    cy.get('.wmd-label').should('contain', 'Email address');
    // input-group
    cy.get('.wmd-input-group .wmd-input-group-addon').should('contain', 'example.com/');
    // otp-field
    cy.get('.wmd-otp-field .wmd-otp-slot').should('have.length', 6);
    // number-field
    cy.get('.wmd-number-field .wmd-number-stepper').should('have.length', 2);
    // autocomplete
    cy.get('.wmd-autocomplete-input').should('have.attr', 'placeholder', 'Search fruits...');
    cy.get('.wmd-autocomplete-option').should('have.length', 3);
    // combobox
    cy.get('.wmd-combobox-input').should('have.attr', 'placeholder', 'Select country...');
    cy.get('.wmd-combobox-option').should('have.length.at.least', 3);
    // command
    cy.get('.wmd-command-input').should('have.attr', 'placeholder', 'Type a command...');
    // checkbox-group
    cy.get('.wmd-checkbox-group .wmd-checkbox-group-description').should('contain', 'Pick all that apply');
    // toggle-group
    cy.contains('.wmd-toggle-group', 'Star').should('exist');
    // switch
    cy.get('.wmd-switch[aria-checked="true"]').should('exist');
    cy.get('.wmd-switch[aria-checked="false"]').should('exist');
    cy.get('.wmd-switch-on').should('exist');
    // slider
    cy.get('.wmd-slider .wmd-slider-track').should('have.attr', 'aria-valuenow', '70');
    cy.get('.wmd-slider-fill[style*="width:70%"]').should('exist');
    // toggle
    cy.get('.wmd-toggle-pressed').should('exist');
    cy.contains('.wmd-toggle', 'Bold').should('exist');
    cy.screenshot('coss-data-entry', { capture: 'viewport' });
  });

  it('renders display family: avatar, frame, group, empty, calendar, date-picker', () => {
    // avatars
    cy.get('.wmd-avatar[role="img"]').should('have.length.at.least', 3);
    cy.get('.wmd-avatar.wmd-avatar-md').should('contain', 'AL');
    cy.get('.wmd-avatar.wmd-avatar-lg').should('contain', 'GH');
    cy.get('.wmd-avatar.wmd-avatar-sm').should('contain', 'L');
    // frame
    cy.get('.wmd-frame').should('contain', 'Frame title');
    // group horizontal
    cy.get('.wmd-group.wmd-group-horizontal[role="group"]').should('exist');
    cy.contains('.wmd-group-horizontal', 'Cut').should('be.visible');
    // group vertical
    cy.get('.wmd-group.wmd-group-vertical[role="group"][data-orientation="vertical"]').should('exist');
    // empty
    cy.get('.wmd-empty[data-slot="empty"]').should('contain', 'No projects yet');
    // calendar
    cy.get('.wmd-calendar[data-slot="calendar"]').should('exist');
    cy.get('.wmd-calendar .wmd-calendar-caption').should('contain', 'August 2026');
    cy.get('.wmd-calendar .wmd-calendar-day').its('length').should('be.gte', 28);
    cy.get('.wmd-calendar-nav[aria-label="Previous month"]').should('exist');
    cy.get('.wmd-calendar-nav[aria-label="Next month"]').should('exist');
    // date-picker
    cy.get('.wmd-date-picker[data-slot="date-picker"]').should('have.length', 2);
    cy.get('.wmd-date-picker-trigger[aria-haspopup="dialog"]').should('have.length', 2);
    cy.contains('.wmd-date-picker', 'Pick departure date').should('exist');
    cy.contains('.wmd-date-picker', '2026-08-24').should('exist');
    cy.screenshot('coss-display', { capture: 'viewport' });
  });

  it('shows generated coss code in demo panes by default', () => {
    // Plain ::: demo panes show generated code (escaped in pane), not wiremd source.
    cy.get('.wmd-demo-code').then(($panes) => {
      expect($panes.length).to.be.at.least(3);
      const texts = [...$panes].map((el) => el.textContent || '');
      // At least one pane contains a generated fragment (escaped markup + classes).
      const generated = texts.some(
        (t) => /<(button|div|span|input)/.test(t) && /(class=|className=)/.test(t),
      );
      expect(generated, 'some pane shows generated code').to.eq(true);
      // Generated panes do not contain wiremd container source markers.
      const first = texts[0];
      expect(first).to.not.contain('::: card');
    });
  });

  it('restores raw wiremd source with {.show-source}', () => {
    // The show-source demo's pane shows normalized wiremd source, not generated code.
    cy.get('.wmd-demo-code').then(($panes) => {
      const texts = [...$panes].map((el) => el.textContent || '');
      const rawPane = texts.find((t) => t.includes('::: card') && t.includes('[Save]*'));
      expect(rawPane, 'a show-source pane shows raw wiremd source').to.not.eq(undefined);
    });
  });

  it('renders coss parity family: accordion, collapsible, menu, context-menu, toolbar', () => {
    // accordion: first item expands by default, second stays collapsed.
    cy.get('.wmd-accordion[data-wmd-accordion]').should('exist');
    cy.get('.wmd-accordion-trigger').should('have.length.at.least', 2);
    cy.contains('.wmd-accordion-summary', 'What is wiremd?').should('exist');
    cy.get('.wmd-accordion-trigger').first().should('have.attr', 'aria-expanded', 'true');
    cy.get('.wmd-accordion-trigger').eq(1).should('have.attr', 'aria-expanded', 'false');
    // Collapsed item's panel carries the hidden attribute; expanded one renders.
    cy.get('.wmd-accordion-item').eq(1).find('.wmd-accordion-panel').should('have.attr', 'hidden');
    cy.get('.wmd-accordion-panel-inner').should('exist');
    // collapsible: rendered closed ({.collapsed}).
    cy.get('.wmd-collapsible-trigger').should('have.attr', 'aria-expanded', 'false');
    cy.get('.wmd-collapsible-panel[hidden]').should('exist');
    cy.contains('.wmd-collapsible-trigger', 'Advanced settings').should('exist');
    // menu: static open popup with group label, checkbox item, shortcut, separator, destructive.
    cy.get('.wmd-menu-trigger[aria-haspopup="menu"]').should('exist');
    cy.get('.wmd-menu-popup[role="menu"]').should('be.visible');
    cy.get('.wmd-menu-label').should('contain.text', 'File');
    cy.get('.wmd-menu-popup [role="menuitemcheckbox"][aria-checked="true"]').should(
      'contain.text',
      'Enable sync',
    );
    cy.get('.wmd-menu-indicator').should('contain.text', '✓');
    cy.contains('kbd.wmd-menu-shortcut', '⌘N').should('exist');
    cy.get('.wmd-menu-separator').should('have.length', 1);
    cy.contains('.wmd-menu-destructive', 'Delete').should('exist');
    // context-menu: dashed zone trigger + static popup menu.
    cy.get('.wmd-context-menu[data-wmd-context-menu]').should('exist');
    cy.contains('.wmd-context-menu-trigger', 'Canvas').should('exist');
    cy.get('.wmd-context-menu-popup[role="menu"]').should('exist');
    cy.get('.wmd-context-menu-item[aria-disabled="true"]').should('contain.text', 'Paste');
    // toolbar: button group with one vertical separator between groups.
    cy.get('.wmd-toolbar[role="toolbar"]').should('exist');
    cy.get('.wmd-toolbar button').should('have.length.at.least', 4);
    cy.get('.wmd-toolbar-separator[role="separator"][aria-orientation="vertical"]').should(
      'have.length',
      1,
    );
    cy.screenshot('coss-parity', { capture: 'viewport' });
  });

  it('captures the full gallery page', () => {
    cy.screenshot('coss-gallery-full', { capture: 'fullPage' });
  });
});

describe('coss particles (composition page, default style)', () => {
  beforeEach(() => {
    cy.visit('/coss-particles.md');
    cy.get('body.wmd-root.wmd-coss').should('exist');
  });

  it('renders all 12 composition demos with codegen panes', () => {
    cy.get('.wmd-demo').should('have.length', 12);
    cy.get('.wmd-demo-code').should('have.length.at.least', 12);
  });

  it('renders login, signup, and pricing cards', () => {
    cy.contains('.wmd-container-card', 'Sign in').should('exist');
    cy.contains('.wmd-container-card', 'Create account').should('exist');
    cy.contains('.wmd-container-card', 'Pro plan').should('exist');
  });

  it('renders navbar, settings panel, and empty state', () => {
    cy.get('nav.wmd-nav .wmd-brand').should('contain.text', 'Acme');
    // Inside a ::: layout, the sidebar section renders as div.wmd-layout-sidebar
    // (aside.wmd-sidebar-nav only exists for top-level ::: sidebar blocks).
    cy.get('.wmd-layout-sidebar').should('contain.text', 'Workspace');
    cy.get('.wmd-layout-main').should('contain.text', 'Notifications');
    cy.get('.wmd-switch').should('have.length.at.least', 2);
    cy.get('.wmd-switch[aria-checked="true"]').should('exist');
    cy.contains('.wmd-switch-label', 'Email notifications').should('exist');
    cy.get('.wmd-empty').should('contain.text', 'No projects yet');
  });

  it('renders dialog, toast, table, popover, notifications, and stepper', () => {
    cy.get('.wmd-alert-dialog[role="alertdialog"]').should(
      'contain.text',
      'Delete project?',
    );
    cy.contains('.wmd-alert-dialog', 'Cancel').should('exist');
    cy.get('.wmd-toast').should('contain.text', 'Changes saved.');
    cy.get('table.wmd-table').should('exist');
    cy.contains('table.wmd-table', 'Acme redesign').should('exist');
    cy.get('.wmd-popover').should('contain.text', 'Profile');
    cy.contains('.wmd-demo', 'Mark all as read').should('exist');
    cy.contains('.wmd-demo', 'Invite team').should('exist');
    cy.screenshot('coss-particles', { capture: 'viewport' });
  });

  it('captures the full particles page', () => {
    cy.screenshot('coss-particles-full', { capture: 'fullPage' });
  });
});
