::: layout {.sidebar-main}

![[_sidebar.md]]

::: main

# Styles

wiremd renders wireframes through visual styles. As of this release the default and
recommended style is **coss**, modeled on the [coss ui](https://coss.com/ui/docs)
design system: Inter typography, neutral surfaces, black primary actions, subtle
focus rings.

## coss (default)

::: demo

# Dashboard

## Revenue

$12,480 [+8.2%]*

[New Report] [Export]

:::

All component pages in this catalog render their examples in coss.

## Deprecated styles

The following styles still work but print a deprecation warning and will be
removed in the next major release:

| Style | Look |
| --- | --- |
| `sketch` | Balsamiq-inspired hand-drawn (former default) |
| `clean` | Modern minimal |
| `wireframe` | Grayscale with hatching |
| `none` | Unstyled semantic HTML |
| `tailwind` | Utility-first look, purple accents |
| `material` | Material Design elevation |
| `brutal` | Neo-brutalism |

Select one explicitly: `wiremd page.md --style sketch`.

:::

:::
