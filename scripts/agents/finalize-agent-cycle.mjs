#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  assertBranchIsolation,
  currentVerificationPath,
  readJsonFile,
  root,
} from "./agent-queue-utils.mjs";

function runStep(command, allowFailure = false) {
  const result = spawnSync(command[0], command.slice(1), {
    cwd: root,
    encoding: "utf8",
    shell: false,
    stdio: "inherit",
  });

  if (!allowFailure && result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result.status ?? 1;
}

try {
  const isolation = assertBranchIsolation();
  console.log(`Branch isolation passed: ${isolation.branch} in ${isolation.workspace}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const verifyExit = runStep(["npm", "run", "agents:verify-current"], true);
runStep(["npm", "run", "agents:complete"]);
runStep(["npm", "run", "agents:audit"]);
runStep(["npm", "run", "agents:merge-ready"]);
runStep(["npm", "run", "agents:status"]);

const verification = existsSync(currentVerificationPath) ? readJsonFile(currentVerificationPath) : null;
if (verifyExit === 0 && verification?.passed === true) {
  console.log("Task is commit_ready.");
  process.exit(0);
}

console.log("Task failed and needs correction.");
process.exit(1);
