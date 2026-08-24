/**
 * coss codegen layer - shared contracts
 *
 * Public surface produced by the Phase 2 skeleton and consumed by every
 * emitter family module. `CodegenFormat` / `CodegenOptions` / `CodegenInput`
 * are re-exported from the package root (`src/index.ts`).
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import type { WiremdNode } from '../../types.js';

/** Output syntax for generated fragments. */
export type CodegenFormat = 'html' | 'jsx';

/** Options accepted by `generateCode`. */
export interface CodegenOptions {
  format?: CodegenFormat;
}

/** A single node or an ordered list of sibling nodes. */
export type CodegenInput = WiremdNode | readonly WiremdNode[];

/**
 * The 40 AST discriminants supported by the coss codegen layer. Phase 3 Task 2
 * extends the Phase 2 allowlist with the feedback family: toast, skeleton,
 * spinner, kbd, progress, meter. `option` and `breadcrumb-item` are emitted
 * internally by the select/breadcrumbs emitters only; direct `form`,
 * `accordion`, `accordion-item`, `alert`, `loading-state`, `empty-state`,
 * `error-state`, `option`, and `breadcrumb-item` nodes throw
 * `Unsupported codegen node type: <type>` (still on the Phase 3 roadmap).
 */
export type SupportedType =
  | 'button' | 'input' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'radio-group' | 'icon'
  | 'badge' | 'container' | 'nav' | 'nav-item' | 'brand' | 'grid' | 'grid-item' | 'row'
  | 'heading' | 'paragraph' | 'text' | 'image' | 'link' | 'list' | 'list-item'
  | 'table' | 'table-header' | 'table-row' | 'table-cell' | 'blockquote' | 'code' | 'separator'
  | 'tabs' | 'tab' | 'breadcrumbs' | 'demo'
  | 'toast' | 'skeleton' | 'spinner' | 'kbd' | 'progress' | 'meter';

/**
 * Child-recursion callback handed to every family emitter. Routes back through
 * the dispatcher so nested children get the same allowlist enforcement.
 */
export type CodegenRecurse = (node: WiremdNode, format: CodegenFormat) => string;

/**
 * Shared signature for all family emitters. `N` is the concrete node shape for
 * one discriminant: `NodeEmitter<Extract<WiremdNode, { type: 'button' }>>`.
 */
export type NodeEmitter<N extends WiremdNode> = (
  node: N,
  format: CodegenFormat,
  recurse: CodegenRecurse,
) => string;
