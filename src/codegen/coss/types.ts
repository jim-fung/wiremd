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
 * The 73 AST discriminants supported by the coss codegen layer (Phase 3
 * complete): base content + feedback (toast, skeleton, spinner, kbd,
 * progress, meter) + overlays (dialog, alert-dialog, sheet, drawer, popover,
 * tooltip, preview-card) + navigation (pagination, segmented-control,
 * scroll-area, sidebar, menubar) + data entry (form, field, fieldset, label,
 * input-group, otp-field, number-field, autocomplete, combobox, command,
 * checkbox-group, toggle-group, switch, slider, toggle) + display (avatar,
 * frame, group, empty, calendar, date-picker). `alert` has no standalone
 * discriminant: `::: alert` parses to a `container` node whose emitter branch
 * handles it. `option` and `breadcrumb-item` are emitted internally by the
 * select/breadcrumbs emitters only. Direct `accordion`, `accordion-item`,
 * `alert`, `loading-state`, `empty-state`, `error-state`, `option`, and
 * `breadcrumb-item` nodes throw `Unsupported codegen node type: <type>`.
 */
export type SupportedType =
  | 'button' | 'input' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'radio-group' | 'icon'
  | 'badge' | 'container' | 'nav' | 'nav-item' | 'brand' | 'grid' | 'grid-item' | 'row'
  | 'heading' | 'paragraph' | 'text' | 'image' | 'link' | 'list' | 'list-item'
  | 'table' | 'table-header' | 'table-row' | 'table-cell' | 'blockquote' | 'code' | 'separator'
  | 'tabs' | 'tab' | 'breadcrumbs' | 'demo'
  | 'toast' | 'skeleton' | 'spinner' | 'kbd' | 'progress' | 'meter'
  | 'dialog' | 'alert-dialog' | 'sheet' | 'drawer' | 'popover' | 'tooltip' | 'preview-card'
  | 'pagination' | 'segmented-control' | 'scroll-area' | 'sidebar' | 'menubar'
  | 'form' | 'field' | 'fieldset' | 'label' | 'input-group' | 'otp-field' | 'number-field'
  | 'autocomplete' | 'combobox' | 'command' | 'checkbox-group' | 'toggle-group'
  | 'switch' | 'slider' | 'toggle'
  // Phase 3 Task 6: display family
  | 'avatar' | 'frame' | 'group' | 'empty' | 'calendar' | 'date-picker';

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
