import type { MarkupParseResult } from "../markup/types.js";
export type IRProgram = {
  enums: Record<string, string[]>; // enum name -> cases
  nodes: Record<string, IRNode | IRNodeGroup>; // can be single node or group
};

export type IRNode = {
  title: string;
  instructions: IRInstruction[];
  when?: string[]; // Array of when conditions
  css?: string;
  scene?: string; // Scene name from node header
};

export type IRNodeGroup = {
  title: string;
  nodes: IRNode[]; // Multiple nodes with same title, different when conditions
};

export type IRInstruction =
  | { op: "line"; speaker?: string; text: string; tags?: string[]; markup?: MarkupParseResult }
  | { op: "command"; content: string }
  | { op: "jump"; target: string }
  | { op: "detour"; target: string }
  | { op: "options"; options: Array<{ text: string; tags?: string[]; css?: string; markup?: MarkupParseResult; block: IRInstruction[] }> }
  | { op: "if"; branches: Array<{ condition: string | null; block: IRInstruction[] }> }
  | { op: "once"; id: string; block: IRInstruction[] };


