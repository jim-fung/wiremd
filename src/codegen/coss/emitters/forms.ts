/**
 * coss codegen - forms family (input, textarea, select, radio, radio-group)
 *
 * Task 1 registers stubs only; Task 2 replaces them inside this file.
 * `option` children are emitted internally by `emitSelect` - never directly.
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import type { NodeEmitter } from '../types.js';
import type { WiremdNode } from '../../../types.js';

export const emitInput: NodeEmitter<Extract<WiremdNode, { type: 'input' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitTextarea: NodeEmitter<Extract<WiremdNode, { type: 'textarea' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitSelect: NodeEmitter<Extract<WiremdNode, { type: 'select' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitRadio: NodeEmitter<Extract<WiremdNode, { type: 'radio' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};

export const emitRadioGroup: NodeEmitter<Extract<WiremdNode, { type: 'radio-group' }>> = (node) => {
  throw new Error(`Not implemented: ${node.type}`);
};
