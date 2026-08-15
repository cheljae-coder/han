import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const directory = import.meta.dirname;
const tests = fs.readdirSync(directory)
  .filter(name => /^verify-.*\.mjs$/.test(name))
  .sort();

let failed = 0;
for (const test of tests) {
  console.log(`RUN ${test}`);
  const result = spawnSync(process.execPath, [path.join(directory, test)], {
    stdio: "inherit"
  });
  if (result.status !== 0) failed += 1;
}

if (failed) {
  console.error(`FAIL: ${failed}개 검사 파일 실패`);
  process.exit(1);
}
console.log(`PASS: ${tests.length}개 검사 파일 전체 통과`);
