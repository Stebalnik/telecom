#!/usr/bin/env node

import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  currentTaskPath,
  currentVerificationPath,
  ensureReportDirs,
  readJsonFile,
  reportsDir,
  writeJsonFile,
} from "./agent-queue-utils.mjs";

const recoveryReportPath = join(reportsDir, "recovery-report.json");

function classifyFailure(command) {
  if (command.includes("agents:verify")) return "task_queue_structure";
  if (command.includes("agents:self-verify")) return "agent_self_verification";
  if (command.includes("build")) return "build";
  if (command.includes("lint")) return "lint";
  return "unknown";
}

function createRecoveryAction(commandResult) {
  const category = classifyFailure(commandResult.command);
  const actionByCategory = {
    task_queue_structure: "Fix task queue structure, required fields, acceptance criteria, verification commands, or forbidden path references.",
    agent_self_verification: "Fix branch isolation, packet consistency, current task state, or verification allowlist issues.",
    build: "Inspect the build summary, fix TypeScript/Next.js/runtime build errors, then rerun verification.",
    lint: "Inspect lint output, fix reported lint violations, then rerun verification.",
    unknown: "Inspect command output and correct the reported failure before retrying.",
  };

  return {
    command: commandResult.command,
    category,
    exit_code: commandResult.exit_code,
    suggested_action: actionByCategory[category],
    output_summary: commandResult.output_summary ?? [],
  };
}

ensureReportDirs();

const task = existsSync(currentTaskPath) ? readJsonFile(currentTaskPath) : null;
const verification = existsSync(currentVerificationPath) ? readJsonFile(currentVerificationPath) : null;
const failedCommands = (verification?.commands ?? []).filter((command) => command.passed !== true);
const report = {
  generated_at: new Date().toISOString(),
  task_id: task?.task_id ?? verification?.task_id ?? null,
  title: task?.title ?? verification?.title ?? null,
  recovery_needed: failedCommands.length > 0,
  automatic_fixes_applied: false,
  arbitrary_commands_executed: false,
  failed_commands: failedCommands.map(createRecoveryAction),
  next_steps: failedCommands.length > 0
    ? [
        "Codex must inspect the failed command summaries.",
        "Apply scoped fixes in the workspace only.",
        "Rerun npm run agents:finalize-cycle.",
        "Do not deploy, merge, or run task-provided commands.",
      ]
    : ["No recovery needed. Verification has no failed commands."],
};

writeJsonFile(recoveryReportPath, report);

console.log("Wrote reports/agents/recovery-report.json");
console.log(`Recovery needed: ${report.recovery_needed ? "yes" : "no"}`);
