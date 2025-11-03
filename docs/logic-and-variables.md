## Logic and Variables (Yarn Spinner)

Source: [docs.yarnspinner.dev — Logic and Variables](https://docs.yarnspinner.dev/write-yarn-scripts/scripting-fundamentals/logic-and-variables)

### What it covers
- Declaring and using variables; reading and writing from the game.
- Basic expressions for conditions and assignments.
- Interpolating values in lines.

### Examples
```yarn
title: Start
---
<<set hasKey = true>>
<<set score = 10 + 5>>

{if hasKey}
    Narrator: You unlock the door. Score: {score}
{else}
    Narrator: The door is locked.
{endif}
===
```


