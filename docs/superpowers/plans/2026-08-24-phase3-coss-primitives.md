# Phase 3: coss Primitives + Particles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 42 coss primitives (with parser, AST, renderer, codegen, theme, doc page, and tests for each), finish the `::: alert` renderer, and produce a particles catalog — so every coss primitive has working wiremd syntax, preview styling, and codegen output in both formats.

**Architecture:** Each new primitive is one AST node type. The `:::` parser convention is already universal (`containerType: 'name'`), so most new primitives only need: (a) a new `WiremdNode` discriminant, (b) a `transformContainer` clause that re-tags the right `containerType`, (c) an `html-renderer.ts` case, (d) a coss-style CSS block, (e) a codegen emitter (HTML + JSX), (f) tests, (g) a doc page. Stateful primitives render their static visual state per spec §5 (no JS). Particles are documented as compositions of primitives; no new code paths.

**Tech Stack:** TypeScript, Bun, Vitest, Cypress. No new runtime dependencies.

## Global Constraints (Phase 3)

- Use Bun commands (`bun run test`, `bun run build`, `bun run test:e2e`).
- Add no runtime dependencies and no Tailwind compiler.
- All coss `apps/ui` code at `/Users/dekal/tooling/coss` is **MIT-licensed** (`apps/ui/package.json` `license: MIT`); model class strings only, never copy source.
- For each new primitive produce: parser recognition → AST node type → `html-renderer.ts` case → coss CSS in `getCossStyle` → codegen emitter (HTML + JSX) → catalog doc → Vitest unit tests → Cypress e2e assertion where visual.
- Stateful primitives render **static visual states only, no JavaScript** (spec §5):
  - `dialog`/`alert-dialog`/`sheet`/`drawer`: visible centered/side panels
  - `tooltip`/`popover`/`menu`/`context-menu`/`combobox`/`autocomplete`/`command`: render expanded showing content
  - `toast`: visible notification block
  - `accordion`/`collapsible`: first item expanded; per-item `{.expanded}` / `{.collapsed}` overrides
  - `skeleton`/`spinner`/`progress`/`meter`: indeterminate visual states
- All emitters must satisfy the existing 34-discriminant dispatcher contract: deterministic, escaped, safe URLs. New emitters extend `SupportedType` and the `FAMILY_EMITTERS` table in `src/codegen/coss/index.ts` only (no other file in the codegen layer edits the dispatcher).
- New `WiremdNode` discriminants are added in a single `src/types.ts` edit each task lands (or one additive PR per family if multiple node types land together). Backward-compatible: existing tests must stay green.
- Theme CSS lives in `getCossStyle` (Phase 1 anchor) and follows the established conventions: `Inter` stack, neutral zinc palette (`#0a0a0a` primary, `#fafafa` bg), `rounded-lg`/`rounded-xl` for radii, `1px solid #e4e4e7` borders, `shadow-sm`/`shadow-xl` for elevation. No `@import`, no font fetches.
- `::: alert` already parses to `container` with `containerType: 'alert'` and a `containerType: 'alert'` is in the `WiremdNode` union (it currently falls through to the generic `container` case). Phase 3 adds a dedicated `containerType: 'alert'` branch to `renderContainer` plus a `containerClasses('alert')` case in the codegen emitter (coss alert: `rounded-xl border px-3.5 py-3 text-sm` with variant backgrounds). The existing `alert` AST node type stays untouched and is used when a node carries an explicit `alertType`; for `::: alert` blocks the simpler `container` path remains.
- Cypress e2e: each new primitive family gets a section in `cypress/fixtures/pages/coss-gallery.md` and assertions in `cypress/e2e/coss-components.cy.ts`. Visual evidence captured per family.
- Bundle size stays within the existing chunk guard.

---

## Task 1: Alert renderer fix + alert codegen emitter

The smallest end-to-end slice — closes one spec §5 deferred item and exercises the new emitter + CSS pattern for the remaining 41.

**Files:**
- Modify: `src/renderer/html-renderer.ts` (alert branch in `renderContainer`)
- Modify: `src/renderer/styles.ts` (alert CSS in `getCossStyle`)
- Modify: `src/codegen/coss/types.ts` (extend `SupportedType` with `'alert'` and add `alert` clause to family table note)
- Modify: `src/codegen/coss/index.ts` (register `emitAlert`)
- Create: `src/codegen/coss/emitters/feedback.ts` (initial home for `emitAlert`, future toast/snackbar/etc.)
- Create: `tests/coss-codegen-feedback.test.ts`
- Modify: `cypress/fixtures/pages/coss-gallery.md` (alert section)
- Modify: `cypress/e2e/coss-components.cy.ts` (alert test)
- Modify: `docs/components/alerts.md` (remove "Not yet implemented" note; add codegen demo)

**Behavior:**
- `::: alert` → `<div class="wmd-container-alert" role="alert">…</div>`
- `::: alert {.success|info|warning|error}` → variant tone via `wmd-container-alert-{variant}` class
- Opener line `::: alert {.warning} Title text` → `Title text` becomes a bolded lead paragraph; body follows.
- Codegen `generateCode([alertNode], { format: 'html' })` → coss-flavored `<div role="alert" class="…">{children}</div>` with variant background; JSX uses `className`.
- Cypress test asserts: alert rendered with `role="alert"`, variant class, and visible body.

- [ ] **Step 1: Write failing unit test** — `tests/coss-codegen-feedback.test.ts` covers the `emitAlert` happy path for each of the four variants, HTML and JSX formats, plus the "throws on direct `form`" guard (still).

- [ ] **Step 2: Run red** — `bun run test -- tests/coss-codegen-feedback.test.ts`; expect missing `feedback.ts` import error.

- [ ] **Step 3: Implement emitter** — `src/codegen/coss/emitters/feedback.ts` with `emitAlert`. Register in `src/codegen/coss/index.ts` `FAMILY_EMITTERS` table. Add `'alert'` to `SupportedType` in `types.ts`. Use the existing per-family helpers (`classAttr`, `element`, `childFragments` — local copies or imports from a shared module if the layout/navigation pattern is consolidated; otherwise copy-paste per the family-module pattern).

- [ ] **Step 4: Implement renderer branch** — `renderContainer` recognizes `containerType === 'alert'`, branches to dedicated markup, with an opener-line title pattern (if the first child is a `paragraph` whose `content` matches a stored opener title — store via `props.data.title` set by the parser if needed; otherwise use the variant-only path). CSS in `getCossStyle` adds `.wmd-container-alert`, `.wmd-container-alert-success`, etc. per coss tokens.

- [ ] **Step 5: Wire docs and e2e** — `docs/components/alerts.md` shows codegen output via `::: demo`; `coss-gallery.md` adds a 4-variant section; Cypress test asserts presence + variant.

- [ ] **Step 6: Run green** — `bun run test`, `bun run build`, `bun run test:e2e`. All green.

---

## Task 2: Feedback family — toast, skeleton, spinner, kbd, progress, meter

Five small primitives sharing the `feedback.ts` codegen home.

**Files:**
- Modify: `src/types.ts` (six new discriminants)
- Modify: `src/parser/transformer.ts` (six new `containerType` clauses)
- Modify: `src/renderer/html-renderer.ts` (six new render cases + new `renderKbd` since kbd is inline)
- Modify: `src/renderer/styles.ts` (six CSS blocks)
- Modify: `src/codegen/coss/types.ts`, `index.ts`, `emitters/feedback.ts`
- Create: `tests/coss-codegen-feedback.test.ts` (extend Task 1's test)
- Modify: `cypress/fixtures/pages/coss-gallery.md` (feedback section)
- Modify: `cypress/e2e/coss-components.cy.ts` (feedback test)
- Create: `docs/components/feedback.md`

**Syntax (parser additions, all following `:::` convention):**

```
::: toast
Changes saved.
:::

::: skeleton
::::

::: spinner
::::

[⌘K]{.kbd} [K]{.kbd}                              <!-- inline kbd: [text]{.kbd} -->

[============>-----------]{progress:60}            <!-- progress: variant of input? No — new container -->
```

- `kbd` extends the button/link bracket syntax (`[text]{.kbd}`) — parser detects the `.kbd` class and emits a `kbd` node.
- `progress` and `meter` use a new `::: progress` / `::: meter` container with the value as a class (`{.value-60}`) or a `{value:60}` attribute on the container; chose **attribute** for determinism. Indeterminate via `{.indeterminate}`.
- `spinner` / `skeleton` / `toast` are self-contained blocks.

**Renderer:** static visual states per spec. `toast` = bottom-anchored card with title + description; `skeleton` = shimmer rectangles; `spinner` = spinning circle; `progress`/`meter` = horizontal track with fill. kbd = inline `<kbd>` with rounded border.

- [ ] **Step 1: Failing tests** — extend `tests/coss-codegen-feedback.test.ts` with each new emitter (HTML+JSX); Cypress test asserts each renders.
- [ ] **Step 2: Implement parser** — six new `containerType` clauses; `[text]{.kbd}` shortcut.
- [ ] **Step 3: Implement renderer + CSS** — six cases; six CSS blocks in `getCossStyle`.
- [ ] **Step 4: Implement emitters** — six emitters in `feedback.ts`; register.
- [ ] **Step 5: Docs + e2e** — `docs/components/feedback.md` catalog; gallery section; Cypress assertions.
- [ ] **Step 6: Green** — all three suites pass.

---

## Task 3: Overlay family — dialog, alert-dialog, sheet, drawer, popover, tooltip, preview-card

Seven primitives that render as static visible panels.

**Files:**
- Modify: `src/types.ts` (seven new discriminants)
- Modify: `src/parser/transformer.ts` (seven new clauses)
- Modify: `src/renderer/html-renderer.ts` (seven new cases)
- Modify: `src/renderer/styles.ts` (overlay CSS: `position: fixed`, `z-50`, backdrops)
- Modify: `src/codegen/coss/index.ts`, `types.ts`, `emitters/feedback.ts` (move overlay emitters here or split into `overlays.ts`)
- Create: `tests/coss-codegen-overlays.test.ts`
- Modify: `cypress/fixtures/pages/coss-gallery.md`
- Modify: `cypress/e2e/coss-components.cy.ts`
- Create: `docs/components/overlays.md`

**Syntax:**
```
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
[[Home]] [[Settings]] [Logout]{.danger}
:::

::: popover
### Quick actions
- Pin
- Share
- Delete
:::

::: tooltip
Press [S] to save
:::
```

- `preview-card` is a card variant (`{:.preview-card}` on `::: card` works too) — wire both for completeness.

- [ ] Steps follow the same six-step pattern: failing tests → parser → renderer+CSS → emitters → docs+e2e → green gate.

---

## Task 4: Navigation family — pagination, segmented-control, breadcrumb enhancements, scroll-area, sidebar, navigation-menu, menubar

Seven primitives (some are compositions of `row`/`nav` already partly supported).

**Files:** mirror Tasks 2/3.

**Syntax:**
```
::: pagination
[< Prev] [1] [2]* [3] [Next >]
:::

::: segmented-control
[Day]* [Week] [Month] [Year]
:::

[[Home]] / [[Products]] / [Shoes]                  <!-- existing breadcrumbs handle, verify enhanced -->
```

- `scroll-area` is a styled container with overflow; `sidebar`/`menubar` reuse `containerType: 'sidebar'` patterns.

---

## Task 5: Data entry family — form, field, fieldset, label, input-group, otp-field, number-field, autocomplete, combobox, command, checkbox-group, switch, slider, toggle, toggle-group

14 primitives. Some are meta (form, field, fieldset — wrap existing inputs); others are new inputs (switch, slider, toggle, number, otp).

**Files:** mirror Tasks 2/3. Add `src/codegen/coss/emitters/data-entry.ts` (or split across `forms.ts` and new file if it grows).

**Syntax:**
```
::: form
Email [____]
Password [____]
[Sign in]*
:::

::: field
Label
[____]
:::

::: fieldset
### Notifications
[x] Email
[ ] SMS
:::

::: label
Email address
:::

::: input-group
https://example.com/[username]
:::

::: otp-field
[ _ ][ _ ][ _ ][ _ ][ _ ][ _ ]
:::

[_]{type:switch}                                  <!-- switch: existing input extension -->
[--------●--]{min:0 max:100 value:70}             <!-- slider: existing input extension -->
```

- `switch`, `slider`, `toggle`, `number-field`, `autocomplete`, `combobox`, `command` all extend the existing `input` node with `inputType` and a coss-style renderer branch per type.

---

## Task 6: Display family — avatar, frame, group, empty, calendar, date-picker, table (enhance), pagination (verify)

Seven primitives. `avatar` extends `image` with `{.avatar}` class; `frame` is a generic media container; `group` reuses `containerType: 'button-group'` with a class; `empty`/`loading`/`error` state containers exist already in the union but have no dedicated renderer.

**Files:** mirror Tasks 2/3. Add `src/codegen/coss/emitters/display.ts`.

- [ ] Six-step pattern. `empty`/`loading`/`error` renderers close the spec §5 promise for state components.

---

## Task 7: Particles catalog — `docs/components/particles.md`

A documentation-only task. No new code paths.

**Files:**
- Create: `docs/components/particles.md`
- Create: `cypress/fixtures/pages/coss-particles.md` (compositions page used in e2e)
- Modify: `cypress/e2e/coss-components.cy.ts` (particles test that loads the page and asserts presence of each composition)

**Content (10–12 composition examples — particles per spec §5):**
1. Login form — `::: card` + form group + primary button + forgot link
2. Signup form — multi-field form-group + terms checkbox
3. Pricing card — `::: card` + badge + grid of features + CTA buttons
4. Navbar — `::: nav` + brand + nav items + search input + avatar
5. Settings panel — sidebar + form-group + switch row + save bar
6. Empty state — `::: empty` + icon + heading + CTA
7. Confirmation dialog — `::: alert-dialog` (reuses Task 3)
8. Toast notification — `::: toast` (reuses Task 2)
9. Data table with toolbar — `::: row` + search input + table + pagination
10. Profile dropdown — `::: popover` (reuses Task 3) with menu items
11. Notification list — list of cards with avatars + badges + timestamps
12. Onboarding stepper — `::: stepper` (uses `::: row` with `{.stepper}` class + numbered badges)

Each composition is a single `::: demo` block with a real wiremd AST that renders + a one-line note on the primitives used.

- [ ] **Step 1: Doc page** — 12 examples with prose describing which primitives compose each.
- [ ] **Step 2: Gallery page** — `coss-particles.md` with the same 12 compositions as `::: demo` blocks.
- [ ] **Step 3: Cypress test** — load `/coss-particles.md`, assert each composition renders its top-level primitive (`nav`, `card`, `dialog`, `toast`, `popover`, `table`).
- [ ] **Step 4: Green** — `bun run test`, `bun run build`, `bun run test:e2e`.

---

## Task 8: Coverage matrix + final docs sweep

- [ ] **Step 1:** Update `docs/components/index.md` with a 5-column coverage matrix: primitive | wiremd syntax | AST node | renderer case | codegen emitter | status (✅ done / 🚧 partial). Mark each of the 42 from the spec.
- [ ] **Step 2:** Update `docs/superpowers/specs/2026-08-24-coss-style-design.md` Success Criteria to add a per-primitive verification table referencing the new matrix.
- [ ] **Step 3:** Update `README.md` with a "Supported primitives" section linking the matrix.
- [ ] **Step 4:** Add `THIRD_PARTY_NOTICES.md` line for each coss primitive family whose class strings were modeled (already in place from Phase 1; verify scope).
- [ ] **Step 5:** `bun run test`, `bun run build`, `bun run test:e2e` all green; full Cypress run archived to `cypress/runs/<stamp>-pass/`.

---

## Out of scope (deferred)

- Form validation messages inside `::: field` (would require a stateful sub-tree) — wiremd keeps fields as static layouts.
- Toolbar / context-menu keyboard interactions — static expanded state only per spec.
- Calendar date selection — renders the month grid; selection is a static `{.selected}` marker on a cell.
- Particles beyond the 12 in `particles.md` (508 total in `registry/default/particles/`) — explicitly the spec's "documented as compositions" decision.

## Risk register

- **Parser ambiguity:** `::: card`, `::: grid-N`, `::: tabs`, `::: accordion` all share the `:::` container shape. New container types slot in by exact string match — no risk of collision if names are unique. The 42 spec names are disjoint.
- **Emitter family sprawl:** five new families (feedback, overlays, data-entry, display, navigation-extended) plus the existing five. Mitigation: copy the established per-family helper pattern (helpers are duplicated across files per Phase 2 design); consider extracting shared helpers into a new `emitters/_shared.ts` only if a 6th file needs them.
- **Bundle size:** 42 new emitters adds ~3–4KB. The Phase 1 chunk guard is 6.75MB; we're nowhere near it. Monitor at Task 8.
- **License:** all `apps/ui` is MIT (verified). No AGPL code modeled. coss `apps/origin` is AGPLv3 — we don't touch it.
- **Cypress flake:** the existing `coss-gallery.md` already covers 17 passing tests. New family sections should follow the same patterns (assert element presence + per-variant class). No interactive behavior to flake on (spec §5 mandates static states).
