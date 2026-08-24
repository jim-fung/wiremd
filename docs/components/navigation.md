::: layout {.sidebar-main}

![[_sidebar.md]]

::: main

# Navigation

## Navbar

`[[ ... ]]` creates an inline container. Separate sections with `|`. The first item becomes the brand/logo.

::: demo
[[ Logo | [Home](./index.md) | Products | Pricing | Login | [Sign Up]* ]]
:::

## Active state

Wrap an item in `*asterisks*` to mark it as the active/current page:

::: demo
[[ Logo | Home | *Products* | About | Contact ]]
:::

## With icon and buttons

Use `:icon:` for the brand logo and embed `[Button]` items for actions:

::: demo
[[ :logo: Brand | Home | Features | Pricing | [Sign In] | [Get Started]* ]]
:::

## Breadcrumbs

Use `[[ ... ]]` with `>` separators for breadcrumb trails.

> **TODO:** crumb items render as `<ahref="#">` — real URLs not supported yet; see `[Text](url)` syntax proposal in renderer 

::: demo
[[ Home > Settings > Profile ]]
:::



## Sidebar Nav

`::: sidebar` creates a vertical nav panel, typically used inside `::: layout {.sidebar-main}`.

::: demo

::: sidebar

**App**

#### Main
[Dashboard]*
[Projects]
[Tasks]
[Calendar]

#### Account
[Settings]
[Billing]

---

[Logout]

:::

:::

## Pagination

::: demo
[← Prev] [1]* [2] [3] [4] [Next →]
:::

## Syntax

```
[[ Brand | Link | Link | [Action]* ]]    navbar

[[ Home > Section > Page ]]              breadcrumb

::: sidebar                              sidebar nav
[Link]*
[Link]
:::
```

:::

:::

## Navigation family (Phase 3 Task 4)

Five additional primitives with first-class codegen discriminants:

- `::: pagination` — bracket items become page links; the `*` marker sets `aria-current="page"`.
- `::: segmented-control` — `[Day]* [Week] [Month]` becomes a pill group with `aria-pressed`.
- `::: scroll-area {maxHeight:220}` — bordered overflow viewport with inline max-height.
- `::: sidebar` — now a dedicated discriminant: first heading is the header, list children render as a nav menu with `{.active}` support.
- `::: menubar` — horizontal `role="menubar"` bar for app-style menu triggers.

All five appear in the gallery page under "Navigation" and in the 52-entry `SupportedType` codegen contract.
