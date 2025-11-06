# yarn-spinner-runner-ts

TypeScript parser, compiler, and runtime for Yarn Spinner 3.x with React adapter.

* [Github repository](https://github.com/oleksii-chekhovskyi/yarn-spinner-runner-ts) for more information.
* [NPM package](https://www.npmjs.com/package/yarn-spinner-runner-ts)

## References

* Old JS parser: `bondage.js` (Yarn 2.x) — [GitHub](https://github.com/mnbroatch/bondage.js/tree/master/src)
* Official compiler (C#): YarnSpinner.Compiler — [GitHub](https://github.com/YarnSpinnerTool/YarnSpinner/tree/main/YarnSpinner.Compiler)
* Existing dialogue runner API: YarnBound — [GitHub](https://github.com/mnbroatch/yarn-bound?tab=readme-ov-file)

## Features

* ✅ Full Yarn Spinner 3.x syntax support
* ✅ Parser for `.yarn` files → AST
* ✅ Compiler: AST → Intermediate Representation (IR)
* ✅ Runtime with `YarnRunner` class
* ✅ React hook: `useYarnRunner()`
* ✅ React components: `<DialogueView />`, `<DialogueScene />`, `<DialogueExample />`
* ✅ Typing animation with configurable speeds, cursor styles, and auto-advance controls
* ✅ Markup parsing with HTML formatting tags and CSS-ready spans
* ✅ Expression evaluator for conditions
* ✅ Command system with built-in handlers (`<<set>>`, `<<declare>>`, etc.)
* ✅ Scene system with backgrounds and actor images (with configurable portrait cross-fades)
* ✅ Custom CSS styling via `&css{}` attributes
* ✅ Built-in functions (`visited`, `random`, `min`, `max`, etc.)
* ✅ Support for:
  * Lines with speakers
  * Options with indented bodies
  * `<<if>>/<<elseif>>/<<else>>/<<endif>>` blocks
  * `<<once>>...<<endonce>>` blocks
  * `<<jump NodeName>>` commands
  * `<<detour NodeName>>` commands
  * Variables and expressions
  * Enums (`<<enum>>` blocks)
  * Smart variables (`<<declare $var = expr>>`)
  * Node groups with `when:` conditions
  * Tags and metadata on nodes, lines, and options
  * Custom commands

## Installation

```bash
npm install
npm run build
```

## Quick Start

### Basic Usage

```typescript
import { parseYarn, compile, YarnRunner } from "yarn-spinner-runner-ts";

const yarnText = `
title: Start
---
Narrator: Hello!
-> Option 1
    Narrator: You chose option 1.
-> Option 2
    Narrator: You chose option 2.
===
`;

const ast = parseYarn(yarnText);
const program = compile(ast);
const runner = new YarnRunner(program, {
  startAt: "Start",
  variables: { score: 10 },
  functions: {
    add: (a: number, b: number) => a + b,
  },
  handleCommand: (cmd, parsed) => {
    console.log("Command:", cmd);
  },
  onStoryEnd: ({ variables, storyEnd }) => {
    console.log("Story ended!", storyEnd);
    console.log("Final variables:", variables);
  },
});

// Get current result
console.log(runner.currentResult); // TextResult, OptionsResult, or CommandResult

// Advance dialogue
runner.advance(); // Continue text
runner.advance(0); // Choose option 0
```

### React Usage

```tsx
import { parseYarn, compile, useYarnRunner, DialogueView } from "yarn-spinner-runner-ts";
import { parseScenes } from "yarn-spinner-runner-ts";
import type { SceneCollection } from "yarn-spinner-runner-ts";

function MyDialogue() {
  const [program] = useState(() => {
    const ast = parseYarn(yarnText);
    return compile(ast);
  });

  const [scenes] = useState<SceneCollection>(() => {
    return parseScenes(sceneYamlText);
  });

  const { result, advance } = useYarnRunner(program, {
    startAt: "Start",
    variables: { score: 10 },
  });

  return (
    <DialogueView 
      result={result} 
      onAdvance={advance}
      scenes={scenes}
    />
  );
}
```

### Full Example Component

```tsx
import { DialogueExample } from "yarn-spinner-runner-ts";

function App() {
  return <DialogueExample />;
}
```

### Typing Animation

Set `enableTypingAnimation` on `DialogueView` to enable the `TypingText` component for typewriter-style delivery. Tweak props like `typingSpeed`, `showTypingCursor`, `cursorCharacter`, `autoAdvanceAfterTyping`, `autoAdvanceDelay`, and `pauseBeforeAdvance` to fine-tune behaviour, and see [Typing Animation (React)](./docs/typing-animation.md) for details.

### Browser Demo

Run the interactive browser demo:

```bash
npm run demo
```

This starts a Vite dev server with a live Yarn script editor and dialogue system.

## API Reference

### Parser

* `parseYarn(text: string): YarnDocument` — Parse Yarn script text into AST

### Compiler

* `compile(doc: YarnDocument, opts?: CompileOptions): IRProgram` — Compile AST to IR

### Runtime

* `YarnRunner(program: IRProgram, options: RunnerOptions)` — Dialogue runner class
  * `currentResult: RuntimeResult | null` — Current dialogue state
  * `advance(optionIndex?: number): void` — Advance dialogue
  * `getVariable(name: string): unknown` — Get variable value
  * `setVariable(name: string, value: unknown): void` — Set variable value
  * `getVariables(): Readonly<Record<string, unknown>>` — Get all variables
  * `onStoryEnd?: (payload: { variables: Readonly<Record<string, unknown>>; storyEnd: true }) => void` — Handler called when story reaches its end, providing final variable state

### React Components

* `useYarnRunner(program: IRProgram, options: RunnerOptions)` — React hook
  * Returns: `{ result: RuntimeResult | null, advance: (optionIndex?: number) => void, runner: YarnRunner }`
* `<DialogueView result={...} onAdvance={...} scenes={...} />` — Ready-to-use dialogue component
* `<DialogueScene sceneName={...} speaker={...} scenes={...} actorTransitionDuration={...} /> — Scene background, actor display, and portrait transitions` — Scene background and actor display
* `<DialogueExample />` — Full example with editor

### Scene System

* `parseScenes(input: string | Record<string, unknown>): SceneCollection` — Parse YAML scene configuration
* `SceneCollection` — Type for scene configuration
* `SceneConfig` — Type for individual scene config
* `ActorConfig` — Type for actor configuration

See [Scene and Actor Setup Guide](./docs/scenes-actors-setup.md) for detailed documentation.

### Expression Evaluator

* `ExpressionEvaluator(variables, functions, enums?)` — Safe expression evaluator
  * Supports: `===`, `!==`, `<`, `>`, `<=`, `>=`, `&&`, `||`, `!`
  * Operator aliases: `eq/is`, `neq`, `gt`, `lt`, `lte`, `gte`, `and`, `or`, `not`, `xor`
  * Function calls: `functionName(arg1, arg2)`
  * Variables, numbers, strings, booleans
  * Enum support with shorthand (`MyEnum.Case`)

### Commands

* `CommandHandler` — Command handler registry
  * Built-in: `<<set variable = value>>`, `<<declare $var = expr>>`
  * Register custom handlers: `handler.register("mycommand", (args) => { ... })`
* `parseCommand(content: string): ParsedCommand` — Parse command string

### Built-in Functions

The runtime includes these built-in functions:

* `visited(nodeName)` — Check if a node was visited
* `visited_count(nodeName)` — Get visit count for a node
* `random()` — Random float 0-1
* `random_range(min, max)` — Random integer in range
* `dice(sides)` — Roll a die
* `min(a, b)`, `max(a, b)` — Min/max values
* `round(n)`, `round_places(n, places)` — Rounding
* `floor(n)`, `ceil(n)` — Floor/ceiling
* `inc(n)`, `dec(n)` — Increment/decrement
* `decimal(n)` — Convert to decimal
* `int(n)` — Convert to integer
* `string(n)`, `number(n)`, `bool(n)` — Type conversions

## Example Yarn Script

```yarn
title: Start
tags: #introduction #tutorial
---
Narrator: Welcome!
<<set score = 10>>
<<if score >= 10>>
    Narrator: High score!
<<else>>
    Narrator: Low score.
<<endif>>

<<declare $randomName = random_range(1, 3) == 1 ? "Alice" : "Bob">>
Narrator: Your name is {$randomName}.

-> Ask about features
    Player: What can this do?
    Narrator: Lots of things!
-> Ask about commands
    Player: Tell me about commands.
    Narrator: Commands modify state.

<<once>>
    Narrator: This only shows once!
<<endonce>>

<<jump NextNode>>
===

title: NextNode
scene: scene1
---
Narrator: You've arrived at the next scene!
===
```

## CSS Styling

You can apply custom CSS styles to nodes and options using the `&css{}` attribute:

```yarn
title: StyledNode
&css{background-color: #ff0000; color: white;}
---
Narrator: This node has a red background.

-> Option 1 &css{background-color: blue;}
    Narrator: You chose the blue option.
===
```

Styles are merged with default styles, with custom styles taking precedence.

See [CSS Attribute Documentation](./docs/css-attribute.md) for details.

## Scene Configuration

Configure scenes and actors using YAML:

```yaml
scenes:
  scene1:
    background: https://example.com/background1.jpg
    actors:
      special_npc:
        image: https://example.com/special-npc.png

actors:
  Narrator: https://example.com/narrator.png
  Player: https://example.com/player.png
```

Use scenes in Yarn nodes:

```yarn
title: MyNode
scene: scene1
---
Narrator: This scene uses scene1's background and actors.
===
```

See [Scene and Actor Setup Guide](./docs/scenes-actors-setup.md) for complete documentation.

## Project Structure

```
yarn-spinner/
├── src/
│   ├── model/          # AST types
│   ├── parse/          # Lexer and parser
│   ├── compile/        # Compiler (AST → IR)
│   ├── runtime/        # Runtime execution
│   ├── scene/          # Scene system
│   ├── react/          # React components
│   └── tests/          # Test files
├── examples/
│   ├── yarn/           # Example Yarn scripts
│   ├── browser/        # Browser demo (Vite)
│   └── scenes/         # Scene configuration examples
├── docs/               # Documentation
└── dist/               # Compiled output
```

## Development

```bash
npm run build     # Build TypeScript
npm run dev       # Watch mode
npm run lint      # Run ESLint
npm test          # Run tests
npm run demo      # Start browser demo
npm run demo:build # Build browser demo
```

## Testing

Tests are located in `src/tests/` and cover:

* Basic dialogue flow
* Options and branching
* Variables and flow control
* Commands (`<<set>>`, `<<declare>>`, etc.)
* `<<once>>` blocks
* `<<jump>>` and `<<detour>>`
* Full featured Yarn scripts

Run tests:

```bash
npm test
```

## Documentation

Additional documentation is available in the `docs/` folder:

* [Lines, Nodes, and Options](./docs/lines-nodes-and-options.md)
* [Options](./docs/options.md)
* [Jumps](./docs/jumps.md)
* [Detour](./docs/detour.md)
* [Logic and Variables](./docs/logic-and-variables.md)
* [Flow Control](./docs/flow-control.md)
* [Once Blocks](./docs/once.md)
* [Smart Variables](./docs/smart-variables.md)
* [Enums](./docs/enums.md)
* [Commands](./docs/commands.md)
* [Functions](./docs/functions.md)
* [Node Groups](./docs/node-groups.md)
* [Tags and Metadata](./docs/tags-metadata.md)
* [CSS Attribute](./docs/css-attribute.md)
* [Typing Animation (React)](./docs/typing-animation.md)
* [Markup (Yarn Spinner)](./docs/markup.md)
* [Actor Image Transitions](./docs/actor-transition.md)
* [Scene and Actor Setup](./docs/scenes-actors-setup.md)

## License

MIT
