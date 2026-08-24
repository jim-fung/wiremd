# Data Entry Family

Phase 3 Task 5: fifteen primitives that cover form structure and input controls. The renderer emits the canonical coss shadcn markup; the codegen layer produces the same markup as a standalone HTML or JSX fragment.

## Syntax

### Form — `::: form`

```
::: form
### Sign in
Email [____]
Password [____]
[Sign in]*
:::
```

A semantic `<form>` wrapper (`flex flex-col gap-4` in codegen). Optional `action` and `method` props pass through as attributes.

### Field — `::: field`

```
::: field {label:"Workspace name" description:"Shown on invoices" error:"Required"}
[____]
:::
```

Label, description, and error can also come from props (quoted values support spaces: `{label:"Two words"}`). The error renders with `role="alert"` and red text. A leading `###` heading inside the container is promoted to the label.

### Fieldset — `::: fieldset`

```
::: fieldset
### Notifications
[x] Email notifications
[ ] SMS notifications
:::
```

A leading heading becomes the `<legend>`. `{description:"..."}` adds a muted line under the legend.

### Label — `::: label`

```
::: label
Email address
:::
```

Plain text child becomes the label text. `{htmlFor:"email"}` emits `for="email"`.

### Input group — `::: input-group`

```
::: input-group {addonStart:"https://example.com/"}
[username____]
:::

::: input-group {addonEnd:".com"}
[name____]
:::
```

Add-ons render as bordered segments joined to the input: `addonStart` before (with `border-r`), `addonEnd` after (with `border-l`).

### OTP field — `::: otp-field`

```
::: otp-field
:::

::: otp-field {length:4}
:::
```

Renders a row of one-character inputs (`inputMode="numeric"`, `maxLength="1"`, digit `aria-label`). Default length is 6.

### Number field — `::: number-field`

```
::: number-field {value:3 min:0 max:10 step:1 placeholder:"Quantity"}
:::
```

A numeric input with `min`/`max`/`step`/`value` attributes and Increase/Decrease stepper buttons (`aria-label`s). All numeric props are optional.

### Autocomplete — `::: autocomplete`

```
::: autocomplete {placeholder:"Search fruits..."}
- Apple
- Banana
- Cherry

:::
```

List children become the suggestion listbox (`role="option"` items); the input gets `role="combobox"` + `aria-autocomplete="list"`. **Put a blank line before the closing fence** so the last list item does not absorb it (remark container quirk).

### Combobox — `::: combobox`

```
::: combobox {placeholder:"Select country..."}
- United States
- Canada

:::
```

Same list-harvesting as autocomplete, but the input also gets a caret affordance. Options live in `props.options` (autocomplete uses `props.suggestions`).

### Command — `::: command`

```
::: command {placeholder:"Type a command..."}
- Copy
- Paste

:::
```

Renders a command palette: search input with `placeholder` over the children list. In codegen the wrapper carries `role="dialog"` + `aria-label="Command menu"`.

### Checkbox group — `::: checkbox-group`

```
::: checkbox-group {label:"Interests" description:"Pick all that apply"}
[x] Design
[ ] Engineering

:::
```

A `role="group"` wrapper with a bold label and muted description. A leading `###` heading is promoted to the label.

### Toggle group — `::: toggle-group`

```
::: toggle-group
[Star]* [Heart] [Bookmark]
:::
```

A row of toggle buttons. The `*` primary marker becomes `aria-pressed="true"` with dark classes; the rest render `aria-pressed="false"`.

### Switch — `::: switch`

```
::: switch {.checked} {label:"Email notifications"}
:::

::: switch {label:"Marketing emails"}
:::
```

`role="switch"` with `aria-checked`. The `.checked` class (or `{checked}` boolean prop) selects the dark track; default is off. `label` lays out the control and text in a row.

### Slider — `::: slider`

```
::: slider {value:70 min:0 max:100 label:"Volume"}
:::
```

`role="slider"` with `aria-valuenow`/`aria-valuemin`/`aria-valuemax`. The fill and thumb are positioned at `value / (max - min)` percent (clamped), rendered as `style="width:N%"`. Defaults: value 50, min 0, max 100.

### Toggle — `::: toggle`

```
::: toggle {.active} {label:"Bold"}
:::
```

A single pressed/unpressed button. `.active` (or `.pressed`, or `{pressed}` prop) sets `aria-pressed="true"` with dark classes; default is unpressed muted.

## Parser promotions

- `form`/`field`/`fieldset`/`checkbox-group`: first heading child → label/legend
- `autocomplete`/`combobox`: list children → string options
- `switch`: `.checked` class or `checked:true` prop → `checked` field
- `slider`: numeric `value`/`min`/`max`/`step` props
- `toggle`: `.active`/`.pressed` class → `pressed` field
- quoted attribute values (`{label:"Multi word"}`) survive the space-splitting tokenizer

## Gotchas

- A list directly against the closing fence (no blank line) absorbs the fence into the last list item — leave one blank line before `:::` for containers whose last child is a list.
- The bare `[____]` input token produces a `null` sibling in some inline paths; codegen now filters null children defensively (parser-side normalization is future work).
