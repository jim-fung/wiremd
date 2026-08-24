/**
 * coss codegen - layout family (container, grid, grid-item, row, demo)
 *
 * Task 1 registers stubs only; Task 4 replaces the container/grid/grid-item/
 * row stubs inside this file. `demo` emits its children as an ordered
 * fragment (implemented alongside the layout wave).
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import type { NodeEmitter } from '../types.js';
import type { WiremdNode } from '../../../types.js';

export const emitContainer: NodeEmitter<Extract<WiremdNode, { type: 'container' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitGrid: NodeEmitter<Extract<WiremdNode, { type: 'grid' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitGridItem: NodeEmitter<Extract<WiremdNode, { type: 'grid-item' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitRow: NodeEmitter<Extract<WiremdNode, { type: 'row' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitDemo: NodeEmitter<Extract<WiremdNode, { type: 'demo' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};
