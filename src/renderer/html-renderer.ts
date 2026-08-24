/**
 * HTML Renderer for wiremd AST nodes
 * Converts each AST node type to HTML
 *
 * Copyright (c) 2025 wiremd
 * Licensed under MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import type { WiremdNode } from '../types.js';
import { generateCode } from '../codegen/coss/index.js';

export interface RenderContext {
  style: string;
  classPrefix: string;
  inlineStyles: boolean;
  pretty: boolean;
  /** Code format used for coss demo panes when the raw source is not shown. */
  codegen: 'html' | 'jsx';
}

/**
 * Render a wiremd AST node to HTML
 */
export function renderNode(node: WiremdNode, context: RenderContext): string {
  if (node == null) return '';
  switch (node.type) {
    case 'button':
      return renderButton(node, context);

    case 'input':
      return renderInput(node, context);

    case 'textarea':
      return renderTextarea(node, context);

    case 'select':
      return renderSelect(node, context);

    case 'checkbox':
      return renderCheckbox(node, context);

    case 'radio':
      return renderRadio(node, context);

    case 'radio-group':
      return renderRadioGroup(node, context);

    case 'icon':
      return renderIcon(node, context);

    case 'badge':
      return renderBadge(node, context);

    case 'container':
      return renderContainer(node, context);

    case 'nav':
      return renderNav(node, context);

    case 'nav-item':
      return renderNavItem(node, context);

    case 'brand':
      return renderBrand(node, context);

    case 'grid':
      return renderGrid(node, context);

    case 'grid-item':
      return renderGridItem(node, context);

    case 'row':
      return renderRow(node, context);


    case 'heading':
      return renderHeading(node, context);

    case 'paragraph':
      return renderParagraph(node, context);

    case 'text':
      return renderText(node, context);

    case 'image':
      return renderImage(node, context);

    case 'link':
      return renderLink(node, context);

    case 'list':
      return renderList(node, context);

    case 'list-item':
      return renderListItem(node, context);

    case 'table':
      return renderTable(node, context);

    case 'table-header':
      return renderTableHeader(node, context);

    case 'table-row':
      return renderTableRow(node, context);

    case 'table-cell':
      return renderTableCell(node, context);

    case 'blockquote':
      return renderBlockquote(node, context);

    case 'code':
      return renderCode(node, context);

    case 'separator':
      return renderSeparator(node, context);

    case 'tabs':
      return renderTabs(node, context);

    case 'tab':
      return renderTab(node, context);

    case 'breadcrumbs':
      return renderBreadcrumbs(node, context);

    case 'demo':
      return renderDemo(node, context);

    case 'toast':
      return renderToast(node, context);

    case 'skeleton':
      return renderSkeleton(node, context);

    case 'spinner':
      return renderSpinner(node, context);

    case 'kbd':
      return renderKbd(node, context);

    case 'progress':
      return renderProgress(node, context);

    case 'meter':
      return renderMeter(node, context);

    case 'dialog':
      return renderDialog(node, context);

    case 'alert-dialog':
      return renderAlertDialog(node, context);

    case 'sheet':
      return renderSheet(node, context);

    case 'drawer':
      return renderDrawer(node, context);

    case 'popover':
      return renderPopover(node, context);

    case 'tooltip':
      return renderTooltip(node, context);

    case 'preview-card':
      return renderPreviewCard(node, context);

    case 'pagination':
      return renderPagination(node, context);

    case 'segmented-control':
      return renderSegmentedControl(node, context);

    case 'scroll-area':
      return renderScrollArea(node, context);

    case 'sidebar':
      return renderSidebarNav(node, context);

    case 'menubar':
      return renderMenubar(node, context);

    default:
      return `<!-- Unknown node type: ${(node as any).type} -->`;
  }
}

function renderButton(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'button', node.props);
  const disabled = node.props.state === 'disabled' ? ' disabled' : '';
  const loading = node.props.state === 'loading' ? ` ${prefix}loading` : '';

  // Handle children (like icons in buttons)
  const contentHTML = node.children
    ? node.children.map((child: any) => renderNode(child, context)).join('')
    : escapeHtml(node.content);

  const href = node.href || node.props?.href;
  if (href) {
    return `<a href="${escapeHtml(href)}" class="${classes}${loading}">${contentHTML}</a>`;
  }

  return `<button class="${classes}${loading}"${disabled}>${contentHTML}</button>`;
}

function renderBadge(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'badge', node.props);
  return `<span class="${classes}">${escapeHtml(node.content)}</span>`;
}

function renderInput(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'input', node.props);
  const type = node.props.inputType || node.props.type || 'text';
  const required = node.props.required ? ' required' : '';
  const disabled = node.props.disabled ? ' disabled' : '';
  const placeholder = node.props.placeholder ? ` placeholder="${escapeHtml(node.props.placeholder)}"` : '';
  const value = node.props.value ? ` value="${escapeHtml(node.props.value)}"` : '';

  // Apply width based on underscore count (each underscore ~= 1ch width)
  const style = node.props.width ? ` style="width: ${node.props.width}ch; max-width: ${node.props.width}ch;"` : '';

  return `<input type="${type}" class="${classes}"${placeholder}${value}${required}${disabled}${style} />`;
}

function renderTextarea(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'textarea', node.props);
  const rows = node.props.rows || 4;
  const required = node.props.required ? ' required' : '';
  const disabled = node.props.disabled ? ' disabled' : '';
  const placeholder = node.props.placeholder ? ` placeholder="${escapeHtml(node.props.placeholder)}"` : '';
  const value = node.props.value || '';

  return `<textarea class="${classes}" rows="${rows}"${placeholder}${required}${disabled}>${escapeHtml(value)}</textarea>`;
}

function renderSelect(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'select', node.props);
  const required = node.props.required ? ' required' : '';
  const disabled = node.props.disabled ? ' disabled' : '';
  const multiple = node.props.multiple ? ' multiple' : '';

  const optionsHTML = (node.options || []).map((opt: any) => {
    const selected = opt.selected ? ' selected' : '';
    return `<option value="${escapeHtml(opt.value)}"${selected}>${escapeHtml(opt.label)}</option>`;
  }).join('\n    ');

  const placeholder = node.props.placeholder;
  const placeholderOption = placeholder
    ? `<option value="" disabled selected>${escapeHtml(placeholder)}</option>\n    `
    : '';

  return `<select class="${classes}"${required}${disabled}${multiple}>
    ${placeholderOption}${optionsHTML}
  </select>`;
}

function renderCheckbox(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'checkbox', node.props);
  const checked = node.checked ? ' checked' : '';
  const disabled = node.props.disabled ? ' disabled' : '';
  const value = node.props.value ? ` value="${escapeHtml(node.props.value)}"` : '';

  // Separate inline children (icons/text) from nested children (lists)
  let labelHTML = escapeHtml(node.label || '');
  let nestedHTML = '';

  if (node.children) {
    const inlineChildren: any[] = [];
    const nestedChildren: any[] = [];

    for (const child of node.children) {
      if (child.type === 'list') {
        nestedChildren.push(child);
      } else {
        inlineChildren.push(child);
      }
    }

    if (inlineChildren.length > 0) {
      labelHTML = inlineChildren.map((child: any) => renderNode(child, context)).join('');
    }

    if (nestedChildren.length > 0) {
      nestedHTML = nestedChildren.map((child: any) => renderNode(child, context)).join('');
    }
  }

  return `<label class="${classes}">
    <input type="checkbox"${checked}${disabled}${value} />
    <span>${labelHTML}</span>
  </label>${nestedHTML}`;
}

function renderRadio(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'radio', node.props);
  const checked = node.selected ? ' checked' : '';
  const disabled = node.props.disabled ? ' disabled' : '';
  const name = node.props.name ? ` name="${escapeHtml(node.props.name)}"` : '';
  const value = node.props.value ? ` value="${escapeHtml(node.props.value)}"` : '';

  // Handle children (nested lists or other content)
  const labelHTML = escapeHtml(node.label);
  const childrenHTML = node.children
    ? node.children.map((child: any) => renderNode(child, context)).join('')
    : '';

  return `<label class="${classes}">
    <input type="radio"${checked}${disabled}${name}${value} />
    <span>${labelHTML}</span>
  </label>${childrenHTML}`;
}

function renderRadioGroup(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const isInline = node.props?.inline;
  const classes = buildClasses(prefix, 'radio-group', node.props);
  const inlineClass = isInline ? ` ${prefix}radio-group-inline` : '';

  // Generate a unique name for this radio group
  const groupName = `radio-${Math.random().toString(36).substr(2, 9)}`;

  const radios = (node.children || []).map((child: any) => {
    // Add the group name to each radio button
    if (child.type === 'radio') {
      const modifiedChild = { ...child, props: { ...child.props, name: groupName } };
      return renderNode(modifiedChild, context);
    }
    return renderNode(child, context);
  }).join('\n    ');

  return `<div class="${classes}${inlineClass}">
    ${radios}
</div>`;
}

function renderIcon(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'icon', node.props);
  const iconName = node.props.name || 'default';

  // Icon mapping - using Unicode symbols and emoji
  const iconMap: Record<string, string> = {
    // Social media
    'twitter': '𝕏', // Twitter/X logo approximation
    'github': '⊙', // GitHub-like symbol
    'linkedin': 'in', // LinkedIn text representation
    'facebook': 'f',
    'instagram': '◉',
    'youtube': '▶',

    // Common UI icons
    'home': '🏠',
    'user': '👤',
    'settings': '⚙️',
    'search': '🔍',
    'star': '⭐',
    'heart': '❤️',
    'mail': '✉️',
    'phone': '📞',
    'calendar': '📅',
    'clock': '🕐',
    'location': '📍',
    'link': '🔗',
    'download': '⬇️',
    'upload': '⬆️',
    'edit': '✏️',
    'delete': '🗑️',
    'plus': '➕',
    'minus': '➖',
    'check': '✓',
    'close': '✕',
    'menu': '☰',
    'more': '⋯',
    'info': 'ℹ️',
    'warning': '⚠️',
    'error': '❌',
    'success': '✅',

    // Arrows
    'arrow-up': '↑',
    'arrow-down': '↓',
    'arrow-left': '←',
    'arrow-right': '→',

    // Business/Finance
    'chart': '📊',
    'dollar': '$',
    'euro': '€',
    'pound': '£',

    // Tech
    'code': '</>',
    'database': '🗄️',
    'cloud': '☁️',
    'wifi': '📶',

    // Communication
    'chat': '💬',
    'video': '🎥',
    'microphone': '🎤',
    'bell': '🔔',

    // Files
    'file': '📄',
    'folder': '📁',
    'image': '🖼️',
    'document': '📃',
    'pdf': '📑',

    // Brand placeholders
    'logo': '◈',
    'brand': '◆',

    // Activities
    'rocket': '🚀',
    'bulb': '💡',
    'shield': '🛡️',
    'lock': '🔒',
    'unlock': '🔓',
    'key': '🔑',
    'gift': '🎁',
    'trophy': '🏆',
    'flag': '🚩',
    'bookmark': '🔖',
    'tag': '🏷️',
    'cart': '🛒',
    'credit-card': '💳',

    // Default
    'default': '●'
  };

  const iconContent = iconMap[iconName] || iconMap['default'];

  // For social media icons, wrap in a styled span to make them look more icon-like
  const socialIcons = ['twitter', 'github', 'linkedin', 'facebook', 'instagram', 'youtube'];
  if (socialIcons.includes(iconName)) {
    return `<span class="${classes}" data-icon="${iconName}" aria-label="${iconName}" style="font-family: monospace; font-weight: bold; font-style: normal;">${iconContent}</span>`;
  }

  return `<span class="${classes}" data-icon="${iconName}" aria-label="${iconName}">${iconContent}</span>`;
}

function renderContainer(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, `container-${node.containerType}`, node.props);

  const nodeClasses: string[] = node.props?.classes || [];
  if (node.containerType === 'alert') {
    return renderAlertContainer(node, context, classes, nodeClasses);
  }
  if (node.containerType === 'layout' && nodeClasses.includes('sidebar-main')) {
    return renderSidebarMainLayout(node, context, classes);
  }

  const childrenHTML = (node.children || []).map((child: any) => renderNode(child, context)).join('\n  ');

  return `<div class="${classes}">
  ${childrenHTML}
</div>`;
}

function renderAlertContainer(node: any, context: RenderContext, classes: string, nodeClasses: string[]): string {
  const { classPrefix: prefix } = context;
  const variantClass = nodeClasses.find((c: string) =>
    c === 'success' || c === 'info' || c === 'warning' || c === 'error',
  );
  const role = 'alert';
  const variantAttr = variantClass ? ` data-variant="${escapeHtml(variantClass)}"` : '';
  const children: any[] = node.children || [];

  // Opener-line title: first child is a paragraph AND there are siblings; treat
  // the paragraph's text as a bolded title and the rest as body. With only one
  // paragraph child the whole thing is body (preserves the existing single-line
  // ::: alert Text body pattern). Title text comes from either the parser-set
  // `content` field or, when the paragraph only carries `children` (the path
  // taken by the remark-containers plugin's inline opener), from the joined
  // text-node values inside the children.
  let title: string | null = null;
  let bodyChildren: any[] = children;
  if (children.length > 1) {
    const first = children[0];
    if (first.type === 'paragraph') {
      const fromContent = typeof first.content === 'string' ? first.content : null;
      const fromChildren = Array.isArray(first.children)
        ? first.children.map((c: any) => (c.type === 'text' ? c.value ?? '' : '')).join('')
        : '';
      const titleText = fromContent ?? (fromChildren.length > 0 ? fromChildren : null);
      if (titleText !== null) {
        title = titleText;
        bodyChildren = children.slice(1);
      }
    }
  }
  const bodyHTML = bodyChildren.map((child: any) => renderNode(child, context)).join('\n  ');
  const titleHTML = title !== null
    ? `  <p class="${prefix}alert-title">${escapeHtml(title)}</p>\n`
    : '';
  return `<div class="${classes}" role="${role}"${variantAttr}>\n${titleHTML}  ${bodyHTML}\n</div>`;
}

function renderSidebarMainLayout(node: any, context: RenderContext, classes: string): string {
  const { classPrefix: prefix } = context;
  const children: any[] = node.children || [];

  const sections: { name: string; nodes: any[] }[] = [];
  let current: { name: string; nodes: any[] } | null = null;

  for (const child of children) {
    if (
      (child.type === 'container' && (child.containerType === 'sidebar' || child.containerType === 'main')) ||
      child.type === 'sidebar'
    ) {
      if (current) sections.push(current);
      const name = child.type === 'sidebar' ? 'sidebar' : child.containerType;
      sections.push({ name, nodes: child.children || [] });
      current = null;
    } else {
      const childClasses: string[] = child.props?.classes || [];
      if (child.type === 'heading' && (childClasses.includes('sidebar') || childClasses.includes('main'))) {
        if (current) sections.push(current);
        current = { name: childClasses.includes('sidebar') ? 'sidebar' : 'main', nodes: [] };
      } else if (current) {
        current.nodes.push(child);
      }
    }
  }
  if (current) sections.push(current);

  const sectionsHTML = sections.map((s) => {
    const contentHTML = s.nodes.map((child: any) => renderNode(child, context)).join('\n    ');
    return `  <div class="${prefix}layout-${s.name}">
    ${contentHTML}
  </div>`;
  }).join('\n');

  return `<div class="${classes}">
${sectionsHTML}
</div>`;
}

function renderNav(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'nav', node.props);
  const childrenHTML = (node.children || []).map((child: any) => renderNode(child, context)).join('\n    ');

  return `<nav class="${classes}">
  <div class="${prefix}nav-content">
    ${childrenHTML}
  </div>
</nav>`;
}

function renderNavItem(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const href = node.href || '#';

  const contentHTML = node.children
    ? node.children.map((child: any) => renderNode(child, context)).join('')
    : escapeHtml(node.content);

  if (node.props?.variant === 'primary') {
    const classes = `${buildClasses(prefix, 'button', node.props)} ${prefix}button-primary`;
    return `<a href="${href}" class="${classes.trim()}" style="text-decoration:none;color:inherit;">${contentHTML}</a>`;
  }

  const classes = buildClasses(prefix, 'nav-item', node.props);
  return `<a href="${href}" class="${classes}">${contentHTML}</a>`;
}

function renderBreadcrumbs(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const items: any[] = node.children || [];
  const crumbsHTML = items.map((crumb: any, i: number) => {
    const isLast = i === items.length - 1;
    const label = escapeHtml(crumb.content || '');
    return isLast
      ? `<span class="${prefix}breadcrumb-item ${prefix}breadcrumb-current" aria-current="page">${label}</span>`
      : `<span class="${prefix}breadcrumb-item"><a href="#">${label}</a></span><span class="${prefix}breadcrumb-sep" aria-hidden="true">›</span>`;
  }).join('');
  return `<nav class="${prefix}breadcrumbs" aria-label="breadcrumb">${crumbsHTML}</nav>`;
}

function renderBrand(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'brand', node.props);
  const childrenHTML = (node.children || []).map((child: any) => renderNode(child, context)).join('');

  return `<div class="${classes}">${childrenHTML}</div>`;
}

function renderGrid(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'grid', node.props);
  const columns = node.columns || 3;
  const gridClass = `${classes} ${prefix}grid-${columns}`;
  const isCard = !!node.props?.card;
  const childrenHTML = (node.children || []).map((child: any) => renderGridItem(child, context, isCard)).join('\n  ');

  return `<div class="${gridClass}" style="--grid-columns: ${columns}">
  ${childrenHTML}
</div>`;
}

function renderGridItem(node: any, context: RenderContext, isCard = false): string {
  const { classPrefix: prefix } = context;
  const extraClasses = isCard ? [...(node.props?.classes || []), 'grid-item-card'] : (node.props?.classes || []);
  const itemProps = { ...node.props, classes: extraClasses };
  const classes = buildClasses(prefix, 'grid-item', itemProps);
  const childrenHTML = (node.children || []).map((child: any) => renderNode(child, context)).join('\n    ');

  return `<div class="${classes}">
    ${childrenHTML}
  </div>`;
}

function renderRow(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'row', node.props);
  const childrenHTML = (node.children || []).map((child: any) => renderGridItem(child, context)).join('\n  ');

  return `<div class="${classes}">
  ${childrenHTML}
</div>`;
}

function renderHeading(node: any, context: RenderContext): string {
  if (!node.content && !node.children?.length) return '';

  const { classPrefix: prefix } = context;
  const level = node.level || 1;
  const classes = buildClasses(prefix, `h${level}`, node.props);
  const content = node.content || '';

  const childrenHTML = node.children
    ? node.children.map((child: any) => renderNode(child, context)).join('')
    : escapeHtml(content);

  return `<h${level} class="${classes}">${childrenHTML}</h${level}>`;
}

function renderParagraph(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'paragraph', node.props);

  let childrenHTML: string;
  if (node.children) {
    childrenHTML = node.children.map((child: any) => renderNode(child, context)).join('');
  } else if (node.content) {
    // Check if content contains HTML tags (rich content)
    const hasHtmlTags = /<[^>]+>/.test(node.content);
    childrenHTML = hasHtmlTags ? node.content : escapeHtml(node.content);
  } else {
    childrenHTML = '';
  }

  return `<p class="${classes}">${childrenHTML}</p>`;
}

function renderText(node: any, _context: RenderContext): string {
  const content = node.content || '';
  // Check if content contains HTML tags (rich content)
  const hasHtmlTags = /<[^>]+>/.test(content);
  return hasHtmlTags ? content : escapeHtml(content);
}

function renderImage(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'image', node.props);
  const src = node.src || '';
  const alt = node.alt || '';
  const width = node.props.width ? ` width="${node.props.width}"` : '';
  const height = node.props.height ? ` height="${node.props.height}"` : '';

  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" class="${classes}"${width}${height} />`;
}

function renderLink(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'link', node.props);
  const href = node.href || '#';
  const title = node.title ? ` title="${escapeHtml(node.title)}"` : '';

  const childrenHTML = node.children
    ? node.children.map((child: any) => renderNode(child, context)).join('')
    : escapeHtml(node.content || '');

  return `<a href="${escapeHtml(href)}" class="${classes}"${title}>${childrenHTML}</a>`;
}

function renderList(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'list', node.props);
  const tag = node.ordered ? 'ol' : 'ul';
  const childrenHTML = (node.children || []).map((child: any) => renderNode(child, context)).join('\n  ');

  return `<${tag} class="${classes}">
  ${childrenHTML}
</${tag}>`;
}

function renderListItem(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'list-item', node.props);

  // Handle both content and children (for nested lists)
  let html = '';

  // Add the immediate text content if present
  if (node.content) {
    html = escapeHtml(node.content);
  }

  // Add children (like nested lists or icons)
  if (node.children) {
    const childrenHTML = node.children.map((child: any) => renderNode(child, context)).join('');
    html += childrenHTML;
  }

  return `<li class="${classes}">${html}</li>`;
}

function renderTable(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'table', node.props);

  // Separate header from rows
  const headerNode = node.children?.find((child: any) => child.type === 'table-header');
  const rowNodes = node.children?.filter((child: any) => child.type === 'table-row') || [];

  const headerHTML = headerNode ? renderNode(headerNode, context) : '';
  const rowsHTML = rowNodes.map((child: any) => renderNode(child, context)).join('\n    ');
  const bodyHTML = rowsHTML ? `\n  <tbody>\n    ${rowsHTML}\n  </tbody>` : '';

  return `<table class="${classes}">
  ${headerHTML}${bodyHTML}
</table>`;
}

function renderTableHeader(node: any, context: RenderContext): string {
  const cellsHTML = (node.children || []).map((child: any) => renderNode(child, context)).join('\n    ');
  return `<thead>
    <tr>
      ${cellsHTML}
    </tr>
  </thead>`;
}

function renderTableRow(node: any, context: RenderContext): string {
  const cellsHTML = (node.children || []).map((child: any) => renderNode(child, context)).join('\n    ');
  return `<tr>
    ${cellsHTML}
  </tr>`;
}

function renderTableCell(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const tag = node.header ? 'th' : 'td';
  const align = node.align || 'left';
  const classes = buildClasses(prefix, `table-cell ${prefix}align-${align}`, {});

  // Use children if available, otherwise use content
  const contentHTML = node.children && node.children.length > 0
    ? node.children.map((child: any) => renderNode(child, context)).join('')
    : escapeHtml(node.content || '');

  return `<${tag} class="${classes}">${contentHTML}</${tag}>`;
}

function renderBlockquote(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'blockquote', node.props);
  const childrenHTML = (node.children || []).map((child: any) => renderNode(child, context)).join('\n  ');

  return `<blockquote class="${classes}">
  ${childrenHTML}
</blockquote>`;
}

function renderCode(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const inline = node.inline !== false;

  if (inline) {
    const classes = buildClasses(prefix, 'code-inline', {});
    return `<code class="${classes}">${escapeHtml(node.value)}</code>`;
  } else {
    const classes = buildClasses(prefix, 'code-block', {});
    const lang = node.lang ? ` data-lang="${escapeHtml(node.lang)}"` : '';
    return `<pre class="${classes}"><code${lang}>${escapeHtml(node.value)}</code></pre>`;
  }
}

function renderSeparator(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'separator', node.props);

  return `<hr class="${classes}" />`;
}

function renderTabs(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'tabs', node.props);
  const tabs: any[] = node.children || [];

  const headers = tabs.map((tab: any, i: number) => {
    const activeClass = tab.active ? ` ${prefix}active` : '';
    return `<button type="button" role="tab" class="${prefix}tab-header${activeClass}" data-wmd-tab="${i}">${escapeHtml(tab.label || '')}</button>`;
  }).join('');

  const panels = tabs.map((tab: any, i: number) => {
    const panelChildren = (tab.children || []).map((c: any) => renderNode(c, context)).join('\n    ');
    const hidden = tab.active ? '' : ' hidden';
    return `<div class="${prefix}tab-panel" role="tabpanel" data-wmd-tab-panel="${i}"${hidden}>
    ${panelChildren}
  </div>`;
  }).join('\n  ');

  return `<div class="${classes}" data-wmd-tabs>
  <div class="${prefix}tab-headers" role="tablist">${headers}</div>
  <div class="${prefix}tab-panels">
  ${panels}
  </div>
</div>${getTabsScript(prefix)}`;
}

function renderTab(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const hidden = node.active ? '' : ' hidden';
  const childrenHTML = (node.children || []).map((c: any) => renderNode(c, context)).join('');
  return `<div class="${prefix}tab-panel" role="tabpanel"${hidden}>${childrenHTML}</div>`;
}

function getTabsScript(prefix: string): string {
  return `<script>(function(){if(window.__wmdTabsInit)return;window.__wmdTabsInit=true;document.addEventListener('click',function(e){var btn=e.target.closest('.${prefix}tab-header');if(!btn)return;var root=btn.closest('[data-wmd-tabs]');if(!root)return;var idx=btn.getAttribute('data-wmd-tab');root.querySelectorAll('.${prefix}tab-header').forEach(function(b){b.classList.toggle('${prefix}active',b.getAttribute('data-wmd-tab')===idx);});root.querySelectorAll('[data-wmd-tab-panel]').forEach(function(p){if(p.getAttribute('data-wmd-tab-panel')===idx){p.removeAttribute('hidden');}else{p.setAttribute('hidden','');}});});})();</script>`;
}

/**
 * Build CSS classes string from prefix, base class, and props
 */
function buildClasses(prefix: string, baseClass: string, props: any): string {
  const classes = [`${prefix}${baseClass}`];

  // Add custom classes
  if (props.classes && Array.isArray(props.classes)) {
    props.classes.forEach((cls: string) => {
      classes.push(`${prefix}${cls}`);
    });
  }

  // Add variant class
  if (props.variant) {
    classes.push(`${prefix}${baseClass}-${props.variant}`);
  }

  // Add state class
  if (props.state) {
    classes.push(`${prefix}state-${props.state}`);
  }

  return classes.join(' ');
}

function renderDemo(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const previewHTML = (node.children || []).map((child: any) => renderNode(child, context)).join('\n');

  // coss demos show generated code unless {.show-source} is present;
  // legacy styles always show the normalized raw source.
  const showRaw =
    context.style !== 'coss' ||
    node.props?.classes?.includes('show-source') === true;

  let codeSource: string;
  if (showRaw) {
    codeSource = node.raw || '';
  } else {
    try {
      codeSource = generateCode(node.children || [], { format: context.codegen });
    } catch {
      // Unsupported codegen node (or other codegen failure): degrade to raw source.
      codeSource = node.raw || '';
    }
  }

  const codeHTML = escapeHtml(codeSource);
  return `<div class="${prefix}demo">
  <div class="${prefix}demo-preview">${previewHTML}</div>
  <div class="${prefix}demo-code">
    <div class="${prefix}demo-code-toolbar">
      <button class="${prefix}demo-copy" onclick="(function(btn){var code=btn.closest('.${prefix}demo-code').querySelector('code');navigator.clipboard.writeText(code.textContent).then(function(){btn.textContent='Copied!';setTimeout(function(){btn.textContent='Copy'},1500)})})(this)">Copy</button>
    </div>
    <pre><code>${codeHTML}</code></pre>
  </div>
</div>`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  if (!text) return '';

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// Phase 3 Task 2: feedback family
// ============================================================================

function renderToast(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const toastType: string | undefined = node.props?.toastType;
  const variantClass = toastType && toastType !== 'loading' ? toastType : undefined;
  const extraClasses = (node.props?.classes || []).filter(
    (c: string) => c !== variantClass,
  );
  const cls = buildClasses(prefix, 'toast', { ...node.props, classes: extraClasses });
  const variantHTML = variantClass
    ? ` data-variant="${escapeHtml(variantClass)}"`
    : '';
  const childrenHTML = (node.children || []).map((child: any) => renderNode(child, context)).join('\n  ');
  return `<div class="${cls}" role="status"${variantHTML}>\n  ${childrenHTML}\n</div>`;
}

function renderSkeleton(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const cls = buildClasses(prefix, 'skeleton', node.props);
  const width = node.props?.width;
  const height = node.props?.height;
  const styleAttr =
    width !== undefined || height !== undefined
      ? ` style="${[
          width !== undefined ? `width:${typeof width === 'number' ? `${width}px` : width}` : '',
          height !== undefined ? `height:${typeof height === 'number' ? `${height}px` : height}` : '',
        ]
          .filter(Boolean)
          .join(';')}"`
      : '';
  return `<div class="${cls}"${styleAttr}></div>`;
}

function renderSpinner(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const size: string = node.props?.size || 'medium';
  const sizeClass =
    size === 'small' ? 'spinner-sm' : size === 'large' ? 'spinner-lg' : 'spinner-md';
  const cls = buildClasses(prefix, 'spinner', { ...node.props, classes: [sizeClass] });
  return `<div class="${cls}" role="status" aria-label="Loading"></div>`;
}

function renderKbd(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const cls = buildClasses(prefix, 'kbd', node.props);
  return `<kbd class="${cls}">${escapeHtml(node.content ?? '')}</kbd>`;
}

function renderProgress(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const cls = buildClasses(prefix, 'progress', node.props);
  const value = Math.max(0, Math.min(100, Number(node.value ?? 0)));
  const indeterminate: boolean = !!node.indeterminate;
  const labelText: string | undefined = node.props?.label;
  const labelHTML = labelText
    ? `  <p class="${prefix}progress-label">${escapeHtml(labelText)}</p>\n`
    : '';
  const trackWidth = indeterminate ? 100 : value;
  const indicatorStyle = ` style="width:${trackWidth}%"`;
  const trackHTML = `  <div class="${prefix}progress-track">
    <div class="${prefix}progress-indicator"${indicatorStyle}></div>
  </div>`;
  const valueHTML = !indeterminate
    ? `\n  <p class="${prefix}progress-value">${value}%</p>`
    : '';
  return `<div class="${cls}" role="progressbar" aria-valuenow="${value}"${indeterminate ? '' : ` aria-valuemin="0" aria-valuemax="100"`}${indeterminate ? ' data-indeterminate="true"' : ''}>
${labelHTML}${trackHTML}${valueHTML}
</div>`;
}

function renderMeter(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const cls = buildClasses(prefix, 'meter', node.props);
  const value = Number(node.value ?? 0);
  const min = Number(node.min ?? 0);
  const max = Number(node.max ?? 100);
  const range = max - min || 1;
  const pct = Math.max(0, Math.min(100, ((value - min) / range) * 100));
  const labelText: string | undefined = node.props?.label;
  const labelHTML = labelText
    ? `  <p class="${prefix}meter-label">${escapeHtml(labelText)}</p>\n`
    : '';
  const indicatorStyle = ` style="width:${pct}%"`;
  const trackHTML = `  <div class="${prefix}meter-track">
    <div class="${prefix}meter-indicator"${indicatorStyle}></div>
  </div>`;
  const valueHTML = `\n  <p class="${prefix}meter-value">${value} / ${max}</p>`;
  return `<div class="${cls}" role="meter" aria-valuenow="${value}" aria-valuemin="${min}" aria-valuemax="${max}">
${labelHTML}${trackHTML}${valueHTML}
</div>`;
}

// ============================================================================
// Phase 3 Task 3: overlay family
// ============================================================================

function overlayShell(
  context: RenderContext,
  kind: string,
  props: any,
  inner: string,
  role = 'dialog',
  ariaLabel?: string,
  dataAttrs = '',
): string {
  const { classPrefix: prefix } = context;
  const cleanedProps = { ...props };
  delete cleanedProps.title;
  delete cleanedProps.description;
  delete cleanedProps.showClose;
  delete cleanedProps.cancelText;
  delete cleanedProps.actionText;
  delete cleanedProps.actionVariant;
  delete cleanedProps.content;
  delete cleanedProps.trigger;
  const cls = buildClasses(prefix, kind, cleanedProps);
  const title = typeof props.title === 'string' ? props.title : undefined;
  const desc = typeof props.description === 'string' ? props.description : undefined;
  const showClose = props.showClose !== false;
  const titleHTML = title
    ? `  <h2 class="${prefix}${kind}-title">${escapeHtml(title)}</h2>\n`
    : '';
  const descHTML = desc
    ? `  <p class="${prefix}${kind}-description">${escapeHtml(desc)}</p>\n`
    : '';
  const closeHTML = showClose && kind === 'dialog'
    ? `  <button type="button" class="${prefix}${kind}-close" aria-label="Close">×</button>\n`
    : '';
  const ariaLabelAttr = ariaLabel ? ` aria-label="${escapeHtml(ariaLabel)}"` : '';
  return `<div class="${cls}" role="${role}"${ariaLabelAttr}${dataAttrs}>
${titleHTML}${descHTML}${inner}${closeHTML}</div>`;
}

function renderDialog(node: any, context: RenderContext): string {
  const inner = (node.children || []).map((c: any) => renderNode(c, context)).join('\n  ');
  return overlayShell(context, 'dialog', node.props || {}, inner, 'dialog');
}

function renderAlertDialog(node: any, context: RenderContext): string {
  const inner = (node.children || []).map((c: any) => renderNode(c, context)).join('\n  ');
  const actionVariant: string = node.props?.actionVariant || 'danger';
  const actionText: string = node.props?.actionText || 'Confirm';
  const cancelText: string = node.props?.cancelText || 'Cancel';
  const actionsHTML = `\n  <div class="${context.classPrefix}alert-dialog-actions">
    <button type="button" class="${context.classPrefix}button ${context.classPrefix}${actionVariant}">${escapeHtml(cancelText)}</button>
    <button type="button" class="${context.classPrefix}button ${context.classPrefix}${actionVariant === 'danger' ? 'primary' : 'danger'}">${escapeHtml(actionText)}</button>
  </div>`;
  return overlayShell(context, 'alert-dialog', node.props || {}, inner + actionsHTML, 'alertdialog');
}

function renderSheet(node: any, context: RenderContext): string {
  const inner = (node.children || []).map((c: any) => renderNode(c, context)).join('\n  ');
  const side = node.side || 'right';
  return overlayShell(
    context,
    'sheet',
    node.props || {},
    inner,
    'dialog',
    undefined,
    ` data-side="${escapeHtml(side)}"`,
  );
}

function renderDrawer(node: any, context: RenderContext): string {
  const inner = (node.children || []).map((c: any) => renderNode(c, context)).join('\n  ');
  const side = node.side || 'left';
  return overlayShell(
    context,
    'drawer',
    node.props || {},
    inner,
    'dialog',
    undefined,
    ` data-side="${escapeHtml(side)}"`,
  );
}

function renderPopover(node: any, context: RenderContext): string {
  const inner = (node.children || []).map((c: any) => renderNode(c, context)).join('\n  ');
  return overlayShell(context, 'popover', node.props || {}, inner, 'dialog');
}

function renderTooltip(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const cleanedProps = { ...(node.props || {}) };
  delete cleanedProps.content;
  delete cleanedProps.side;
  const cls = buildClasses(prefix, 'tooltip', cleanedProps);
  const content: string = node.props?.content || '';
  const side: string = node.props?.side || 'top';
  const childHTML = (node.children || []).map((c: any) => renderNode(c, context)).join('\n  ');
  const inner = childHTML || content;
  return `<span class="${cls}" role="tooltip" data-side="${escapeHtml(side)}">${escapeHtml(inner)}</span>`;
}

function renderPreviewCard(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const cls = buildClasses(prefix, 'preview-card', node.props || {});
  const childrenHTML = (node.children || []).map((c: any) => renderNode(c, context)).join('\n  ');
  const href: string | undefined = node.props?.href;
  const wrap = (inner: string) =>
    href ? `<a class="${prefix}preview-card-link" href="${escapeHtml(href)}">${inner}</a>` : inner;
  return wrap(`<div class="${cls}">\n  ${childrenHTML}\n</div>`);
}

// ============================================================================
// Phase 3 Task 4: navigation family
// ============================================================================

function renderPagination(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const label: string = node.props?.label || 'pagination';
  // Children arrive as a button-group container (from bracket parsing) or as
  // loose nodes; flatten either way and render each as a page link.
  const raw: any[] = node.children || [];
  const items: any[] = [];
  for (const child of raw) {
    if (child.type === 'container' && child.containerType === 'button-group') {
      items.push(...(child.children || []));
    } else {
      items.push(child);
    }
  }
  const linksHTML = items
    .filter((item) => item.type === 'button' || item.type === 'nav-item' || item.type === 'text')
    .map((item) => {
      const isCurrent = (item.props?.classes || []).includes('active') ||
        item.props?.variant === 'primary';
      const text = item.content ?? '';
      const linkCls = `${prefix}pagination-link${isCurrent ? ` ${prefix}pagination-active` : ''}`;
      const currentAttr = isCurrent ? ' aria-current="page"' : '';
      return `      <li class="${prefix}pagination-item"><a class="${linkCls}" href="#"${currentAttr}>${escapeHtml(text)}</a></li>`;
    })
    .join('\n');
  return `<nav class="${prefix}pagination" aria-label="${escapeHtml(label)}" role="navigation">
    <ul class="${prefix}pagination-content">
${linksHTML}
    </ul>
</nav>`;
}

function renderSegmentedControl(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const raw: any[] = node.children || [];
  const items: any[] = [];
  for (const child of raw) {
    if (child.type === 'container' && child.containerType === 'button-group') {
      items.push(...(child.children || []));
    } else {
      items.push(child);
    }
  }
  const buttonsHTML = items
    .filter((item) => item.type === 'button' || item.type === 'nav-item')
    .map((item) => {
      const isActive = (item.props?.classes || []).includes('active') ||
        item.props?.variant === 'primary';
      const text = item.content ?? '';
      const btnCls = `${prefix}segmented-item${isActive ? ` ${prefix}segmented-active` : ''}`;
      const activeAttr = isActive ? ' aria-pressed="true"' : ' aria-pressed="false"';
      return `  <button type="button" class="${btnCls}"${activeAttr}>${escapeHtml(text)}</button>`;
    })
    .join('\n');
  return `<div class="${prefix}segmented-control" role="group">\n${buttonsHTML}\n</div>`;
}

function renderScrollArea(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const cleaned = { ...(node.props || {}) };
  delete cleaned.maxHeight;
  const cls = buildClasses(prefix, 'scroll-area', cleaned);
  const maxHeight = node.props?.maxHeight;
  const styleAttr = maxHeight !== undefined
    ? ` style="max-height:${typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight}"`
    : '';
  const childrenHTML = (node.children || []).map((c: any) => renderNode(c, context)).join('\n    ');
  return `<div class="${cls}"${styleAttr}>\n  <div class="${prefix}scroll-area-viewport">\n    ${childrenHTML}\n  </div>\n</div>`;
}

function renderSidebarNav(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const cleaned = { ...(node.props || {}) };
  delete cleaned.title;
  const cls = buildClasses(prefix, 'sidebar-nav', cleaned);
  const title = node.props?.title;
  const titleHTML = title ? `  <div class="${prefix}sidebar-header">${escapeHtml(title)}</div>\n` : '';
  // Lists become nav menus; other children render as-is.
  const childrenHTML = (node.children || []).map((c: any) => {
    if (c.type === 'list') {
      const itemsHTML = (c.children || [])
        .map((li: any) => {
          const liClasses: string[] = li.props?.classes || [];
          const isActive = liClasses.includes('active');
          const itemCls = `${prefix}sidebar-item${isActive ? ` ${prefix}sidebar-item-active` : ''}`;
          const text = (li.content ?? '').replace(/\s*:::\s*$/, '').trim();
          return `    <a class="${itemCls}" href="#">${escapeHtml(text)}</a>`;
        })
        .join('\n');
      return `  <nav class="${prefix}sidebar-menu">\n${itemsHTML}\n  </nav>`;
    }
    return renderNode(c, context)
      .split('\n')
      .map((l: string) => (l ? `  ${l}` : l))
      .join('\n');
  }).join('\n');
  return `<aside class="${cls}">\n${titleHTML}${childrenHTML}\n</aside>`;
}

function renderMenubar(node: any, context: RenderContext): string {
  const { classPrefix: prefix } = context;
  const cls = buildClasses(prefix, 'menubar', node.props || {});
  const childrenHTML = (node.children || []).map((c: any) => renderNode(c, context)).join('\n  ');
  return `<div class="${cls}" role="menubar">\n  ${childrenHTML}\n</div>`;
}
