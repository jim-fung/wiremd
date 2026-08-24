/**
 * coss codegen layer - dispatcher
 *
 * `generateCode` accepts one node or an ordered node list and emits a
 * standalone HTML or JSX fragment (never imports, never a module wrapper).
 * Dispatch goes through a frozen table mapping all 34 supported discriminants
 * to their family emitters; every other discriminant throws
 * `Unsupported codegen node type: <type>`. Later tasks replace emitter stubs
 * inside `emitters/*` without editing this file.
 *
 * Copyright (c) 2025 wiremd
 * Licensed under the MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import type { WiremdNode } from '../../types.js';
import type { CodegenFormat, CodegenInput, CodegenOptions, CodegenRecurse, NodeEmitter, SupportedType } from './types.js';
import { emitBadge, emitButton, emitCheckbox, emitIcon } from './emitters/actions.js';
import { emitInput, emitRadio, emitRadioGroup, emitSelect, emitTextarea } from './emitters/forms.js';
import {
  emitBlockquote,
  emitCode,
  emitHeading,
  emitImage,
  emitLink,
  emitList,
  emitListItem,
  emitParagraph,
  emitSeparator,
  emitTable,
  emitTableCell,
  emitTableHeader,
  emitTableRow,
  emitText,
} from './emitters/content.js';
import { emitBrand, emitBreadcrumbs, emitNav, emitNavItem, emitTab, emitTabs } from './emitters/navigation.js';
import { emitContainer, emitDemo, emitGrid, emitGridItem, emitRow } from './emitters/layout.js';
import {
  emitKbd,
  emitMeter,
  emitProgress,
  emitSkeleton,
  emitSpinner,
  emitToast,
} from './emitters/feedback.js';
import {
  emitAlertDialog,
  emitDialog,
  emitDrawer,
  emitPopover,
  emitPreviewCard,
  emitSheet,
  emitTooltip,
} from './emitters/overlays.js';

/** Per-discriminant table: TypeScript verifies each emitter against its exact node shape. */
type FamilyTable = { readonly [K in SupportedType]: NodeEmitter<Extract<WiremdNode, { type: K }>> };

/** All 47 allowlisted discriminants, in contract order. */
const FAMILY_EMITTERS: FamilyTable = {
  button: emitButton,
  input: emitInput,
  textarea: emitTextarea,
  select: emitSelect,
  checkbox: emitCheckbox,
  radio: emitRadio,
  'radio-group': emitRadioGroup,
  icon: emitIcon,
  badge: emitBadge,
  container: emitContainer,
  nav: emitNav,
  'nav-item': emitNavItem,
  brand: emitBrand,
  grid: emitGrid,
  'grid-item': emitGridItem,
  row: emitRow,
  heading: emitHeading,
  paragraph: emitParagraph,
  text: emitText,
  image: emitImage,
  link: emitLink,
  list: emitList,
  'list-item': emitListItem,
  table: emitTable,
  'table-header': emitTableHeader,
  'table-row': emitTableRow,
  'table-cell': emitTableCell,
  blockquote: emitBlockquote,
  code: emitCode,
  separator: emitSeparator,
  tabs: emitTabs,
  tab: emitTab,
  breadcrumbs: emitBreadcrumbs,
  demo: emitDemo,
  // Phase 3 Task 2: feedback family
  toast: emitToast,
  skeleton: emitSkeleton,
  spinner: emitSpinner,
  kbd: emitKbd,
  progress: emitProgress,
  meter: emitMeter,
  // Phase 3 Task 3: overlay family
  dialog: emitDialog,
  'alert-dialog': emitAlertDialog,
  sheet: emitSheet,
  drawer: emitDrawer,
  popover: emitPopover,
  tooltip: emitTooltip,
  'preview-card': emitPreviewCard,
};

/** Uniform runtime signature every family emitter is invoked through. */
type UniformEmitter = (node: WiremdNode, format: CodegenFormat, recurse: CodegenRecurse) => string;

/**
 * Frozen lookup by discriminant. The double cast is the single controlled
 * erasure point from the precisely-typed table above to the uniform dispatch
 * shape; missing keys (the nine excluded types) read as `undefined`.
 */
const DISPATCH: Readonly<Record<string, UniformEmitter | undefined>> = Object.freeze(
  FAMILY_EMITTERS as unknown as Record<string, UniformEmitter>,
);

function emitNode(node: WiremdNode, format: CodegenFormat): string {
  const emitter = DISPATCH[node.type];
  if (emitter === undefined) {
    throw new Error(`Unsupported codegen node type: ${node.type}`);
  }
  return emitter(node, format, emitNode);
}

/** Generate a standalone HTML or JSX fragment for one node or an ordered node list. */
export function generateCode(input: CodegenInput, options?: CodegenOptions): string {
  const format: CodegenFormat = options?.format ?? 'html';
  const nodes: readonly WiremdNode[] = Array.isArray(input) ? input : [input];
  return nodes
    .map((node) => emitNode(node, format))
    .filter((fragment) => fragment.length > 0)
    .join('\n');
}
