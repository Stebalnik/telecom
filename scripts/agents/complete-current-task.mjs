#!/usr/bin/env node

import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  archiveCurrentTask,
  currentTaskPath,
  currentVerificationPath,
  ensureReportDirs,
  readJsonFile,
  replaceTaskField,
  reportsDir,
  updateTaskInQueue,
  writeJsonFile,
} from "./agent-queue-utils.mjs";

ensureReportDirs();

const retryStatePath = join(reportsDir, "retry-state.json");
const retryLimit = 2;
const retryHistoryLimit = 10;

function readRetryState() {
  return existsSync(retryStatePath) ? readJsonFile(retryStatePath) : { tasks: {} };
}

function writeRetryState(state) {
  writeJsonFile(retryStatePath, state);
}

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
const retryState = readRetryState();
const currentRetry = retryState.tasks[task.task_id] ?? {
  attempts: 0,
  last_failure: null,
  history: [],
};
const failureSummary = (verification.output_summary ?? ["No failure summary available."])[0];
const nextRetry = passed
  ? {
      attempts: 0,
      last_failure: null,
      last_success: verification.finished_at ?? new Date().toISOString(),
      history: currentRetry.history ?? [],
    }
  : {
      attempts: currentRetry.attempts + 1,
      last_failure: verification.finished_at ?? new Date().toISOString(),
      last_success: currentRetry.last_success ?? null,
      history: [
        ...((currentRetry.history ?? []).slice(-(retryHistoryLimit - 1))),
        {
          attempt: currentRetry.attempts + 1,
          failed_at: verification.finished_at ?? new Date().toISOString(),
          reason: failureSummary,
        },
      ],
    };
const retryLimitReached = !passed && nextRetry.attempts >= retryLimit;
const nextStatus = passed ? "commit_ready" : retryLimitReached ? "blocked" : "pending";
const failureReason = passed ? "" : `Verification failed on attempt ${nextRetry.attempts}/${retryLimit}: ${failureSummary}`;

retryState.tasks[task.task_id] = nextRetry;
writeRetryState(retryState);

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
  if (!retryLimitReached) {
    console.log("Task returned to pending for retry.");
  }
}

process.exit(0);
