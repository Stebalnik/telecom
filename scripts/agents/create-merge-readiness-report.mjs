#!/usr/bin/env node

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  currentTaskPath,
  currentVerificationPath,
  ensureReportDirs,
  readJsonFile,
  reportsDir,
  root,
  verifyBranchIsolation,
  writeJsonFile,
} from "./agent-queue-utils.mjs";

const auditPath = join(reportsDir, "agent-progress-audit.json");
const selfVerificationPath = join(reportsDir, "self-verification.json");
const mergeReadinessPath = join(reportsDir, "merge-readiness.json");

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });

  return {
    exit_code: result.status ?? 1,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
  };
}

function createCheck(name, passed, details = {}) {
  return {
    name,
    passed,
    ...details,
  };
}

function readOptionalJson(path) {
  return existsSync(path) ? readJsonFile(path) : null;
}

ensureReportDirs();

const branchIsolation = verifyBranchIsolation();
const currentTask = readOptionalJson(currentTaskPath);
const verification = readOptionalJson(currentVerificationPath);
const audit = readOptionalJson(auditPath);
const selfVerification = readOptionalJson(selfVerificationPath);
const branch = runGit(["branch", "--show-current"]).stdout || "unknown";
const statusShort = runGit(["status", "--short"]).stdout;
const upstream = runGit(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
const aheadBehind = upstream.exit_code === 0
  ? runGit(["rev-list", "--left-right", "--count", `${upstream.stdout}...HEAD`]).stdout
  : "";

const checks = [
  createCheck("branch isolation", branchIsolation.valid, {
    branch: branchIsolation.branch,
    workspace: branchIsolation.workspace,
    errors: branchIsolation.errors,
    warnings: branchIsolation.warnings,
  }),
  createCheck("not protected branch", !["main", "master", "production", "prod"].includes(branch), {
    branch,
  }),
  createCheck("verification passed", verification?.passed === true, {
    task_id: verification?.task_id ?? null,
    finished_at: verification?.finished_at ?? null,
  }),
  createCheck("self verification passed", selfVerification?.passed === true, {
    generated_at: selfVerification?.generated_at ?? null,
  }),
  createCheck("audit has no failed tasks", audit ? audit.failed === 0 : false, {
    failed: audit?.failed ?? null,
    blocked: audit?.blocked ?? null,
    in_progress: audit?.in_progress ?? null,
  }),
  createCheck("latest build recorded", Boolean(audit?.latest_successful_build?.build_id), {
    latest_successful_build: audit?.latest_successful_build ?? null,
  }),
];

const readyForHumanReview = checks.every((check) => check.passed);
const report = {
  generated_at: new Date().toISOString(),
  ready_for_human_review: readyForHumanReview,
  merge_allowed: false,
  merge_policy: "Manual human approval required. This script never merges, deploys, or restarts production.",
  branch,
  upstream: upstream.exit_code === 0 ? upstream.stdout : null,
  ahead_behind: aheadBehind,
  working_tree_status: statusShort || "clean",
  current_task: currentTask
    ? {
        task_id: currentTask.task_id,
        title: currentTask.title,
        status: currentTask.status,
        assigned_agent: currentTask.assigned_agent,
      }
    : null,
  verification_summary: verification
    ? {
        task_id: verification.task_id,
        passed: verification.passed,
        finished_at: verification.finished_at,
      }
    : null,
  audit_summary: audit
    ? {
        total_tasks: audit.total_tasks,
        completed: audit.completed,
        failed: audit.failed,
        blocked: audit.blocked,
        in_progress: audit.in_progress,
        pending: audit.pending,
        commit_ready: audit.commit_ready,
        latest_successful_build: audit.latest_successful_build,
      }
    : null,
  required_human_actions: [
    "Review changed files and verification reports.",
    "Confirm route impact and security implications.",
    "Confirm Supabase/RLS impact if backend or data-access files changed.",
    "Approve and perform any merge manually outside the autonomous runner.",
  ],
  checks,
};

writeJsonFile(mergeReadinessPath, report);

console.log(`Wrote reports/agents/merge-readiness.json`);
console.log(`Ready for human review: ${readyForHumanReview ? "yes" : "no"}`);
console.log("Merge allowed by runner: no");
