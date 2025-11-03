import type { IRProgram, IRInstruction, IRNode, IRNodeGroup } from "../compile/ir";
import type { RuntimeResult } from "./results.js";
import { ExpressionEvaluator } from "./evaluator.js";
import { CommandHandler, parseCommand } from "./commands.js";

export interface RunnerOptions {
  startAt: string;
  variables?: Record<string, unknown>;
  functions?: Record<string, (...args: unknown[]) => unknown>;
  handleCommand?: (command: string, parsed?: ReturnType<typeof parseCommand>) => void;
  commandHandler?: CommandHandler;
}

const globalOnceSeen = new Set<string>();
const globalNodeGroupOnceSeen = new Set<string>(); // Track "once" nodes in groups: "title#index"

export class YarnRunner {
  private readonly program: IRProgram;
  private readonly variables: Record<string, unknown>;
  private readonly functions: Record<string, (...args: unknown[]) => unknown>;
  private readonly handleCommand?: (command: string, parsed?: ReturnType<typeof parseCommand>) => void;
  private readonly commandHandler: CommandHandler;
  private readonly evaluator: ExpressionEvaluator;
  private readonly onceSeen = globalOnceSeen;
  private readonly nodeGroupOnceSeen = globalNodeGroupOnceSeen;
  private readonly visitCounts: Record<string, number> = {};

  private nodeTitle: string;
  private ip = 0; // instruction pointer within node
  private currentNodeIndex: number = -1; // Index of selected node in group (-1 if single node)
  private callStack: Array<
    | ({ title: string; ip: number } & { kind: "detour" })
    | ({ title: string; ip: number; block: IRInstruction[]; idx: number } & { kind: "block" })
  > = [];

  currentResult: RuntimeResult | null = null;
  history: RuntimeResult[] = [];

  constructor(program: IRProgram, opts: RunnerOptions) {
    this.program = program;
    this.variables = { ...(opts.variables ?? {}) };
    this.functions = {
      // Default conversion helpers
      string: (v: unknown) => String(v ?? ""),
      number: (v: unknown) => Number(v),
      bool: (v: unknown) => Boolean(v),
      visited: (nodeName: unknown) => {
        const name = String(nodeName ?? "");
        return (this.visitCounts[name] ?? 0) > 0;
      },
      visited_count: (nodeName: unknown) => {
        const name = String(nodeName ?? "");
        return this.visitCounts[name] ?? 0;
      },
      format_invariant: (n: unknown) => {
        const num = Number(n);
        if (!isFinite(num)) return "0";
        return new Intl.NumberFormat("en-US", { useGrouping: false, maximumFractionDigits: 20 }).format(num);
      },
      random: () => Math.random(),
      random_range: (a: unknown, b: unknown) => {
        const x = Number(a), y = Number(b);
        const min = Math.min(x, y);
        const max = Math.max(x, y);
        return min + Math.random() * (max - min);
      },
      dice: (sides: unknown) => {
        const s = Math.max(1, Math.floor(Number(sides)) || 1);
        return Math.floor(Math.random() * s) + 1;
      },
      min: (a: unknown, b: unknown) => Math.min(Number(a), Number(b)),
      max: (a: unknown, b: unknown) => Math.max(Number(a), Number(b)),
      round: (n: unknown) => Math.round(Number(n)),
      round_places: (n: unknown, places: unknown) => {
        const p = Math.max(0, Math.floor(Number(places)) || 0);
        const factor = Math.pow(10, p);
        return Math.round(Number(n) * factor) / factor;
      },
      floor: (n: unknown) => Math.floor(Number(n)),
      ceil: (n: unknown) => Math.ceil(Number(n)),
      inc: (n: unknown) => {
        const v = Number(n);
        return Number.isInteger(v) ? v + 1 : Math.ceil(v);
      },
      dec: (n: unknown) => {
        const v = Number(n);
        return Number.isInteger(v) ? v - 1 : Math.floor(v);
      },
      decimal: (n: unknown) => {
        const v = Number(n);
        return Math.abs(v - Math.trunc(v));
      },
      int: (n: unknown) => Math.trunc(Number(n)),
      ...(opts.functions ?? {}),
    } as Record<string, (...args: unknown[]) => unknown>;
    this.handleCommand = opts.handleCommand;
    this.evaluator = new ExpressionEvaluator(this.variables, this.functions, this.program.enums);
    this.commandHandler = opts.commandHandler ?? new CommandHandler(this.variables);
    this.nodeTitle = opts.startAt;

    this.step();
  }
  
  /**
   * Get the current node title (may resolve to a node group).
   */
  getCurrentNodeTitle(): string {
    return this.nodeTitle;
  }

  /**
   * Resolve a node title to an actual node (handling node groups).
   */
  private resolveNode(title: string): IRNode {
    const nodeOrGroup = this.program.nodes[title];
    if (!nodeOrGroup) throw new Error(`Node ${title} not found`);
    
    // If it's a single node, return it
    if (!("nodes" in nodeOrGroup)) {
      this.currentNodeIndex = -1;
      return nodeOrGroup as IRNode;
    }
    
    // It's a node group - select the first matching node based on when conditions
    const group = nodeOrGroup as IRNodeGroup;
    for (let i = 0; i < group.nodes.length; i++) {
      const candidate = group.nodes[i];
      if (this.evaluateWhenConditions(candidate.when, title, i)) {
        this.currentNodeIndex = i;
        // If "once" condition, mark as seen immediately
        if (candidate.when?.includes("once")) {
          this.markNodeGroupOnceSeen(title, i);
        }
        return candidate;
      }
    }
    
    // No matching node found - throw error or return first? Docs suggest error if no match
    throw new Error(`No matching node found in group ${title}`);
  }
  
  /**
   * Evaluate when conditions for a node in a group.
   */
  private evaluateWhenConditions(conditions: string[] | undefined, nodeTitle: string, nodeIndex: number): boolean {
    if (!conditions || conditions.length === 0) {
      // No when condition - available by default (but should not happen in groups)
      return true;
    }
    
    // All conditions must be true (AND logic)
    for (const condition of conditions) {
      const trimmed = condition.trim();
      
      if (trimmed === "once") {
        // Check if this node has been visited once
        const onceKey = `${nodeTitle}#${nodeIndex}`;
        if (this.nodeGroupOnceSeen.has(onceKey)) {
          return false; // Already seen once
        }
        // Will mark as seen when node is entered
        continue;
      }
      
      if (trimmed === "always") {
        // Always available
        continue;
      }
      
      // Otherwise, treat as expression (e.g., "$has_sword")
      if (!this.evaluator.evaluate(trimmed)) {
        return false; // Condition failed
      }
    }
    
    return true; // All conditions passed
  }
  
  /**
   * Mark a node group node as seen (for "once" condition).
   */
  private markNodeGroupOnceSeen(nodeTitle: string, nodeIndex: number): void {
    const onceKey = `${nodeTitle}#${nodeIndex}`;
    this.nodeGroupOnceSeen.add(onceKey);
  }

  advance(optionIndex?: number) {
    // If awaiting option selection, consume chosen option by pushing its block
    if (this.currentResult?.type === "options") {
      if (optionIndex == null) throw new Error("Option index required");
      // Resolve to actual node (handles groups)
      const node = this.resolveNode(this.nodeTitle);
      // We encoded options at ip-1; locate it
      const ins = node.instructions[this.ip - 1];
      if (ins?.op !== "options") throw new Error("Invalid options state");
      const chosen = ins.options[optionIndex];
      if (!chosen) throw new Error("Invalid option index");
      // Push a block frame that we will resume across advances
      this.callStack.push({ kind: "block", title: this.nodeTitle, ip: this.ip, block: chosen.block, idx: 0 });
      if (this.resumeBlock()) return;
      return;
    }
    // If we have a pending block, resume it first
    if (this.resumeBlock()) return;
    this.step();
  }

  private interpolate(text: string): string {
    return text.replace(/\{([^}]+)\}/g, (_m, expr) => {
      try {
        const val = this.evaluator.evaluateExpression(String(expr));
        return String(val ?? "");
      } catch {
        return "";
      }
    });
  }

  private resumeBlock(): boolean {
    const top = this.callStack[this.callStack.length - 1];
    if (!top || top.kind !== "block") return false;
    // Execute from stored idx until we emit one result or finish block
    while (true) {
      const ins = top.block[top.idx++];
      if (!ins) {
        // finished block; pop and continue main step
        this.callStack.pop();
        this.step();
        return true;
      }
      switch (ins.op) {
        case "line":
          this.emit({ type: "text", text: this.interpolate(ins.text), speaker: ins.speaker, tags: ins.tags, isDialogueEnd: false });
          return true;
        case "command": {
          try {
            const parsed = parseCommand(ins.content);
            this.commandHandler.execute(parsed, this.evaluator).catch(() => {});
            if (this.handleCommand) this.handleCommand(ins.content, parsed);
          } catch {
            if (this.handleCommand) this.handleCommand(ins.content);
          }
          this.emit({ type: "command", command: ins.content, isDialogueEnd: false });
          return true;
        }
        case "options": {
          this.emit({ type: "options", options: ins.options.map((o) => ({ text: o.text, tags: o.tags })), isDialogueEnd: false });
          return true;
        }
        case "if": {
          const branch = ins.branches.find((b) => (b.condition ? this.evaluator.evaluate(b.condition) : true));
          if (branch) {
            // Push nested block at current top position (resume after)
            this.callStack.push({ kind: "block", title: this.nodeTitle, ip: this.ip, block: branch.block, idx: 0 });
            return this.resumeBlock();
          }
          break;
        }
        case "once": {
          if (!this.onceSeen.has(ins.id)) {
            this.onceSeen.add(ins.id);
            this.callStack.push({ kind: "block", title: this.nodeTitle, ip: this.ip, block: ins.block, idx: 0 });
            return this.resumeBlock();
          }
          break;
        }
        case "jump": {
          this.nodeTitle = ins.target;
          this.ip = 0;
          this.step();
          return true;
        }
        case "detour": {
          this.callStack.push({ kind: "detour", title: top.title, ip: top.ip });
          this.nodeTitle = ins.target;
          this.ip = 0;
          this.step();
          return true;
        }
      }
    }
  }

  private step() {
    while (true) {
      const resolved = this.resolveNode(this.nodeTitle);
      const currentNode: IRNode = { title: this.nodeTitle, instructions: resolved.instructions };
      const ins = currentNode.instructions[this.ip];
      if (!ins) {
        // Node ended
        this.visitCounts[this.nodeTitle] = (this.visitCounts[this.nodeTitle] ?? 0) + 1;
        this.emit({ type: "text", text: "", nodeCss: resolved.css, scene: resolved.scene, isDialogueEnd: true });
        return;
      }
      this.ip++;
      switch (ins.op) {
        case "line":
          this.emit({ type: "text", text: this.interpolate(ins.text), speaker: ins.speaker, tags: ins.tags, nodeCss: resolved.css, scene: resolved.scene, isDialogueEnd: this.lookaheadIsEnd() });
          return;
        case "command": {
          try {
            const parsed = parseCommand(ins.content);
            this.commandHandler.execute(parsed, this.evaluator).catch(() => {});
            if (this.handleCommand) this.handleCommand(ins.content, parsed);
          } catch {
            if (this.handleCommand) this.handleCommand(ins.content);
          }
          this.emit({ type: "command", command: ins.content, isDialogueEnd: this.lookaheadIsEnd() });
          return;
        }
        case "jump": {
          // Exiting current node due to jump
          this.visitCounts[this.nodeTitle] = (this.visitCounts[this.nodeTitle] ?? 0) + 1;
          this.nodeTitle = ins.target;
          this.ip = 0;
          this.currentNodeIndex = -1; // Reset node index for new resolution
          // resolveNode will handle node groups
          continue;
        }
        case "detour": {
          // Save return position, jump to target node, return when it ends
          this.callStack.push({ kind: "detour", title: this.nodeTitle, ip: this.ip });
          this.nodeTitle = ins.target;
          this.ip = 0;
          this.currentNodeIndex = -1; // Reset node index for new resolution
          // resolveNode will handle node groups
          continue;
        }
        case "options": {
          this.emit({ type: "options", options: ins.options.map((o: { text: string; tags?: string[]; css?: string }) => ({ text: o.text, tags: o.tags, css: o.css })), nodeCss: resolved.css, scene: resolved.scene, isDialogueEnd: this.lookaheadIsEnd() });
          return;
        }
        case "if": {
          const branch = ins.branches.find((b: { condition: string | null; block: IRInstruction[] }) => (b.condition ? this.evaluator.evaluate(b.condition) : true));
          if (branch) {
            this.callStack.push({ kind: "block", title: this.nodeTitle, ip: this.ip, block: branch.block, idx: 0 });
            if (this.resumeBlock()) return;
          }
          break;
        }
        case "once": {
          if (!this.onceSeen.has(ins.id)) {
            this.onceSeen.add(ins.id);
            this.callStack.push({ kind: "block", title: this.nodeTitle, ip: this.ip, block: ins.block, idx: 0 });
            if (this.resumeBlock()) return;
          }
          break;
        }
      }
    }
  }

  private executeBlock(block: { title: string; instructions: IRInstruction[] }) {
    // Execute instructions of block, then resume
    const saved = { title: this.nodeTitle, ip: this.ip } as const;
    this.nodeTitle = block.title;
    const tempIpStart = 0;
    const tempNode = { title: block.title, instructions: block.instructions } as const;
    // Use a temporary node context
    const restore = () => {
      this.nodeTitle = saved.title;
      this.ip = saved.ip;
    };

    // Step through block, emitting first result
    let idx = tempIpStart;
    while (true) {
      const ins = tempNode.instructions[idx++];
      if (!ins) break;
      switch (ins.op) {
        case "line":
          this.emit({ type: "text", text: ins.text, speaker: ins.speaker, isDialogueEnd: false });
          restore();
          return;
        case "command":
          try {
            const parsed = parseCommand(ins.content);
            this.commandHandler.execute(parsed, this.evaluator).catch(() => {});
            if (this.handleCommand) this.handleCommand(ins.content, parsed);
          } catch {
            if (this.handleCommand) this.handleCommand(ins.content);
          }
          this.emit({ type: "command", command: ins.content, isDialogueEnd: false });
          restore();
          return;
        case "options":
          this.emit({ type: "options", options: ins.options.map((o) => ({ text: o.text })), isDialogueEnd: false });
          // Maintain context that options belong to main node at ip-1
          restore();
          return;
        case "if": {
          const branch = ins.branches.find((b) => (b.condition ? this.evaluator.evaluate(b.condition) : true));
          if (branch) {
            // enqueue nested block and resume from main context
            this.callStack.push({ kind: "block", title: this.nodeTitle, ip: this.ip, block: branch.block, idx: 0 });
            restore();
            if (this.resumeBlock()) return;
            return;
          }
          break;
        }
        case "once": {
          if (!this.onceSeen.has(ins.id)) {
            this.onceSeen.add(ins.id);
            this.callStack.push({ kind: "block", title: this.nodeTitle, ip: this.ip, block: ins.block, idx: 0 });
            restore();
            if (this.resumeBlock()) return;
            return;
          }
          break;
        }
        case "jump": {
          this.nodeTitle = ins.target;
          this.ip = 0;
          this.step();
          return;
        }
        case "detour": {
          this.callStack.push({ kind: "detour", title: saved.title, ip: saved.ip });
          this.nodeTitle = ins.target;
          this.ip = 0;
          this.step();
          return;
        }
      }
    }
    // Block produced no output; resume
    restore();
    this.step();
  }

  private lookaheadIsEnd(): boolean {
    // Check if current node has more emit-worthy instructions
    const node = this.resolveNode(this.nodeTitle);
    for (let k = this.ip; k < node.instructions.length; k++) {
      const op = node.instructions[k]?.op;
      if (!op) break;
      if (op === "line" || op === "options" || op === "command" || op === "if" || op === "once") return false;
      if (op === "jump" || op === "detour") return false;
    }
    // Node is ending - mark as end (will trigger detour return if callStack exists)
    return true;
  }

  private emit(res: RuntimeResult) {
    this.currentResult = res;
    this.history.push(res);
    // If we ended a detour node, return to caller after emitting last result
    // Position is restored here, but we wait for next advance() to continue
    if (res.isDialogueEnd && this.callStack.length > 0) {
      const frame = this.callStack.pop()!;
      this.nodeTitle = frame.title;
      this.ip = frame.ip;
    }
  }

  /**
   * Get the current variable store (read-only view).
   */
  getVariables(): Readonly<Record<string, unknown>> {
    return { ...this.variables };
  }

  /**
   * Get variable value.
   */
  getVariable(name: string): unknown {
    return this.variables[name];
  }

  /**
   * Set variable value.
   */
  setVariable(name: string, value: unknown): void {
    this.variables[name] = value;
    this.evaluator.setVariable(name, value);
  }
}


