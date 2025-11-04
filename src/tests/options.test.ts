import { test } from "node:test";
import { strictEqual, ok } from "node:assert";
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




test("option markup is exposed", () => {
  const script = `
title: Start
---
Narrator: Choose
-> [b]Bold[/b]
    Narrator: Bold
-> [wave intensity=5]Custom[/wave]
    Narrator: Custom
===
  `;

  const doc = parseYarn(script);
  const ir = compile(doc);
  const runner = new YarnRunner(ir, { startAt: "Start" });

  runner.advance(); // move to options
  const result = runner.currentResult;
  ok(result && result.type === "options", "Expected options result");
  const options = result!.options;
  ok(options[0].markup, "Expected markup on first option");
  ok(options[1].markup, "Expected markup on second option");
  const boldMarkup = options[0].markup!;
  strictEqual(boldMarkup.text, "Bold");
  ok(
    boldMarkup.segments.some((segment) =>
      segment.wrappers.some((wrapper) => wrapper.name === "b" && wrapper.type === "default")
    ),
    "Expected bold wrapper"
  );
  const customWrapper = options[1].markup!.segments
    .flatMap((segment) => segment.wrappers)
    .find((wrapper) => wrapper.name === "wave");
  ok(customWrapper, "Expected custom wrapper on second option");
  strictEqual(customWrapper!.properties.intensity, 5);
});
