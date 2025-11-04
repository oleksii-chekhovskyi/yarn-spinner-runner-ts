## Markup (Yarn Spinner)

Source: [docs.yarnspinner.dev — Markup](https://docs.yarnspinner.dev/write-yarn-scripts/advanced-scripting/markup)

### Supported formatting

The runtime now parses Yarn Spinner markup and surfaces it through `TextResult.markup` and option metadata. The React components (`DialogueView`, `TypingText`, and the option buttons) render this markup automatically.

- The following tags map directly to native HTML elements: `b`, `strong`, `em`, `small`, `sub`, `sup`, `ins`, `del`, and `mark`.
- Any other markup tag is rendered as a `<span>` with the class `yd-markup-<tagName>` so you can style or animate it via CSS.
- Markup attributes are exposed as `data-markup-*` attributes on the rendered element. For example `[wave speed=2]` renders `<span class="yd-markup-wave" data-markup-speed="2">`.

### Example

```yarn
title: Start
---
Narrator: Plain [b]bold[/b] [wave speed=2]custom[/wave]
===
```

The React renderer produces:

```html
Plain <b>bold</b> <span class="yd-markup-wave" data-markup-speed="2">custom</span>
```

### Integration notes

- Markup data is available on `TextResult.markup` and on each option entry (`result.options[i].markup`).
- `TypingText` respects markup while animating, so formatting stays intact during the typewriter effect.
- When a markup tag is not recognised, it remains in the output (as a span) rather than being stripped, so you can add custom CSS in your host application.

For the full markup vocabulary see the official Yarn Spinner documentation.
