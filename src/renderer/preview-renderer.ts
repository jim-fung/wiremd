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
 *     (protocol-relative `//host/…` URLs are blocked — they resolve externally)
 *   - remote images load over `https:` only; relative sources are placeholders
 *   - CSS carries no `@import`; external fonts fall back to local stacks
 *   - every class and selector carries the caller's class prefix
 *
 * Copyright (c) 2025 wiremd
 * Licensed under MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

import type { DocumentNode, WiremdNode, WiremdStyle } from '../types.js';
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
  style?: WiremdStyle;
  classPrefix: string;
}

/**
 * Render a wiremd AST as an embeddable preview fragment.
 *
 * Markup and CSS are generated from ONE walk of the AST and must be injected
 * together or not at all — mixing stale CSS under fresh markup (or vice
 * versa) is the host bug this atomic contract exists to make impossible.
 *
 * Throws a documented TypeError when `classPrefix` is not a safe ASCII
 * identifier: the prefix is host-supplied (never author content), it is
 * interpolated into markup, CSS, and a RegExp, and emitting a partially
 * prefixed or markup-breaking payload is worse than refusing to render.
 */
export function renderPreview(
  documentNode: DocumentNode,
  options: PreviewRenderOptions
): PreviewResult {
  const style = options.style ?? 'coss';
  const classPrefix = options.classPrefix;
  if (!CLASS_PREFIX_PATTERN.test(classPrefix)) {
    throw new TypeError(
      `classPrefix must be a non-empty ASCII identifier (${CLASS_PREFIX_PATTERN.source}); ` +
        `received ${JSON.stringify(classPrefix)}. Recommended shape: "ok-wiremd-" ` +
        `(trailing separator keeps generated class names token-separated).`
    );
  }
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

/**
 * A class prefix is interpolated into markup attributes, CSS selectors, and
 * a RegExp (`body\.${prefix}`), so it must be a plain ASCII identifier:
 * letters/digits/underscore/hyphen with a letter or underscore leading.
 * Anything else is a host bug and is refused at the render boundary.
 */
const CLASS_PREFIX_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;

/**
 * Author-controlled class vocabulary (classes/variant/state tokens from
 * parsed properties). Tokens are emitted inside `class="…"` attributes and
 * CSS selectors, so anything outside this grammar — quotes, spaces,
 * attribute-breaking characters — is dropped with a diagnostic instead of
 * being interpolated.
 */
const CLASS_TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Build one element's class attribute under the prefix contract.
 *
 * Code-owned segments (prefix + baseClass) are trusted; every author-derived
 * token (props.classes entries, variant, state) must match
 * {@link CLASS_TOKEN_PATTERN} or it is dropped with a `wmd-class-sanitized`
 * warning. The joined attribute value is HTML-escaped as defense in depth —
 * even a future code path that smuggles a quote through cannot break out of
 * the attribute.
 */
function buildClasses(
  context: PreviewRenderContext,
  baseClass: string,
  props: any
): string {
  const { classPrefix: prefix } = context;
  const classes = [`${prefix}${baseClass}`];
  const drop = (kind: string, raw: string) => {
    context.diagnostics.push({
      severity: 'warning',
      code: 'wmd-class-sanitized',
      message: `Author ${kind} "${raw}" is not a safe CSS class token and was omitted from the preview.`,
      source: 'renderer',
    });
  };
  if (Array.isArray(props?.classes)) {
    for (const cls of props.classes) {
      if (typeof cls === 'string' && CLASS_TOKEN_PATTERN.test(cls)) {
        classes.push(`${prefix}${cls}`);
      } else {
        drop('class', String(cls));
      }
    }
  }
  if (typeof props?.variant === 'string') {
    if (CLASS_TOKEN_PATTERN.test(props.variant)) {
      classes.push(`${prefix}${baseClass}-${props.variant}`);
    } else {
      drop('variant', props.variant);
    }
  }
  if (typeof props?.state === 'string') {
    if (CLASS_TOKEN_PATTERN.test(props.state)) {
      classes.push(`${prefix}state-${props.state}`);
    } else {
      drop('state', props.state);
    }
  }
  return escapeHtml(classes.join(' '));
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

  // Protocol-relative ("//host/path") resolves against the embedding page's
  // scheme to an external origin — it is NOT root-relative and must not
  // reach the scheme-less branch below, which passes links through.
  if (raw.startsWith('//')) {
    context.diagnostics.push({
      severity: 'warning',
      code: 'wmd-url-blocked',
      message: 'Blocked protocol-relative "//" URL in preview content.',
      source: 'renderer',
    });
    return { url: '#', blocked: true };
  }

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
    // Phase 3 families — static mirrors of the standalone html-renderer
    // shapes (no scripts, no toggling state; see each render function).
    case 'toast': return renderToast(node as any, context);
    case 'skeleton': return renderSkeleton(node as any, context);
    case 'spinner': return renderSpinner(node as any, context);
    case 'kbd': return renderKbd(node as any, context);
    case 'progress': return renderProgress(node as any, context);
    case 'meter': return renderMeter(node as any, context);
    case 'dialog': return renderDialog(node as any, context);
    case 'alert-dialog': return renderAlertDialog(node as any, context);
    case 'sheet': return renderSheet(node as any, context);
    case 'drawer': return renderDrawer(node as any, context);
    case 'popover': return renderPopover(node as any, context);
    case 'tooltip': return renderTooltip(node as any, context);
    case 'preview-card': return renderPreviewCard(node as any, context);
    case 'pagination': return renderPagination(node as any, context);
    case 'segmented-control': return renderSegmentedControl(node as any, context);
    case 'scroll-area': return renderScrollArea(node as any, context);
    case 'sidebar': return renderSidebarNav(node as any, context);
    case 'menubar': return renderMenubar(node as any, context);
    case 'form': return renderForm(node as any, context);
    case 'field': return renderField(node as any, context);
    case 'fieldset': return renderFieldset(node as any, context);
    case 'label': return renderLabel(node as any, context);
    case 'input-group': return renderInputGroup(node as any, context);
    case 'otp-field': return renderOtpField(node as any, context);
    case 'number-field': return renderNumberField(node as any, context);
    case 'autocomplete': return renderAutocomplete(node as any, context);
    case 'combobox': return renderCombobox(node as any, context);
    case 'command': return renderCommand(node as any, context);
    case 'checkbox-group': return renderCheckboxGroup(node as any, context);
    case 'toggle-group': return renderToggleGroup(node as any, context);
    case 'switch': return renderSwitch(node as any, context);
    case 'slider': return renderSlider(node as any, context);
    case 'toggle': return renderToggle(node as any, context);
    case 'avatar': return renderAvatar(node as any, context);
    case 'frame': return renderFrame(node as any, context);
    case 'group': return renderGroup(node as any, context);
    case 'empty': return renderEmpty(node as any, context);
    case 'calendar': return renderCalendar(node as any, context);
    case 'date-picker': return renderDatePicker(node as any, context);
    default:
      return `<!-- Unknown node type: ${(node as any).type} -->`;
  }
}

function renderChildren(node: { children?: WiremdNode[] }, context: PreviewRenderContext): string {
  return (node.children ?? []).map((child) => renderPreviewNode(child, context)).join('\n');
}

function renderButton(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(context, 'button', node.props);
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
  const classes = buildClasses(context, 'badge', node.props);
  return `<span class="${classes}">${escapeHtml(node.content)}</span>`;
}

function renderInput(node: any, context: PreviewRenderContext): string {
  const classes = buildClasses(context, 'input', node.props);
  const type = node.props.inputType || node.props.type || 'text';
  const required = node.props.required ? ' required' : '';
  const disabled = node.props.disabled ? ' disabled' : '';
  const placeholder = node.props.placeholder ? ` placeholder="${escapeHtml(node.props.placeholder)}"` : '';
  const value = node.props.value ? ` value="${escapeHtml(node.props.value)}"` : '';
  const style = node.props.width ? ` style="width: ${Number(node.props.width) || 20}ch; max-width: ${Number(node.props.width) || 20}ch;"` : '';

  return `<input type="${escapeHtml(String(type))}" class="${classes}"${placeholder}${value}${required}${disabled}${style} readonly />`;
}

function renderTextarea(node: any, context: PreviewRenderContext): string {
  const classes = buildClasses(context, 'textarea', node.props);
  const rows = node.props.rows || 4;
  const required = node.props.required ? ' required' : '';
  const disabled = node.props.disabled ? ' disabled' : '';
  const placeholder = node.props.placeholder ? ` placeholder="${escapeHtml(node.props.placeholder)}"` : '';
  const value = node.props.value || '';

  return `<textarea class="${classes}" rows="${Number(rows) || 4}"${placeholder}${required}${disabled} readonly>${escapeHtml(value)}</textarea>`;
}

function renderSelect(node: any, context: PreviewRenderContext): string {
  const classes = buildClasses(context, 'select', node.props);
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
  const classes = buildClasses(context, 'checkbox', node.props);
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
  const classes = buildClasses(context, 'radio', node.props);
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
  const classes = buildClasses(context, 'radio-group', node.props);
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
  const classes = buildClasses(context, 'icon', node.props);
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
  const classes = buildClasses(context, `container-${node.containerType}`, node.props);

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
  const classes = buildClasses(context, 'nav', node.props);
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
    const classes = `${buildClasses(context, 'button', node.props)} ${prefix}button-primary`;
    return `<a href="${escapeHtml(hrefResult.url)}" class="${classes.trim()}" style="text-decoration:none;color:inherit;">${contentHTML}</a>`;
  }

  const classes = buildClasses(context, 'nav-item', node.props);
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
  const classes = buildClasses(context, 'brand', node.props);
  const childrenHTML = renderChildren(node, context);
  return `<div class="${classes}">${childrenHTML}</div>`;
}

function renderGrid(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(context, 'grid', node.props);
  const columns = node.columns || 3;
  const gridClass = `${classes} ${prefix}grid-${columns}`;
  const isCard = !!node.props?.card;
  const childrenHTML = (node.children || []).map((child: any) => renderGridItem(child, context, isCard)).join('\n  ');

  return `<div class="${gridClass}" style="--grid-columns: ${columns}">
  ${childrenHTML}
</div>`;
}

function renderGridItem(node: any, context: PreviewRenderContext, isCard = false): string {
  const extraClasses = isCard ? [...(node.props?.classes || []), 'grid-item-card'] : (node.props?.classes || []);
  const itemProps = { ...node.props, classes: extraClasses };
  const classes = buildClasses(context, 'grid-item', itemProps);
  const childrenHTML = renderChildren(node, context);

  return `<div class="${classes}">
    ${childrenHTML}
  </div>`;
}

function renderRow(node: any, context: PreviewRenderContext): string {
  const classes = buildClasses(context, 'row', node.props);
  const childrenHTML = (node.children || []).map((child: any) => renderGridItem(child, context)).join('\n  ');

  return `<div class="${classes}">
  ${childrenHTML}
</div>`;
}

function renderHeading(node: any, context: PreviewRenderContext): string {
  if (!node.content && !node.children?.length) return '';

  const level = Math.min(Math.max(Number(node.level) || 1, 1), 6);
  const classes = buildClasses(context, `h${level}`, node.props);
  const content = node.content || '';

  const childrenHTML = node.children
    ? node.children.map((child: any) => renderPreviewNode(child, context)).join('')
    : escapeHtml(content);

  return `<h${level} class="${classes}">${childrenHTML}</h${level}>`;
}

function renderParagraph(node: any, context: PreviewRenderContext): string {
  const classes = buildClasses(context, 'paragraph', node.props);

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
  const remaining = content;
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
  const classes = buildClasses(context, 'image', node.props);
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
  const classes = buildClasses(context, 'link', node.props);
  const title = node.title ? ` title="${escapeHtml(node.title)}"` : '';

  const childrenHTML = node.children
    ? node.children.map((child: any) => renderPreviewNode(child, context)).join('')
    : escapeHtml(node.content || '');

  const hrefResult = safeUrl(node.href, context, 'link');
  return `<a href="${escapeHtml(hrefResult.url)}" class="${classes}"${title}>${childrenHTML}</a>`;
}

function renderList(node: any, context: PreviewRenderContext): string {
  const classes = buildClasses(context, 'list', node.props);
  const tag = node.ordered ? 'ol' : 'ul';
  const childrenHTML = (node.children || []).map((child: any) => renderPreviewNode(child, context)).join('\n  ');

  return `<${tag} class="${classes}">
  ${childrenHTML}
</${tag}>`;
}

function renderListItem(node: any, context: PreviewRenderContext): string {
  const classes = buildClasses(context, 'list-item', node.props);

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
  const classes = buildClasses(context, 'table', node.props);

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
  const classes = buildClasses(context, `table-cell ${prefix}align-${align}`, {});

  const contentHTML = node.children && node.children.length > 0
    ? node.children.map((child: any) => renderPreviewNode(child, context)).join('')
    : escapeHtml(node.content || '');

  return `<${tag} class="${classes}">${contentHTML}</${tag}>`;
}

function renderBlockquote(node: any, context: PreviewRenderContext): string {
  const classes = buildClasses(context, 'blockquote', node.props);
  const childrenHTML = renderChildren(node, context);

  return `<blockquote class="${classes}">
  ${childrenHTML}
</blockquote>`;
}

function renderCode(node: any, context: PreviewRenderContext): string {
  const inline = node.inline !== false;

  if (inline) {
    const classes = buildClasses(context, 'code-inline', {});
    return `<code class="${classes}">${escapeHtml(node.value)}</code>`;
  }
  const classes = buildClasses(context, 'code-block', {});
  const lang = node.lang ? ` data-lang="${escapeHtml(node.lang)}"` : '';
  return `<pre class="${classes}"><code${lang}>${escapeHtml(node.value)}</code></pre>`;
}

function renderSeparator(node: any, context: PreviewRenderContext): string {
  const classes = buildClasses(context, 'separator', node.props);
  return `<hr class="${classes}" />`;
}

/**
 * Tabs render as STATIC stacked panels: headers stay visible as labels and
 * every panel renders in order with no hidden state and no toggling script.
 */
function renderTabs(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const classes = buildClasses(context, 'tabs', node.props);
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

// ============================================================================
// Phase 3 families (feedback / overlay / navigation / data entry / display)
//
// Each function mirrors the DOM shape, aria attributes, data attributes, and
// class-name suffixes of the corresponding `html-renderer.ts` case so host CSS
// written against the standalone renderer matches the embedded preview. The
// preview-only divergences are the file-wide policy ones: every author string
// is escaped, URLs go through safeUrl, author-supplied inline-style lengths
// are reduced to the cssLength grammar, and state is static (nothing toggles).
// ============================================================================

/**
 * Author-controlled CSS lengths (skeleton width/height, scroll-area
 * max-height) interpolate into `style` attributes. Numbers become `Npx`;
 * strings must be a bare length token of this narrow grammar or they are
 * dropped with a diagnostic instead of emitted.
 */
const CSS_LENGTH_PATTERN = /^[0-9]*\.?[0-9]+(?:px|em|rem|ch|ex|vh|vw|%)?$/;

function cssLength(value: unknown, context: PreviewRenderContext): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return `${value}px`;
  if (typeof value === 'string' && CSS_LENGTH_PATTERN.test(value.trim())) return value.trim();
  if (value !== undefined) {
    context.diagnostics.push({
      severity: 'warning',
      code: 'wmd-style-sanitized',
      message: `Inline style length ${JSON.stringify(value)} is not a safe CSS length and was omitted from the preview.`,
      source: 'renderer',
    });
  }
  return undefined;
}

// --- feedback family -------------------------------------------------------

function renderToast(node: any, context: PreviewRenderContext): string {
  const toastType: string | undefined = node.props?.toastType;
  const variantClass = toastType && toastType !== 'loading' ? toastType : undefined;
  const extraClasses = (node.props?.classes || []).filter(
    (c: string) => c !== variantClass,
  );
  const cls = buildClasses(context, 'toast', { ...node.props, classes: extraClasses });
  const variantHTML = variantClass
    ? ` data-variant="${escapeHtml(variantClass)}"`
    : '';
  const childrenHTML = (node.children || []).map((c: any) => renderPreviewNode(c, context)).join('\n  ');
  return `<div class="${cls}" role="status"${variantHTML}>\n  ${childrenHTML}\n</div>`;
}

function renderSkeleton(node: any, context: PreviewRenderContext): string {
  const cls = buildClasses(context, 'skeleton', node.props);
  const width = cssLength(node.props?.width, context);
  const height = cssLength(node.props?.height, context);
  const styleAttr =
    width !== undefined || height !== undefined
      ? ` style="${[
          width !== undefined ? `width:${width}` : '',
          height !== undefined ? `height:${height}` : '',
        ]
          .filter(Boolean)
          .join(';')}"`
      : '';
  return `<div class="${cls}"${styleAttr}></div>`;
}

function renderSpinner(node: any, context: PreviewRenderContext): string {
  const size: string = node.props?.size || 'medium';
  const sizeClass =
    size === 'small' ? 'spinner-sm' : size === 'large' ? 'spinner-lg' : 'spinner-md';
  const cls = buildClasses(context, 'spinner', { ...node.props, classes: [sizeClass] });
  return `<div class="${cls}" role="status" aria-label="Loading"></div>`;
}

function renderKbd(node: any, context: PreviewRenderContext): string {
  const cls = buildClasses(context, 'kbd', node.props);
  return `<kbd class="${cls}">${escapeHtml(node.content ?? '')}</kbd>`;
}

function renderProgress(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const cls = buildClasses(context, 'progress', node.props);
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

function renderMeter(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const cls = buildClasses(context, 'meter', node.props);
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

// --- overlay family ---------------------------------------------------------

/**
 * Shared shell for the overlay family. Same shape as the standalone
 * `overlayShell` (role, title/description, optional close button, data
 * attributes) minus its interactive behavior — overlays render statically
 * "open" in a preview fragment.
 */
function overlayShell(
  context: PreviewRenderContext,
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
  const cls = buildClasses(context, kind, cleanedProps);
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

function renderDialog(node: any, context: PreviewRenderContext): string {
  const inner = (node.children || []).map((c: any) => renderPreviewNode(c, context)).join('\n  ');
  return overlayShell(context, 'dialog', node.props || {}, inner, 'dialog');
}

function renderAlertDialog(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const inner = (node.children || []).map((c: any) => renderPreviewNode(c, context)).join('\n  ');
  const actionVariant: string = node.props?.actionVariant || 'danger';
  const actionText: string = node.props?.actionText || 'Confirm';
  const cancelText: string = node.props?.cancelText || 'Cancel';
  const actionsHTML = `\n  <div class="${prefix}alert-dialog-actions">
    <button type="button" class="${prefix}button ${prefix}${actionVariant}">${escapeHtml(cancelText)}</button>
    <button type="button" class="${prefix}button ${prefix}${actionVariant === 'danger' ? 'primary' : 'danger'}">${escapeHtml(actionText)}</button>
  </div>`;
  return overlayShell(context, 'alert-dialog', node.props || {}, inner + actionsHTML, 'alertdialog');
}

function renderSheet(node: any, context: PreviewRenderContext): string {
  const inner = (node.children || []).map((c: any) => renderPreviewNode(c, context)).join('\n  ');
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

function renderDrawer(node: any, context: PreviewRenderContext): string {
  const inner = (node.children || []).map((c: any) => renderPreviewNode(c, context)).join('\n  ');
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

function renderPopover(node: any, context: PreviewRenderContext): string {
  const inner = (node.children || []).map((c: any) => renderPreviewNode(c, context)).join('\n  ');
  return overlayShell(context, 'popover', node.props || {}, inner, 'dialog');
}

function renderTooltip(node: any, context: PreviewRenderContext): string {
  const cleanedProps = { ...(node.props || {}) };
  delete cleanedProps.content;
  delete cleanedProps.side;
  const cls = buildClasses(context, 'tooltip', cleanedProps);
  const content: string = node.props?.content || '';
  const side: string = node.props?.side || 'top';
  const childHTML = (node.children || []).map((c: any) => renderPreviewNode(c, context)).join('\n  ');
  const inner = childHTML || content;
  return `<span class="${cls}" role="tooltip" data-side="${escapeHtml(side)}">${escapeHtml(inner)}</span>`;
}

function renderPreviewCard(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const cls = buildClasses(context, 'preview-card', node.props || {});
  const childrenHTML = (node.children || []).map((c: any) => renderPreviewNode(c, context)).join('\n  ');
  const href: string | undefined = node.props?.href;
  const wrap = (inner: string) => {
    if (!href) return inner;
    const hrefResult = safeUrl(href, context, 'link');
    return `<a class="${prefix}preview-card-link" href="${escapeHtml(hrefResult.url)}">${inner}</a>`;
  };
  return wrap(`<div class="${cls}">\n  ${childrenHTML}\n</div>`);
}

// --- navigation family --------------------------------------------------------

/** Flatten a button-group container's children plus any loose children. */
function flattenGroupItems(raw: any[]): any[] {
  const items: any[] = [];
  for (const child of raw) {
    if (child.type === 'container' && child.containerType === 'button-group') {
      items.push(...(child.children || []));
    } else {
      items.push(child);
    }
  }
  return items;
}

function renderPagination(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const label: string = node.props?.label || 'pagination';
  const items = flattenGroupItems(node.children || []);
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

function renderSegmentedControl(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const items = flattenGroupItems(node.children || []);
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

function renderScrollArea(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const cleaned = { ...(node.props || {}) };
  delete cleaned.maxHeight;
  const cls = buildClasses(context, 'scroll-area', cleaned);
  const maxHeight = cssLength(node.props?.maxHeight, context);
  const styleAttr = maxHeight !== undefined
    ? ` style="max-height:${maxHeight}"`
    : '';
  const childrenHTML = (node.children || []).map((c: any) => renderPreviewNode(c, context)).join('\n    ');
  return `<div class="${cls}"${styleAttr}>\n  <div class="${prefix}scroll-area-viewport">\n    ${childrenHTML}\n  </div>\n</div>`;
}

function renderSidebarNav(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const cleaned = { ...(node.props || {}) };
  delete cleaned.title;
  const cls = buildClasses(context, 'sidebar-nav', cleaned);
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
    return renderPreviewNode(c, context)
      .split('\n')
      .map((l: string) => (l ? `  ${l}` : l))
      .join('\n');
  }).join('\n');
  return `<aside class="${cls}">\n${titleHTML}${childrenHTML}\n</aside>`;
}

function renderMenubar(node: any, context: PreviewRenderContext): string {
  const cls = buildClasses(context, 'menubar', node.props || {});
  const childrenHTML = (node.children || []).map((c: any) => renderPreviewNode(c, context)).join('\n  ');
  return `<div class="${cls}" role="menubar">\n  ${childrenHTML}\n</div>`;
}

// --- data entry family --------------------------------------------------------

function renderForm(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  // A form action is a navigation URL: it rides the same scheme allowlist
  // as link hrefs, and generated buttons are all type="button" so the
  // static fragment has no way to submit anyway.
  const actionAttr = node.props?.action
    ? ` action="${escapeHtml(safeUrl(node.props.action, context, 'link').url)}"`
    : '';
  const method = node.props?.method;
  const methodAttr = method ? ` method="${escapeHtml(method)}"` : '';
  const childrenHTML = (node.children || []).map((c: any) => renderPreviewNode(c, context)).join('\n  ');
  return `<form class="${prefix}form"${actionAttr}${methodAttr}>\n  ${childrenHTML}\n</form>`;
}

function renderField(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const label = node.props?.label;
  const desc = node.props?.description;
  const error = node.props?.error;
  const labelHTML = label ? `  <label class="${prefix}field-label">${escapeHtml(label)}</label>\n` : '';
  const childrenHTML = (node.children || []).map((c: any) => renderPreviewNode(c, context)).join('\n  ');
  const descHTML = desc ? `\n  <p class="${prefix}field-description">${escapeHtml(desc)}</p>` : '';
  const errorHTML = error ? `\n  <p class="${prefix}field-error" role="alert">${escapeHtml(error)}</p>` : '';
  return `<div class="${prefix}field">\n${labelHTML}  ${childrenHTML}${descHTML}${errorHTML}\n</div>`;
}

function renderFieldset(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const legend = node.props?.legend;
  const desc = node.props?.description;
  const legendHTML = legend ? `  <legend class="${prefix}fieldset-legend">${escapeHtml(legend)}</legend>\n` : '';
  const descHTML = desc ? `  <p class="${prefix}fieldset-description">${escapeHtml(desc)}</p>\n` : '';
  const childrenHTML = (node.children || []).map((c: any) => renderPreviewNode(c, context)).join('\n  ');
  return `<fieldset class="${prefix}fieldset">\n${legendHTML}${descHTML}  ${childrenHTML}\n</fieldset>`;
}

function renderLabel(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const htmlFor = node.props?.htmlFor;
  const forAttr = htmlFor ? ` for="${escapeHtml(htmlFor)}"` : '';
  return `<label class="${prefix}label"${forAttr}>${escapeHtml(node.content ?? '')}</label>`;
}

function renderInputGroup(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const start = node.props?.addonStart;
  const end = node.props?.addonEnd;
  const childrenHTML = (node.children || []).map((c: any) => renderPreviewNode(c, context)).join('\n  ');
  const startHTML = start ? `  <span class="${prefix}input-group-addon">${escapeHtml(start)}</span>\n` : '';
  const endHTML = end ? `\n  <span class="${prefix}input-group-addon">${escapeHtml(end)}</span>` : '';
  return `<div class="${prefix}input-group">\n${startHTML}  ${childrenHTML}${endHTML}\n</div>`;
}

function renderOtpField(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const length = Number(node.props?.length ?? 6);
  const maxLength = Number(node.props?.maxLength ?? 1);
  const slots = Array.from({ length }, () =>
    `<input class="${prefix}otp-slot" type="text" inputmode="numeric" maxlength="${maxLength}" aria-label="digit" readonly>`,
  ).join('\n  ');
  return `<div class="${prefix}otp-field" role="group" aria-label="Verification code">\n  ${slots}\n</div>`;
}

function renderNumberField(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const p = node.props || {};
  const numAttrs = (name: 'min' | 'max' | 'step') =>
    p[name] !== undefined ? ` ${name}="${escapeHtml(String(p[name]))}"` : '';
  const valueAttr = p.value !== undefined ? ` value="${escapeHtml(String(p.value))}"` : '';
  const placeholderAttr = p.placeholder ? ` placeholder="${escapeHtml(p.placeholder)}"` : '';
  const btnCls = `${prefix}number-stepper`;
  return `<div class="${prefix}number-field">
  <button type="button" class="${btnCls}" aria-label="Decrease">−</button>
  <input class="${prefix}number-input" type="number"${numAttrs('min')}${numAttrs('max')}${numAttrs('step')}${valueAttr}${placeholderAttr} readonly>
  <button type="button" class="${btnCls}" aria-label="Increase">+</button>
</div>`;
}

function renderAutocomplete(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const p = node.props || {};
  const placeholderAttr = p.placeholder ? ` placeholder="${escapeHtml(p.placeholder)}"` : '';
  const suggestions: string[] = p.suggestions || [];
  const listItems = suggestions
    .map((s) => `    <li class="${prefix}autocomplete-option" role="option">${escapeHtml(s)}</li>`)
    .join('\n');
  const listHTML = suggestions.length > 0
    ? `\n  <ul class="${prefix}autocomplete-list" role="listbox">\n${listItems}\n  </ul>`
    : '';
  return `<div class="${prefix}autocomplete">\n  <input class="${prefix}autocomplete-input" type="text" role="combobox" aria-expanded="false" aria-autocomplete="list"${placeholderAttr} readonly>${listHTML}\n</div>`;
}

function renderCombobox(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const p = node.props || {};
  const placeholderAttr = p.placeholder ? ` placeholder="${escapeHtml(p.placeholder)}"` : '';
  const options: string[] = p.options || [];
  const listItems = options
    .map((o) => `    <li class="${prefix}combobox-option" role="option">${escapeHtml(o)}</li>`)
    .join('\n');
  const listHTML = options.length > 0
    ? `\n  <ul class="${prefix}combobox-list" role="listbox">\n${listItems}\n  </ul>`
    : '';
  return `<div class="${prefix}combobox">\n  <input class="${prefix}combobox-input" type="text" role="combobox" aria-expanded="false" aria-autocomplete="list"${placeholderAttr} readonly>\n  <span class="${prefix}combobox-caret" aria-hidden="true">▾</span>${listHTML}\n</div>`;
}

function renderCommand(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const p = node.props || {};
  const placeholderAttr = p.placeholder ? ` placeholder="${escapeHtml(p.placeholder)}"` : '';
  const childrenHTML = (node.children || []).map((c: any) => renderPreviewNode(c, context)).join('\n  ');
  return `<div class="${prefix}command" role="dialog" aria-label="Command menu">\n  <input class="${prefix}command-input" type="text"${placeholderAttr} readonly>\n  ${childrenHTML}\n</div>`;
}

function renderCheckboxGroup(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const label = node.props?.label;
  const desc = node.props?.description;
  const labelHTML = label ? `  <p class="${prefix}checkbox-group-label">${escapeHtml(label)}</p>\n` : '';
  const descHTML = desc ? `  <p class="${prefix}checkbox-group-description">${escapeHtml(desc)}</p>\n` : '';
  const childrenHTML = (node.children || []).map((c: any) => renderPreviewNode(c, context)).join('\n  ');
  return `<div class="${prefix}checkbox-group" role="group">\n${labelHTML}${descHTML}  ${childrenHTML}\n</div>`;
}

function renderToggleGroup(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const items = flattenGroupItems(node.children || []);
  const buttonsHTML = items
    .filter((item) => item.type === 'button' || item.type === 'nav-item')
    .map((item) => {
      const isPressed = (item.props?.classes || []).includes('active') ||
        item.props?.variant === 'primary';
      const text = item.content ?? '';
      const btnCls = `${prefix}toggle${isPressed ? ` ${prefix}toggle-pressed` : ''}`;
      const pressedAttr = isPressed ? ' aria-pressed="true"' : ' aria-pressed="false"';
      return `  <button type="button" class="${btnCls}"${pressedAttr}>${escapeHtml(text)}</button>`;
    })
    .join('\n');
  return `<div class="${prefix}toggle-group" role="group">\n${buttonsHTML}\n</div>`;
}

function renderSwitch(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const checked: boolean = !!node.checked;
  const p = node.props || {};
  const trackCls = `${prefix}switch${checked ? ` ${prefix}switch-on` : ''}`;
  const disabledAttr = p.disabled ? ' disabled' : '';
  const labelHTML = p.label
    ? `  <span class="${prefix}switch-label">${escapeHtml(p.label)}</span>`
    : '';
  const descHTML = p.description
    ? `\n  <span class="${prefix}switch-description">${escapeHtml(p.description)}</span>`
    : '';
  const control = `  <button type="button" class="${trackCls}" role="switch" aria-checked="${checked}"${disabledAttr}>\n    <span class="${prefix}switch-thumb"></span>\n  </button>`;
  const layout = (labelHTML || descHTML)
    ? `<div class="${prefix}switch-row">\n${control}${labelHTML}${descHTML}\n</div>`
    : control;
  return layout;
}

function renderSlider(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const p = node.props || {};
  const value = Number(node.value ?? 50);
  const min = Number(p.min ?? 0);
  const max = Number(p.max ?? 100);
  const step = Number(p.step ?? 1);
  const range = max - min || 1;
  const pct = Math.max(0, Math.min(100, ((value - min) / range) * 100));
  const labelHTML = p.label
    ? `  <label class="${prefix}slider-label">${escapeHtml(p.label)} <span class="${prefix}slider-value">${value}</span></label>\n`
    : '';
  return `<div class="${prefix}slider">
${labelHTML}  <div class="${prefix}slider-track" role="slider" aria-valuenow="${value}" aria-valuemin="${min}" aria-valuemax="${max}" aria-step="${step}">
    <div class="${prefix}slider-fill" style="width:${pct}%"></div>
    <div class="${prefix}slider-thumb" style="left:${pct}%"></div>
  </div>
</div>`;
}

function renderToggle(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const pressed: boolean = !!node.pressed;
  const label = node.props?.label;
  const btnCls = `${prefix}toggle${pressed ? ` ${prefix}toggle-pressed` : ''}`;
  const pressedAttr = pressed ? ' aria-pressed="true"' : ' aria-pressed="false"';
  const text = label ?? '';
  return `<button type="button" class="${btnCls}"${pressedAttr}>${escapeHtml(text)}</button>`;
}

// --- display family ------------------------------------------------------------

function renderAvatar(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const size = node.props?.size ?? 'md';
  const sizeCls = `${prefix}avatar ${prefix}avatar-${size}`;
  const name = node.props?.name;
  const initials = name
    ? name
        .split(/\s+/)
        .map((p: string) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';
  return `<div class="${sizeCls}" role="img" aria-label="${escapeHtml(name ?? 'avatar')}">
  <span class="${prefix}avatar-fallback">${escapeHtml(initials)}</span>
</div>`;
}

function renderFrame(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const childrenHTML = (node.children || []).map((c: any) => renderPreviewNode(c, context)).join('\n  ');
  return `<div class="${prefix}frame">
  ${childrenHTML}
</div>`;
}

function renderGroup(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const orientation = (node.orientation || 'horizontal') === 'vertical' ? 'vertical' : 'horizontal';
  const childrenHTML = (node.children || []).map((c: any) => renderPreviewNode(c, context)).join('\n  ');
  return `<div class="${prefix}group ${prefix}group-${orientation}" role="group" data-orientation="${orientation}">
  ${childrenHTML}
</div>`;
}

function renderEmpty(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const childrenHTML = (node.children || []).map((c: any) => renderPreviewNode(c, context)).join('\n  ');
  return `<div class="${prefix}empty" data-slot="empty">
  ${childrenHTML}
</div>`;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function renderCalendar(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const year = Number(node.props?.year ?? new Date().getFullYear());
  const monthName = node.props?.month ?? MONTH_NAMES[new Date().getMonth()];
  const monthIdx = MONTH_NAMES.findIndex((m) => m.toLowerCase() === String(monthName).toLowerCase());
  const safeIdx = monthIdx >= 0 ? monthIdx : new Date().getMonth();
  const first = new Date(year, safeIdx, 1);
  const last = new Date(year, safeIdx + 1, 0);
  const startWeekday = first.getDay();
  const daysInMonth = last.getDate();
  const cells: string[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(`<div class="${prefix}calendar-day ${prefix}calendar-day-outside"></div>`);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`<button type="button" class="${prefix}calendar-day">${d}</button>`);
  while (cells.length % 7 !== 0) cells.push(`<div class="${prefix}calendar-day ${prefix}calendar-day-outside"></div>`);
  const weekdays = WEEKDAY_NAMES.map((w) => `<div class="${prefix}calendar-weekday">${w}</div>`).join('');
  return `<div class="${prefix}calendar" data-slot="calendar">
  <div class="${prefix}calendar-header">
    <button type="button" class="${prefix}calendar-nav" aria-label="Previous month">&larr;</button>
    <div class="${prefix}calendar-caption">${escapeHtml(MONTH_NAMES[safeIdx])} ${year}</div>
    <button type="button" class="${prefix}calendar-nav" aria-label="Next month">&rarr;</button>
  </div>
  <div class="${prefix}calendar-grid">
    ${weekdays}
    ${cells.join('\n    ')}
  </div>
</div>`;
}

function renderDatePicker(node: any, context: PreviewRenderContext): string {
  const { classPrefix: prefix } = context;
  const placeholder = node.props?.placeholder ?? 'Pick a date';
  const value = node.props?.value;
  return `<div class="${prefix}date-picker" data-slot="date-picker">
  <button type="button" class="${prefix}date-picker-trigger" aria-haspopup="dialog">
    <span class="${prefix}date-picker-value${value ? '' : ` ${prefix}date-picker-placeholder`}">${escapeHtml(value ?? placeholder)}</span>
    <span class="${prefix}date-picker-caret" aria-hidden="true">&#9662;</span>
  </button>
</div>`;
}
