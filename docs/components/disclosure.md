::: layout {.sidebar-main}

![[_sidebar.md]]

::: main

# Disclosure

Disclosure primitives reveal content on demand. `::: accordion` stacks exclusive panels; `::: collapsible` toggles a single panel. Static wireframe semantics apply — triggers are non-functional buttons carrying `aria-expanded`, and the open/closed state is baked into the markup.

## Accordion

`::: accordion` creates a vertically stacked list of expandable sections. Each `::: accordion-item Summary` fence becomes one panel. The first item is expanded by default unless any item carries an explicit `{.expanded}` or `{.collapsed}` variant.

::: demo

::: accordion

::: accordion-item What is wiremd?
wiremd converts Markdown with extended syntax into visual wireframes.

:::

::: accordion-item Who is it for?
Designers who version-control their mockups, developers who hand off, and anyone sketching UIs in plain text.

:::

::: accordion-item Can I nest containers inside an item?
Yes — grids, rows, and forms all render inside item panels.

:::

:::

:::

## Per-item variants

`{.expanded}` and `{.collapsed}` on an accordion-item override the first-item default. Once any item is explicit, only the items you mark `{.expanded}` start open:

::: demo

::: accordion

::: accordion-item Shipping
Free over $50.

:::

::: accordion-item Returns {.collapsed}
30-day window.

:::

::: accordion-item Support {.expanded}
Email and chat.

:::

:::

:::

## Collapsible

`::: collapsible Trigger title` toggles a single panel — used for "show more" sections, advanced settings, and detail rows. The default state is expanded; add `{.collapsed}` to start collapsed.

::: demo

::: collapsible Advanced settings
Extra options live here.

:::

::: collapsible Archived items {.collapsed}
Hidden until opened.

:::

:::

## Syntax

```
::: accordion

::: accordion-item Summary
Panel content

:::

::: accordion-item Another summary {.collapsed}
Panel content

:::

:::

::: collapsible Trigger title
Panel content (expanded by default)

:::

::: collapsible Hidden panel {.collapsed}
Panel content (starts collapsed)

:::
```

:::

:::

## Disclosure family (2026-08-25)

Two primitives with first-class codegen discriminants (plus the internal `accordion-item`):

- `::: accordion` — stacked panels; triggers render with `aria-expanded`, collapsed panels use the `hidden` attribute.
- `::: collapsible` — one trigger/panel pair; `{.collapsed}` on the opener line (or as a container class) flips the default.

Both appear in the coverage matrix under "Disclosure" and in the 79-entry `SupportedType` codegen contract. With this family, wiremd reaches full 1:1 parity with coss's 54 documented UI primitives.
