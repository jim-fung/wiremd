# Overlay Family

Phase 3 Task 3: seven primitives that render as static visible panels. Each panel ships with the canonical coss shadcn class subset (rounded-2xl border, bg-white, shadow-lg) and a proper ARIA role for the kind of overlay it represents.

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

## Codegen

All seven primitives are wired into `generateCode` with both HTML and JSX output. The dispatcher treats `dialog`, `alert-dialog`, `sheet`, `drawer`, `popover`, `tooltip`, and `preview-card` as first-class discriminants — they appear in `FAMILY_EMITTERS` and `SupportedType` (the 47-discriminant frozen table).

The emitted markup mirrors the coss registry components in shape but does NOT import base-ui or any other library; the user is expected to wire the actual interactivity (popover state, sheet slide-in animation, dialog focus trap) in their own build step.

## CSS

The coss style registers `.wmd-dialog`, `.wmd-alert-dialog`, `.wmd-sheet`, `.wmd-drawer`, `.wmd-popover`, `.wmd-tooltip`, `.wmd-preview-card` plus their title/description/close/action children. Sheet and drawer use `[data-side="..."]` to apply the right border + positioning rules.
