import type { YarnDocument, Statement, Line, Option } from "../model/ast";
import type { IRProgram, IRNode, IRNodeGroup, IRInstruction } from "./ir";

export interface CompileOptions {
  generateOnceIds?: (ctx: { node: string; index: number }) => string;
}

export function compile(doc: YarnDocument, opts: CompileOptions = {}): IRProgram {
  const program: IRProgram = { enums: {}, nodes: {} };
  // Store enum definitions
  for (const enumDef of doc.enums) {
    program.enums[enumDef.name] = enumDef.cases;
  }
  const genOnce = opts.generateOnceIds ?? ((x) => `${x.node}#once#${x.index}`);
  let globalLineCounter = 0;

  function ensureLineId(tags?: string[]): string[] | undefined {
    const t = tags ? [...tags] : [];
    if (!t.some((x) => x.startsWith("line:"))) {
      t.push(`line:${(globalLineCounter++).toString(16)}`);
    }
    return t;
  }

  // Group nodes by title to handle node groups
  const nodesByTitle = new Map<string, typeof doc.nodes>();
  for (const node of doc.nodes) {
    if (!nodesByTitle.has(node.title)) {
      nodesByTitle.set(node.title, []);
    }
    nodesByTitle.get(node.title)!.push(node);
  }

  for (const [title, nodesWithSameTitle] of nodesByTitle) {
    // If only one node with this title, treat as regular node
    if (nodesWithSameTitle.length === 1) {
      const node = nodesWithSameTitle[0];
      const instructions: IRInstruction[] = [];
      let onceCounter = 0;
      function emitBlock(stmts: Statement[]): IRInstruction[] {
      const block: IRInstruction[] = [];
      for (const s of stmts) {
        switch (s.type) {
          case "Line":
            {
              const line = s as Line;
              block.push({ op: "line", speaker: line.speaker, text: line.text, tags: ensureLineId(line.tags), markup: line.markup });
            }
            break;
          case "Command":
            block.push({ op: "command", content: s.content });
            break;
          case "Jump":
            block.push({ op: "jump", target: s.target });
            break;
          case "Detour":
            block.push({ op: "detour", target: s.target });
            break;
          case "OptionGroup": {
            // Add #lastline tag to the most recent line, if present
            for (let i = block.length - 1; i >= 0; i--) {
              const ins = block[i];
              if (ins.op === "line") {
                const tags = new Set(ins.tags ?? []);
                if (![...tags].some((x) => x === "lastline" || x === "#lastline")) {
                  tags.add("lastline");
                }
                ins.tags = Array.from(tags);
                break;
              }
              if (ins.op !== "command") break; // stop if non-line non-command before options
            }
            block.push({
              op: "options",
              options: s.options.map((o: Option) => ({ text: o.text, tags: ensureLineId(o.tags), css: (o as any).css, markup: o.markup, condition: o.condition, block: emitBlock(o.body) })),
            });
            break;
          }
          case "If":
            block.push({
              op: "if",
              branches: s.branches.map((b) => ({ condition: b.condition, block: emitBlock(b.body) })),
            });
            break;
          case "Once":
            block.push({ op: "once", id: genOnce({ node: node.title, index: onceCounter++ }), block: emitBlock(s.body) });
            break;
          case "Enum":
            // Enums are metadata, skip during compilation (already stored in program.enums)
            break;
        }
      }
      return block;
    }
      instructions.push(...emitBlock(node.body));
      const irNode: IRNode = { 
        title: node.title, 
        instructions,
        when: node.when,
        css: (node as any).css,
        scene: node.headers.scene?.trim() || undefined
      };
      program.nodes[node.title] = irNode;
    } else {
      // Multiple nodes with same title - create node group
      const groupNodes: IRNode[] = [];
      for (const node of nodesWithSameTitle) {
        const instructions: IRInstruction[] = [];
        let onceCounter = 0;
        function emitBlock(stmts: Statement[]): IRInstruction[] {
          const block: IRInstruction[] = [];
          for (const s of stmts) {
            switch (s.type) {
              case "Line":
                {
                  const line = s as Line;
                  block.push({ op: "line", speaker: line.speaker, text: line.text, tags: ensureLineId(line.tags), markup: line.markup });
                }
                break;
              case "Command":
                block.push({ op: "command", content: s.content });
                break;
              case "Jump":
                block.push({ op: "jump", target: s.target });
                break;
              case "Detour":
                block.push({ op: "detour", target: s.target });
                break;
              case "OptionGroup": {
                for (let i = block.length - 1; i >= 0; i--) {
                  const ins = block[i];
                  if (ins.op === "line") {
                    const tags = new Set(ins.tags ?? []);
                    if (![...tags].some((x) => x === "lastline" || x === "#lastline")) {
                      tags.add("lastline");
                    }
                    ins.tags = Array.from(tags);
                    break;
                  }
                  if (ins.op !== "command") break;
                }
                block.push({
                  op: "options",
                  options: s.options.map((o: Option) => ({ text: o.text, tags: ensureLineId(o.tags), css: (o as any).css, markup: o.markup, condition: o.condition, block: emitBlock(o.body) })),
                });
                break;
              }
              case "If":
                block.push({
                  op: "if",
                  branches: s.branches.map((b) => ({ condition: b.condition, block: emitBlock(b.body) })),
                });
                break;
              case "Once":
                block.push({ op: "once", id: genOnce({ node: node.title, index: onceCounter++ }), block: emitBlock(s.body) });
                break;
              case "Enum":
                break;
            }
          }
          return block;
        }
        instructions.push(...emitBlock(node.body));
        groupNodes.push({
          title: node.title,
          instructions,
          when: node.when,
          css: (node as any).css,
          scene: node.headers.scene?.trim() || undefined
        });
      }
      const group: IRNodeGroup = {
        title,
        nodes: groupNodes
      };
      program.nodes[title] = group;
    }
  }

  return program;
}


