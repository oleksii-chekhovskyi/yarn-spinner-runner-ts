## Once (Yarn Spinner)

Source: [docs.yarnspinner.dev — Once](https://docs.yarnspinner.dev/write-yarn-scripts/scripting-fundamentalsendonce)

### What it covers
- Ensure a section runs only the first time it’s reached.
- Useful for tutorials, first-time greetings, unique rewards.

### Example
```yarn
title: Start
---
<<once>>
    Guide: Welcome! This shows only once.
<<endonce>>

Guide: This shows every time.
===
```


