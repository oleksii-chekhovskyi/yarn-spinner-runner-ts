import { useState, useCallback, useRef } from "react";
import { YarnRunner, type RunnerOptions } from "../runtime/runner.js";
import type { IRProgram } from "../compile/ir.js";
import type { RuntimeResult } from "../runtime/results.js";

export function useYarnRunner(
  program: IRProgram,
  options: RunnerOptions
): {
  result: RuntimeResult | null;
  advance: (optionIndex?: number) => void;
  runner: YarnRunner;
} {
  const runnerRef = useRef<YarnRunner | null>(null);
  const [result, setResult] = useState<RuntimeResult | null>(null);

  // Initialize runner only once
  if (!runnerRef.current) {
    runnerRef.current = new YarnRunner(program, options);
    setResult(runnerRef.current.currentResult);
  }

  const runner = runnerRef.current;

  const advance = useCallback(
    (optionIndex?: number) => {
      runner.advance(optionIndex);
      setResult(runner.currentResult);
    },
    [runner]
  );

  return { result, advance, runner };
}

