/** wiremd Editor - URL hash share encoding */

import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from 'lz-string';

export const SHARE_HASH_KEY = 'code';
export const SHARE_STYLE_KEY = 'style';

export function encodeShareHash(markdown: string, style?: string): string {
  if (!markdown) return '';
  let hash = `#${SHARE_HASH_KEY}=${compressToEncodedURIComponent(markdown)}`;
  if (style) {
    hash += `&${SHARE_STYLE_KEY}=${encodeURIComponent(style)}`;
  }
  return hash;
}

interface ShareState {
  markdown: string;
  style: string | null;
}

/**
 * Decode a share hash into its full state. Tolerates links produced by older
 * versions of the editor, which carried no style component.
 */
export function decodeShareState(
  hash: string | undefined | null,
): ShareState | null {
  if (!hash) return null;
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const prefix = `${SHARE_HASH_KEY}=`;
  if (!raw.startsWith(prefix)) return null;
  // Everything up to the first '&' is the code payload; later components
  // (e.g. &style=…) are parsed separately.
  const payloadEnd = raw.indexOf('&');
  const payload =
    payloadEnd === -1 ? raw.slice(prefix.length) : raw.slice(prefix.length, payloadEnd);
  if (!payload) return null;

  let style: string | null = null;
  const stylePrefix = `${SHARE_STYLE_KEY}=`;
  for (const part of raw.slice(payloadEnd === -1 ? raw.length : payloadEnd + 1).split('&')) {
    if (part.startsWith(stylePrefix)) {
      try {
        style = decodeURIComponent(part.slice(stylePrefix.length)) || null;
      } catch {
        style = null;
      }
    }
  }

  try {
    const decoded = decompressFromEncodedURIComponent(payload);
    if (!decoded) return null;
    return { markdown: decoded, style };
  } catch {
    return null;
  }
}

/** Markdown-only decode, kept for compatibility with earlier link format. */
export function decodeShareHash(hash: string | undefined | null): string | null {
  return decodeShareState(hash)?.markdown ?? null;
}
