## Flow Control (Yarn Spinner)

Source: [docs.yarnspinner.dev — Flow Control](https://docs.yarnspinner.dev/write-yarn-scripts/scripting-fundamentals/flow-control)

### What it covers
- Conditional blocks with `{if}`, `{else if}`, `{else}`, `{endif}`.
- Loops and structural control features provided by Yarn (engine-dependent usage).
- Combining flow with variables and options.

### Example
```yarn
title: Start
---
<<set affinity = 3>>
{if affinity >= 5}
    NPC: We're close friends.
{else if affinity >= 2}
    NPC: We're friendly enough.
{else}
    NPC: Do I know you?
{endif}
===
```


