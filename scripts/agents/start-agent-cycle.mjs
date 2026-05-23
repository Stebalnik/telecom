#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { assertBranchIsolation, root } from "./agent-queue-utils.mjs";

const steps = [
  ["npm", "run", "agents:status"],
  ["npm", "run", "agents:claim"],
  ["npm", "run", "agents:packet"],
  ["npm", "run", "agents:coding-loop"],
  ["npm", "run", "agents:architecture-review"],
];

try {
  const isolation = assertBranchIsolation();
  console.log(`Branch isolation passed: ${isolation.branch} in ${isolation.workspace}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

function runStep(command) {
  const result = spawnSync(command[0], command.slice(1), {
    cwd: root,
    encoding: "utf8",
    shell: false,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

for (const step of steps) {
  runStep(step);
}

console.log('Use reports/agents/current-implementation-packet.md as the implementation prompt.');
