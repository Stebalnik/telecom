#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import {
  currentImplementationPacketPath,
  currentTaskPath,
  currentVerificationPath,
  ensureReportDirs,
  findTaskById,
  readJsonFile,
  reportsDir,
  verifyBranchIsolation,
  writeJsonFile,
} from "./agent-queue-utils.mjs";
import { join } from "node:path";

const allowedVerificationCommands = new Set([
  "npm run agents:verify",
  "npm run agents:self-verify",
  "npm run build",
]);

function passCheck(name, details = {}) {
  return {
    name,
    passed: true,
    errors: [],
    ...details,
  };
}

function failCheck(name, errors, details = {}) {
  return {
    name,
    passed: false,
    errors: Array.isArray(errors) ? errors : [errors],
    ...details,
  };
}

function verifyCurrentTask() {
  if (!existsSync(currentTaskPath)) {
    return passCheck("current task", {
      skipped: true,
      reason: "No active current task.",
    });
  }

  const task = readJsonFile(currentTaskPath);
  const errors = [];
  const queueTask = findTaskById(task.queue_file, task.task_id);

  if (!queueTask) {
    errors.push(`Current task ${task.task_id} was not found in ${task.queue_file}.`);
  } else if (queueTask.status !== "in_progress") {
    errors.push(`Current task queue status must be in_progress, received ${queueTask.status}.`);
  }

  if (task.status !== "in_progress") {
    errors.push(`Current task report status must be in_progress, received ${task.status}.`);
  }

  if (!task.assigned_agent || task.assigned_agent === "unassigned") {
    errors.push("Current task must have an assigned agent.");
  }

  if (!task.branch) {
    errors.push("Current task must record the claimed branch.");
  }

  return errors.length > 0
    ? failCheck("current task", errors, { task_id: task.task_id })
    : passCheck("current task", { task_id: task.task_id });
}

function verifyImplementationPacket() {
  if (!existsSync(currentTaskPath)) {
    return passCheck("implementation packet", {
      skipped: true,
      reason: "No active current task.",
    });
  }

  const task = readJsonFile(currentTaskPath);
  const errors = [];

  if (!existsSync(currentImplementationPacketPath)) {
    errors.push("Missing reports/agents/current-implementation-packet.md.");
    return failCheck("implementation packet", errors, { task_id: task.task_id });
  }

  const packet = readFileSync(currentImplementationPacketPath, "utf8");
  const requiredFragments = [
    `task_id: ${task.task_id}`,
    `title: ${task.title}`,
    "Treat this implementation packet as the single task source of truth.",
    "## Allowed Verification Commands",
    "## Required Final Report Format",
  ];

  for (const fragment of requiredFragments) {
    if (!packet.includes(fragment)) {
      errors.push(`Implementation packet is missing required fragment: ${fragment}`);
    }
  }

  return errors.length > 0
    ? failCheck("implementation packet", errors, { task_id: task.task_id })
    : passCheck("implementation packet", { task_id: task.task_id });
}

function verifyPreviousVerificationReport() {
  if (!existsSync(currentVerificationPath)) {
    return passCheck("verification report", {
      skipped: true,
      reason: "No prior current-task verification report.",
    });
  }

  const verification = readJsonFile(currentVerificationPath);
  const errors = [];

  for (const commandResult of verification.commands ?? []) {
    if (!allowedVerificationCommands.has(commandResult.command)) {
      errors.push(`Verification report contains non-allowlisted command: ${commandResult.command}`);
    }
  }

  return errors.length > 0
    ? failCheck("verification report", errors, { task_id: verification.task_id ?? null })
    : passCheck("verification report", { task_id: verification.task_id ?? null });
}

ensureReportDirs();

const branchIsolation = verifyBranchIsolation();
const checks = [
  branchIsolation.valid
    ? passCheck("branch isolation", {
        branch: branchIsolation.branch,
        workspace: branchIsolation.workspace,
        warnings: branchIsolation.warnings,
      })
    : failCheck("branch isolation", branchIsolation.errors, {
        branch: branchIsolation.branch,
        workspace: branchIsolation.workspace,
        warnings: branchIsolation.warnings,
      }),
  verifyCurrentTask(),
  verifyImplementationPacket(),
  verifyPreviousVerificationReport(),
];

const passed = checks.every((check) => check.passed);
const report = {
  generated_at: new Date().toISOString(),
  passed,
  allowed_verification_commands: [...allowedVerificationCommands],
  checks,
};

writeJsonFile(join(reportsDir, "self-verification.json"), report);

if (passed) {
  console.log("Agent self-verification passed.");
} else {
  console.error("Agent self-verification failed:");
  for (const check of checks.filter((candidate) => !candidate.passed)) {
    for (const error of check.errors) {
      console.error(`- ${check.name}: ${error}`);
    }
  }
}

process.exit(passed ? 0 : 1);
