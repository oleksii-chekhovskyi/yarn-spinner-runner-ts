## Actor Image Transitions (React)

`DialogueScene` cross-fades speaker portraits whenever a new line is delivered. The blend speed is configurable so you can match the feel of your UI.

### Configuring the transition

- `DialogueScene` accepts an `actorTransitionDuration` prop (milliseconds).
- `DialogueView` forwards the same prop so you can set it once at the top level.
- Default is `350` ms; smaller values snap faster, larger values linger.

```tsx
<DialogueView
  result={result}
  onAdvance={advance}
  scenes={scenes}
  actorTransitionDuration={900}
/>
```

### How it works

- The duration is exposed to CSS as the `--yd-actor-transition` custom property on the scene container.
- `dialogue.css` reads that variable in the `transition` for `.yd-actor`, so any value you pass updates both fade-in and fade-out timing while keeping the easing curve.
- Portraits cross-fade: the outgoing image fades out while the incoming image fades in.

### Tips

- Long transitions (e.g., 2000 ms) work best when dialogue advances slowly; otherwise use shorter timings to avoid sluggish portraits.
- If an actor image fails to load, the component logs a warning and keeps the previous portrait visible.
- Combine with `enableTypingAnimation` to align text pacing with portrait changes.

### Testing

- Animation timing changes are mostly visual. After adjusting durations, run `npm test` and manually confirm the fade still feels right in the browser demo.
