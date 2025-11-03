## Options (Yarn Spinner)

Source: [docs.yarnspinner.dev — Options](https://docs.yarnspinner.dev/write-yarn-scripts/scripting-fundamentals/options)

### What it covers
- **Options**: player choices written as lines prefixed with `->`.
- **Grouping**: options that appear consecutively (uninterrupted by non-indented lines) are delivered together.
- **Indented content**: lines under an option run only when that option is selected.
- **Nested options**: options can nest under options.

### Basic options
```yarn
title: Start
---
Navigator: We're arriving before we left.
-> Captain: Let's alter our trajectory and break this loop!
-> Captain: We must complete the cycle.
===
```

### Options with lines
```yarn
title: Start
---
-> Captain: Let's alter our trajectory and break this loop!
    Navigator: Risky, Captain.
-> Captain: We must complete the cycle.
    Navigator: Then we're doomed to repeat this moment.
===
```

### Nested options
```yarn
title: Start
---
-> Captain: Change course!
    Navigator: Understood.
    -> Captain: Do it now!
        Navigator: Aye.
    -> Captain: On second thought...
        Navigator: Standing by.
===
```


