# coss Particles

Composition demos that combine Phase 3 primitives into real-world UI patterns. Each block is a `::: demo` with a real wiremd AST that renders and shows the generated code on the right.

## Login form

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

## Signup form

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

## Pricing card

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

## Navbar

::: demo
[[Acme|brand] [Home] [Products] [Pricing] [About] [____] [Avatar]]
:::

## Settings panel

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

## Empty state

::: demo
::: empty
### No projects yet
Get started by creating your first project.
[Create project]*
:::
:::

## Confirmation dialog

::: demo
::: alert-dialog
### Delete project?
This action cannot be undone.
[Delete]*.danger [Cancel]
:::
:::

## Toast notification

::: demo
::: toast {.success}
Changes saved.
:::
:::

## Data table with toolbar

::: demo
[____] [Export]* [Filter]

| Project | Owner | Status | Updated
| --- | --- | --- | --- |
| Acme redesign | Ada | |badge|.success Live | 2h ago
| Mobile app | Linus | |badge|.warning Draft | Yesterday
| API gateway | Grace | |badge|.default Archived | Mar 4

[1]* [2] [3] [Next]
:::

## Profile dropdown

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

## Notification list

::: demo
- ! "Meeting at 2 PM" Ada · 5m
- ! "Build succeeded" GitHub · 1h
- ! "New comment on PR" Linus · 3h
- ! "Storage 90% full" System · 1d

[Mark all as read]
:::

## Onboarding stepper

::: demo
[1]*.primary Setup → [2] Invite team → [3] Publish
:::
