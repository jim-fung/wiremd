# Feedback Family

Phase 3 Task 2: six small primitives that signal state and progress to the user. The renderer emits the canonical coss shadcn markup; the codegen layer produces the same markup as a standalone HTML or JSX fragment.

## Syntax

### Toast — `::: toast` (and variants)

```
::: toast
Changes saved.
:::

::: toast {.success}
Heads up
A new release is available.
:::
```

The first paragraph inside the opener line is the title (rendered with `font-medium`); subsequent paragraphs are the body. Supported variant classes: `success`, `info`, `warning`, `error`, `loading`.

### Skeleton — `::: skeleton`

```
::: skeleton
:::
```

Renders a shimmer block. Use the `width` and `height` props to control size.

### Spinner — `::: spinner`

```
::: spinner
:::
```

Renders an animated `border-t-zinc-950 border-zinc-200` ring. Use the `size` prop: `small`, `medium`, `large`.

### Kbd — `[text]{.kbd}`

```
[⌘K]{.kbd} [K]{.kbd}
```

Inline keyboard hint. The `.kbd` class is recognized on any bracketed text; the parser converts the result into a dedicated `kbd` node after the rest of the transform passes have run, so the shortcut works inside button groups, paragraphs, and inline containers uniformly.

### Progress — `::: progress {value:N}` (or `{.indeterminate}`)

```
::: progress {value:60}
Uploading…
:::

::: progress {.indeterminate}
Loading
:::
```

The label paragraph is optional. The `value` attribute is clamped to 0–100. Indeterminate progress renders a full-width track without a percentage value.

### Meter — `::: meter {value:N min:N max:N}`

```
::: meter {value:30}
Storage
:::
```

Defaults: `min=0`, `max=100`. Renders a `<div role="meter">` with the percentage fill.

## Codegen

All six primitives are wired into `generateCode` with both HTML and JSX output. The dispatcher treats `toast`, `skeleton`, `spinner`, `kbd`, `progress`, and `meter` as first-class discriminants — they appear in `FAMILY_EMITTERS` and `SupportedType` (now part of the 73-discriminant frozen table).

Example codegen output for a kbd shortcut:

```ts
generateCode({ type: 'kbd', content: '⌘K', props: {} });
// → '<kbd class="pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center gap-1 rounded bg-zinc-100 px-1 font-sans font-medium text-zinc-500 text-xs">⌘K</kbd>'
```

## CSS

The coss style registers `.wmd-toast`, `.wmd-skeleton`, `.wmd-spinner`, `.wmd-kbd`, `.wmd-progress`, `.wmd-meter` plus their track/indicator/label/value children. Spinner and skeleton ship with `@keyframes` (scoped to the class prefix so multiple wiremd embeds on the same page don't fight).
