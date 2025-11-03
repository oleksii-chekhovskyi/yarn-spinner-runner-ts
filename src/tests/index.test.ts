import { test } from "node:test";
import { strictEqual } from "node:assert";
import { parseYarn, compile, YarnRunner } from "../index.js";

test("basic dialogue with options", () => {
  const dialogue = `
title: Start
---
Narrator: Hi
-> Opt A
    Narrator: A chosen
-> Opt B
    Narrator: B chosen
===
`;

  const doc = parseYarn(dialogue);
  const ir = compile(doc);
  const runner = new YarnRunner(ir, { startAt: "Start" });

  const r1 = runner.currentResult!;
  strictEqual(r1.type, "text");
  runner.advance();
  const r2 = runner.currentResult!;
  strictEqual(r2.type, "options");
  runner.advance(0);
  const r3 = runner.currentResult!;
  strictEqual(r3.type, "text");
  if (r3.type === "text") {
    strictEqual(r3.text.includes("A chosen"), true);
  }
});


