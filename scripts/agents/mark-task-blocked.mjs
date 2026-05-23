#!/usr/bin/env node

import { existsSync } from "node:fs";
import {
  archiveCurrentTask,
  currentTaskPath,
  ensureReportDirs,
  readJsonFile,
  replaceTaskField,
  updateTaskInQueue,
} from "./agent-queue-utils.mjs";
import { spawnSync } from "node:child_process";

function parseReason() {
  const reasonArg = process.argv.find((arg) => arg.startsWith("--reason="));
  return reasonArg ? reasonArg.slice("--reason=".length).trim() : "Blocked by autonomous loop controller.";
}

function runAudit() {
  const result = spawnSync("npm", ["run", "agents:audit"], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

ensureReportDirs();

if (!existsSync(currentTaskPath)) {
  console.log("No current task found. Nothing to block.");
  process.exit(0);
}

const reason = parseReason();
const currentTask = readJsonFile(currentTaskPath);
const updatedTask = updateTaskInQueue(currentTask, (markdown) => {
  let next = replaceTaskField(markdown, "status", "blocked");
  next = replaceTaskField(next, "assigned_agent", currentTask.assigned_agent ?? "unassigned");
  next = replaceTaskField(next, "notes", reason);
  return next;
});

const archivedPath = archiveCurrentTask(currentTask);

console.log(`${updatedTask.task_id} marked blocked.`);
console.log(`Reason: ${reason}`);
if (archivedPath) {
  console.log(`Archived current task: ${archivedPath}`);
}

runAudit();
