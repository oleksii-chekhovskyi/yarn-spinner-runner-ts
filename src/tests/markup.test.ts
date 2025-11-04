import { test } from "node:test";
import { strictEqual, ok } from "node:assert";
import { parseMarkup } from "../markup/parser.js";
import type { MarkupParseResult } from "../markup/types.js";

test("parseMarkup handles default HTML tags", () => {
  const result = parseMarkup("This is [b]bold[/b] and [em]emphasized[/em].");

  strictEqual(result.text, "This is bold and emphasized.");
  const bold = findSegment(result, "bold");
  ok(bold, "Expected bold segment");
  strictEqual(bold.wrappers.length, 1);
  strictEqual(bold.wrappers[0].name, "b");
  strictEqual(bold.wrappers[0].type, "default");

  const em = findSegment(result, "emphasized");
  ok(em, "Expected em segment");
  strictEqual(em.wrappers[0].name, "em");
  strictEqual(em.wrappers[0].type, "default");
});

test("parseMarkup exposes custom tags with properties", () => {
  const result = parseMarkup("Say [wave speed=2 tone=\"high\"]hello[/wave]!");
  strictEqual(result.text, "Say hello!");

  const segment = findSegment(result, "hello");
  ok(segment, "Expected wave segment");
  const wrapper = segment.wrappers.find((w) => w.name === "wave");
  ok(wrapper, "Expected wave wrapper");
  strictEqual(wrapper.type, "custom");
  strictEqual(wrapper.properties.speed, 2);
  strictEqual(wrapper.properties.tone, "high");
});

test("parseMarkup handles self-closing tags", () => {
  const result = parseMarkup("[pause length=500/] Ready.");
  strictEqual(result.text, " Ready.");
  ok(
    result.segments.some(
      (seg) => seg.selfClosing && seg.wrappers.some((wrapper) => wrapper.name === "pause")
    ),
    "Expected self closing pause marker"
  );
});

test("parseMarkup respects nomarkup blocks and escaping", () => {
  const result = parseMarkup(`[nomarkup][b] raw [/b][/nomarkup] and \\[escaped\\]`);
  strictEqual(result.text, "[b] raw [/b] and [escaped]");
  ok(
    result.segments.every((segment) => segment.wrappers.length === 0),
    "Expected no wrappers when using nomarkup and escaping"
  );
});

function findSegment(result: MarkupParseResult, target: string) {
  return result.segments.find((segment) => {
    if (segment.selfClosing) return false;
    const text = result.text.slice(segment.start, segment.end);
    return text === target;
  });
}

