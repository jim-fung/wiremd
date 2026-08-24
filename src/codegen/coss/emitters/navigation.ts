/**
 * coss codegen - navigation family (nav, nav-item, brand, tabs, tab, breadcrumbs)
 *
 * Task 1 registers stubs only; Task 4 replaces them inside this file.
 * `breadcrumb-item` children are emitted internally by `emitBreadcrumbs` -
 * never directly. Navigation emitters call `recurse` for children instead of
 * re-implementing the `link` emitter (which stays in the content family).
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import type { NodeEmitter } from '../types.js';
import type { WiremdNode } from '../../../types.js';

export const emitNav: NodeEmitter<Extract<WiremdNode, { type: 'nav' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitNavItem: NodeEmitter<Extract<WiremdNode, { type: 'nav-item' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitBrand: NodeEmitter<Extract<WiremdNode, { type: 'brand' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitTabs: NodeEmitter<Extract<WiremdNode, { type: 'tabs' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitTab: NodeEmitter<Extract<WiremdNode, { type: 'tab' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitBreadcrumbs: NodeEmitter<Extract<WiremdNode, { type: 'breadcrumbs' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};
