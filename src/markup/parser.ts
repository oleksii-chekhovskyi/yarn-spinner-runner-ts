import type { MarkupParseResult, MarkupSegment, MarkupValue, MarkupWrapper } from "./types.js";

const DEFAULT_HTML_TAGS = new Set(["b", "em", "small", "strong", "sub", "sup", "ins", "del", "mark", "br"]);
const SELF_CLOSING_TAGS = new Set(["br"]);

interface StackEntry {
  name: string;
  type: MarkupWrapper["type"];
  properties: Record<string, MarkupValue>;
  originalText: string;
}

interface ParsedTag {
  kind: "open" | "close" | "self";
  name: string;
  properties: Record<string, MarkupValue>;
}

const SELF_CLOSING_SPACE_REGEX = /\s+\/$/;
const ATTRIBUTE_REGEX =
  /^([a-zA-Z_][a-zA-Z0-9_-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+)))?/;

export function parseMarkup(input: string): MarkupParseResult {
  const segments: MarkupSegment[] = [];
  const stack: StackEntry[] = [];
  const chars: string[] = [];
  let currentSegment: MarkupSegment | null = null;
  let nomarkupDepth = 0;

  const pushSegment = (segment: MarkupSegment) => {
    if (segment.selfClosing || segment.end > segment.start) {
      segments.push(segment);
    }
  };

  const wrappersEqual = (a: MarkupWrapper[], b: MarkupWrapper[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const wa = a[i];
      const wb = b[i];
      if (wa.name !== wb.name || wa.type !== wb.type) return false;
      const keysA = Object.keys(wa.properties);
      const keysB = Object.keys(wb.properties);
      if (keysA.length !== keysB.length) return false;
      for (const key of keysA) {
        if (wa.properties[key] !== wb.properties[key]) return false;
      }
    }
    return true;
  };

  const flushCurrentSegment = () => {
    if (currentSegment) {
      segments.push(currentSegment);
      currentSegment = null;
    }
  };

  const cloneWrappers = (): MarkupWrapper[] =>
    stack.map((entry) => ({
      name: entry.name,
      type: entry.type,
      properties: { ...entry.properties },
    }));

  const appendChar = (char: string) => {
    const index = chars.length;
    chars.push(char);
    const wrappers = cloneWrappers();
    if (currentSegment && wrappersEqual(currentSegment.wrappers, wrappers)) {
      currentSegment.end = index + 1;
    } else {
      flushCurrentSegment();
      currentSegment = {
        start: index,
        end: index + 1,
        wrappers,
      };
    }
  };

  const appendLiteral = (literal: string) => {
    for (const ch of literal) {
      appendChar(ch);
    }
  };

  const parseTag = (contentRaw: string): ParsedTag | null => {
    let content = contentRaw.trim();
    if (!content) return null;

    if (content.startsWith("/")) {
      const name = content.slice(1).trim().toLowerCase();
      if (!name) return null;
      return { kind: "close", name, properties: {} };
    }

    let kind: ParsedTag["kind"] = "open";
    if (content.endsWith("/")) {
      content = content.replace(SELF_CLOSING_SPACE_REGEX, "").trim();
      if (content.endsWith("/")) {
        content = content.slice(0, -1).trim();
      }
      kind = "self";
    }

    const nameMatch = content.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)/);
    if (!nameMatch) return null;
    const name = nameMatch[1].toLowerCase();
    let rest = content.slice(nameMatch[0].length).trim();

    const properties: Record<string, MarkupValue> = {};
    while (rest.length > 0) {
      const attrMatch = rest.match(ATTRIBUTE_REGEX);
      if (!attrMatch) {
        break;
      }
      const [, keyRaw, doubleQuoted, singleQuoted, bare] = attrMatch;
      const key = keyRaw.toLowerCase();
      let value: MarkupValue = true;
      const rawValue = doubleQuoted ?? singleQuoted ?? bare;
      if (rawValue !== undefined) {
        value = parseAttributeValue(rawValue);
      }
      properties[key] = value;
      rest = rest.slice(attrMatch[0].length).trim();
    }

    const finalKind: ParsedTag["kind"] = kind === "self" || SELF_CLOSING_TAGS.has(name) ? "self" : kind;
    return { kind: finalKind, name, properties };
  };

  const parseAttributeValue = (raw: string): MarkupValue => {
    const trimmed = raw.trim();
    if (/^(true|false)$/i.test(trimmed)) {
      return /^true$/i.test(trimmed);
    }
    if (/^[+-]?\d+(\.\d+)?$/.test(trimmed)) {
      const num = Number(trimmed);
      if (!Number.isNaN(num)) {
        return num;
      }
    }
    return trimmed;
  };

  const handleSelfClosing = (tag: ParsedTag) => {
    const wrapper: MarkupWrapper = {
      name: tag.name,
      type: DEFAULT_HTML_TAGS.has(tag.name) ? "default" : "custom",
      properties: tag.properties,
    };
    const position = chars.length;
    pushSegment({
      start: position,
      end: position,
      wrappers: [wrapper],
      selfClosing: true,
    });
  };

  let i = 0;
  while (i < input.length) {
    const char = input[i];
    if (char === "\\" && i + 1 < input.length) {
      const next = input[i + 1];
      if (next === "[" || next === "]" || next === "\\") {
        appendChar(next);
        i += 2;
        continue;
      }
    }

    if (char === "[") {
      const closeIndex = findClosingBracket(input, i + 1);
      if (closeIndex === -1) {
        appendChar(char);
        i += 1;
        continue;
      }
      const content = input.slice(i + 1, closeIndex);
      const originalText = input.slice(i, closeIndex + 1);

      const parsed = parseTag(content);
      if (!parsed) {
        appendLiteral(originalText);
        i = closeIndex + 1;
        continue;
      }

      if (parsed.name === "nomarkup") {
        if (parsed.kind === "open") {
          nomarkupDepth += 1;
        } else if (parsed.kind === "close" && nomarkupDepth > 0) {
          nomarkupDepth -= 1;
        }
        i = closeIndex + 1;
        continue;
      }

      if (nomarkupDepth > 0) {
        appendLiteral(originalText);
        i = closeIndex + 1;
        continue;
      }

      if (parsed.kind === "open") {
        const entry: StackEntry = {
          name: parsed.name,
          type: DEFAULT_HTML_TAGS.has(parsed.name) ? "default" : "custom",
          properties: parsed.properties,
          originalText,
        };
        stack.push(entry);
        flushCurrentSegment();
        i = closeIndex + 1;
        continue;
      }

      if (parsed.kind === "self") {
        handleSelfClosing(parsed);
        i = closeIndex + 1;
        continue;
      }

      // closing tag
      if (stack.length === 0) {
        if (SELF_CLOSING_TAGS.has(parsed.name)) {
          i = closeIndex + 1;
          continue;
        }
        appendLiteral(originalText);
        i = closeIndex + 1;
        continue;
      }
      const top = stack[stack.length - 1];
      if (top.name === parsed.name) {
        flushCurrentSegment();
        stack.pop();
        i = closeIndex + 1;
        continue;
      }
      if (SELF_CLOSING_TAGS.has(parsed.name)) {
        i = closeIndex + 1;
        continue;
      }
      // mismatched closing; treat as literal
      appendLiteral(originalText);
      i = closeIndex + 1;
      continue;
    }

    appendChar(char);
    i += 1;
  }

  flushCurrentSegment();

  // If any tags remain open, treat them as literal text appended at end
  while (stack.length > 0) {
    const entry = stack.pop()!;
    appendLiteral(entry.originalText);
  }
  flushCurrentSegment();

  const text = chars.join("");
  return {
    text,
    segments: mergeSegments(segments, text.length),
  };
}

function mergeSegments(segments: MarkupSegment[], textLength: number): MarkupSegment[] {
  const sorted = [...segments].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: MarkupSegment[] = [];
  let last: MarkupSegment | null = null;

  for (const seg of sorted) {
    if (seg.start === seg.end && !seg.selfClosing) {
      continue;
    }
    if (last && !seg.selfClosing && last.end === seg.start && wrappersMatch(last.wrappers, seg.wrappers)) {
      last.end = seg.end;
    } else {
      last = {
        start: seg.start,
        end: seg.end,
        wrappers: seg.wrappers,
        selfClosing: seg.selfClosing,
      };
      merged.push(last);
    }
  }

  if (merged.length === 0 && textLength > 0) {
    merged.push({
      start: 0,
      end: textLength,
      wrappers: [],
    });
  }

  return merged;
}

function wrappersMatch(a: MarkupWrapper[], b: MarkupWrapper[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].name !== b[i].name || a[i].type !== b[i].type) return false;
    const keysA = Object.keys(a[i].properties);
    const keysB = Object.keys(b[i].properties);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (a[i].properties[key] !== b[i].properties[key]) return false;
    }
  }
  return true;
}

function findClosingBracket(text: string, start: number): number {
  for (let i = start; i < text.length; i++) {
    if (text[i] === "]") {
      let backslashCount = 0;
      let j = i - 1;
      while (j >= 0 && text[j] === "\\") {
        backslashCount++;
        j--;
      }
      if (backslashCount % 2 === 0) {
        return i;
      }
    }
  }
  return -1;
}

export function sliceMarkup(result: MarkupParseResult, start: number, end?: number): MarkupParseResult {
  const textLength = result.text.length;
  const sliceStart = Math.max(0, Math.min(start, textLength));
  const sliceEnd = end === undefined ? textLength : Math.max(sliceStart, Math.min(end, textLength));
  const slicedSegments: MarkupSegment[] = [];

  for (const seg of result.segments) {
    const segStart = Math.max(seg.start, sliceStart);
    const segEnd = Math.min(seg.end, sliceEnd);
    if (seg.selfClosing) {
      if (segStart >= sliceStart && segStart <= sliceEnd) {
        slicedSegments.push({
          start: segStart - sliceStart,
          end: segStart - sliceStart,
          wrappers: seg.wrappers,
          selfClosing: true,
        });
      }
      continue;
    }
    if (segEnd <= segStart) continue;
    slicedSegments.push({
      start: segStart - sliceStart,
      end: segEnd - sliceStart,
      wrappers: seg.wrappers.map((wrapper) => ({
        name: wrapper.name,
        type: wrapper.type,
        properties: { ...wrapper.properties },
      })),
    });
  }

  if (slicedSegments.length === 0 && sliceEnd - sliceStart > 0) {
    slicedSegments.push({
      start: 0,
      end: sliceEnd - sliceStart,
      wrappers: [],
    });
  }

  return {
    text: result.text.slice(sliceStart, sliceEnd),
    segments: mergeSegments(slicedSegments, sliceEnd - sliceStart),
  };
}

