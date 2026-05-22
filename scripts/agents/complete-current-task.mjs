#!/usr/bin/env node

import { existsSync } from "node:fs";
import {
  archiveCurrentTask,
  currentTaskPath,
  currentVerificationPath,
  ensureReportDirs,
  readJsonFile,
  replaceTaskField,
  updateTaskInQueue,
} from "./agent-queue-utils.mjs";

ensureReportDirs();

if (!existsSync(currentTaskPath)) {
  console.log("No current task found. Nothing to complete.");
  process.exit(0);
}

if (!existsSync(currentVerificationPath)) {
  console.error("Missing reports/agents/current-task-verification.json. Run npm run agents:verify-current first.");
  process.exit(1);
}

const task = readJsonFile(currentTaskPath);
const verification = readJsonFile(currentVerificationPath);
const passed = verification.passed === true;
const nextStatus = passed ? "commit_ready" : "failed";
const failureReason = passed
  ? ""
  : `Verification failed: ${(verification.output_summary ?? ["No failure summary available."])[0]}`;

const updatedTask = updateTaskInQueue(task, (markdown) => {
  let next = replaceTaskField(markdown, "status", nextStatus);
  next = replaceTaskField(next, "assigned_agent", task.assigned_agent ?? "unassigned");
  if (!passed) {
    next = replaceTaskField(next, "notes", failureReason);
  }
  return next;
});

const archivedPath = archiveCurrentTask(task);

console.log(`${updatedTask.task_id} marked ${nextStatus}.`);
console.log(`Queue file: ${updatedTask.queue_file}`);
if (archivedPath) {
  console.log(`Archived current task: ${archivedPath}`);
}
if (!passed) {
  console.log(failureReason);
}

process.exit(0);
