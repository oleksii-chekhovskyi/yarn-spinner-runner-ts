## Saliency (Yarn Spinner)

Source: [docs.yarnspinner.dev — Saliency](https://docs.yarnspinner.dev/write-yarn-scripts/advanced-scripting/saliency)

### What it covers
- Mechanisms to score and choose among multiple narrative candidates.
- Authoring patterns to influence scoring with variables/tags.

### Example (conceptual)
```yarn
title: Candidate_A
---
// Conditions/tags make this salient when player is low health
Narrator: You look hurt. Rest a moment.
===

title: Candidate_B
---
Narrator: The path ahead is clear.
===
```

Selection between candidates is driven by your saliency system configuration.


