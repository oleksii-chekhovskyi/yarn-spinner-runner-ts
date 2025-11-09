import { test } from "node:test";
import { ok } from "node:assert";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseYarn } from "../parse/parser.js";
import { compile } from "../compile/compiler.js";
import { DialogueView } from "../react/DialogueView.js";

test("DialogueView renders initial variables provided via props", () => {
  const yarn = `
title: Start
---
Narrator: Hello {$playerName}!
===`;

  const program = compile(parseYarn(yarn));

  const html = renderToStaticMarkup(
    <DialogueView program={program} startNode="Start" variables={{ playerName: "V" }} />
  );

  ok(
    html.includes("Hello V"),
    "Expected rendered dialogue to include the interpolated variable value from props"
  );
});

test("DialogueView keeps scene visible during command results", () => {
  const yarn = `
title: Run
scene: street
---
<<set $score = 5>>
Narrator: Done
===`;

  const program = compile(parseYarn(yarn));
  const scenes = {
    scenes: {
      street: {
        background: "bg.png",
        actors: {},
      },
    },
  };

  const html = renderToStaticMarkup(
    <DialogueView program={program} startNode="Run" scenes={scenes} variables={{}} />
  );

  ok(
    html.includes("yd-scene"),
    "Expected DialogueScene container even when the first result is a command"
  );
});
