## Detour Command (Yarn Spinner)

Source: [docs.yarnspinner.dev — Detour](https://docs.yarnspinner.dev/write-yarn-scripts/scripting-fundamentals/detour)

### What it covers
- **`<<detour NodeTitle>>`**: temporarily visit another node and return when it finishes.
- Useful for side conversations, tooltips, or contextual asides.

### Example
```yarn
title: Main
---
Narrator: Before we continue, a quick aside.
<<detour Aside>>
Narrator: Back to the main thread.
===

title: Aside
---
Narrator: Here's some extra info.
===
```


