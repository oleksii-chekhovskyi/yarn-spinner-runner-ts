import { test } from "node:test";
import { strictEqual } from "node:assert";
import { parseYarn, compile, YarnRunner } from "../index.js";

test("nodes and lines delivery", () => {
  const script = `
title: Start
---
Narrator: Line one
Narrator: Line two
===
`;

  const doc = parseYarn(script);
  const ir = compile(doc);
  const runner = new YarnRunner(ir, { startAt: "Start" });

  strictEqual(runner.currentResult?.type, "text", "Expected first result to be text");
  strictEqual(runner.currentResult?.text.includes("Line one"), true, "Expected 'Line one'");
  runner.advance();
  strictEqual(runner.currentResult?.type, "text", "Should still be text");
  strictEqual(runner.currentResult?.text.includes("Line two"), true, "Expected 'Line two'");
  runner.advance();
  strictEqual(runner.currentResult?.isDialogueEnd, true, "Expected dialogue end after lines");
});


