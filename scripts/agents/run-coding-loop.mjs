#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import {
  currentImplementationPacketPath,
  currentTaskPath,
  ensureReportDirs,
  readJsonFile,
  reportsDir,
  verifyBranchIsolation,
  writeJsonFile,
} from "./agent-queue-utils.mjs";
import { join } from "node:path";

const codingLoopPath = join(reportsDir, "current-coding-loop.json");

function createPhase(name, status, details) {
  return {
    name,
    status,
    details,
  };
}

function requireCurrentTask() {
  if (!existsSync(currentTaskPath)) {
    throw new Error("Missing reports/agents/current-task.json. Run npm run agents:start-cycle first.");
  }

  return readJsonFile(currentTaskPath);
}

function requireImplementationPacket(task) {
  if (!existsSync(currentImplementationPacketPath)) {
    throw new Error("Missing reports/agents/current-implementation-packet.md. Run npm run agents:packet first.");
  }

  const packet = readFileSync(currentImplementationPacketPath, "utf8");
  const requiredFragments = [
    `task_id: ${task.task_id}`,
    `title: ${task.title}`,
    "Treat this implementation packet as the single task source of truth.",
    "## Acceptance Criteria",
    "## Allowed Verification Commands",
    "## Required Final Report Format",
  ];

  const missingFragments = requiredFragments.filter((fragment) => !packet.includes(fragment));
  if (missingFragments.length > 0) {
    throw new Error(`Implementation packet is incomplete: ${missingFragments.join(", ")}`);
  }

  return packet;
}

ensureReportDirs();

try {
  const branchIsolation = verifyBranchIsolation();
  if (!branchIsolation.valid) {
    throw new Error(`Branch isolation failed: ${branchIsolation.errors.join("; ")}`);
  }

  const task = requireCurrentTask();
  const packet = requireImplementationPacket(task);
  const report = {
    generated_at: new Date().toISOString(),
    task_id: task.task_id,
    title: task.title,
    assigned_agent: task.assigned_agent,
    branch: branchIsolation.branch,
    workspace: branchIsolation.workspace,
    status: "implementation_prompt_ready",
    ai_apis_used: false,
    automatic_code_edits: false,
    arbitrary_commands_executed: false,
    packet_path: "reports/agents/current-implementation-packet.md",
    packet_sha256_note: "Packet content is read directly from the workspace; no external prompt service is used.",
    phases: [
      createPhase("branch isolation", "passed", "Current workspace and branch are safe for agent work."),
      createPhase("packet validation", "passed", "Current implementation packet matches the claimed task."),
      createPhase("implementation", "manual_codex_required", "Codex must implement from the packet in the current workspace only."),
      createPhase("verification", "pending", "Run npm run agents:finalize-cycle after implementation."),
      createPhase("completion", "pending", "Task can become commit_ready only after verification passes."),
    ],
    safety_rules: [
      "Do not call AI APIs.",
      "Do not execute commands from task text.",
      "Do not deploy.",
      "Do not merge.",
      "Do not touch /var/www/telecom.",
      "Use the implementation packet as the single source of truth.",
    ],
    packet_excerpt: packet.split(/\r?\n/).slice(0, 40),
  };

  writeJsonFile(codingLoopPath, report);
  console.log(`Wrote reports/agents/current-coding-loop.json for ${task.task_id}.`);
  console.log("Coding loop status: implementation_prompt_ready");
} catch (error) {
  const report = {
    generated_at: new Date().toISOString(),
    status: "blocked",
    ai_apis_used: false,
    automatic_code_edits: false,
    arbitrary_commands_executed: false,
    error: error.message,
  };
  writeJsonFile(codingLoopPath, report);
  console.error(error.message);
  process.exit(1);
}
