/**
 * wiremd/embed — browser-safe compile + preview boundary
 *
 * The one public surface embedding hosts (OpenKnowledge `WiremdFenceView`,
 * the web editor) consume. Contract properties:
 *
 *   - synchronous, zero-I/O compilation (includes are disabled, loudly);
 *   - never throws — invalid source yields diagnostics plus whatever
 *     document could be produced, and the caller's source string is an
 *     input, never an output;
 *   - partial validity: unsupported constructs ride along as `warning`
 *     diagnostics while the surviving subset still renders;
 *   - preview output is a script-free, class-prefixed HTML+CSS fragment.
 *
 * This module must not import the CLI, the Node filesystem include
 * implementation (`parser/includes.ts`), or the renderer barrel
 * (`renderer/index.ts`, which drags in the React/Tailwind renderers).
 * A CI bundle smoke test (`tests/embed-bundle.test.ts`) enforces the
 * prohibited-import list mechanically.
 *
 * Copyright (c) 2025 wiremd
 * Licensed under MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import type { DocumentNode } from '../types.js';
import { SYNTAX_VERSION } from '../version.js';
import { parse, validate } from '../parser/index.js';
import type { ValidationError } from '../types.js';
import type {
  SourceSpan,
  WiremdDiagnostic,
} from '../diagnostics.js';
import { spansFromPosition } from '../diagnostics.js';
import {
  renderPreview,
  type PreviewResult,
} from '../renderer/preview-renderer.js';

/** Ordered style identifiers accepted by compile/preview options. */
export const WIREMD_STYLES = [
  'sketch',
  'clean',
  'wireframe',
  'none',
  'tailwind',
  'material',
  'brutal',
] as const;

export type WiremdStyle = (typeof WIREMD_STYLES)[number];

export interface CompileWiremdOptions {
  /** Visual style recorded for downstream preview rendering. */
  style?: WiremdStyle;
  /** Run the AST validation stage after parsing. Default `true`. */
  validate?: boolean;
  /**
   * Expected syntax version reported by the host. A mismatch is surfaced
   * as an `error` diagnostic; compilation still proceeds best-effort so
   * the fence's source stays authoritative either way.
   */
  syntaxVersion?: string;
  /** Diagnostics sink; defaults to collecting into the result array. */
  onDiagnostic?: (diagnostic: WiremdDiagnostic) => void;
}

export interface CompileWiremdResult {
  /**
   * The parsed document. Non-null for any input string under normal
   * operation — parse is permissive and reports what it had to omit via
   * diagnostics. Reserved `null` signals an internal invariant break.
   */
  document: DocumentNode | null;
  diagnostics: WiremdDiagnostic[];
  syntaxVersion: string;
}

export interface PreviewRenderOptions {
  style?: WiremdStyle;
  /** Required: prefix applied to every generated class and CSS selector. */
  classPrefix: string;
}

export type { PreviewResult };

export type { DocumentNode };
export type {
  SourceSpan,
  WiremdDiagnostic,
  WiremdDiagnosticSeverity,
  WiremdDiagnosticSource,
} from '../diagnostics.js';

/**
 * Compile wiremd fence-body source into a document plus diagnostics.
 *
 * Synchronous by contract. When host-resolved includes ever arrive they
 * will ship as a separately named async entry — this signature stays
 * no-I/O forever.
 */
export function compileWiremd(
  source: string,
  options: CompileWiremdOptions = {}
): CompileWiremdResult {
  const diagnostics: WiremdDiagnostic[] = [];
  const emit = options.onDiagnostic ?? ((d: WiremdDiagnostic) => diagnostics.push(d));

  if (typeof source !== 'string') {
    emit({
      severity: 'error',
      code: 'wmd-invalid-source',
      message: 'wiremd source must be a string.',
      source: 'parser',
    });
    return { document: null, diagnostics, syntaxVersion: SYNTAX_VERSION };
  }

  if (
    options.syntaxVersion !== undefined &&
    options.syntaxVersion !== SYNTAX_VERSION
  ) {
    emit({
      severity: 'error',
      code: 'wmd-invalid-syntax-version',
      message: `Fence declares syntax version "${options.syntaxVersion}" but this compiler speaks "${SYNTAX_VERSION}". Source is preserved; rendering may be incomplete.`,
      source: 'parser',
    });
  }

  reportDisabledIncludes(source, emit);

  let document: DocumentNode | null = null;
  try {
    // Positions are populated so diagnostics can carry fence-relative spans.
    document = parse(source, { position: true }, emit);
  } catch (error) {
    // Parse is designed never to throw; reaching here means an internal
    // invariant broke. Report recoverably instead of propagating.
    emit({
      severity: 'error',
      code: 'wmd-internal-parse-error',
      message: `Unexpected parser failure: ${error instanceof Error ? error.message : String(error)}`,
      source: 'parser',
    });
    return { document: null, diagnostics, syntaxVersion: SYNTAX_VERSION };
  }

  if (options.validate !== false && document) {
    const validationErrors = validate(document);
    for (const validationError of validationErrors) {
      emit(validationErrorToDiagnostic(validationError));
    }
  }

  return { document, diagnostics, syntaxVersion: SYNTAX_VERSION };
}

/**
 * Render a compiled document as a script-free, class-prefixed fragment.
 *
 * Markup and CSS are atomic: inject both into the host or neither.
 */
export function renderToPreview(
  document: DocumentNode,
  options: PreviewRenderOptions
): PreviewResult {
  return renderPreview(document, options);
}

const INCLUDE_TOKEN_PATTERN = /!\[\[\s*([^\]]+?)\s*\]\]/g;
const CODE_SPAN_SPLIT = /(```[\s\S]*?```|`[^`\n]+`)/g;

/**
 * v1 include policy: includes are DISABLED inside embed compiles, loudly.
 * Every `![[...]]` token outside code spans produces one warning diagnostic
 * with its span; the token then flows through parsing as literal text. No
 * filesystem access exists on this path — resolution is a future,
 * separately named async contract owned by the host.
 */
function reportDisabledIncludes(
  source: string,
  emit: (diagnostic: WiremdDiagnostic) => void
): void {
  const parts = source.split(CODE_SPAN_SPLIT);
  const hasToken = /!\[\[\s*[^\]]+?\s*\]\]/;
  for (let i = 0; i < parts.length; i += 1) {
    if (i % 2 === 1) continue; // fenced block or inline code span
    const part = parts[i];
    if (!hasToken.test(part)) continue;

    // Offsets within `part` shift by the length of everything split off
    // before it; walk the source once to recover absolute offsets.
    const partOffset = source.indexOf(part);
    INCLUDE_TOKEN_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = INCLUDE_TOKEN_PATTERN.exec(part)) !== null) {
      const startOffset = (partOffset >= 0 ? partOffset : 0) + match.index;
      const endOffset = startOffset + match[0].length;
      emit({
        severity: 'warning',
        code: 'wmd-includes-disabled',
        message: `Include "![[${match[1]}]]" is disabled in embedded previews and renders as text.`,
        source: 'include',
        start: offsetToSpan(source, startOffset),
        end: offsetToSpan(source, endOffset),
      });
    }
  }
}

function offsetToSpan(source: string, offset: number): SourceSpan & { offset: number } {
  let line = 1;
  let lastNewline = -1;
  for (let i = 0; i < offset && i < source.length; i += 1) {
    if (source.charCodeAt(i) === 10) {
      line += 1;
      lastNewline = i;
    }
  }
  return {
    line,
    column: offset - lastNewline,
    offset,
  };
}

function validationErrorToDiagnostic(error: ValidationError): WiremdDiagnostic {
  // validate() reports AST paths, not source locations; when a node with a
  // populated position is attached we surface its span, otherwise the
  // diagnostic honestly carries no location (no fake precision).
  const nodeWithPosition = error.node as
    | { position?: { start?: unknown; end?: unknown } }
    | undefined;
  const spans =
    nodeWithPosition && nodeWithPosition.position
      ? spansFromPosition(nodeWithPosition.position as Parameters<typeof spansFromPosition>[0])
      : {};
  return {
    severity: 'error',
    code: 'wmd-invalid-wiremd-ast',
    message: error.code ? `${error.message} (${error.code})` : error.message,
    source: 'validator',
    ...spans,
  };
}
