#!/usr/bin/env node

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  currentImplementationPacketPath,
  currentTaskPath,
  ensureReportDirs,
  getCurrentGitBranch,
  listPendingTasks,
  readJsonFile,
  reportsDir,
  root,
  verifyBranchIsolation,
  writeJsonFile,
} from "./agent-queue-utils.mjs";

const statePath = join(reportsDir, "autonomous-cycle-state.json");
const logPath = join(reportsDir, "autonomous-cycle-log.json");
const requiredBranch = "agents/dev-system";
const retryLimit = 2;

function parseArgs() {
  const values = {
    max: 5,
    autoCommit: true,
    autoPush: true,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--max=")) {
      values.max = Number.parseInt(arg.slice("--max=".length), 10);
    } else if (arg.startsWith("--auto-commit=")) {
      values.autoCommit = arg.slice("--auto-commit=".length) === "true";
    } else if (arg.startsWith("--auto-push=")) {
      values.autoPush = arg.slice("--auto-push=".length) === "true";
    }
  }

  if (!Number.isInteger(values.max) || values.max < 1) {
    throw new Error("--max must be a positive integer.");
  }

  return values;
}

function runStep(command, options = {}) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command[0], command.slice(1), {
    cwd: root,
    encoding: "utf8",
    shell: false,
    stdio: options.inherit ? "inherit" : "pipe",
    maxBuffer: 1024 * 1024 * 8,
  });

  return {
    command: command.join(" "),
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    exit_code: result.status ?? 1,
    stdout: options.inherit ? "" : (result.stdout ?? "").trim(),
    stderr: options.inherit ? "" : (result.stderr ?? "").trim(),
  };
}

function readLog() {
  if (!existsSync(logPath)) return [];
  return readJsonFile(logPath);
}

function appendLog(entry) {
  const log = readLog();
  log.push({
    at: new Date().toISOString(),
    ...entry,
  });
  writeJsonFile(logPath, log);
}

function writeState(state) {
  writeJsonFile(statePath, {
    updated_at: new Date().toISOString(),
    ...state,
  });
}

function getWorkingTreeStatus() {
  return runStep(["git", "status", "--short"]).stdout;
}

function assertControllerBranchPreflight() {
  const isolation = verifyBranchIsolation();
  if (!isolation.valid) {
    throw new Error(`Branch isolation failed: ${isolation.errors.join("; ")}`);
  }

  const branch = getCurrentGitBranch();
  if (branch !== requiredBranch) {
    throw new Error(`Autonomous loop requires ${requiredBranch}; received ${branch || "unknown"}.`);
  }
}

function countTaskFailures(taskId) {
  const log = readLog();
  return log.filter((entry) => entry.task_id === taskId && entry.event === "task_failed").length;
}

function markCurrentTaskBlocked(reason) {
  const result = runStep(["npm", "run", "agents:block-current", "--", `--reason=${reason}`], { inherit: true });
  if (result.exit_code !== 0) {
    throw new Error(`Failed to block current task: ${result.exit_code}`);
  }
}

function regenerateQueueIfNeeded() {
  let pendingTasks = listPendingTasks();
  if (pendingTasks.length > 0) return pendingTasks;

  appendLog({ event: "queue_empty_regenerating" });
  runStep(["npm", "run", "agents:plan"], { inherit: true });
  runStep(["npm", "run", "agents:audit"], { inherit: true });

  pendingTasks = listPendingTasks();
  if (pendingTasks.length === 0) {
    appendLog({ event: "queue_empty_after_regeneration" });
  }

  return pendingTasks;
}

ensureReportDirs();

const options = parseArgs();
const startedAt = new Date().toISOString();

writeState({
  status: "running",
  mode: "controller",
  max_iterations: options.max,
  auto_commit: options.autoCommit,
  auto_push: options.autoPush,
  started_at: startedAt,
  processed_tasks: [],
  stop_reason: null,
});

appendLog({
  event: "loop_started",
  max_iterations: options.max,
  auto_commit: options.autoCommit,
  auto_push: options.autoPush,
});

let processed = 0;
const processedTasks = [];

try {
  while (processed < options.max) {
    assertControllerBranchPreflight();
    const workingTreeStatus = getWorkingTreeStatus();
    if (workingTreeStatus) {
      appendLog({
        event: "working_tree_not_clean",
        status: workingTreeStatus,
      });
      writeState({
        status: "stopped",
        mode: "controller",
        max_iterations: options.max,
        auto_commit: options.autoCommit,
        auto_push: options.autoPush,
        processed_tasks: processedTasks,
        stop_reason: "working_tree_not_clean",
        working_tree_status: workingTreeStatus,
      });
      console.log("Autonomous controller stopped: working tree is not clean.");
      console.log("Commit or discard workspace changes before claiming the next task.");
      process.exit(0);
    }

    runStep(["npm", "run", "agents:status"], { inherit: true });

    const pendingTasks = regenerateQueueIfNeeded();
    if (pendingTasks.length === 0) {
      writeState({
        status: "stopped",
        mode: "controller",
        max_iterations: options.max,
        processed_tasks: processedTasks,
        stop_reason: "queue_empty",
      });
      console.log("Autonomous controller stopped: queue is empty.");
      process.exit(0);
    }

    const nextTask = pendingTasks[0];
    const priorFailures = countTaskFailures(nextTask.task_id);
    if (priorFailures >= retryLimit) {
      appendLog({
        event: "task_retry_limit_reached",
        task_id: nextTask.task_id,
        failures: priorFailures,
      });
      runStep(["npm", "run", "agents:claim"], { inherit: true });
      markCurrentTaskBlocked(`Retry limit reached after ${priorFailures} failures.`);
      continue;
    }

    const claimResult = runStep(["npm", "run", "agents:start-cycle"], { inherit: true });
    if (claimResult.exit_code !== 0) {
      appendLog({ event: "start_cycle_failed", exit_code: claimResult.exit_code });
      throw new Error(`agents:start-cycle failed with ${claimResult.exit_code}`);
    }

    if (!existsSync(currentImplementationPacketPath) || !existsSync(currentTaskPath)) {
      throw new Error("Start cycle did not create the current task and implementation packet.");
    }

    const currentTask = readJsonFile(currentTaskPath);
    processed += 1;
    processedTasks.push(currentTask.task_id);
    appendLog({
      event: "task_ready_for_codex",
      task_id: currentTask.task_id,
      title: currentTask.title,
      packet: "reports/agents/current-implementation-packet.md",
    });

    writeState({
      status: "waiting_for_codex",
      mode: "controller",
      max_iterations: options.max,
      auto_commit: options.autoCommit,
      auto_push: options.autoPush,
      processed_tasks: processedTasks,
      current_task: {
        task_id: currentTask.task_id,
        title: currentTask.title,
        packet: "reports/agents/current-implementation-packet.md",
      },
      stop_reason: "implementation_required",
    });

    console.log("");
    console.log("Controller mode stop:");
    console.log("Codex must now implement this packet:");
    console.log("reports/agents/current-implementation-packet.md");
    console.log("After implementation, run npm run agents:finalize-cycle, npm run build, commit, and push.");
    process.exit(0);
  }

  writeState({
    status: "stopped",
    mode: "controller",
    max_iterations: options.max,
    processed_tasks: processedTasks,
    stop_reason: "max_iterations_reached",
  });
  console.log(`Autonomous controller stopped after ${processed} iteration(s).`);
} catch (error) {
  appendLog({
    event: "loop_error",
    error: error.message,
  });
  writeState({
    status: "failed",
    mode: "controller",
    max_iterations: options.max,
    processed_tasks: processedTasks,
    stop_reason: "error",
    error: error.message,
  });
  console.error(error.message);
  process.exit(1);
}
