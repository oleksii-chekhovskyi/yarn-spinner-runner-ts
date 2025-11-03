/**
 * Command parser and handler utilities for Yarn Spinner commands.
 * Commands like <<command_name arg1 arg2>> or <<command_name "arg with spaces">>
 */

import type { ExpressionEvaluator as Evaluator } from "./evaluator";

export interface ParsedCommand {
  name: string;
  args: string[];
  raw: string;
}

/**
 * Parse a command string like "command_name arg1 arg2" or "set variable value"
 */
export function parseCommand(content: string): ParsedCommand {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("Empty command");
  }

  const parts: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
      continue;
    }

    if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = "";
      parts.push(current);
      current = "";
      continue;
    }

    if (char === " " && !inQuotes) {
      if (current.trim()) {
        parts.push(current.trim());
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  if (parts.length === 0) {
    throw new Error("No command name found");
  }

  return {
    name: parts[0],
    args: parts.slice(1),
    raw: content,
  };
}

/**
 * Built-in command handlers for common Yarn Spinner commands.
 */
export class CommandHandler {
  private handlers = new Map<string, (args: string[], evaluator?: Evaluator) => void | Promise<void>>();
  private variables: Record<string, unknown>;

  constructor(variables: Record<string, unknown> = {}) {
    this.variables = variables;
    this.registerBuiltins();
  }

  /**
   * Register a command handler.
   */
  register(name: string, handler: (args: string[], evaluator?: Evaluator) => void | Promise<void>): void {
    this.handlers.set(name.toLowerCase(), handler);
  }

  /**
   * Execute a parsed command.
   */
  async execute(parsed: ParsedCommand, evaluator?: Evaluator): Promise<void> {
    const handler = this.handlers.get(parsed.name.toLowerCase());
    if (handler) {
      await handler(parsed.args, evaluator);
    } else {
      console.warn(`Unknown command: ${parsed.name}`);
    }
  }

  private registerBuiltins(): void {
    // <<set $var to expr>> or <<set $var = expr>> or <<set $var expr>>
    this.register("set", (args, evaluator) => {
      if (!evaluator) return;
      if (args.length < 2) return;
      const varNameRaw = args[0];
      let exprParts = args.slice(1);
      if (exprParts[0] === "to") exprParts = exprParts.slice(1);
      if (exprParts[0] === "=") exprParts = exprParts.slice(1);
      const expr = exprParts.join(" ");
      let value = evaluator.evaluateExpression(expr);
      
      // If value is a string starting with ".", try to resolve as enum shorthand
      if (typeof value === "string" && value.startsWith(".")) {
        const enumType = evaluator.getEnumTypeForVariable(varNameRaw);
        if (enumType) {
          value = evaluator.resolveEnumValue(value, enumType);
        }
      }
      
      const key = varNameRaw.startsWith("$") ? varNameRaw.slice(1) : varNameRaw;
      // Setting a variable converts it from smart to regular
      this.variables[key] = value;
      evaluator.setVariable(key, value);
    });

    // <<declare $var = expr>>
    this.register("declare", (args, evaluator) => {
      if (!evaluator) return;
      if (args.length < 3) return; // name, '=', expr
      const varNameRaw = args[0];
      let exprParts = args.slice(1);
      if (exprParts[0] === "=") exprParts = exprParts.slice(1);
      const expr = exprParts.join(" ");
      
      const key = varNameRaw.startsWith("$") ? varNameRaw.slice(1) : varNameRaw;
      
      // Check if expression is "smart" (contains operators, comparisons, or variable references)
      // Smart variables: expressions with operators, comparisons, logical ops, or function calls
      const isSmart = /[+\-*/%<>=!&|]/.test(expr) || 
                      /\$\w+/.test(expr) || // references other variables
                      /[a-zA-Z_]\w*\s*\(/.test(expr); // function calls
      
      if (isSmart) {
        // Store as smart variable - will recalculate on each access
        evaluator.setSmartVariable(key, expr);
        // Also store initial value in variables for immediate use
        const initialValue = evaluator.evaluateExpression(expr);
        this.variables[key] = initialValue;
      } else {
        // Regular variable - evaluate once and store
        let value = evaluator.evaluateExpression(expr);
        
        // Check if expr is an enum value (EnumName.CaseName or .CaseName)
        if (typeof value === "string") {
          // Try to extract enum name from EnumName.CaseName
          const enumMatch = expr.match(/^([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)$/);
          if (enumMatch) {
            const enumName = enumMatch[1];
            value = evaluator.resolveEnumValue(expr, enumName);
          } else if (value.startsWith(".")) {
            // Shorthand - we can't infer enum type from declaration alone
            // Store as-is, will be resolved on first use if variable has enum type
            // Value is already set correctly above
          }
        }
        
        this.variables[key] = value;
        evaluator.setVariable(key, value);
      }
    });

    // <<stop>> - no-op, just a marker
    this.register("stop", () => {
      // Dialogue stop marker
    });
  }
}

