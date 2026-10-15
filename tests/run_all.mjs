import { run } from "node:test";
import { spec } from "node:test/reporters";
import path from "node:path";
import fs from "node:fs";

// Find all .test.mjs files in tests directory
const testsDir = path.resolve(process.cwd(), "tests");
const testFiles = fs.readdirSync(testsDir)
  .filter((f) => f.endsWith(".test.mjs"))
  .map((f) => path.join(testsDir, f));

console.log(`\n======================================================`);
console.log(` MarketFlow Frontend Automated Test Suite`);
console.log(` Running ${testFiles.length} test files via Node.js Native Runner`);
console.log(`======================================================\n`);

const testStream = run({
  files: testFiles,
});

testStream.compose(spec).pipe(process.stdout);

testStream.on("test:fail", () => {
  process.exitCode = 1;
});
