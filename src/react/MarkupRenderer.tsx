import React from "react";
import type { MarkupParseResult, MarkupWrapper } from "../markup/types.js";

const DEFAULT_HTML_TAGS = new Set(["b", "em", "small", "strong", "sub", "sup", "ins", "del", "mark"]);

interface RenderPiece {
  text: string;
  wrappers: MarkupWrapper[];
  key: string;
  selfClosing?: boolean;
}

interface MarkupRendererProps {
  text: string;
  markup?: MarkupParseResult;
  length?: number;
}

export function MarkupRenderer({ text, markup, length }: MarkupRendererProps) {
  const maxLength = length ?? text.length;
  if (!markup || markup.segments.length === 0) {
    return <>{text.slice(0, maxLength)}</>;
  }

  const pieces: RenderPiece[] = [];
  const limit = Math.max(0, Math.min(maxLength, markup.text.length));

  markup.segments.forEach((segment, index) => {
    if (segment.selfClosing) {
      if (segment.start <= limit) {
        pieces.push({
          text: "",
          wrappers: segment.wrappers,
          selfClosing: true,
          key: `self-${index}`,
        });
      }
      return;
    }
    const start = Math.max(0, Math.min(segment.start, limit));
    const end = Math.max(start, Math.min(segment.end, limit));
    if (end <= start) {
      return;
    }
    const segmentText = markup.text.slice(start, end);
    pieces.push({
      text: segmentText,
      wrappers: segment.wrappers,
      key: `seg-${index}-${start}-${end}`,
    });
  });

  if (pieces.length === 0) {
    return <>{text.slice(0, maxLength)}</>;
  }

  return (
    <>
      {pieces.map((piece, pieceIndex) => renderPiece(piece, pieceIndex))}
    </>
  );
}

function renderPiece(piece: RenderPiece, pieceIndex: number): React.ReactNode {
  const baseKey = `${piece.key}-${pieceIndex}`;

  if (piece.selfClosing) {
    return piece.wrappers.reduceRight<React.ReactNode>(
      (child, wrapper, wrapperIndex) => createWrapperElement(wrapper, `${baseKey}-wrapper-${wrapperIndex}`, child),
      null
    );
  }

  const content = piece.wrappers.reduceRight<React.ReactNode>(
    (child, wrapper, wrapperIndex) => createWrapperElement(wrapper, `${baseKey}-wrapper-${wrapperIndex}`, child),
    piece.text
  );

  return <React.Fragment key={baseKey}>{content}</React.Fragment>;
}

function createWrapperElement(
  wrapper: MarkupWrapper,
  key: string,
  children: React.ReactNode
): React.ReactElement {
  const tagName = DEFAULT_HTML_TAGS.has(wrapper.name) ? wrapper.name : "span";
  const className =
    wrapper.type === "custom" ? `yd-markup-${sanitizeClassName(wrapper.name)}` : undefined;

  const dataAttributes: Record<string, string> = {};
  for (const [propertyName, value] of Object.entries(wrapper.properties)) {
    dataAttributes[`data-markup-${propertyName}`] = String(value);
  }

  return React.createElement(
    tagName,
    {
      key,
      className,
      ...dataAttributes,
    },
    children
  );
}

function sanitizeClassName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
}

