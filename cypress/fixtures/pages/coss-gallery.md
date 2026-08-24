# coss Component Gallery

[[ Gallery | Overview | Components | [Docs] ]]

## Actions & Forms

[Save]* [Cancel] [Delete]-

::: demo
[Primary Button]* [Secondary] [Danger]-
:::

## Badges & Icons

|Default| |Primary|{.primary} |Success|{.success} |Warning|{.warning} |Error|{.error}

:check: Done  :star: Favorite  :heart: Like

::: row
[All]* [Active] [Archived]
:::

## Forms

::: demo
Name
[_____________________________]

Email
[_____________________________]{required}

Message
[Write your message here...]{rows:4}
:::

::: demo
Country
[Select country            v]
- United States
- United Kingdom
- Germany
:::

::: demo
- [ ] Remember me
- [x] Weekly digest
:::

::: demo
(•) Email ( ) SMS
:::

## Content

### Typography

Headings, paragraphs, and inline formatting in the coss type scale.

> Wireframes should be fast to write and easy to read.

Inline code `const x = 1` and a block:

```ts
export function greet(name: string): string {
  return `Hello, ${name}`;
}
```

### Table

| Name    | Role      | Status |
|---------|-----------|--------|
| Alice   | Admin     | Active |
| Bob     | Editor    | Active |
| Charlie | Viewer    | Invited |

### Lists

- First item
- Second item
- Nested:
  1. Ordered child
  2. Second child

---

## Navigation

::: tabs

::: tab Overview
Overview panel content.
:::

::: tab Activity
Activity panel content.
:::

:::

[[ Home > Products > Wireframes > Editor ]]

## Layout & Containers

::: row
[Filter]* [Sort] [Export]
:::

::: grid-2
::: card
### Grid Card A
First column.
:::
::: card
### Grid Card B
Second column.
:::
:::

::: card
### Card Container
Cards carry a border, radius, and subtle shadow in coss.
:::

::: hero
### Hero Container
Centered hero for landing pages.
[Get Started]*
:::

::: modal
### Modal Dialog
Static wireframe state: rendered open.
[Confirm]* [Cancel]
:::

## Alerts

::: alert
Your session will expire in 10 minutes.
:::

::: alert {.success}
Profile updated successfully.
:::

::: alert {.info}
Heads up: a new release is available.
:::

::: alert {.warning}
Storage limit reached
Upgrade your plan to continue uploading files.
[Upgrade Now]* [Dismiss]
:::

::: alert {.error}
Payment failed. Please check your card details.
:::

## Feedback

::: toast
Changes saved successfully.
:::

::: toast {.success}
Heads up
A new release is available.
:::

[⌘K]{.kbd} [K]{.kbd}

::: skeleton
:::

::: spinner
:::

::: progress {value:60}
Uploading…
:::

::: progress {.indeterminate}
Loading
:::

::: meter {value:30}
Storage
:::

## Overlays

::: dialog
### Edit profile
Name [____]
[Save]* [Cancel]
:::

::: alert-dialog
### Delete project?
This cannot be undone.
[Delete]{.danger}* [Cancel]
:::

::: sheet {.right}
### Filters
- Category
- Price
:::

::: drawer {.left}
### Menu
[Home] [Settings] [Logout]
:::

::: popover
### Quick actions
- Pin
- Share
- Delete
:::

::: tooltip
Press S to save
:::

## Demo Panes (codegen)

::: demo
::: card
### Generated Code Demo
[Save]*
:::
:::

::: demo {.show-source}
::: card
### Raw Source Demo
[Save]*
:::
:::
