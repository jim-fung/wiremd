::: layout {.sidebar-main}

![[_sidebar.md]]

::: main

# Not Implemented Components

Components not yet in wiremd, with proposed syntax aligned to wiremd's design principles. All proposals follow the existing patterns: `{key:value}` attributes for progressive enhancement, `:::` containers for block components, and visually intuitive ASCII-like syntax.

> **Already supported but easy to miss:** file upload (`[_____]{type:file}`), color input (`[_____]{type:color}`).

::: grid-3 card

### Inputs
Rating, Chip Input
[[Jump →](#inputs)]

### Feedback
Backdrop
[[Jump →](#feedback)]

### Navigation
Stepper, Bottom Navigation, Tree View
[[Jump →](#navigation)]

### Data Display
Chip, Timeline, DataGrid
[[Jump →](#data-display)]

### Surfaces
Paper, Speed Dial
[[Jump →](#surfaces)]

:::

---

## Inputs

::: grid-2

### Rating

Star rating. Used in reviews, feedback forms, dashboards.

Unicode stars inside brackets — follows the same pattern as emoji in buttons (`[:heart: Like]`):

```
[★★★☆☆]
[★★★★☆]{max:5}
```

### Chip Input

Multi-value input where each value renders as a removable chip. Used for tags, recipients, filters.

Extends the badge `|...|` syntax — chips are badges with a `×` and the trailing input is a regular text input:

```
|Design ×|{.chip} |React ×|{.chip} [_____]
```

:::

---

## Feedback

::: grid-2

### Backdrop

Dimmed full-screen overlay behind modals and drawers. Currently implied by `:::modal` but not independently expressible.

Wrapper container — nests around existing modal/drawer containers:

```
::: backdrop
::: modal
### Confirm action
Are you sure?
[Confirm]* [Cancel]
:::
:::
```

:::

---

## Navigation

::: grid-2

### Stepper

Multi-step progress indicator. Used in checkout flows, onboarding, multi-page forms.

New container using `###` items — same boundary convention as `::: grid-N`:

```
::: stepper
### Account {.active}
### Profile
### Confirm
:::
```

### Bottom Navigation

Mobile tab bar fixed to the bottom. Used in mobile-first apps.

New container type — button links with icons follow the existing `[[:icon: Label]]` pattern:

```
::: bottom-nav
[[:home: Home]*]
[[:search: Explore]]
[[:bell: Alerts]]
[[:user: Profile]]
:::
```

### Tree View

Collapsible hierarchical list. Used in file browsers, org charts, nested category navigation.

Container wrapping native Markdown nested lists — no new syntax for content, just a styled wrapper:

```
::: tree
- ▶ src/
  - ▶ components/
    - Button.tsx
    - Input.tsx
  - index.ts
- package.json
:::
```

:::

---

## Data Display

::: grid-2

### Chip

Compact, optionally removable label. Distinct from badge — chips are interactive and can be dismissed. Used for tags, filters, selections.

Extends badge `|...|` syntax — static chip is a badge with `.chip` class; removable adds `×`:

```
|React|{.chip}      <!-- static chip -->
|Design ×|{.chip}   <!-- removable chip -->
```

### Timeline

Vertical sequence of events with connectors. Used in activity feeds, changelogs, order tracking.

New container using `###` items — same heading-as-item convention as `::: stepper` and `::: grid-N`:

```
::: timeline
### 10:00 AM {.completed}
Meeting with design team

### 2:00 PM {.active}
Code review

### 4:00 PM
Deploy to staging
:::
```

### DataGrid

Table with sort/filter/row-select state indicators. Basic tables already work; DataGrid adds interactive markers.

Extends native Markdown table syntax — sort arrows and checkboxes are rendered inline, badges show status:

```
| ☐ | Name ↑ | Status |
|----|--------|--------|
| ☑ | Alice  | |Active|{.success} |
| ☐ | Bob    | |Pending|{.warning} |
```

:::

---

## Surfaces

::: grid-2

### Paper

A plain elevated surface with shadow — no semantic type, used as a base for custom compositions.

New container type with elevation modifier via attribute:

```
::: paper {.elevation-2}
Any content here
:::
```

### Speed Dial

Floating action button that expands into a set of actions. Used in mobile and canvas UIs.

Container with a primary button trigger and a list of action buttons — mirrors the menu pattern:

```
::: speed-dial
[+]*
- [:edit: Edit]
- [:share: Share]
- [:delete: Delete]{.danger}
:::
```

:::

:::

:::
