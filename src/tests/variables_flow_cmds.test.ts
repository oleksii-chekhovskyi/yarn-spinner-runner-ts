import { test } from "node:test";
import { strictEqual } from "node:assert";
import { parseYarn, compile, YarnRunner } from "../index.js";

test("variables, flow control, and commands", () => {
  const script = `
title: Start
---
<<set $score to 10>>
<<if $score >= 10>>
    Narrator: High
<<else>>
    Narrator: Low
<<endif>>
===
`;

  const doc = parseYarn(script);
  const ir = compile(doc);
  const runner = new YarnRunner(ir, { startAt: "Start" });

  // After command, expect if-branch 'High'
  // First result should be command emission
  const a = runner.currentResult!;
  strictEqual(a.type, "command", "First result should be command");
  runner.advance();
  const b = runner.currentResult!;
  strictEqual(b.type, "text", "Should be text after command");
  if (b.type === "text") strictEqual(/High/.test(b.text), true, "Expected High branch");
  strictEqual(runner.getVariable("score"), 10, "Variable should be set");
});

test("equality operators support ==, !=, and single =", () => {
  const script = `
title: Start
---
<<set $doorOpen to true>>
<<if $doorOpen = true>>
    Narrator: Single equals ok
<<endif>>
<<if $doorOpen == true>>
    Narrator: Double equals ok
<<endif>>
<<if $doorOpen != false>>
    Narrator: Not equals ok
<<endif>>
===
`;

  const doc = parseYarn(script);
  const ir = compile(doc);
  const runner = new YarnRunner(ir, { startAt: "Start" });

  const seen: string[] = [];
  let guard = 25;
  while (guard-- > 0) {
    const result = runner.currentResult;
    if (!result) break;
    if (result.type === "text" && result.text.trim()) {
      seen.push(result.text.trim());
    }
    if (result.isDialogueEnd) {
      break;
    }
    if (result.type === "options") {
      runner.advance(0);
    } else {
      runner.advance();
    }
  }

  strictEqual(seen.includes("Single equals ok"), true, "Single equals comparison should succeed");
  strictEqual(seen.includes("Double equals ok"), true, "Double equals comparison should succeed");
  strictEqual(seen.includes("Not equals ok"), true, "Not equals comparison should succeed");
});

test("set command supports equals syntax with arithmetic reassignment", () => {
  const script = `
title: StreetCred
---
<<set $reputation = 100>>
<<set $reputation = $reputation - 25 >>
Narrator: Current street cred: {$reputation}
===
`;

  const doc = parseYarn(script);
  const ir = compile(doc);
  const runner = new YarnRunner(ir, { startAt: "StreetCred" });

  const seen: string[] = [];
  for (let guard = 0; guard < 20; guard++) {
    const result = runner.currentResult;
    if (!result) break;
    if (result.type === "text" && result.text.trim()) {
      seen.push(result.text.trim());
    }
    if (result.isDialogueEnd) break;
    if (result.type === "options") {
      runner.advance(0);
    } else {
      runner.advance();
    }
  }

  strictEqual(seen.includes("Current street cred: 75"), true, "Should reflect arithmetic subtraction");
  strictEqual(runner.getVariable("reputation"), 75, "Variable should store updated numeric value");
});

test("set command respects arithmetic precedence and parentheses", () => {
  const script = `
title: MathChecks
---
<<set $score = 10>>
<<set $score = $score + 10 * 2>>
<<set $score = ($score + 10) / 2>>
Narrator: Score now {$score}
===
`;

  const doc = parseYarn(script);
  const ir = compile(doc);
  const runner = new YarnRunner(ir, { startAt: "MathChecks" });

  const lines: string[] = [];
  for (let guard = 0; guard < 20; guard++) {
    const result = runner.currentResult;
    if (!result) break;
    if (result.type === "text" && result.text.trim()) {
      lines.push(result.text.trim());
    }
    if (result.isDialogueEnd) break;
    if (result.type === "options") {
      runner.advance(0);
    } else {
      runner.advance();
    }
  }

  strictEqual(lines.includes("Score now 20"), true, "Should honor operator precedence and parentheses");
  strictEqual(runner.getVariable("score"), 20, "Final numeric value should be 20");
});

test("variables passed from host accept $ prefix and mutate via arithmetic set", () => {
  const script = `
title: HostVars
---
Narrator: Start {$reputation}
<<set $reputation = $reputation - 25 >>
Narrator: After {$reputation}
===
`;

  const doc = parseYarn(script);
  const ir = compile(doc);
  const runner = new YarnRunner(ir, { startAt: "HostVars", variables: { $reputation: 100 } });

  const lines: string[] = [];
  for (let guard = 0; guard < 20; guard++) {
    const result = runner.currentResult;
    if (!result) break;
    if (result.type === "text" && result.text.trim()) {
      lines.push(result.text.trim());
    }
    if (result.isDialogueEnd) break;
    if (result.type === "options") {
      runner.advance(0);
    } else {
      runner.advance();
    }
  }

  strictEqual(lines.includes("Start 100"), true, "Initial host variable should be visible");
  strictEqual(lines.includes("After 75"), true, "Arithmetic mutation should be reflected");
  strictEqual(runner.getVariable("reputation"), 75, "Runner variable store should update");
});

test("host variables work with math helpers and propagate results", () => {
  const script = `
title: MathHost
---
Narrator: Incoming {$energy}
<<set $energy = max($energy, 50)>>
<<set $residual = floor($energy / 3)>>
Narrator: After max {$energy}
Narrator: Residual {$residual}
===
`;

  const doc = parseYarn(script);
  const ir = compile(doc);
  const runner = new YarnRunner(ir, { startAt: "MathHost", variables: { $energy: 37 } });

  const lines: string[] = [];
  for (let guard = 0; guard < 20; guard++) {
    const result = runner.currentResult;
    if (!result) break;
    if (result.type === "text" && result.text.trim()) {
      lines.push(result.text.trim());
    }
    if (result.isDialogueEnd) break;
    if (result.type === "options") {
      runner.advance(0);
    } else {
      runner.advance();
    }
  }

  strictEqual(lines.includes("Incoming 37"), true, "Should read initial host variable");
  strictEqual(lines.includes("After max 50"), true, "max() should clamp the variable");
  strictEqual(lines.includes("Residual 16"), true, "floor division should be reflected");
  strictEqual(runner.getVariable("energy"), 50, "Host variable should hold updated max result");
  strictEqual(runner.getVariable("residual"), 16, "New variables from math operations should be stored");
});

test("host variables use custom add/subtract functions", () => {
  const script = `
title: HostMathFns
---
Narrator: Credits {$credits}
<<set $credits = add($credits, 25)>>
<<set $credits = subtract($credits, 10)>>
Narrator: Final {$credits}
===
`;

  const doc = parseYarn(script);
  const ir = compile(doc);
  const runner = new YarnRunner(ir, {
    startAt: "HostMathFns",
    variables: { $credits: 15 },
    functions: {
      add: (a: unknown, b: unknown) => Number(a) + Number(b),
      subtract: (a: unknown, b: unknown) => Number(a) - Number(b),
    },
  });

  const lines: string[] = [];
  for (let guard = 0; guard < 20; guard++) {
    const result = runner.currentResult;
    if (!result) break;
    if (result.type === "text" && result.text.trim()) {
      lines.push(result.text.trim());
    }
    if (result.isDialogueEnd) break;
    if (result.type === "options") {
      runner.advance(0);
    } else {
      runner.advance();
    }
  }

  strictEqual(lines.includes("Credits 15"), true, "Should read initial credits");
  strictEqual(lines.includes("Final 30"), true, "Custom add/subtract functions should apply math");
  strictEqual(runner.getVariable("credits"), 30, "Stored variable should reflect final value");
});


