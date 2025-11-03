import { test } from "node:test";
import { strictEqual } from "node:assert";
import { parseYarn, compile, YarnRunner } from "../index.js";

test("jump and detour", () => {
  const script = `
title: Start
---
Narrator: Go to Next
<<jump Next>>
===

title: Next
---
Narrator: In Next
<<detour Aside>>
Narrator: Back from Aside
===

title: Aside
---
Narrator: Inside Aside
===
`;

  const doc = parseYarn(script);
  const ir = compile(doc);
  const runner = new YarnRunner(ir, { startAt: "Start" });

  const a = runner.currentResult!;
  strictEqual(a.type, "text");
  if (a.type === "text") strictEqual(/Go to Next/.test(a.text), true, "Expect first line");
  runner.advance(); // executes jump, should produce Next's first line
  const b = runner.currentResult!;
  strictEqual(b.type, "text");
  if (b.type === "text") strictEqual(/In Next/.test(b.text), true, "Expect Next node line");
  runner.advance(); // should detour into Aside and emit its first line
  const c = runner.currentResult!;
  strictEqual(c.type, "text");
  if (c.type === "text") strictEqual(/Inside Aside/.test(c.text), true, "Expect detour content");
  runner.advance(); // should return from detour and continue
  const d = runner.currentResult!;
  strictEqual(d.type, "text");
  if (d.type === "text") strictEqual(/Back from Aside/.test(d.text), true, "Expect return from detour");
});


