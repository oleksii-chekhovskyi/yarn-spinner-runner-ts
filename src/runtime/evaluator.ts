/**
 * Safe expression evaluator for Yarn Spinner conditions.
 * Supports variables, functions, comparisons, and logical operators.
 */
export class ExpressionEvaluator {
  private smartVariables: Record<string, string> = {}; // variable name -> expression
  
  constructor(
    private variables: Record<string, unknown> = {},
    private functions: Record<string, (...args: unknown[]) => unknown> = {},
    private enums: Record<string, string[]> = {} // enum name -> cases
  ) {}

  /**
   * Evaluate a condition expression and return a boolean result.
   * Supports: variables, literals (numbers, strings, booleans), comparisons, logical ops, function calls.
   */
  evaluate(expr: string): boolean {
    try {
      const result = this.evaluateExpression(expr);
      return !!result;
    } catch {
      return false;
    }
  }

  /**
   * Evaluate an expression that can return any value (not just boolean).
   */
  evaluateExpression(expr: string): unknown {
    const trimmed = this.preprocess(expr.trim());
    if (!trimmed) return false;

    // Handle function calls like `functionName(arg1, arg2)`
    if (this.looksLikeFunctionCall(trimmed)) {
      return this.evaluateFunctionCall(trimmed);
    }

    // Handle comparisons
    if (this.containsComparison(trimmed)) {
      return this.evaluateComparison(trimmed);
    }

    // Handle logical operators
    if (trimmed.includes("&&") || trimmed.includes("||")) {
      return this.evaluateLogical(trimmed);
    }

    // Handle negation
    if (trimmed.startsWith("!")) {
      return !this.evaluateExpression(trimmed.slice(1).trim());
    }

     // Handle arithmetic expressions (+, -, *, /, %)
     if (this.containsArithmetic(trimmed)) {
       return this.evaluateArithmetic(trimmed);
     }

    // Simple variable or literal
    return this.resolveValue(trimmed);
  }

  private preprocess(expr: string): string {
    // Normalize operator word aliases to JS-like symbols
    // Whole word replacements only
    return expr
      .replace(/\bnot\b/gi, "!")
      .replace(/\band\b/gi, "&&")
      .replace(/\bor\b/gi, "||")
      .replace(/\bxor\b/gi, "^")
      .replace(/\beq\b|\bis\b/gi, "==")
      .replace(/\bneq\b/gi, "!=")
      .replace(/\bgte\b/gi, ">=")
      .replace(/\blte\b/gi, "<=")
      .replace(/\bgt\b/gi, ">")
      .replace(/\blt\b/gi, "<");
  }

  private evaluateFunctionCall(expr: string): unknown {
    const match = expr.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*)\)$/);
    if (!match) throw new Error(`Invalid function call: ${expr}`);

    const [, name, argsStr] = match;
    const func = this.functions[name];
    if (!func) throw new Error(`Function not found: ${name}`);

    const args = this.parseArguments(argsStr);
    const evaluatedArgs = args.map((arg) => this.evaluateExpression(arg.trim()));

    return func(...evaluatedArgs);
  }

  private parseArguments(argsStr: string): string[] {
    if (!argsStr.trim()) return [];
    const args: string[] = [];
    let depth = 0;
    let current = "";
    for (const char of argsStr) {
      if (char === "(") depth++;
      else if (char === ")") depth--;
      else if (char === "," && depth === 0) {
        args.push(current.trim());
        current = "";
        continue;
      }
      current += char;
    }
    if (current.trim()) args.push(current.trim());
    return args;
  }

  private containsComparison(expr: string): boolean {
    return /[<>=!]/.test(expr);
  }

  private looksLikeFunctionCall(expr: string): boolean {
    return /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(.*\)$/.test(expr);
  }

  private containsArithmetic(expr: string): boolean {
    // Remove quoted strings to avoid false positives on "-" or "+" inside literals
    const unquoted = expr.replace(/"[^"]*"|'[^']*'/g, "");
    return /[+\-*/%]/.test(unquoted);
  }

  private evaluateArithmetic(expr: string): number {
    const input = expr;
    let index = 0;

    const skipWhitespace = () => {
      while (index < input.length && /\s/.test(input[index])) {
        index++;
      }
    };

    const toNumber = (value: unknown): number => {
      if (typeof value === "number") return value;
      if (typeof value === "boolean") return value ? 1 : 0;
      if (value == null || value === "") return 0;
      const num = Number(value);
      if (Number.isNaN(num)) {
        throw new Error(`Cannot convert ${String(value)} to number`);
      }
      return num;
    };

    const readToken = (): string => {
      skipWhitespace();
      const start = index;
      let depth = 0;
      let inQuotes = false;
      let quoteChar = "";

      while (index < input.length) {
        const char = input[index];
        if (inQuotes) {
          if (char === quoteChar) {
            inQuotes = false;
            quoteChar = "";
          }
          index++;
          continue;
        }

        if (char === '"' || char === "'") {
          inQuotes = true;
          quoteChar = char;
          index++;
          continue;
        }

        if (char === "(") {
          depth++;
          index++;
          continue;
        }

        if (char === ")") {
          if (depth === 0) break;
          depth--;
          index++;
          continue;
        }

        if (depth === 0 && "+-*/%".includes(char)) {
          break;
        }

        if (depth === 0 && /\s/.test(char)) {
          break;
        }

        index++;
      }

      return input.slice(start, index).trim();
    };

    const parsePrimary = (): unknown => {
      skipWhitespace();
      if (index >= input.length) {
        throw new Error("Unexpected end of expression");
      }

      const char = input[index];
      if (char === "(") {
        index++;
        const value = parseAddSub();
        skipWhitespace();
        if (input[index] !== ")") {
          throw new Error("Unmatched parenthesis in expression");
        }
        index++;
        return value;
      }

      const token = readToken();
      if (!token) {
        throw new Error("Invalid expression token");
      }
      return this.evaluateExpression(token);
    };

    const parseUnary = (): number => {
      skipWhitespace();
      if (input[index] === "+") {
        index++;
        return parseUnary();
      }
      if (input[index] === "-") {
        index++;
        return -parseUnary();
      }
      return toNumber(parsePrimary());
    };

    const parseMulDiv = (): number => {
      let value = parseUnary();
      while (true) {
        skipWhitespace();
        const char = input[index];
        if (char === "*" || char === "/" || char === "%") {
          index++;
          const right = parseUnary();
          if (char === "*") {
            value = value * right;
          } else if (char === "/") {
            value = value / right;
          } else {
            value = value % right;
          }
          continue;
        }
        break;
      }
      return value;
    };

    const parseAddSub = (): number => {
      let value = parseMulDiv();
      while (true) {
        skipWhitespace();
        const char = input[index];
        if (char === "+" || char === "-") {
          index++;
          const right = parseMulDiv();
          if (char === "+") {
            value = value + right;
          } else {
            value = value - right;
          }
          continue;
        }
        break;
      }
      return value;
    };

    const result = parseAddSub();
    skipWhitespace();
    if (index < input.length) {
      throw new Error(`Unexpected token "${input.slice(index)}" in expression`);
    }
    return result;
  }

  private evaluateComparison(expr: string): boolean {
    // Match comparison operators (avoid matching !=, <=, >=)
    const match = expr.match(/^(.+?)\s*(===|==|!==|!=|=|<=|>=|<|>)\s*(.+)$/);
    if (!match) throw new Error(`Invalid comparison: ${expr}`);

    const [, left, rawOp, right] = match;
    const op = rawOp === "=" ? "==" : rawOp;
    const leftVal = this.evaluateExpression(left.trim());
    const rightVal = this.evaluateExpression(right.trim());

    switch (op) {
      case "===":
      case "==":
        return this.deepEquals(leftVal, rightVal);
      case "!==":
      case "!=":
        return !this.deepEquals(leftVal, rightVal);
      case "<":
        return Number(leftVal) < Number(rightVal);
      case ">":
        return Number(leftVal) > Number(rightVal);
      case "<=":
        return Number(leftVal) <= Number(rightVal);
      case ">=":
        return Number(leftVal) >= Number(rightVal);
      default:
        throw new Error(`Unknown operator: ${op}`);
    }
  }

  private evaluateLogical(expr: string): boolean {
    // Split by && or ||, respecting parentheses
    const parts: Array<{ expr: string; op: "&&" | "||" | null }> = [];
    let depth = 0;
    let current = "";
    let lastOp: "&&" | "||" | null = null;

    for (const char of expr) {
      if (char === "(") depth++;
      else if (char === ")") depth--;
      else if (depth === 0 && expr.includes(char === "&" ? "&&" : char === "|" ? "||" : "")) {
        // Check for && or ||
        const remaining = expr.slice(expr.indexOf(char));
        if (remaining.startsWith("&&")) {
          if (current.trim()) {
            parts.push({ expr: current.trim(), op: lastOp });
            current = "";
          }
          lastOp = "&&";
          // skip &&
          continue;
        } else if (remaining.startsWith("||")) {
          if (current.trim()) {
            parts.push({ expr: current.trim(), op: lastOp });
            current = "";
          }
          lastOp = "||";
          // skip ||
          continue;
        }
      }
      current += char;
    }
    if (current.trim()) parts.push({ expr: current.trim(), op: lastOp });

    // Simple case: single expression
    if (parts.length === 0) return !!this.evaluateExpression(expr);

    // Evaluate parts (supports &&, ||, ^ as xor)
    let result = this.evaluateExpression(parts[0].expr);
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const val = this.evaluateExpression(part.expr);
      if (part.op === "&&") {
        result = result && val;
      } else if (part.op === "||") {
        result = result || val;
      }
    }

    return !!result;
  }

  private resolveValue(expr: string): unknown {
    // Try enum syntax: EnumName.CaseName or .CaseName
    const enumMatch = expr.match(/^\.?([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)$/);
    if (enumMatch) {
      const [, enumName, caseName] = enumMatch;
      if (this.enums[enumName] && this.enums[enumName].includes(caseName)) {
        return `${enumName}.${caseName}`; // Store as "EnumName.CaseName" string
      }
    }
    
    // Try shorthand enum: .CaseName (requires context from variables)
    if (expr.startsWith(".") && expr.length > 1) {
      // Try to infer enum from variable types - for now, return as-is and let validation handle it
      return expr;
    }

    // Try as variable first
    const key = expr.startsWith("$") ? expr.slice(1) : expr;
    
    // Check if this is a smart variable (has stored expression)
    if (Object.prototype.hasOwnProperty.call(this.smartVariables, key)) {
      // Re-evaluate the expression each time it's accessed
      return this.evaluateExpression(this.smartVariables[key]);
    }
    
    if (Object.prototype.hasOwnProperty.call(this.variables, key)) {
      return this.variables[key];
    }

    // Try as number
    const num = Number(expr);
    if (!isNaN(num) && expr.trim() === String(num)) {
      return num;
    }

    // Try as boolean
    if (expr === "true") return true;
    if (expr === "false") return false;

    // Try as string (quoted)
    if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
      return expr.slice(1, -1);
    }

    // Default: treat as variable (may be undefined)
    return this.variables[key];
  }
  
  /**
   * Resolve shorthand enum (.CaseName) when setting a variable with known enum type
   */
  resolveEnumValue(expr: string, enumName?: string): string {
    if (expr.startsWith(".") && enumName) {
      const caseName = expr.slice(1);
      if (this.enums[enumName] && this.enums[enumName].includes(caseName)) {
        return `${enumName}.${caseName}`;
      }
      throw new Error(`Invalid enum case ${caseName} for enum ${enumName}`);
    }
    // Check if it's already EnumName.CaseName format
    const match = expr.match(/^([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)$/);
    if (match) {
      const [, name, caseName] = match;
      if (this.enums[name] && this.enums[name].includes(caseName)) {
        return expr;
      }
      throw new Error(`Invalid enum case ${caseName} for enum ${name}`);
    }
    return expr;
  }
  
  /**
   * Get enum type for a variable (if it was declared with enum type)
   */
  getEnumTypeForVariable(varName: string): string | undefined {
    // Check if variable value matches EnumName.CaseName pattern
    const key = varName.startsWith("$") ? varName.slice(1) : varName;
    const value = this.variables[key];
    if (typeof value === "string") {
      const match = value.match(/^([A-Za-z_][A-Za-z0-9_]*)\./);
      if (match) {
        return match[1];
      }
    }
    return undefined;
  }

  private deepEquals(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;
    if (typeof a === "object") {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    return false;
  }

  /**
   * Update variables. Can be used to mutate state during dialogue.
   */
  setVariable(name: string, value: unknown): void {
    // If setting a smart variable, remove it (converting to regular variable)
    if (Object.prototype.hasOwnProperty.call(this.smartVariables, name)) {
      delete this.smartVariables[name];
    }
    this.variables[name] = value;
  }
  
  /**
   * Register a smart variable (variable with expression that recalculates on access).
   */
  setSmartVariable(name: string, expression: string): void {
    // Remove from regular variables if it exists
    if (Object.prototype.hasOwnProperty.call(this.variables, name)) {
      delete this.variables[name];
    }
    this.smartVariables[name] = expression;
  }
  
  /**
   * Check if a variable is a smart variable.
   */
  isSmartVariable(name: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.smartVariables, name);
  }

  /**
   * Get variable value.
   */
  getVariable(name: string): unknown {
    return this.variables[name];
  }
}

