## Smart Variables (Yarn Spinner)

Source: [docs.yarnspinner.dev — Smart Variables](https://docs.yarnspinner.dev/write-yarn-scripts/scripting-fundamentals/smart-variables)

### What it covers
- Variables that reference game-side data or computed values.
- Enable referencing properties without manual syncing.

### Example (conceptual)
```yarn
title: HUD
---
Player: Health is {player.health} and gold is {player.gold}.
===
```

Implementation details depend on the host engine (Unity/Godot/Unreal) binding.


