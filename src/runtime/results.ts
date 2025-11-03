export type TextResult = {
  type: "text";
  text: string;
  speaker?: string;
  tags?: string[];
  nodeCss?: string; // Node-level CSS from &css{} header
  scene?: string; // Scene name from node header
  isDialogueEnd: boolean;
};

export type OptionsResult = {
  type: "options";
  options: { text: string; tags?: string[]; css?: string }[];
  nodeCss?: string; // Node-level CSS from &css{} header
  scene?: string; // Scene name from node header
  isDialogueEnd: boolean;
};

export type CommandResult = {
  type: "command";
  command: string;
  isDialogueEnd: boolean;
};

export type RuntimeResult = TextResult | OptionsResult | CommandResult;


