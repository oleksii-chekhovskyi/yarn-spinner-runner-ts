## Custom CSS Attribute (&css{})

This project adds a custom `&css{}` attribute to Yarn scripts to carry UI styles to consumers (e.g., React components).

### Node-level CSS

Attach a CSS block to a node header value by starting it with `&css{` and closing it with `}`. The block may span multiple lines until the closing brace, and must appear before the `---` line.

```yarn
title: Scene2
style: &css{
  backgroundColor: red;
  color: white;
  fontFamily: "Arial", sans-serif;
}
---
Narrator: Hello!
===
```

Parsed into `YarnNode.css` and propagated to IR (`IRNode.css`).

### Option-level CSS (inline)

Append an inline `&css{...}` to an option text to style that option.

```yarn
-> Option 1 &css{backgroundColor: blue; color: white;}
    Narrator: You chose option 1.
-> Option 2 &css{backgroundColor: green; color: black;}
    Narrator: You chose option 2.
```

Parsed into `Option.css`, passed through IR, and emitted at runtime on `options` results:

```ts
if (result.type === "options") {
  // result.options[i].css contains the inline CSS string
}
```

### Notes

- The CSS content is treated as a raw string (not parsed). Use a simple `property: value;` format that your UI layer can interpret.
- This feature is additive and does not affect core Yarn semantics.


