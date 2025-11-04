## Typing Animation (React)

The demo UI ships with a `TypingText` React component that renders dialogue one character at a time. `DialogueView` stitches this into the runner so you can opt into typewriter-style delivery without touching lower-level runtime code.

### Enabling the effect

- Toggle the animation with the `enableTypingAnimation` prop on `DialogueView`.
- When enabled, text is revealed via `TypingText`; when disabled, full lines render immediately.
- Example:

```tsx
<DialogueView
  result={result}
  onAdvance={advance}
  enableTypingAnimation={true}
  typingSpeed={45}
/>
```

### Core props

- `typingSpeed` (ms delay between characters): lower is faster; `0` renders instantly.
- `showTypingCursor`: toggles the flashing cursor.
- `cursorCharacter`: replace the default `|` cursor.
- `autoAdvanceAfterTyping`: auto-continue once typing completes.
- `autoAdvanceDelay`: wait time (ms) before auto-advancing.
- `pauseBeforeAdvance`: optional delay (ms) when the player taps to advance after typing finishes.

### Interaction details

- Clicking while text is mid-animation skips straight to the full line; a second click advances to the next node.
- The `onComplete` callback fires exactly once when the last character is revealed (or immediately if typing is disabled), making it safe to trigger `autoAdvance`.
- The "continue" glyph (`yd-continue`) is suppressed whenever typing is active so players are not prompted to advance until the full line appears.
- When you disable typing in `DialogueExample`, `pauseBeforeAdvance` automatically falls back to `0` so clicks advance instantly.

### Styling

- `TypingText` accepts `className` and `cursorClassName` for theming.
- Cursor blinking speed is controlled by `cursorBlinkDuration` (ms).
- Dialogue nodes can still provide CSS via Yarn tags (`&css{...}`); those styles wrap the animated text just like static text.

### Testing

- The animation behaviour is covered by `dist/tests/typing-text.test.js`. Re-run `npm test` after tweaks to catch regressions in cursor visibility, skip handling, and completion callbacks.
