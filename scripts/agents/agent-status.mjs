#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  countStatuses,
  currentTaskPath,
  currentVerificationPath,
  ensureReportDirs,
  verifyBranchIsolation,
  readJsonFile,
  root,
} from "./agent-queue-utils.mjs";

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  return (result.stdout ?? "").trim();
}

ensureReportDirs();

const branch = runGit(["branch", "--show-current"]) || "unknown";
const branchIsolation = verifyBranchIsolation();
const statusShort = runGit(["status", "--short"]);
const counts = countStatuses();
const currentTask = existsSync(currentTaskPath) ? readJsonFile(currentTaskPath) : null;
const verification = existsSync(currentVerificationPath) ? readJsonFile(currentVerificationPath) : null;
const buildIdPath = join(root, ".next", "BUILD_ID");
const buildId = existsSync(buildIdPath) ? readFileSync(buildIdPath, "utf8").trim() : "none";

console.log(`Current branch: ${branch}`);
console.log(`Branch isolation: ${branchIsolation.valid ? "passed" : "failed"}`);
if (branchIsolation.warnings.length > 0) {
  console.log(`Branch isolation warnings: ${branchIsolation.warnings.join("; ")}`);
}
if (branchIsolation.errors.length > 0) {
  console.log(`Branch isolation errors: ${branchIsolation.errors.join("; ")}`);
}
console.log("Git status short:");
console.log(statusShort || "clean");
console.log("Task counts:");
console.log(`- pending: ${counts.pending}`);
console.log(`- completed: ${counts.completed}`);
console.log(`- failed: ${counts.failed}`);
console.log(`- in_progress: ${counts.in_progress}`);
console.log(`- commit_ready: ${counts.commit_ready_total}`);

if (currentTask) {
  console.log("Current task:");
  console.log(`- task_id: ${currentTask.task_id}`);
  console.log(`- title: ${currentTask.title}`);
  console.log(`- assigned_agent: ${currentTask.assigned_agent}`);
  console.log(`- queue_file: ${currentTask.queue_file}`);
} else {
  console.log("Current task: none");
}

if (verification) {
  console.log("Latest build verification status:");
  console.log(`- task_id: ${verification.task_id ?? "none"}`);
  console.log(`- passed: ${verification.passed}`);
  console.log(`- finished_at: ${verification.finished_at}`);
} else {
  console.log("Latest build verification status: none");
}

console.log(`Latest local build id: ${buildId}`);
