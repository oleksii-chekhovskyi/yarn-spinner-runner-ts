# Scene and Actor Setup Guide

This guide explains how to configure scenes and actors for the dialogue system.

## Overview

Scenes provide visual backgrounds and actor images for dialogue. Actors are characters that appear when they speak. The configuration uses YAML format with two separate sections: `scenes` and `actors`.

## Configuration Format

Create a YAML file with the following structure:

```yaml
scenes:
  scene1: https://example.com/background1.jpg
  scene2: https://example.com/background2.jpg
  
actors:
  user: https://example.com/user.png
  Narrator: https://example.com/narrator.png
  npc: https://example.com/npc.png
```

## Scenes

### Simple Scene (Background Only)

The simplest format is just the background image URL:

```yaml
scenes:
  scene1: https://example.com/background1.jpg
```

This creates a scene named `scene1` with the specified background. All global actors will be available in this scene.

### Scene with Custom Actors

You can override global actors per scene:

```yaml
scenes:
  scene1:
    background: https://example.com/background1.jpg
    actors:
      special_npc:
        image: https://example.com/special-npc.png
```

This creates `scene1` with a custom background and includes a scene-specific actor `special_npc` in addition to all global actors.

### Scene Structure

- **scene name** (key): The identifier used in Yarn scripts (e.g., `scene: scene1`)
- **background** (string): URL or path to the background image
- **actors** (object, optional): Scene-specific actors that override or extend global actors

## Actors

### Global Actors

Global actors are available in all scenes:

```yaml
actors:
  user: https://example.com/user.png
  Narrator: https://example.com/narrator.png
  npc: https://example.com/npc.png
```

### Actor Configuration

Actors can be defined in two ways:

**Shorthand** (direct URL):
```yaml
actors:
  user: https://example.com/user.png
```

**Full format** (object):
```yaml
actors:
  user:
    image: https://example.com/user.png
```

Both formats are equivalent. The object format allows for future extension with additional actor properties.

## Using Scenes in Yarn Scripts

Add a `scene:` header to any node to activate that scene:

```yarn
title: Start
scene: scene1
---
Narrator: Welcome to the adventure!
User: Let's begin!
===
```

### Scene Persistence

Once a scene is set, the background persists across nodes until a new scene is specified. If a node doesn't have a `scene:` header, the previous scene continues to be used.

## Actor Display

### When Actors Appear

- Actors appear only when they are speaking
- Actor images are matched by name (case-insensitive)
- The speaking actor's image appears at the top center of the scene
- If no matching actor is found in the scene configuration, only the text is shown
- The portrait transition duration defaults to 350 ms and can be adjusted by passing `actorTransitionDuration` (in milliseconds) to either `<DialogueScene />` or `<DialogueView />`

### Actor Matching

Actor names in the Yarn script are matched against actor names in the scene configuration:

```yarn
Narrator: This is the narrator speaking.
```

This matches an actor named `Narrator`, `narrator`, or any case variation in your scene config.

## Example Configuration

```yaml
scenes:
  intro:
    background: /assets/backgrounds/intro.jpg
  forest:
    background: /assets/backgrounds/forest.jpg
    actors:
      guide:
        image: /assets/actors/guide.png
  
actors:
  user: /assets/actors/user.png
  Narrator: /assets/actors/narrator.png
  merchant: /assets/actors/merchant.png
```

In this example:
- `intro` scene uses the intro background and all global actors (user, Narrator, merchant)
- `forest` scene uses the forest background, includes all global actors, plus a scene-specific `guide` actor

## Yarn Script Example

```yarn
title: Intro
scene: intro
---
Narrator: Welcome to the adventure!
User: I'm ready to begin!
===

title: Forest
scene: forest
---
Narrator: You enter the mysterious forest.
Guide: Let me show you the way.
User: Thank you, guide!
===
```

## Image Requirements

- **Background images**: Should be high resolution (recommended: 1920x1080 or higher) as they fill the entire scene
- **Actor images**: Should be transparent PNGs with the character visible in the frame (recommended: 800x1200 or similar portrait aspect)
- Images can be:
  - Local paths: `/assets/images/character.png`
  - Absolute URLs: `https://example.com/image.jpg`
  - Relative URLs: `../images/background.png`

## CSS Styling

All dialogue elements use CSS classes prefixed with `yd-` for easy customization:

- `.yd-scene` - Scene background container
- `.yd-actor` - Actor image
- `.yd-dialogue-box` - Dialogue box container
- `.yd-text-box` - Text dialogue content
- `.yd-options-box` - Options container

You can override these styles in your own CSS to customize the appearance.

## Tips

1. **Reuse actors**: Define common actors globally so they're available in all scenes
2. **Scene-specific actors**: Use scene-specific actors for characters that only appear in certain scenes
3. **Background persistence**: Scenes persist until changed, so you don't need to repeat `scene:` in every node
4. **Case sensitivity**: Actor names are matched case-insensitively, but scene names are case-sensitive
5. **Image loading**: Use optimized images (WebP or compressed PNG/JPG) for better performance

