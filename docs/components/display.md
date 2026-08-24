# Display Family

Phase 3 Task 6: six primitives for presenting non-interactive content and structural containers. The renderer emits the canonical coss shadcn markup; the codegen layer produces the same markup as a standalone HTML or JSX fragment.

## Syntax

### Avatar — `::: avatar`

```
::: avatar {name:"Ada Lovelace" size:md}
:::
```

A circular initial-bubble. `{name}` produces initials (first letters of up to the first two whitespace-separated words); `{size}` is one of `sm` (24px), `md` (36px), `lg` (48px), `xl` (64px). When `name` is omitted, the bubble renders a `?` placeholder.

### Frame — `::: frame`

```
::: frame
### Frame title
A rounded muted panel that hosts panels.
:::
```

A rounded `bg-zinc-100` container that hosts one or more panels (typically a header + body pair). Mirrors coss's `Frame` / `FramePanel` pair in spirit.

### Group — `::: group`

```
::: group
[Cut]* [Copy] [Paste]
:::

::: group {orientation:vertical}
[Item one]
[Item two]
:::
```

A connected row (or column, with `orientation:vertical`) of buttons. The `*` marker on a child still denotes the primary action.

### Empty — `::: empty`

```
::: empty
### No projects yet
Get started by creating your first project.
:::
```

A dashed, centered card for the "nothing here yet" state. A leading `###` heading is rendered as the title; body text follows.

### Calendar — `::: calendar`

```
::: calendar {month:"August" year:2026}
:::
```

A month grid with weekday headers (Su–Sa), Previous/Next nav buttons, and per-day cells. `{month}` accepts a full English month name (case-insensitive); defaults to the current month. `{year}` defaults to the current year.

### Date picker — `::: date-picker`

```
::: date-picker {placeholder:"Pick a date"}
:::

::: date-picker {value:"2026-08-24" placeholder:"Pick a date"}
:::
```

A trigger button that opens a date selection. When `value` is set, the trigger renders it with `date-picker-value`; otherwise the `placeholder` shows in muted `date-picker-placeholder` text. The trigger carries `aria-haspopup="dialog"`.

## Gotchas

- The `{month}` prop on `calendar` accepts full month names only (`August`); numeric or short forms are normalized to the current month.
- The wiremd calendar renders a single static month — there is no per-cell selection state, no range support, and no `mode` prop. The coss upstream uses the DayPicker component which is out of scope for a wireframe.
- The wiremd date picker is a button with a `aria-haspopup="dialog"` semantic; it does not open a real picker.
