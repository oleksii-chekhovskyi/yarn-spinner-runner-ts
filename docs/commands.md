## Commands (Yarn Spinner)

Source: [docs.yarnspinner.dev — Commands](https://docs.yarnspinner.dev/write-yarn-scripts/scripting-fundamentals/commands)

### What it covers
- Inline instructions to the host game/engine using `<<command ...>>`.
- Often used to trigger animations, SFX, gameplay events, or state changes.

### Examples
```yarn
title: Start
---
Narrator: Opening the door.
<<play_sfx name="door_open">>
<<animate target="Door" action="Open">>
===
```

Exact command names and parameters are defined by your game integration.


