import { useState, useCallback, useRef, useEffect } from "react";
import { YarnRunner, type RunnerOptions } from "../runtime/runner.js";
import type { IRProgram } from "../compile/ir.js";
import type { RuntimeResult } from "../runtime/results.js";

function haveFunctionsChanged(
  prev: RunnerOptions["functions"],
  next: RunnerOptions["functions"]
): boolean {
  const prevFns = prev ?? {};
  const nextFns = next ?? {};

  const prevKeys = Object.keys(prevFns);
  const nextKeys = Object.keys(nextFns);

  if (prevKeys.length !== nextKeys.length) {
    return true;
  }

  for (const key of prevKeys) {
    if (!Object.prototype.hasOwnProperty.call(nextFns, key) || prevFns[key] !== nextFns[key]) {
      return true;
    }
  }

  return false;
}

function haveVariablesChanged(
  prev: RunnerOptions["variables"],
  next: RunnerOptions["variables"]
): boolean {
  const prevVars = prev ?? {};
  const nextVars = next ?? {};
  return JSON.stringify(prevVars) !== JSON.stringify(nextVars);
}

export function useYarnRunner(
  program: IRProgram,
  options: RunnerOptions
): {
  result: RuntimeResult | null;
  advance: (optionIndex?: number) => void;
  runner: YarnRunner;
} {
  const runnerRef = useRef<YarnRunner | null>(null);
  const optionsRef = useRef(options);
  const programRef = useRef(program);
  const [result, setResult] = useState<RuntimeResult | null>(() => {
    const runner = new YarnRunner(program, options);
    runnerRef.current = runner;
    optionsRef.current = options;
    programRef.current = program;
    return runner.currentResult;
  });

  useEffect(() => {
    const prevProgram = programRef.current;
    const prevOptions = optionsRef.current;

    const programChanged = prevProgram !== program;
    const functionsChanged = haveFunctionsChanged(prevOptions?.functions, options.functions);
    const startNodeChanged = prevOptions?.startAt !== options.startAt;
    const variablesChanged = haveVariablesChanged(prevOptions?.variables, options.variables);
    const handlersChanged =
      prevOptions?.handleCommand !== options.handleCommand ||
      prevOptions?.commandHandler !== options.commandHandler ||
      prevOptions?.onStoryEnd !== options.onStoryEnd;

    if (
      !runnerRef.current ||
      programChanged ||
      functionsChanged ||
      startNodeChanged ||
      variablesChanged ||
      handlersChanged
    ) {
      const runner = new YarnRunner(program, options);
      runnerRef.current = runner;
      setResult(runner.currentResult);
    }

    programRef.current = program;
    optionsRef.current = options;
  }, [program, options]);

  const advance = useCallback((optionIndex?: number) => {
    const runner = runnerRef.current;
    if (!runner) {
      return;
    }
    runner.advance(optionIndex);
    setResult(runner.currentResult);
  }, []);

  return {
    result,
    advance,
    runner: runnerRef.current as YarnRunner,
  };
}

