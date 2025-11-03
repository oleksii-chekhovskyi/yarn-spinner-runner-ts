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


