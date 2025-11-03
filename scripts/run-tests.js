#!/usr/bin/env node

/**
 * Test runner script that discovers and runs all test files
 * This ensures cross-platform compatibility (Windows, Linux, macOS)
 */

import { readdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");
const testsDir = join(projectRoot, "dist", "tests");

async function findTestFiles() {
  try {
    const files = await readdir(testsDir);
    return files
      .filter((file) => file.endsWith(".test.js"))
      .map((file) => join(testsDir, file));
  } catch (error) {
    console.error(`Error reading tests directory: ${error.message}`);
    process.exit(1);
  }
}

async function runTests() {
  const testFiles = await findTestFiles();
  
  if (testFiles.length === 0) {
    console.error("No test files found!");
    process.exit(1);
  }

  console.log(`Found ${testFiles.length} test file(s):`);
  testFiles.forEach((file) => console.log(`  - ${file}`));

  const args = ["--test", "--enable-source-maps", ...testFiles];
  
  const proc = spawn("node", args, {
    stdio: "inherit",
    cwd: projectRoot,
  });

  proc.on("exit", (code) => {
    process.exit(code || 0);
  });
}

runTests().catch((error) => {
  console.error(`Error running tests: ${error.message}`);
  process.exit(1);
});

