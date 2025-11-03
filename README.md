# yarn-spinner-ts

TypeScript parser, compiler, and runtime for Yarn Spinner 3.x, with a React adapter.

## References

- Old JS parser: `bondage.js` (Yarn 2.x) — [GitHub](https://github.com/mnbroatch/bondage.js/tree/master/src)
- Official compiler (C#): YarnSpinner.Compiler — [GitHub](https://github.com/YarnSpinnerTool/YarnSpinner/tree/main/YarnSpinner.Compiler)
- Existing dialogue runner API: YarnBound — [GitHub](https://github.com/mnbroatch/yarn-bound?tab=readme-ov-file)

## Features

- ✅ Full Yarn Spinner 3.x syntax support
- ✅ Parser for `.yarn` files → AST
- ✅ Compiler: AST → Intermediate Representation (IR)
- ✅ Runtime with `YarnRunner` class
- ✅ React hook: `useYarnRunner()`
- ✅ React component: `<DialogueView />`
- ✅ Expression evaluator for conditions
- ✅ Command system with built-in handlers (`<<set>>`, etc.)
- ✅ Support for:
  - Lines with speakers
  - Options with indented bodies
  - `{if}/{else if}/{else}/{endif}` blocks
  - `<<once>>...<<endonce>>` blocks
  - `<<jump NodeName>>` commands
  - `<<detour NodeName>>` commands
  - Variables and functions
  - Custom commands

## Installation

```bash
npm install
npm run build
```

## Quick Start

### Basic Usage

```typescript
import { parseYarn } from "yarn-spinner-ts";
import { compile } from "yarn-spinner-ts";
import { YarnRunner } from "yarn-spinner-ts";

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
});

// Get current result
console.log(runner.currentResult); // TextResult, OptionsResult, or CommandResult

// Advance dialogue
runner.advance(); // Continue text
runner.advance(0); // Choose option 0
```

### React Usage

```tsx
import { parseYarn, compile, useYarnRunner, DialogueView } from "yarn-spinner-ts";

function MyDialogue() {
  const [program] = useState(() => {
    const ast = parseYarn(yarnText);
    return compile(ast);
  });

  const { result, advance } = useYarnRunner(program, {
    startAt: "Start",
    variables: { score: 10 },
  });

  return <DialogueView result={result} onAdvance={advance} />;
}
```

### Or use the example component:

```tsx
import { DialogueExample } from "yarn-spinner-ts";

function App() {
  return <DialogueExample />;
}
```

## API Reference

### Parser

- `parseYarn(text: string): YarnDocument` — Parse Yarn script text into AST

### Compiler

- `compile(doc: YarnDocument, opts?: CompileOptions): IRProgram` — Compile AST to IR

### Runtime

- `YarnRunner(program: IRProgram, options: RunnerOptions)` — Dialogue runner class
  - `currentResult: RuntimeResult | null` — Current dialogue state
  - `advance(optionIndex?: number): void` — Advance dialogue
  - `getVariable(name: string): unknown` — Get variable value
  - `setVariable(name: string, value: unknown): void` — Set variable value
  - `getVariables(): Readonly<Record<string, unknown>>` — Get all variables

### React

- `useYarnRunner(program: IRProgram, options: RunnerOptions)` — React hook
- `<DialogueView result={...} onAdvance={...} />` — Ready-to-use component

### Expression Evaluator

- `ExpressionEvaluator(variables, functions)` — Safe expression evaluator
  - Supports: `===`, `!==`, `<`, `>`, `<=`, `>=`, `&&`, `||`, `!`
  - Function calls: `functionName(arg1, arg2)`
  - Variables, numbers, strings, booleans

### Commands

- `CommandHandler` — Command handler registry
  - Built-in: `<<set variable value>>`
  - Register custom handlers: `handler.register("mycommand", (args) => { ... })`

## Example Yarn Script

```yarn
title: Start
---
Narrator: Welcome!
<<set score = 10>>
{if score >= 10}
    Narrator: High score!
{else}
    Narrator: Low score.
{endif}
-> Ask about features
    Player: What can this do?
    Narrator: Lots of things!
-> Ask about commands
    Player: Tell me about commands.
    Narrator: Commands modify state.
<<once>>
    Narrator: This only shows once!
<<endonce>>
===
```

## Development

```bash
npm run build     # Build TypeScript
npm run dev       # Watch mode
npm test          # Run tests
```

## License

MIT
