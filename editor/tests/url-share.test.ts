import { describe, expect, it } from 'vitest';
import { compressToEncodedURIComponent } from 'lz-string';
import {
  decodeShareHash,
  decodeShareState,
  encodeShareHash,
  SHARE_HASH_KEY,
  SHARE_STYLE_KEY,
} from '../src/url-share.js';

describe('url-share', () => {
  it('round-trips a typical wiremd document', () => {
    const md = `# Login\n\n[[ Home | About | Docs ]]\n\n::: card\nWelcome\n[_____]\n[Sign in]*\n:::`;
    const encoded = encodeShareHash(md);
    expect(encoded.startsWith(`#${SHARE_HASH_KEY}=`)).toBe(true);
    expect(decodeShareHash(encoded)).toBe(md);
  });

  it('round-trips unicode and emoji', () => {
    const md = '# 你好 🚀\n\n- café\n- naïve\n- résumé — ok';
    expect(decodeShareHash(encodeShareHash(md))).toBe(md);
  });

  it('round-trips a larger document (10KB)', () => {
    const line = '## Section\n\n[Click me]*  [_____________]  **strong**  *em*\n\n';
    const md = line.repeat(200);
    expect(md.length).toBeGreaterThan(10_000);
    expect(decodeShareHash(encodeShareHash(md))).toBe(md);
  });

  it('encodes an empty string as an empty hash', () => {
    expect(encodeShareHash('')).toBe('');
  });

  it('returns null for missing or empty hashes', () => {
    expect(decodeShareHash('')).toBe(null);
    expect(decodeShareHash('#')).toBe(null);
    expect(decodeShareHash(undefined)).toBe(null);
    expect(decodeShareHash(null)).toBe(null);
  });

  it('returns null when the hash key does not match', () => {
    expect(decodeShareHash('#foo=bar')).toBe(null);
    expect(decodeShareHash('#CODE=xyz')).toBe(null);
  });

  it('returns null for a malformed payload', () => {
    expect(decodeShareHash('#code=!!!not-valid-lzstring!!!')).toBe(null);
    expect(decodeShareHash(`#${SHARE_HASH_KEY}=`)).toBe(null);
  });

  it('accepts a hash without the leading #', () => {
    const md = '# hi';
    const encoded = encodeShareHash(md);
    expect(decodeShareHash(encoded.slice(1))).toBe(md);
  });

  it('round-trips style alongside the document', () => {
    const md = '# Login';
    const encoded = encodeShareHash(md, 'clean');
    expect(encoded).toContain(`&${SHARE_STYLE_KEY}=clean`);
    const state = decodeShareState(encoded);
    expect(state).toEqual({ markdown: md, style: 'clean' });
    // Markdown-only decode still works on styled links
    expect(decodeShareHash(encoded)).toBe(md);
  });

  it('omits the style component when not provided', () => {
    const encoded = encodeShareHash('# hi');
    expect(encoded).not.toContain(SHARE_STYLE_KEY);
    expect(decodeShareState(encoded)).toEqual({ markdown: '# hi', style: null });
  });

  it('tolerates legacy links that carry no style', () => {
    // Legacy format = code payload only, exactly what encodeShareHash produced
    // before style support existed.
    const legacy = encodeShareHash('# hi');
    expect(legacy).not.toContain(SHARE_STYLE_KEY);
    expect(decodeShareState(legacy)).toEqual({ markdown: '# hi', style: null });
  });

  it('returns style=null for malformed style components', () => {
    const md = 'hello';
    const encoded = `#${SHARE_HASH_KEY}=${compressToEncodedURIComponent(md)}&${SHARE_STYLE_KEY}=%ZZ`;
    expect(decodeShareState(encoded)).toEqual({ markdown: md, style: null });
  });
});
