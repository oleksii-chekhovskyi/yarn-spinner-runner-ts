export type Position = { line: number; column: number };

export interface NodeHeaderMap {
  [key: string]: string;
}

export interface YarnDocument {
  type: "Document";
  enums: EnumDefinition[];
  nodes: YarnNode[];
}

export interface EnumDefinition {
  type: "Enum";
  name: string;
  cases: string[];
}

export interface YarnNode {
  type: "Node";
  title: string;
  headers: NodeHeaderMap;
  nodeTags?: string[];
  when?: string[]; // Array of when conditions (can be "once", "always", or expression like "$has_sword")
  css?: string; // Custom CSS style for node
  body: Statement[];
}

export type Statement =
  | Line
  | Command
  | OptionGroup
  | IfBlock
  | OnceBlock
  | Jump
  | Detour
  | EnumBlock;

export interface Line {
  type: "Line";
  speaker?: string;
  text: string;
  tags?: string[];
}

export interface Command {
  type: "Command";
  content: string; // inside << >>
}

export interface Jump {
  type: "Jump";
  target: string;
}

export interface Detour {
  type: "Detour";
  target: string;
}

export interface OptionGroup {
  type: "OptionGroup";
  options: Option[];
}

export interface Option {
  type: "Option";
  text: string;
  body: Statement[]; // executed if chosen
  tags?: string[];
  css?: string; // Custom CSS style for option
}

export interface IfBlock {
  type: "If";
  branches: Array<{
    condition: string | null; // null for else
    body: Statement[];
  }>;
}

export interface OnceBlock {
  type: "Once";
  body: Statement[];
}

export interface EnumBlock {
  type: "Enum";
  name: string;
  cases: string[];
}


