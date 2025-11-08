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


