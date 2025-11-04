export type MarkupValue = string | number | boolean;

export type MarkupWrapperType = "default" | "custom";

export interface MarkupWrapper {
  name: string;
  type: MarkupWrapperType;
  properties: Record<string, MarkupValue>;
}

export interface MarkupSegment {
  start: number;
  end: number;
  wrappers: MarkupWrapper[];
  selfClosing?: boolean;
}

export interface MarkupParseResult {
  text: string;
  segments: MarkupSegment[];
}

