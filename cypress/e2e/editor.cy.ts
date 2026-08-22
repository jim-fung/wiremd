/// <reference types="cypress" />

const EDITOR_URL = 'http://localhost:5174/';

// The preview iframe is sandboxed without allow-same-origin (by design), so the
// rendered markup can't be reached via contentDocument. The full HTML is on
// the srcdoc attribute, which mirrors what the iframe paints.
function previewSrcdoc() {
  return cy.get('#preview-iframe').should('have.attr', 'srcdoc');
}

describe('wiremd editor', () => {
  it('boots with Monaco and a rendered default preview', () => {
    cy.visit(EDITOR_URL);
    cy.get('#monaco-container .monaco-editor').should('be.visible');
    cy.get('#error-bar').should('not.have.class', 'ed-error--visible');
    previewSrcdoc().should('include', 'wmd-root');
    cy.screenshot('editor-initial', { capture: 'viewport' });
  });

  it('loads an example and captures style variants', () => {
    cy.visit(EDITOR_URL);

    cy.get('#examples-dropdown .ed-btn').click();
    cy.get('.ed-dropdown__menu.ed-dropdown__menu--open').should('be.visible');
    cy.get('.ed-dropdown__item').contains('Login Form').click();

    previewSrcdoc()
      .should('include', 'wmd-input')
      .should('include', 'Sign In');

    for (const style of ['sketch', 'clean', 'wireframe', 'brutal']) {
      cy.get('#style-select').select(style);
      previewSrcdoc().should('include', `wmd-${style}`);
      cy.screenshot(`editor-login-form-${style}`, { capture: 'fullPage' });
    }
  });

  it('live-updates the preview when the editor content changes', () => {
    cy.visit(EDITOR_URL);
    // Chromium (Electron and Chrome alike) drops raw CDP keystrokes inside
    // Monaco, so cy.type() is not a dependable input channel there. Click to
    // give Monaco focus, then drive its hidden input area with selectAll + a
    // synthetic paste event.
    cy.get('#monaco-container .monaco-editor').click();
    cy.document().then((doc) => {
      const target = (doc.activeElement as HTMLElement | null) ?? doc.body;
      doc.execCommand('selectAll');
      const data = new DataTransfer();
      data.setData('text/plain', '## Typed Heading\n\nTyped by Cypress e2e');
      target.dispatchEvent(
        new ClipboardEvent('paste', {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    previewSrcdoc().should('include', 'Typed Heading');
    cy.screenshot('editor-typed', { capture: 'fullPage' });
  });
});
