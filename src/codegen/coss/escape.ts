/**
 * coss codegen layer - escaping helpers (internal)
 *
 * These helpers are NOT part of the package public surface; only emitter
 * modules under `src/codegen/coss/emitters/` import from here. Generated
 * strings must be deterministic and safe for quoted attributes and JSX
 * literals.
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

/** Schemes permitted by {@link safeUrl} (compared case-insensitively). */
const ALLOWED_SCHEMES: ReadonlySet<string> = new Set(['http', 'https', 'mailto', 'tel']);

/** `scheme:` prefix as defined by RFC 3986 (` ALPHA *( ALPHA / DIGIT / "+" / "-" / "." ) ":"`). */
const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

/** Decimal / hex numeric character references, e.g. `&#115;` or `&#x6A;`. */
const NUMERIC_ENTITY_RE = /&#(x?[0-9a-f]+);/gi;

/**
 * HTML entities are decoded before scheme classification so an encoded payload
 * such as `javascript&colon;alert(1)` or `java&#115;cript&colon;` cannot smuggle
 * a scheme past the allowlist. Only the named colon entity plus printable
 * ASCII numeric references are decoded - every character that can form a
 * scheme - and the decoded form is used for classification only (the original
 * trimmed value is returned and escaped by the caller).
 */
function decodeNumericEntity(match: string, digits: string): string {
  const isHex = digits.startsWith('x') || digits.startsWith('X');
  const code = parseInt(isHex ? digits.slice(1) : digits, isHex ? 16 : 10);
  return code >= 0x20 && code <= 0x7e ? String.fromCharCode(code) : match;
}

/** The URL as the receiver of the generated attribute would see it. */
function decodeForClassification(url: string): string {
  return url
    .replace(/&colon;/gi, ':')
    .replace(NUMERIC_ENTITY_RE, decodeNumericEntity);
}

/**
 * Escape text for an HTML text position: `& < > " '`.
 * `&` is replaced first so later replacements cannot corrupt entities.
 */
export function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape a value for a double-quoted HTML attribute position: `& < > " '`
 * (same set as text; kept as a separate entry point because attribute and
 * text rules are allowed to diverge).
 */
export function escapeHtmlAttr(value: string): string {
  return escapeHtmlText(value);
}

/**
 * Escape text for a JSX text position: `& < > { }`.
 * Braces become string-literal expressions (`{'{'}` / `{'}'}`); a single-pass
 * replace prevents the inserted braces from being re-escaped.
 */
export function escapeJsxText(text: string): string {
  return text.replace(/[&<>{}]/g, (ch) => {
    switch (ch) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '{': return "{'{'}";
      default: return "{'}'}";
    }
  });
}

/**
 * Escape a value for a double-quoted JSX string attribute. JSX string
 * attributes undergo NO backslash escape processing (a raw `\"` is a parse
 * error in both TypeScript and esbuild), so values are entity-escaped
 * instead: `&` -> `&amp;` first (so later replacements cannot corrupt
 * entities), then `"` -> `&quot;`, `<` -> `&lt;`, `>` -> `&gt;`. Control
 * characters are left literal; backslashes are never inserted.
 */
export function escapeJsxAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Validate a URL against the allowlist and return the trimmed value.
 *
 * Permitted: empty, `#fragment`, scheme-less relative references, and
 * `http:` / `https:` / `mailto:` / `tel:` (case-insensitive scheme, after
 * trimming leading/trailing whitespace). Everything else throws
 * `Unsafe URL: <url>`.
 */
export function safeUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed === '') return trimmed;

  const decoded = decodeForClassification(trimmed);
  if (SCHEME_RE.test(decoded)) {
    const scheme = decoded.slice(0, decoded.indexOf(':')).toLowerCase();
    if (ALLOWED_SCHEMES.has(scheme)) return trimmed;
    throw new Error(`Unsafe URL: ${trimmed}`);
  }
  // No scheme before any colon: relative or fragment reference - allowed.
  return trimmed;
}
