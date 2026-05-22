#!/usr/bin/env node

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  currentTaskPath,
  currentVerificationPath,
  ensureReportDirs,
  readJsonFile,
  root,
  writeJsonFile,
} from "./agent-queue-utils.mjs";

const allowlistedCommands = [
  ["npm", "run", "agents:verify"],
  ["npm", "run", "build"],
];

function runCommand(command) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command[0], command.slice(1), {
    cwd: root,
    encoding: "utf8",
    shell: false,
    maxBuffer: 1024 * 1024 * 8,
  });
  const finishedAt = new Date().toISOString();
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

  return {
    command: command.join(" "),
    started_at: startedAt,
    finished_at: finishedAt,
    exit_code: result.status ?? 1,
    passed: result.status === 0,
    output_summary: output.trim().split(/\r?\n/).slice(-30),
  };
}

ensureReportDirs();

if (!existsSync(currentTaskPath)) {
  const report = {
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    commands: [],
    passed: false,
    output_summary: ["No current task found at reports/agents/current-task.json."],
  };
  writeJsonFile(currentVerificationPath, report);
  console.log("No current task found. Verification did not run.");
  process.exit(0);
}

const task = readJsonFile(currentTaskPath);
const startedAt = new Date().toISOString();
const commands = allowlistedCommands.map((command) => runCommand(command));
const finishedAt = new Date().toISOString();
const passed = commands.every((command) => command.passed);

const report = {
  task_id: task.task_id,
  title: task.title,
  started_at: startedAt,
  finished_at: finishedAt,
  commands,
  passed,
  output_summary: commands.flatMap((command) => [
    `${command.command}: ${command.passed ? "passed" : `failed with exit ${command.exit_code}`}`,
    ...command.output_summary,
  ]),
};

writeJsonFile(currentVerificationPath, report);

console.log(`Verification ${passed ? "passed" : "failed"} for ${task.task_id}.`);
for (const command of commands) {
  console.log(`- ${command.command}: ${command.passed ? "passed" : `failed (${command.exit_code})`}`);
}

process.exit(passed ? 0 : 1);
