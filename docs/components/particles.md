# Particles — Composition Catalog

Phase 3 Task 7: particles are compositions of primitives, not new code paths. Each recipe below is a real wiremd document that renders through the coss theme and generates standalone HTML/JSX through the codegen layer. The live versions live in `cypress/fixtures/pages/coss-particles.md` and are exercised by the `coss particles` Cypress suite.

## 1. Login form

```
::: demo
::: card
### Sign in
Email
[____________________]
Password
[____________________]
[Forgot password?]

[Sign in]*
[Create account]
:::
:::
```

Primitives: card + input + button. The `*` marks the primary action.

## 2. Signup form

```
::: demo
::: card
### Create account
Full name
[____________________]
Email
[____________________]
Password
[____________________]
[x] I agree to the Terms of Service and Privacy Policy.
[Create account]*
:::
:::
```

Primitives: card + input + checkbox + button.

## 3. Pricing card

```
::: demo
::: card
### Pro plan
|badge|.success Most popular

- Unlimited projects
- Priority support
- 50 GB storage
- Custom domain

$29 / month
[Start free trial]*
[Compare plans]
:::
:::
```

Primitives: card + badge + list + button. Keep blank lines around the list so the feature list terminates cleanly.

## 4. Navbar

```
::: demo
[[Acme|brand] [Home] [Products] [Pricing] [About] [____] [Avatar]]
:::
```

Primitives: inline nav container + brand + nav items + input + avatar link.

## 5. Settings panel

```
::: demo
::: layout {.sidebar-main}

::: sidebar
### Workspace
- Profile
- Notifications
- Billing
- Security

:::

::: main
### Notifications
::: switch {.checked} {label:"Email notifications"}
:::

::: switch {label:"Marketing emails"}
:::

::: switch {.checked} {label:"Product updates"}
:::

[Save changes]*

:::

:::

:::
```

Primitives: layout (sidebar-main) + sidebar nav + heading + switch + button. Every closer in this block is blank-line separated (see gotchas); the switches use the `::: switch` container form with `{label:"..."}`.

## 6. Empty state

```
::: demo
::: empty
### No projects yet
Get started by creating your first project.
[Create project]*
:::
:::
```

Primitives: empty + heading + button.

## 7. Confirmation dialog

```
::: demo
::: alert-dialog
### Delete project?
This action cannot be undone.
[Delete]*.danger [Cancel]
:::
:::
```

Primitives: alert-dialog (title from opener heading, auto Cancel/action row, danger variant).

## 8. Toast notification

```
::: demo
::: toast {.success}
Changes saved.
:::
:::
```

Primitives: toast with success variant.

## 9. Data table with toolbar

```
::: demo
[____] [Export]* [Filter]

| Project | Owner | Status | Updated
| --- | --- | --- | --- |
| Acme redesign | Ada | |badge|.success Live | 2h ago
| Mobile app | Linus | |badge|.warning Draft | Yesterday
| API gateway | Grace | |badge|.default Archived | Mar 4

[1]* [2] [3] [Next]
:::
```

Primitives: inline nav (toolbar) + input + button + table + badge + pagination.

## 10. Profile dropdown

```
::: demo
::: popover
### Profile
- View profile
- Settings
- Help
- [Sign out]

ada@acme.com
:::
:::
```

Primitives: popover + heading + list + button link. The trailing muted line both anchors the menu visually and keeps the container's last child a paragraph (see gotchas).

## 11. Notification list

```
::: demo
- ! "Meeting at 2 PM" Ada · 5m
- ! "Build succeeded" GitHub · 1h
- ! "New comment on PR" Linus · 3h
- ! "Storage 90% full" System · 1d

[Mark all as read]
:::
```

Primitives: list with icon markers + button. The trailing button closes the composition and keeps the demo's last child a paragraph.

## 12. Onboarding stepper

```
::: demo
[1]*.primary Setup → [2] Invite team → [3] Publish
:::
```

Primitives: button row with primary marker as the current step; the `→` separators are plain text.

## Gotchas learned while building this catalog

- **Never end a block with a tight run of bare closers (`:::\n:::` on its own).** When two or more `:::` closers sit back-to-back with no content line above them *and* no blank line between them, remark folds them into one paragraph; the container machinery strips only the trailing `\n:::` and absorbs the first `:::` as literal child text, closing just one level. The enclosing `::: demo` then never receives its closer and swallows every following block (heading + demo at a time) until a later closer happens to rebalance the count. Separate the final closers with blank lines — each standalone `:::` paragraph closes exactly one nesting level. This is why the settings panel ends with `:::` / blank / `:::`.
- **A blank line before a closer is safe inside nested layouts.** A blank-line-separated `:::` becomes a standalone closer paragraph and terminates exactly one container; a tight `content\n:::` also works (the implicit-closer path strips the trailing closer run and propagates the surplus upward). Recipes 1–3 and 7–8 end with tight `content\n:::\n:::` pairs and parse fine *because the closer run follows a content line in the same paragraph*.
- **Avoid ending a nested container with a bare list when using tight closers.** Markdown lazy continuation folds a tight `:::` (and even the following `::: main` opener) into the last list item's text. A blank line before the closer terminates the list cleanly; a trailing paragraph or button line after the list also works (recipes 10 and 11 do this on purpose).
- **Switches are containers, not line syntax.** `[switch:checked]` on a text line renders as literal text; use `::: switch {.checked} {label:"..."}` blocks (see the settings panel and the coss gallery).
- **Lists lazy-continue across blank-less lines.** In the pricing card, `$29 / month` and the CTA buttons must come *after* a blank line or they join the last feature bullet.
