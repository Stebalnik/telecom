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
const auditPath = join(root, "reports", "agents", "agent-progress-audit.json");
const retryStatePath = join(root, "reports", "agents", "retry-state.json");
const mergeReadinessPath = join(root, "reports", "agents", "merge-readiness.json");
const audit = existsSync(auditPath) ? readJsonFile(auditPath) : null;
const retryState = existsSync(retryStatePath) ? readJsonFile(retryStatePath) : { tasks: {} };
const mergeReadiness = existsSync(mergeReadinessPath) ? readJsonFile(mergeReadinessPath) : null;
const buildIdPath = join(root, ".next", "BUILD_ID");
const buildId = existsSync(buildIdPath) ? readFileSync(buildIdPath, "utf8").trim() : "none";
const retryEntries = Object.entries(retryState.tasks ?? {}).filter(([, value]) => value?.attempts > 0);

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
if (audit) {
  console.log(`- latest_audit: ${audit.generated_at ?? "unknown"}`);
}

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

if (audit?.latest_successful_build) {
  console.log("Latest audited build:");
  console.log(`- build_id: ${audit.latest_successful_build.build_id ?? "none"}`);
  console.log(`- detected_at: ${audit.latest_successful_build.detected_at ?? "unknown"}`);
}

console.log("Retry summary:");
if (retryEntries.length === 0) {
  console.log("- active retries: none");
} else {
  console.log(`- active retries: ${retryEntries.length}`);
  for (const [taskId, state] of retryEntries.slice(0, 5)) {
    console.log(`- ${taskId}: attempts=${state.attempts}, last_failure=${state.last_failure ?? "unknown"}`);
  }
}

if (mergeReadiness) {
  console.log("Merge readiness:");
  console.log(`- ready_for_human_review: ${mergeReadiness.ready_for_human_review}`);
  console.log(`- merge_allowed: ${mergeReadiness.merge_allowed}`);
  console.log(`- generated_at: ${mergeReadiness.generated_at}`);
}
