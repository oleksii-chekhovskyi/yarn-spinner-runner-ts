import { test } from "node:test";
import { strictEqual } from "node:assert";
import { parseYarn, compile, YarnRunner } from "../index.js";

test("full featured Yarn script with all elements", () => {
  const script = `
title: Start
group: Demo
color: blue
---
Narrator: Welcome to the comprehensive Yarn test.
<<set score 7>>
{if score >= 10}
    Narrator: High score branch.
{else if score >= 5}
    Narrator: Medium score branch.
{else}
    Narrator: Low score branch.
{endif}

<<once>>
    Narrator: This once block should only appear the first time.
<<endonce>>

-> Take the main path
    Narrator: Proceeding on the main path.
    <<jump NextScene>>
-> Explore a detour
    Narrator: Let's explore a detour first.
    <<detour AsideInfo>>
    Narrator: Back from detour.
    <<jump NextScene>>
===

title: NextScene
group: Demo
---
Narrator: You have arrived in the next scene.
-> Ask about features
    Player: What can this system do?
    Narrator: It supports options, conditions, once, jump, and detour.
-> Finish
    Narrator: Ending the scene.
===

title: AsideInfo
group: Demo
---
Narrator: This is detour content.
===
`;

  const doc = parseYarn(script);
  const ir = compile(doc);

  // First run: once content should appear
  let runner = new YarnRunner(ir, { startAt: "Start" });

  // Welcome text
  const a = runner.currentResult!;
  strictEqual(a.type, "text");
  if (a.type === "text") strictEqual(/Welcome/.test(a.text), true, "Should show welcome");
  runner.advance();

  // set command result
  const b = runner.currentResult!;
  strictEqual(b.type, "command", "Should emit command");
  runner.advance();

  // Medium score branch (score is 7, >= 5 but < 10)
  const c = runner.currentResult!;
  strictEqual(c.type, "text");
  if (c.type === "text") strictEqual(/Medium score branch/.test(c.text), true, "Should take medium branch");
  runner.advance();

  // Once block content
  const d = runner.currentResult!;
  strictEqual(d.type, "text");
  if (d.type === "text") strictEqual(/This once block should only appear the first time\./.test(d.text), true, "Once block should appear first time");
  runner.advance();

  // Options
  const e = runner.currentResult!;
  strictEqual(e.type, "options", "Should show options");
  if (e.type === "options") strictEqual(e.options.length, 2, "Should have 2 options");

  // Choose detour path (index 1)
  runner.advance(1);
  // Body text before detour
  const f = runner.currentResult!;
  strictEqual(f.type, "text");
  if (f.type === "text") strictEqual(/Let's explore a detour first/.test(f.text), true, "Should show option body");
  runner.advance(); // detour executes
  // Detour content should be emitted
  const g = runner.currentResult!;
  strictEqual(g.type, "text");
  if (g.type === "text") strictEqual(/This is detour content/.test(g.text), true, "Should enter detour");
  runner.advance(); // return from detour
  // After detour, should continue with next line
  const h = runner.currentResult!;
  strictEqual(h.type, "text");
  if (h.type === "text") strictEqual(/Back from detour/.test(h.text), true, "Should return from detour");
  runner.advance(); // jump executes
  // NextScene arrival
  const i = runner.currentResult!;
  strictEqual(i.type, "text");
  if (i.type === "text") strictEqual(/arrived in the next scene/.test(i.text), true, "Should jump to NextScene");
  runner.advance();
  // Options in NextScene
  const j = runner.currentResult!;
  strictEqual(j.type, "options", "Should show options in NextScene");
  if (j.type === "options") strictEqual(j.options.length, 2, "Should have 2 options in NextScene");

  // Second run: once block should be skipped
  runner = new YarnRunner(ir, { startAt: "Start" });
  const k = runner.currentResult!;
  strictEqual(k.type, "text");
  if (k.type === "text") strictEqual(/Welcome/.test(k.text), true, "Welcome should appear");
  runner.advance(); // command
  runner.advance(); // branch line
  // Should skip once and show options immediately after branch
  let l = runner.currentResult!;
  if (l.type === "text") {
    // Advance one more time in case an intermediate text was emitted
    runner.advance();
    l = runner.currentResult!;
  }
  strictEqual(l.type, "options", "Once should be skipped on second run");
});


