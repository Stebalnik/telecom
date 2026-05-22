#!/usr/bin/env node

import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  currentTaskPath,
  ensureReportDirs,
  findTaskById,
  parseTaskList,
  readJsonFile,
  reportsDir,
  verifyBranchIsolation,
  writeJsonFile,
} from "./agent-queue-utils.mjs";

const backendIndicators = ["api", "auth", "supabase", "server", "storage", "database", "rls", "stripe", "webhook"];
const routeIndicators = ["app/", "layout", "page", "route.ts", "middleware", "redirect", "navigation"];
const securityIndicators = ["api", "auth", "admin", "approval", "supabase", "rls", "storage", "stripe", "webhook", "upload"];

function includesAny(values, indicators) {
  const text = values.join(" ").toLowerCase();
  return indicators.some((indicator) => text.includes(indicator));
}

function fallbackExpectedFiles(files) {
  return files.filter((file) => file && file !== "TBD");
}

ensureReportDirs();

if (!existsSync(currentTaskPath)) {
  console.error("Missing reports/agents/current-task.json. Run npm run agents:start-cycle first.");
  process.exit(1);
}

const currentTask = readJsonFile(currentTaskPath);
const queueTask = findTaskById(currentTask.queue_file, currentTask.task_id);
if (!queueTask) {
  console.error(`Could not find ${currentTask.task_id} in ${currentTask.queue_file}.`);
  process.exit(1);
}

const branchIsolation = verifyBranchIsolation();
const expectedFiles = fallbackExpectedFiles(parseTaskList(queueTask.markdown, "files_expected"));
const acceptanceCriteria = parseTaskList(queueTask.markdown, "acceptance_criteria");
const taskSignals = [
  currentTask.title,
  currentTask.area,
  currentTask.type,
  ...expectedFiles,
  ...acceptanceCriteria,
];

const requiresBackendReview = includesAny(taskSignals, backendIndicators);
const requiresRouteReview = includesAny(taskSignals, routeIndicators);
const hasSecuritySignal = includesAny(taskSignals, securityIndicators);
const requiresSecurityReview = true;
const requiresSupabaseRlsReview = includesAny(taskSignals, ["supabase", "rls", "storage", "database", "auth"]);

const report = {
  generated_at: new Date().toISOString(),
  task_id: currentTask.task_id,
  title: currentTask.title,
  area: currentTask.area,
  type: currentTask.type,
  assigned_agent: currentTask.assigned_agent,
  branch_isolation: {
    valid: branchIsolation.valid,
    branch: branchIsolation.branch,
    workspace: branchIsolation.workspace,
    errors: branchIsolation.errors,
    warnings: branchIsolation.warnings,
  },
  expected_files: expectedFiles,
  acceptance_criteria: acceptanceCriteria,
  review_requirements: {
    security_review: requiresSecurityReview,
    route_impact_review: requiresRouteReview,
    backend_review: requiresBackendReview,
    supabase_rls_review: requiresSupabaseRlsReview,
    security_signal_detected: hasSecuritySignal,
  },
  architectural_guidance: [
    "Keep changes scoped to the claimed task and expected files.",
    "Prefer existing repository patterns over new abstractions.",
    "Do not introduce deploy, merge, or production-control behavior.",
    "Document route, security, and Supabase/RLS impact in the final task report when applicable.",
  ],
  risk_level: requiresBackendReview || requiresSupabaseRlsReview ? "medium" : "low",
};

writeJsonFile(join(reportsDir, "architecture-review.json"), report);
console.log(`Wrote reports/agents/architecture-review.json for ${currentTask.task_id}.`);
