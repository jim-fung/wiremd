describe('rendered pages (wiremd CLI preview server)', () => {
  it('renders the login form page', () => {
    cy.visit('/login-form.md');
    cy.get('body.wmd-root').should('exist');
    cy.get('.wmd-input').should('have.length.at.least', 2);
    cy.contains('button', 'Sign In').should('be.visible');
    cy.screenshot('page-login-form', { capture: 'fullPage' });
  });

  it('renders the dashboard page', () => {
    // Uses the shipped Dashboard example syntax: nav + grid-3 of ::: card blocks.
    cy.visit('/dashboard.md');
    cy.get('body.wmd-root').should('exist');
    cy.get('nav.wmd-nav').should('exist');
    cy.get('.wmd-grid').should('exist');
    cy.get('.wmd-grid-item .wmd-container-card').should('have.length', 3);
    cy.contains('Dashboard Overview').should('be.visible');
    cy.contains('New user signed up').should('be.visible');
    cy.screenshot('page-dashboard', { capture: 'fullPage' });
  });

  it('renders the pricing page', () => {
    cy.visit('/pricing.md');
    cy.get('body.wmd-root').should('exist');
    cy.get('.wmd-container-card').should('have.length', 3);
    cy.contains('button', 'Choose Pro').should('be.visible');
    cy.screenshot('page-pricing', { capture: 'fullPage' });
  });
});
