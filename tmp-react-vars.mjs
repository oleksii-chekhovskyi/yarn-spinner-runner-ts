import { parseYarn } from "./dist/parse/parser.js";
import { compile } from "./dist/compile/compiler.js";
import { YarnRunner } from "./dist/runtime/runner.js";

const script = `title: Start
---
Narrator: Current {$reputation}
<<set $reputation = $reputation - 25 >>
Narrator: Later {$reputation}
===`;

const ast = parseYarn(script);
const program = compile(ast);
const runner = new YarnRunner(program, { startAt: "Start", variables: { reputation: 100 } });

const outputs = [];
for (let i = 0; i < 10; i++) {
  const res = runner.currentResult;
  if (!res) break;
  if (res.type === "text") {
    outputs.push(res.text.trim());
  }
  if (res.isDialogueEnd) break;
  if (res.type === "options") {
    runner.advance(0);
  } else {
    runner.advance();
  }
}
console.log(outputs);
