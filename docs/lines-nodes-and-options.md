## Nodes and Lines (Yarn Spinner)

Source: [docs.yarnspinner.dev — Nodes and Lines](https://docs.yarnspinner.dev/write-yarn-scripts/scripting-fundamentals/lines-nodes-and-options)

### What it covers
- **Nodes**: titled containers for dialogue. Headers above `---`, body between `---` and `===`.
- **Lines**: dialogue or narration lines emitted to the game one at a time.
- **Character prefix**: `Name: Dialogue` marks the speaking character.
- **Node rules**: titles start with a letter; letters/numbers/underscores only; no `.`.

### Basic structure
```yarn
title: Start
---
Narrator: Hi, I'm the narrator for the documentation!
===
```

### Character speaking vs narration
```yarn
This is a line of dialogue, without a character name.
Speaker: This is another line said by a character called "Speaker".
```

### Tips
- Use multiple nodes to manage long or branching stories.
- Additional headers (e.g., `color:`, `group:`) organize nodes in editors.
- The game decides how to render each delivered line.


