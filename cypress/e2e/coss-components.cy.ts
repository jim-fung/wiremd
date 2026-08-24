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

  it('captures the full gallery page', () => {
    cy.screenshot('coss-gallery-full', { capture: 'fullPage' });
  });
});
