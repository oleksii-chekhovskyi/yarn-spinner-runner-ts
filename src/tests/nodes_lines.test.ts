import { test } from "node:test";
import { strictEqual, ok } from "node:assert";
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




test("markup parsing propagates to runtime", () => {
  const script = `
title: Start
---
Narrator: Plain [b]bold[/b] [wave speed=2]custom[/wave]
===
  `;

  const doc = parseYarn(script);
  const ir = compile(doc);
  const runner = new YarnRunner(ir, { startAt: "Start" });

  const result = runner.currentResult;
  ok(result && result.type === "text", "Expected text result with markup");
  ok(result?.markup, "Expected markup data to be present");
  const markup = result!.markup!;
  strictEqual(markup.text, "Plain bold custom");

  const boldSegment = markup.segments.find((segment) =>
    segment.wrappers.some((wrapper) => wrapper.name === "b" && wrapper.type === "default")
  );
  ok(boldSegment, "Expected bold segment");
  strictEqual(markup.text.slice(boldSegment!.start, boldSegment!.end), "bold");

  const customSegment = markup.segments.find((segment) =>
    segment.wrappers.some((wrapper) => wrapper.name === "wave" && wrapper.type === "custom")
  );
  ok(customSegment, "Expected custom segment");
  const waveWrapper = customSegment!.wrappers.find((wrapper) => wrapper.name === "wave");
  ok(waveWrapper);
  strictEqual(waveWrapper!.properties.speed, 2);
});
