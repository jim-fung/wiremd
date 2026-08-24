::: layout {.sidebar-main}

![[_sidebar.md]]

::: main

# wiremd Components

::: demo

## Sign In

Email
[_____________________________]{type:email required}

Password
[_____________________________]{type:password required}

- [ ] Remember me

[Sign In]* [Forgot password?]

:::

wiremd converts Markdown with extended syntax into visual wireframes. Use these components to prototype UIs directly in your editor.

## Primitive Coverage Matrix

The **coss** style (Cal.com's design system) is wiremd's default theme: every primitive below ships with wiremd syntax, an AST node, an html-renderer case, coss-theme CSS, and codegen emitters for both `html` and `jsx` formats (`generateCode()`). The 73-discriminant codegen contract is frozen in `src/codegen/coss/types.ts`; renderer cases live in `src/renderer/html-renderer.ts`. Static wireframe semantics apply throughout — overlays render as visible panels, no JavaScript. For composition recipes that assemble these primitives into common patterns (login form, pricing card, navbar, settings panel…), see [Particles](particles.md).

### Base

| Primitive | wiremd syntax | AST node | Renderer | Codegen | Status |
|-----------|---------------|----------|----------|---------|--------|
| button | `[Save]*` | ✅ | ✅ | ✅ | ✅ |
| input | `[________]{type:email}` | ✅ | ✅ | ✅ | ✅ |
| textarea | `[Notes…]{rows:4}` | ✅ | ✅ | ✅ | ✅ |
| select | `[Choose v]` + option list | ✅ | ✅ | ✅ | ✅ |
| checkbox | `- [x] Checked` | ✅ | ✅ | ✅ | ✅ |
| radio | `- (x) Selected` | ✅ | ✅ | ✅ | ✅ |
| radio-group | grouped `- ( )` items | ✅ | ✅ | ✅ | ✅ |
| icon | `:name:` | ✅ | ✅ | ✅ | ✅ |
| badge | `\|Label\|{.success}` | ✅ | ✅ | ✅ | ✅ |
| container | `::: card`, `::: hero`, `::: layout {.sidebar-main}` | ✅ | ✅ | ✅ | ✅ |
| nav | `[[ Brand \| Link \| [Sign Up]* ]]` | ✅ | ✅ | ✅ | ✅ |
| nav-item | item inside `[[ … ]]` | ✅ | ✅ | ✅ | ✅ |
| brand | first item of `[[ … ]]` | ✅ | ✅ | ✅ | ✅ |
| grid | `::: grid-3 card` | ✅ | ✅ | ✅ | ✅ |
| grid-item | `### Item {.col-span-2}` in a grid | ✅ | ✅ | ✅ | ✅ |
| row | `::: row {.center}` | ✅ | ✅ | ✅ | ✅ |
| heading | `## Title` | ✅ | ✅ | ✅ | ✅ |
| paragraph | plain text block | ✅ | ✅ | ✅ | ✅ |
| text | inline text run | ✅ | ✅ | ✅ | ✅ |
| image | `![alt](src.png)` | ✅ | ✅ | ✅ | ✅ |
| link | `[text](url)` | ✅ | ✅ | ✅ | ✅ |
| list | `- item` | ✅ | ✅ | ✅ | ✅ |
| list-item | one `- item` | ✅ | ✅ | ✅ | ✅ |
| table | `\| Col \| Col \|` + separator | ✅ | ✅ | ✅ | ✅ |
| table-header | first table row | ✅ | ✅ | ✅ | ✅ |
| table-row | one table row | ✅ | ✅ | ✅ | ✅ |
| table-cell | one column value | ✅ | ✅ | ✅ | ✅ |
| blockquote | `> quote` | ✅ | ✅ | ✅ | ✅ |
| code | `` `code` `` or fenced block | ✅ | ✅ | ✅ | ✅ |
| separator | `---` | ✅ | ✅ | ✅ | ✅ |
| tabs | `::: tabs` | ✅ | ✅ | ✅ | ✅ |
| tab | `::: tab Title` | ✅ | ✅ | ✅ | ✅ |
| breadcrumbs | `[[ Home > Settings > Profile ]]` | ✅ | ✅ | ✅ | ✅ |
| demo | `::: demo` | ✅ | ✅ | ✅ | ✅ |

### Feedback

| Primitive | wiremd syntax | AST node | Renderer | Codegen | Status |
|-----------|---------------|----------|----------|---------|--------|
| alert | `::: alert {.success}` | ✅ | ✅ | ✅ | ✅ renderer finished in Phase 3 Task 1 |
| toast | `::: toast {.success}` | ✅ | ✅ | ✅ | ✅ |
| skeleton | `::: skeleton` | ✅ | ✅ | ✅ | ✅ |
| spinner | `::: spinner` | ✅ | ✅ | ✅ | ✅ |
| kbd | `[⌘K]{.kbd}` | ✅ | ✅ | ✅ | ✅ |
| progress | `::: progress {value:60}` | ✅ | ✅ | ✅ | ✅ |
| meter | `::: meter {value:30}` | ✅ | ✅ | ✅ | ✅ |

### Overlays

| Primitive | wiremd syntax | AST node | Renderer | Codegen | Status |
|-----------|---------------|----------|----------|---------|--------|
| dialog | `::: dialog` | ✅ | ✅ | ✅ | ✅ |
| alert-dialog | `::: alert-dialog` | ✅ | ✅ | ✅ | 🚧 static auto action row (fixed Cancel + action) |
| sheet | `::: sheet {.right}` | ✅ | ✅ | ✅ | 🚧 static side panel |
| drawer | `::: drawer {.left}` | ✅ | ✅ | ✅ | 🚧 static side panel |
| popover | `::: popover` | ✅ | ✅ | ✅ | ✅ |
| tooltip | `::: tooltip` | ✅ | ✅ | ✅ | ✅ |
| preview-card | `::: preview-card` | ✅ | ✅ | ✅ | ✅ |

### Navigation

| Primitive | wiremd syntax | AST node | Renderer | Codegen | Status |
|-----------|---------------|----------|----------|---------|--------|
| pagination | `::: pagination` | ✅ | ✅ | ✅ | ✅ |
| segmented-control | `::: segmented-control` | ✅ | ✅ | ✅ | ✅ |
| scroll-area | `::: scroll-area {maxHeight:220}` | ✅ | ✅ | ✅ | ✅ |
| sidebar | `::: sidebar` | ✅ | ✅ | ✅ | ✅ dedicated discriminant since Phase 3 Task 4 |
| menubar | `::: menubar` | ✅ | ✅ | ✅ | ✅ |

### Data entry

| Primitive | wiremd syntax | AST node | Renderer | Codegen | Status |
|-----------|---------------|----------|----------|---------|--------|
| form | `::: form` | ✅ | ✅ | ✅ | ✅ |
| field | `::: field {label:"Workspace name"}` | ✅ | ✅ | ✅ | ✅ |
| fieldset | `::: fieldset` | ✅ | ✅ | ✅ | ✅ |
| label | `::: label` | ✅ | ✅ | ✅ | ✅ |
| input-group | `::: input-group {addonStart:"https://"}` | ✅ | ✅ | ✅ | ✅ |
| otp-field | `::: otp-field {length:6}` | ✅ | ✅ | ✅ | ✅ |
| number-field | `::: number-field {value:3 min:0 max:10}` | ✅ | ✅ | ✅ | ✅ |
| autocomplete | `::: autocomplete` | ✅ | ✅ | ✅ | 🚧 static option list |
| combobox | `::: combobox` | ✅ | ✅ | ✅ | 🚧 static option list |
| command | `::: command` | ✅ | ✅ | ✅ | 🚧 static palette |
| checkbox-group | `::: checkbox-group {label:"Interests"}` | ✅ | ✅ | ✅ | ✅ |
| toggle-group | `::: toggle-group` | ✅ | ✅ | ✅ | ✅ |
| switch | `::: switch {.checked}` | ✅ | ✅ | ✅ | ✅ |
| slider | `::: slider {value:70}` | ✅ | ✅ | ✅ | ✅ |
| toggle | `::: toggle {.active}` | ✅ | ✅ | ✅ | ✅ |

### Display

| Primitive | wiremd syntax | AST node | Renderer | Codegen | Status |
|-----------|---------------|----------|----------|---------|--------|
| avatar | `::: avatar {name:"Ada" size:md}` | ✅ | ✅ | ✅ | ✅ |
| frame | `::: frame` | ✅ | ✅ | ✅ | ✅ |
| group | `::: group` | ✅ | ✅ | ✅ | ✅ |
| empty | `::: empty` | ✅ | ✅ | ✅ | ✅ |
| calendar | `::: calendar {month:"August" year:2026}` | ✅ | ✅ | ✅ | 🚧 single static month, no selection |
| date-picker | `::: date-picker {placeholder:"Pick a date"}` | ✅ | ✅ | ✅ | 🚧 trigger only, no picker |

### Particles

| Recipe catalog | wiremd syntax | AST node | Renderer | Codegen | Status |
|----------------|---------------|----------|----------|---------|--------|
| 12 composition recipes | compositions of the primitives above — see [Particles](particles.md) | n/a (by design) | ✅ via primitives | ✅ via primitives | ✅ no dedicated particle code paths |

🚧 rows are static-wireframe gaps by design (no JavaScript in rendered output) — see the family pages for each primitive's semantics.

## Standard Markdown

All standard CommonMark Markdown works inside wiremd files:

| Syntax | Example |
|--------|---------|
| Headings | `# H1`, `## H2`, `### H3` … `###### H6` |
| Bold | `**bold**` |
| Italic | `*italic*` |
| Inline code | `` `code` `` |
| Link | `[text](url)` |
| Image | `![alt](image.jpg)` |
| Unordered list | `- item` |
| Ordered list | `1. item` |
| Blockquote | `> quoted text` |
| Table | `\| col \| col \|` with `---` separator row |
| Horizontal rule | `---` |
| Fenced code block | ` ``` ` … ` ``` ` |

wiremd extends this with UI components — nothing above is broken or overridden.

## Best Practices

1. **Label inputs** — put label text on the line directly above the input, no blank line between them
2. **Use semantic headings** — `#` for page title, `##` for sections, `###` for grid/tab items
3. **Use `{variant:primary}` not `{.primary}`** — dot-class syntax adds raw CSS classes with no built-in styling
4. **Use `{state:disabled}` on buttons** — `{disabled}` is silently ignored on buttons; use `{state:disabled}` instead
5. **Group related items with containers** — `:::card`, `:::grid-N`, `:::row` to organise content
6. **One `:::` container can nest inside another** — track depth; the inner `:::` closes its own block only

:::

:::
