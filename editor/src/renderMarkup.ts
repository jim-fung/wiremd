import { compileWiremd, renderToPreview } from 'wiremd/embed';

export type StyleName =
  | 'coss'
  | 'sketch'
  | 'clean'
  | 'wireframe'
  | 'none'
  | 'tailwind'
  | 'material'
  | 'brutal';

export type RenderMarkupResult =
  | {
      html: string;
      error: null;
      /** Non-fatal compile notes (unsupported constructs). */
      warnings: string[];
    }
  | {
      html: '';
      error: string;
      warnings: string[];
    };

/**
 * Render wiremd markdown through the browser-safe `wiremd/embed` boundary —
 * the same entry OpenKnowledge consumes. The fragment + CSS come back
 * policy-scoped (no scripts, escaped text, prefixed classes); this host
 * wraps them in the minimal document shell its iframe expects.
 */
export function renderMarkup(markdown: string, style: StyleName): RenderMarkupResult {
  try {
    const compiled = compileWiremd(markdown);

    if (!compiled.document) {
      return {
        html: '',
        error: compiled.diagnostics.find((d) => d.severity === 'error')?.message ??
          'Could not compile the wireframe.',
        warnings: [],
      };
    }

    const preview = renderToPreview(compiled.document, {
      style,
      classPrefix: 'wmd-',
    });

    // Surface every diagnostic the embed boundary emits — not just dropped
    // constructs. Error-severity notes accompany partial renders (document is
    // non-null but some nodes were invalid); includes-disabled explains
    // ![[...]] tokens degrading to literal text.
    const warnings = compiled.diagnostics
      .map((d) => {
        const where = d.start ? ` (line ${d.start.line})` : '';
        if (d.severity === 'error') {
          return `Error${where}: ${d.message}`;
        }
        if (d.code === 'wmd-includes-disabled') {
          return `Includes disabled${where}: ${d.message}`;
        }
        if (d.code === 'wmd-unsupported-node') {
          return `Omitted unsupported construct${where}: ${d.message}`;
        }
        return null;
      })
      .filter((w): w is string => w !== null);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>wiremd Mockup</title>
  <style>
${preview.css}
  </style>
</head>
<body style="margin: 0;">
${preview.html}
</body>
</html>`;

    return {
      html,
      error: null,
      warnings,
    };
  } catch (err) {
    // The embed contract never throws; this is a pure defensive fallback.
    return {
      html: '',
      error: err instanceof Error ? err.message : String(err),
      warnings: [],
    };
  }
}
