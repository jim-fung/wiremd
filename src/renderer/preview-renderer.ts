/**
 * Preview Fragment Renderer for wiremd ASTs
 *
 * Emits an embeddable HTML fragment plus scoped CSS for one style under the
 * embed preview policy. This is deliberately a separate emitter from
 * `html-renderer.ts` — sharing the AST is the reuse boundary; sharing the
 * emitter is not. The standalone renderer's script emissions (tabs), inline
 * event handlers (demo copy), raw-HTML text passthrough, external font
 * imports, and unsanitized URL schemes are load-bearing for full documents
 * and forbidden here.
 *
 * Policy enforced by construction (each substitution appends a diagnostic):
 *   - no `<script>`, no `on*=` handler attributes, no timers/clipboard access
 *   - tabs render as statically stacked panels (all visible, in order)
 *   - all text is escaped; authored markup appears as visible text
 *   - URL schemes allowlist: `https:`, `mailto:`, `#fragment`, `/root-relative`
 *   - remote images load over `https:` only; relative sources are placeholders
 *   - CSS carries no `@import`; external fonts fall back to local stacks
 *   - every class and selector carries the caller's class prefix
 *
 * Copyright (c) 2025 wiremd
 * Licensed under MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import type { DocumentNode, WiremdNode } from '../types.js';
import type { WiremdDiagnostic } from '../diagnostics.js';
import { getStyleCSS } from './styles.js';

export interface PreviewRenderContext {
  style: string;
  classPrefix: string;
  diagnostics: WiremdDiagnostic[];
  /** Per-render counter backing deterministic radio-group names. */
  radioGroupCounter: number;
}

/** Public preview payload: body-only markup + CSS for exactly one style. */
export interface PreviewResult {
  html: string;
  css: string;
  classPrefix: string;
  diagnostics: WiremdDiagnostic[];
}

export interface PreviewRenderOptions {
  style?: 'sketch' | 'clean' | 'wireframe' | 'none' | 'tailwind' | 'material' | 'brutal';
  classPrefix: string;
}

/**
 * Render a wiremd AST as an embeddable preview fragment.
 *
 * Markup and CSS are generated from ONE walk of the AST and must be injected
 * together or not at all — mixing stale CSS under fresh markup (or vice
 * versa) is the host bug this atomic contract exists to make impossible.
 */
export function renderPreview(
  documentNode: DocumentNode,
  options: PreviewRenderOptions
): PreviewResult {
  const style = options.style ?? 'sketch';
  const classPrefix = options.classPrefix;
  const diagnostics: WiremdDiagnostic[] = [];
  const context: PreviewRenderContext = {
    style,
    classPrefix,
    diagnostics,
    radioGroupCounter: 0,
  };

  const childrenHTML = documentNode.children
    .map((child) => renderPreviewNode(child, context))
    .join('\n');

  // Fixed light canvas: wiremd styles are light-designed; embedding hosts may
  // run dark, so the root pins its own color-scheme rather than inheriting.
  const html = `<div class="${classPrefix}root ${classPrefix}${style}" style="color-scheme: light">
${childrenHTML}
</div>`;

  let css = getStyleCSS(style, classPrefix);
  if (/<\/?(script|iframe)/i.test(css)) {
    // Defensive: theme CSS is static authored data, but policy asserts
    // element-emission never appears in the payload regardless of source.
    diagnostics.push({
      severity: 'error',
      code: 'wmd-preview-render-failed',
      message: 'Style CSS unexpectedly contained scriptable elements.',
      source: 'renderer',
    });
  }
  if (/^[ \t]*@import/m.test(css)) {
    diagnostics.push({
      severity: 'info',
      code: 'wmd-font-substituted',
      message: 'External font imports are disabled in previews; local fallback fonts are used.',
      source: 'renderer',
    });
  }
  css = preparePreviewCss(css, classPrefix);

  return { html, css, classPrefix, diagnostics };
}

/**
 * Rewrite one style's theme CSS for embedding under the prefix contract:
 *
 *   - external `@import` statements are removed (font substitution);
 *   - `!important` escalation is neutralized (no fights with host styles);
 *   - the universal selector is scoped under the root wrapper;
 *   - bare `body` rules retarget the root wrapper;
 *   - `body.{prefix}…` compound selectors become element-neutral
 *     `div.{prefix}…`.
 *
 * Everything else already carries the caller's prefix by construction.
 */
function preparePreviewCss(css: string, classPrefix: string): string {
  let out = css.replace(/^[ \t]*@import[^\n]*\n?/gm, '');
  out = out.replace(/\s*!important/gi, '');
  out = out.replace(/^([ \t]*)\*[ \t]*\{/gm, `$1.${classPrefix}root * {`);
  out = out.replace(/^([ \t]*)body[ \t]*\{/gm, `$1.${classPrefix}root {`);
  out = out.replace(new RegExp(`body\\.${classPrefix}`, 'g'), `div.${classPrefix}`);
  return out;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildClasses(prefix: string, baseClass: string, props: any): string {
  const classes = [`${prefix}${baseClass}`];
  if (props?.classes && Array.isArray(props.classes)) {
    props.classes.forEach((cls: string) => {
      classes.push(`${prefix}${cls}`);
    });
  }
  if (props?.variant) {
    classes.push(`${prefix}${baseClass}-${props.variant}`);
  }
  if (props?.state) {
    classes.push(`${prefix}state-${props.state}`);
  }
  return classes.join(' ');
}

/**
 * Classify a URL against the preview scheme allowlist.
 * Allowed: `https:…`, `mailto:…`, `#fragment`, `/root-relative`.
 * Returns the safe href to emit ('#' when blocked).
 */
const SAFE_SCHEMES = new Set(['https:', 'mailto:']);

function safeUrl(
  rawUrl: string | undefined,
  context: PreviewRenderContext,
  kind: 'link' | 'image'
): { url: string; blocked?: boolean; relativeImage?: boolean } {
  const raw = (rawUrl ?? '').trim();
  if (raw === '') return { url: '#' };

  if (raw.startsWith('#')) return { url: raw };
  if (raw.startsWith('/') && !raw.startsWith('//')) return { url: raw };

  const schemeMatch = raw.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (!schemeMatch) {
    // Scheme-less reference: page-relative. Links resolve inside the frame,
    // which is harmless; images cannot resolve without a base URL contract.
    if (kind === 'image') {
      context.diagnostics.push({
        severity: 'warning',
        code: 'wmd-image-relative',
        message: 'Relative image source cannot be resolved inside an embedded preview; a placeholder is shown.',
        source: 'renderer',
      });
      return { url: '', relativeImage: true };
    }
    return { url: raw };
  }

  const scheme = schemeMatch[1].toLowerCase();
  if (SAFE_SCHEMES.has(`${scheme}:`)) {
    // `http:` never reaches here — it is not in the allowlist.
    return { url: raw };
  }

  context.diagnostics.push({
    severity: 'warning',
    code: 'wmd-url-blocked',
    message: `Blocked "${scheme}:" URL in preview content.`,
    source: 'renderer',
  });
  return { url: '#', blocked: true };
}

/** Render a wiremd AST node to preview-safe HTML. */
export function renderPreviewNode(node: WiremdNode, context: PreviewRenderContext): string {
  if (node == null) return '';
  switch (node.type) {
    case 'button': return renderButton(node as any, context);
    case 'input': return renderInput(node as any, context);
    case 'textarea': return renderTextarea(node as any, context);
    case 'select': return renderSelect(node as any, context);
    case 'checkbox': return renderCheckbox(node as any, context);
    case 'radio': return renderRadio(node as any, context);
    case 'radio-group': return renderRadioGroup(node as any, context);
    case 'icon': return renderIcon(node as any, context);
    case 'badge': return renderBadge(node as any, context);
    case 'container': return renderContainer(node as any, context);
    case 'nav': return renderNav(node as any, context);
    case 'nav-item': return renderNavItem(node as any, context);
    case 'brand': return renderBrand(node as any, context);
    case 'grid': return renderGrid(node as any, context);
    case 'grid-item': return renderGridItem(node as any, context);
    case 'row': return renderRow(node as any, context);
    case 'heading': return renderHeading(node as any, context);
    case 'paragraph': return renderParagraph(node as any, context);
    case 'text': return renderText(node as any, context);
    case 'image': return renderImage(node as any, context);
    case 'link': return renderLink(node as any, context);
    case 'list': return renderList(node as any, context);
    case 'list-item': return renderListItem(node as any, context);
    case 'table': return renderTable(node as any, context);
    case 'table-header': return renderTableHeader(node as any, context);
    case 'table-row': return renderTableRow(node as any, context);
    case 'table-cell': return renderTableCell(node as any, context);
    case 'blockquote': return renderBlockquote(node as any, context);
    case 'code': return renderCode(node as any, context);
    case 'separator': return renderSeparator(node as any, context);
    case 'tabs': return renderTabs(node as any, context);
    case 'tab': return renderTab(node as any, context);
    case 'breadcrumbs': return renderBreadcrumbs(node as any, context);
    case 'demo': return renderDemo(node as any, context);
    default:
      return `<!-- Unknown node type: ${(node as any).type} -->`;
  }
}

function renderChildren(node: { children?: WiremdNode[] }, context: PreviewRenderContext): string {
  return (node.children ?? []).map((child) => renderPreviewNode(child, context)).join('\n');
}

function renderButton(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'button', node.props);
  const disabled = node.props.state === 'disabled' ? ' disabled' : '';
  const loading = node.props.state === 'loading' ? ` ${prefix}loading` : '';

  const contentHTML = node.children
    ? node.children.map((child: any) => renderPreviewNode(child, context)).join('')
    : escapeHtml(node.content);

  const hrefResult = safeUrl(node.href || node.props?.href, context, 'link');
  if (node.href || node.props?.href) {
    return `<a href="${escapeHtml(hrefResult.url)}" class="${classes}${loading}">${contentHTML}</a>`;
  }
  return `<button type="button" class="${classes}${loading}"${disabled}>${contentHTML}</button>`;
}

function renderBadge(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'badge', node.props);
  return `<span class="${classes}">${escapeHtml(node.content)}</span>`;
}

function renderInput(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'input', node.props);
  const type = node.props.inputType || node.props.type || 'text';
  const required = node.props.required ? ' required' : '';
  const disabled = node.props.disabled ? ' disabled' : '';
  const placeholder = node.props.placeholder ? ` placeholder="${escapeHtml(node.props.placeholder)}"` : '';
  const value = node.props.value ? ` value="${escapeHtml(node.props.value)}"` : '';
  const style = node.props.width ? ` style="width: ${Number(node.props.width) || 20}ch; max-width: ${Number(node.props.width) || 20}ch;"` : '';

  return `<input type="${escapeHtml(String(type))}" class="${classes}"${placeholder}${value}${required}${disabled}${style} readonly />`;
}

function renderTextarea(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'textarea', node.props);
  const rows = node.props.rows || 4;
  const required = node.props.required ? ' required' : '';
  const disabled = node.props.disabled ? ' disabled' : '';
  const placeholder = node.props.placeholder ? ` placeholder="${escapeHtml(node.props.placeholder)}"` : '';
  const value = node.props.value || '';

  return `<textarea class="${classes}" rows="${Number(rows) || 4}"${placeholder}${required}${disabled} readonly>${escapeHtml(value)}</textarea>`;
}

function renderSelect(node: any, context: PreviewRenderContext): string {
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

function renderCheckbox(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'checkbox', node.props);
  const checked = node.checked ? ' checked' : '';
  const disabled = node.props.disabled ? ' disabled' : '';
  const value = node.props.value ? ` value="${escapeHtml(node.props.value)}"` : '';

  let labelHTML = escapeHtml(node.label || '');
  let nestedHTML = '';

  if (node.children) {
    const inlineChildren: any[] = [];
    const nestedChildren: any[] = [];
    for (const child of node.children) {
      if (child.type === 'list') nestedChildren.push(child);
      else inlineChildren.push(child);
    }
    if (inlineChildren.length > 0) {
      labelHTML = inlineChildren.map((child: any) => renderPreviewNode(child, context)).join('');
    }
    if (nestedChildren.length > 0) {
      nestedHTML = nestedChildren.map((child: any) => renderPreviewNode(child, context)).join('');
    }
  }

  return `<label class="${classes}">
    <input type="checkbox"${checked}${disabled}${value} disabled />
    <span>${labelHTML}</span>
  </label>${nestedHTML}`;
}

function renderRadio(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'radio', node.props);
  const checked = node.selected ? ' checked' : '';
  const disabled = node.props.disabled ? ' disabled' : '';
  const name = node.props.name ? ` name="${escapeHtml(node.props.name)}"` : '';
  const value = node.props.value ? ` value="${escapeHtml(node.props.value)}"` : '';

  const labelHTML = escapeHtml(node.label);
  const childrenHTML = node.children
    ? node.children.map((child: any) => renderPreviewNode(child, context)).join('')
    : '';

  return `<label class="${classes}">
    <input type="radio"${checked}${disabled}${name}${value} disabled />
    <span>${labelHTML}</span>
  </label>${childrenHTML}`;
}

function renderRadioGroup(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const isInline = node.props?.inline;
  const classes = buildClasses(prefix, 'radio-group', node.props);
  const inlineClass = isInline ? ` ${prefix}radio-group-inline` : '';

  // Deterministic per-render group name (the standalone renderer uses
  // Math.random(), which would break byte-identical repeat renders).
  context.radioGroupCounter += 1;
  const groupName = `radio-preview-${context.radioGroupCounter}`;

  const radios = (node.children || []).map((child: any) => {
    if (child.type === 'radio') {
      const modifiedChild = { ...child, props: { ...child.props, name: groupName } };
      return renderPreviewNode(modifiedChild, context);
    }
    return renderPreviewNode(child, context);
  }).join('\n    ');

  return `<div class="${classes}${inlineClass}">
    ${radios}
</div>`;
}

function renderIcon(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'icon', node.props);
  const iconName = node.props.name || 'default';

  const iconMap: Record<string, string> = {
    'twitter': '𝕏', 'github': '⊙', 'linkedin': 'in', 'facebook': 'f',
    'instagram': '◉', 'youtube': '▶',
    'home': '🏠', 'user': '👤', 'settings': '⚙️', 'search': '🔍',
    'star': '⭐', 'heart': '❤️', 'mail': '✉️', 'phone': '📞',
    'calendar': '📅', 'clock': '🕐', 'location': '📍', 'link': '🔗',
    'download': '⬇️', 'upload': '⬆️', 'edit': '✏️', 'delete': '🗑️',
    'plus': '➕', 'minus': '➖', 'check': '✓', 'close': '✕',
    'menu': '☰', 'more': '⋯', 'info': 'ℹ️', 'warning': '⚠️',
    'error': '❌', 'success': '✅',
    'arrow-up': '↑', 'arrow-down': '↓', 'arrow-left': '←', 'arrow-right': '→',
    'chart': '📊', 'dollar': '$', 'euro': '€', 'pound': '£',
    'code': '</>', 'database': '🗄️', 'cloud': '☁️', 'wifi': '📶',
    'chat': '💬', 'video': '🎥', 'microphone': '🎤', 'bell': '🔔',
    'file': '📄', 'folder': '📁', 'image': '🖼️', 'document': '📃', 'pdf': '📑',
    'logo': '◈', 'brand': '◆',
    'rocket': '🚀', 'bulb': '💡', 'shield': '🛡️', 'lock': '🔒',
    'unlock': '🔓', 'key': '🔑', 'gift': '🎁', 'trophy': '🏆',
    'flag': '🚩', 'bookmark': '🔖', 'tag': '🏷️', 'cart': '🛒',
    'credit-card': '💳',
    'default': '●'
  };

  const iconContent = iconMap[iconName] || iconMap['default'];
  const socialIcons = ['twitter', 'github', 'linkedin', 'facebook', 'instagram', 'youtube'];
  if (socialIcons.includes(iconName)) {
    return `<span class="${classes}" data-icon="${escapeHtml(iconName)}" aria-label="${escapeHtml(iconName)}" style="font-family: monospace; font-weight: bold; font-style: normal;">${iconContent}</span>`;
  }
  return `<span class="${classes}" data-icon="${escapeHtml(iconName)}" aria-label="${escapeHtml(iconName)}">${iconContent}</span>`;
}

function renderContainer(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, `container-${node.containerType}`, node.props);

  const nodeClasses: string[] = node.props?.classes || [];
  if (node.containerType === 'layout' && nodeClasses.includes('sidebar-main')) {
    return renderSidebarMainLayout(node, context, classes);
  }

  const childrenHTML = renderChildren(node, context);
  return `<div class="${classes}">
  ${childrenHTML}
</div>`;
}

function renderSidebarMainLayout(node: any, context: PreviewRenderContext, classes: string): string {
  const { classPrefix: prefix } = context;
  const children: any[] = node.children || [];

  const sections: { name: string; nodes: any[] }[] = [];
  let current: { name: string; nodes: any[] } | null = null;

  for (const child of children) {
    if (child.type === 'container' && (child.containerType === 'sidebar' || child.containerType === 'main')) {
      if (current) sections.push(current);
      sections.push({ name: child.containerType, nodes: child.children || [] });
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
    const contentHTML = s.nodes.map((child) => renderPreviewNode(child, context)).join('\n    ');
    return `  <div class="${prefix}layout-${s.name}">
    ${contentHTML}
  </div>`;
  }).join('\n');

  return `<div class="${classes}">
${sectionsHTML}
</div>`;
}

function renderNav(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'nav', node.props);
  const childrenHTML = renderChildren(node, context);

  return `<nav class="${classes}">
  <div class="${prefix}nav-content">
    ${childrenHTML}
  </div>
</nav>`;
}

function renderNavItem(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;

  const contentHTML = node.children
    ? node.children.map((child: any) => renderPreviewNode(child, context)).join('')
    : escapeHtml(node.content);

  const hrefResult = safeUrl(node.href, context, 'link');

  if (node.props?.variant === 'primary') {
    const classes = `${buildClasses(prefix, 'button', node.props)} ${prefix}button-primary`;
    return `<a href="${escapeHtml(hrefResult.url)}" class="${classes.trim()}" style="text-decoration:none;color:inherit;">${contentHTML}</a>`;
  }

  const classes = buildClasses(prefix, 'nav-item', node.props);
  return `<a href="${escapeHtml(hrefResult.url)}" class="${classes}">${contentHTML}</a>`;
}

function renderBreadcrumbs(node: any, context: PreviewRenderContext): string {
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

function renderBrand(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'brand', node.props);
  const childrenHTML = renderChildren(node, context);
  return `<div class="${classes}">${childrenHTML}</div>`;
}

function renderGrid(node: any, context: PreviewRenderContext): string {
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

function renderGridItem(node: any, context: PreviewRenderContext, isCard = false): string {
  const { classPrefix: prefix } = context;
  const extraClasses = isCard ? [...(node.props?.classes || []), 'grid-item-card'] : (node.props?.classes || []);
  const itemProps = { ...node.props, classes: extraClasses };
  const classes = buildClasses(prefix, 'grid-item', itemProps);
  const childrenHTML = renderChildren(node, context);

  return `<div class="${classes}">
    ${childrenHTML}
  </div>`;
}

function renderRow(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'row', node.props);
  const childrenHTML = (node.children || []).map((child: any) => renderGridItem(child, context)).join('\n  ');

  return `<div class="${classes}">
  ${childrenHTML}
</div>`;
}

function renderHeading(node: any, context: PreviewRenderContext): string {
  if (!node.content && !node.children?.length) return '';

  const { classPrefix: prefix } = context;
  const level = Math.min(Math.max(Number(node.level) || 1, 1), 6);
  const classes = buildClasses(prefix, `h${level}`, node.props);
  const content = node.content || '';

  const childrenHTML = node.children
    ? node.children.map((child: any) => renderPreviewNode(child, context)).join('')
    : escapeHtml(content);

  return `<h${level} class="${classes}">${childrenHTML}</h${level}>`;
}

function renderParagraph(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'paragraph', node.props);

  let childrenHTML: string;
  if (node.children) {
    childrenHTML = node.children.map((child: any) => renderPreviewNode(child, context)).join('');
  } else if (node.content) {
    // Embed policy: rich-text markers produced by the parser (<strong>, <em>,
    // <code>, <a>) are rendered as markup ONLY when they came through the
    // parser's structured path — free-form author HTML-looking text is always
    // escaped so it appears as literal text instead of executing/structuring.
    childrenHTML = renderInlineRichText(node.content, context);
  } else {
    childrenHTML = '';
  }
  return `<p class="${classes}">${childrenHTML}</p>`;
}

/**
 * Render parser-generated inline rich-text (<strong>/<em>/<code>/<a>)
 * while escaping everything else. Unlike the standalone renderer's
 * "contains a tag ⇒ emit verbatim" passthrough, each tag here is matched
 * structurally and its inner text escaped; anything that does not parse
 * as one of the four known constructs stays escaped literal text.
 */
function renderInlineRichText(content: string, context: PreviewRenderContext): string {
  let result = '';
  let remaining = content;
  const pattern = /<(strong|em|code)>([\s\S]*?)<\/\1>|<a href="([^"]*)">([\s\S]*?)<\/a>/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = pattern.exec(remaining)) !== null) {
    result += escapeHtml(remaining.slice(lastIndex, match.index));
    if (match[1] === 'strong') {
      result += `<strong>${escapeHtml(match[2])}</strong>`;
    } else if (match[1] === 'em') {
      result += `<em>${escapeHtml(match[2])}</em>`;
    } else if (match[1] === 'code') {
      result += `<code>${escapeHtml(match[2])}</code>`;
    } else {
      const href = safeUrl(match[3], context, 'link');
      result += `<a href="${escapeHtml(href.url)}">${escapeHtml(match[4])}</a>`;
    }
    lastIndex = match.index + match[0].length;
  }
  result += escapeHtml(remaining.slice(lastIndex));
  return result;
}

function renderText(node: any, context: PreviewRenderContext): string {
  const content = node.content || '';
  // Text nodes can carry parser-generated inline rich markup (<strong>,
  // <em>, <code>, <a>) assembled from structured mdast children. Render
  // those four known constructs; everything else stays escaped literal
  // text (the standalone renderer's raw passthrough is forbidden here).
  return renderInlineRichText(content, context);
}

function renderImage(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'image', node.props);
  const alt = node.alt || '';
  const width = node.props.width ? ` width="${escapeHtml(String(node.props.width))}"` : '';
  const height = node.props.height ? ` height="${escapeHtml(String(node.props.height))}"` : '';

  const srcResult = safeUrl(node.src, context, 'image');
  if (srcResult.relativeImage || srcResult.url === '') {
    return `<span class="${classes} ${prefix}image-placeholder" role="img" aria-label="${escapeHtml(alt)}">🖼️</span>`;
  }

  return `<img src="${escapeHtml(srcResult.url)}" alt="${escapeHtml(alt)}" class="${classes}"${width}${height} loading="lazy" />`;
}

function renderLink(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'link', node.props);
  const title = node.title ? ` title="${escapeHtml(node.title)}"` : '';

  const childrenHTML = node.children
    ? node.children.map((child: any) => renderPreviewNode(child, context)).join('')
    : escapeHtml(node.content || '');

  const hrefResult = safeUrl(node.href, context, 'link');
  return `<a href="${escapeHtml(hrefResult.url)}" class="${classes}"${title}>${childrenHTML}</a>`;
}

function renderList(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'list', node.props);
  const tag = node.ordered ? 'ol' : 'ul';
  const childrenHTML = (node.children || []).map((child: any) => renderPreviewNode(child, context)).join('\n  ');

  return `<${tag} class="${classes}">
  ${childrenHTML}
</${tag}>`;
}

function renderListItem(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'list-item', node.props);

  let html = '';
  if (node.content) {
    html = escapeHtml(node.content);
  }
  if (node.children) {
    const childrenHTML = node.children.map((child: any) => renderPreviewNode(child, context)).join('');
    html += childrenHTML;
  }

  return `<li class="${classes}">${html}</li>`;
}

function renderTable(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'table', node.props);

  const headerNode = node.children?.find((child: any) => child.type === 'table-header');
  const rowNodes = node.children?.filter((child: any) => child.type === 'table-row') || [];

  const headerHTML = headerNode ? renderPreviewNode(headerNode, context) : '';
  const rowsHTML = rowNodes.map((child: any) => renderPreviewNode(child, context)).join('\n    ');
  const bodyHTML = rowsHTML ? `\n  <tbody>\n    ${rowsHTML}\n  </tbody>` : '';

  return `<table class="${classes}">
  ${headerHTML}${bodyHTML}
</table>`;
}

function renderTableHeader(node: any, context: PreviewRenderContext): string {
  const cellsHTML = (node.children || []).map((child: any) => renderPreviewNode(child, context)).join('\n    ');
  return `<thead>
    <tr>
      ${cellsHTML}
    </tr>
  </thead>`;
}

function renderTableRow(node: any, context: PreviewRenderContext): string {
  const cellsHTML = (node.children || []).map((child: any) => renderPreviewNode(child, context)).join('\n    ');
  return `<tr>
    ${cellsHTML}
  </tr>`;
}

function renderTableCell(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const tag = node.header ? 'th' : 'td';
  const align = node.align || 'left';
  const classes = buildClasses(prefix, `table-cell ${prefix}align-${align}`, {});

  const contentHTML = node.children && node.children.length > 0
    ? node.children.map((child: any) => renderPreviewNode(child, context)).join('')
    : escapeHtml(node.content || '');

  return `<${tag} class="${classes}">${contentHTML}</${tag}>`;
}

function renderBlockquote(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'blockquote', node.props);
  const childrenHTML = renderChildren(node, context);

  return `<blockquote class="${classes}">
  ${childrenHTML}
</blockquote>`;
}

function renderCode(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const inline = node.inline !== false;

  if (inline) {
    const classes = buildClasses(prefix, 'code-inline', {});
    return `<code class="${classes}">${escapeHtml(node.value)}</code>`;
  }
  const classes = buildClasses(prefix, 'code-block', {});
  const lang = node.lang ? ` data-lang="${escapeHtml(node.lang)}"` : '';
  return `<pre class="${classes}"><code${lang}>${escapeHtml(node.value)}</code></pre>`;
}

function renderSeparator(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'separator', node.props);
  return `<hr class="${classes}" />`;
}

/**
 * Tabs render as STATIC stacked panels: headers stay visible as labels and
 * every panel renders in order with no hidden state and no toggling script.
 */
function renderTabs(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(prefix, 'tabs', node.props);
  const tabs: any[] = node.children || [];

  context.diagnostics.push({
    severity: 'info',
    code: 'wmd-tabs-static',
    message: 'Interactive tabs are rendered as stacked static panels in embedded previews.',
    source: 'renderer',
  });

  const sections = tabs.map((tab: any, i: number) => {
    const panelChildren = (tab.children || []).map((c: any) => renderPreviewNode(c, context)).join('\n    ');
    return `<div class="${prefix}tab-static-section">
    <div class="${prefix}tab-header${tab.active ? ` ${prefix}active` : ''}" role="heading" aria-level="3">${escapeHtml(tab.label || '')}</div>
    <div class="${prefix}tab-panel" role="tabpanel" data-wmd-tab-panel="${i}">
    ${panelChildren}
  </div>
  </div>`;
  }).join('\n  ');

  return `<div class="${classes} ${prefix}tabs-static" data-wmd-tabs-static>
  ${sections}
  </div>`;
}

function renderTab(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const childrenHTML = (node.children || []).map((c: any) => renderPreviewNode(c, context)).join('');
  return `<div class="${prefix}tab-panel" role="tabpanel">${childrenHTML}</div>`;
}

/**
 * Demo blocks keep their rendered preview children but lose the standalone
 * code pane + clipboard copy button (inline event handler + navigator API).
 */
function renderDemo(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;

  context.diagnostics.push({
    severity: 'info',
    code: 'wmd-demo-static',
    message: 'Demo source pane and copy control are omitted in embedded previews.',
    source: 'renderer',
  });

  const previewHTML = renderChildren(node, context);
  return `<div class="${prefix}demo">
  <div class="${prefix}demo-preview">${previewHTML}</div>
</div>`;
}
