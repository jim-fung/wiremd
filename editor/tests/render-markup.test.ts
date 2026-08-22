import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../src/renderMarkup.js';

/**
 * renderMarkup is the editor's host adapter over `wiremd/embed` — the same
 * boundary OpenKnowledge consumes. These tests pin the host-side contract:
 * fragment + CSS wrapped in the editor's minimal document shell, warnings
 * surfaced non-fatally, and errors reserved for a null document.
 */
describe('editor renderMarkup', () => {
  it('renders the shell document with compiled content for valid markup', () => {
    const result = renderMarkup('## Login Form\n\n[Sign In]*', 'sketch');

    expect(result.error).toBeNull();
    expect(result.warnings).toEqual([]);
    expect(result.html).toContain('<!DOCTYPE html>');
    expect(result.html).toContain('Login Form');
    expect(result.html).toContain('wmd-sketch');
  });

  it('renders the requested style', () => {
    const result = renderMarkup('[Continue]*', 'clean');

    expect(result.error).toBeNull();
    expect(result.html).toContain('wmd-clean');
  });

  it('reports unsupported constructs as non-fatal warnings', () => {
    const result = renderMarkup('[Button]\n\n<div>dropped</div>', 'sketch');

    expect(result.error).toBeNull();
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Omitted unsupported construct');
  });

  it('never emits scripts or raw-HTML passthrough in preview output', () => {
    const result = renderMarkup(
      'hello <script>alert(1)</script> <b onclick="x()">world</b>',
      'sketch',
    );

    expect(result.error).toBeNull();
    expect(result.html).not.toMatch(/<script/i);
    expect(result.html).toContain('&lt;script&gt;');
  });
});
