# Overlay Family

Phase 3 Task 3: seven primitives that render as static visible panels. Each panel ships with the canonical coss shadcn class subset (rounded-2xl border, bg-white, shadow-lg) and a proper ARIA role for the kind of overlay it represents. The coss parity addendum (2026-08-25) added two more: `menu` and `context-menu`, bringing the family to nine.

## Syntax

### Dialog — `::: dialog`

```
::: dialog
### Edit profile
Name [____]
[Save]* [Cancel]
:::
```

The first heading inside the opener line is treated as the title. Renders with `role="dialog"` and an `aria-label="Close"` button.

### Alert dialog — `::: alert-dialog`

```
::: alert-dialog
### Delete project?
This cannot be undone.
[Delete]{.danger}* [Cancel]
:::
```

Renders with `role="alertdialog"` and a fixed `Cancel` + `Continue` action row. The action button defaults to `primary` (zinc-950) but switches to `danger` when the prop is `actionVariant: 'danger'`.

### Sheet — `::: sheet {.side}`

```
::: sheet {.right}
### Filters
- Category
- Price
:::

::: sheet {.left}
:::
```

Side classes: `top`, `right`, `bottom`, `left`. Default: `right`.

### Drawer — `::: drawer {.side}`

```
::: drawer {.left}
### Menu
[Home] [Settings] [Logout]
:::
```

Same side classes as sheet; default is `left`. Drawers differ from sheets in that they are more often permanent navigation surfaces and use a smaller default padding.

### Popover — `::: popover`

```
::: popover
### Quick actions
- Pin
- Share
- Delete
:::
```

Renders with `role="dialog"`, a `w-72` max width, and a small arrow-ready origin var.

### Tooltip — `::: tooltip`

```
::: tooltip
Press S to save
:::
```

Renders as an inline `<span role="tooltip" data-side="top">`. Use the `side` prop (`top`/`right`/`bottom`/`left`) to position; default is `top`. The first heading or paragraph is the tooltip content; if you pass the `content` prop, it wins.

### Preview card — `::: preview-card`

```
::: preview-card
### Card title
Short description.
:::
```

Renders as a card with rounded-lg border, bg-white, shadow-sm. Pass `href` to wrap in `<a>`.

### Menu — `::: menu Trigger label`

```
::: menu File
- New File {shortcut:"⌘N"}
- Open Recent

---

### Export

- Markdown
- PDF
- Share
  - Copy Link
  - Email

---

- [x] Show Sidebar
- [ ] Show Status Bar
- (x) Light Theme
- ( ) Dark Theme
- Archive {disabled}
- Delete Project {.danger}
:::
```

The opener-line label becomes the trigger button (`aria-haspopup="menu"`); list children become items in a `role="menu"` popup. Item vocabulary:

- `- Item` — plain item (`role="menuitem"`)
- `- Delete Project {.danger}` — destructive (red) item
- `- Archive {disabled}` — disabled item (`aria-disabled="true"`)
- `- New File {shortcut:"⌘N"}` — trailing `<kbd>` shortcut
- `- [x]` / `- [ ]` — checkbox items (`role="menuitemcheckbox"` + `aria-checked`)
- `- (x)` / `- ( )` — radio items (`role="menuitemradio"`)
- `### Heading` — group label
- `---` on its own blank-line-surrounded line — separator
- nested list — submenu (▸ indicator)

**Static wireframe:** the popup is always expanded next to the trigger (🚧 no JavaScript — same caveat as `autocomplete` and `combobox`).

### Context menu — `::: context-menu Zone label`

```
::: context-menu Right-click this zone
- Open
- Open in New Tab
- Copy Link

---

- Rename
- Delete {.danger}
:::
```

Takes the same children as `::: menu`. The difference is the trigger: instead of a button, the label renders as a dashed right-click zone. The popup is likewise always expanded — a static wireframe of the opened state (🚧 no JavaScript).

## Codegen

All nine primitives are wired into `generateCode` with both HTML and JSX output. The dispatcher treats `dialog`, `alert-dialog`, `sheet`, `drawer`, `popover`, `tooltip`, `preview-card`, `menu`, and `context-menu` as first-class discriminants — they appear in `FAMILY_EMITTERS` and `SupportedType` (now part of the 79-discriminant frozen table). Menu items are emitted internally by the menu/context-menu emitters via the internal `menu-item` AST node.

The emitted markup mirrors the coss registry components in shape but does NOT import base-ui or any other library; the user is expected to wire the actual interactivity (popover state, sheet slide-in animation, dialog focus trap) in their own build step.

## CSS

The coss style registers `.wmd-dialog`, `.wmd-alert-dialog`, `.wmd-sheet`, `.wmd-drawer`, `.wmd-popover`, `.wmd-tooltip`, `.wmd-preview-card`, `.wmd-menu`, `.wmd-context-menu` plus their title/description/close/action children. Sheet and drawer use `[data-side="..."]` to apply the right border + positioning rules. Menu and context-menu share the item anatomy (label, shortcut kbd, indicator, sub-list) and the always-expanded popup styling.
