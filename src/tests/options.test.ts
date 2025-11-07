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

test("option text interpolates variables", () => {
  const script = `
title: Start
---
<<set $cost to 150>>
<<set $bribe to 300>>
Narrator: Decide
-> Pay {$cost}
    Narrator: Paid
 -> Haggle {$bribe}
    Narrator: Haggle
===
`;

  const doc = parseYarn(script);
  const ir = compile(doc);
  const runner = new YarnRunner(ir, { startAt: "Start" });

  // First result is command for set
  const initial = runner.currentResult;
  strictEqual(initial?.type, "command", "Expected first <<set>> to emit a command result");
  runner.advance(); // second <<set>> command
  runner.advance(); // move to narration
  runner.advance(); // move to options

  const result = runner.currentResult;
  if (!result || result.type !== "options") {
    throw new Error("Expected to land on options");
  }
  const [pay, haggle] = result.options;
  strictEqual(pay.text, "Pay 150", "Should replace placeholder with variable value");
  strictEqual(haggle.text, "Haggle 300", "Should evaluate expressions inside placeholders");
});

test("conditional options respect once blocks and if statements", () => {
  const script = `
title: Start
---
<<declare $secret = false>>
Narrator: Boot
<<once>>
    <<set $secret = true>>
<<endonce>>
Narrator: Menu
<<if $secret>>
    -> Secret Option
        Narrator: Secret taken
        <<set $secret = false>>
        <<jump Start>>
<<endif>>
-> Regular Option
    Narrator: Regular taken
    <<jump Start>>
===
`;

  const doc = parseYarn(script);
  const ir = compile(doc);
  const runner = new YarnRunner(ir, { startAt: "Start" });

  const nextOptions = () => {
    let guard = 25;
    while (guard-- > 0) {
      const result = runner.currentResult;
      if (!result) throw new Error("Expected runtime result");
      if (result.type === "options") {
        return result;
      }
      runner.advance();
    }
    throw new Error("Failed to reach options result");
  };

  const secretMenu = nextOptions();
  strictEqual(secretMenu.options.length, 1, "First pass should expose the conditional secret option");
  strictEqual(secretMenu.options[0].text, "Secret Option");

  // Consume the secret option to flip the flag off
  runner.advance(0);

  const fallbackMenu = nextOptions();
  strictEqual(fallbackMenu.options.length, 1, "After the secret path is used, only the regular option should remain");
  strictEqual(fallbackMenu.options[0].text, "Regular Option");
});

test("options allow space-indented bodies", () => {
  const script = `
title: Start
---
-> Pay
  <<jump Pay>>
-> Run
  <<jump Run>>
===

title: Pay
---
Narrator: Pay branch
===

title: Run
---
Narrator: Run branch
===
`;

  const doc = parseYarn(script);
  const ir = compile(doc);
  const runner = new YarnRunner(ir, { startAt: "Start" });

  const initial = runner.currentResult;
  if (initial?.type !== "options") {
    runner.advance();
  }
  const optionsResult = runner.currentResult;
  strictEqual(optionsResult?.type, "options", "Expected to reach options");
  if (optionsResult?.type !== "options") throw new Error("Options not emitted");
  strictEqual(optionsResult.options.length, 2, "Space indents should still group options together");
  strictEqual(optionsResult.options[0].text, "Pay");
  strictEqual(optionsResult.options[1].text, "Run");
});

test("inline [if] option condition filters options", () => {
  const script = `
title: StartFalse
---
<<declare $flag = false>>
-> Hidden [if $flag]
    Narrator: Hidden
-> Visible
    Narrator: Visible
===

title: StartTrue
---
<<declare $flag = true>>
-> Hidden [if $flag]
    Narrator: Hidden
-> Visible
    Narrator: Visible
===
`;

  const doc = parseYarn(script);
  const ir = compile(doc);

  const getOptions = (startNode: string) => {
    const runner = new YarnRunner(ir, { startAt: startNode });
    let guard = 25;
    while (guard-- > 0) {
      const result = runner.currentResult;
      if (!result) break;
      if (result.type === "options") {
        return { runner, options: result };
      }
      runner.advance();
    }
    throw new Error("Failed to reach options");
  };

  const { options: optionsFalse } = getOptions("StartFalse");
  strictEqual(optionsFalse.options.length, 1, "Hidden option should be filtered out when condition is false");
  strictEqual(optionsFalse.options[0].text, "Visible");

  const { options: optionsTrue } = getOptions("StartTrue");
  strictEqual(optionsTrue.options.length, 2, "Both options should appear when condition is true");
  strictEqual(optionsTrue.options[0].text, "Hidden");
  strictEqual(optionsTrue.options[1].text, "Visible");
});
