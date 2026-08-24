/**
 * coss codegen - actions family (button, badge, icon, checkbox)
 *
 * Task 1 registers stubs only; Task 2 replaces them inside this file.
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import type { NodeEmitter } from '../types.js';
import type { WiremdNode } from '../../../types.js';

export const emitButton: NodeEmitter<Extract<WiremdNode, { type: 'button' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitBadge: NodeEmitter<Extract<WiremdNode, { type: 'badge' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitIcon: NodeEmitter<Extract<WiremdNode, { type: 'icon' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitCheckbox: NodeEmitter<Extract<WiremdNode, { type: 'checkbox' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};
