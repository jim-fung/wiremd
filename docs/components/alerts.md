::: layout {.sidebar-main}

![[_sidebar.md]]

::: main

# Alerts

`::: alert` renders a highlighted message block with a coss-style tone. Add a variant class to control the color.

## Default

::: demo

::: alert
Your session will expire in 10 minutes.
:::

:::

## Variants

::: demo

::: alert {.success}
Profile updated successfully.
:::

:::

::: demo

::: alert {.info}
Heads up: a new release is available.
:::

:::

::: demo

::: alert {.warning}
You are approaching your storage limit.
:::

:::

::: demo

::: alert {.error}
Payment failed. Please check your card details.
:::

:::

## With Inline Content on Opener

Place content directly on the opener line to use it as a title/heading. The first paragraph becomes a bolded lead; remaining body content follows.

::: demo

::: alert {.warning} Storage limit reached

Upgrade your plan to continue uploading files.

[Upgrade Now]* [Dismiss]

:::

:::

## Codegen

`::: alert` blocks are emitted through the coss codegen layer (`--codegen html|jsx`) as coss-toned `<div role="alert">…</div>` fragments. See `docs/components/demo.md` for the codegen demo-pane behavior.

## Syntax

```
::: alert
Message text.
:::

::: alert {.success}
::: alert {.info}
::: alert {.warning}
::: alert {.error}

::: alert {.warning} Title text
Body content.
:::
```

:::

:::
