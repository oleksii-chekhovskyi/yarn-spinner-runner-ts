import { test } from "node:test";
import { strictEqual } from "node:assert";
import { parseYarn, compile, YarnRunner } from "../index.js";

test("once block behavior", () => {
  const script = `
title: Start
---
<<once>>
    Narrator: One time only
<<endonce>>
Narrator: Always
===
`;

  const doc = parseYarn(script);
  const ir = compile(doc);

  // First run
  let runner = new YarnRunner(ir, { startAt: "Start" });
  const a = runner.currentResult!;
  strictEqual(a.type, "text");
  if (a.type === "text") strictEqual(/One time only/.test(a.text), true, "Expect once block content on first run");
  runner.advance();
  const b = runner.currentResult!;
  strictEqual(b.type, "text");
  if (b.type === "text") strictEqual(/Always/.test(b.text), true, "Expect always line after once");

  // Note: persistence of once across sessions depends on integration; not asserting second run behavior here.
});


