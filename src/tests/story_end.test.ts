import { test } from "node:test";
import { ok, strictEqual } from "node:assert";
import { parseYarn, compile, YarnRunner } from "../index.js";

test("onStoryEnd receives variables snapshot", () => {
  const script = `
title: Start
---
Narrator: Beginning
<<set $score = 42>>
Narrator: Done
===
`;
  let payload: { variables: Readonly<Record<string, unknown>>; storyEnd: true } | undefined;
  const doc = parseYarn(script);
  const ir = compile(doc);
  const runner = new YarnRunner(ir, {
    startAt: "Start",
    onStoryEnd: (info) => {
      payload = info;
    },
  });

  let result = runner.currentResult;
  ok(result && result.type === "text");

  runner.advance();
  result = runner.currentResult;
  ok(result && result.type === "command");

  runner.advance();
  result = runner.currentResult;
  ok(result && result.type === "text");

  runner.advance();
  result = runner.currentResult;
  ok(result && result.isDialogueEnd === true);

  strictEqual(payload?.storyEnd, true);
  const variables = payload?.variables ?? {};
  strictEqual((variables as Record<string, unknown>)["score"], 42);
});
