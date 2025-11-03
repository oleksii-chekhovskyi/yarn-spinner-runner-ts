# Yarn Spinner Compatibility Checklist

This document tracks compatibility with the official Yarn Spinner documentation.

## ✅ Implemented Features

### Variables
- ✅ Variable storage (numbers, strings, booleans)
- ✅ `<<set>>` command
- ✅ Basic operators: `==`, `!=`, `>`, `<`, `<=`, `>=`, `&&`, `||`, `!`
- ✅ Variable usage in condition expressions
- ✅ Implicit variable declaration (when not declared, defaults to 0/false/"")

### Flow Control
- ✅ `{if condition}...{endif}` blocks (using `{if}` syntax instead of `<<if>>`)
- ✅ `{else if condition}` branches
- ✅ `{else}` branches
- ✅ Condition evaluation in if/elseif

## ❌ Missing Features

### Variables
1. **`<<declare>>` command** - Not implemented
   - Docs: `<<declare $playerName = "Reginald the Wizard">>`
   - Status: Missing

2. **Variable substitution in lines** - Not implemented
   - Docs: `The value is {$variableName}.`
   - Status: Variables are stored but not substituted into line text at runtime

3. **`<<set>>` with `to` keyword** - Partially supported
   - Docs: `<<set $greeting to "Hello, Yarn!">>`
   - Status: Currently supports `<<set var value>>` or `<<set var = value>>`, but not `to` keyword

4. **Math expressions in `<<set>>`** - Partially supported
   - Docs: `<<set $x = 2 + 1>>`
   - Status: Value is parsed but expressions aren't evaluated (e.g., `"2 + 1"` stored as string, not `3`)

5. **Additional operator aliases** - Missing
   - Docs support: `eq`, `is`, `neq`, `gt`, `lt`, `lte`, `gte`, `xor`, `not`, `and`, `or`
   - Status: We support: `==`, `!=`, `>`, `<`, `<=`, `>=`, `&&`, `||`, `!`
   - Missing: `eq`, `is`, `neq`, `gt`, `lt`, `lte`, `gte`, `xor`, `not`, `and`, `or` aliases

6. **Type conversion functions** - Not implemented
   - Docs: `string()`, `number()`, `bool()` functions
   - Status: Missing

7. **`$` prefix for variables** - Not enforced
   - Docs: Variables should start with `$` (e.g., `$gold`)
   - Status: We accept variables without `$` prefix

### Flow Control
8. **Conditional options** - Not implemented
   - Docs: `-> Option text <<if $reputation > 10>>`
   - Status: Options can't have conditions attached

9. **`<<if>>` command blocks** - Different syntax
   - Docs: `<<if condition>>...<<endif>>`
   - Status: We use `{if condition}...{endif}` (inline markup) instead
   - Note: This is a valid alternative syntax, just different from docs

## Recommendations

To improve compatibility, consider implementing:

1. **Variable substitution** (`{$var}`) - High priority
2. **Math expressions in `<<set>>`** - High priority
3. **Conditional options** - Medium priority
4. **`<<declare>>` command** - Medium priority
5. **Operator aliases** (`eq`, `gt`, etc.) - Low priority
6. **Type conversion functions** - Low priority

## Syntax Differences

- **If blocks**: We use `{if}...{endif}` instead of `<<if>>...<<endif>>`
  - This is valid Yarn syntax, just a different style

