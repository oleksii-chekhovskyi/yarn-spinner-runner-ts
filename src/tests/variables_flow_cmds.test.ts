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


