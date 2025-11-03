import { test } from "node:test";
import { strictEqual } from "node:assert";
import { parseYarn, compile, YarnRunner } from "../index.js";

test("options selection", () => {
  const script = `
title: Start
---
Narrator: Choose one
-> A
    Narrator: Picked A
-> B
    Narrator: Picked B
===
`;

  const doc = parseYarn(script);
  const ir = compile(doc);
  const runner = new YarnRunner(ir, { startAt: "Start" });

  const a = runner.currentResult!;
  strictEqual(a.type, "text", "Expected intro text");
  runner.advance();
  const b = runner.currentResult!;
  strictEqual(b.type, "options", "Expected options after intro");
  if (b.type === "options") strictEqual(b.options.length, 2, "Should have 2 options");
  // choose B (index 1)
  runner.advance(1);
  const c = runner.currentResult!;
  strictEqual(c.type, "text", "Should be text after selection");
  if (c.type === "text") strictEqual(c.text.includes("Picked B"), true, "Expected body of option B");
});


