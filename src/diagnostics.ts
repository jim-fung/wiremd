/**
 * wiremd Diagnostics
 *
 * The unified reporting surface for every condition a host must be able to
 * render: parser drops, validation failures, renderer policy substitutions,
 * and include outcomes. Diagnostics never imply failure by themselves —
 * they ride alongside results.
 *
 * This module is browser-safe by construction (no Node builtins) and forms
 * part of the `wiremd/embed` public surface.
 *
 * Copyright (c) 2025 wiremd
 * Licensed under MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import type { Location } from './types.js';

/**
 * A located span within the compiled source string.
 *
 * Fence-relative: line 1 / column 1 / offset 0 is the first character of
 * the source passed to the compiler. Line and column are 1-based (unist
 * convention); offset is a 0-based character offset.
 */
export interface SourceSpan {
  line: number;
  column: number;
  offset?: number;
}

export type WiremdDiagnosticSeverity = 'error' | 'warning' | 'info';

export type WiremdDiagnosticSource =
  | 'parser'
  | 'validator'
  | 'renderer'
  | 'include';

export interface WiremdDiagnostic {
  severity: WiremdDiagnosticSeverity;
  /** Stable, documented identifier, e.g. `'wmd-unsupported-node'`. */
  code: string;
  message: string;
  source: WiremdDiagnosticSource;
  /** Present whenever the diagnostic can be located; omitted otherwise. */
  start?: SourceSpan;
  end?: SourceSpan;
}

/**
 * Sink for diagnostics produced while parsing/transforming. Hosts pass a
 * collector via `compileWiremd`'s `onDiagnostic`; the plain `parse()` path
 * keeps its historical console behavior.
 */
export type DiagnosticSink = (diagnostic: WiremdDiagnostic) => void;

/** Convert an mdast `position` into fence-relative start/end spans. */
export function spansFromPosition(position: Location | undefined | null): {
  start?: SourceSpan;
  end?: SourceSpan;
} {
  if (!position || !position.start || !position.end) return {};
  return {
    start: {
      line: position.start.line,
      column: position.start.column,
      ...(position.start.offset !== undefined ? { offset: position.start.offset } : {}),
    },
    end: {
      line: position.end.line,
      column: position.end.column,
      ...(position.end.offset !== undefined ? { offset: position.end.offset } : {}),
    },
  };
}
