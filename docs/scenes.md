# Scene System

The scene system provides visual backgrounds and actor images for dialogue scenes.

> 📖 **Detailed Setup Guide**: See [Scenes and Actors Setup](./scenes-actors-setup.md) for complete configuration instructions.

## Quick Overview

Scenes and actors are configured separately in YAML:

```yaml
scenes:
  scene1: https://example.com/background1.jpg
  
actors:
  user: https://example.com/user.png
  Narrator: https://example.com/narrator.png
```

## Features

1. **Background Transitions**: When a scene changes, the background smoothly fades from the old to the new image.
2. **Persistent Backgrounds**: Once a scene is set, the background persists until a new scene is specified.
3. **Actor Images**: Only the speaking actor's image appears at the top center of the scene.
4. **Fallback**: If no scene is specified or an actor has no image, the system falls back to text-only display.

## Using Scenes in Yarn Scripts

Add a `scene:` header to any node:

```yarn
title: Start
scene: scene1
---
Narrator: Welcome to the adventure!
User: Let's begin!
===
```

## Integration

Pass scene configuration to `DialogueView`:

```tsx
import { DialogueView } from "yarn-spinner-ts";
import { parseScenes } from "yarn-spinner-ts";

const scenes = parseScenes(sceneYamlText);

<DialogueView result={result} onAdvance={advance} scenes={scenes} />
```

## CSS Classes

All dialogue elements use CSS classes prefixed with `yd-`:

- `.yd-scene` - Scene background container
- `.yd-actor` - Actor image (top center)
- `.yd-dialogue-box` - Dialogue box container
- `.yd-text-box` - Text dialogue content
- `.yd-options-box` - Options container

Customize these in your CSS to match your game's style.

