export interface Token {
  type:
    | "HEADER_KEY"
    | "HEADER_VALUE"
    | "NODE_START" // ---
    | "NODE_END" // ===
    | "OPTION" // ->
    | "COMMAND" // <<...>> (single-line)
    | "TEXT" // any non-empty content line
    | "EMPTY"
    | "INDENT"
    | "DEDENT"
    | "EOF";
  text: string;
  line: number;
  column: number;
}

// Minimal indentation-sensitive lexer to support options and their bodies.
export function lex(input: string): Token[] {
  const lines = input.replace(/\r\n?/g, "\n").split("\n");
  const tokens: Token[] = [];
  const indentStack: number[] = [0];

  let inHeaders = true;

  function push(type: Token["type"], text: string, line: number, column: number) {
    tokens.push({ type, text, line, column });
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const lineNum = i + 1;
    const indent = raw.match(/^[ \t]*/)?.[0] ?? "";
    const content = raw.slice(indent.length);

    if (content.trim() === "") {
      push("EMPTY", "", lineNum, 1);
      continue;
    }

    // Manage indentation tokens only within node bodies and on non-empty lines
    if (!inHeaders) {
      const prev = indentStack[indentStack.length - 1];
      if (indent.length > prev) {
        indentStack.push(indent.length);
        push("INDENT", "", lineNum, 1);
      } else if (indent.length < prev) {
        while (indentStack.length && indent.length < indentStack[indentStack.length - 1]) {
          indentStack.pop();
          push("DEDENT", "", lineNum, 1);
        }
      }
    }

    if (content === "---") {
      inHeaders = false;
      push("NODE_START", content, lineNum, indent.length + 1);
      continue;
    }
    if (content === "===") {
      inHeaders = true;
      // flush indentation to root
      while (indentStack.length > 1) {
        indentStack.pop();
        push("DEDENT", "", lineNum, 1);
      }
      push("NODE_END", content, lineNum, indent.length + 1);
      continue;
    }

    // Header: key: value (only valid while inHeaders)
    if (inHeaders) {
      const m = content.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
      if (m) {
        push("HEADER_KEY", m[1], lineNum, indent.length + 1);
        push("HEADER_VALUE", m[2], lineNum, indent.length + 1 + m[0].indexOf(m[2]));
        continue;
      }
    }

    if (content.startsWith("->")) {
      push("OPTION", content.slice(2).trim(), lineNum, indent.length + 1);
      continue;
    }

    // Commands like <<...>> (single line)
    const cmd = content.match(/^<<(.+?)>>\s*$/);
    if (cmd) {
      push("COMMAND", cmd[1].trim(), lineNum, indent.length + 1);
      continue;
    }

    // Plain text line
    push("TEXT", content, lineNum, indent.length + 1);
  }

  // close remaining indentation at EOF
  while (indentStack.length > 1) {
    indentStack.pop();
    tokens.push({ type: "DEDENT", text: "", line: lines.length, column: 1 });
  }

  tokens.push({ type: "EOF", text: "", line: lines.length + 1, column: 1 });
  return tokens;
}


