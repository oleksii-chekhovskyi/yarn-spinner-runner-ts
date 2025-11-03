## Enums (Yarn Spinner)

Source: [docs.yarnspinner.dev — Enums](https://docs.yarnspinner.dev/write-yarn-scripts/scripting-fundamentals/enums)

### What it covers
- Define named sets of values for clarity and safety.
- Compare enum values in conditions and assignments.

### Example
```yarn
title: Setup
---
<<declare Mood = enum { Happy, Neutral, Sad }>>
<<set currentMood = Mood.Happy>>
===

title: Check
---
{if currentMood == Mood.Happy}
    NPC: Great to see you!
{endif}
===
```


