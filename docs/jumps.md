## Jump Command (Yarn Spinner)

Source: [docs.yarnspinner.dev — Jump Command](https://docs.yarnspinner.dev/write-yarn-scripts/scripting-fundamentals/jumps)

### What it covers
- **`<<jump NodeTitle>>`**: transfer execution to another node by title.
- Visualized in graph views as an arrow to the target node.
- Works across files; node titles must be unique in the project.

### Example
```yarn
title: Start
---
Narrator: Proceeding to the next scene.
<<jump NextScene>>
===

title: NextScene
---
Narrator: We are in the next scene.
===
```


