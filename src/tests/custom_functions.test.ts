import { test } from "node:test";
import { strictEqual, ok, match } from "node:assert";
import { parseYarn, compile } from "../index.js";
import { YarnRunner } from "../runtime/runner.js";

test("custom functions", () => {
  const yarnText = `
title: CustomFuncs
---
<<declare $doubled = multiply(2, 3)>>
<<declare $concatenated = concat("Hello", " World")>>
<<declare $power = pow(2, 3)>>
<<declare $conditionalValue = ifThen(true, "yes", "no")>>
Result: {$doubled}, {$concatenated}, {$power}, {$conditionalValue}
===
`;

  const ast = parseYarn(yarnText);
  const program = compile(ast);
  const runner = new YarnRunner(program, {
    startAt: "CustomFuncs",
    functions: {
      multiply: (a: unknown, b: unknown) => Number(a) * Number(b),
      concat: (a: unknown, b: unknown) => String(a) + String(b),
      pow: (base: unknown, exp: unknown) => Math.pow(Number(base), Number(exp)),
      ifThen: (cond: unknown, yes: unknown, no: unknown) => Boolean(cond) ? yes : no,
    },
  });

  // Need to advance past declare commands and get to the text line
  for (let i = 0; i < 4; i++) {
    runner.advance();
  }
  strictEqual(runner.currentResult?.type, "text");
  if (runner.currentResult?.type === "text") {
    const fullText = (runner.currentResult.speaker ? `${runner.currentResult.speaker}: ` : "") + runner.currentResult.text;
    strictEqual(fullText, "Result: 6, Hello World, 8, yes");
  }
});

test("custom functions with type coercion", () => {
  const yarnText = `
title: TypeCoercion
---
<<declare $numFromStr = multiply("2", "3")>>
<<declare $concatNums = concat(123, 456)>>
<<declare $boolStr = ifThen("true", 1, 0)>>
Result: {$numFromStr}, {$concatNums}, {$boolStr}
===
`;

  const ast = parseYarn(yarnText);
  const program = compile(ast);
  const runner = new YarnRunner(program, {
    startAt: "TypeCoercion",
    functions: {
      multiply: (a: unknown, b: unknown) => Number(a) * Number(b),
      concat: (a: unknown, b: unknown) => String(a) + String(b),
      ifThen: (cond: unknown, yes: unknown, no: unknown) => Boolean(cond) ? yes : no,
    },
  });

  // Need to advance past declare commands and get to the text line
  for (let i = 0; i < 3; i++) {
    runner.advance();
  }
  strictEqual(runner.currentResult?.type, "text");
  if (runner.currentResult?.type === "text") {
    const fullText = (runner.currentResult.speaker ? `${runner.currentResult.speaker}: ` : "") + runner.currentResult.text;
    strictEqual(fullText, "Result: 6, 123456, 1");
  }
});

test("custom functions error handling", () => {
  const yarnText = `
title: ErrorHandling
---
<<declare $result = safeDivide(10, 0)>>
Result: {$result}
===
`;

  const ast = parseYarn(yarnText);
  const program = compile(ast);
  const runner = new YarnRunner(program, {
    startAt: "ErrorHandling",
    functions: {
      safeDivide: (a: unknown, b: unknown) => {
        const numerator = Number(a);
        const denominator = Number(b);
        return denominator === 0 ? "Cannot divide by zero" : numerator / denominator;
      },
    },
  });

  // Advance until we reach a text result (some commands emit immediately)
  for (let i = 0; i < 10 && runner.currentResult?.type !== "text"; i++) {
    runner.advance();
  }
  strictEqual(runner.currentResult?.type, "text");
  if (runner.currentResult?.type === "text") {
    const fullText = (runner.currentResult.speaker ? `${runner.currentResult.speaker}: ` : "") + runner.currentResult.text;
    strictEqual(fullText, "Result: Cannot divide by zero");
  }
});

test("custom functions alongside built-in functions", () => {
  const yarnText = `
title: MixedFunctions
---
<<declare $random = random()>>
<<declare $doubled = multiply($random, 2)>>
<<declare $formatted = format_number($doubled)>>
Result: {$formatted}
===
`;

  const ast = parseYarn(yarnText);
  const program = compile(ast);
  const runner = new YarnRunner(program, {
    startAt: "MixedFunctions",
    functions: {
      multiply: (a: unknown, b: unknown) => Number(a) * Number(b),
      format_number: (n: unknown) => Number(n).toFixed(2),
    },
  });

  // Need to advance past declare commands and get to the text line
  for (let i = 0; i < 3; i++) {
    runner.advance();
  }
  strictEqual(runner.currentResult?.type, "text");
  if (runner.currentResult?.type === "text") {
    const fullText = (runner.currentResult.speaker ? `${runner.currentResult.speaker}: ` : "") + runner.currentResult.text;
    const resultNumber = parseFloat(fullText.replace("Result: ", ""));
    ok(resultNumber >= 0);
    ok(resultNumber <= 2);
    match(fullText, /Result: \d+\.\d{2}/);
  }
});