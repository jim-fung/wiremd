/**
 * MDAST to wiremd AST Transformer
 * Converts remark's MDAST into wiremd-specific AST nodes
 *
 * Copyright (c) 2025 wiremd
 * Licensed under MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import type { Root as MdastRoot } from 'mdast';
import type {
  DocumentNode,
  WiremdNode,
  ParseOptions,
  DocumentMeta,
} from '../types.js';
import type { DiagnosticSink, WiremdDiagnostic } from '../diagnostics.js';
import { spansFromPosition } from '../diagnostics.js';
import { SYNTAX_VERSION } from '../version.js';

/**
 * Sink receiving diagnostics for the currently-running transform. Parsing is
 * synchronous, so a module-scoped slot set around `transformToWiremdAST` is
 * sufficient and avoids threading a second parameter through every helper.
 * Absent a sink, the drop path keeps its historical console.warn behavior.
 */
let activeDiagnosticSink: DiagnosticSink | null = null;

/**
 * Transform MDAST to wiremd AST
 *
 * @param sink - Optional diagnostics receiver. Unsupported-syntax drops are
 *   reported here (severity `warning`, code `wmd-unsupported-node`) instead
 *   of being silently discarded. When omitted, drops fall back to
 *   `console.warn`.
 */
export function transformToWiremdAST(
  mdast: MdastRoot,
  options: ParseOptions = {},
  sink?: DiagnosticSink
): DocumentNode {
  const previousSink = activeDiagnosticSink;
  activeDiagnosticSink = sink ?? null;
  try {
    const meta: DocumentMeta = {
      version: SYNTAX_VERSION,
      viewport: 'desktop',
      theme: 'coss',
    };

    const document: DocumentNode = {
      type: 'document',
      version: SYNTAX_VERSION,
      meta,
      children: resolveKbdShortcut(processNodeList(mdast.children as any[], options)),
    };
    if (options.position && (mdast as any).position && !document.position) {
      document.position = (mdast as any).position;
    }
    return document;
  } finally {
    activeDiagnosticSink = previousSink;
  }
}

/**
 * Copy source-span data from the triggering mdast node onto a freshly built
 * wiremd node. Runs only when the caller asked for positions
 * (`ParseOptions.position`). Synthetic nodes assembled from several mdast
 * pieces (containers, form-groups) inherit the span of the mdast node that
 * triggered them — every descendant missing a span receives the trigger's
 * span, keeping the tree fully located on a best-effort basis.
 */
function applySourceSpans(
  node: WiremdNode,
  mdastNode: any,
  options: ParseOptions
): WiremdNode {
  if (!options.position) return node;
  const position = mdastNode?.position;
  if (!position || !position.start || !position.end) return node;

  const stack: any[] = [node];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;
    if (!current.position) {
      current.position = position;
    }
    if (Array.isArray(current.children)) {
      for (const child of current.children) stack.push(child);
    }
    if (Array.isArray(current.options)) {
      for (const option of current.options) stack.push(option);
    }
  }
  return node;
}

/**
 * Transform a single MDAST node to wiremd node
 */
function transformNode(
  node: any,
  options: ParseOptions,
  nextNode?: any
): WiremdNode | null {
  const transformed = transformNodeInner(node, options, nextNode);
  if (!transformed) return null;
  return applySourceSpans(transformed, node, options);
}

function reportUnsupportedNode(node: any): void {
  const diagnostic: WiremdDiagnostic = {
    severity: 'warning',
    code: 'wmd-unsupported-node',
    message: `Unsupported markdown construct "${node.type}" was omitted from the wiremd output.`,
    source: 'parser',
    ...spansFromPosition(node.position),
  };
  const sink = activeDiagnosticSink;
  if (sink) {
    sink(diagnostic);
    return;
  }
  // No host sink attached (plain parse()/CLI path): keep the historical
  // dev-visible console warning. Never reference `process` here — this
  // module also runs in raw browser contexts.
  console.warn(`[wiremd] Unsupported node type: ${node.type}`);
}

function transformNodeInner(
  node: any,
  options: ParseOptions,
  nextNode?: any
): WiremdNode | null {
  switch (node.type) {
    case 'wiremdBlock':
      return transformContainer(node, options);

    case 'wiremdInlineContainer':
      return transformInlineContainer(node, options);

    case 'heading':
      return transformHeading(node, options);

    case 'paragraph':
      return transformParagraph(node, options, nextNode);

    case 'text':
      return {
        type: 'text',
        content: node.value,
      };

    case 'list':
      return transformList(node, options);

    case 'listItem':
      return transformListItem(node, options);

    case 'table':
      return transformTable(node, options);

    case 'blockquote':
      return transformBlockquote(node, options);

    case 'code':
      return {
        type: 'code',
        value: node.value,
        lang: node.lang || undefined,
        inline: false,
      };

    case 'inlineCode':
      return {
        type: 'code',
        value: node.value,
        inline: true,
      };

    case 'image':
      return {
        type: 'image',
        src: node.url || '',
        alt: node.alt || '',
        props: {},
      };

    case 'link':
      return {
        type: 'link',
        href: node.url || '#',
        title: node.title,
        children: node.children?.map((child: any) => transformNode(child, options)).filter(Boolean) || [],
        props: {},
      };

    case 'thematicBreak':
      return {
        type: 'separator',
        props: {},
      };

    default:
      // Unsupported syntax is dropped from the AST but must be visible to
      // hosts: report through the active diagnostics sink, falling back to
      // console.warn on the plain parse path.
      reportUnsupportedNode(node);
      return null;
  }
}

/**
 * Process a list of MDAST nodes into wiremd nodes.
 * Shared by both the top-level document pass and container children.
 * Layout containers (grid, row, tabs) are now handled via ::: syntax in transformContainer.
 */
function processNodeList(nodeChildren: any[], options: ParseOptions): WiremdNode[] {
  const result: WiremdNode[] = [];
  let i = 0;

  while (i < nodeChildren.length) {
    const node = nodeChildren[i];
    const nextNode = nodeChildren[i + 1];

    const transformed = transformNode(node, options, nextNode);
    if (transformed) {
      result.push(transformed);
      if (transformed.type === 'select' && nextNode && nextNode.type === 'list') i++;
      if (transformed.type === 'container' && nextNode && nextNode.type === 'list') {
        const hasSelectWithOptions = (transformed.children || []).some((child: any) =>
          child.type === 'select' && child.options && child.options.length > 0
        );
        if (hasSelectWithOptions) i++;
      }
    }
    i++;
  }

  return result;
}

/**
 * Collect ### headings inside a ::: grid-N container as grid-item nodes.
 * The first heading depth encountered defines the item boundary level.
 */
function collectGridItemsFromContainer(
  children: any[],
  options: ParseOptions,
  isCard: boolean,
): WiremdNode[] {
  const gridItems: WiremdNode[] = [];
  const firstHeading = children.find((n: any) => n.type === 'heading');
  if (!firstHeading) {
    // Heading-less grid (e.g. ::: grid-N wrapping ::: card blocks): each direct
    // child becomes its own grid-item — mirroring ::: row — so nested
    // containers are not silently dropped.
    return children.map((child: any) => ({
      type: 'grid-item',
      props: { classes: isCard ? ['card'] : [] } as any,
      children: processNodeList([child], options) as any,
    }));
  }
  const itemDepth = firstHeading.depth;

  let i = 0;
  while (i < children.length) {
    const child = children[i];
    if (child.type === 'heading' && child.depth === itemDepth) {
      const rawItemNodes: any[] = [child];
      i++;
      while (i < children.length) {
        const next = children[i];
        if (next.type === 'heading' && next.depth <= itemDepth) break;
        rawItemNodes.push(next);
        i++;
      }
      const headingContent = extractTextContent(child);
      const colSpanMatch = headingContent.match(/\{[^}]*\.col-span-(\d+)[^}]*\}/);
      const alignMatch = headingContent.match(/\{[^}]*\.(left|center|right)[^}]*\}/);
      const itemProps: any = { classes: [] };
      if (isCard) itemProps.classes.push('card');
      if (colSpanMatch) itemProps.classes.push(`col-span-${colSpanMatch[1]}`);
      if (alignMatch) itemProps.classes.push(`align-${alignMatch[1]}`);
      gridItems.push({
        type: 'grid-item',
        props: itemProps,
        children: processNodeList(rawItemNodes, options) as any,
      });
    } else {
      i++;
    }
  }
  return gridItems;
}

/**
 * Wrap each direct child of a ::: row container as an implicit grid-item.
 * When ### headings are present, uses heading-based grouping (supports alignment classes).
 * Otherwise, each paragraph/node is its own grid-item.
 * Dropdown paragraphs are always grouped with their following option list.
 */
function collectRowItemsFromContainer(
  children: any[],
  options: ParseOptions,
): WiremdNode[] {
  const items: WiremdNode[] = [];
  const hasHeadings = children.some((n: any) => n.type === 'heading');

  if (hasHeadings) {
    const firstHeading = children.find((n: any) => n.type === 'heading');
    const itemDepth = firstHeading.depth;
    let i = 0;
    while (i < children.length) {
      const child = children[i];
      if (child.type === 'heading' && child.depth === itemDepth) {
        const headingContent = extractTextContent(child);
        const alignMatch = headingContent.match(/\{[^}]*\.(left|center|right)[^}]*\}/);
        const itemProps: any = { classes: [] };
        if (alignMatch) itemProps.classes.push(`align-${alignMatch[1]}`);
        i++;
        // Class-only headings ("###" or "### {.left}") are invisible item
        // separators; a heading with real text is content — keep it so typed
        // text is never silently dropped.
        const bareHeadingText = headingContent.replace(/\{[^}]*\}/g, '').trim();
        const rawItemNodes: any[] = bareHeadingText ? [child] : [];
        while (i < children.length) {
          const next = children[i];
          if (next.type === 'heading' && next.depth <= itemDepth) break;
          if (next.type === 'paragraph') {
            const nodeText = extractTextContent(next);
            const isDropdown = /\[[^\]]+v\](?:\s*\{[^}]+\})?$/.test(nodeText);
            rawItemNodes.push(next);
            i++;
            if (isDropdown && i < children.length && children[i].type === 'list') {
              rawItemNodes.push(children[i]);
              i++;
            }
          } else {
            rawItemNodes.push(next);
            i++;
          }
        }
        items.push({
          type: 'grid-item',
          props: itemProps,
          children: processNodeList(rawItemNodes, options) as any,
        });
      } else {
        i++;
      }
    }
  } else {
    let i = 0;
    while (i < children.length) {
      const child = children[i];
      const groupNodes = [child];
      i++;
      if (child.type === 'paragraph') {
        const nodeText = extractTextContent(child);
        const isDropdown = /\[[^\]]+v\](?:\s*\{[^}]+\})?$/.test(nodeText);
        if (isDropdown && i < children.length && children[i].type === 'list') {
          groupNodes.push(children[i]);
          i++;
        }
      }
      items.push({
        type: 'grid-item',
        props: { classes: [] },
        children: processNodeList(groupNodes, options) as any,
      });
    }
  }

  return items;
}

/**
 * Transform container node (:::)
 */
function transformContainer(node: any, options: ParseOptions): WiremdNode {
  const props = parseAttributes(node.attributes || '');
  const containerType: string = (node.containerType || '').trim();

  // ::: grid-N  /  ::: grid-N card
  const gridMatch = containerType.match(/^grid-(\d+)$/);
  if (gridMatch) {
    const columns = parseInt(gridMatch[1], 10);
    const firstChild = node.children[0];
    const hasCard =
      (firstChild?.type === 'paragraph' &&
        firstChild.children?.[0]?.type === 'text' &&
        firstChild.children[0].value?.trim() === 'card') ||
      (props.classes || []).includes('card');
    const contentChildren = hasCard ? node.children.slice(1) : node.children;
    return {
      type: 'grid',
      columns,
      props: { ...props, card: hasCard, classes: (props.classes || []).filter((c: string) => c !== 'card') },
      children: collectGridItemsFromContainer(contentChildren, options, hasCard) as any,
    };
  }

  // ::: row
  if (containerType === 'row') {
    return {
      type: 'row',
      props,
      children: collectRowItemsFromContainer(node.children || [], options) as any,
    };
  }

  // ::: tabs  (children are ::: tab containers)
  if (containerType === 'tabs') {
    const tabs = (processNodeList(node.children || [], options) as any[]).filter(
      (n: any) => n.type === 'tab',
    );
    if (tabs.length > 0 && !tabs.some((t: any) => t.active)) {
      tabs[0].active = true;
    }
    return { type: 'tabs', props, children: tabs as any };
  }

  // ::: tab Label  /  ::: tab Label {.active}
  if (containerType === 'tab') {
    const firstChild = node.children[0];
    let label = '';
    let isActive = false;
    let contentChildren = node.children || [];
    if (
      firstChild?.type === 'paragraph' &&
      firstChild.children?.[0]?.type === 'text'
    ) {
      const raw: string = firstChild.children[0].value;
      const m = raw.match(/^(.+?)(?:\s*(\{[^}]+\}))?$/);
      label = m?.[1]?.trim() || raw.trim();
      isActive = (m?.[2] || '').includes('active');
      contentChildren = node.children.slice(1);
    }
    return {
      type: 'tab',
      label,
      active: isActive,
      props,
      children: processNodeList(contentChildren, options) as any,
    };
  }

  // ::: accordion  (children are ::: accordion-item containers). First item
  // expands by default unless any item carries {.expanded}/{.collapsed}.
  if (containerType === 'accordion') {
    const rawItems = (node.children || []).filter(
      (c: any) => c.type === 'wiremdBlock' && (c.containerType || '').trim() === 'accordion-item',
    );
    const anyExplicit = rawItems.some((c: any) => {
      if (/\b(expanded|collapsed)\b/.test(String(c.attributes || ''))) return true;
      const p = (c.children || [])[0];
      const text = p?.type === 'paragraph' ? String(p.children?.[0]?.value ?? '') : '';
      return /\{\s*\.?\s*(expanded|collapsed)\b/.test(text);
    });
    const items = (processNodeList(node.children || [], options) as any[]).filter(
      (n: any) => n.type === 'accordion-item',
    );
    if (items.length > 0 && !anyExplicit) {
      items[0].expanded = true;
    }
    return { type: 'accordion', props, children: items as any };
  }

  // ::: accordion-item Summary  /  ::: accordion-item Summary {.expanded}
  if (containerType === 'accordion-item') {
    const openerClasses = (props.classes || []) as string[];
    let explicit: boolean | undefined;
    if (openerClasses.includes('expanded') || openerClasses.includes('collapsed')) {
      explicit = openerClasses.includes('expanded');
    }
    const firstChild = node.children[0];
    let summary = '';
    let contentChildren = node.children || [];
    if (firstChild?.type === 'paragraph' && firstChild.children?.[0]?.type === 'text') {
      const raw: string = firstChild.children[0].value;
      const m = raw.match(/^(.+?)(?:\s*(\{[^}]+\}))?$/);
      summary = (m?.[1] || raw).trim();
      const trailing = m?.[2] || '';
      if (explicit === undefined && /\{\s*\.?\s*(expanded|collapsed)\b/.test(trailing)) {
        explicit = trailing.includes('expanded');
      }
      contentChildren = node.children.slice(1);
    }
    const rest = { ...props } as any;
    rest.classes = openerClasses.filter((c: any) => c !== 'expanded' && c !== 'collapsed');
    return {
      type: 'accordion-item',
      summary,
      expanded: explicit === true,
      props: rest,
      children: processNodeList(contentChildren, options) as any,
    };
  }

  if (containerType === 'demo') {
    return {
      type: 'demo',
      raw: node.rawContent || '',
      props,
      children: processNodeList(node.children || [], options) as any,
    };
  }

  // Phase 3 Task 2: feedback family containers
  if (containerType === 'toast') {
    const toastType = (props.classes || []).find((c: string) =>
      c === 'success' || c === 'info' || c === 'warning' || c === 'error' || c === 'loading',
    );
    return {
      type: 'toast',
      props: {
        ...props,
        toastType,
        classes: (props.classes || []).filter((c: string) => c !== toastType),
      },
      children: processNodeList(node.children || [], options) as any,
    };
  }

  if (containerType === 'skeleton') {
    return { type: 'skeleton', props };
  }

  if (containerType === 'spinner') {
    return { type: 'spinner', props };
  }

  if (containerType === 'progress' || containerType === 'meter') {
    const isProgress = containerType === 'progress';
    const classes = props.classes || [];
    const indeterminate = classes.includes('indeterminate');
    const valueAttr = props.value !== undefined ? Number(props.value) : undefined;
    const minAttr = props.min !== undefined ? Number(props.min) : 0;
    const maxAttr = props.max !== undefined ? Number(props.max) : 100;
    const fallbackValue = isProgress ? (indeterminate ? 0 : 50) : 60;
    const value = valueAttr !== undefined && !Number.isNaN(valueAttr) ? valueAttr : fallbackValue;
    const labelAttr = props.label;
    const remaining: any = { ...props };
    delete remaining.value;
    delete remaining.min;
    delete remaining.max;
    delete remaining.label;
    remaining.classes = classes.filter((c: string) => c !== 'indeterminate');
    return isProgress
      ? ({
          type: 'progress',
          value,
          indeterminate,
          props: { ...remaining, label: typeof labelAttr === 'string' ? labelAttr : undefined },
        } as WiremdNode)
      : ({
          type: 'meter',
          value,
          min: minAttr,
          max: maxAttr,
          props: { ...remaining, label: typeof labelAttr === 'string' ? labelAttr : undefined },
        } as WiremdNode);
  }

  // Phase 3 Task 3: overlay family
  if (
    containerType === 'dialog' || containerType === 'alert-dialog' ||
    containerType === 'sheet' || containerType === 'drawer' ||
    containerType === 'popover' || containerType === 'tooltip' ||
    containerType === 'preview-card'
  ) {
    const isSheet = containerType === 'sheet';
    const isDrawer = containerType === 'drawer';
    const isTooltip = containerType === 'tooltip';
    const isPreview = containerType === 'preview-card';
    const isDialog = containerType === 'dialog';
    const isAlert = containerType === 'alert-dialog';
    const isPopover = containerType === 'popover';
    const classes = (props.classes || []) as string[];
    const findSide = (): 'top' | 'right' | 'bottom' | 'left' => {
      const s = classes.find((c) => c === 'top' || c === 'right' || c === 'bottom' || c === 'left');
      return (s as 'top' | 'right' | 'bottom' | 'left') || 'right';
    };
    const firstChild = (node.children || [])[0];
    let titleFromOpener: string | undefined;
    if (firstChild && (firstChild as any).type === 'heading') {
      titleFromOpener = (firstChild as any).content;
    }
    const cleanedClasses = classes.filter((c) => c !== 'top' && c !== 'right' && c !== 'bottom' && c !== 'left');
    const baseProps: any = { ...props, classes: cleanedClasses };
    const childrenToUse = titleFromOpener
      ? (node.children || []).slice(1)
      : (node.children || []);
    const processedChildren = processNodeList(childrenToUse, options) as any;
    if (isSheet) {
      return { type: 'sheet', side: findSide(), props: { ...baseProps, title: titleFromOpener }, children: processedChildren };
    }
    if (isDrawer) {
      return { type: 'drawer', side: findSide(), props: { ...baseProps, title: titleFromOpener }, children: processedChildren };
    }
    if (isTooltip) {
      return {
        type: 'tooltip',
        props: { ...baseProps, content: titleFromOpener ?? '' },
        children: processedChildren,
      };
    }
    if (isPreview) {
      return { type: 'preview-card', props: baseProps, children: processedChildren };
    }
    if (isDialog) {
      return { type: 'dialog', props: { ...baseProps, title: titleFromOpener }, children: processedChildren };
    }
    if (isAlert) {
      return { type: 'alert-dialog', props: { ...baseProps, title: titleFromOpener }, children: processedChildren };
    }
    if (isPopover) {
      return { type: 'popover', props: { ...baseProps, title: titleFromOpener }, children: processedChildren };
    }
  }

  // Phase 3 Task 4: navigation family
  if (
    containerType === 'pagination' || containerType === 'segmented-control' ||
    containerType === 'scroll-area' || containerType === 'sidebar' ||
    containerType === 'menubar'
  ) {
    const firstChild = (node.children || [])[0];
    let titleFromOpener: string | undefined;
    if (firstChild && (firstChild as any).type === 'heading') {
      titleFromOpener = (firstChild as any).content;
    }
    const childrenToUse = titleFromOpener
      ? (node.children || []).slice(1)
      : (node.children || []);
    const processedChildren = processNodeList(childrenToUse, options) as any;
    switch (containerType) {
      case 'pagination':
        return { type: 'pagination', props, children: processedChildren };
      case 'segmented-control':
        return { type: 'segmented-control', props, children: processedChildren };
      case 'scroll-area':
        return { type: 'scroll-area', props, children: processedChildren };
      case 'sidebar':
        return { type: 'sidebar', props: { ...props, title: titleFromOpener }, children: processedChildren };
      case 'menubar':
        return { type: 'menubar', props, children: processedChildren };
    }
  }

  // Phase 3 Task 5: data entry family
  if (
    containerType === 'form' || containerType === 'field' || containerType === 'fieldset' ||
    containerType === 'label' || containerType === 'input-group' || containerType === 'otp-field' ||
    containerType === 'number-field' || containerType === 'autocomplete' ||
    containerType === 'combobox' || containerType === 'command' ||
    containerType === 'checkbox-group' || containerType === 'toggle-group' ||
    containerType === 'switch' || containerType === 'slider' || containerType === 'toggle' ||
    // Phase 3 Task 6: display family
    containerType === 'avatar' || containerType === 'frame' || containerType === 'group' ||
    containerType === 'empty' || containerType === 'calendar' || containerType === 'date-picker'
  ) {
    const processedChildren = processNodeList(node.children || [], options) as any;
    // Promote the first processed heading child to a label/legend string and drop it from children.
    const takeHeading = (): string | undefined => {
      const idx = processedChildren.findIndex((c: any) => c.type === 'heading');
      if (idx === -1) return undefined;
      const [h] = processedChildren.splice(idx, 1);
      return String((h as any).content ?? '').trim() || undefined;
    };
    const extractText = (): string => {
      const parts: string[] = [];
      for (const child of node.children || []) {
        const any = child as { type: string; value?: string; children?: any[] };
        if (any.type === 'text') parts.push(any.value ?? '');
        else if (any.children) {
          const text = (any.children || [])
            .map((c: any) => c.value ?? '')
            .join('');
          if (text.trim()) parts.push(text.trim());
        }
      }
      return parts.join(' ').trim();
    };
    switch (containerType) {
      case 'form':
        return { type: 'form', props, children: processedChildren };
      case 'field': {
        const label = takeHeading();
        const labelFromProp = typeof props.label === 'string' ? props.label : undefined;
        const rest = { ...props };
        delete rest.label; delete rest.description; delete rest.error;
        return {
          type: 'field',
          props: {
            ...rest,
            label: label ?? labelFromProp,
            description: typeof props.description === 'string' ? props.description : undefined,
            error: typeof props.error === 'string' ? props.error : undefined,
          },
          children: processedChildren,
        };
      }
      case 'fieldset': {
        const legend = takeHeading();
        const rest = { ...props };
        delete rest.legend; delete rest.description;
        return {
          type: 'fieldset',
          props: {
            ...rest,
            legend,
            description: typeof props.description === 'string' ? props.description : undefined,
          },
          children: processedChildren,
        };
      }
      case 'label':
        return { type: 'label', content: extractText(), props };
      case 'input-group': {
        const rest = { ...props };
        delete rest.addonStart; delete rest.addonEnd;
        return {
          type: 'input-group',
          props: {
            ...rest,
            addonStart: typeof props.addonStart === 'string' ? props.addonStart : undefined,
            addonEnd: typeof props.addonEnd === 'string' ? props.addonEnd : undefined,
          },
          children: processedChildren,
        };
      }
      case 'otp-field': {
        const rest = { ...props };
        delete rest.length; delete rest.maxLength;
        return {
          type: 'otp-field',
          props: {
            ...rest,
            length: props.length !== undefined ? Number(props.length) : 6,
            maxLength: props.maxLength !== undefined ? Number(props.maxLength) : 1,
          },
        };
      }
      case 'number-field': {
        const rest = { ...props } as any;
        const numeric = (v: any): number | undefined => (v !== undefined && !Number.isNaN(Number(v)) ? Number(v) : undefined);
        const out: any = { type: 'number-field', props: { ...rest } };
        delete out.props.value; delete out.props.min; delete out.props.max; delete out.props.step;
        out.props.value = numeric(props.value);
        out.props.min = numeric(props.min);
        out.props.max = numeric(props.max);
        out.props.step = numeric(props.step);
        out.props.placeholder = typeof props.placeholder === 'string' ? props.placeholder : undefined;
        return out;
      }
      case 'autocomplete':
      case 'combobox': {
        const rest = { ...props };
        delete rest.placeholder; delete rest.options; delete rest.suggestions;
        // Harvest options from the processed wiremd list (list-item nodes carry .content strings)
        const listChild = (processedChildren as any[]).find((c: any) => c.type === 'list');
        const opts: string[] = listChild
          ? (listChild.children || [])
              .map((li: any) => String(li.content ?? '').trim())
              .filter(Boolean)
          : [];
        const isAuto = containerType === 'autocomplete';
        return {
          type: isAuto ? 'autocomplete' : 'combobox',
          props: {
            ...rest,
            placeholder: typeof props.placeholder === 'string' ? props.placeholder : undefined,
            ...(isAuto ? { suggestions: opts } : { options: opts }),
          },
          children: processedChildren,
        };
      }
      case 'command':
        return { type: 'command', props, children: processedChildren };
      case 'checkbox-group': {
        const label = takeHeading();
        const rest = { ...props };
        delete rest.label; delete rest.description;
        return {
          type: 'checkbox-group',
          props: {
            ...rest,
            label,
            description: typeof props.description === 'string' ? props.description : undefined,
          },
          children: processedChildren,
        };
      }
      case 'toggle-group':
        return { type: 'toggle-group', props, children: processedChildren };
      case 'switch': {
        const classes = (props.classes || []) as string[];
        const checked = classes.includes('checked') || props.checked === true;
        const rest = { ...props } as any;
        delete rest.checked; delete rest.label; delete rest.description; delete rest.disabled;
        rest.classes = classes.filter((c) => c !== 'checked');
        return {
          type: 'switch',
          checked,
          props: {
            ...rest,
            label: typeof props.label === 'string' ? props.label : undefined,
            description: typeof props.description === 'string' ? props.description : undefined,
            disabled: props.disabled === true,
          },
        };
      }
      case 'slider': {
        const rest = { ...props } as any;
        const numeric = (v: any): number | undefined => (v !== undefined && !Number.isNaN(Number(v)) ? Number(v) : undefined);
        const value = numeric(props.value) ?? 50;
        delete rest.value; delete rest.min; delete rest.max; delete rest.step; delete rest.label;
        return {
          type: 'slider',
          value,
          props: {
            ...rest,
            min: numeric(props.min) ?? 0,
            max: numeric(props.max) ?? 100,
            step: numeric(props.step) ?? 1,
            label: typeof props.label === 'string' ? props.label : undefined,
          },
        };
      }
      case 'toggle': {
        const classes = (props.classes || []) as string[];
        const pressed = classes.includes('active') || classes.includes('pressed') || props.pressed === true;
        const rest = { ...props } as any;
        delete rest.pressed;
        rest.classes = classes.filter((c) => c !== 'active' && c !== 'pressed');
        return {
          type: 'toggle',
          pressed,
          props: {
            ...rest,
            label: typeof props.label === 'string' ? props.label : undefined,
          },
        };
      }

      // Phase 3 Task 6: display family
      case 'avatar': {
        const rest = { ...props } as any;
        const size = ['sm', 'md', 'lg', 'xl'].includes(rest.size) ? rest.size : 'md';
        delete rest.size; delete rest.name;
        return {
          type: 'avatar',
          props: {
            ...rest,
            size,
            name: typeof props.name === 'string' ? props.name : undefined,
          },
        };
      }
      case 'frame':
        return { type: 'frame', props, children: processedChildren };
      case 'group': {
        const orientation = (props.orientation as any) === 'vertical' ? 'vertical' : 'horizontal';
        return { type: 'group', orientation, props, children: processedChildren };
      }
      case 'empty':
        return { type: 'empty', props, children: processedChildren };
      case 'calendar': {
        const rest = { ...props } as any;
        const year = rest.year !== undefined && !Number.isNaN(Number(rest.year)) ? Number(rest.year) : new Date().getFullYear();
        const month = typeof rest.month === 'string' ? rest.month : undefined;
        delete rest.year; delete rest.month;
        return { type: 'calendar', props: { ...rest, month, year }, children: processedChildren };
      }
      case 'date-picker': {
        const rest = { ...props } as any;
        return {
          type: 'date-picker',
          props: {
            ...rest,
            placeholder: typeof rest.placeholder === 'string' ? rest.placeholder : undefined,
            value: typeof rest.value === 'string' ? rest.value : undefined,
          },
        };
      }
    }
  }

  // Coss parity family: collapsible / menu / context-menu / toolbar
  if (containerType === 'collapsible') {
    const classes = (props.classes || []) as string[];
    let collapsed = classes.includes('collapsed') || props.collapsed === true;
    const rest = { ...props } as any;
    delete rest.collapsed;
    rest.classes = classes.filter((c: any) => c !== 'collapsed' && c !== 'expanded');
    const firstChild = (node.children || [])[0];
    let title: string | undefined;
    let childrenToUse = node.children || [];
    if (firstChild?.type === 'paragraph' && firstChild.children?.[0]?.type === 'text') {
      const raw: string = firstChild.children[0].value;
      const m = raw.match(/^(.+?)(?:\s*(\{[^}]+\}))?$/);
      if (m?.[2] && /\{\s*\.?\s*(expanded|collapsed)\b/.test(m[2])) {
        collapsed = m[2].includes('collapsed');
      }
      title = (m?.[1] || raw).trim() || undefined;
      childrenToUse = childrenToUse.slice(1);
    }
    return {
      type: 'collapsible',
      collapsed,
      props: { ...rest, title },
      children: processNodeList(childrenToUse, options) as any,
    };
  }

  // ::: menu Trigger Label / ::: context-menu Zone Label — list children become
  // menu items (task/radio markers become check/radio items, trailing {…}
  // attribute groups carry {.danger}/{.disabled}/{shortcut:"…"}, nested lists
  // become submenus); headings become group labels and --- becomes a separator.
  if (containerType === 'menu' || containerType === 'context-menu') {
    const isContext = containerType === 'context-menu';
    const firstChild = (node.children || [])[0];
    let titleFromOpener: string | undefined;
    let childrenToUse = node.children || [];
    if (firstChild?.type === 'paragraph' && firstChild.children?.[0]?.type === 'text') {
      const raw: string = firstChild.children[0].value;
      const m = raw.match(/^(.+?)(?:\s*(\{[^}]+\}))?$/);
      titleFromOpener = (m?.[1] || raw).trim() || undefined;
      childrenToUse = childrenToUse.slice(1);
    }
    const processed = processNodeList(childrenToUse, options) as any[];
    return {
      type: isContext ? 'context-menu' : 'menu',
      props: { ...props, title: titleFromOpener },
      children: menuItemsFromProcessed(processed) as any,
    };
  }

  // ::: toolbar — inline bracket buttons/inputs; standalone --- (blank-line
  // separated) becomes a vertical toolbar separator.
  if (containerType === 'toolbar') {
    return { type: 'toolbar', props, children: processNodeList(node.children || [], options) as any };
  }

  return {
    type: 'container',
    containerType: containerType as any,
    props,
    children: processNodeList(node.children || [], options) as any,
  };
}

/**
 * Post-parse pass that rewrites any `button` node carrying a `kbd` class into a
 * dedicated `kbd` node. The wiremd syntax lets the user write `[⌘K]{.kbd}` to
 * get a keyboard hint; several parser paths emit a plain button for this
 * shape, and threading a kbd shortcut through every one of them is fragile.
 * This single tree-walk guarantees a uniform AST regardless of which
 * transform produced the node.
 */
function resolveKbdShortcut(nodes: WiremdNode[]): WiremdNode[] {
  const out: WiremdNode[] = [];
  for (const node of nodes) {
    if (node && (node as any).type === 'button') {
      const buttonNode = node as Extract<WiremdNode, { type: 'button' }>;
      const classes = buttonNode.props?.classes ?? [];
      if (classes.includes('kbd')) {
        out.push({
          type: 'kbd',
          content: buttonNode.content ?? '',
          props: {
            ...buttonNode.props,
            classes: classes.filter((c: string) => c !== 'kbd'),
          },
        } as WiremdNode);
        continue;
      }
    }
    if (node && (node as any).children && Array.isArray((node as any).children)) {
      (node as any).children = resolveKbdShortcut((node as any).children);
    }
    out.push(node);
  }
  return out;
}

/**
 * Transform inline container node ([[...]])
 */
function transformInlineContainer(node: any, _options: ParseOptions): WiremdNode {
  const props = parseAttributes(node.attributes || '');
  const items = node.items || [];
  const children: WiremdNode[] = [];

  // Detect breadcrumb: single item containing ">" separator (e.g. [[ Home > Products > Item ]])
  if (items.length === 1 && items[0].includes('>')) {
    const crumbs = items[0].split(/\s*>\s*/).map((c: string) => c.trim()).filter(Boolean);
    return {
      type: 'breadcrumbs',
      props,
      children: crumbs.map((crumb: string, i: number) => ({
        type: 'breadcrumb-item',
        content: crumb,
        current: i === crumbs.length - 1,
        props: {},
      })) as any,
    };
  }

  // Parse each item - could be text, icon, or button
  let brandEmitted = false;
  for (const item of items) {
    // Split a trailing {attrs} group off the item so attributes style the node
    // instead of leaking into its text.
    let trimmed = item.trim();
    let itemProps: any = { classes: [] };
    const attrMatch = trimmed.match(/^([\s\S]+?)\s*(\{[^}]+\})$/);
    if (attrMatch) {
      trimmed = attrMatch[1].trim();
      itemProps = parseAttributes(attrMatch[2]);
    }

    // Check if it's an active/emphasized item: *Text* or **Text**
    const activeMatch = trimmed.match(/^\*\*?([^*]+)\*\*?$/);
    if (activeMatch) {
      children.push({
        type: 'nav-item',
        content: activeMatch[1],
        props: { ...itemProps, classes: [...(itemProps.classes ?? []), 'active'] },
      });
      continue;
    }

    // Check if it's a link nav-item: [Text](url) or [Text](url)*
    const linkMatch = trimmed.match(/^\[([^\]]+)\]\(([^)]+)\)(\*)?$/);
    if (linkMatch) {
      children.push({
        type: 'nav-item',
        content: linkMatch[1],
        href: linkMatch[2],
        props: {
          ...itemProps,
          ...(linkMatch[3] ? { variant: 'primary' } : {}),
        },
      });
      continue;
    }

    // Check if it's a button: [Text] or [Text]*
    const buttonMatch = trimmed.match(/^\[([^\]]+)\](\*)?$/);
    if (buttonMatch) {
      children.push({
        type: 'button',
        content: buttonMatch[1],
        props: {
          ...itemProps,
          ...(buttonMatch[2] ? { variant: 'primary' } : {}),
        },
      });
      continue;
    }

    // Check if it's an icon: :icon:
    const iconMatch = trimmed.match(/^:([a-z-]+):$/);
    if (iconMatch) {
      children.push({
        type: 'icon',
        props: { ...itemProps, name: iconMatch[1] },
      });
      continue;
    }

    // Check if it starts with icon: :icon: Text
    const iconTextMatch = trimmed.match(/^:([a-z-]+):\s*(.+)$/);
    if (iconTextMatch) {
      const iconName = iconTextMatch[1];
      const text = iconTextMatch[2];

      // Create a brand node for :logo:, otherwise nav-item
      const nodeType = iconName === 'logo' ? 'brand' : 'nav-item';

      children.push({
        type: nodeType,
        children: [
          { type: 'icon', props: { name: iconName } },
          { type: 'text', content: text },
        ],
        props: itemProps,
      });
      continue;
    }

    // Otherwise, first plain text item is the brand; rest are nav items
    if (!brandEmitted) {
      brandEmitted = true;
      children.push({
        type: 'brand',
        children: [{ type: 'text', content: trimmed, props: {} }] as any,
        props: itemProps,
      });
    } else {
      children.push({
        type: 'nav-item',
        content: trimmed,
        props: itemProps,
      });
    }
  }

  return {
    type: 'nav',
    props,
    children: children as any,
  };
}

/**
 * Transform heading node
 */
function transformHeading(node: any, _options: ParseOptions): WiremdNode {
  // Extract attributes from heading text
  const content = extractTextContent(node);

  // Check if heading has attributes at the end: "Title {.class}" or "{.class}" alone
  const attrMatch = content.match(/^(.*?)(\{[^}]+\})$/);
  let headingText = content;
  let props: any = { classes: [] };

  if (attrMatch) {
    headingText = attrMatch[1].trim();
    props = parseAttributes(attrMatch[2]);
  }

  // Parse icons in heading text
  if (/:([a-z-]+):/.test(headingText)) {
    const iconPattern = /:([a-z-]+):/g;
    const parts = headingText.split(iconPattern);
    const children: WiremdNode[] = [];

    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        if (parts[i].trim()) {
          children.push({
            type: 'text',
            content: parts[i],
            props: {},
          });
        }
      } else {
        children.push({
          type: 'icon',
          props: { name: parts[i] },
        });
      }
    }

    return {
      type: 'heading',
      level: node.depth as 1 | 2 | 3 | 4 | 5 | 6,
      children: children as any,
      props,
    };
  }

  return {
    type: 'heading',
    level: node.depth as 1 | 2 | 3 | 4 | 5 | 6,
    content: headingText,
    props,
  };
}

/**
 * Detect one or more [[Text](url)]* patterns in a paragraph's children.
 * Remark produces alternating text/link nodes because CommonMark forbids nested links:
 *   "[", link, "]*[", link, "]"
 * Returns button nodes, or null if the children don't match this pattern at all.
 */
function tryParseButtonLinkSequence(children: any[]): WiremdNode[] | null {
  if (!children || children.length < 3 || children.length % 2 === 0) return null;

  // Must alternate: text, link, text, link, text, ...
  for (let i = 0; i < children.length; i++) {
    if (i % 2 === 0 && children[i].type !== 'text') return null;
    if (i % 2 === 1 && children[i].type !== 'link') return null;
  }

  // First text must be exactly "[" (optionally with leading whitespace)
  if (!/^\s*\[$/.test(children[0].value)) return null;

  // Last text must be "]" + optional "*" + optional "{attrs}" + nothing else
  const lastText: string = children[children.length - 1].value;
  if (!/^\](\*)?\s*(\{[^}]*\})?\s*$/.test(lastText)) return null;

  // Each middle text (between two links) must be "]...[" — closes previous, opens next
  for (let i = 2; i <= children.length - 3; i += 2) {
    if (!/^\](\*)?\s*(\{[^}]*\})?\s*\[$/.test(children[i].value)) return null;
  }

  return children
    .filter((_: any, i: number) => i % 2 === 1) // keep only link nodes
    .map((linkNode: any, idx: number) => {
      const closingText: string = children[idx * 2 + 2].value;
      const closeMatch = closingText.match(/^\](\*)?\s*(\{[^}]*\})?/);
      const isPrimary = !!(closeMatch && closeMatch[1]);
      const attrStr = (closeMatch && closeMatch[2]) || '';
      const attrs = attrStr ? parseAttributes(attrStr) : {};
      return {
        type: 'button' as const,
        content: extractTextContent(linkNode),
        href: linkNode.url || '#',
        props: { ...attrs, variant: isPrimary ? 'primary' : (attrs as any).variant },
      };
    });
}

function serializeMdastChildren(children: any[]): string {
  return (children || []).map((child: any) => {
    if (child.type === 'link') {
      const text = (child.children || []).map((c: any) => c.value || '').join('');
      return `[${text}](${child.url})`;
    }
    if (child.type === 'strong') return `**${serializeMdastChildren(child.children)}**`;
    if (child.type === 'emphasis') return `*${serializeMdastChildren(child.children)}*`;
    return child.value || '';
  }).join('');
}

function transformParagraph(node: any, _options: ParseOptions, nextNode?: any): WiremdNode {
  // Check for [[...]] inline container before any other processing — handles nested containers
  // where remark-inline-containers only runs on top-level nodes
  if (node.children?.length) {
    const serialized = serializeMdastChildren(node.children);
    const inlineMatch = serialized.match(/^\[\[\s*(.+?)\s*\]\](\{[^}]+\})?$/);
    if (inlineMatch) {
      const content = inlineMatch[1];
      const attrs = inlineMatch[2] || '';
      const items = content.split('|').map((item: string) => item.trim());
      return transformInlineContainer({ type: 'wiremdInlineContainer', content, items, attributes: attrs.trim() }, _options);
    }
  }

  // Check if this paragraph has rich content (strong, emphasis, links, images, etc.)
  const hasRichContent = node.children && node.children.some((child: any) =>
    child.type === 'strong' || child.type === 'emphasis' || child.type === 'link' || child.type === 'code' || child.type === 'inlineCode' || child.type === 'image'
  );

  // [[Button](url)]* — one or more linked-button patterns on the same line.
  // CommonMark forbids nested links so remark produces alternating text/link children:
  //   "[", link, "]*", "[", link, "]"  for two buttons, etc.
  const buttonLinks = tryParseButtonLinkSequence(node.children);
  if (buttonLinks !== null) {
    if (buttonLinks.length === 1) return buttonLinks[0];
    return {
      type: 'container',
      containerType: 'button-group',
      children: buttonLinks as any,
      props: {},
    };
  }

  // If it has rich content and is not a special pattern, return as a rich text paragraph
  if (hasRichContent) {
    let content = extractTextContent(node);
    // Clean up trailing ::: from container closing markers
    content = content.replace(/\s*:::\s*$/, '').trim();

    // Still check for button patterns first
    const buttonMatch = content.match(/^\[([^\]]+)\](\*)?(?:\s*(\{[^}]*\}))?$/);
    if (buttonMatch) {
      const attrs = buttonMatch[3] ? parseAttributes(buttonMatch[3]) : {};
      return {
        type: 'button',
        content: buttonMatch[1],
        props: {
          ...attrs,
          variant: buttonMatch[2] ? 'primary' : undefined,
        },
      };
    }

    // For other rich content, check if we have mixed content with buttons
    const processedChildren: WiremdNode[] = [];
    let currentText = '';

    const flushText = () => {
      if (currentText) {
        processedChildren.push({
          type: 'text',
          content: currentText,
          props: {},
        });
        currentText = '';
      }
    };

    for (const child of node.children) {
      if (child.type === 'text') {
        // Check for buttons and icons in text
        // Split on both button patterns and icon patterns
        const textParts = child.value.split(/(\[[^\]]+\](?:\*)?(?:\s*\{[^}]*\})?|:[a-z-]+:|\|[^|]+\|(?:\s*\{[^}]*\})?)/);
        for (const part of textParts) {
          // Check for button
          const buttonMatch = part.match(/^\[([^\]]+)\](\*)?(?:\s*(\{[^}]*\}))?$/);
          if (buttonMatch && !/^\[[_*]+\]/.test(part)) {
            // It's a button
            flushText();
            const attrs = buttonMatch[3] ? parseAttributes(buttonMatch[3]) : {};
            processedChildren.push({
              type: 'button',
              content: buttonMatch[1],
              props: {
                ...attrs,
                variant: buttonMatch[2] ? 'primary' : undefined,
              },
            });
          } else if (part.match(/^:([a-z-]+):$/)) {
            // It's an icon
            flushText();
            const iconMatch = part.match(/^:([a-z-]+):$/);
            if (iconMatch) {
              processedChildren.push({
                type: 'icon',
                props: { name: iconMatch[1] },
              });
            }
          } else if (part.match(/^\|([^|]+)\|(?:\s*(\{[^}]*\}))?$/)) {
            // It's a pill/badge
            flushText();
            const pillMatch = part.match(/^\|([^|]+)\|(?:\s*(\{[^}]*\}))?$/);
            if (pillMatch) {
              const [, text, attrs] = pillMatch;
              const props = parseAttributes(attrs || '');
              const validVariants = ['default', 'primary', 'success', 'warning', 'error'];
              const variantClass = props.classes?.find((c: string) => validVariants.includes(c));
              if (variantClass) {
                props.variant = variantClass;
                props.classes = props.classes.filter((c: string) => c !== variantClass);
              }
              processedChildren.push({ type: 'badge', content: text.trim(), props });
            }
          } else if (part) {
            currentText += part;
          }
        }
      } else if (child.type === 'image') {
        // Flush text before image and add image as separate child
        flushText();
        processedChildren.push({
          type: 'image',
          src: child.url || '',
          alt: child.alt || '',
          props: {},
        });
      } else if (child.type === 'strong') {
        currentText += `<strong>${extractTextContent(child)}</strong>`;
      } else if (child.type === 'emphasis') {
        currentText += `<em>${extractTextContent(child)}</em>`;
      } else if (child.type === 'code' || child.type === 'inlineCode') {
        currentText += `<code>${extractTextContent(child)}</code>`;
      } else if (child.type === 'link') {
        currentText += `<a href="${child.url}">${extractTextContent(child)}</a>`;
      } else {
        currentText += extractTextContent(child);
      }
    }
    flushText();

    // If we only have one text child with no buttons, return as paragraph
    if (processedChildren.length === 1 && processedChildren[0].type === 'text') {
      return {
        type: 'paragraph',
        content: processedChildren[0].content,
        props: {},
      };
    }

    // If we have multiple children or buttons, return as container
    return {
      type: 'container',
      containerType: 'form-group',
      children: processedChildren as any,
      props: {},
    };
  }

  let content = extractTextContent(node);
  // Clean up trailing ::: from container closing markers
  content = content.replace(/\s*:::\s*$/, '').trim();

  // Check for standalone checkbox: [ ] or [x] or [X]
  const checkboxMatch = content.match(/^\[\s*([xX ])\s*\]\s+(.+)$/);
  if (checkboxMatch) {
    const checked = checkboxMatch[1].toLowerCase() === 'x';
    let label = checkboxMatch[2];

    // Extract attributes from label if present
    const attrMatch = label.match(/^(.+?)(\{[^}]+\})$/);
    let props: any = {};
    if (attrMatch) {
      label = attrMatch[1].trim();
      props = parseAttributes(attrMatch[2]);
    }

    return {
      type: 'checkbox',
      label,
      checked,
      props,
    };
  }

  // Check for inline radio buttons: (*) Option1 ( ) Option2 ( ) Option3
  // Must have at least 2 radio button patterns on the same line
  const radioPattern = /\(([*•x ])\)\s+([^(]+?)(?=\s*\(|$)/g;
  const radioMatches = Array.from(content.matchAll(radioPattern));

  if (radioMatches.length >= 2) {
    const radioButtons: WiremdNode[] = [];

    for (const match of radioMatches) {
      const selected = match[1] !== ' ';
      let label = match[2].trim();

      // Remove trailing attributes if present
      const attrMatch = label.match(/^(.+?)(\{[^}]+\})$/);
      let props: any = {};
      if (attrMatch) {
        label = attrMatch[1].trim();
        props = parseAttributes(attrMatch[2]);
      }

      radioButtons.push({
        type: 'radio',
        label,
        selected,
        props,
      });
    }

    return {
      type: 'radio-group',
      props: { inline: true },
      children: radioButtons as any,
    };
  }

  // Check for inline container syntax [[...]]
  const inlineContainerMatch = content.match(/^\[\[\s*(.+?)\s*\]\](\{[^}]+\})?/);
  if (inlineContainerMatch) {
    const itemsContent = inlineContainerMatch[1];
    const attrs = inlineContainerMatch[2] || '';
    const items = itemsContent.split('|').map((item: string) => item.trim());

    // Create a wiremdInlineContainer-like structure and transform it
    const inlineContainerNode = {
      type: 'wiremdInlineContainer',
      content: itemsContent,
      items,
      attributes: attrs.trim(),
    };

    const transformed = transformInlineContainer(inlineContainerNode, _options);

    // If there's text after the inline container, wrap both in a container
    const remainingText = content.substring(inlineContainerMatch[0].length).trim();
    if (remainingText) {
      return {
        type: 'container',
        containerType: 'section',
        children: [
          transformed,
          {
            type: 'paragraph',
            content: remainingText,
            props: {},
          }
        ] as any,
        props: {},
      };
    }

    return transformed;
  }

  // Handle multi-line paragraphs (e.g., "Username\n[_____]")
  // Split by newlines and check if any line matches our patterns
  const lines = content.split('\n').filter(line => line.trim());

  // If we have multiple lines, check if ALL lines are buttons/form elements
  if (lines.length > 1) {
    // Check if all lines have icon patterns (e.g., ":star: Star Icon")
    const allWithIcons = lines.every(line => /:([a-z-]+):/.test(line.trim()));

    if (allWithIcons) {
      const iconLines: WiremdNode[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        const iconPattern = /:([a-z-]+):/g;
        const parts = trimmed.split(iconPattern);
        const lineChildren: WiremdNode[] = [];

        for (let i = 0; i < parts.length; i++) {
          if (i % 2 === 0) {
            if (parts[i].trim()) {
              lineChildren.push({
                type: 'text',
                content: parts[i],
                props: {},
              });
            }
          } else {
            lineChildren.push({
              type: 'icon',
              props: { name: parts[i] },
            });
          }
        }

        if (lineChildren.length > 0) {
          iconLines.push({
            type: 'paragraph',
            children: lineChildren as any,
            props: {},
          });
        }
      }

      if (iconLines.length > 0) {
        return {
          type: 'container',
          containerType: 'section',
          props: {},
          children: iconLines as any,
        };
      }
    }

    // Check if all lines consist entirely of buttons (one or more per line)
    const isInputLike = (s: string) => /\[[^\]]*_{3,}[^\]]*\]/.test(s) || /\[[_*]+\]/.test(s);
    const lineIsAllButtons = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed || !/\[/.test(trimmed)) return false;
      if (isInputLike(trimmed)) return false;
      const stripped = trimmed.replace(/\[([^\]]+)\](\*)?(?:\s*\{[^}]*\})?/g, '').trim();
      return stripped === '';
    };
    const allButtons = lines.every(lineIsAllButtons);

    if (allButtons) {
      const buttons: WiremdNode[] = [];
      const buttonPattern = /\[([^\]]+)\](\*)?(?:\s*(\{[^}]*\}))?/g;
      for (const line of lines) {
        let match;
        buttonPattern.lastIndex = 0;
        while ((match = buttonPattern.exec(line.trim())) !== null) {
          if (/^\[[_*]+\]/.test(match[0])) continue;
          const [, text, isPrimary, attrs] = match;
          const props = parseAttributes(attrs || '');
          if (isPrimary) props.variant = 'primary';
          buttons.push({ type: 'button', content: text, props });
        }
      }

      if (buttons.length > 1) {
        return {
          type: 'container',
          containerType: 'button-group',
          props: {},
          children: buttons as any[],
        };
      } else if (buttons.length === 1) {
        return buttons[0];
      }
    }

    // Otherwise check if the last line is a form element with labels before it
    const lastLine = lines[lines.length - 1].trim();
    const labelLineArray = lines.slice(0, -1);
    const labelLines = labelLineArray.join('\n');

    // If all preceding lines consist entirely of inline elements (buttons and/or inputs),
    // don't treat them as label text — combine with the last line's element in a button-group.
    const lineIsAllInlineElements = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed || !/\[/.test(trimmed)) return false;
      const stripped = trimmed.replace(/\[([^\]]+)\](\*)?(?:\s*\{[^}]*\})?/g, '').trim();
      return stripped === '';
    };
    const labelLinesAreButtons = labelLineArray.length > 0 && labelLineArray.every(lineIsAllInlineElements);
    const isInputText = (t: string) => /^[_*]+$/.test(t) || /_{3,}$/.test(t);
    const parseLabelAsButtons = (): WiremdNode[] => {
      const nodes: WiremdNode[] = [];
      const btnPat = /\[([^\]]+)\](\*)?(?:\s*(\{[^}]*\}))?/g;
      for (const line of labelLineArray) {
        let m;
        btnPat.lastIndex = 0;
        while ((m = btnPat.exec(line.trim())) !== null) {
          const [, text, isPrimary, attrs] = m;
          const p = parseAttributes(attrs || '');
          if (isInputText(text)) {
            const placeholderMatch = text.match(/^([^_*]+)_{3,}$/);
            if (placeholderMatch) p.placeholder = placeholderMatch[1].trim();
            nodes.push({ type: 'input', props: p });
          } else {
            if (isPrimary) p.variant = 'primary';
            nodes.push({ type: 'button', content: text, props: p });
          }
        }
      }
      return nodes;
    };

    // Check if last line is a dropdown
    const dropdownMatch = lastLine.match(/^\[([^\]]+)v\](?:\s*(\{[^}]+\}))?$/);
    if (dropdownMatch) {
      const [, text, attrs] = dropdownMatch;
      const props = parseAttributes(attrs || '');
      const options: any[] = [];

      // Check if next node is a list - if so, use list items as options
      if (nextNode && nextNode.type === 'list') {
        for (const item of nextNode.children || []) {
          const itemText = extractTextContent(item);
          options.push({
            type: 'option',
            value: itemText,
            label: itemText,
            selected: false,
          });
        }
      }

      // If preceding lines are button lines, combine as a button-group instead of form-group
      if (labelLinesAreButtons) {
        return {
          type: 'container',
          containerType: 'button-group',
          props: {},
          children: [...parseLabelAsButtons(), {
            type: 'select',
            props: { ...props, placeholder: text.replace(/[_\s]+$/, '').trim() || undefined },
            options,
          }] as any[],
        };
      }
      // Create a container with label and select
      return {
        type: 'container',
        containerType: 'form-group',
        props: {},
        children: [
          labelLines ? { type: 'text', content: labelLines } : null,
          {
            type: 'select',
            props: {
              ...props,
              placeholder: text.replace(/[_\s]+$/, '').trim() || undefined,
            },
            options,
          }
        ].filter(Boolean) as WiremdNode[],
      };
    }

    // Check if last line is an input
    if (/\[[^\]]*[_*][^\]]*\]/.test(lastLine)) {
      const match = lastLine.match(/^\[([^\]]+)\](?:\s*(\{[^}]+\}))?$/);
      if (match) {
        const [, pattern, attrs] = match;
        const props = parseAttributes(attrs || '');

        // Determine input type and placeholder from pattern
        let placeholderText = '';
        if (pattern.includes('*') && pattern.replace(/[^*]/g, '').length > 3) {
          props.inputType = 'password';
        } else {
          // Extract placeholder text before underscores
          const placeholderMatch = pattern.match(/^([^_*]+)[_*]/);
          if (placeholderMatch) {
            placeholderText = placeholderMatch[1].trim();
            props.placeholder = placeholderText;
          }
        }

        // Count underscores or asterisks to determine width (each char = ~1 character width)
        const underscoreCount = pattern.replace(/[^_]/g, '').length;
        const asteriskCount = pattern.replace(/[^*]/g, '').length;
        const widthChars = underscoreCount > 0 ? underscoreCount : asteriskCount;

        if (widthChars > 0) {
          // If there's placeholder text, width should be at least as long as placeholder + extra padding
          // Add 6 chars padding to account for Comic Sans variable width and browser padding
          // Otherwise use the underscore/asterisk count
          if (placeholderText) {
            props.width = Math.max(placeholderText.length + 6, widthChars);
          } else {
            props.width = widthChars;
          }
        }

        // If preceding lines are button lines, combine as a button-group instead of form-group
        if (labelLinesAreButtons) {
          return {
            type: 'container',
            containerType: 'button-group',
            props: {},
            children: [...parseLabelAsButtons(), { type: 'input', props }] as any[],
          };
        }
        // Create a container with label and input
        return {
          type: 'container',
          containerType: 'form-group',
          props: {},
          children: [
            labelLines ? { type: 'text', content: labelLines } : null,
            {
              type: 'input',
              props,
            }
          ].filter(Boolean) as WiremdNode[],
        };
      }
    }

    // Check if last line is a textarea (has rows attribute), button, or multiple buttons
    if (/\[([^\]]+)\]/.test(lastLine)) {
      // First check if it's a textarea (contains rows attribute)
      const textareaMatch = lastLine.match(/^\[([^\]]+)\](?:\s*(\{[^}]*rows:[^}]*\}))$/);
      if (textareaMatch) {
        const [, placeholder, attrs] = textareaMatch;
        const props = parseAttributes(attrs || '');

        // If preceding lines are button lines, combine as a button-group
        if (labelLinesAreButtons) {
          return {
            type: 'container',
            containerType: 'button-group',
            props: {},
            children: [...parseLabelAsButtons(), {
              type: 'textarea',
              props: { ...props, placeholder: placeholder.trim() },
            }] as any[],
          };
        }
        // Create a container with label and textarea
        return {
          type: 'container',
          containerType: 'form-group',
          props: {},
          children: [
            labelLines ? { type: 'text', content: labelLines } : null,
            {
              type: 'textarea',
              props: {
                ...props,
                placeholder: placeholder.trim(),
              }
            }
          ].filter(Boolean) as WiremdNode[],
        };
      }

      // Otherwise check for buttons (skip input-like patterns)
      const buttonPattern = /\[([^\]]+)\](\*)?(?:\s*(\{[^}]*\}))?/g;
      const buttons: WiremdNode[] = [];
      let match;
      const isInputTextMulti = (t: string) => /^[_*]+$/.test(t) || /_{3,}$/.test(t);

      while ((match = buttonPattern.exec(lastLine)) !== null) {
        const [, text, isPrimary, attrs] = match;
        const props = parseAttributes(attrs || '');
        if (isInputTextMulti(text) || 'rows' in props) continue;
        if (isPrimary) props.variant = 'primary';
        buttons.push({ type: 'button', content: text, props });
      }

      if (buttons.length > 0) {
        // If preceding lines are inline elements (buttons/inputs), combine all into a button-group
        if (labelLinesAreButtons) {
          return {
            type: 'container',
            containerType: 'button-group',
            props: {},
            children: [...parseLabelAsButtons(), ...buttons] as any[],
          };
        }
        // If we have label lines and buttons, create a container
        if (labelLines) {
          return {
            type: 'container',
            containerType: 'form-group',
            props: {},
            children: [
              { type: 'text', content: labelLines },
              ...buttons
            ] as WiremdNode[],
          };
        }
        // If just buttons, return them directly (handle multiple later)
        if (buttons.length === 1) {
          return buttons[0];
        }
        // Multiple buttons without label
        return {
          type: 'container',
          containerType: 'button-group',
          props: {},
          children: buttons as any[],
        };
      }
    }
  }

  // Single line content - check all patterns as before

  // Check if this is a dropdown (ends with 'v]'): [Select option___v]
  const dropdownMatch = content.match(/^\[([^\]]+)v\](?:\s*(\{[^}]+\}))?$/);
  if (dropdownMatch) {
    const [, text, attrs] = dropdownMatch;
    const props = parseAttributes(attrs || '');
    const options: any[] = [];

    // Check if next node is a list - if so, use list items as options
    if (nextNode && nextNode.type === 'list') {
      for (const item of nextNode.children || []) {
        const itemText = extractTextContent(item);
        options.push({
          type: 'option',
          value: itemText,
          label: itemText,
          selected: false,
        });
      }
    }

    return {
      type: 'select',
      props: {
        ...props,
        placeholder: text.replace(/[_\s]+$/, '').trim() || undefined,
      },
      options,
    };
  }

  // Check if this is an input FIRST: [___] or [***] or [Email___]
  // Input must contain at least one underscore or asterisk
  // This matches: [_____], [*****], [Email___], [Name_______], etc.
  if (/^\[[^\]]*[_*][^\]]*\](?:\s*\{[^}]+\})?$/.test(content)) {
    const match = content.match(/^\[([^\]]+)\](?:\s*(\{[^}]+\}))?$/);
    if (match) {
      const [, pattern, attrs] = match;
      const props = parseAttributes(attrs || '');

      // Determine input type from pattern
      if (pattern.includes('*') && pattern.replace(/[^*]/g, '').length > 3) {
        props.inputType = 'password';
      } else {
        // Extract placeholder text before underscores
        const placeholderMatch = pattern.match(/^([^_*]+)[_*]/);
        if (placeholderMatch) {
          props.placeholder = placeholderMatch[1].trim();
        }
      }

      return {
        type: 'input',
        props,
      };
    }
  }

  // Check for single textarea (has rows attribute)
  const singleTextareaMatch = content.match(/^\[([^\]]+)\](?:\s*(\{[^}]*rows:[^}]*\}))$/);
  if (singleTextareaMatch) {
    const [, placeholder, attrs] = singleTextareaMatch;
    const props = parseAttributes(attrs || '');

    return {
      type: 'textarea',
      props: {
        ...props,
        placeholder: placeholder.trim(),
      }
    };
  }

  // Check for pills: |Label| or |Label|{.variant}
  if (/\|([^|]+)\|/.test(content)) {
    const textParts = content.split(/(\|[^|]+\|(?:\s*\{[^}]*\})?)/);
    const children: WiremdNode[] = [];
    const validVariants = ['default', 'primary', 'success', 'warning', 'error'];

    for (const part of textParts) {
      const pillMatch = part.match(/^\|([^|]+)\|(?:\s*(\{[^}]*\}))?$/);
      if (pillMatch) {
        const [, text, attrs] = pillMatch;
        const props = parseAttributes(attrs || '');
        const variantClass = props.classes?.find((c: string) => validVariants.includes(c));
        if (variantClass) {
          props.variant = variantClass;
          props.classes = props.classes.filter((c: string) => c !== variantClass);
        }
        children.push({ type: 'badge', content: text.trim(), props });
      } else if (part.trim()) {
        children.push({ type: 'text', content: part, props: {} });
      }
    }

    if (children.length === 1 && children[0].type === 'badge') {
      return children[0];
    }

    if (children.length > 0) {
      return {
        type: 'paragraph',
        children: children as any,
        props: {},
      };
    }
  }

  // Check for multiple buttons on the same line BEFORE icon check: [Submit] [Cancel]
  if (/\[([^\]]+)\]/.test(content)) {
    const buttonPattern = /\[([^\]]+)\](\*)?(?:\s*(\{[^}]*\}))?/g;
    // One slot per bracket-token match, in match order (null = token skipped, e.g. textarea).
    // Keeping slots aligned with matches lets the mixed-content branch below map each
    // match back to its element (input/select/button) instead of only button elements.
    const slots: (WiremdNode | null)[] = [];
    let match;
    const isInputText = (t: string) => /^[_*]+$/.test(t) || /_{3,}$/.test(t);
    const isSelectText = (t: string) => /_{1,}v$/.test(t);

    while ((match = buttonPattern.exec(content)) !== null) {
      const [, text, isPrimary, attrs] = match;
      const props = parseAttributes(attrs || '');

      if (isSelectText(text)) {
        // Dropdown pattern — [Option___v] or [Select_______v]
        const placeholder = text.replace(/_{1,}v$/, '').trim() || undefined;
        if (placeholder) props.placeholder = placeholder;
        slots.push({ type: 'select', props, options: [] } as any);
        continue;
      }

      if (isInputText(text)) {
        // Input pattern — [Search___] or [_____]
        const placeholderMatch = text.match(/^([^_*]+)_{3,}$/);
        if (placeholderMatch) props.placeholder = placeholderMatch[1].trim();
        slots.push({ type: 'input', props });
        continue;
      }

      // Skip if it has rows attribute (it's a textarea)
      if ('rows' in props) {
        slots.push(null);
        continue;
      }

      if (isPrimary) props.variant = 'primary';

      // Parse icons in button text
      if (/:([a-z-]+):/.test(text)) {
        const iconPattern = /:([a-z-]+):/g;
        const parts = text.split(iconPattern);
        const children: WiremdNode[] = [];

        for (let i = 0; i < parts.length; i++) {
          if (i % 2 === 0) {
            if (parts[i].trim()) {
              children.push({ type: 'text', content: parts[i], props: {} });
            }
          } else {
            children.push({ type: 'icon', props: { name: parts[i] } });
          }
        }

        slots.push({ type: 'button', content: '', children: children as any, props });
      } else {
        slots.push({ type: 'button', content: text, props });
      }
    }

    const elements = slots.filter((s): s is WiremdNode => s !== null);
    const buttons = elements.filter(e => e.type === 'button');
    const hasMixed = elements.some(e => e.type !== 'button');

    if (elements.length === 1 && content.trim() === content.match(/\[([^\]]+)\](\*)?(?:\s*\{[^}]*\})?/)![0]) {
      return elements[0];
    } else if (elements.length > 0) {
      const remainingText = content.replace(/\[([^\]]+)\](\*)?(?:\s*\{[^}]*\})?/g, '').trim();
      if (!remainingText && elements.length > 1) {
        return {
          type: 'container',
          containerType: 'button-group',
          props: {},
          children: elements as any[],
        };
      } else if (!remainingText && buttons.length === 1 && !hasMixed) {
        return buttons[0];
      } else if (!remainingText && elements.length === 1) {
        return elements[0];
      } else if (remainingText) {
        // Element(s) with text - create paragraph with mixed content.
        // Use the per-match slots (input/select/button alike); indexing only the
        // button elements here previously dropped input/select tokens into null slots.
        const children: WiremdNode[] = [];
        let lastIndex = 0;
        const buttonMatches = Array.from(content.matchAll(/\[([^\]]+)\](\*)?(?:\s*(\{[^}]*\}))?/g));

        buttonMatches.forEach((match, idx) => {
          // Add text before element
          const textBefore = content.substring(lastIndex, match.index);
          const element = slots[idx];

          if (element) {
            if (textBefore.trim()) {
              children.push({ type: 'text', content: textBefore, props: {} });
            }
            children.push(element);
          } else {
            // Token produced no element (e.g. textarea with rows attr) — keep it as literal text
            const literal = textBefore + match[0];
            if (literal.trim()) {
              children.push({ type: 'text', content: literal, props: {} });
            }
          }

          lastIndex = match.index! + match[0].length;
        });

        // Add remaining text after last element
        const textAfter = content.substring(lastIndex);
        if (textAfter.trim()) {
          children.push({ type: 'text', content: textAfter, props: {} });
        }

        return {
          type: 'paragraph',
          children: children as any,
          props: {},
        };
      }
      // Fallthrough to paragraph if there's mixed content
    }
  }

  // Check for icons in content (after button check to avoid conflicts)
  if (/:([a-z-]+):/.test(content)) {
    const iconPattern = /:([a-z-]+):/g;
    const textParts = content.split(iconPattern);
    const children: WiremdNode[] = [];

    for (let i = 0; i < textParts.length; i++) {
      if (i % 2 === 0) {
        // Text part
        if (textParts[i].trim()) {
          children.push({
            type: 'text',
            content: textParts[i],
            props: {},
          });
        }
      } else {
        // Icon name part
        children.push({
          type: 'icon',
          props: { name: textParts[i] },
        });
      }
    }

    if (children.length > 0) {
      // If only one child and it's an icon, return as icon
      if (children.length === 1 && children[0].type === 'icon') {
        return children[0];
      }

      // If only one child and it's text, return as paragraph
      if (children.length === 1 && children[0].type === 'text') {
        return {
          type: 'paragraph',
          content: children[0].content,
          props: {},
        };
      }

      // Mixed content, return as paragraph with children
      // Clean up trailing ::: from the last text child if present
      const cleanedChildren = [...children];
      if (cleanedChildren.length > 0) {
        const lastChild = cleanedChildren[cleanedChildren.length - 1];
        if (lastChild.type === 'text' && lastChild.content) {
          const cleaned = lastChild.content.replace(/\s*:::\s*$/, '').trim();
          if (cleaned) {
            cleanedChildren[cleanedChildren.length - 1] = { ...lastChild, content: cleaned };
          } else {
            // Remove empty text node
            cleanedChildren.pop();
          }
        }
      }

      return {
        type: 'paragraph',
        children: cleanedChildren as any,
        props: {},
      };
    }
  }

  // Check for standalone icon syntax: :icon-name:
  const iconMatch = content.match(/^:([a-z-]+):$/);
  if (iconMatch) {
    return {
      type: 'icon',
      props: {
        name: iconMatch[1],
      },
    };
  }

  // Default: return as paragraph
  // Remove trailing container closing markers (:::) if present
  const cleanedContent = content.replace(/\s*:::\s*$/, '').trim();

  return {
    type: 'paragraph',
    content: cleanedContent,
    props: {},
  };
}

/**
 * Transform list node
 */
/**
 * Coss parity: flatten processed menu children into menu-item trees.
 * Lists splice their converted children in place; list-item / gfm checkbox /
 * radio nodes convert to menu-item nodes; everything else (headings as group
 * labels, separators, custom blocks) passes through untouched.
 */
function menuItemsFromProcessed(processed: any[]): WiremdNode[] {
  const out: WiremdNode[] = [];
  for (const node of processed) {
    if (!node) continue;
    if (node.type === 'list') {
      out.push(...menuItemsFromProcessed(node.children || []));
    } else {
      const item = menuItemFromNode(node);
      out.push(item ?? node);
    }
  }
  return out;
}

/** Convert one processed node into a menu-item, or null to pass it through. */
function menuItemFromNode(node: any): WiremdNode | null {
  if (node.type === 'list-item') {
    const item = menuItemFromContent(String(node.content ?? ''));
    const nested = (node.children || []).find((c: any) => c.type === 'list');
    if (nested) (item as any).children = menuItemsFromProcessed([nested]);
    return item;
  }
  if (node.type === 'checkbox' || node.type === 'radio') {
    const item = menuItemFromAttrs(
      String(node.label ?? ''),
      node.props || {},
    );
    (item as any).indicator = node.type === 'checkbox' ? 'check' : 'radio';
    (item as any).checked = node.type === 'checkbox' ? node.checked === true : node.selected === true;
    const nested = (node.children || []).find((c: any) => c.type === 'list');
    if (nested) (item as any).children = menuItemsFromProcessed([nested]);
    return item;
  }
  return null;
}

/** Split trailing {…} attribute groups off a plain list item's content. */
function menuItemFromContent(content: string): WiremdNode {
  const m = content.match(/^(.+?)(?:\s*(\{[^}]+\}))?$/);
  const attrs = m?.[2] ? parseAttributes(m[2]) : {};
  return menuItemFromAttrs((m?.[1] || content).trim(), attrs as any);
}

/** Build a menu-item node, lifting {.danger}/{.disabled}/{shortcut:"…"} into fields. */
function menuItemFromAttrs(content: string, attrs: any): WiremdNode {
  const classes = (attrs.classes || []) as string[];
  const rest = { ...attrs } as any;
  rest.classes = classes.filter((c: any) => c !== 'danger' && c !== 'destructive' && c !== 'disabled');
  const item: any = { type: 'menu-item', content, props: rest };
  if (classes.includes('danger') || classes.includes('destructive')) item.variant = 'destructive';
  if (classes.includes('disabled') || attrs.disabled === true) item.disabled = true;
  if (typeof attrs.shortcut === 'string') item.shortcut = attrs.shortcut;
  return item;
}

function transformList(node: any, options: ParseOptions): WiremdNode {
  const children: WiremdNode[] = [];

  for (const item of node.children) {
    const transformed = transformNode(item, options);
    if (transformed) {
      children.push(transformed);
    }
  }

  return {
    type: 'list',
    ordered: node.ordered || false,
    props: {},
    children: children as any,
  };
}

/**
 * Transform list item node
 */
function transformListItem(node: any, options: ParseOptions): WiremdNode {
  // Extract immediate text content (from paragraph) and nested children
  let immediateContent = '';
  const nestedChildren: WiremdNode[] = [];

  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      // First paragraph contains the immediate list item text
      if (child.type === 'paragraph' && !immediateContent) {
        immediateContent = extractTextContent(child);
      }
      // Nested lists should be transformed and added as children
      else if (child.type === 'list') {
        const transformed = transformList(child, options);
        if (transformed) {
          nestedChildren.push(transformed);
        }
      }
    }
  }

  const content = immediateContent || extractTextContent(node);

  // Check for task list checkbox: remark-gfm sets checked property
  // node.checked will be true, false, or null (for non-task-list items)
  if (node.checked !== null && node.checked !== undefined) {
    // Extract attributes from label if present
    const attrMatch = content.match(/^(.+?)(\{[^}]+\})$/);
    let label = content;
    let props: any = {};

    if (attrMatch) {
      label = attrMatch[1].trim();
      props = parseAttributes(attrMatch[2]);
    }

    // Parse icons in checkbox label
    if (/:([a-z-]+):/.test(label)) {
      const iconPattern = /:([a-z-]+):/g;
      const parts = label.split(iconPattern);
      const children: WiremdNode[] = [];

      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
          if (parts[i].trim()) {
            children.push({
              type: 'text',
              content: parts[i],
              props: {},
            });
          }
        } else {
          children.push({
            type: 'icon',
            props: { name: parts[i] },
          });
        }
      }

      // Add nested children if any
      if (nestedChildren.length > 0) {
        children.push(...nestedChildren);
      }

      return {
        type: 'checkbox',
        label: '', // Will use children instead
        checked: node.checked === true,
        props: { ...props, hasChildren: true },
        children: children as any,
      };
    }

    return {
      type: 'checkbox',
      label,
      checked: node.checked === true,
      props,
      children: nestedChildren.length > 0 ? (nestedChildren as any) : undefined,
    };
  }

  // Check for radio button: ( ) or (•) or (x) or (*)
  const radioMatch = content.match(/^\(([•x* ])\)\s*(.+)$/);
  if (radioMatch) {
    let label = radioMatch[2];

    // Extract attributes from label if present
    const attrMatch = label.match(/^(.+?)(\{[^}]+\})$/);
    let props: any = {};

    if (attrMatch) {
      label = attrMatch[1].trim();
      props = parseAttributes(attrMatch[2]);
    }

    return {
      type: 'radio',
      label,
      selected: radioMatch[1] !== ' ',
      props,
      children: nestedChildren.length > 0 ? (nestedChildren as any) : undefined,
    };
  }

  // Parse icons in regular list items
  if (/:([a-z-]+):/.test(content)) {
    const iconPattern = /:([a-z-]+):/g;
    const parts = content.split(iconPattern);
    const children: WiremdNode[] = [];

    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        if (parts[i].trim()) {
          children.push({
            type: 'text',
            content: parts[i],
            props: {},
          });
        }
      } else {
        children.push({
          type: 'icon',
          props: { name: parts[i] },
        });
      }
    }

    // Add nested children if any
    if (nestedChildren.length > 0) {
      children.push(...nestedChildren);
    }

    return {
      type: 'list-item',
      children: children as any,
      props: {},
    };
  }

  return {
    type: 'list-item',
    content,
    props: {},
    children: nestedChildren.length > 0 ? (nestedChildren as any) : undefined,
  };
}

/**
 * Transform table node
 */
function transformTable(node: any, options: ParseOptions): WiremdNode {
  const children: WiremdNode[] = [];
  const align = node.align || [];

  // Process each row
  for (let rowIndex = 0; rowIndex < node.children.length; rowIndex++) {
    const row = node.children[rowIndex];
    const isHeader = rowIndex === 0;
    const cells: WiremdNode[] = [];

    // Process each cell in the row
    for (let cellIndex = 0; cellIndex < row.children.length; cellIndex++) {
      const cell = row.children[cellIndex];
      const cellAlign = align[cellIndex] || 'left';
      const cellChildren: WiremdNode[] = [];

      // Transform cell content
      for (const child of cell.children || []) {
        if (child.type === 'text') {
          const iconMatch = /^:([a-z-]+):\s*([\s\S]*)$/.exec(child.value);
          if (iconMatch) {
            cellChildren.push({
              type: 'icon',
              props: { name: iconMatch[1] },
            });
            const remainder = iconMatch[2].trim();
            if (remainder) {
              cellChildren.push({
                type: 'text',
                content: remainder,
                props: {},
              });
            }
          } else {
            cellChildren.push({
              type: 'text',
              content: child.value,
              props: {},
            });
          }
        } else if (child.type === 'strong') {
          cellChildren.push({
            type: 'text',
            content: `<strong>${extractTextContent(child)}</strong>`,
            props: {},
          });
        } else if (child.type === 'emphasis') {
          cellChildren.push({
            type: 'text',
            content: `<em>${extractTextContent(child)}</em>`,
            props: {},
          });
        } else if (child.type === 'code') {
          cellChildren.push({
            type: 'text',
            content: `<code>${extractTextContent(child)}</code>`,
            props: {},
          });
        } else {
          const transformed = transformNode(child, options);
          if (transformed) {
            cellChildren.push(transformed);
          }
        }
      }

      cells.push({
        type: 'table-cell',
        content: extractTextContent(cell),
        children: cellChildren.length > 0 ? cellChildren : undefined,
        align: cellAlign as 'left' | 'center' | 'right',
        header: isHeader,
      });
    }

    if (isHeader) {
      children.push({
        type: 'table-header',
        children: cells,
      });
    } else {
      children.push({
        type: 'table-row',
        children: cells,
      });
    }
  }

  return {
    type: 'table',
    props: {},
    children,
  };
}

/**
 * Transform blockquote node
 */
function transformBlockquote(node: any, options: ParseOptions): WiremdNode {
  const children: WiremdNode[] = [];

  for (const child of node.children) {
    const transformed = transformNode(child, options);
    if (transformed) {
      children.push(transformed);
    }
  }

  return {
    type: 'blockquote',
    props: {},
    children,
  };
}

/**
 * Extract text content from a node and its children
 */
function extractTextContent(node: any): string {
  if (typeof node === 'string') {
    return node;
  }

  if (node.value) {
    return node.value;
  }

  if (node.children && Array.isArray(node.children)) {
    return node.children.map(extractTextContent).join('');
  }

  return '';
}

/**
 * Parse attributes from string like {.class key:value}
 */
function parseAttributes(attrString: string): any {
  const props: any = {
    classes: [],
  };

  if (!attrString) {
    return props;
  }

  // The input may be a single `{…}` group or several glued together
  // (e.g. `{.active} {label:"Bold"}`). Split on the glue first so each group
  // is a standalone attrs blob parseable by the original logic.
  if (attrString.startsWith('{') && attrString.endsWith('}') && attrString.slice(1, -1).includes('} {')) {
    const merged: any = { classes: [] };
    for (const group of attrString.match(/\{[^}]+\}/g) || []) {
      const sub = parseAttributes(group);
      for (const cls of sub.classes || []) merged.classes.push(cls);
      for (const [k, v] of Object.entries(sub)) {
        if (k === 'classes') continue;
        merged[k] = v;
      }
    }
    return merged;
  }
  // Remove outer braces
  const inner = attrString.replace(/^\{|\}$/g, '').trim();

  if (!inner) {
    return props;
  }

  // Tokenize: a quoted value (key:"multi word") stays one token; bare words split on whitespace
  const parts = inner.match(/\S+:"[^"]*"|\S+:'[^']*'|\S+/g) ?? [];

  for (const part of parts) {
    // Class: .classname
    if (part.startsWith('.')) {
      props.classes.push(part.slice(1));
    }
    // State: :state
    else if (part.startsWith(':')) {
      props.state = part.slice(1);
    }
    // Key-value: key:value (strip surrounding quotes from the value)
    else if (part.includes(':')) {
      // Split on the FIRST colon only — values may themselves contain colons
      // (e.g. addonStart:"https://example.com/"); split(':', 2) truncated those.
      const colon = part.indexOf(':');
      const key = part.slice(0, colon);
      const value = part.slice(colon + 1);
      const unquoted = value.replace(/^["']|["']$/g, '');
      props[key] = unquoted || true;
    }
    // Boolean: required, disabled, etc.
    else {
      props[part] = true;
    }
  }

  return props;
}
