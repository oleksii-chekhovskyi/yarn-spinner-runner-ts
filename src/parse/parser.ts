import { lex, Token } from "./lexer.js";
import type {
  YarnDocument,
  YarnNode,
  Statement,
  Line,
  Command,
  OptionGroup,
  Option,
  IfBlock,
  OnceBlock,
  Jump,
  Detour,
  EnumBlock,
} from "../model/ast";

export class ParseError extends Error {}

export function parseYarn(text: string): YarnDocument {
  const tokens = lex(text);
  const p = new Parser(tokens);
  return p.parseDocument();
}

class Parser {
  private i = 0;
  constructor(private readonly tokens: Token[]) {}

  private peek(offset = 0) {
    return this.tokens[this.i + offset];
  }
  private at(type: Token["type"]) {
    return this.peek()?.type === type;
  }
  private take(type: Token["type"], err?: string): Token {
    const t = this.peek();
    if (!t || t.type !== type) throw new ParseError(err ?? `Expected ${type}, got ${t?.type}`);
    this.i++;
    return t;
  }
  private takeIf(type: Token["type"]) {
    if (this.at(type)) return this.take(type);
    return null;
  }

  parseDocument(): YarnDocument {
    const enums: EnumBlock[] = [];
    const nodes: YarnNode[] = [];
    while (!this.at("EOF")) {
      // Skip empties
      while (this.at("EMPTY")) this.i++;
      if (this.at("EOF")) break;
      
      // Check if this is an enum definition (top-level)
      if (this.at("COMMAND")) {
        const cmd = this.peek().text.trim();
        if (cmd.startsWith("enum ")) {
          const enumCmd = this.take("COMMAND").text; // consume the enum command
          const enumName = enumCmd.slice(5).trim();
          const enumDef = this.parseEnumBlock(enumName);
          enums.push(enumDef);
          continue;
        }
      }
      
      nodes.push(this.parseNode());
    }
    return { type: "Document", enums, nodes };
  }

  private parseNode(): YarnNode {
    const headers: Record<string, string> = {};
    let title: string | null = null;
    let nodeTags: string[] | undefined;
    let whenConditions: string[] = [];
    let nodeCss: string | undefined;

    // headers
    while (!this.at("NODE_START")) {
      const keyTok = this.take("HEADER_KEY", "Expected node header before '---'");
      const valTok = this.take("HEADER_VALUE", "Expected header value");
      if (keyTok.text === "title") title = valTok.text.trim();
      if (keyTok.text === "tags") {
        const raw = valTok.text.trim();
        nodeTags = raw.split(/\s+/).filter(Boolean);
      }
      if (keyTok.text === "when") {
        // Each when: header adds one condition (can have multiple when: headers)
        const raw = valTok.text.trim();
        whenConditions.push(raw);
      }
      // Capture &css{ ... } styles in any header value
      const rawVal = valTok.text.trim();
      if (rawVal.startsWith("&css{")) {
        // Collect until closing '}' possibly spanning multiple lines before '---'
        let cssContent = rawVal.replace(/^&css\{/, "");
        let closed = cssContent.includes("}");
        if (closed) {
          cssContent = cssContent.split("}")[0];
        } else {
          // Consume subsequent TEXT or HEADER_VALUE tokens until we find a '}'
          while (!this.at("NODE_START") && !this.at("EOF")) {
            const next = this.peek();
            if (next.type === "TEXT" || next.type === "HEADER_VALUE") {
              const t = this.take(next.type).text;
              if (t.includes("}")) {
                cssContent += (cssContent ? "\n" : "") + t.split("}")[0];
                closed = true;
                break;
              } else {
                cssContent += (cssContent ? "\n" : "") + t;
              }
            } else if (next.type === "EMPTY") {
              this.i++;
            } else {
              break;
            }
          }
        }
        nodeCss = (cssContent || "").trim();
      }
      headers[keyTok.text] = valTok.text;
      // allow empty lines
      while (this.at("EMPTY")) this.i++;
    }
    if (!title) throw new ParseError("Every node must have a title header");
    this.take("NODE_START");
    // allow optional empties after ---
    while (this.at("EMPTY")) this.i++;

    const body: Statement[] = this.parseStatementsUntil("NODE_END");
    this.take("NODE_END", "Expected node end '==='");
    return { 
      type: "Node", 
      title, 
      headers, 
      nodeTags, 
      when: whenConditions.length > 0 ? whenConditions : undefined,
      css: nodeCss,
      body 
    };
  }

  private parseStatementsUntil(endType: Token["type"]): Statement[] {
    const out: Statement[] = [];
    while (!this.at(endType) && !this.at("EOF")) {
      // skip extra empties
      while (this.at("EMPTY")) this.i++;
      if (this.at(endType) || this.at("EOF")) break;

      if (this.at("OPTION")) {
        out.push(this.parseOptionGroup());
        continue;
      }

      const stmt = this.parseStatement();
      out.push(stmt);
    }
    return out;
  }

  private parseStatement(): Statement {
    const t = this.peek();
    if (!t) throw new ParseError("Unexpected EOF");

    if (t.type === "COMMAND") {
      const cmd = this.take("COMMAND").text;
      if (cmd.startsWith("jump ")) return { type: "Jump", target: cmd.slice(5).trim() } as Jump;
      if (cmd.startsWith("detour ")) return { type: "Detour", target: cmd.slice(7).trim() } as Detour;
      if (cmd.startsWith("if ")) return this.parseIfCommandBlock(cmd);
      if (cmd === "once") return this.parseOnceBlock();
      if (cmd.startsWith("enum ")) {
        const enumName = cmd.slice(5).trim();
        return this.parseEnumBlock(enumName);
      }
      return { type: "Command", content: cmd } as Command;
    }
    if (t.type === "TEXT") {
      const raw = this.take("TEXT").text;
      const { cleanText: text, tags } = this.extractTags(raw);
      const speakerMatch = text.match(/^([^:\s][^:]*)\s*:\s*(.*)$/);
      if (speakerMatch) {
        return { type: "Line", speaker: speakerMatch[1].trim(), text: speakerMatch[2], tags } as Line;
      }
      // If/Else blocks use inline markup {if ...}
      const trimmed = text.trim();
      if (trimmed.startsWith("{if ") || trimmed === "{else}" || trimmed.startsWith("{else if ") || trimmed === "{endif}") {
        return this.parseIfFromText(text);
      }
      return { type: "Line", text, tags } as Line;
    }
    throw new ParseError(`Unexpected token ${t.type}`);
  }

  private parseOptionGroup(): OptionGroup {
    const options: Option[] = [];
    // One or more OPTION lines, with bodies under INDENT
    while (this.at("OPTION")) {
      const raw = this.take("OPTION").text;
      const { cleanText: textWithAttrs, tags } = this.extractTags(raw);
      const { text, css } = this.extractCss(textWithAttrs);
      let body: Statement[] = [];
      if (this.at("INDENT")) {
        this.take("INDENT");
        body = this.parseStatementsUntil("DEDENT");
        this.take("DEDENT");
        while (this.at("EMPTY")) this.i++;
      }
      options.push({ type: "Option", text, body, tags, css });
      // Consecutive options belong to the same group; break on non-OPTION
      while (this.at("EMPTY")) this.i++;
    }
    return { type: "OptionGroup", options };
  }

  private extractTags(input: string): { cleanText: string; tags?: string[] } {
    const tags: string[] = [];
    // Match tags that are space-separated and not part of hex colors or CSS
    // Tags are like "#tag" preceded by whitespace and not followed by hex digits
    const re = /\s#([a-zA-Z_][a-zA-Z0-9_]*)(?!\w)/g;
    let text = input;
    let m: RegExpExecArray | null;
    while ((m = re.exec(input))) {
      tags.push(m[1]);
    }
    if (tags.length > 0) {
      // Only remove tags that match the pattern (not hex colors in CSS)
      text = input.replace(/\s#([a-zA-Z_][a-zA-Z0-9_]*)(?!\w)/g, "").trimEnd();
      return { cleanText: text, tags };
    }
    return { cleanText: input };
  }

  private extractCss(input: string): { text: string; css?: string } {
    const cssMatch = input.match(/\s*&css\{([^}]*)\}\s*$/);
    if (cssMatch) {
      const css = cssMatch[1].trim();
      const text = input.replace(cssMatch[0], "").trimEnd();
      return { text, css };
    }
    return { text: input };
  }

  private parseStatementsUntilStop(shouldStop: () => boolean): Statement[] {
    const out: Statement[] = [];
    while (!this.at("EOF")) {
      // Check stop condition at root level only
      if (shouldStop()) break;
      while (this.at("EMPTY")) this.i++;
      if (this.at("EOF") || shouldStop()) break;
      // Handle indentation - if we see INDENT, parse the indented block
      if (this.at("INDENT")) {
        this.take("INDENT");
        // Parse statements at this indent level until DEDENT (don't check stop condition inside)
        while (!this.at("DEDENT") && !this.at("EOF")) {
          while (this.at("EMPTY")) this.i++;
          if (this.at("DEDENT") || this.at("EOF")) break;
          if (this.at("OPTION")) {
            out.push(this.parseOptionGroup());
            continue;
          }
          out.push(this.parseStatement());
        }
        if (this.at("DEDENT")) {
          this.take("DEDENT");
          while (this.at("EMPTY")) this.i++;
        }
        continue;
      }
      if (this.at("OPTION")) {
        out.push(this.parseOptionGroup());
        continue;
      }
      out.push(this.parseStatement());
    }
    return out;
  }

  private parseOnceBlock(): OnceBlock {
    // Already consumed <<once>>; expect body under INDENT then <<endonce>> as COMMAND
    let body: Statement[] = [];
    if (this.at("INDENT")) {
      this.take("INDENT");
      body = this.parseStatementsUntil("DEDENT");
      this.take("DEDENT");
    } else {
      // Alternatively, body until explicit <<endonce>> command on single line
      body = [];
    }
    // consume closing command if present on own line
    if (this.at("COMMAND") && this.peek().text === "endonce") {
      this.take("COMMAND");
    }
    return { type: "Once", body };
  }

  private parseIfFromText(firstLine: string): IfBlock {
    const branches: IfBlock["branches"] = [];
    // expecting state not required in current implementation

    let cursor = firstLine.trim();
    function parseCond(text: string) {
      const mIf = text.match(/^\{if\s+(.+?)\}$/);
      if (mIf) return mIf[1];
      const mElIf = text.match(/^\{else\s+if\s+(.+?)\}$/);
      if (mElIf) return mElIf[1];
      return null;
    }

    while (true) {
      const cond = parseCond(cursor);
      if (cursor === "{else}") {
        branches.push({ condition: null, body: this.parseIfBlockBody() });
        // next must be {endif}
        const endLine = this.take("TEXT", "Expected {endif}").text.trim();
        if (endLine !== "{endif}") throw new ParseError("Expected {endif}");
        break;
      } else if (cond) {
        branches.push({ condition: cond, body: this.parseIfBlockBody() });
        // next control line
        const next = this.take("TEXT", "Expected {else}, {else if}, or {endif}").text.trim();
        if (next === "{endif}") break;
        cursor = next;
        continue;
      } else if (cursor === "{endif}") {
        break;
      } else {
        throw new ParseError("Invalid if/else control line");
      }
    }
    return { type: "If", branches };
  }

  private parseEnumBlock(enumName: string): EnumBlock {
    const cases: string[] = [];
    
    // Parse cases until <<endenum>>
    while (!this.at("EOF")) {
      while (this.at("EMPTY")) this.i++;
      if (this.at("COMMAND")) {
        const cmd = this.peek().text.trim();
        if (cmd === "endenum") {
          this.take("COMMAND");
          break;
        }
        if (cmd.startsWith("case ")) {
          this.take("COMMAND");
          const caseName = cmd.slice(5).trim();
          cases.push(caseName);
        } else {
          // Unknown command, might be inside enum block - skip or break?
          break;
        }
      } else {
        // Skip non-command lines
        if (this.at("TEXT")) this.take("TEXT");
      }
    }
    
    return { type: "Enum", name: enumName, cases };
  }

  private parseIfCommandBlock(firstCmd: string): IfBlock {
    const branches: IfBlock["branches"] = [];
    const firstCond = firstCmd.slice(3).trim();
    // Body until next elseif/else/endif command (check at root level, not inside indented blocks)
    const firstBody = this.parseStatementsUntilStop(() => {
      // Only stop at root level commands, not inside indented blocks
      return this.at("COMMAND") && /^(elseif\s|else$|endif$)/.test(this.peek().text);
    });
    branches.push({ condition: firstCond, body: firstBody });

    while (!this.at("EOF")) {
      if (!this.at("COMMAND")) break;
      const t = this.peek();
      const txt = t.text.trim();
      if (txt.startsWith("elseif ")) {
        this.take("COMMAND");
        const cond = txt.slice(7).trim();
        const body = this.parseStatementsUntilStop(() => this.at("COMMAND") && /^(elseif\s|else$|endif$)/.test(this.peek().text));
        branches.push({ condition: cond, body });
        continue;
      }
      if (txt === "else") {
        this.take("COMMAND");
        const body = this.parseStatementsUntilStop(() => this.at("COMMAND") && /^(endif$)/.test(this.peek().text));
        branches.push({ condition: null, body });
        // require endif after else body
        if (this.at("COMMAND") && this.peek().text.trim() === "endif") {
          this.take("COMMAND");
        }
        break;
      }
      if (txt === "endif") {
        this.take("COMMAND");
        break;
      }
      break;
    }

    return { type: "If", branches };
  }

  private parseIfBlockBody(): Statement[] {
    // Body is indented lines until next control line or DEDENT boundary; to keep this simple
    // we consume subsequent lines until encountering a control TEXT or EOF/OPTION/NODE_END.
    const body: Statement[] = [];
    while (!this.at("EOF") && !this.at("NODE_END")) {
      // Stop when next TEXT is a control or when OPTION starts (new group)
      if (this.at("TEXT")) {
        const look = this.peek().text.trim();
        if (look === "{else}" || look === "{endif}" || look.startsWith("{else if ") || look.startsWith("{if ")) break;
      }
      if (this.at("OPTION")) break;
      // Support indented bodies inside if-branches
      if (this.at("INDENT")) {
        this.take("INDENT");
        const nested = this.parseStatementsUntil("DEDENT");
        this.take("DEDENT");
        body.push(...nested);
        // continue scanning after dedent
        while (this.at("EMPTY")) this.i++;
        continue;
      }
      if (this.at("EMPTY")) {
        this.i++;
        continue;
      }
      body.push(this.parseStatement());
    }
    return body;
  }
}


