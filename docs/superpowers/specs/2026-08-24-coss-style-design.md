# coss ui as wiremd's Primary Style — Design Spec

**Date:** 2026-08-24
**Status:** Approved design, pending implementation plan
**Upstream reference:** https://coss.com/ui/docs · https://github.com/cosscom/coss

## Summary

Add **coss** (Cal.com's design system, formerly Origin UI) to wiremd as its primary
visual style, deprecate all seven existing styles, and cover every coss primitive in
wiremd's component vocabulary plus a copy-pasteable codegen path. Work is phased into
three independently shippable releases.

## Ratified decisions

1. **Hybrid integration** — a hand-authored CSS theme for previews *plus* a codegen
   layer emitting copy-pasteable coss-flavored source.
2. **Deprecate first** — old styles stay selectable with warnings for one release;
   removed in the next major.
3. **All coss primitives covered** — particles are compositions of primitives, not
   individually coded components.
4. **Both codegen formats** — Tailwind HTML by default, React TSX via flag.

## Non-goals

- Dark mode (no existing theme has it).
- Interactive/JS behavior in rendered output — wiremd renders static wireframes.
- Live Tailwind compilation or vendoring coss's registry/build pipeline.
- Automatic syncing with upstream coss releases.
- Hand-coded implementations of individual particles (508 variants).

## 1. Architecture

No new runtime dependencies; the v1 syntax-local philosophy is preserved.

| Unit | Kind | Purpose |
| --- | --- | --- |
| `src/renderer/styles.ts` | modify | Add `getCossStyle(prefix)` theme; register `'coss'` in the switch |
| `src/codegen/coss/index.ts` | new | `generateCode(node, opts)` entry point; emitter dispatch |
| `src/codegen/coss/emitters/*.ts` | new | Per-primitive emitters (one module per family: forms, overlays, navigation, feedback, layout) |
| `src/parser/remark-containers.ts` | modify | Recognize new `:::` container names |
| `src/parser/transformer.ts` | modify | New AST node types for new primitives |
| `src/renderer/html-renderer.ts` | modify | Render cases for new node types |
| `src/cli/index.ts` | modify | Default style, deprecation warnings, `--codegen` flag |
| `docs/components/*` | modify | Catalog updates, coverage matrix, particles page |

Data flow is unchanged elsewhere: markdown → remark containers → transformer AST →
renderer (CSS theme applied) and, additionally for demo fences under coss style,
AST → codegen → source text in the demo code pane.

## 2. The `coss` theme

`getCossStyle(prefix)` follows the exact precedent of `getMaterialStyle()` /
`getTailwindStyle()`: a self-contained CSS string reusing the shared structural rules
(tabs, row, demo) already hoisted in `getStyleCSS()`, plus a coss-specific block.

Visual language (light mode only):

- Font: Inter stack — `'Inter', -apple-system, 'Segoe UI', sans-serif`.
- Surfaces: white on neutral gray page background (`#fafafa`-family); hairline borders.
- Primary actions: near-black fill (`#0a0a0a`-family), white label; secondary = white
  with border; ghost = borderless with hover tint.
- Shape: ~8px radii on interactive elements, ~12px on containers.
- Focus: subtle ring (2px offset outline) rather than heavy outlines.
- Typography scale matches existing themes' heading sizes; weights follow Inter norms.

`'coss'` becomes the **default style**: CLI default, `getStyleCSS` fallback branch,
programmatic API defaults, README, showcase docs.

## 3. Deprecation flow

- All existing styles (`sketch`, `clean`, `wireframe`, `none`, `tailwind`,
  `material`, `brutal`) remain valid selections this release. Each use prints:
  `Style '<name>' is deprecated and will be removed in the next major release — use --style coss`
  (once per invocation, via the existing logger).
- Export a single `WiremdStyle` union type from the public API; all option types,
  validation lists, and switch statements reference it so next-major removal is
  mechanical.
- Docs: `styles.md` keeps one short deprecation table; tutorials/examples move to coss.
- Next major: delete old theme functions and shrink the union to `'coss'` alone
  (`none` is deprecated on the same schedule as the themed styles).

## 4. Codegen layer

```ts
// src/codegen/coss/index.ts
export interface CodegenOptions {
  format: 'html' | 'jsx';      // default 'html'
}
export function generateCode(node: WiremdNode, opts: CodegenOptions): string;
```

- Emitters are pure functions `WiremdNode → string`, organized by component family.
- **`html` format:** semantic HTML carrying Tailwind class strings modeled on coss's
  MIT-licensed `apps/ui` component sources. Renders correctly in any project with
  Tailwind configured; zero JS required.
- **`jsx` format:** native elements (`<button>`, `<div>`, ...) with coss-aligned
  Tailwind class strings — no imports, no import-listing comment, no wrapper.
  **Supersedes the original design** (JSX with imports from `coss`/Base UI
  packages); ratified during Phase 2 implementation. Module/import generation
  remains `renderToReact`'s job; wiremd only generates fragment text.
- **CLI:** `--codegen <html|jsx>` (default `html`; invalid values error with options
  listed). Applies wherever generated code is displayed.
- **Demo fence integration:** when rendering HTML with `--style coss`, the demo
  fence's code pane shows `generateCode()` output instead of raw wiremd source.
  Prop `{.show-source}` restores raw source. Non-demo rendering is unchanged.
- Programmatic API exports `generateCode` from the package index.

## 5. Primitive expansion

Target: full coverage of coss's documented primitives. Dispositions:

**Already exist (restyle only):** alert*, badge, breadcrumb, button, card, checkbox,
input, radio/radio-group, select, separator, table, tabs, textarea, plus generic
containers (nav/grid/row) used for toolbar/group-like layouts.
(*alert parses today but renders as an unstyled `<div>` — finishing its renderer is
part of this work.)

**New syntax** (following the `::: name {.variant} Opener Title` fenced-container
convention; inline `[[...]]` where natural) — 42 primitives: accordion, alert-dialog, autocomplete,
avatar, calendar, checkbox-group, collapsible, combobox, command, context-menu,
date-picker, dialog, drawer, empty, field, fieldset, form, frame, group, input-group,
kbd, label, menu, meter, number-field, otp-field, pagination, popover, preview-card,
progress, scroll-area, segmented-control, sheet, skeleton, slider, spinner, switch,
toast, toggle, toggle-group, toolbar, tooltip.

Semantics for stateful primitives — **static wireframe states, no JavaScript**:

- `dialog`/`alert-dialog`/`sheet`/`drawer`: render as visible centered/side panels.
- `tooltip`/`popover`/`menu`/`context-menu`/`combobox`/`autocomplete`/`command`:
  render expanded, showing content.
- `toast`: visible notification block.
- `accordion`/`collapsible`: first item expanded by default; `{.expanded}` /
  `{.collapsed}` variants per item.
- `tabs` (existing): active tab shown.
- `skeleton`/`spinner`/`progress`/`meter`: indeterminate visual states.

Each new primitive ships with: parser recognition, AST node type, html-renderer case,
coss-theme CSS, codegen emitters (both formats), catalog doc, tests.

**Particles:** documented as compositions — a new `docs/components/particles.md` page
with runnable example fences assembling primitives into common patterns (login form,
pricing card, navbar, settings panel…). No dedicated particle code paths.

## 6. Documentation updates

- `docs/components/index.md`: coverage matrix (primitive × disposition × status).
- One catalog page per new primitive family, following existing page structure
  (syntax, variants, demo examples).
- `styles.md`: coss-first, deprecation table for legacy styles.
- README: quickstart uses `--style coss` implicitly (default); style section rewritten.
- `THIRD_PARTY_NOTICES.md`: attribution for class-string modeling on coss `apps/ui` (MIT).

## 7. Testing

- Unit: each codegen emitter (both formats); theme snapshot for `getCossStyle`;
  parser tests per new container; renderer cases per new node type.
- CLI: deprecation warning emitted once per run; `--codegen` validation errors;
  default-style resolution.
- E2E (Cypress): visual baselines for the coss style across the component catalog;
  demo-fence code-pane behavior under both codegen formats.
- Existing suites must stay green modulo the documented pre-existing DOM failures;
  size budget stays within the chunk guard.

## 8. Phasing & release gates

1. **Phase 1 — theme & deprecation:** `coss` style lands as default; warnings on old
   styles; docs rewritten. Gate: all renderers emit coss by default; e2e baselines added.
2. **Phase 2 — codegen:** `src/codegen/coss/` for the *existing* vocabulary; demo-fence
   integration; `--codegen` flag. Gate: every existing component round-trips through
   both formats with unit coverage.
3. **Phase 3 — primitives & particles:** the 42 new primitives + alert renderer fix +
   particles catalog. Gate: coverage matrix shows every primitive implemented; e2e
   baselines extended.

## Success criteria

- `wiremd wireframe.md` with no flags produces coss-styled HTML.
- Every coss primitive has working wiremd syntax, preview styling, and codegen output
  in both formats.
- Legacy styles still function but warn; removal is a mechanical next-major change.
- No runtime dependency growth; size budget respected.
